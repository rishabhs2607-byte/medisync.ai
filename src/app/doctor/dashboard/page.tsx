"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription,
  subscribeToWaitingRooms, subscribeToPatientVitals
} from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import { analyzeVitals } from "@/services/aiEngine";
import AuthGuard from "@/components/AuthGuard";
import {
  Users, Heart, Wind, Thermometer, Droplet, FileText, AlertOctagon,
  Calendar, Check, Cpu, Stethoscope, Plus, ChevronRight, Video,
  ArrowLeft, Settings, ArrowRightLeft, ChevronDown, Clock, Wifi,
  WifiOff, Activity, User, Bell, RefreshCw
} from "lucide-react";

interface WaitingRoom {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  status: string;
  createdAt?: any;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const doctorId = user?.uid || "doc1";

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([]);
  const [selectedRoomVitals, setSelectedRoomVitals] = useState<any>(null);
  const [selectedRoomPatientName, setSelectedRoomPatientName] = useState("");
  const [activeTab, setActiveTab] = useState<"patients" | "queue">("queue");

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

  const loadDb = useCallback(() => {
    setDb(getMediSyncDb());
  }, []);

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, [loadDb]);

  // Subscribe to waiting rooms from Firestore
  useEffect(() => {
    const unsub = subscribeToWaitingRooms((rooms) => {
      setWaitingRooms(rooms as WaitingRoom[]);
    });
    return () => unsub();
  }, []);

  // Subscribe to live vitals for selected waiting room patient
  const [vitalsUnsub, setVitalsUnsub] = useState<(() => void) | null>(null);
  const handleSelectRoom = (room: WaitingRoom) => {
    if (vitalsUnsub) vitalsUnsub();
    setSelectedRoomVitals(null);
    const unsub = subscribeToPatientVitals(room.patientId, (vitals, name) => {
      setSelectedRoomVitals(vitals);
      setSelectedRoomPatientName(name);
    });
    setVitalsUnsub(() => unsub);
  };
  useEffect(() => () => { if (vitalsUnsub) vitalsUnsub(); }, [vitalsUnsub]);

  // Join call as doctor
  const handleJoinCall = (roomId: string) => {
    router.push(`/consultation/room/${roomId}?role=doctor`);
  };

  if (!db) {
    return <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center text-zinc-400 font-mono">
      <Activity className="animate-pulse text-luxury-goldRoyal mr-3" size={24} /> Connecting to MediSync DB...
    </div>;
  }

  const doctorProfile = db.users.find(u => u.uid === doctorId);
  const selectedPatient = db.patients.find(p => p.uid === selectedPatientId);
  const activeAlerts = db.alerts.filter(a => a.status === "active");

  const addMedicineToDraft = () => {
    if (!medName || !medDosage || !medFreq || !medDur) return;
    setCurrentPresMeds([...currentPresMeds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur, instructions: medInst }]);
    setMedName(""); setMedDosage(""); setMedFreq(""); setMedDur("");
  };

  const submitPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPresMeds.length === 0 || !selectedPatient) return;
    const newPres: Prescription = {
      id: `pr-${Date.now()}`, patientId: selectedPatient.uid,
      doctorId, doctorName: doctorProfile?.name || user?.name || "Doctor",
      date: new Date().toISOString().split("T")[0],
      medicines: currentPresMeds, notes: presNotes
    };
    const currentDb = getMediSyncDb();
    currentDb.prescriptions.unshift(newPres);
    const patientRecord = currentDb.patients.find(p => p.uid === selectedPatient.uid);
    if (patientRecord) {
      patientRecord.history.unshift({
        date: new Date().toISOString().split("T")[0],
        diagnosis: `Prescription: ${currentPresMeds.map(m => m.name).join(", ")}`,
        doctor: doctorProfile?.name || user?.name || "Doctor"
      });
    }
    saveMediSyncDb(currentDb);
    loadDb();
    setCurrentPresMeds([]);
    setPresNotes("");
  };

  const handleTransferPatient = () => {
    if (!selectedPatient) return;
    const currentDb = getMediSyncDb();
    const otherDoc = currentDb.users.find(u => u.uid === transferDoctorId);
    if (!otherDoc) return;
    const patientInDb = currentDb.patients.find(p => p.uid === selectedPatient.uid);
    if (patientInDb) {
      patientInDb.history.unshift({
        date: new Date().toISOString().split("T")[0],
        diagnosis: `Transferred to ${otherDoc.name}`,
        doctor: doctorProfile?.name || user?.name || "Doctor"
      });
    }
    currentDb.appointments.forEach(apt => {
      if (apt.patientId === selectedPatient.uid && apt.status === "scheduled") {
        apt.doctorId = otherDoc.uid;
        apt.doctorName = otherDoc.name;
      }
    });
    const currentDoc = currentDb.users.find(u => u.uid === doctorId);
    if (currentDoc) currentDoc.workload = Math.max(0, (currentDoc.workload || 1) - 1);
    otherDoc.workload = (otherDoc.workload || 0) + 1;
    saveMediSyncDb(currentDb);
    loadDb();
    setTransferSuccess(true);
    setTimeout(() => setTransferSuccess(false), 2000);
    window.dispatchEvent(new Event("storage"));
  };

  const resolveAlert = (alertId: string) => {
    const currentDb = getMediSyncDb();
    const alert = currentDb.alerts.find(a => a.id === alertId);
    if (alert) alert.status = "resolved";
    saveMediSyncDb(currentDb);
    loadDb();
    window.dispatchEvent(new Event("storage"));
  };

  const patientVitals = selectedPatient?.vitals || { heartRate: 70, spo2: 98, temperature: 97.9, systolic: 120, diastolic: 80, glucose: 100 };
  const aiReport = analyzeVitals(
    patientVitals.heartRate, patientVitals.spo2, patientVitals.temperature,
    patientVitals.systolic, patientVitals.diastolic, patientVitals.glucose
  );

  return (
    <AuthGuard allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* ── HEADER ── */}
        <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-5 relative z-10 sticky top-0 backdrop-blur-md bg-opacity-95">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">
                    Dr. {doctorProfile?.name || user?.name || "Doctor"}
                  </h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-blueMedical/10 text-luxury-blueMedical border border-luxury-blueMedical/20 font-mono uppercase font-bold">
                    {doctorProfile?.specialty || "Physician"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-luxury-greenEmerald/10 text-luxury-greenEmerald border border-luxury-greenEmerald/20 font-mono uppercase font-bold">
                    Verified
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {doctorProfile?.hospitalAffiliation || "MediSync Hospital"} • {doctorProfile?.licenseNumber || "LIC-VERIFIED"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {waitingRooms.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-xl text-xs">
                  <span className="w-2 h-2 bg-luxury-redCrimson rounded-full animate-ping" />
                  <span className="text-luxury-redCrimson font-bold font-mono">{waitingRooms.length} Waiting</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
                <span className="inline-block w-2 h-2 bg-luxury-greenEmerald rounded-full animate-pulse" />
                <span className="text-luxury-greenEmerald font-bold font-mono text-[10px]">Available</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">

          {/* ──────── LEFT: Queue + Patients ──────── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Tab switcher */}
            <div className="flex rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950">
              <button
                onClick={() => setActiveTab("queue")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "queue" ? "bg-luxury-goldRoyal text-luxury-pureBlack" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Clock size={10} /> Queue {waitingRooms.length > 0 && `(${waitingRooms.length})`}
              </button>
              <button
                onClick={() => setActiveTab("patients")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "patients" ? "bg-luxury-goldRoyal text-luxury-pureBlack" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Users size={10} /> Records
              </button>
            </div>

            {/* WAITING ROOM QUEUE (Live from Firestore) */}
            {activeTab === "queue" && (
              <div className="glass-panel p-4 rounded-2xl border border-luxury-greenEmerald/20 bg-luxury-greenEmerald/5">
                <h3 className="text-xs font-bold text-luxury-greenEmerald flex items-center gap-1.5 uppercase tracking-wider mb-3">
                  <Video size={13} className="animate-pulse" /> Live Waiting Room
                </h3>
                {waitingRooms.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock size={28} className="mx-auto text-zinc-700 mb-2" />
                    <p className="text-[10px] text-zinc-500 font-mono">No patients waiting</p>
                    <p className="text-[9px] text-zinc-600 font-mono mt-1">Rooms refresh automatically</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitingRooms.map((room) => (
                      <div key={room.id} className="p-3.5 bg-luxury-pureBlack rounded-xl border border-luxury-greenEmerald/20 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-luxury-greenEmerald rounded-full animate-ping inline-block" />
                              {room.patientName || "Patient"}
                            </p>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              Room: {room.id?.slice(0, 10)}...
                            </p>
                          </div>
                          <button
                            onClick={() => handleSelectRoom(room)}
                            className="text-[9px] text-luxury-blueElectric font-mono underline hover:no-underline"
                          >
                            Vitals
                          </button>
                        </div>

                        {/* Live vitals mini preview */}
                        {selectedRoomVitals && selectedRoomPatientName === (room.patientName || "") && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: "HR", value: `${selectedRoomVitals.heartRate} bpm`, color: "text-luxury-redCrimson" },
                              { label: "SpO₂", value: `${selectedRoomVitals.spo2}%`, color: "text-luxury-blueElectric" },
                              { label: "Temp", value: `${selectedRoomVitals.temperature}°F`, color: "text-luxury-goldRoyal" },
                              { label: "BP", value: `${selectedRoomVitals.systolic}/${selectedRoomVitals.diastolic}`, color: "text-luxury-greenEmerald" },
                            ].map(v => (
                              <div key={v.label} className="bg-zinc-900 rounded-lg p-2 text-center">
                                <p className="text-[8px] text-zinc-500 font-mono">{v.label}</p>
                                <p className={`text-[10px] font-black ${v.color}`}>{v.value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleJoinCall(room.id)}
                          className="w-full py-2 bg-luxury-greenEmerald hover:bg-luxury-greenEmerald/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-luxury-greenEmerald/20"
                        >
                          <Video size={11} /> Join Call Now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PATIENT RECORDS LIST */}
            {activeTab === "patients" && (
              <>
                {/* Alerts */}
                <div className="glass-panel p-4 rounded-2xl border border-luxury-redCrimson/20 bg-luxury-redCrimson/5">
                  <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider mb-3">
                    <AlertOctagon size={13} className="animate-bounce" /> Alerts ({activeAlerts.length})
                  </h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {activeAlerts.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 text-center py-3 italic">No active alerts</p>
                    ) : (
                      activeAlerts.map((alert) => (
                        <div key={alert.id} className="p-3 bg-luxury-pureBlack rounded-xl border border-luxury-redCrimson/10 flex justify-between items-start gap-2 text-xs">
                          <div>
                            <p className="font-bold text-white text-[11px]">{alert.patientName}</p>
                            <p className="text-[9px] text-luxury-redCrimson font-bold font-mono">{alert.metric}: {alert.value}</p>
                          </div>
                          <button onClick={() => resolveAlert(alert.id)}
                            className="px-2 py-0.5 bg-luxury-redCrimson/15 hover:bg-luxury-redCrimson text-luxury-redCrimson hover:text-white rounded transition-colors text-[8px] uppercase font-bold shrink-0">
                            Clear
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Patient List */}
                <div className="glass-panel p-4 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
                  <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5 text-zinc-400 uppercase tracking-widest font-mono">
                    <Users size={13} className="text-luxury-goldRoyal" /> Patient Roster
                  </h3>
                  <div className="space-y-2">
                    {db.patients.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 text-center py-3">No patients registered</p>
                    ) : (
                      db.patients.map((pat) => {
                        const hasAlert = activeAlerts.some(a => a.patientId === pat.uid);
                        const isSelected = selectedPatientId === pat.uid;
                        return (
                          <button key={pat.uid} onClick={() => setSelectedPatientId(pat.uid)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                              isSelected ? "bg-luxury-goldRoyal/15 border-luxury-goldRoyal/55 text-white"
                              : hasAlert ? "bg-luxury-redCrimson/10 border-luxury-redCrimson/30 text-white animate-pulse"
                              : "bg-luxury-pureBlack border-zinc-900 hover:bg-zinc-900/40 text-zinc-300"
                            }`}>
                            <div>
                              <h4 className="text-xs font-bold">{pat.name}</h4>
                              <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Age: {pat.age} • {pat.bloodType}</p>
                            </div>
                            <span className={`text-[10px] font-mono font-extrabold ${hasAlert ? "text-luxury-redCrimson" : "text-luxury-greenEmerald"}`}>
                              {pat.vitals.heartRate} bpm
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ──────── CENTER: Patient Telemetry ──────── */}
          {selectedPatient ? (
            <div className="lg:col-span-2 space-y-6">
              {/* Patient header */}
              <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedPatient.name}</h2>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {selectedPatient.gender} • {selectedPatient.age}y • {selectedPatient.bloodType}
                    {selectedPatient.allergies.length > 0 && ` • Allergies: ${selectedPatient.allergies.join(", ")}`}
                  </p>
                </div>
                <button
                  onClick={handleStartConsultation.bind(null, selectedPatient)}
                  className="px-4 py-2 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-transform hover:scale-[1.02] flex items-center gap-1.5 border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/10"
                >
                  <Video size={12} /> Start Consultation
                </button>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "HEART RATE", value: `${selectedPatient.vitals.heartRate} bpm`, color: "text-luxury-redCrimson" },
                  { label: "SPO2", value: `${selectedPatient.vitals.spo2}%`, color: "text-luxury-blueElectric" },
                  { label: "TEMP", value: `${selectedPatient.vitals.temperature}°F`, color: "text-luxury-goldRoyal" },
                  { label: "BP", value: `${selectedPatient.vitals.systolic}/${selectedPatient.vitals.diastolic}`, color: "text-luxury-greenEmerald" },
                  { label: "GLUCOSE", value: `${selectedPatient.vitals.glucose}`, color: "text-amber-500" },
                ].map(v => (
                  <div key={v.label} className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-pureBlack/60 text-center">
                    <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{v.label}</p>
                    <p className={`text-lg font-extrabold mt-2 font-mono ${v.color}`}>{v.value}</p>
                  </div>
                ))}
              </div>

              {/* ECG */}
              <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
                <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider font-mono mb-4">Live ECG Signal</h3>
                <div className="w-full bg-luxury-pureBlack h-28 border border-zinc-900 rounded-xl relative overflow-hidden flex items-center">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                  <svg className="w-full h-full text-luxury-redCrimson" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path fill="none" stroke="currentColor" strokeWidth="2"
                      d={selectedPatient.vitals.ecg && selectedPatient.vitals.ecg.length > 0
                        ? `M ${selectedPatient.vitals.ecg.map((val, idx) => `${idx * 10}, ${100 - (val / 150) * 100}`).join(" L ")}`
                        : "M 0 50 L 400 50"} />
                  </svg>
                </div>
              </div>

              {/* AI Insights */}
              <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
                <h3 className="text-xs font-bold text-luxury-goldRoyal flex items-center gap-2 mb-4 uppercase tracking-widest font-mono">
                  <Stethoscope size={15} /> Clinical AI Insights
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "CARDIAC", val: aiReport.vitalsStatus.heartRate },
                    { label: "OXYGEN", val: aiReport.vitalsStatus.spo2 },
                    { label: "TEMPERATURE", val: aiReport.vitalsStatus.temperature },
                    { label: "GLUCOSE", val: aiReport.vitalsStatus.glucose },
                  ].map(item => (
                    <div key={item.label}>
                      <span className="text-[9px] text-zinc-500 font-mono block">{item.label}</span>
                      <span className="font-bold text-white text-[11px]">{item.val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-300 mt-3 pt-3 border-t border-zinc-900 italic">"{aiReport.clinicalInsights}"</p>
              </div>

              {/* Patient Transfer */}
              <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/15 bg-luxury-pureBlack">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="text-luxury-goldRoyal" size={15} />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Transfer Patient</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                  <div className="w-full sm:flex-1">
                    <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Transfer to Doctor</label>
                    <select value={transferDoctorId} onChange={e => setTransferDoctorId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg outline-none">
                      {db.users.filter(u => u.role === "doctor" && u.uid !== doctorId && u.status === "approved").map(doc => (
                        <option key={doc.uid} value={doc.uid}>Dr. {doc.name} ({doc.specialty || "General"})</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={handleTransferPatient}
                    className="px-5 py-2 bg-luxury-goldRoyal text-luxury-pureBlack font-bold text-xs rounded-lg uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-1 shrink-0">
                    {transferSuccess ? <><Check size={12} /> Done!</> : "Transfer"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 glass-panel p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-zinc-500 gap-4">
              {waitingRooms.length > 0 ? (
                <>
                  <Video size={40} className="text-luxury-greenEmerald animate-pulse" />
                  <p className="text-sm font-semibold text-white">{waitingRooms.length} Patient{waitingRooms.length > 1 ? "s" : ""} Waiting</p>
                  <p className="text-xs text-zinc-500">Select a room from the Queue tab to join a call</p>
                  <button onClick={() => setActiveTab("queue")}
                    className="px-5 py-2.5 bg-luxury-greenEmerald text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all">
                    View Waiting Room
                  </button>
                </>
              ) : (
                <>
                  <Users size={40} />
                  <p className="text-xs text-center">Select a patient from the roster<br />or wait for a consultation request</p>
                </>
              )}
            </div>
          )}

          {/* ──────── RIGHT: Prescription Builder ──────── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold text-luxury-goldRoyal mb-4 uppercase tracking-widest font-mono flex items-center gap-2">
                <FileText size={14} /> Prescription
              </h3>

              <form onSubmit={submitPrescription} className="space-y-4">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Medicine</label>
                  <input type="text" value={medName} onChange={e => setMedName(e.target.value)}
                    placeholder="Paracetamol"
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg outline-none placeholder-zinc-700 text-white focus:border-luxury-goldRoyal/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-zinc-500 uppercase mb-1">Dosage</label>
                    <input type="text" value={medDosage} onChange={e => setMedDosage(e.target.value)}
                      placeholder="500mg"
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-2 py-2 rounded-lg outline-none text-white text-center focus:border-luxury-goldRoyal/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-500 uppercase mb-1">Duration</label>
                    <input type="text" value={medDur} onChange={e => setMedDur(e.target.value)}
                      placeholder="5 Days"
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-2 py-2 rounded-lg outline-none text-white text-center focus:border-luxury-goldRoyal/50 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-zinc-500 uppercase mb-1">Frequency</label>
                    <input type="text" value={medFreq} onChange={e => setMedFreq(e.target.value)}
                      placeholder="Twice Daily"
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-2 py-2 rounded-lg outline-none text-white text-center focus:border-luxury-goldRoyal/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-500 uppercase mb-1">Timing</label>
                    <select value={medInst} onChange={e => setMedInst(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-2 py-2 rounded-lg outline-none text-zinc-300">
                      <option>After Food</option><option>Before Food</option><option>With Water</option><option>At Night</option>
                    </select>
                  </div>
                </div>

                <button type="button" onClick={addMedicineToDraft}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-800 uppercase tracking-wider flex items-center justify-center gap-1 transition-all">
                  <Plus size={12} /> Add Medicine
                </button>

                {currentPresMeds.length > 0 && (
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 space-y-1.5">
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">Draft</p>
                    {currentPresMeds.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] border-b border-zinc-900 pb-1">
                        <span className="font-bold text-white">{med.name} ({med.dosage})</span>
                        <span className="text-zinc-500 font-mono">{med.frequency}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Clinical Notes</label>
                  <textarea rows={2} value={presNotes} onChange={e => setPresNotes(e.target.value)}
                    placeholder="Additional advice..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg outline-none placeholder-zinc-700 text-white resize-none focus:border-luxury-goldRoyal/50 transition-colors" />
                </div>

                <button type="submit" disabled={currentPresMeds.length === 0 || !selectedPatient}
                  className="w-full py-3 bg-luxury-goldRoyal disabled:bg-zinc-900 disabled:text-zinc-600 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
                  Send Prescription
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

// Helper: bind startConsultation for doctor (opens a new room to call specific patient)
function handleStartConsultation(patient: PatientRecord) {
  // Doctor-side: navigate to consultation page for selecting a room
  window.location.href = "/consultation";
}
