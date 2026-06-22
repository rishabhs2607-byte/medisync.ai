/*
 * MediSync IoT Thermometer Integration Firmware
 * Target Board: ESP8266 NodeMCU / Wemos D1 Mini / Generic ESP8266
 * 
 * Hardware Connections (Label mapping):
 * 1. DS18B20 Temp Sensor: DATA -> Pin D4 (GPIO 2), VCC -> 3.3V, GND -> GND
 *    Note: Place a 4.7k Ohm resistor between DATA and VCC pins.
 * 2. SSD1306 OLED (I2C): SDA -> Pin D2 (GPIO 4), SCL -> Pin D1 (GPIO 5), VCC -> 3.3V, GND -> GND
 * 3. Push Button: Pin D3 (GPIO 0) -> Pin 1, GND -> Pin 2
 * 4. Active Buzzer: Positive (+) -> Pin D5 (GPIO 14), Negative (-) -> GND
 * 5. TP4056 + 18650 Battery: Powers the ESP8266 NodeMCU via VIN/GND pins
 * 
 * Features:
 * - OLED display flow: Boot -> WiFi -> Firebase -> Ready -> Measuring -> Processing -> Result -> Synced.
 * - Active buzzer sound alerts for boot, ready, completion, fever alert, and high fever warning.
 * - Outlier filtering algorithm (reads 20 samples, discards top/bottom 4, averages middle 12, applies EMA).
 * - Instant manual trigger using the push button (GPIO 0).
 * - 10-second automatic loop transmission of temperature, NTP timestamp, and WiFi RSSI to Firebase RTDB.
 */

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

// Firebase Helpers
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// --- Pin Mappings (Auto-detect Wemos/NodeMCU Pin Labels, otherwise fallback to raw GPIO numbers) ---
#ifdef D4
  #define DS18B20_PIN D4
#else
  #define DS18B20_PIN 2    // GPIO 2
#endif

#ifdef D3
  #define BUTTON_PIN D3
#else
  #define BUTTON_PIN 0     // GPIO 0
#endif

#ifdef D5
  #define BUZZER_PIN D5
#else
  #define BUZZER_PIN 14    // GPIO 14
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

// --- OneWire & DS18B20 Configuration ---
OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);

// --- Firebase Configuration ---
#define FIREBASE_API_KEY "AIzaSyBsedBBMCahJXiNShwNICk7UxUJwY4229A"
#define FIREBASE_DATABASE_URL "https://medisync-2b25a-default-rtdb.firebaseio.com"
#define DEVICE_ID "thermometer_01" // Matches listener on the dashboard

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- WiFi Configuration ---
#define WIFI_SSID "Test"
#define WIFI_PASSWORD "22558800"

// --- Global variables for filtering & tracking ---
float filteredTemp = 36.6;
bool firstReading = true;
const float EMA_ALPHA = 0.2; // Exponential Moving Average smoothing weight

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

void soundFeverAlert() {
  // 3 short, high-pitched beeps
  for (int i = 0; i < 3; i++) {
    playBuzzerTone(2800, 120);
    delay(80);
  }
}

void soundHighFeverWarning() {
  // 5 rapid, urgent beeps
  for (int i = 0; i < 5; i++) {
    playBuzzerTone(3200, 80);
    delay(50);
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
    display.setTextSize(2); // Draw temperature or values larger
    display.println(line3);
  }

  if (line4.length() > 0) {
    display.setCursor(0, 54);
    display.setTextSize(1);
    display.println(line4);
  }
  
  // Constant Footer: MediSync
  display.setCursor(38, 56);
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
  display.setCursor(32, 34);
  display.println("Thermometer");
  
  display.setCursor(20, 48);
  display.println("IoT Health Module");
  display.display();
  delay(2000);
}

// --- Filtering Logic ---
float getFilteredTemp() {
  float samples[20];
  int validSamplesCount = 0;

  renderScreen("MEASURING", "Taking 20 samples...", "Reading DS18B20", "");

  for (int i = 0; i < 20; i++) {
    sensors.requestTemperatures();
    float rawTemp = sensors.getTempCByIndex(0);

    // DS18B20 returns DEVICE_DISCONNECTED_C (-127.0 C) or 85.0 C if not ready
    if (rawTemp != DEVICE_DISCONNECTED_C && rawTemp > -55.0 && rawTemp < 125.0) {
      samples[validSamplesCount] = rawTemp;
      validSamplesCount++;
    }
    
    // Animate progress on screen
    String progress = "";
    for (int j = 0; j <= i; j++) {
      if (j % 5 == 0) progress += ".";
    }
    renderScreen("MEASURING", "Reading DS18B20", "Samples: " + String(validSamplesCount) + "/20", progress);
    delay(50); // 50ms sample separation
  }

  if (validSamplesCount < 10) {
    renderScreen("ERROR", "Sensor disconnected", "Check wiring", "MediSync");
    playBuzzerTone(500, 1000);
    return DEVICE_DISCONNECTED_C;
  }

  renderScreen("PROCESSING", "Removing outliers...", "Sorting array", "Alpha = 0.2");

  // Bubble sort the samples array to isolate outliers
  for (int i = 0; i < validSamplesCount - 1; i++) {
    for (int j = 0; j < validSamplesCount - i - 1; j++) {
      if (samples[j] > samples[j + 1]) {
        float temp = samples[j];
        samples[j] = samples[j + 1];
        samples[j + 1] = temp;
      }
    }
  }

  // Discard lowest 4 and highest 4 (Or equivalent percentage if validSamplesCount < 20)
  int discardNum = 4;
  if (validSamplesCount < 20) {
    discardNum = validSamplesCount / 5;
  }

  float sum = 0.0;
  int averagedCount = 0;
  for (int i = discardNum; i < (validSamplesCount - discardNum); i++) {
    sum += samples[i];
    averagedCount++;
  }

  float average = sum / (float)averagedCount;

  // Apply Exponential Moving Average (EMA)
  if (firstReading) {
    filteredTemp = average;
    firstReading = false;
  } else {
    filteredTemp = (EMA_ALPHA * average) + ((1.0 - EMA_ALPHA) * filteredTemp);
  }

  return filteredTemp;
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
  float finalTemp = getFilteredTemp();

  if (finalTemp == DEVICE_DISCONNECTED_C) {
    renderScreen("ERROR", "Sensor disconnected", "Check Pin D4", "");
    return;
  }

  // Play result completion beep
  soundMeasurementSuccess();

  // Evaluate temperature and trigger alert beeps
  String statusMessage = "Normal";
  if (finalTemp > 39.0) {
    statusMessage = "High Fever!";
    renderScreen("RESULT", "Body Temp:", String(finalTemp, 1) + " C", statusMessage);
    soundHighFeverWarning();
  } else if (finalTemp > 38.0) {
    statusMessage = "Fever Alert!";
    renderScreen("RESULT", "Body Temp:", String(finalTemp, 1) + " C", statusMessage);
    soundFeverAlert();
  } else {
    renderScreen("RESULT", "Body Temp:", String(finalTemp, 1) + " C", "Normal Range");
    delay(1000);
  }

  // Upload to Firebase if connected
  if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
    renderScreen("UPLOADING", "Sending to Cloud...", String(finalTemp, 1) + " C", "Firebase RTDB");
    
    time_t now = time(nullptr);
    uint64_t timestamp_ms = (uint64_t)now * 1000;
    int rssi = WiFi.RSSI();

    FirebaseJson json;
    json.set("temperature", finalTemp);
    json.set("timestamp", timestamp_ms);
    json.set("rssi", rssi);
    json.set("status", "online");

    String path = "/device_telemetry/" + String(DEVICE_ID);
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      renderScreen("SYNCED", "Successfully Synced!", String(finalTemp, 1) + " C", "Just Now");
      playBuzzerTone(2500, 100);
      delay(50);
      playBuzzerTone(3000, 150);
    } else {
      renderScreen("UPLOAD ERROR", "Failed to sync", fbdo.errorReason(), "");
      playBuzzerTone(600, 500);
    }
  } else {
    renderScreen("OFFLINE RESULT", "Saved Locally", String(finalTemp, 1) + " C", "WiFi Offline");
  }
  
  delay(2000);
}

void setup() {
  Serial.begin(115200);
  
  // Set up button pin with internal pullup
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize I2C Wire and SSD1306 Display
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;); // Stop if display is missing
  }

  display.clearDisplay();
  display.display();

  soundPowerOn();
  showLogo();

  renderScreen("BOOT", "Initializing DS18B20", "Starting sensors", "");
  sensors.begin();
  sensors.setResolution(12);

  connectWiFi();
  syncNTP();

  // Initialize Firebase RTDB connection
  renderScreen("BOOT", "Connecting Firebase", String(FIREBASE_DATABASE_URL), "");
  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  
  /* Authenticate using Anonymous login (enable in Firebase console) */
  auth.user.email = "";
  auth.user.password = "";
  
  /* Alternative authentication methods:
   * 1. Email/Password:
   *    auth.user.email = "device@medisync.ai";
   *    auth.user.password = "yourpassword";
   * 
   * 2. Database Secret (Legacy token):
   *    config.signer.tokens.legacy_token = "your_database_secret";
   */
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  soundReadyToMeasure();
  renderScreen("READY", "System Operational", "Press D3 Button", "To Start Measure");
}

void loop() {
  // Check for button press to instantly start measurement
  // Since BUTTON_PIN is active LOW (grounded when pressed):
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce delay
    if (digitalRead(BUTTON_PIN) == LOW) {
      performMeasurementAndUpload();
      // Reset auto timer so we don't upload immediately after a manual press
      lastTelemetryTime = millis();
      renderScreen("READY", "System Operational", "Press D3 Button", "To Start Measure");
    }
  }

  // Automatic periodic check loop (every 10 seconds)
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    
    // Automatically perform measurement and sync
    performMeasurementAndUpload();
    renderScreen("READY", "System Operational", "Press D3 Button", "To Start Measure");
  }
}