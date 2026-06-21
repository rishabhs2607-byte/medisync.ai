"use client";

// Patient's Consultation Initiator — Creates a WebRTC room and redirects
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import AuthGuard from "@/components/AuthGuard";
import {
  Video, ArrowLeft, Shield, Wifi, HeartPulse, Activity
} from "lucide-react";
import Link from "next/link";

export default function PatientConsultationLobby() {
  const { user } = useAuth();
  const router = useRouter();
  const { startCall } = useWebRTC();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartConsultation = async () => {
    if (!user) return;
    setIsStarting(true);
    setError(null);
    try {
      const roomId = await startCall(user.uid, user.name);
      router.push(`/consultation/room/${roomId}?role=patient`);
    } catch (err: any) {
      setError(err.message || "Failed to start consultation. Please check camera permissions.");
      setIsStarting(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["patient"]}>
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-zinc-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <Link href="/patient/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/20 bg-luxury-richBlack/80 shadow-2xl shadow-luxury-goldRoyal/5">
            <div className="w-16 h-16 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-pulse mx-auto">
              <Video size={28} className="text-luxury-goldRoyal" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white mb-2">Live Video Consult</h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect with an available clinical specialist instantly. Your live telemetry and IoT vitals will be securely transmitted via AES-GCM 256-bit encryption.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-xl text-xs text-luxury-redCrimson text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleStartConsultation}
              disabled={isStarting}
              className="w-full py-4 bg-luxury-goldRoyal hover:opacity-90 text-luxury-pureBlack font-extrabold rounded-xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-luxury-goldRoyal/20 disabled:opacity-60"
            >
              {isStarting ? (
                <><Activity size={18} className="animate-spin" /> Establishing Secure Link...</>
              ) : (
                <><Video size={18} /> Request Clinical Consult</>
              )}
            </button>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-900">
                <Shield size={16} className="text-luxury-greenEmerald shrink-0" />
                <p className="text-[10px] text-zinc-500 font-mono">End-to-end encrypted peer connection.</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-900">
                <HeartPulse size={16} className="text-luxury-redCrimson shrink-0" />
                <p className="text-[10px] text-zinc-500 font-mono">Live ESP32 telemetry synced automatically.</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-900">
                <Wifi size={16} className="text-luxury-blueElectric shrink-0" />
                <p className="text-[10px] text-zinc-500 font-mono">Ensure stable network connection.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
