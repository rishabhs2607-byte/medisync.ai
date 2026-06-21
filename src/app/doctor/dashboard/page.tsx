"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription, EmergencyAlert } from "@/services/firebase";
import { analyzeVitals } from "@/services/aiEngine";
import { 
  Users, 
  Heart, 
  Wind, 
  Thermometer, 
  Droplet, 
  FileText, 
  AlertOctagon, 
  Calendar, 
  Check, 
  Phone, 
  Cpu, 
  Stethoscope, 
  Plus, 
  ChevronRight, 
  Video,
  ArrowLeft,
  Settings
} from "lucide-react";

export default function DoctorDashboard() {
  const [doctorId] = useState("doc1");
  const [selectedPatientId, setSelectedPatientId] = useState("pat1");
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);

  // Prescription builder state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medDur, setMedDur] = useState("");
  const [currentPresMeds, setCurrentPresMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([]);
  const [presNotes, setPresNotes] = useState("");

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono">Connecting to MediSync DB...</div>;
  }

  const doctorProfile = db.users.find(u => u.uid === doctorId);
  const selectedPatient = db.patients.find(p => p.uid === selectedPatientId);
  const activeAlerts = db.alerts.filter(a => a.status === "active");

  const addMedicineToDraft = () => {
    if (!medName || !medDosage || !medFreq || !medDur) return;
    setCurrentPresMeds([...currentPresMeds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur }]);
    setMedName("");
    setMedDosage("");
    setMedFreq("");
    setMedDur("");
  };

  const submitPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPresMeds.length === 0 || !selectedPatient) return;

    const newPres: Prescription = {
      id: `pr-${Date.now()}`,
      patientId: selectedPatient.uid,
      doctorId,
      doctorName: doctorProfile?.name || "Dr. Alexander Marcus",
      date: new Date().toISOString().split("T")[0],
      medicines: currentPresMeds,
      notes: presNotes
    };

    const currentDb = getMediSyncDb();
    currentDb.prescriptions.unshift(newPres);
    
    // Also log in patient medical record history
    const patientRecord = currentDb.patients.find(p => p.uid === selectedPatient.uid);
    if (patientRecord) {
      patientRecord.history.unshift({
        date: new Date().toISOString().split("T")[0],
        diagnosis: `Prescription issued: ${currentPresMeds.map(m => m.name).join(", ")}`,
        doctor: doctorProfile?.name || "Dr. Alexander Marcus"
      });
    }

    saveMediSyncDb(currentDb);
    loadDb();

    // Reset draft fields
    setCurrentPresMeds([]);
    setPresNotes("");
  };

  const resolveAlert = (alertId: string) => {
    const currentDb = getMediSyncDb();
    const alert = currentDb.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = "resolved";
    }
    saveMediSyncDb(currentDb);
    loadDb();
  };

  // Perform AI vital evaluation on selected patient
  const patientVitals = selectedPatient?.vitals || { heartRate: 70, spo2: 98, temperature: 36.6, systolic: 120, diastolic: 80, glucose: 100 };
  const aiReport = analyzeVitals(
    patientVitals.heartRate,
    patientVitals.spo2,
    patientVitals.temperature,
    patientVitals.systolic,
    patientVitals.diastolic,
    patientVitals.glucose
  );

  return (
    <div className="min-h-screen bg-background pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{doctorProfile?.name || "Dr. Alexander Marcus"}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">Clinical Practitioner</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{doctorProfile?.hospitalAffiliation || "Mayo Clinic"} • License ID: {doctorProfile?.licenseNumber || "LIC-88290-A"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-zinc-400 font-mono">Clinical Stream: </span>
            <span className="text-emerald-400 font-bold font-mono">ONLINE</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Assigned Patients List & Active Alerts */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Alerts Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-red-950/5">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide mb-4">
              <AlertOctagon size={16} /> Clinical Emergencies ({activeAlerts.length})
            </h3>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No active emergencies</p>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-zinc-900/60 rounded-xl border border-red-500/10 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white">{alert.patientName}</p>
                        <p className="text-[10px] text-red-400 font-semibold">{alert.metric}: {alert.value}</p>
                      </div>
                      <button 
                        onClick={() => resolveAlert(alert.id)}
                        className="p-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded transition-colors text-[9px] uppercase font-bold"
                      >
                        Resolve
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-mono">Time: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patient Registry */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-1.5 text-zinc-400">
              <Users size={16} /> Assigned Patients ({db.patients.length})
            </h3>
            
            <div className="space-y-2">
              {db.patients.map((pat) => {
                const hasAlert = activeAlerts.some(a => a.patientId === pat.uid);
                const isSelected = selectedPatientId === pat.uid;

                return (
                  <button
                    key={pat.uid}
                    onClick={() => setSelectedPatientId(pat.uid)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/5 text-white"
                        : hasAlert
                        ? "bg-red-500/10 border-red-500/30 text-white animate-pulse-fast"
                        : "bg-zinc-950/60 border-zinc-900/60 hover:bg-zinc-900/40 text-zinc-300"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold">{pat.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Age: {pat.age} • Device: {pat.connectedDevice?.deviceId || "None"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-mono font-bold ${hasAlert ? "text-red-400" : "text-emerald-400"}`}>
                        {pat.vitals.heartRate} bpm
                      </span>
                      {hasAlert && (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Selected Patient Live Telemetry & ECG Wave */}
        {selectedPatient ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Selected Patient Overview Header */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">{selectedPatient.name} Live Stream</h2>
                <p className="text-xs text-zinc-400 mt-1">Allergies: {selectedPatient.allergies.join(", ") || "None"} • Active Medications: {selectedPatient.medications.join(", ") || "None"}</p>
              </div>
              
              <Link 
                href="/consultation" 
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] flex items-center gap-1.5"
              >
                <Video size={14} /> Start Consultation Room
              </Link>
            </div>

            {/* Vitals Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 font-mono">HEART RATE</p>
                <p className="text-2xl font-extrabold text-red-400 mt-2 flex items-center justify-center gap-1">{selectedPatient.vitals.heartRate} <span className="text-[10px] text-zinc-400">bpm</span></p>
              </div>
              
              <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 font-mono">SPO2</p>
                <p className="text-2xl font-extrabold text-cyan-400 mt-2">{selectedPatient.vitals.spo2}%</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 font-mono">TEMPERATURE</p>
                <p className="text-2xl font-extrabold text-orange-400 mt-2">{selectedPatient.vitals.temperature}°C</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 font-mono">BP (SYS/DIA)</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-2">{selectedPatient.vitals.systolic}/{selectedPatient.vitals.diastolic}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 font-mono">GLUCOSE</p>
                <p className="text-2xl font-extrabold text-amber-500 mt-2">{selectedPatient.vitals.glucose}</p>
              </div>
            </div>

            {/* SVG Live ECG Stream simulation */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-red-400"><Heart size={16} className="animate-pulse" /> Live ECG Waveform</h3>
                <span className="text-[10px] text-zinc-500 font-mono">Simulated from Analog Pin A0</span>
              </div>
              
              <div className="w-full bg-zinc-950/90 h-32 border border-zinc-900 rounded-xl relative overflow-hidden flex items-center">
                {/* ECG Grid Line background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />
                
                {/* SVG Graph path */}
                <svg className="w-full h-full text-red-500 stroke-2" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    d={
                      selectedPatient.vitals.ecg && selectedPatient.vitals.ecg.length > 0
                        ? `M ${selectedPatient.vitals.ecg.map((val, idx) => `${idx * 10}, ${100 - (val / 150) * 100}`).join(" L ")}`
                        : "M 0 50 L 400 50"
                    }
                  />
                </svg>
              </div>
            </div>

            {/* AI Diagnostics Assessment Box */}
            <div className="glass-panel p-6 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 to-transparent">
              <h3 className="text-sm font-bold text-violet-400 flex items-center gap-2 mb-3">
                <Stethoscope size={16} /> Clinical AI diagnostic summary
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest font-mono">Evaluated Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                    <div><span className="text-zinc-500">Oxygen Saturation:</span> <span className="font-bold text-white">{aiReport.vitalsStatus.spo2}</span></div>
                    <div><span className="text-zinc-500">Cardiac rhythm:</span> <span className="font-bold text-white">{aiReport.vitalsStatus.heartRate}</span></div>
                    <div><span className="text-zinc-500">Temperature log:</span> <span className="font-bold text-white">{aiReport.vitalsStatus.temperature}</span></div>
                    <div><span className="text-zinc-500">Blood Pressure:</span> <span className="font-bold text-white">{aiReport.vitalsStatus.bloodPressure}</span></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest font-mono">Clinical Insights</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">"{aiReport.clinicalInsights}"</p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest font-mono">Automated Recommendations</h4>
                  <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 mt-1.5">
                    {aiReport.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-zinc-500">
            <Users size={48} className="mb-4" />
            <p>Select a patient from the left panel to begin telemetry monitoring</p>
          </div>
        )}

        {/* Right Column: Prescription Generator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold flex items-center gap-1.5 text-violet-400 mb-4">
              <FileText size={16} /> Prescription Builder
            </h3>

            <form onSubmit={submitPrescription} className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Medication Name</label>
                <input 
                  type="text" 
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Metformin" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Dosage</label>
                  <input 
                    type="text" 
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 500mg" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Duration</label>
                  <input 
                    type="text" 
                    value={medDur}
                    onChange={(e) => setMedDur(e.target.value)}
                    placeholder="e.g. 30 Days" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Frequency</label>
                <input 
                  type="text" 
                  value={medFreq}
                  onChange={(e) => setMedFreq(e.target.value)}
                  placeholder="e.g. Twice Daily" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700"
                />
              </div>

              <button
                type="button"
                onClick={addMedicineToDraft}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold border border-zinc-800 flex items-center justify-center gap-1 transition-all"
              >
                <Plus size={14} /> Add Medicine
              </button>

              {/* Draft List */}
              {currentPresMeds.length > 0 && (
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Drafted Medications</p>
                  {currentPresMeds.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white">{med.name} ({med.dosage})</span>
                      <span className="text-zinc-400">{med.frequency} x {med.duration}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Physician advice & notes</label>
                <textarea 
                  rows={3} 
                  value={presNotes}
                  onChange={(e) => setPresNotes(e.target.value)}
                  placeholder="Clinical instructions, follow ups..." 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={currentPresMeds.length === 0}
                className="w-full py-2.5 bg-primary disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-95"
              >
                Transmit Prescription
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
