"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb } from "@/services/firebase";
import AuthGuard from "@/components/AuthGuard";
import { 
  Building2, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Activity, 
  ArrowLeft,
  PieChart,
  BedDouble
} from "lucide-react";

export default function HospitalDashboard() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono bg-luxury-pureBlack">Connecting to Hospital Registry...</div>;
  }

  const doctors = db.users.filter(u => u.role === "doctor");
  const verifiedDoctorsCount = doctors.filter(d => d.status === "approved").length;
  const activePatientsCount = db.patients.length;
  const activeAlertsCount = db.alerts.filter(a => a.status === "active").length;

  const departments = [
    { name: "Emergency Medicine", head: "Dr. Alexander Marcus", staff: 14, occupancy: 85, color: "text-luxury-redCrimson" },
    { name: "Cardiology", head: "Dr. Alexander Marcus", staff: 8, occupancy: 72, color: "text-luxury-goldRoyal" },
    { name: "ICU / Trauma", head: "Dr. Elizabeth Carter", staff: 12, occupancy: 90, color: "text-luxury-blueElectric" },
    { name: "Pulmonology", head: "Dr. Emily Smith", staff: 6, occupancy: 54, color: "text-cyan-400" },
    { name: "General Medicine", head: "Dr. Sarah Lin", staff: 18, occupancy: 65, color: "text-luxury-greenEmerald" }
  ];

  return (
    <AuthGuard allowedRoles={["hospital"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Header Banner */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">Clinical Control Center</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/30 font-mono uppercase font-bold">Mayo ERP Portal</span>
              </div>
              <p className="text-[10px] text-zinc-555 font-mono mt-0.5">Enterprise Node: Mayo Clinic Affiliate ID: 2901-X</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10">
              <span className="w-2 h-2 bg-luxury-greenEmerald rounded-full animate-pulse" />
              <span className="text-zinc-500 font-mono">Beds Census: </span>
              <span className="font-bold text-luxury-greenEmerald font-mono">34 / 200</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 relative z-10">
        
        {/* Core KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Medical Staff</p>
              <p className="text-2xl font-black mt-1 text-white">{doctors.length} Clinicians</p>
              <p className="text-[10px] text-zinc-400 mt-1">{verifiedDoctorsCount} Active Licenses</p>
            </div>
            <div className="p-2.5 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/25 rounded-xl text-luxury-goldRoyal">
              <Users size={22} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Active Inpatients</p>
              <p className="text-2xl font-black mt-1 text-white">{activePatientsCount} Enrolled</p>
              <p className="text-[10px] text-zinc-400 mt-1">100% wireless sync</p>
            </div>
            <div className="p-2.5 bg-luxury-blueMedical/10 border border-luxury-blueMedical/25 rounded-xl text-luxury-blueMedical">
              <Activity size={22} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Emergencies Active</p>
              <p className="text-2xl font-black mt-1 text-luxury-redCrimson">{activeAlertsCount} Alarms</p>
              <p className="text-[10px] text-zinc-400 mt-1">911 Dispatch Active</p>
            </div>
            <div className="p-2.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson">
              <AlertTriangle size={22} className={activeAlertsCount > 0 ? "animate-bounce" : ""} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">ICU Occupancy</p>
              <p className="text-2xl font-black mt-1 text-white">90% Capacity</p>
              <p className="text-[10px] text-zinc-400 mt-1">12 / 14 critical beds</p>
            </div>
            <div className="p-2.5 bg-luxury-blueElectric/10 border border-luxury-blueElectric/25 rounded-xl text-luxury-blueElectric">
              <BedDouble size={22} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Department Census Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 animate-glow-gold">
              <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-luxury-goldRoyal"><Building2 size={18} /> Department Census Metrics</h3>
                <span className="text-[9px] text-zinc-500 font-mono">Live ward counts</span>
              </div>

              <div className="space-y-4">
                {departments.map((dept, idx) => (
                  <div key={idx} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-current ${dept.color}`} />
                        {dept.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Director: {dept.head}</p>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[8px] text-zinc-500 font-mono">CLINICIANS</p>
                        <p className="font-bold text-white text-xs">{dept.staff}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[8px] text-zinc-500 font-mono uppercase">Ward Load</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-white font-mono">{dept.occupancy}%</span>
                          <div className="w-16 bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                            <div 
                              className="bg-luxury-goldRoyal h-full rounded-full" 
                              style={{ width: `${dept.occupancy}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold flex items-center gap-2 mb-4 uppercase tracking-widest text-zinc-400 font-mono"><PieChart size={16} className="text-luxury-blueElectric" /> Daily Vital Packet Streams</h3>
              
              <div className="bg-luxury-pureBlack p-6 rounded-xl border border-zinc-900">
                <svg className="w-full h-40 text-primary" viewBox="0 0 700 160">
                  <line x1="50" y1="20" x2="650" y2="20" stroke="rgba(255,255,255,0.02)" />
                  <line x1="50" y1="60" x2="650" y2="60" stroke="rgba(255,255,255,0.02)" />
                  <line x1="50" y1="100" x2="650" y2="100" stroke="rgba(255,255,255,0.02)" />
                  <line x1="50" y1="140" x2="650" y2="140" stroke="rgba(255,255,255,0.08)" />

                  {/* SVG Bars */}
                  <rect x="100" y="50" width="25" height="90" rx="3" fill="url(#goldGradient)" />
                  <text x="112.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">MON</text>

                  <rect x="180" y="30" width="25" height="110" rx="3" fill="url(#goldGradient)" />
                  <text x="192.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">TUE</text>

                  <rect x="260" y="70" width="25" height="70" rx="3" fill="url(#goldGradient)" />
                  <text x="272.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">WED</text>

                  <rect x="340" y="20" width="25" height="120" rx="3" fill="url(#goldGradient)" />
                  <text x="352.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">THU</text>

                  <rect x="420" y="40" width="25" height="100" rx="3" fill="url(#goldGradient)" />
                  <text x="432.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">FRI</text>

                  <rect x="500" y="80" width="25" height="60" rx="3" fill="url(#goldGradient)" />
                  <text x="512.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">SAT</text>

                  <rect x="580" y="90" width="25" height="50" rx="3" fill="url(#goldGradient)" />
                  <text x="592.5" y="155" fill="rgb(113, 113, 122)" fontSize="9" textAnchor="middle" fontFamily="monospace">SUN</text>

                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

          </div>

          {/* Right Column: Pending clinical roster, Inpatients */}
          <div className="space-y-6">
            
            {/* Credentials Pending */}
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold text-luxury-goldRoyal mb-4 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <UserCheck size={14} /> License Review pool
              </h3>
              
              <div className="space-y-3">
                {doctors.filter(d => d.status === "applied").length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4 italic">Roster fully verified. Nominal.</p>
                ) : (
                  doctors.filter(d => d.status === "applied").map((doc) => (
                    <div key={doc.uid} className="p-3 bg-luxury-pureBlack border border-zinc-900 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-white">{doc.name}</h4>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{doc.hospitalAffiliation} • {doc.licenseNumber}</p>
                      </div>
                      
                      <Link 
                        href="/admin/dashboard" 
                        className="px-2.5 py-1 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack rounded text-[9px] font-extrabold uppercase transition-colors"
                      >
                        Verify
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inpatients */}
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold text-zinc-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Users size={14} /> Inpatients Admissions
              </h3>

              <div className="space-y-3">
                {db.patients.map((pat) => (
                  <div key={pat.uid} className="p-3 bg-luxury-pureBlack border border-zinc-900 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{pat.name}</p>
                      <p className="text-[9px] text-zinc-500 font-mono">Gender: {pat.gender} • Age: {pat.age}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/20 rounded font-mono text-[8px] uppercase font-bold">STREAM ACTIVE</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
