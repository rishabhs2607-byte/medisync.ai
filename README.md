# MediSync AI — Digital Healthcare Operating System

MediSync AI is a startup-ready, next-generation digital healthcare operating system designed for real-world hospitals, clinics, home healthcare, elderly care, and remote patient monitoring. 

It links clinical telemedicine, continuous wireless IoT telemetry (ESP32), AI Diagnostics, and automated Emergency Response into a secure platform with Apple/Stripe-inspired glassmorphic aesthetics.

---

## 🌍 Core Missions
- **Affordable & Accessible**: Tele-supervision from anywhere in the world.
- **Wireless Telemetry**: Patients pair custom ESP32 units at home to stream real-time vitals.
- **Real-Time Doctor Workspace**: Real-time vital widgets (no page refresh) and SVG ECG waveforms.
- **Automated Alerts**: Emergency engine detects falls or vital anomalies and coordinates alerts.

---

## 🏗 System Architecture

```
ESP32 Medical Device  -->  MQTT Broker  -->  Firebase Realtime Database
                                                           │
                                                           ▼
Admin & Hospital ERP  <--  Doctor Dashboard  <--  Next.js 15 Web Application
```

---

## 🔌 Hardware Sensor Wiring Reference (ESP32)

| Sensor | Metric | ESP32 Pin | Interface |
| :--- | :--- | :--- | :--- |
| **MAX30102** | Heart Rate & SpO2 | SDA (Pin 21) / SCL (Pin 22) | I2C |
| **DS18B20** | Body Temperature | GPIO 4 | OneWire (4.7k Pull-up) |
| **MPU6050** | Fall Detection | SDA (Pin 21) / SCL (Pin 22) | I2C |
| **AD8232** | ECG Lead Reader | GPIO 34 (Analog) | ADC |

---

## 🖥 Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Firebase Auth, Firestore Database, Realtime Database, Cloud Storage
- **IoT Firmware**: C++ (Arduino/PlatformIO), ESP32 WiFiClient, PubSubClient, SPIFFS local storage buffers

---

## 🚀 Local Deployment

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure `.env.local` contains your Firebase project configurations.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Navigate Workspace**:
   Open `http://localhost:3000` to explore portals (Patient, Doctor, Hospital ERP, Admin Console, WebRTC consult room, Emergency center). Use the visual **IoT Simulator** to interactively stream sensor readings!
