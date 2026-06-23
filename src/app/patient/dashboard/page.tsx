"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription,
  findBestDoctor, rtdb, writePatientVitalsToFirestore
} from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { ref, onValue } from "firebase/database";
import { analyzeVitals } from "@/services/aiEngine";
import IoTSimulator from "@/components/IoTSimulator";
import AuthGuard from "@/components/AuthGuard";
import {
  Heart, Wind, Thermometer, Activity as ECGIcon, Droplet, Calendar,
  FileText, Users, AlertTriangle, Plus, ArrowLeft, Bell, Cpu,
  ShieldCheck, Stethoscope, Check, Video, User, Edit3, X, Save,
  Wifi, WifiOff, Clock
} from "lucide-react";

export default function PatientDashboard() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const { startCall, callStatus } = useWebRTC();

  const patientId = user?.uid || "pat1";

  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);

  // Smart matching booking state
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [specialtyNeeded, setSpecialtyNeeded] = useState("Cardiology");
  const [matchingReason, setMatchingReason] = useState("");
  const [matchedDoctor, setMatchedDoctor] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Edit Profile Modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editBloodType, setEditBloodType] = useState("O+");
  const [editAllergies, setEditAllergies] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Video call state
  const [isStartingCall, setIsStartingCall] = useState(false);

  // IoT Thermometer states
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<number | null>(null);
  const [liveRssi, setLiveRssi] = useState<number | null>(null);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Never");

  // Firebase RTDB listener for IoT thermometer
  useEffect(() => {
    if (!rtdb) return;
    const deviceId = "thermometer_01";
    const telemetryRef = ref(rtdb, `device_telemetry/${deviceId}`);
    const unsubscribe = onValue(telemetryRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.temperature === "number") {
        const tempVal = data.temperature;
        const tsVal = Date.now(); // Always use local browser time to avoid ESP8266 NTP sync issues
        const rssiVal = typeof data.rssi === "number" ? data.rssi : null;
        setLiveTemp(tempVal);
        setLiveTimestamp(tsVal);
        setLiveRssi(rssiVal);
        setTempHistory((prev) => {
          const next = [...prev, tempVal];
          if (next.length > 12) next.shift();
          return next;
        });
        // Sync to local DB
        const dbInstance = getMediSyncDb();
        const p = dbInstance.patients.find(x => x.uid === patientId);
        if (p) {
          p.vitals.temperature = parseFloat(tempVal.toFixed(1));
          p.vitals.lastUpdated = new Date(tsVal).toISOString();
          if (p.connectedDevice) {
            p.connectedDevice.status = "online";
            p.connectedDevice.lastSync = new Date(tsVal).toISOString();
          } else {
            p.connectedDevice = { deviceId, status: "online", battery: 98, lastSync: new Date(tsVal).toISOString() };
          }
          saveMediSyncDb(dbInstance);
          // Push vitals to Firestore so doctor can see live device data
          writePatientVitalsToFirestore(patientId, p.name, p.vitals);
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Device online check
  useEffect(() => {
    const timer = setInterval(() => {
      if (liveTimestamp) {
        const diffMs = Date.now() - liveTimestamp;
        const diffSec = Math.floor(diffMs / 1000);
        setIsDeviceOnline(diffSec <= 30);
        if (diffSec < 5) setLastUpdatedText("Just now");
        else if (diffSec < 60) setLastUpdatedText(`${diffSec} seconds ago`);
        else {
          const diffMin = Math.floor(diffSec / 60);
          setLastUpdatedText(`${diffMin} minute${diffMin > 1 ? "s" : ""} ago`);
        }
      } else {
        setIsDeviceOnline(false);
        setLastUpdatedText("Never");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [liveTimestamp]);

  const loadDb = useCallback(() => {
    setDb(getMediSyncDb());
  }, []);

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, [loadDb]);

  // Open edit modal prefilled with current data
  const openEditProfile = (patient: PatientRecord) => {
    setEditName(patient.name);
    setEditAge(String(patient.age));
    setEditGender(patient.gender);
    setEditBloodType(patient.bloodType);
    setEditAllergies(patient.allergies.join(", "));
    setEditPhone(user?.phone || "");
    setShowEditProfile(true);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!patient || !updateProfile) return;
    setSavingProfile(true);
    try {
      const allergiesArr = editAllergies.split(",").map(a => a.trim()).filter(Boolean);
      // Update user profile
      await updateProfile({ name: editName, age: Number(editAge), gender: editGender, bloodType: editBloodType, phone: editPhone });
      // Update patient record locally
      const currentDb = getMediSyncDb();
      const patRec = currentDb.patients.find(p => p.uid === patientId);
      if (patRec) {
        patRec.name = editName;
        patRec.age = Number(editAge);
        patRec.gender = editGender;
        patRec.bloodType = editBloodType;
        patRec.allergies = allergiesArr;
        saveMediSyncDb(currentDb);
        loadDb();
        window.dispatchEvent(new Event("storage"));
      }
      setShowEditProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  // Start video consultation
  const handleStartConsultation = async () => {
    if (!user) return;
    setIsStartingCall(true);
    try {
      const roomId = await startCall(user.uid, user.name);
      router.push(`/consultation/room/${roomId}?role=patient`);
    } catch (e) {
      console.error("Failed to start call:", e);
      setIsStartingCall(false);
    }
  };

  // Smart Match
  const handleSmartMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingReason || !patient) return;
    setIsMatching(true);
    setMatchedDoctor(null);
    setTimeout(() => {
      const doctor = findBestDoctor(specialtyNeeded, aiReport.riskLevel === "Critical" ? 5 : 1);
      if (doctor) {
        setMatchedDoctor(doctor);
        const newApt: Appointment = {
          id: `apt-${Date.now()}`, patientId: patient.uid, patientName: patient.name,
          doctorId: doctor.uid, doctorName: doctor.name,
          date: new Date().toISOString().split("T")[0],
          time: new Date(Date.now() + 600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "scheduled", reason: matchingReason
        };
        const currentDb = getMediSyncDb();
        currentDb.appointments.unshift(newApt);
        currentDb.activeSession = {
          isActive: true, patientId: patient.uid, patientName: patient.name,
          doctorId: doctor.uid, doctorName: doctor.name,
          messages: [], vitalsBackup: patient.vitals, reportsBackup: patient.reports
        };
        const docInDb = currentDb.users.find(u => u.uid === doctor.uid);
        if (docInDb) docInDb.workload = (docInDb.workload || 0) + 1;
        saveMediSyncDb(currentDb);
        loadDb();
      } else {
        const newApt: Appointment = {
          id: `apt-${Date.now()}`, patientId: patient.uid, patientName: patient.name,
          doctorId: "doc-pending", doctorName: "Pending Auto-Match",
          date: new Date().toISOString().split("T")[0], time: "Queue Placement",
          status: "waiting_queue", reason: matchingReason
        };
        const currentDb = getMediSyncDb();
        currentDb.appointments.unshift(newApt);
        saveMediSyncDb(currentDb);
        loadDb();
      }
      setIsMatching(false);
    }, 1200);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center text-zinc-400 font-mono">
        <ECGIcon className="animate-pulse text-luxury-goldRoyal mr-3" size={24} /> Connecting to MediSync...
      </div>
    );
  }

  const patient = db.patients.find((p) => p.uid === patientId) || db.patients[0];

  if (!patient) {
    return (
      <AuthGuard allowedRoles={["patient"]}>
        <div className="min-h-screen bg-luxury-pureBlack flex flex-col items-center justify-center text-white gap-6 p-6">
          <User size={48} className="text-luxury-goldRoyal" />
          <h2 className="text-xl font-bold">Complete Your Profile</h2>
          <p className="text-zinc-400 text-sm text-center max-w-sm">Your medical record has not been set up yet. Please complete your profile to use the dashboard.</p>
          <button onClick={() => setShowEditProfile(true)} className="px-6 py-3 bg-luxury-goldRoyal text-black font-bold rounded-xl text-sm uppercase tracking-wider">
            Set Up Profile
          </button>
        </div>
      </AuthGuard>
    );
  }

  const activeAlerts = db.alerts.filter(a => a.patientId === patientId && a.status === "active");
  const currentTemp = (liveTemp !== null && isDeviceOnline) ? parseFloat(liveTemp.toFixed(1)) : patient.vitals.temperature;

  const aiReport = analyzeVitals(
    patient.vitals.heartRate, patient.vitals.spo2, currentTemp,
    patient.vitals.systolic, patient.vitals.diastolic, patient.vitals.glucose
  );

  return (
    <AuthGuard allowedRoles={["patient"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* ── TOP HEADER ── */}
        <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-3 relative z-10 sticky top-0 backdrop-blur-md bg-opacity-95">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">{patient.name}</h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/20 font-mono uppercase font-bold">
                    Patient
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Age: {patient.age} • {patient.gender} • Blood: {patient.bloodType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Edit Profile */}
              <button
                onClick={() => openEditProfile(patient)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-luxury-goldRoyal/40 text-zinc-300 rounded-lg text-xs font-bold transition-all"
              >
                <Edit3 size={12} /> Edit Profile
              </button>

              {/* Start Consultation */}
              <button
                onClick={handleStartConsultation}
                disabled={isStartingCall}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-luxury-greenEmerald hover:bg-luxury-greenEmerald/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-luxury-greenEmerald/20 disabled:opacity-60"
              >
                <Video size={12} />
                {isStartingCall ? "Starting..." : "Start Consultation"}
              </button>

              {/* Vitals Source */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
                <Cpu size={13} className="text-luxury-blueElectric animate-pulse" />
                <span className="font-bold text-luxury-blueElectric uppercase font-mono text-[10px]">
                  {patient.vitalsMode === "device" ? "ESP8266" : "Manual"}
                </span>
              </div>

              {/* Alert Bell */}
              <div className="relative p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 cursor-pointer border border-zinc-900 bg-zinc-950">
                <Bell size={18} />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-luxury-redCrimson rounded-full animate-ping" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

          {/* ──────── LEFT: Telemetry + IoT + Records ──────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Vitals Summary */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 relative overflow-hidden animate-glow-gold">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-luxury-goldRoyal/10 to-transparent blur-xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-luxury-goldRoyal flex items-center gap-2">
                  <ECGIcon className="text-luxury-redCrimson animate-pulse" size={16} /> Live Patient Telemetry
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">AI Health Score: {aiReport.healthScore}/100</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Heart Rate */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Heart Rate</p>
                    <p className="text-3xl font-black mt-1 text-white">{patient.vitals.heartRate || '--'}</p>
                    <p className="text-[9px] text-zinc-400 mt-1 font-mono">BPM</p>
                  </div>
                  <div className="p-2.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson">
                    <Heart size={18} />
                  </div>
                </div>

                {/* SpO2 */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Oxygen Sat.</p>
                    <p className="text-3xl font-black mt-1 text-white">{patient.vitals.spo2 ? `${patient.vitals.spo2}%` : '--'}</p>
                    <p className="text-[9px] text-zinc-400 mt-1 font-mono">{patient.vitals.spo2 ? (patient.vitals.spo2 < 90 ? "Hypoxia Alert" : "Stable") : '--'}</p>
                  </div>
                  <div className="p-2.5 bg-luxury-blueElectric/10 border border-luxury-blueElectric/25 rounded-xl text-luxury-blueElectric">
                    <Wind size={18} />
                  </div>
                </div>

                {/* Body Temp */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Body Temp</p>
                    <p className={`text-3xl font-black mt-1 ${currentTemp > 100.4 ? "text-luxury-redCrimson" : "text-white"}`}>
                      {currentTemp ? `${currentTemp.toFixed(1)}°F` : '--'}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1 font-mono">{currentTemp ? (currentTemp > 100.4 ? "⚠ Fever" : "Normal") : '--'}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${currentTemp > 100.4 ? "bg-luxury-redCrimson/10 border-luxury-redCrimson/25 text-luxury-redCrimson" : "bg-luxury-goldRoyal/10 border-luxury-goldRoyal/25 text-luxury-goldRoyal"}`}>
                    <Thermometer size={18} />
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Blood Pressure</p>
                    <p className="text-2xl font-black mt-1 text-white">{patient.vitals.systolic ? `${patient.vitals.systolic}/${patient.vitals.diastolic}` : '--'}</p>
                    <p className="text-[9px] text-zinc-400 mt-2 font-mono">mmHg</p>
                  </div>
                  <div className="p-2.5 bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/25 rounded-xl text-luxury-greenEmerald">
                    <ECGIcon size={18} />
                  </div>
                </div>

                {/* Glucose */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Blood Sugar</p>
                    <p className="text-3xl font-black mt-1 text-white">{patient.vitals.glucose || '--'}</p>
                    <p className="text-[9px] text-zinc-400 mt-1 font-mono">mg/dL</p>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-500">
                    <Droplet size={18} />
                  </div>
                </div>

                {/* Device */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">IoT Sync</span>
                    {isDeviceOnline
                      ? <Wifi size={14} className="text-luxury-greenEmerald" />
                      : <WifiOff size={14} className="text-zinc-600" />}
                  </div>
                  <p className="text-xs font-bold text-white mt-1 font-mono">{patient.connectedDevice?.deviceId || "Not Connected"}</p>
                  <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono">
                    <span className={isDeviceOnline ? "text-luxury-greenEmerald" : "text-zinc-600"}>
                      {isDeviceOnline ? "Online" : "Offline"}
                    </span>
                    <span>{lastUpdatedText}</span>
                  </div>
                </div>
              </div>

              {/* AI Insight Bar */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-luxury-goldRoyal/10 to-luxury-blueMedical/10 border border-luxury-goldRoyal/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-luxury-goldRoyal/15 text-luxury-goldRoyal flex items-center justify-center font-black text-sm border border-luxury-goldRoyal/30">
                    {aiReport.healthScore}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white">AI Assessment: {aiReport.riskLevel} Risk</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{aiReport.clinicalInsights}</p>
                  </div>
                </div>
                <Link href="/ai-center" className="px-3.5 py-1.5 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap">
                  AI Diagnostic
                </Link>
              </div>
            </div>

            {/* IoT Thermometer Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isDeviceOnline ? "bg-luxury-greenEmerald animate-pulse" : "bg-zinc-700"}`} />
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">{isDeviceOnline ? "Online" : "Offline"}</span>
                </div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-luxury-goldRoyal flex items-center gap-2">
                  <Thermometer className="text-luxury-goldRoyal animate-pulse" size={16} />
                  MediSync Thermometer (IoT)
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Live Temp */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
                  {liveTemp !== null && isDeviceOnline && liveTemp > 100.4 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-luxury-redCrimson animate-pulse" />
                  )}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Live Temperature</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className={`text-4xl font-black ${liveTemp !== null && isDeviceOnline && liveTemp > 100.4 ? "text-luxury-redCrimson" : "text-white"}`}>
                        {liveTemp !== null && isDeviceOnline ? `${liveTemp.toFixed(1)}` : "--.-"}
                      </p>
                      <span className="text-xs text-zinc-400 font-bold font-mono">°F</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    {liveTemp !== null && isDeviceOnline ? (
                      liveTemp > 100.4 ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-luxury-redCrimson font-bold uppercase font-mono bg-luxury-redCrimson/10 border border-luxury-redCrimson/20 px-2 py-1 rounded">
                          <AlertTriangle size={10} /> Fever Alert
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[9px] text-luxury-greenEmerald font-bold uppercase font-mono bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/20 px-2 py-1 rounded">
                          <Check size={10} /> Normal Range
                        </div>
                      )
                    ) : (
                      <div className="text-[9px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                        Waiting for device...
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">Device ID</p>
                    <p className="text-sm font-bold text-white mt-1 font-mono">thermometer_01</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">Last Sync</p>
                    <p className="text-[10px] text-zinc-300 font-mono mt-1">{lastUpdatedText}</p>
                  </div>
                </div>

                {/* WiFi */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                  <p className="text-[9px] text-zinc-500 uppercase font-mono">WiFi Signal</p>
                  {isDeviceOnline && liveRssi !== null ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-white font-mono">{liveRssi} dBm</p>
                      <p className="text-[9px] text-luxury-blueElectric font-mono font-semibold uppercase mt-0.5">
                        {liveRssi >= -50 ? "Excellent" : liveRssi >= -70 ? "Good" : liveRssi >= -85 ? "Fair" : "Weak"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-zinc-600 mt-1 font-mono">No Signal</p>
                  )}
                  <div className="flex gap-0.5 items-end h-3 mt-2">
                    {[90, 85, 75, 60].map((threshold, i) => (
                      <div key={i} style={{ height: `${(i + 1) * 25}%` }}
                        className={`w-full rounded-t-sm transition-all ${isDeviceOnline && liveRssi !== null && Math.abs(liveRssi) <= Math.abs(-threshold + 100) ? "bg-luxury-blueElectric" : "bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>

                {/* Trend Sparkline */}
                <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                  <p className="text-[9px] text-zinc-500 uppercase font-mono mb-2">Temp Trend</p>
                  <div className="h-10 flex items-end gap-1">
                    {tempHistory.length === 0 ? (
                      <span className="text-[9px] text-zinc-600 font-mono">Waiting...</span>
                    ) : (
                      tempHistory.map((val, idx) => {
                        const percent = Math.min(100, Math.max(10, ((val - 93) / (108 - 93)) * 100));
                        return (
                          <div key={idx} style={{ height: `${percent}%` }}
                            className={`w-full rounded-t-sm transition-all ${val > 100.4 ? "bg-luxury-redCrimson" : "bg-luxury-goldRoyal"}`} />
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-500 font-mono border-t border-zinc-900 pt-1.5 mt-1">
                    <span>93°F</span><span>108°F</span>
                  </div>
                </div>
              </div>
            </div>

            {/* IoT Simulator */}
            <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-luxury-richBlack/40">
              <IoTSimulator />
            </div>

            {/* Clinical Records */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4 flex items-center gap-2 text-zinc-300">
                <FileText size={16} className="text-luxury-goldRoyal" /> Clinical Timeline
              </h2>
              {patient.history.length === 0 ? (
                <p className="text-[10px] text-zinc-500 italic text-center py-4">No clinical records yet</p>
              ) : (
                <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2">
                  {patient.history.map((record, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-1.5 h-1.5 rounded-full bg-luxury-goldRoyal" />
                      <p className="text-[10px] text-zinc-500 font-mono">{record.date}</p>
                      <h4 className="text-xs font-bold text-white mt-0.5">{record.diagnosis}</h4>
                      <p className="text-[10px] text-zinc-400">Dr. {record.doctor}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ──────── RIGHT: Alerts + Consultation + Prescriptions ──────── */}
          <div className="space-y-6">

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border border-luxury-redCrimson/30 bg-luxury-redCrimson/5 animate-pulse">
                <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle size={14} /> Emergency Alerts
                </h3>
                <div className="mt-3 space-y-2">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-xl bg-luxury-pureBlack border border-luxury-redCrimson/20 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">Vitals Breach: {alert.metric}</p>
                        <p className="text-[9px] text-zinc-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-luxury-redCrimson/25 text-luxury-redCrimson border border-luxury-redCrimson/30 rounded font-mono font-bold text-[10px]">{alert.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Consultation Quick Start */}
            <div className="glass-panel p-5 rounded-2xl border border-luxury-greenEmerald/20 bg-luxury-greenEmerald/5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-luxury-greenEmerald flex items-center gap-2 mb-3">
                <Video size={14} /> Video Consultation
              </h3>
              <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">
                Start a live video call with a verified doctor. Your vitals will be shared automatically.
              </p>
              <button
                onClick={handleStartConsultation}
                disabled={isStartingCall}
                className="w-full py-3 bg-luxury-greenEmerald hover:bg-luxury-greenEmerald/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-luxury-greenEmerald/20 disabled:opacity-60"
              >
                <Video size={14} />
                {isStartingCall ? "Creating Room..." : "Start Consultation Now"}
              </button>
              <p className="text-[9px] text-zinc-500 font-mono text-center mt-2">
                WebRTC • End-to-End Encrypted • AES-256
              </p>
            </div>

            {/* Smart Matching */}
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Calendar size={14} className="text-luxury-blueElectric" /> Appointments
                </h3>
                <button
                  onClick={() => setShowMatchingModal(true)}
                  className="px-2.5 py-1 bg-luxury-blueElectric/20 hover:bg-luxury-blueElectric/30 text-luxury-blueElectric rounded-lg text-[9px] font-bold uppercase tracking-wider border border-luxury-blueElectric/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={10} /> Smart Match
                </button>
              </div>
              <div className="space-y-3">
                {db.appointments.filter(a => a.patientId === patientId).length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4">No appointments scheduled</p>
                ) : (
                  db.appointments.filter(a => a.patientId === patientId).map((apt) => (
                    <div key={apt.id} className="p-3.5 bg-luxury-pureBlack rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-white">{apt.doctorName}</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{apt.date} • {apt.time}</p>
                        {apt.status === "waiting_queue" ? (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase">Queue</span>
                        ) : (
                          <p className="text-[9px] text-zinc-400 mt-1 italic">"{apt.reason}"</p>
                        )}
                      </div>
                      {apt.status !== "waiting_queue" && (
                        <button
                          onClick={handleStartConsultation}
                          className="px-2.5 py-1.5 bg-luxury-greenEmerald/20 hover:bg-luxury-greenEmerald/30 text-luxury-greenEmerald border border-luxury-greenEmerald/30 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <Video size={10} /> Join
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Prescriptions */}
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                <FileText size={14} className="text-luxury-goldRoyal" /> Prescriptions
              </h3>
              <div className="space-y-4">
                {db.prescriptions.filter(p => p.patientId === patientId).length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-2">No prescriptions yet</p>
                ) : (
                  db.prescriptions.filter(p => p.patientId === patientId).map((pres) => (
                    <div key={pres.id} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900">
                      <div className="flex justify-between items-start mb-2 border-b border-zinc-900 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-300">Dr. {pres.doctorName}</h4>
                          <p className="text-[9px] text-zinc-500 font-mono">{pres.date}</p>
                        </div>
                        <span className="text-[9px] px-2 py-1 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/20 rounded text-luxury-goldRoyal font-mono font-semibold uppercase">Rx</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {pres.medicines.map((med, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white">{med.name} <span className="text-[10px] text-zinc-500 font-normal">({med.dosage})</span></span>
                            <span className="text-[9px] text-zinc-400">{med.frequency}</span>
                          </div>
                        ))}
                      </div>
                      {pres.notes && <p className="text-[10px] text-zinc-500 italic mt-3 pt-2 border-t border-zinc-900">"{pres.notes}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Family Members */}
            {patient.familyMembers.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                  <Users size={14} className="text-luxury-goldRoyal" /> Authorized Family
                </h3>
                <div className="space-y-2">
                  {patient.familyMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-luxury-pureBlack rounded-xl border border-zinc-900 text-xs">
                      <div>
                        <p className="font-bold text-white">{member.name}</p>
                        <p className="text-[9px] text-zinc-500">{member.relation} • {member.email}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/25 rounded-full font-mono text-[9px] font-bold">ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── EDIT PROFILE MODAL ── */}
        {showEditProfile && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl border border-luxury-goldRoyal/20 w-full max-w-md text-white bg-luxury-richBlack animate-glow-gold relative">
              <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
              <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-zinc-800">
                <User className="text-luxury-goldRoyal" size={20} />
                <h3 className="text-base font-bold tracking-wide uppercase">Edit Profile</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-1">Full Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-luxury-goldRoyal/50 text-xs px-4 py-2.5 rounded-lg outline-none text-white transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase font-mono mb-1">Age</label>
                    <input type="number" value={editAge} onChange={e => setEditAge(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-luxury-goldRoyal/50 text-xs px-3 py-2.5 rounded-lg outline-none text-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase font-mono mb-1">Gender</label>
                    <select value={editGender} onChange={e => setEditGender(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs py-2.5 rounded-lg outline-none text-zinc-300">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase font-mono mb-1">Blood Type</label>
                    <select value={editBloodType} onChange={e => setEditBloodType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs py-2.5 rounded-lg outline-none text-zinc-300">
                      {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bt => <option key={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase font-mono mb-1">Phone</label>
                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-luxury-goldRoyal/50 text-xs px-3 py-2.5 rounded-lg outline-none text-white transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase font-mono mb-1">Allergies (comma-separated)</label>
                  <input type="text" value={editAllergies} onChange={e => setEditAllergies(e.target.value)}
                    placeholder="Penicillin, Peanuts..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-luxury-goldRoyal/50 text-xs px-4 py-2.5 rounded-lg outline-none text-white transition-colors" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEditProfile(false)}
                    className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold uppercase text-zinc-300 hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={savingProfile}
                    className="flex-1 py-2.5 bg-luxury-goldRoyal text-luxury-pureBlack rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                    <Save size={12} /> {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SMART MATCH MODAL ── */}
        {showMatchingModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl border border-luxury-goldRoyal/20 w-full max-w-md text-white bg-luxury-richBlack animate-glow-gold">
              <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-zinc-800">
                <Stethoscope className="text-luxury-blueElectric" size={20} />
                <h3 className="text-base font-bold tracking-wide uppercase">AI Smart Match</h3>
              </div>

              {!matchedDoctor ? (
                <form onSubmit={handleSmartMatch} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-1">Specialty Needed</label>
                    <select value={specialtyNeeded} onChange={e => setSpecialtyNeeded(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg outline-none text-zinc-200">
                      <option value="Cardiology">Cardiology</option>
                      <option value="ICU / Emergency Medicine">ICU / Emergency Medicine</option>
                      <option value="Pulmonology">Pulmonology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-1">Chief Complaint</label>
                    <textarea rows={3} value={matchingReason} onChange={e => setMatchingReason(e.target.value)}
                      placeholder="Describe your symptoms..."
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg outline-none placeholder-zinc-700 text-white resize-none" />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={() => setShowMatchingModal(false)}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase">Cancel</button>
                    <button type="submit" disabled={isMatching}
                      className="px-5 py-2 bg-luxury-blueElectric text-luxury-pureBlack rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-60">
                      {isMatching ? "Matching..." : "Find Doctor"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-luxury-greenEmerald/15 text-luxury-greenEmerald flex items-center justify-center mx-auto border border-luxury-greenEmerald/30">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Doctor Matched!</h4>
                    <p className="text-xs text-zinc-400 mt-2">You've been routed to:</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 text-left space-y-1">
                    <p className="font-bold text-white">{matchedDoctor.name}</p>
                    <p className="text-luxury-goldRoyal text-xs">{matchedDoctor.specialty}</p>
                  </div>
                  <button onClick={() => { setMatchedDoctor(null); setShowMatchingModal(false); }}
                    className="px-6 py-2.5 bg-luxury-goldRoyal text-luxury-pureBlack rounded-lg text-xs font-extrabold uppercase tracking-wider">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
