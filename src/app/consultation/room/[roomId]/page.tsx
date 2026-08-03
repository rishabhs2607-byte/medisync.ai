"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import {
  db as firestoreDb,
  rtdb,
  getMediSyncDb,
  saveMediSyncDb,
  Prescription,
  subscribeToPatientVitals,
  writePatientVitalsToFirestore,
} from "@/services/firebase";
import { ref, onValue, set } from "firebase/database";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Send,
  Activity, AlertTriangle, FileCheck, Bot, Users, Wifi, WifiOff,
  ArrowLeft, MessageSquare, Heart, Thermometer, Droplet, Clock,
  CheckCircle, ChevronUp, ChevronDown, Shield, Stethoscope, User,
  RefreshCw, LogOut,
} from "lucide-react";
import Link from "next/link";

interface LiveMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: any;
}

interface RoomData {
  roomId: string;
  patientId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  status: "waiting" | "active" | "ended";
  doctorHeartbeat?: string | null;
  patientHeartbeat?: string | null;
  draftedMeds?: any[]; // list of drafted medications for doctor
  presNotes?: string; // optional clinical advice notes
}


export default function ConsultationRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const roomId = params.roomId as string;
  const role = searchParams.get("role") || user?.role || "patient";

  const {
    localStream, remoteStream, callStatus, error,
    isMicOn, isCamOn, isScreenSharing,
    startCall, joinCall, endCall, toggleMic, toggleCam, toggleScreenShare,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [presOpen, setPresOpen] = useState(false);
  const [vitals, setVitals] = useState<any>(null);
  const [loadingVitals, setLoadingVitals] = useState<boolean>(true);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [editHr, setEditHr] = useState("74");
  const [editSpo2, setEditSpo2] = useState("98");
  const [editTemp, setEditTemp] = useState("98.6");
  const [editSys, setEditSys] = useState("120");
  const [editDia, setEditDia] = useState("80");
  const [editGlucose, setEditGlucose] = useState("95");

  // ─── Realtime RTDB & Firestore Patient Vitals Subscription ────────────────────────
  useEffect(() => {
    const targetPatientId = role === "doctor" ? (roomData?.patientId ?? user?.uid) : user?.uid;
    if (!targetPatientId) {
      setLoadingVitals(false);
      return;
    }

    setLoadingVitals(true);

    // Initial local DB load
    const localDb = getMediSyncDb();
    const p = localDb.patients.find((x) => x.uid === targetPatientId);
    if (p && p.vitals) {
      setVitals(p.vitals);
      setEditHr(String(p.vitals.heartRate || 74));
      setEditSpo2(String(p.vitals.spo2 || 98));
      setEditTemp(String(p.vitals.temperature || 98.6));
      setEditSys(String(p.vitals.systolic || 120));
      setEditDia(String(p.vitals.diastolic || 80));
      setEditGlucose(String(p.vitals.glucose || 95));
      setLoadingVitals(false);
    } else {
      setVitals({
        heartRate: 74,
        spo2: 98,
        temperature: 98.6,
        systolic: 120,
        diastolic: 80,
        glucose: 95,
        lastUpdated: new Date().toISOString(),
      });
      setLoadingVitals(false);
    }

    // Subscribe to RTDB (quota-proof real-time sync!)
    let unsubRtdb = () => {};
    if (rtdb) {
      const vRef = ref(rtdb, `telemetry_vitals/${targetPatientId}`);
      unsubRtdb = onValue(vRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          setVitals(val);
          setLoadingVitals(false);
        }
      });
    }

    // Subscribe to Firestore (fallback)
    const unsubFs = subscribeToPatientVitals(targetPatientId, (v) => {
      if (v) setVitals(v);
      setLoadingVitals(false);
    });

    return () => {
      unsubRtdb();
      unsubFs();
    };
  }, [role, roomData?.patientId, user?.uid]);

  const handleUpdateVitalsLive = async () => {
    const targetPatientId = role === "doctor" ? (roomData?.patientId ?? user?.uid) : user?.uid;
    if (!targetPatientId || !user) return;

    const updatedVitals = {
      heartRate: Number(editHr) || 74,
      spo2: Number(editSpo2) || 98,
      temperature: Number(editTemp) || 98.6,
      systolic: Number(editSys) || 120,
      diastolic: Number(editDia) || 80,
      glucose: Number(editGlucose) || 95,
      fallDetected: vitals?.fallDetected ?? false,
      ecg: vitals?.ecg ?? [],
      lastUpdated: new Date().toISOString(),
    };

    setVitals(updatedVitals);

    // 1. LocalStorage
    const dbInstance = getMediSyncDb();
    const p = dbInstance.patients.find((x) => x.uid === targetPatientId);
    if (p) {
      p.vitals = { ...p.vitals, ...updatedVitals };
      saveMediSyncDb(dbInstance);
    }

    // 2. RTDB (instant sync to peer screen)
    if (rtdb) {
      try {
        await set(ref(rtdb, `telemetry_vitals/${targetPatientId}`), updatedVitals);
      } catch (e) {}
    }

    // 3. Firestore (throttled)
    writePatientVitalsToFirestore(targetPatientId, roomData?.patientName || user.name, updatedVitals);
    setVitalsModalOpen(false);
  };

  // ─── Firebase RTDB listener for IoT thermometer (Patient side only) ────────────────────────
  useEffect(() => {
    if (!user || !rtdb) return;

    const deviceId = "thermometer_01";
    const telemetryRef = ref(rtdb, `device_telemetry/${deviceId}`);
    const unsubscribe = onValue(telemetryRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.temperature === "number") {
        const tempVal = data.temperature;
        const tsVal = Date.now();

        // Sync to local DB
        const dbInstance = getMediSyncDb();
        const p = dbInstance.patients.find((x) => x.uid === user.uid);
        if (p) {
          p.vitals.temperature = parseFloat(tempVal.toFixed(1));
          p.vitals.lastUpdated = new Date(tsVal).toISOString();
          saveMediSyncDb(dbInstance);

          const updatedVitals = { ...p.vitals };
          setVitals(updatedVitals);

          // Push vitals to Firestore so doctor can see live device data
          writePatientVitalsToFirestore(user.uid, p.name, updatedVitals);
        }
      }
    });
    return () => unsubscribe();
  }, [role, user, roomId]);

  // ─── Firebase RTDB listener for IoT oximeter (Patient side only) ────────────────────────
  useEffect(() => {
    if (!user || !rtdb) return;

    const deviceId = "oximeter_01";
    const telemetryRef = ref(rtdb, `device_telemetry/${deviceId}`);
    const unsubscribe = onValue(telemetryRef, (snapshot) => {
      const data = snapshot.val();
      if (data && (typeof data.spo2 === "number" || typeof data.heartRate === "number")) {
        const spo2Val = typeof data.spo2 === "number" ? data.spo2 : null;
        const hrVal = typeof data.heartRate === "number" ? data.heartRate : null;
        const tsVal = Date.now();

        // Sync to local DB
        const dbInstance = getMediSyncDb();
        const p = dbInstance.patients.find((x) => x.uid === user.uid);
        if (p) {
          if (spo2Val !== null) p.vitals.spo2 = spo2Val;
          if (hrVal !== null) p.vitals.heartRate = hrVal;
          p.vitals.lastUpdated = new Date(tsVal).toISOString();
          saveMediSyncDb(dbInstance);

          const updatedVitals = { ...p.vitals };
          setVitals(updatedVitals);

          // Push vitals to Firestore so doctor can see live device data
          writePatientVitalsToFirestore(user.uid, p.name, updatedVitals);
        }
      }
    });
    return () => unsubscribe();
  }, [role, user, roomId]);

  // ─── Auto-scroll chat ─────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send chat message ────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    const msgsRef = collection(firestoreDb, "rooms", roomId, "messages");
    await addDoc(msgsRef, {
      senderId: user.uid,
      senderName: user.name,
      senderRole: role,
      text: inputText.trim(),
      timestamp: serverTimestamp(),
    });
    setInputText("");
  };

  // ─── Add medicine to draft ────────────────────────────────────────────────
  const addMedicine = () => {
    if (!medName || !medDosage || !medFreq || !medDur) return;
    const newMeds = [...draftedMeds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur, instructions: medInst }];
    setDraftedMeds(newMeds);
    syncPrescriptionDraft(newMeds, presNotes);
    setMedName(""); setMedDosage(""); setMedFreq("Twice Daily"); setMedDur("5 Days");
  };

  // ─── End consultation ─────────────────────────────────────────────────────
  const handleEndConsult = async () => {
    // Prevent multiple clicks
    if (isEnding) return;
    setIsEnding(true);

    if (role === "doctor" && draftedMeds.length === 0) {
      setEndWarning(true);
      setIsEnding(false);
      return;
    }

    // Save prescription if doctor
    if (role === "doctor" && draftedMeds.length > 0 && roomData) {
      const newPres: Prescription = {
        id: `pres-${Date.now()}`,
        patientId: roomData.patientId,
        doctorId: user?.uid || "",
        doctorName: user?.name || "Doctor",
        date: new Date().toISOString().split("T")[0],
        medicines: draftedMeds,
        notes: presNotes,
      };
      const localDb = getMediSyncDb();
      localDb.prescriptions.unshift(newPres);
      const patRec = localDb.patients.find((p) => p.uid === roomData.patientId);
      if (patRec) {
        patRec.history.unshift({
          date: new Date().toISOString().split("T")[0],
          diagnosis: `Telehealth consult: ${draftedMeds.map((m) => m.name).join(", ")}`,
          doctor: user?.name || "Doctor",
        });
      }
      saveMediSyncDb(localDb);
      try {
        await addDoc(collection(firestoreDb, "prescriptions"), newPres);
      } catch (e) {}
      setPresSubmitted(true);
    }

    try {
      await endCall();
      await updateDoc(doc(firestoreDb, "rooms", roomId), { status: "ended" });
    } catch (e) {}
    setCallEnded(true);
    setTimeout(() => {
      router.push(role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }, 2500);
    setIsEnding(false);
  };



  // ─── Status label ─────────────────────────────────────────────────────────
  const statusLabel: Record<string, { label: string; color: string }> = {
    idle: { label: "Initializing", color: "text-zinc-400" },
    "requesting-media": { label: "Requesting Camera...", color: "text-luxury-goldRoyal" },
    "creating-offer": { label: "Creating Room...", color: "text-luxury-goldRoyal" },
    "waiting-for-doctor": { label: "Waiting for Doctor...", color: "text-luxury-goldRoyal animate-pulse" },
    joining: { label: "Joining Room...", color: "text-luxury-goldRoyal" },
    connecting: { label: "Connecting Peers...", color: "text-luxury-blueElectric" },
    connected: { label: "Live", color: "text-luxury-greenEmerald" },
    ended: { label: "Call Ended", color: "text-zinc-400" },
    error: { label: "Connection Error", color: "text-luxury-redCrimson" },
  };
  const status = statusLabel[callStatus] || statusLabel.idle;

  // ─── CALL ENDED SCREEN ────────────────────────────────────────────────────
  if (callEnded) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white">
        <div className="glass-panel p-10 rounded-3xl border border-luxury-goldRoyal/20 bg-luxury-richBlack/60 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-luxury-greenEmerald/15 border border-luxury-greenEmerald/30 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-luxury-greenEmerald" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-white">Consultation Complete</h2>
            <p className="text-xs text-zinc-400 mt-2">
              {presSubmitted ? "Prescription saved and transmitted to patient portal." : "Session ended. Redirecting..."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono animate-pulse">
            <Activity size={14} className="text-luxury-goldRoyal" />
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    );
  }

  const isConnected = callStatus === "connected";
  const isWaiting = callStatus === "waiting-for-doctor";
  const hasRemote = !!remoteStream;

  useEffect(() => {
  if (callStatus === "ended" || callStatus === "error") {
    setVitals(null);
    setLoadingVitals(false);
  }
}, [callStatus]);

return (
    <div className="min-h-screen max-h-screen bg-luxury-pureBlack text-zinc-100 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <Link
            href={role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard"}
            className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-extrabold uppercase tracking-widest text-white">
                Live Telemedicine Room
              </h1>
              <span className="w-2 h-2 bg-luxury-redCrimson rounded-full animate-ping" />
              <span className={`text-[10px] font-mono font-bold ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              Room: {roomId?.slice(0, 16)}... • WebRTC P2P • AES-GCM 256-bit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {roomData && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10">
              {role === "doctor" ? (
                <><User size={12} className="text-luxury-greenEmerald" />
                  <span className="text-zinc-300 font-mono text-[10px]">Patient: {roomData.patientName}</span></>
              ) : (
                <><Stethoscope size={12} className="text-luxury-blueElectric" />
                  <span className="text-zinc-300 font-mono text-[10px]">
                    {roomData.doctorName ? `Dr. ${roomData.doctorName}` : "Waiting for doctor..."}
                  </span></>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-900">
            {isConnected ? <Wifi size={12} className="text-luxury-greenEmerald" /> : <WifiOff size={12} className="text-zinc-600" />}
            <span className="text-[9px] font-mono text-zinc-500">
              {isConnected ? "P2P Active" : "Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="bg-luxury-redCrimson/15 border-b border-luxury-redCrimson/30 px-4 py-2.5 flex items-center gap-2 text-xs text-luxury-redCrimson shrink-0 z-20">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* ── TRANSFERRING BANNER ── */}
      {transferBanner && (
        <div className="bg-luxury-goldRoyal/20 border-b border-luxury-goldRoyal/30 px-4 py-3 flex items-center gap-2 text-xs text-luxury-goldRoyal shrink-0 z-20 animate-pulse">
          <RefreshCw size={14} className="animate-spin" />
          <span className="font-bold">{transferBanner}</span>
        </div>
      )}

      {/* ── WAITING BANNER (patient side) ── */}
      {isWaiting && (
        <div className="bg-luxury-goldRoyal/10 border-b border-luxury-goldRoyal/20 px-4 py-2.5 flex items-center justify-between text-xs shrink-0 z-20 animate-pulse">
          <div className="flex items-center gap-2 text-luxury-goldRoyal">
            <Clock size={14} />
            <span className="font-semibold">Room created. Waiting for a doctor to join your call...</span>
          </div>
          <span className="text-zinc-500 font-mono text-[9px]">Share Room ID: {roomId?.slice(0, 12)}...</span>
        </div>
      )}

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">

        {/* ─── VIDEO AREA ─── */}
        <div className="flex-1 flex flex-col gap-4 p-4 bg-luxury-pureBlack/80 overflow-hidden">

          {/* Video Frames */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">

            {/* Remote Video (other person) */}
            <div className="relative bg-zinc-950 rounded-2xl overflow-hidden border border-luxury-blueElectric/20 shadow-xl shadow-luxury-blueElectric/5 flex items-center justify-center group">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover opacity-100`}
              />
              {!hasRemote && (
                <div className="flex flex-col items-center gap-3 text-zinc-600">
                  {isWaiting || callStatus === "joining" || callStatus === "connecting" ? (
                    <>
                      <Activity size={40} className="animate-pulse text-luxury-goldRoyal/50" />
                      <p className="text-xs font-mono text-zinc-500">
                        {isWaiting ? "Waiting for doctor..." : "Connecting..."}
                      </p>
                    </>
                  ) : (
                    <>
                      <Users size={40} />
                      <p className="text-xs font-mono">Awaiting connection</p>
                    </>
                  )}
                </div>
              )}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm border border-white/5 rounded-lg text-[10px] font-semibold text-white flex items-center gap-1.5">
                {role === "doctor" ? (
                  <>
                    <User size={12} className="text-luxury-greenEmerald" />
                    <span className="text-zinc-300 font-mono text-[10px]">
                      Patient: {roomData?.patientName}
                    </span>
                    {roomData?.doctorHeartbeat && (Date.now() - new Date(roomData.doctorHeartbeat).getTime() < 15000) && (
                      <span className="ml-1 w-2 h-2 bg-luxury-greenEmerald rounded-full" title="Doctor online" />
                    )}
                  </>
                ) : (
                  <>
                    <Stethoscope size={12} className="text-luxury-blueElectric" />
                    <span className="text-zinc-300 font-mono text-[10px]">
                      {roomData?.doctorName ? `Dr. ${roomData.doctorName}` : "Waiting for doctor..."}
                    </span>
                    {roomData?.patientHeartbeat && (Date.now() - new Date(roomData.patientHeartbeat).getTime() < 15000) && (
                      <span className="ml-1 w-2 h-2 bg-luxury-greenEmerald rounded-full" title="Patient online" />
                    )}
                  </>
                )}
              </div>
              {hasRemote && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-luxury-greenEmerald/20 border border-luxury-greenEmerald/30 rounded text-[9px] text-luxury-greenEmerald font-mono font-bold">
                  LIVE
                </div>
              )}
            </div>

            {/* Local Video (self) */}
            <div className="relative bg-zinc-950 rounded-2xl overflow-hidden border border-luxury-goldRoyal/20 shadow-xl shadow-luxury-goldRoyal/5 flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${localStream ? "opacity-100" : "opacity-0"}`}
              />
              {!localStream && (
                <div className="flex flex-col items-center gap-3 text-zinc-600">
                  <VideoOff size={32} />
                  <p className="text-xs font-mono">Camera initializing...</p>
                </div>
              )}
              {!isCamOn && localStream && (
                <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                  <VideoOff size={32} className="text-zinc-600" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm border border-white/5 rounded-lg text-[10px] font-semibold text-white flex items-center gap-1.5">
                {role === "doctor" ? (
                  <><Stethoscope size={10} className="text-luxury-goldRoyal" /> {user?.name || "Doctor"} (You)</>
                ) : (
                  <><User size={10} className="text-luxury-greenEmerald" /> {user?.name || "Patient"} (You)</>
                )}
              </div>
              {isScreenSharing && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-luxury-blueElectric/20 border border-luxury-blueElectric/30 rounded text-[9px] text-luxury-blueElectric font-mono font-bold">
                  SCREEN
                </div>
              )}
            </div>
          </div>

          {/* ─── LIVE PATIENT VITALS & TELEMETRY HUD ─── */}
          <div className="bg-zinc-950/90 border border-luxury-goldRoyal/20 rounded-2xl p-3 shrink-0 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between mb-2 border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-luxury-goldRoyal animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">
                  Live Patient Vitals Telemetry
                </span>
                <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 border border-luxury-greenEmerald/30 rounded text-[9px] font-mono text-luxury-greenEmerald font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-luxury-greenEmerald rounded-full animate-ping" />
                  REALTIME SYNC
                </span>
              </div>
              <div className="flex items-center gap-2">
                {vitals?.lastUpdated && (
                  <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">
                    Updated: {new Date(vitals.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  onClick={() => setVitalsModalOpen(true)}
                  className="px-2.5 py-1 bg-luxury-goldRoyal/10 hover:bg-luxury-goldRoyal/20 border border-luxury-goldRoyal/30 text-luxury-goldRoyal text-[10px] font-bold rounded-lg font-mono flex items-center gap-1 transition-all"
                >
                  <RefreshCw size={10} /> Update Vitals
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Heart Rate */}
              <div className="bg-zinc-900/80 border border-luxury-redCrimson/30 rounded-xl p-2 text-center hover:border-luxury-redCrimson/60 transition-all">
                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-luxury-redCrimson uppercase font-bold mb-0.5">
                  <Heart size={11} className="animate-pulse" /> Heart Rate
                </div>
                <p className="text-base font-black text-white">{vitals?.heartRate ?? 74} <span className="text-[9px] text-zinc-500 font-normal">BPM</span></p>
                <span className="text-[8px] font-mono text-luxury-greenEmerald">Normal (60-100)</span>
              </div>

              {/* SpO2 */}
              <div className="bg-zinc-900/80 border border-luxury-blueElectric/30 rounded-xl p-2 text-center hover:border-luxury-blueElectric/60 transition-all">
                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-luxury-blueElectric uppercase font-bold mb-0.5">
                  <Activity size={11} /> SpO₂ (Oxygen)
                </div>
                <p className="text-base font-black text-white">{vitals?.spo2 ?? 98} <span className="text-[9px] text-zinc-500 font-normal">%</span></p>
                <span className="text-[8px] font-mono text-luxury-greenEmerald">Optimal (&gt;95%)</span>
              </div>

              {/* Temperature */}
              <div className="bg-zinc-900/80 border border-luxury-goldRoyal/30 rounded-xl p-2 text-center hover:border-luxury-goldRoyal/60 transition-all">
                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-luxury-goldRoyal uppercase font-bold mb-0.5">
                  <Thermometer size={11} /> Temp (°F)
                </div>
                <p className="text-base font-black text-white">{vitals?.temperature ?? 98.6} <span className="text-[9px] text-zinc-500 font-normal">°F</span></p>
                <span className="text-[8px] font-mono text-luxury-greenEmerald">Normal</span>
              </div>

              {/* Blood Pressure */}
              <div className="bg-zinc-900/80 border border-luxury-greenEmerald/30 rounded-xl p-2 text-center hover:border-luxury-greenEmerald/60 transition-all">
                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-luxury-greenEmerald uppercase font-bold mb-0.5">
                  <Droplet size={11} /> Blood Pressure
                </div>
                <p className="text-base font-black text-white">
                  {(vitals?.systolic && vitals?.diastolic) ? `${vitals.systolic}/${vitals.diastolic}` : "120/80"} <span className="text-[9px] text-zinc-500 font-normal">mmHg</span>
                </p>
                <span className="text-[8px] font-mono text-luxury-greenEmerald">Normal</span>
              </div>

              {/* Glucose */}
              <div className="bg-zinc-900/80 border border-purple-500/30 rounded-xl p-2 text-center col-span-2 sm:col-span-1 hover:border-purple-500/60 transition-all">
                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-purple-400 uppercase font-bold mb-0.5">
                  <Activity size={11} /> Glucose
                </div>
                <p className="text-base font-black text-white">{vitals?.glucose ?? 95} <span className="text-[9px] text-zinc-500 font-normal">mg/dL</span></p>
                <span className="text-[8px] font-mono text-luxury-greenEmerald">Normal</span>
              </div>
            </div>
          </div>

          {/* ─── UPDATE VITALS MODAL ─── */}
          {vitalsModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-luxury-goldRoyal/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
                    <Activity size={16} className="text-luxury-goldRoyal" /> Update Live Patient Vitals
                  </h3>
                  <button
                    onClick={() => setVitalsModalOpen(false)}
                    className="text-zinc-500 hover:text-white text-xs font-mono"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">Heart Rate (BPM)</label>
                    <input
                      type="number"
                      value={editHr}
                      onChange={(e) => setEditHr(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">SpO₂ (%)</label>
                    <input
                      type="number"
                      value={editSpo2}
                      onChange={(e) => setEditSpo2(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">Temperature (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editTemp}
                      onChange={(e) => setEditTemp(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">Blood Pressure (Systolic)</label>
                    <input
                      type="number"
                      value={editSys}
                      onChange={(e) => setEditSys(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">Blood Pressure (Diastolic)</label>
                    <input
                      type="number"
                      value={editDia}
                      onChange={(e) => setEditDia(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-400 font-mono uppercase mb-1">Blood Glucose (mg/dL)</label>
                    <input
                      type="number"
                      value={editGlucose}
                      onChange={(e) => setEditGlucose(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:border-luxury-goldRoyal outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setVitalsModalOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateVitalsLive}
                    className="px-4 py-2 bg-luxury-goldRoyal text-luxury-pureBlack font-extrabold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                  >
                    Broadcast Vitals
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* ── CALL CONTROLS ── */}
          <div className="flex justify-center items-center gap-3 py-3 bg-zinc-950/90 backdrop-blur-md border border-zinc-900 rounded-2xl shrink-0 px-6">
            <button
              onClick={toggleMic}
              title={isMicOn ? "Mute" : "Unmute"}
              className={`p-3 rounded-full transition-all border ${
                isMicOn
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  : "bg-luxury-redCrimson/20 text-luxury-redCrimson border-luxury-redCrimson/30"
              }`}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button
              onClick={toggleCam}
              title={isCamOn ? "Stop Camera" : "Start Camera"}
              className={`p-3 rounded-full transition-all border ${
                isCamOn
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                  : "bg-luxury-redCrimson/20 text-luxury-redCrimson border-luxury-redCrimson/30"
              }`}
            >
              {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop Share" : "Share Screen"}
              className={`p-3 rounded-full transition-all border ${
                isScreenSharing
                  ? "bg-luxury-blueElectric/20 text-luxury-blueElectric border-luxury-blueElectric/30"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
            </button>

            <div className="w-px h-8 bg-zinc-800 mx-1" />

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`p-3 rounded-full transition-all border lg:hidden ${
                chatOpen ? "bg-luxury-goldRoyal/20 text-luxury-goldRoyal border-luxury-goldRoyal/30" : "bg-zinc-900 border-zinc-800 text-zinc-300"
              }`}
            >
              <MessageSquare size={18} />
            </button>

            <button
              onClick={handleEndConsult}
              disabled={endButtonDisabled}
              className={`p-3 bg-luxury-redCrimson ${endButtonDisabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"} text-white rounded-full transition-colors border border-luxury-redCrimson/30 shadow-lg shadow-luxury-redCrimson/20`}
              title="End Call"
            >
              <PhoneOff size={18} />
            </button>
          </div>

          {endWarning && (
            <div className="flex items-center gap-2 p-3 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-xl text-xs text-luxury-redCrimson animate-shake">
              <AlertTriangle size={14} />
              Please add at least one medication before ending the consultation.
            </div>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR: CHAT + PRESCRIPTION ─── */}
        <div className={`${chatOpen ? "flex" : "hidden lg:flex"} w-full lg:w-96 border-l border-zinc-900 bg-luxury-pureBlack flex-col shrink-0`}>

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[250px]">
            <div
              className="p-3 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                <MessageSquare size={12} className="text-luxury-goldRoyal" />
                Live Chat
                {messages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-luxury-goldRoyal text-luxury-pureBlack text-[8px] font-black rounded-full">
                    {messages.length}
                  </span>
                )}
              </span>
              <span title="End-to-end encrypted"><Shield size={12} className="text-zinc-600" /></span> {/* Bust Vercel Cache */}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-zinc-600 text-[10px] font-mono mt-8">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                  Messages will appear here in real-time
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-zinc-500 mb-1 flex items-center gap-1">
                      {msg.senderRole === "doctor" ? (
                        <Stethoscope size={9} className="text-luxury-blueElectric" />
                      ) : (
                        <User size={9} className="text-luxury-greenEmerald" />
                      )}
                      {isMe ? "You" : msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                        isMe
                          ? "bg-luxury-goldRoyal text-luxury-pureBlack rounded-tr-none font-semibold"
                          : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-zinc-700 mt-0.5">
                      {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-zinc-900 flex gap-2 shrink-0 bg-zinc-950/60">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-zinc-600 text-white focus:border-luxury-goldRoyal transition-colors"
              />
              <button
                type="submit"
                className="p-2.5 bg-luxury-goldRoyal text-luxury-pureBlack rounded-xl transition-all font-bold hover:opacity-90"
              >
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* Prescription Panel (doctor only) */}
          {role === "doctor" && (
            <div className="shrink-0 border-t border-zinc-900 bg-luxury-richBlack/30">
              <button
                onClick={() => setPresOpen(!presOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-zinc-900/60 transition-colors"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldRoyal flex items-center gap-1.5">
                  <Bot size={12} /> AI Prescription Form
                  {draftedMeds.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-luxury-goldRoyal text-luxury-pureBlack text-[8px] font-black rounded-full">
                      {draftedMeds.length}
                    </span>
                  )}
                </span>
                {presOpen ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronUp size={14} className="text-zinc-500" />}
              </button>

              {presOpen && (
                <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Medicine</label>
                      <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g. Paracetamol"
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none text-white placeholder-zinc-700 focus:border-luxury-goldRoyal" />
                    </div>
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Dosage</label>
                      <input type="text" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} placeholder="e.g. 500mg"
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none text-white placeholder-zinc-700 focus:border-luxury-goldRoyal" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Frequency</label>
                      <input type="text" value={medFreq} onChange={(e) => setMedFreq(e.target.value)} placeholder="Twice Daily"
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-1.5 py-1.5 rounded-lg focus:outline-none text-white focus:border-luxury-goldRoyal" />
                    </div>
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Duration</label>
                      <input type="text" value={medDur} onChange={(e) => setMedDur(e.target.value)} placeholder="5 Days"
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-1.5 py-1.5 rounded-lg focus:outline-none text-white focus:border-luxury-goldRoyal" />
                    </div>
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Timing</label>
                      <select value={medInst} onChange={(e) => setMedInst(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-[9px] py-1.5 rounded-lg focus:outline-none text-zinc-300">
                        <option>After Food</option>
                        <option>Before Food</option>
                        <option>With Water</option>
                        <option>At Night</option>
                      </select>
                    </div>
                  </div>

                  <button onClick={addMedicine}
                    className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-[9px] font-bold border border-zinc-800 uppercase tracking-wider transition-all">
                    + Add Medicine
                  </button>

                  {draftedMeds.length > 0 && (
                    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 space-y-1.5">
                      <p className="text-[8px] text-luxury-goldRoyal font-bold font-mono uppercase">Drafted Medications</p>
                      {draftedMeds.map((m, i) => (
                        <div key={i} className="flex justify-between text-[9px] border-b border-zinc-900 pb-1">
                          <span className="font-semibold text-white">{m.name} <span className="text-zinc-500">({m.dosage})</span></span>
                          <span className="text-zinc-500 font-mono">{m.frequency}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Clinical Notes</label>
                    <textarea rows={2} value={presNotes} 
                      onChange={(e) => {
                        setPresNotes(e.target.value);
                        syncPrescriptionDraft(draftedMeds, e.target.value);
                      }}
                      placeholder="Additional advice..."
                      className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none placeholder-zinc-700 text-white focus:border-luxury-goldRoyal resize-none" />
                  </div>

                  <button onClick={handleEndConsult}
                    className="w-full py-2.5 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-1.5 shadow-lg shadow-luxury-goldRoyal/10">
                    <FileCheck size={13} /> Save Prescription & End Call
                  </button>
                </div>
              )}

              {/* End call without prescription (patient side) */}
              {!presOpen && (
                <div className="px-4 pb-3">
                  <button onClick={handleEndConsult}
                    className="w-full py-2.5 bg-luxury-redCrimson/15 border border-luxury-redCrimson/30 text-luxury-redCrimson font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-luxury-redCrimson/25 transition-all flex items-center justify-center gap-1.5">
                    <PhoneOff size={13} /> End Consultation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Patient: Live prescription view */}
          {role === "patient" && roomData && (
            <div className="p-4 border-t border-zinc-900 bg-luxury-richBlack/30 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldRoyal flex items-center gap-1.5">
                <Bot size={12} /> Doctor's Live Prescription
              </span>
              {(!roomData.draftedMeds || roomData.draftedMeds.length === 0) ? (
                <p className="text-[10px] text-zinc-500 font-mono py-2 text-center">Doctor is compiling prescription...</p>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 space-y-1.5">
                    {roomData.draftedMeds.map((m: any, i: number) => (
                      <div key={i} className="flex justify-between text-[9px] border-b border-zinc-900 pb-1">
                        <span className="font-semibold text-white">{m.name} <span className="text-zinc-500">({m.dosage})</span></span>
                        <span className="text-zinc-500 font-mono text-[8px]">{m.frequency} • {m.duration}</span>
                      </div>
                    ))}
                  </div>
                  {roomData.presNotes && (
                    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900">
                      <p className="text-[8px] text-zinc-500 font-mono uppercase">Clinical Advice</p>
                      <p className="text-[10px] text-zinc-300 mt-1 italic">"{roomData.presNotes}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Patient: simple end call */}
          {role === "patient" && (
            <div className="p-4 border-t border-zinc-900 shrink-0">
              <button onClick={handleEndConsult}
                className="w-full py-2.5 bg-luxury-redCrimson/15 border border-luxury-redCrimson/30 text-luxury-redCrimson font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-luxury-redCrimson/25 transition-all flex items-center justify-center gap-1.5">
                <PhoneOff size={13} /> Leave Consultation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
