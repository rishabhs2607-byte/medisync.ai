"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Activity, ShieldAlert, Key, Mail, Lock, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const profile = await login(email, password);
      routeUser(profile.role);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetLogin = async (presetEmail: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const profile = await login(presetEmail, "password123"); // Mock password used for fast presets
      routeUser(profile.role);
    } catch (err: any) {
      setErrorMsg("Preset authentication failed. Verify database seeds.");
    } finally {
      setLoading(false);
    }
  };

  const routeUser = (role: string) => {
    switch (role) {
      case "admin": router.push("/admin/dashboard"); break;
      case "doctor": router.push("/doctor/dashboard"); break;
      case "patient": router.push("/patient/dashboard"); break;
      case "hospital": router.push("/hospital/dashboard"); break;
      default: router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Glow Orbs */}
      <div className="absolute top-[20%] left-[20%] w-[35%] h-[35%] bg-luxury-blueMedical/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[35%] h-[35%] bg-luxury-goldRoyal/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="p-2 bg-gradient-to-tr from-luxury-goldRoyal to-luxury-goldMetallic rounded-xl border border-luxury-goldRoyal/20">
              <Activity size={20} className="text-luxury-pureBlack group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-base tracking-wider text-white">
              MEDISYNC <span className="text-luxury-goldRoyal font-medium">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold tracking-wide uppercase text-white">Clinical Workspace Auth</h2>
          <p className="text-xs text-zinc-500 mt-1">Please authenticate using your clinical credentials</p>
        </div>

        {/* Login form card */}
        <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 shadow-2xl animate-glow-gold">
          
          {errorMsg && (
            <div className="p-3.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson text-xs flex items-start gap-1.5 mb-4 animate-shake">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Clinician / Patient Email</label>
              <div className="relative">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medisync.ai"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                />
                <Mail size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Password</label>
              <div className="relative">
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                />
                <Lock size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] border border-luxury-goldRoyal/30"
            >
              {loading ? "AUTHENTICATING..." : "Sign In"} <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick presets (CRITICAL FOR DEMO AND TESTING) */}
          <div className="mt-6 pt-5 border-t border-zinc-900 space-y-3">
            <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono text-center">Clinical Credentials Portal (Roster Profile)</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handlePresetLogin("james@gmail.com")}
                className="py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 rounded-xl text-[10px] text-zinc-350 font-semibold transition-all flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-1.5"><UserCheck size={12} className="text-luxury-blueElectric" /> James Anderson</span>
                 <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-mono bg-luxury-blueElectric/10 text-luxury-blueElectric px-1.5 py-0.5 rounded">Patient</span>
              </button>
              <button
                onClick={() => handlePresetLogin("alexander@medisync.ai")}
                className="py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 rounded-xl text-[10px] text-zinc-350 font-semibold transition-all flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-1.5"><UserCheck size={12} className="text-luxury-goldRoyal" /> Dr. Alexander Marcus</span>
                 <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-mono bg-luxury-goldRoyal/10 text-luxury-goldRoyal px-1.5 py-0.5 rounded">Doctor</span>
              </button>
              <button
                onClick={() => handlePresetLogin("admin@medisync.ai")}
                className="py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 rounded-xl text-[10px] text-zinc-350 font-semibold transition-all flex items-center justify-between px-4"
              >
                <span className="flex items-center gap-1.5"><UserCheck size={12} className="text-luxury-greenEmerald" /> Dr. Sarah Lin (CTO)</span>
                 <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-mono bg-luxury-greenEmerald/10 text-luxury-greenEmerald px-1.5 py-0.5 rounded">Admin</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-zinc-500">
            Don't have an account? <Link href="/register" className="text-luxury-goldRoyal hover:underline font-semibold">Register Profile</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
