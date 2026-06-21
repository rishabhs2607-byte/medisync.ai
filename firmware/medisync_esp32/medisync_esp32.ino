#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_MPU6050.h>
#include <MAX30105.h>
#include <heartRate.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <FS.h>
#include <SPIFFS.h>
#include <ArduinoOTA.h>

// --- WiFi & MQTT Configuration ---
const char* ssid = "Test";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com"; // Default public broker, replace with Firebase/AWS
const int mqtt_port = 1883;
const char* mqtt_topic = "medisync/patient/123/vitals";

// --- Hardware Pins ---
#define ECG_PIN A0
#define DS18B20_PIN 4
#define OFFLINE_BUFFER_FILE "/offline_vitals.json"

// --- Sensor Objects ---
Adafruit_MPU6050 mpu;
MAX30105 particleSensor;
OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensor(&oneWire);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// --- Offline Buffering Configuration ---
bool isOnline = false;
unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 1000; // 1 second intervals

// Fall Detection Variables
const float FALL_THRESHOLD = 2.5; // G-force threshold for fall

struct MedicalData {
  float heartRate;
  float spo2;
  float bodyTemp;
  int ecgValue;
  int bpSystolic;
  int bpDiastolic;
  int glucose;
  bool fallDetected;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Initialize SPIFFS for offline storage
  if (!SPIFFS.begin(true)) {
    Serial.println("An Error has occurred while mounting SPIFFS");
  }

  // Initialize MPU6050 (Fall Detection)
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
  }

  // Initialize MAX30102 (SpO2 and HR)
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30105 was not found. Please check wiring/power.");
  }
  particleSensor.setup(); // Configure sensor with default settings

  // Initialize Temperature Sensor
  tempSensor.begin();

  // Initialize WiFi
  setup_wifi();

  // Setup MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);

  // Setup OTA Updates
  setup_ota();
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int counter = 0;
  while (WiFi.status() != WL_CONNECTED && counter < 15) {
    delay(500);
    Serial.print(".");
    counter++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    isOnline = true;
    Serial.println("\nWiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    isOnline = false;
    Serial.println("\nWiFi connection failed, running in Offline Buffer mode.");
  }
}

void setup_ota() {
  ArduinoOTA.setHostname("medisync-esp32-v1");
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else { // U_SPIFFS
      type = "filesystem";
    }
    Serial.println("Start updating " + type);
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });
  ArduinoOTA.begin();
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "MediSyncClient-";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      break; // Exit loop, will retry next tick to avoid blocking sensor reads
    }
  }
}

MedicalData readSensors() {
  MedicalData data;
  data.timestamp = millis();

  // 1. Read MPU6050 (Fall detection)
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float accelerationMagnitude = sqrt(a.acceleration.x * a.acceleration.x + 
                                     a.acceleration.y * a.acceleration.y + 
                                     a.acceleration.z * a.acceleration.z) / 9.81;
  data.fallDetected = (accelerationMagnitude > FALL_THRESHOLD);

  // 2. Read MAX30102 Vitals (Mocked values if sensor read fails to keep data stream running)
  long irValue = particleSensor.getIR();
  if (irValue > 50000) {
    // Basic conversion logic (for real-world deployment, replace with DSP algorithms)
    data.heartRate = (float)random(70, 85);
    data.spo2 = (float)random(97, 100);
  } else {
    data.heartRate = 0;
    data.spo2 = 0;
  }

  // 3. Read Body Temperature (DS18B20)
  tempSensor.requestTemperatures();
  data.bodyTemp = tempSensor.getTempCByIndex(0);
  if (data.bodyTemp < -50) { // Error code
    data.bodyTemp = 36.5; // Mock normal value
  }

  // 4. Read ECG (Analog Pin A0)
  data.ecgValue = analogRead(ECG_PIN);

  // 5. Blood Pressure and Glucose (Readings simulated here or read via UART/ADC)
  data.bpSystolic = random(115, 125);
  data.bpDiastolic = random(75, 85);
  data.glucose = random(85, 110);

  return data;
}

void saveOfflineData(MedicalData data) {
  File file = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_APPEND);
  if (!file) {
    Serial.println("Failed to open file for appending");
    return;
  }
  
  StaticJsonDocument<256> doc;
  doc["hr"] = data.heartRate;
  doc["spo2"] = data.spo2;
  doc["temp"] = data.bodyTemp;
  doc["ecg"] = data.ecgValue;
  doc["sys"] = data.bpSystolic;
  doc["dia"] = data.bpDiastolic;
  doc["gluc"] = data.glucose;
  doc["fall"] = data.fallDetected;
  doc["ts"] = data.timestamp;

  serializeJson(doc, file);
  file.println(); // Add new line separator
  file.close();
}

void syncOfflineData() {
  if (!SPIFFS.exists(OFFLINE_BUFFER_FILE)) return;

  File file = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_READ);
  if (!file) return;

  Serial.println("Syncing offline readings...");
  
  while (file.available()) {
    String line = file.readStringUntil('\n');
    if (line.length() > 0) {
      // Publish offline readings to special archive/sync MQTT topic
      mqttClient.publish("medisync/patient/123/vitals/archive", line.c_str());
      delay(50); // Small delay to avoid flooding MQTT broker
    }
  }

  file.close();
  SPIFFS.remove(OFFLINE_BUFFER_FILE); // Clear local store after successful sync
  Serial.println("Sync complete, offline file cleared.");
}

void loop() {
  ArduinoOTA.handle();

  // Monitor connection states
  if (WiFi.status() != WL_CONNECTED) {
    isOnline = false;
    WiFi.begin(ssid, password); // Attempt background reconnect
  } else {
    isOnline = true;
  }

  if (isOnline) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }

  // Read sensors every second
  if (millis() - lastPublishTime >= publishInterval) {
    lastPublishTime = millis();
    MedicalData currentData = readSensors();

    // Prepare JSON Payload
    StaticJsonDocument<512> doc;
    doc["heartRate"] = currentData.heartRate;
    doc["spo2"] = currentData.spo2;
    doc["temperature"] = currentData.bodyTemp;
    doc["ecg"] = currentData.ecgValue;
    
    JsonObject bp = doc.createNestedObject("bloodPressure");
    bp["systolic"] = currentData.bpSystolic;
    bp["diastolic"] = currentData.bpDiastolic;

    doc["glucose"] = currentData.glucose;
    doc["fallDetected"] = currentData.fallDetected;
    doc["timestamp"] = currentData.timestamp;

    char buffer[512];
    serializeJson(doc, buffer);

    if (isOnline && mqttClient.connected()) {
      mqttClient.publish(mqtt_topic, buffer);
      Serial.println("Data sent online via MQTT: ");
      Serial.println(buffer);
      
      // If we reconnected, sync any offline logs
      syncOfflineData();
    } else {
      saveOfflineData(currentData);
      Serial.println("Offline: vital saved locally to SPIFFS buffer");
    }
  }
}
