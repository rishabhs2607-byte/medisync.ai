"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription, EmergencyAlert } from "@/services/firebase";
import { analyzeVitals } from "@/services/aiEngine";
import AuthGuard from "@/components/AuthGuard";
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
  Settings,
  ArrowRightLeft,
  ChevronDown
} from "lucide-react";

export default function DoctorDashboard() {
  const [doctorId] = useState("doc1");
  const [selectedPatientId, setSelectedPatientId] = useState("pat1");
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);

  // Transfer states
  const [transferDoctorId, setTransferDoctorId] = useState("doc2");
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Prescription builder state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medDur, setMedDur] = useState("");
  const [medInst, setMedInst] = useState("After Food");
  const [currentPresMeds, setCurrentPresMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }[]>([]);
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono bg-luxury-pureBlack">Connecting to MediSync DB...</div>;
  }

  const doctorProfile = db.users.find(u => u.uid === doctorId);
  const selectedPatient = db.patients.find(p => p.uid === selectedPatientId);
  const activeAlerts = db.alerts.filter(a => a.status === "active");

  const addMedicineToDraft = () => {
    if (!medName || !medDosage || !medFreq || !medDur) return;
    setCurrentPresMeds([...currentPresMeds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur, instructions: medInst }]);
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

    setCurrentPresMeds([]);
    setPresNotes("");
  };

  // Transfer Patient action
  const handleTransferPatient = () => {
    if (!selectedPatient) return;

    const currentDb = getMediSyncDb();
    const otherDoc = currentDb.users.find(u => u.uid === transferDoctorId);
    if (!otherDoc) return;

    // Log the transfer in patient medical record history
    const patientInDb = currentDb.patients.find(p => p.uid === selectedPatient.uid);
    if (patientInDb) {
      patientInDb.history.unshift({
        date: new Date().toISOString().split("T")[0],
        diagnosis: `Patient transferred to ${otherDoc.name} by ${doctorProfile?.name || "Dr. Alexander Marcus"}. Transferred live telemetry cuffs, ECG logs, and reports history.`,
        doctor: doctorProfile?.name || "Dr. Alexander Marcus"
      });
    }

    // Re-route active appointments to the new doctor
    currentDb.appointments.forEach(apt => {
      if (apt.patientId === selectedPatient.uid && apt.status === "scheduled") {
        apt.doctorId = otherDoc.uid;
        apt.doctorName = otherDoc.name;
      }
    });

    // Update workloads
    const currentDoc = currentDb.users.find(u => u.uid === doctorId);
    if (currentDoc) currentDoc.workload = Math.max(0, (currentDoc.workload || 1) - 1);
    otherDoc.workload = (otherDoc.workload || 0) + 1;

    saveMediSyncDb(currentDb);
    loadDb();

    setTransferSuccess(true);
    setTimeout(() => {
      setTransferSuccess(false);
      // Switch selected patient since they are no longer in this doctor's primary queue
      const remainingPatients = currentDb.patients.filter(p => p.uid !== selectedPatient.uid);
      if (remainingPatients.length > 0) {
        setSelectedPatientId(remainingPatients[0].uid);
      }
    }, 2000);

    // Broadcast storage update
    window.dispatchEvent(new Event("storage"));
  };

  const resolveAlert = (alertId: string) => {
    const currentDb = getMediSyncDb();
    const alert = currentDb.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = "resolved";
    }
    saveMediSyncDb(currentDb);
    loadDb();
    window.dispatchEvent(new Event("storage"));
  };

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
    <AuthGuard allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Header Banner */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{doctorProfile?.name || "Dr. Alexander Marcus"}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-blueMedical/10 text-luxury-blueMedical border border-luxury-blueMedical/20 font-mono uppercase font-bold">Clinical Specialist</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{doctorProfile?.hospitalAffiliation || "Mayo Clinic"} • License ID: {doctorProfile?.licenseNumber || "LIC-88290-A"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
            <span className="inline-block w-2.5 h-2.5 bg-luxury-greenEmerald rounded-full animate-pulse" />
            <span className="text-zinc-500 font-mono">Status: </span>
            <span className="text-luxury-greenEmerald font-bold font-mono">Available</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Left Side: Assigned Patients List & Active Alerts */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Alerts Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-luxury-redCrimson/20 bg-luxury-redCrimson/5 animate-glow-gold">
            <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider mb-4">
              <AlertOctagon size={14} className="animate-bounce" /> Vitals Alerts ({activeAlerts.length})
            </h3>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <p className="text-[10px] text-zinc-500 text-center py-4 italic">Systems stable. No notifications.</p>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-luxury-pureBlack rounded-xl border border-luxury-redCrimson/10 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white text-[11px]">{alert.patientName}</p>
                        <p className="text-[9px] text-luxury-redCrimson font-bold font-mono mt-0.5">{alert.metric}: {alert.value}</p>
                      </div>
                      <button 
                        onClick={() => resolveAlert(alert.id)}
                        className="px-2 py-0.5 bg-luxury-redCrimson/15 hover:bg-luxury-redCrimson text-luxury-redCrimson hover:text-white rounded transition-colors text-[8px] uppercase font-bold"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-[8px] text-zinc-500 font-mono">Logged: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patient Registry */}
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h3 className="text-xs font-bold mb-4 flex items-center gap-1.5 text-zinc-400 uppercase tracking-widest font-mono">
              <Users size={14} className="text-luxury-goldRoyal" /> Patient Roster
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
                        ? "bg-luxury-goldRoyal/15 border-luxury-goldRoyal/55 shadow-lg text-white"
                        : hasAlert
                        ? "bg-luxury-redCrimson/10 border-luxury-redCrimson/30 text-white animate-pulse"
                        : "bg-luxury-pureBlack border-zinc-900 hover:bg-zinc-900/40 text-zinc-300"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold">{pat.name}</h4>
                      <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Age: {pat.age} • Device: {pat.connectedDevice?.deviceId || "None"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-mono font-extrabold ${hasAlert ? "text-luxury-redCrimson" : "text-luxury-greenEmerald"}`}>
                        {pat.vitals.heartRate} bpm
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry Grid */}
        {selectedPatient ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Selected Patient Header */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPatient.name} Telemetry Stream</h2>
                <p className="text-[10px] text-zinc-400 mt-1">Allergies: {selectedPatient.allergies.join(", ")} • Medications: {selectedPatient.medications.join(", ")}</p>
              </div>
              
              <Link 
                href="/consultation" 
                className="px-4 py-2 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-transform hover:scale-[1.02] flex items-center gap-1.5 border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/10"
              >
                <Video size={12} /> Open Consult Room
              </Link>
            </div>

            {/* Vitals Grid widgets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">HEART RATE</p>
                <p className="text-xl font-extrabold text-luxury-redCrimson mt-2 font-mono">{selectedPatient.vitals.heartRate} bpm</p>
              </div>
              
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">SPO2</p>
                <p className="text-xl font-extrabold text-luxury-blueElectric mt-2 font-mono">{selectedPatient.vitals.spo2}%</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">TEMPERATURE</p>
                <p className="text-xl font-extrabold text-luxury-goldRoyal mt-2 font-mono">{selectedPatient.vitals.temperature}°F</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">BP (SYS/DIA)</p>
                <p className="text-lg font-extrabold text-luxury-greenEmerald mt-2 font-mono">{selectedPatient.vitals.systolic}/{selectedPatient.vitals.diastolic}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">GLUCOSE</p>
                <p className="text-xl font-extrabold text-amber-500 mt-2 font-mono">{selectedPatient.vitals.glucose}</p>
              </div>
            </div>

            {/* SVG Live ECG wave */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider font-mono">Live ECG signal</h3>
                <span className="text-[9px] text-zinc-400 font-mono">Stream: Active</span>
              </div>
              
              <div className="w-full bg-luxury-pureBlack h-32 border border-zinc-900 rounded-xl relative overflow-hidden flex items-center">
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                
                <svg className="w-full h-full text-luxury-redCrimson stroke-2" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    d={
                      selectedPatient.vitals.ecg && selectedPatient.vitals.ecg.length > 0
                        ? `M ${selectedPatient.vitals.ecg.map((val, idx) => `${idx * 10}, ${100 - (val / 150) * 100}`).join(" L ")}`
                        : "M 0 50 L 400 50"
                    }
                  />
                </svg>
              </div>
            </div>

            {/* Clinical AI recommendations */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold text-luxury-goldRoyal flex items-center gap-2 mb-4 uppercase tracking-widest font-mono">
                <Stethoscope size={16} /> Clinical Diagnostic Insights
              </h3>
              
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">CARDIAC RHYTHM</span>
                    <span className="font-bold text-white">{aiReport.vitalsStatus.heartRate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">OXYGEN STATUS</span>
                    <span className="font-bold text-white">{aiReport.vitalsStatus.spo2}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">TEMPERATURE RANGE</span>
                    <span className="font-bold text-white">{aiReport.vitalsStatus.temperature}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">BLOOD SUGAR STATUS</span>
                    <span className="font-bold text-white">{aiReport.vitalsStatus.glucose}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-900">
                  <span className="text-[10px] text-zinc-400 font-mono block uppercase">Model Insights</span>
                  <p className="text-zinc-300 mt-1 italic">"{aiReport.clinicalInsights}"</p>
                </div>
              </div>
            </div>

            {/* Doctor Transfer System Interface */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/15 bg-luxury-pureBlack relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="text-luxury-goldRoyal" size={16} />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clinical Roster Transfer Engine</h3>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-4">
                If you are entering an emergency consult or going off-shift, transfer this patient to another verified doctor. 
                This transmits patient history logs, notes, and the active wireless telemetry link.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <div className="w-full sm:w-2/3">
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Select verified clinician</label>
                  <select 
                    value={transferDoctorId}
                    onChange={(e) => setTransferDoctorId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg focus:outline-none"
                  >
                    <option value="doc2">Dr. Elizabeth Carter (Stanford Medicine)</option>
                    <option value="doc1">Dr. Alexander Marcus (Mayo Clinic)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTransferPatient}
                  className="w-full sm:w-auto px-5 py-2 bg-luxury-goldRoyal text-luxury-pureBlack font-bold text-xs rounded-lg uppercase tracking-wider hover:bg-luxury-goldRoyal/90 transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  {transferSuccess ? <Check size={12} /> : null}
                  {transferSuccess ? "Transferred!" : "Commit Transfer"}
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-zinc-500">
            <Users size={48} className="mb-4" />
            <p className="text-xs">Select a patient to begin telemetry checkups</p>
          </div>
        )}

        {/* Right Side: Prescription builder */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h3 className="text-xs font-bold text-luxury-goldRoyal mb-4 uppercase tracking-widest font-mono flex items-center gap-2">
              <FileText size={14} /> Prescription Draft Form
            </h3>

            <form onSubmit={submitPrescription} className="space-y-4">
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Medicine Name</label>
                <input 
                  type="text" value={medName} onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Paracetamol" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Dosage</label>
                  <input 
                    type="text" value={medDosage} onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 500mg" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none placeholder-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Duration</label>
                  <input 
                    type="text" value={medDur} onChange={(e) => setMedDur(e.target.value)}
                    placeholder="e.g. 5 Days" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none placeholder-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Frequency</label>
                  <input 
                    type="text" value={medFreq} onChange={(e) => setMedFreq(e.target.value)}
                    placeholder="e.g. Twice Daily" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-center focus:outline-none placeholder-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Instructions</label>
                  <select
                    value={medInst} onChange={(e) => setMedInst(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-2 py-2.5 rounded-lg focus:outline-none text-zinc-300"
                  >
                    <option value="After Food">After Food</option>
                    <option value="Before Food">Before Food</option>
                    <option value="With Water">With Water</option>
                  </select>
                </div>
              </div>

              <button
                type="button" onClick={addMedicineToDraft}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-850 uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
              >
                <Plus size={12} /> Add to list
              </button>

              {/* Draft list */}
              {currentPresMeds.length > 0 && (
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 space-y-2">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Current items</p>
                  {currentPresMeds.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-zinc-900 pb-1">
                      <span className="font-bold text-white">{med.name} ({med.dosage})</span>
                      <span className="text-zinc-500 font-mono text-[9px]">{med.frequency} • {med.instructions}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Additional advice & notes</label>
                <textarea 
                  rows={3} value={presNotes} onChange={(e) => setPresNotes(e.target.value)}
                  placeholder="Clinical notes..." 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg focus:outline-none placeholder-zinc-700 text-white"
                />
              </div>

              <button
                type="submit" disabled={currentPresMeds.length === 0}
                className="w-full py-3 bg-luxury-goldRoyal disabled:bg-zinc-900 disabled:text-zinc-600 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Transmit Prescription
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
    </AuthGuard>
  );
}
