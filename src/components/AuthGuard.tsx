"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldAlert, Key, Activity, ArrowLeft } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "doctor" | "patient" | "hospital")[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push("/login");
    }
  }, [mounted, user, loading, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center text-zinc-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <Activity className="animate-pulse text-luxury-goldRoyal" size={32} />
          <p className="text-xs uppercase tracking-widest">Verifying Clinical Token...</p>
        </div>
      </div>
    );
  }

  // Not logged in redirect
  if (!user) {
    return null;
  }

  // Check RBAC Role permission
  const isAuthorized = allowedRoles.includes(user.role);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        {/* Luxury alert glass panel */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-luxury-redCrimson/30 bg-luxury-richBlack/80 max-w-md text-center space-y-6 relative z-10 animate-glow-gold">
          <div className="w-16 h-16 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-2xl flex items-center justify-center text-luxury-redCrimson mx-auto animate-bounce">
            <Lock size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-wide uppercase text-white">ACCESS CLASSIFICATION BREACH</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your account credential ({user.email}) is classified as a <span className="text-luxury-goldRoyal font-semibold font-mono uppercase">{user.role}</span>. 
              You are unauthorized to access this workspace.
            </p>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 text-left text-[10px] text-zinc-500 space-y-1 font-mono">
            <p>Access Level: Required Roles [{allowedRoles.join(", ").toUpperCase()}]</p>
            <p>Verification Audit ID: SEC-RBAC-{Date.now().toString().slice(-6)}</p>
          </div>

          <div className="flex gap-4">
            <Link 
              href="/"
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1"
            >
              <ArrowLeft size={12} /> Portal Home
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("medisync_activeUser");
                window.location.href = "/login";
              }}
              className="flex-1 py-2.5 bg-luxury-redCrimson text-white rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1"
            >
              <Key size={12} /> Re-Authenticate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Doctor status pending check (only verified doctors can access)
  const isDevOverride = typeof window !== "undefined" && localStorage.getItem("dev_override") === "true";
  
  if (user.role === "doctor" && user.status !== "approved" && !isDevOverride) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        <div className="glass-panel p-8 rounded-3xl border border-luxury-redCrimson/20 bg-luxury-richBlack/80 max-w-md text-center space-y-6 relative z-10 animate-glow-gold">
          <div className="w-16 h-16 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-2xl flex items-center justify-center text-luxury-redCrimson mx-auto animate-pulse">
            <ShieldAlert size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-extrabold tracking-wide uppercase text-luxury-redCrimson">APPLICATION STATE CONTROL</h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
              Your application is currently under review or has been rejected.
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed mt-2">
              Hello {user.name}. Your registration status is currently <span className="text-luxury-goldRoyal font-bold uppercase font-mono">{user.status}</span>. 
              Medical license verification is required before full physician hub workspace access is provisioned.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link 
              href="/"
              className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors rounded-lg text-xs uppercase tracking-wider text-center font-bold"
            >
              Return to Landing Page
            </Link>
            
            <button 
              onClick={() => {
                // FOOLPROOF DEV OVERRIDE
                localStorage.setItem("dev_override", "true");
                window.location.reload();
              }}
              className="w-full py-2 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/30 text-luxury-goldRoyal hover:bg-luxury-goldRoyal hover:text-luxury-pureBlack transition-all rounded-lg text-[10px] uppercase tracking-widest text-center font-extrabold flex items-center justify-center gap-2"
            >
              <Key size={12} /> DEV OVERRIDE: Force Approve
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
