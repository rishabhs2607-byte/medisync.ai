"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription, EmergencyAlert } from "@/services/firebase";
import { analyzeVitals } from "@/services/aiEngine";
import IoTSimulator from "@/components/IoTSimulator";
import { 
  Heart, 
  Wind, 
  Thermometer, 
  Activity as ECGIcon, 
  Droplet, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  AlertTriangle, 
  Radio, 
  Shield, 
  Plus, 
  ArrowLeft,
  Bell,
  Cpu
} from "lucide-react";

export default function PatientDashboard() {
  const [patientId] = useState("pat1");
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  
  // Appointment form state
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptDate, setAptDate] = useState("");
  const [aptTime, setAptTime] = useState("");
  const [aptReason, setAptReason] = useState("");
  const [aptDoctor, setAptDoctor] = useState("doc1");

  // Load and subscribe to database state
  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    // Listening to changes from the simulator or other windows
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono">Connecting to MediSync DB...</div>;
  }

  const patient = db.patients.find((p) => p.uid === patientId);
  const doctor = db.users.find((u) => u.uid === "doc1"); // Default assigned physician
  
  if (!patient) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-red-400 font-mono">Patient record not found.</div>;
  }

  // Calculate AI Risk Metrics
  const aiReport = analyzeVitals(
    patient.vitals.heartRate,
    patient.vitals.spo2,
    patient.vitals.temperature,
    patient.vitals.systolic,
    patient.vitals.diastolic,
    patient.vitals.glucose
  );

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptDate || !aptTime || !aptReason) return;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patient.uid,
      patientName: patient.name,
      doctorId: aptDoctor,
      doctorName: doctor?.name || "Dr. Alexander Marcus",
      date: aptDate,
      time: aptTime,
      status: "scheduled",
      reason: aptReason
    };

    const currentDb = getMediSyncDb();
    currentDb.appointments.unshift(newApt);
    saveMediSyncDb(currentDb);
    loadDb();

    // Reset form
    setAptDate("");
    setAptTime("");
    setAptReason("");
    setShowAptModal(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "warning": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 text-zinc-100">
      {/* Top Header Banner */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{patient.name}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold uppercase">Patient Workspace</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Age: {patient.age} • Gender: {patient.gender} • Blood Type: {patient.bloodType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <Cpu size={14} className="text-emerald-400" />
              <span className="font-mono text-zinc-300">ESP32 Status: </span>
              <span className="font-bold text-emerald-400 uppercase">Online</span>
            </div>
            
            <div className="relative p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 cursor-pointer">
              <Bell size={20} />
              {db.alerts.filter(a => a.patientId === patientId && a.status === "active").length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Live IoT Metrics Widgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Vitals Summary Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/10 to-transparent blur-xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="text-primary animate-pulse" size={18} /> Live IoT Telemetry</h2>
              <span className="text-xs text-zinc-500 font-mono">Sync Interval: 1000ms</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Heart Rate */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Heart Rate</p>
                  <p className="text-3xl font-extrabold mt-1 text-white">{patient.vitals.heartRate}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">BPM (Normal)</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                  <Heart size={20} className="animate-pulse" />
                </div>
              </div>

              {/* SpO2 */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">SpO2 Level</p>
                  <p className="text-3xl font-extrabold mt-1 text-white">{patient.vitals.spo2}%</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{patient.vitals.spo2 < 90 ? "Critical" : "Stable"}</p>
                </div>
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Wind size={20} />
                </div>
              </div>

              {/* Temp */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Temperature</p>
                  <p className="text-3xl font-extrabold mt-1 text-white">{patient.vitals.temperature}°C</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Body temp</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                  <Thermometer size={20} />
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Blood Pressure</p>
                  <p className="text-2xl font-extrabold mt-1 text-white">{patient.vitals.systolic}/{patient.vitals.diastolic}</p>
                  <p className="text-[10px] text-zinc-400 mt-2">mmHg (Normal)</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <ECGIcon size={20} />
                </div>
              </div>

              {/* Glucose */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Blood Sugar</p>
                  <p className="text-3xl font-extrabold mt-1 text-white">{patient.vitals.glucose}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">mg/dL (Fasting)</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                  <Droplet size={20} />
                </div>
              </div>

              {/* Device Status */}
              <div className="bg-zinc-950/60 border border-zinc-900/60 p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Device Sync</span>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse-fast" />
                </div>
                <p className="text-lg font-bold text-white mt-1">{patient.connectedDevice?.deviceId}</p>
                <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                  <span>Battery: {patient.connectedDevice?.battery}%</span>
                  <span>1s ago</span>
                </div>
              </div>
            </div>

            {/* AI Health Score banner */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-violet-600/15 to-cyan-500/15 border border-violet-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center font-extrabold text-lg">
                  {aiReport.healthScore}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">AI Health Score: {aiReport.riskLevel} Risk</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{aiReport.clinicalInsights}</p>
                </div>
              </div>
              <Link href="/ai-center" className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Run Diagnostic Check
              </Link>
            </div>
          </div>

          {/* ESP32 HARDWARE SIMULATOR INTEGRATION (VITAL FOR DEMO PITCH) */}
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-zinc-950/40">
            <div className="p-4 bg-zinc-950/80 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-cyan-400"><Cpu size={16} /> Patient IoT Hardware Stream</h3>
              <p className="text-[10px] text-zinc-500">Interact to trigger real-time changes in widgets above</p>
            </div>
            <IoTSimulator />
          </div>

          {/* Medical History & Timeline */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-violet-400" /> Electronic Health Records</h2>
            <div className="space-y-4 border-l-2 border-zinc-800 pl-4 ml-2">
              {patient.history.map((record, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-violet-500" />
                  <p className="text-xs text-zinc-500 font-mono">{record.date}</p>
                  <h4 className="text-sm font-semibold mt-0.5">{record.diagnosis}</h4>
                  <p className="text-xs text-zinc-400">Attending Physician: {record.doctor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Appointments & Prescriptions */}
        <div className="space-y-6">
          
          {/* Active Alerts Drawer */}
          {db.alerts.filter(a => a.patientId === patientId && a.status === "active").length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle size={16} className="animate-bounce" /> Active Emergency Alerts
              </h3>
              <div className="mt-3 space-y-3">
                {db.alerts.filter(a => a.patientId === patientId && a.status === "active").map((alert) => (
                  <div key={alert.id} className="p-3 rounded-lg bg-zinc-900/80 border border-red-500/10 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-white">Abnormal {alert.metric}</p>
                      <p className="text-[10px] text-zinc-400">Triggered: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-mono font-bold">{alert.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemedicine & Video Appointment Hub */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold flex items-center gap-2"><Calendar size={18} className="text-cyan-400" /> Telehealth Schedules</h3>
              <button 
                onClick={() => setShowAptModal(true)}
                className="p-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {db.appointments.filter(a => a.patientId === patientId).length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No appointments scheduled</p>
              ) : (
                db.appointments.filter(a => a.patientId === patientId).map((apt) => (
                  <div key={apt.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{apt.doctorName}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{apt.date} at {apt.time}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 italic">"{apt.reason}"</p>
                    </div>
                    <Link 
                      href="/consultation" 
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Join Room
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prescriptions Downloads */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-violet-400" /> Active Prescriptions</h3>
            
            <div className="space-y-4">
              {db.prescriptions.filter(p => p.patientId === patientId).map((pres) => (
                <div key={pres.id} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">{pres.doctorName}</h4>
                      <p className="text-[10px] text-zinc-500">{pres.date}</p>
                    </div>
                    <button className="text-[10px] px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                      Download PDF
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 mt-3">
                    {pres.medicines.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-white">{med.name} <span className="text-[10px] text-zinc-500">({med.dosage})</span></span>
                        <span className="text-[10px] text-zinc-400">{med.frequency}</span>
                      </div>
                    ))}
                  </div>

                  {pres.notes && (
                    <p className="text-[10px] text-zinc-500 italic mt-3 pt-2 border-t border-zinc-900">"{pres.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Family Authorization */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-cyan-400" /> Family Portal Access</h3>
            <div className="space-y-3">
              {patient.familyMembers.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs">
                  <div>
                    <p className="font-semibold text-white">{member.name}</p>
                    <p className="text-[10px] text-zinc-500">{member.relation} ({member.email})</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[9px] uppercase font-bold">Alert Trigger enabled</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Appointment booking Modal */}
      {showAptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy p-8 rounded-2xl border border-white/10 w-full max-w-md text-white">
            <h3 className="text-lg font-bold mb-4">Request Telemedicine Consultation</h3>
            
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Select Physician</label>
                <select 
                  value={aptDoctor}
                  onChange={(e) => setAptDoctor(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-2.5 rounded-lg focus:outline-none"
                >
                  <option value="doc1">Dr. Alexander Marcus (Mayo Clinic)</option>
                  <option value="doc2">Dr. Elizabeth Carter (Stanford Medicine)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Preferred Date</label>
                  <input 
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-2 rounded-lg focus:outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Preferred Time</label>
                  <input 
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-2 rounded-lg focus:outline-none text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Reason for consultation</label>
                <textarea 
                  rows={3}
                  value={aptReason}
                  onChange={(e) => setAptReason(e.target.value)}
                  placeholder="e.g. Discuss new blood pressure readings..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-2 rounded-lg focus:outline-none placeholder-zinc-600"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAptModal(false)}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors"
                >
                  Confirm Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
