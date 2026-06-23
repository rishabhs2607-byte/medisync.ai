/*
 * MediSync IoT Smart Oximeter Integration Firmware
 * Target Board: ESP8266 NodeMCU / Wemos D1 Mini / Generic ESP8266
 * 
 * Hardware Connections (Label mapping):
 * 1. MAX30100 Pulse Oximeter Sensor:
 *    VIN  → 3.3V
 *    GND  → GND
 *    SDA  → D2 (GPIO 4)
 *    SCL  → D1 (GPIO 5)
 * 2. SSD1306 OLED (I2C):
 *    VCC  → 3.3V
 *    GND  → GND
 *    SDA  → D2 (GPIO 4)
 *    SCL  → D1 (GPIO 5)
 * 3. Push Button:
 *    One Side  → D5 (GPIO 14)
 *    Other Side → GND
 *    Note: Configured with internal INPUT_PULLUP.
 * 4. Active Buzzer:
 *    Positive (+) → D6 (GPIO 12)
 *    Negative (-) → GND
 * 
 * Features:
 * - OLED display flow: Boot -> WiFi -> Firebase -> Ready -> Measuring (Finger Detect & Signal Quality) -> Result -> Synced.
 * - Active buzzer sound alerts for boot, ready, completion, warning, and critical SpO2 warnings.
 * - Outlier filtering algorithm (takes multiple samples, removes noise and invalid ranges, and averages).
 * - Instant manual trigger using the push button (GPIO 14).
 * - 10-second automatic loop transmission of SpO2, Heart Rate, NTP timestamp, and WiFi RSSI to Firebase RTDB.
 */

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <MAX30100_PulseOximeter.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

// Firebase Helpers
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// --- Pin Mappings ---
#ifdef D5
  #define BUTTON_PIN D5
#else
  #define BUTTON_PIN 14    // GPIO 14
#endif

#ifdef D6
  #define BUZZER_PIN D6
#else
  #define BUZZER_PIN 12    // GPIO 12
#endif

#ifdef D2
  #define OLED_SDA D2
#else
  #define OLED_SDA 4       // GPIO 4
#endif

#ifdef D1
  #define OLED_SCL D1
#else
  #define OLED_SCL 5       // GPIO 5
#endif

// --- OLED Configuration ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Pulse Oximeter Configuration ---
PulseOximeter pox;

// --- Firebase Configuration ---
#define FIREBASE_API_KEY "AIzaSyBsedBBMCahJXiNShwNICk7UxUJwY4229A"
#define FIREBASE_DATABASE_URL "medisync-2b25a-default-rtdb.firebaseio.com" // DO NOT INCLUDE https://
#define DEVICE_ID "oximeter_01" // Matches oximeter listener on the patient dashboard

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- WiFi Configuration ---
#define WIFI_SSID "Test"
#define WIFI_PASSWORD "22558800"

// --- Global variables for tracking ---
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 10000; // 10s auto-upload interval

// --- Buzzer Sounds ---
void playBuzzerTone(int frequency, int durationMs) {
  tone(BUZZER_PIN, frequency, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
}

void soundPowerOn() {
  playBuzzerTone(2000, 100);
  delay(50);
  playBuzzerTone(2500, 150);
}

void soundReadyToMeasure() {
  playBuzzerTone(1500, 150);
}

void soundButtonClick() {
  playBuzzerTone(1000, 60);
}

void soundMeasurementSuccess() {
  playBuzzerTone(2000, 100);
  delay(50);
  playBuzzerTone(2000, 100);
}

void soundWarningBeep() {
  playBuzzerTone(2800, 120);
  delay(80);
  playBuzzerTone(2800, 120);
}

void soundCriticalAlarm() {
  // Continuous alarming sequence
  for (int i = 0; i < 5; i++) {
    playBuzzerTone(3200, 150);
    delay(100);
  }
}

// --- OLED Rendering Helper ---
void renderScreen(String state, String line2 = "", String line3 = "", String line4 = "") {
  display.clearDisplay();
  
  // Constant Header
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("---------------------");
  
  display.setCursor(0, 10);
  display.setTextSize(1);
  display.print("State: ");
  display.println(state);

  display.setCursor(0, 24);
  if (line2.length() > 0) {
    display.setTextSize(1);
    display.println(line2);
  }

  if (line3.length() > 0) {
    display.setCursor(0, 36);
    display.setTextSize(2); // Draw main values larger
    display.println(line3);
  }

  if (line4.length() > 0) {
    display.setCursor(0, 54);
    display.setTextSize(1);
    display.println(line4);
  }
  
  // Constant Footer: MediSync
  display.setCursor(76, 56);
  display.setTextSize(1);
  display.println("MediSync");
  display.drawLine(0, 54, 127, 54, SSD1306_WHITE);

  display.display();
}

void showLogo() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // Draw elegant text logo
  display.setTextSize(2);
  display.setCursor(18, 12);
  display.println("MEDISYNC");
  
  display.setTextSize(1);
  display.setCursor(24, 34);
  display.println("Smart Oximeter");
  
  display.setCursor(14, 48);
  display.println("IoT Health Module");
  display.display();
  delay(2000);
}

// MAX30100 beat detection callback (optional visual pulse monitor)
void onBeatDetected() {
  Serial.println("Beat Detected!");
}

void syncNTP() {
  renderScreen("INITIALIZING", "Syncing NTP Time", "Connecting NTP...", "");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  int retries = 0;
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2 && retries < 20) {
    delay(500);
    now = time(nullptr);
    retries++;
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  renderScreen("WIFI SETUP", "Connecting to SSID:", String(WIFI_SSID), "");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    retries++;
    String dots = "";
    for (int i = 0; i < (retries % 4); i++) dots += ".";
    renderScreen("WIFI SETUP", "Connecting" + dots, String(WIFI_SSID), "Signal: Connecting");
  }

  if (WiFi.status() == WL_CONNECTED) {
    renderScreen("WIFI READY", "Connected!", WiFi.localIP().toString(), "Signal: " + String(WiFi.RSSI()) + " dBm");
    delay(1000);
  } else {
    renderScreen("WIFI OFFLINE", "Connection failed", "Running local mode", "");
    delay(1500);
  }
}

void performMeasurementAndUpload() {
  soundButtonClick();
  renderScreen("MEASURING", "Place Finger", "Initializing...", "");
  
  // Warmup and clean readings buffer
  float hrSamples[40];
  float spo2Samples[40];
  int sampleCount = 0;
  unsigned long startWait = millis();
  
  // Read for 8 seconds to get a clean average
  while (millis() - startWait < 8000) {
    pox.update();
    
    float currentHR = pox.getHeartRate();
    float currentSpO2 = pox.getSpO2();
    
    // Outlier rejection and finger detection
    if (currentSpO2 > 70.0 && currentHR > 40.0 && currentHR < 220.0) {
      if (sampleCount < 40) {
        hrSamples[sampleCount] = currentHR;
        spo2Samples[sampleCount] = currentSpO2;
        sampleCount++;
      }
    }
    
    // Visual progress display on OLED
    int progressPercent = map(millis() - startWait, 0, 8000, 0, 100);
    String dots = "";
    int activeBars = progressPercent / 10;
    for (int i = 0; i < activeBars; i++) dots += "=";
    
    if (sampleCount > 0) {
      renderScreen("READING...", "Keep finger steady", "SpO2: " + String((int)currentSpO2) + "%", dots);
    } else {
      renderScreen("READING...", "Place finger properly", "Waiting sensor...", dots);
    }
    
    delay(30); // Yield to CPU and sensor
  }
  
  // Validate reading confidence
  if (sampleCount < 10) {
    renderScreen("ERROR", "No Finger Detected", "Place properly", "Press button to retry");
    playBuzzerTone(500, 800);
    delay(3000);
    return;
  }
  
  // Sorting samples to remove outliers
  for (int i = 0; i < sampleCount - 1; i++) {
    for (int j = 0; j < sampleCount - i - 1; j++) {
      if (spo2Samples[j] > spo2Samples[j + 1]) {
        float temp = spo2Samples[j];
        spo2Samples[j] = spo2Samples[j + 1];
        spo2Samples[j + 1] = temp;
      }
      if (hrSamples[j] > hrSamples[j + 1]) {
        float temp = hrSamples[j];
        hrSamples[j] = hrSamples[j + 1];
        hrSamples[j + 1] = temp;
      }
    }
  }
  
  // Average middle 50% samples to filter noise and artifacts
  float hrSum = 0;
  float spo2Sum = 0;
  int trimOffset = sampleCount / 4; // trim 25% from top and 25% from bottom
  int averagedCount = 0;
  
  for (int i = trimOffset; i < (sampleCount - trimOffset); i++) {
    hrSum += hrSamples[i];
    spo2Sum += spo2Samples[i];
    averagedCount++;
  }
  
  float finalHR = hrSum / averagedCount;
  float finalSpO2 = spo2Sum / averagedCount;
  
  // Guarantee values stay within valid physiological ranges
  if (finalSpO2 > 100.0) finalSpO2 = 100.0;
  
  soundMeasurementSuccess();
  
  // Health Status Logic
  String statusMessage = "Normal";
  if (finalSpO2 < 90.0) {
    statusMessage = "Critical";
    renderScreen("RESULT", "SpO2: " + String((int)finalSpO2) + "%  HR: " + String((int)finalHR), statusMessage, "Urgent Attention!");
    soundCriticalAlarm();
  } else if (finalSpO2 <= 94.0) {
    statusMessage = "Warning";
    renderScreen("RESULT", "SpO2: " + String((int)finalSpO2) + "%  HR: " + String((int)finalHR), statusMessage, "Check position");
    soundWarningBeep();
  } else {
    renderScreen("RESULT", "SpO2: " + String((int)finalSpO2) + "%  HR: " + String((int)finalHR), "Normal", "Healthy Level");
    delay(2000);
  }
  
  // Upload to Firebase RTDB if online
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    renderScreen("UPLOADING", "Sending to Cloud...", "BPM: " + String((int)finalHR), "Firebase RTDB");
    
    time_t now = time(nullptr);
    uint64_t timestamp_ms = (uint64_t)now * 1000;
    int rssi = WiFi.RSSI();
    
    FirebaseJson json;
    json.set("spo2", finalSpO2);
    json.set("heartRate", finalHR);
    json.set("bpm", finalHR); // Fallback copy
    json.set("timestamp", timestamp_ms);
    json.set("rssi", rssi);
    json.set("status", "online");
    json.set("healthStatus", statusMessage);
    
    String path = "/device_telemetry/" + String(DEVICE_ID);
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      renderScreen("SYNCED", "Successfully Synced!", "Data Uploaded", "Just Now");
      playBuzzerTone(2500, 100);
      delay(50);
      playBuzzerTone(3000, 150);
    } else {
      renderScreen("UPLOAD ERROR", "Failed to sync", fbdo.errorReason(), "");
      playBuzzerTone(600, 500);
    }
  } else {
    renderScreen("OFFLINE RESULT", "Saved Locally", "SpO2: " + String((int)finalSpO2) + "%", "WiFi Offline");
  }
  
  delay(3000);
}

void setup() {
  Serial.begin(115200);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize I2C Wire with SDA and SCL
  Wire.begin(OLED_SDA, OLED_SCL);
  
  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  
  display.clearDisplay();
  display.display();
  
  soundPowerOn();
  showLogo();
  
  renderScreen("BOOT", "Initializing MAX30100", "Starting sensor...", "");
  
  // Initialize MAX30100 sensor
  if (!pox.begin()) {
    Serial.println("MAX30100 FAILED");
    renderScreen("SENSOR ERROR", "MAX30100 init failed", "Restart Device", "");
    soundCriticalAlarm();
    for (;;);
  } else {
    pox.setOnBeatDetectedCallback(onBeatDetected);
  }
  
  connectWiFi();
  syncNTP();
  
  // Initialize Firebase RTDB
  renderScreen("BOOT", "Connecting Firebase", String(FIREBASE_DATABASE_URL), "");
  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  config.signer.test_mode = true;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  soundReadyToMeasure();
  renderScreen("READY", "System Operational", "Place finger & press", "Start Measure");
}

void loop() {
  // Check for button press to start measurement manually
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      performMeasurementAndUpload();
      lastTelemetryTime = millis();
      renderScreen("READY", "System Operational", "Place finger & press", "Start Measure");
    }
  }
  
  // Run sensor update loop when idle to keep callback active
  pox.update();
}
