"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb } from "@/services/firebase";
import { 
  Building2, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Activity, 
  Sliders, 
  Search,
  ArrowLeft,
  PieChart,
  BedDouble
} from "lucide-react";

export default function HospitalDashboard() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  const [selectedDept, setSelectedDept] = useState("All");

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono">Connecting to Hospital Registry...</div>;
  }

  // Count doctor roles
  const doctors = db.users.filter(u => u.role === "doctor");
  const verifiedDoctorsCount = doctors.filter(d => d.status === "approved").length;
  const activePatientsCount = db.patients.length;
  const activeAlertsCount = db.alerts.filter(a => a.status === "active").length;

  const departments = [
    { name: "Emergency Medicine", head: "Dr. Alexander Marcus", staff: 14, occupancy: 85, color: "text-red-400" },
    { name: "Cardiology", head: "Dr. Alexander Marcus", staff: 8, occupancy: 72, color: "text-rose-400" },
    { name: "ICU", head: "Dr. Elizabeth Carter", staff: 12, occupancy: 90, color: "text-violet-400" },
    { name: "Pulmonology", head: "Dr. Emily Smith", staff: 6, occupancy: 54, color: "text-cyan-400" },
    { name: "General Medicine", head: "Dr. Sarah Lin", staff: 18, occupancy: 65, color: "text-emerald-400" }
  ];

  return (
    <div className="min-h-screen bg-background pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">Mayo Clinical Center</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">Hospital ERP Panel</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Enterprise Registry • Affiliation: MediSync Global Network</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-zinc-300 font-mono">Beds Available: </span>
              <span className="font-bold text-emerald-400 font-mono">34 / 200</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Core ERP KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Hospital Staff</p>
              <p className="text-3xl font-extrabold mt-1 text-white">{doctors.length} Doctors</p>
              <p className="text-xs text-zinc-400 mt-1">{verifiedDoctorsCount} Verified</p>
            </div>
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
              <Users size={24} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Active Inpatients</p>
              <p className="text-3xl font-extrabold mt-1 text-white">{activePatientsCount}</p>
              <p className="text-xs text-zinc-400 mt-1">100% device active</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Activity size={24} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Emergencies active</p>
              <p className="text-3xl font-extrabold mt-1 text-red-400">{activeAlertsCount}</p>
              <p className="text-xs text-zinc-400 mt-1">Dispatched status: 100%</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
              <AlertTriangle size={24} className={activeAlertsCount > 0 ? "animate-bounce" : ""} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">ICU Occupancy</p>
              <p className="text-3xl font-extrabold mt-1 text-white">90%</p>
              <p className="text-xs text-zinc-400 mt-1">12 out of 14 beds</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
              <BedDouble size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Department Management Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Building2 size={20} className="text-primary" /> Clinical Department Metrics</h3>
                <span className="text-xs text-zinc-500">Live Census data</span>
              </div>

              <div className="space-y-4">
                {departments.map((dept, idx) => (
                  <div key={idx} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900/60 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-current ${dept.color}`} />
                        {dept.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Clinical Director: {dept.head}</p>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-zinc-500 font-mono">STAFF</p>
                        <p className="font-bold text-white text-sm">{dept.staff}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 font-mono">BED OCCUPANCY</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-white">{dept.occupancy}%</span>
                          <div className="w-16 bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full" 
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

            {/* Custom SVG Bar Chart replacing Recharts for speed and style */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><PieChart size={16} className="text-cyan-400" /> Vitals Telemetry Syncs (Last 7 Days)</h3>
              
              <div className="bg-zinc-950/80 p-6 rounded-xl border border-zinc-900/60">
                <svg className="w-full h-40 text-primary" viewBox="0 0 700 160">
                  {/* Grid lines */}
                  <line x1="50" y1="20" x2="650" y2="20" stroke="rgba(255,255,255,0.05)" />
                  <line x1="50" y1="60" x2="650" y2="60" stroke="rgba(255,255,255,0.05)" />
                  <line x1="50" y1="100" x2="650" y2="100" stroke="rgba(255,255,255,0.05)" />
                  <line x1="50" y1="140" x2="650" y2="140" stroke="rgba(255,255,255,0.1)" />

                  {/* SVG Bars representing telemetry packet volumes */}
                  {/* Mon */}
                  <rect x="100" y="50" width="30" height="90" rx="4" fill="url(#violetGradient)" />
                  <text x="115" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">MON</text>
                  {/* Tue */}
                  <rect x="180" y="30" width="30" height="110" rx="4" fill="url(#violetGradient)" />
                  <text x="195" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">TUE</text>
                  {/* Wed */}
                  <rect x="260" y="70" width="30" height="70" rx="4" fill="url(#violetGradient)" />
                  <text x="275" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">WED</text>
                  {/* Thu */}
                  <rect x="340" y="20" width="30" height="120" rx="4" fill="url(#violetGradient)" />
                  <text x="355" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">THU</text>
                  {/* Fri */}
                  <rect x="420" y="40" width="30" height="100" rx="4" fill="url(#violetGradient)" />
                  <text x="435" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">FRI</text>
                  {/* Sat */}
                  <rect x="500" y="80" width="30" height="60" rx="4" fill="url(#violetGradient)" />
                  <text x="515" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">SAT</text>
                  {/* Sun */}
                  <rect x="580" y="90" width="30" height="50" rx="4" fill="url(#violetGradient)" />
                  <text x="595" y="155" fill="rgb(156, 163, 175)" fontSize="10" textAnchor="middle" fontFamily="monospace">SUN</text>

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

          </div>

          {/* Right Column: Doctor Verification Workflows & Activity Logs */}
          <div className="space-y-6">
            
            {/* Verification Pending Roster */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                <UserCheck size={16} /> Clinician Verification queue
              </h3>
              
              <div className="space-y-3">
                {doctors.filter(d => d.status === "applied").length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No clinician licenses pending approval</p>
                ) : (
                  doctors.filter(d => d.status === "applied").map((doc) => (
                    <div key={doc.uid} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{doc.name}</h4>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{doc.hospitalAffiliation} • License: {doc.licenseNumber}</p>
                      </div>
                      
                      <Link 
                        href="/admin/dashboard" 
                        className="px-2 py-1 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded text-[9px] font-bold uppercase transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Inpatients list */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-1.5">
                <Users size={16} /> Patient Admissions
              </h3>

              <div className="space-y-3">
                {db.patients.map((pat) => (
                  <div key={pat.uid} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{pat.name}</p>
                      <p className="text-[10px] text-zinc-500">Gender: {pat.gender} • Age: {pat.age}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] uppercase font-bold">Admitted</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
