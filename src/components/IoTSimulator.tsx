"use client";

import React, { useState, useEffect } from "react";
import { getMediSyncDb, saveMediSyncDb } from "@/services/firebase";
import { Radio, Heart, Wind, Thermometer, Droplet, ShieldAlert, Activity, Check, Cpu } from "lucide-react";

export default function IoTSimulator() {
  const [patientId] = useState("pat1");
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [vitalsMode, setVitalsMode] = useState<"device" | "manual">("device");

  // State for Device Mode (simulation sliders)
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.6);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [glucose, setGlucose] = useState(104);
  const [fallDetected, setFallDetected] = useState(false);
  const [abnormalEcg, setAbnormalEcg] = useState(false);

  // State for Manual Mode (form inputs)
  const [manHR, setManHR] = useState("75");
  const [manSpO2, setManSpO2] = useState("98");
  const [manTemp, setManTemp] = useState("36.7");
  const [manSys, setManSys] = useState("120");
  const [manDia, setManDia] = useState("80");
  const [manGluc, setManGluc] = useState("105");
  const [manualSaveSuccess, setManualSaveSuccess] = useState(false);

  // Sync Vitals Mode toggle with DB
  useEffect(() => {
    const db = getMediSyncDb();
    const patient = db.patients.find(p => p.uid === patientId);
    if (patient) {
      patient.vitalsMode = vitalsMode;
      saveMediSyncDb(db);
    }
  }, [vitalsMode]);

  // ESP32 Auto Device Stream loop
  useEffect(() => {
    if (!isTransmitting || vitalsMode !== "device") return;

    const interval = setInterval(() => {
      const db = getMediSyncDb();
      const patient = db.patients.find((p) => p.uid === patientId);
      if (!patient) return;

      // Device calculations with slight natural fluctuations
      const hrJitter = Math.floor(Math.random() * 3) - 1;
      const bpJitter = Math.floor(Math.random() * 3) - 1;
      
      const currentHr = Math.max(40, Math.min(180, heartRate + hrJitter));
      const currentSys = Math.max(80, Math.min(200, systolic + bpJitter));
      const currentDia = Math.max(50, Math.min(120, diastolic + bpJitter));
      
      const ecgPoints = [];
      const len = 40;
      for (let i = 0; i < len; i++) {
        if (abnormalEcg) {
          ecgPoints.push(Math.sin(i * 0.5) * 20 + Math.random() * 30 + 30);
        } else {
          const phase = i % 10;
          if (phase === 3) ecgPoints.push(110);
          else if (phase === 4) ecgPoints.push(20);
          else if (phase === 8) ecgPoints.push(65);
          else ecgPoints.push(50);
        }
      }

      patient.vitals = {
        heartRate: currentHr,
        spo2,
        temperature: parseFloat(temp.toFixed(1)),
        systolic: currentSys,
        diastolic: currentDia,
        glucose,
        fallDetected,
        ecg: ecgPoints,
        lastUpdated: new Date().toISOString()
      };

      if (patient.connectedDevice) {
        patient.connectedDevice.status = "online";
        patient.connectedDevice.lastSync = new Date().toISOString();
      }

      // Alert Engine checks
      checkEmergencyAlerts(db, patient.name, currentHr, spo2, temp, fallDetected, abnormalEcg);
      saveMediSyncDb(db);
      window.dispatchEvent(new Event("storage"));
    }, 1000);

    return () => clearInterval(interval);
  }, [patientId, heartRate, spo2, temp, systolic, diastolic, glucose, fallDetected, abnormalEcg, isTransmitting, vitalsMode]);

  const checkEmergencyAlerts = (db: any, name: string, hr: number, ox: number, t: number, fall: boolean, ecg: boolean) => {
    let newAlert = null;
    if (ox < 90) newAlert = { metric: "SpO2" as const, value: `${ox}%`, severity: "critical" as const };
    else if (hr > 130 || hr < 45) newAlert = { metric: "Heart Rate" as const, value: `${hr} bpm`, severity: "critical" as const };
    else if (t > 39.0) newAlert = { metric: "Temperature" as const, value: `${t.toFixed(1)}°C`, severity: "critical" as const };
    else if (fall) newAlert = { metric: "Fall" as const, value: "Immediate Fall Event", severity: "critical" as const };
    else if (ecg) newAlert = { metric: "ECG" as const, value: "Abnormal Rhythms Detected", severity: "warning" as const };

    if (newAlert) {
      const hasExisting = db.alerts.some((a: any) => a.patientId === patientId && a.metric === newAlert!.metric && a.status === "active");
      if (!hasExisting) {
        db.alerts.unshift({
          id: `alt-${Date.now()}`,
          patientId,
          patientName: name,
          metric: newAlert.metric,
          value: newAlert.value,
          severity: newAlert.severity,
          timestamp: new Date().toISOString(),
          status: "active"
        });
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hr = parseInt(manHR) || 72;
    const ox = parseInt(manSpO2) || 98;
    const t = parseFloat(manTemp) || 36.6;
    const sys = parseInt(manSys) || 120;
    const dia = parseInt(manDia) || 80;
    const gluc = parseInt(manGluc) || 104;

    const db = getMediSyncDb();
    const patient = db.patients.find(p => p.uid === patientId);
    if (patient) {
      patient.vitals = {
        heartRate: hr,
        spo2: ox,
        temperature: t,
        systolic: sys,
        diastolic: dia,
        glucose: gluc,
        fallDetected: false,
        ecg: Array.from({ length: 40 }, () => Math.sin(Math.random() * Math.PI) * 10 + 50),
        lastUpdated: new Date().toISOString()
      };
      
      checkEmergencyAlerts(db, patient.name, hr, ox, t, false, false);
      saveMediSyncDb(db);
      window.dispatchEvent(new Event("storage"));

      setManualSaveSuccess(true);
      setTimeout(() => setManualSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/15 bg-luxury-richBlack text-white shadow-2xl relative overflow-hidden animate-glow-gold">
      
      {/* Golden glow decoration */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-luxury-goldRoyal/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header and Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/30 text-luxury-goldRoyal rounded-xl animate-pulse">
            <Cpu size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wider text-luxury-goldRoyal">IOT TRANSMITTER CONSOLE</h3>
            <p className="text-[10px] text-zinc-500">Firebase Realtime Path: patients/pat1/liveVitals</p>
          </div>
        </div>

        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setVitalsMode("device")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              vitalsMode === "device"
                ? "bg-luxury-goldRoyal text-luxury-pureBlack shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            ESP32 Auto Stream
          </button>
          <button
            onClick={() => setVitalsMode("manual")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              vitalsMode === "manual"
                ? "bg-luxury-goldRoyal text-luxury-pureBlack shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {vitalsMode === "device" ? (
        /* ESP32 Auto Stream panel */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-850">
            <span className="text-xs text-zinc-400 flex items-center gap-2">
              <Radio size={14} className="text-luxury-blueElectric animate-pulse" />
              ESP32 Device Node: Online
            </span>
            <button
              onClick={() => setIsTransmitting(!isTransmitting)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                isTransmitting 
                  ? "bg-luxury-greenEmerald/15 text-luxury-greenEmerald border-luxury-greenEmerald/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {isTransmitting ? "TRANSMITTING DATA" : "TRANSMISSION PAUSED"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                  <span><Heart size={12} className="inline mr-1 text-luxury-redCrimson" /> Heart Rate</span>
                  <span className="font-mono text-white font-semibold">{heartRate} bpm</span>
                </label>
                <input
                  type="range" min="40" max="160" value={heartRate}
                  onChange={(e) => setHeartRate(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                  <span><Wind size={12} className="inline mr-1 text-luxury-blueElectric" /> Oxygen (SpO2)</span>
                  <span className="font-mono text-white font-semibold">{spo2}%</span>
                </label>
                <input
                  type="range" min="80" max="100" value={spo2}
                  onChange={(e) => setSpo2(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                  <span><Thermometer size={12} className="inline mr-1 text-luxury-goldRoyal" /> Body Temperature</span>
                  <span className="font-mono text-white font-semibold">{temp.toFixed(1)}°C</span>
                </label>
                <input
                  type="range" min="34" max="41" step="0.1" value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                  <span><Activity size={12} className="inline mr-1 text-luxury-greenEmerald" /> Blood Pressure (mmHg)</span>
                  <span className="font-mono text-white font-semibold">{systolic}/{diastolic}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" value={systolic} onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                    className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 rounded-lg focus:outline-none focus:border-luxury-goldRoyal"
                  />
                  <input
                    type="number" value={diastolic} onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                    className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 rounded-lg focus:outline-none focus:border-luxury-goldRoyal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                  <span><Droplet size={12} className="inline mr-1 text-amber-500" /> Fasting Blood Sugar</span>
                  <span className="font-mono text-white font-semibold">{glucose} mg/dL</span>
                </label>
                <input
                  type="range" min="60" max="220" value={glucose}
                  onChange={(e) => setGlucose(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setFallDetected(!fallDetected)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    fallDetected
                      ? "bg-luxury-redCrimson/20 text-luxury-redCrimson border-luxury-redCrimson/40 animate-bounce"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  {fallDetected ? "FALL EVENT ACTIVE" : "SIMULATE FALL"}
                </button>
                <button
                  onClick={() => setAbnormalEcg(!abnormalEcg)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    abnormalEcg
                      ? "bg-luxury-goldRoyal/20 text-luxury-goldRoyal border-luxury-goldRoyal/40"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  {abnormalEcg ? "ARRHYTHMIA ON" : "MOCK ECG ARRYTHMIA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manual vital entry form */
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Heart Rate (BPM)</label>
              <input
                type="number" value={manHR} onChange={(e) => setManHR(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Oxygen Saturation (%)</label>
              <input
                type="number" value={manSpO2} onChange={(e) => setManSpO2(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Temperature (°C)</label>
              <input
                type="number" step="0.1" value={manTemp} onChange={(e) => setManTemp(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Systolic BP</label>
              <input
                type="number" value={manSys} onChange={(e) => setManSys(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Diastolic BP</label>
              <input
                type="number" value={manDia} onChange={(e) => setManDia(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Glucose (mg/dL)</label>
              <input
                type="number" value={manGluc} onChange={(e) => setManGluc(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {manualSaveSuccess ? <Check size={14} /> : null}
            {manualSaveSuccess ? "VITALS TRANSMITTED!" : "TRANSMIT MANUAL READINGS"}
          </button>
        </form>
      )}

      <div className="mt-4 pt-4 border-t border-zinc-850 flex justify-between items-center text-[9px] text-zinc-600">
        <span>Signal Status: AES-GCM Encrypted Link</span>
        <span>RSSI: -44dBm</span>
      </div>
    </div>
  );
}
