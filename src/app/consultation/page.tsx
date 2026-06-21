"use client";

// Doctor's Consultation Lobby — Shows active patient rooms, allows joining
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import AuthGuard from "@/components/AuthGuard";
import { db as firestoreDb } from "@/services/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Video,
  Phone,
  Users,
  Clock,
  Activity,
  ArrowLeft,
  Stethoscope,
  User,
  Wifi,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";

interface RoomDoc {
  roomId: string;
  patientId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  status: "waiting" | "active" | "ended";
  createdAt: any;
}

export default function ConsultationLobby() {
  const { user } = useAuth();
  const router = useRouter();
  const [waitingRooms, setWaitingRooms] = useState<RoomDoc[]>([]);
  const [activeRooms, setActiveRooms] = useState<RoomDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  // Listen for waiting & active rooms in Firestore
  useEffect(() => {
    const roomsRef = collection(firestoreDb, "rooms");

    // Waiting rooms (no doctor yet)
    const waitingQ = query(roomsRef, where("status", "==", "waiting"), orderBy("createdAt", "desc"));
    const activeQ = query(roomsRef, where("status", "==", "active"), orderBy("createdAt", "desc"));

    const unsubWaiting = onSnapshot(waitingQ, (snap) => {
      setWaitingRooms(snap.docs.map((d) => ({ roomId: d.id, ...d.data() } as RoomDoc)));
      setLoading(false);
    }, () => setLoading(false));

    const unsubActive = onSnapshot(activeQ, (snap) => {
      setActiveRooms(snap.docs.map((d) => ({ roomId: d.id, ...d.data() } as RoomDoc)));
    });

    return () => {
      unsubWaiting();
      unsubActive();
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    setJoiningRoomId(roomId);
    router.push(`/consultation/room/${roomId}?role=doctor`);
  };

  const timeAgo = (ts: any) => {
    if (!ts?.toDate) return "Just now";
    const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <AuthGuard allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* Header */}
        <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-5 relative z-10">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/doctor/dashboard" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-tight text-white">
                    Telemedicine Lobby
                  </h1>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-luxury-blueElectric/10 text-luxury-blueElectric border border-luxury-blueElectric/20 font-mono uppercase font-bold">
                    Physician Hub
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Real-time patient consultation rooms • WebRTC P2P Encrypted
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {loading ? (
                <RefreshCw size={14} className="animate-spin text-zinc-500" />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-900">
                  <span className="w-2 h-2 bg-luxury-greenEmerald rounded-full animate-pulse" />
                  <span className="text-zinc-400 font-mono text-[10px]">Live Monitoring</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 mt-8 space-y-8 relative z-10">

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Waiting Patients", value: waitingRooms.length, color: "text-luxury-goldRoyal", icon: <Clock size={16} className="text-luxury-goldRoyal" /> },
              { label: "Active Calls", value: activeRooms.length, color: "text-luxury-greenEmerald", icon: <PhoneCall size={16} className="text-luxury-greenEmerald" /> },
              { label: "Your Status", value: "Available", color: "text-luxury-blueElectric", icon: <CheckCircle size={16} className="text-luxury-blueElectric" /> },
            ].map((s) => (
              <div key={s.label} className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
                <div className="flex justify-center mb-2">{s.icon}</div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">{s.label}</p>
                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Waiting Rooms */}
          <div className="glass-panel rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 overflow-hidden">
            <div className="p-5 border-b border-zinc-900 flex items-center gap-2">
              <Clock size={14} className="text-luxury-goldRoyal animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-200 font-mono">
                Patients Waiting ({waitingRooms.length})
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-zinc-500 text-xs font-mono flex items-center justify-center gap-2">
                  <Activity size={14} className="animate-spin text-luxury-goldRoyal" />
                  Syncing consultation rooms...
                </div>
              ) : waitingRooms.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Users size={36} className="mx-auto text-zinc-700" />
                  <p className="text-zinc-500 text-xs font-mono">No patients waiting right now.</p>
                  <p className="text-zinc-600 text-[10px]">When a patient starts a consultation, they'll appear here in real-time.</p>
                </div>
              ) : (
                waitingRooms.map((room) => (
                  <div key={room.roomId}
                    className="p-4 bg-luxury-pureBlack rounded-xl border border-luxury-goldRoyal/15 hover:border-luxury-goldRoyal/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/20 flex items-center justify-center">
                        <User size={18} className="text-luxury-goldRoyal" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm">{room.patientName}</h3>
                          <span className="px-2 py-0.5 bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/20 rounded-full text-[8px] font-mono font-bold uppercase animate-pulse">
                            WAITING
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">
                          Room: {room.roomId.slice(0, 14)}... • {timeAgo(room.createdAt)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room.roomId)}
                      disabled={joiningRoomId === room.roomId}
                      className="flex items-center gap-2 px-5 py-2.5 bg-luxury-goldRoyal hover:opacity-90 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-luxury-goldRoyal/20 disabled:opacity-60"
                    >
                      {joiningRoomId === room.roomId ? (
                        <><Activity size={14} className="animate-spin" /> Joining...</>
                      ) : (
                        <><Video size={14} /> Join Call</>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Calls */}
          {activeRooms.length > 0 && (
            <div className="glass-panel rounded-2xl border border-luxury-greenEmerald/15 bg-luxury-richBlack/60 overflow-hidden">
              <div className="p-5 border-b border-zinc-900 flex items-center gap-2">
                <PhoneCall size={14} className="text-luxury-greenEmerald" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-200 font-mono">
                  Active Consultations ({activeRooms.length})
                </h2>
              </div>
              <div className="p-5 space-y-3">
                {activeRooms.map((room) => (
                  <div key={room.roomId}
                    className="p-4 bg-luxury-pureBlack rounded-xl border border-luxury-greenEmerald/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/20 flex items-center justify-center">
                        <Wifi size={18} className="text-luxury-greenEmerald animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm">{room.patientName}</h3>
                          <span className="px-2 py-0.5 bg-luxury-greenEmerald/10 text-luxury-greenEmerald border border-luxury-greenEmerald/20 rounded-full text-[8px] font-mono font-bold uppercase">
                            LIVE
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-0.5">
                          With: Dr. {room.doctorName} • {timeAgo(room.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                      <CheckCircle size={12} className="text-luxury-greenEmerald" /> In Progress
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 text-[10px] text-zinc-500 font-mono space-y-1">
            <p className="flex items-center gap-1.5"><Wifi size={10} className="text-luxury-blueElectric" /> WebRTC peer-to-peer encrypted video • Google STUN servers</p>
            <p className="flex items-center gap-1.5"><AlertTriangle size={10} className="text-luxury-goldRoyal" /> Camera & microphone access required on both ends</p>
            <p className="flex items-center gap-1.5"><CheckCircle size={10} className="text-luxury-greenEmerald" /> Works best on Chrome, Firefox, Edge (latest versions)</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
