"use client";

import React, { useState } from "react";
import { getMediSyncDb, saveMediSyncDb, writePatientVitalsToFirestore } from "@/services/firebase";
import { Check, Edit3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function IoTSimulator() {
  const { user } = useAuth();
  const patientId = user?.uid || "pat1";
  
  // State for Manual Mode (form inputs)
  const [manHR, setManHR] = useState("");
  const [manSpO2, setManSpO2] = useState("");
  const [manTemp, setManTemp] = useState("");
  const [manSys, setManSys] = useState("");
  const [manDia, setManDia] = useState("");
  const [manGluc, setManGluc] = useState("");
  const [manualSaveSuccess, setManualSaveSuccess] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hr = parseInt(manHR) || 0;
    const ox = parseInt(manSpO2) || 0;
    const t = parseFloat(manTemp) || 0;
    const sys = parseInt(manSys) || 0;
    const dia = parseInt(manDia) || 0;
    const gluc = parseInt(manGluc) || 0;

    const db = getMediSyncDb();
    const patient = db.patients.find(p => p.uid === patientId);
    if (patient) {
      patient.vitalsMode = "manual";
      
      // Preserve old vitals if new ones aren't provided
      patient.vitals = {
        heartRate: hr || patient.vitals.heartRate,
        spo2: ox || patient.vitals.spo2,
        temperature: t || patient.vitals.temperature,
        systolic: sys || patient.vitals.systolic,
        diastolic: dia || patient.vitals.diastolic,
        glucose: gluc || patient.vitals.glucose,
        fallDetected: false,
        ecg: patient.vitals.ecg || [],
        lastUpdated: new Date().toISOString()
      };
      
      saveMediSyncDb(db);
      writePatientVitalsToFirestore(patientId, patient.name, patient.vitals);
      window.dispatchEvent(new Event("storage"));

      setManualSaveSuccess(true);
      setTimeout(() => setManualSaveSuccess(false), 2000);
      
      // Clear inputs
      setManHR(""); setManSpO2(""); setManTemp(""); setManSys(""); setManDia(""); setManGluc("");
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/15 bg-luxury-richBlack text-white shadow-2xl relative overflow-hidden animate-glow-gold">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-luxury-goldRoyal/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/30 text-luxury-goldRoyal rounded-xl">
            <Edit3 size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wider text-luxury-goldRoyal">MANUAL VITALS ENTRY</h3>
            <p className="text-[10px] text-zinc-500">Update your clinical records manually</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Heart Rate (BPM)</label>
            <input type="number" placeholder="e.g. 72" value={manHR} onChange={(e) => setManHR(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Oxygen (SpO2 %)</label>
            <input type="number" placeholder="e.g. 98" value={manSpO2} onChange={(e) => setManSpO2(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Temperature (°F)</label>
            <input type="number" step="0.1" placeholder="e.g. 98.6" value={manTemp} onChange={(e) => setManTemp(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Systolic BP</label>
            <input type="number" placeholder="e.g. 120" value={manSys} onChange={(e) => setManSys(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Diastolic BP</label>
            <input type="number" placeholder="e.g. 80" value={manDia} onChange={(e) => setManDia(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Glucose (mg/dL)</label>
            <input type="number" placeholder="e.g. 100" value={manGluc} onChange={(e) => setManGluc(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none focus:border-luxury-goldRoyal" />
          </div>
        </div>

        <button type="submit"
          className="w-full py-2.5 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
          {manualSaveSuccess ? <Check size={14} /> : null}
          {manualSaveSuccess ? "VITALS SAVED!" : "TRANSMIT MANUAL READINGS"}
        </button>
      </form>
    </div>
  );
}
