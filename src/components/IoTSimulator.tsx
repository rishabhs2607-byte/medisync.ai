"use client";

import React, { useState, useEffect } from "react";
import { getMediSyncDb, saveMediSyncDb, getStorageData, setStorageData } from "@/services/firebase";
import { analyzeVitals } from "@/services/aiEngine";
import { Activity, ShieldAlert, Heart, Thermometer, Wind, Activity as ECGIcon, Droplet, Radio } from "lucide-react";

export default function IoTSimulator() {
  const [patientId, setPatientId] = useState("pat1");
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.6);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [glucose, setGlucose] = useState(104);
  const [fallDetected, setFallDetected] = useState(false);
  const [abnormalEcg, setAbnormalEcg] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(true);

  // Send readings automatically every second
  useEffect(() => {
    if (!isTransmitting) return;

    const interval = setInterval(() => {
      const db = getMediSyncDb();
      const patient = db.patients.find((p) => p.uid === patientId);
      if (!patient) return;

      // Small jitter for realism
      const hrJitter = Math.floor(Math.random() * 3) - 1;
      const bpJitter = Math.floor(Math.random() * 3) - 1;
      
      const currentHr = Math.max(40, Math.min(180, heartRate + hrJitter));
      const currentSys = Math.max(80, Math.min(200, systolic + bpJitter));
      const currentDia = Math.max(50, Math.min(120, diastolic + bpJitter));
      
      // ECG simulation array
      const ecgPoints = [];
      const len = 40;
      for (let i = 0; i < len; i++) {
        if (abnormalEcg) {
          // Irregular spikes
          ecgPoints.push(Math.sin(i * 0.5) * 20 + Math.random() * 30 + 30);
        } else {
          // Standard sinewave heartbeat shape
          const phase = i % 10;
          if (phase === 3) ecgPoints.push(110); // R wave
          else if (phase === 4) ecgPoints.push(20); // S wave
          else if (phase === 8) ecgPoints.push(65); // T wave
          else ecgPoints.push(50); // Isoelectric line
        }
      }

      // Update patient vitals
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

      // ----------------------------------------
      // ALERT ENGINE CHECK
      // ----------------------------------------
      let newAlert = null;
      if (spo2 < 90) {
        newAlert = { metric: "SpO2" as const, value: `${spo2}%`, severity: "critical" as const };
      } else if (currentHr > 130) {
        newAlert = { metric: "Heart Rate" as const, value: `${currentHr} bpm`, severity: "critical" as const };
      } else if (currentHr < 45) {
        newAlert = { metric: "Heart Rate" as const, value: `${currentHr} bpm`, severity: "critical" as const };
      } else if (temp > 39.0) {
        newAlert = { metric: "Temperature" as const, value: `${temp.toFixed(1)}°C`, severity: "critical" as const };
      } else if (fallDetected) {
        newAlert = { metric: "Fall" as const, value: "Immediate Fall Event", severity: "critical" as const };
      } else if (abnormalEcg) {
        newAlert = { metric: "ECG" as const, value: "Abnormal Rhythms Detected", severity: "warning" as const };
      }

      if (newAlert) {
        // Avoid duplicate alerts in same minute
        const hasExisting = db.alerts.some(
          (a) => a.patientId === patientId && a.metric === newAlert!.metric && a.status === "active"
        );

        if (!hasExisting) {
          const alertId = `alt-${Date.now()}`;
          const alertRecord = {
            id: alertId,
            patientId,
            patientName: patient.name,
            metric: newAlert.metric,
            value: newAlert.value,
            severity: newAlert.severity,
            timestamp: new Date().toISOString(),
            status: "active" as const
          };
          db.alerts.unshift(alertRecord);
        }
      }

      saveMediSyncDb(db);

      // Trigger custom storage update event to refresh other tabs/components
      window.dispatchEvent(new Event("storage"));
    }, 1000);

    return () => clearInterval(interval);
  }, [patientId, heartRate, spo2, temp, systolic, diastolic, glucose, fallDetected, abnormalEcg, isTransmitting]);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 text-white shadow-2xl relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl text-primary animate-pulse-fast">
            <Radio size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg tracking-wide">ESP32 IoT Simulator</h3>
            <p className="text-xs text-zinc-400">Emulate real-time medical hardware streams</p>
          </div>
        </div>
        <button
          onClick={() => setIsTransmitting(!isTransmitting)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
            isTransmitting
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}
        >
          {isTransmitting ? "TRANSMITTING VIALS" : "TRANSMISSION PAUSED"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5"><Heart size={14} className="text-red-400" /> Heart Rate (BPM)</span>
              <span className="font-semibold text-white">{heartRate} bpm</span>
            </label>
            <input
              type="range"
              min="40"
              max="160"
              value={heartRate}
              onChange={(e) => setHeartRate(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5"><Wind size={14} className="text-cyan-400" /> Oxygen Saturation (SpO2)</span>
              <span className="font-semibold text-white">{spo2}%</span>
            </label>
            <input
              type="range"
              min="80"
              max="100"
              value={spo2}
              onChange={(e) => setSpo2(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5"><Thermometer size={14} className="text-orange-400" /> Temperature (°C)</span>
              <span className="font-semibold text-white">{temp.toFixed(1)}°C</span>
            </label>
            <input
              type="range"
              min="34.0"
              max="41.5"
              step="0.1"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Right Column Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5"><Activity size={14} className="text-emerald-400" /> Blood Pressure (mmHg)</span>
              <span className="font-semibold text-white">{systolic}/{diastolic}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                placeholder="Sys"
                className="w-1/2 bg-zinc-900 border border-zinc-800 text-sm text-center py-1 rounded-lg focus:outline-none focus:border-primary"
              />
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                placeholder="Dia"
                className="w-1/2 bg-zinc-900 border border-zinc-800 text-sm text-center py-1 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5"><Droplet size={14} className="text-amber-500" /> Glucose (mg/dL)</span>
              <span className="font-semibold text-white">{glucose} mg/dL</span>
            </label>
            <input
              type="range"
              min="60"
              max="220"
              value={glucose}
              onChange={(e) => setGlucose(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Trigger Flags */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => setFallDetected(!fallDetected)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                fallDetected
                  ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10 animate-bounce"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              <ShieldAlert size={14} />
              {fallDetected ? "FALL DETECTED!" : "SIMULATE FALL"}
            </button>

            <button
              onClick={() => setAbnormalEcg(!abnormalEcg)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                abnormalEcg
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              <ECGIcon size={14} />
              {abnormalEcg ? "ABNORMAL ECG" : "MOCK ARRYTHMIA"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
        <span>Target: ESP32 REST Endpoint /vitals/pat1</span>
        <span>RSSI: -42dBm (Strong)</span>
      </div>
    </div>
  );
}
