"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, UserProfile } from "@/services/firebase";
import AuthGuard from "@/components/AuthGuard";
import { 
  Lock, 
  Users, 
  UserCheck, 
  Activity, 
  AlertTriangle, 
  Radio, 
  ShieldCheck, 
  Check, 
  X, 
  Settings,
  ArrowLeft,
  Terminal
} from "lucide-react";

export default function AdminDashboard() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  const [activeTab, setActiveTab] = useState<"doctors" | "devices" | "logs">("doctors");

  // Audit Logs seed
  const [auditLogs, setAuditLogs] = useState<{ id: string; timestamp: string; action: string; ip: string }[]>([
    { id: "log-1", timestamp: new Date(Date.now() - 300000).toISOString(), action: "ESP32 telemetry accepted for patient pat1", ip: "192.168.1.15" },
    { id: "log-2", timestamp: new Date(Date.now() - 600000).toISOString(), action: "User alexander@medisync.ai authenticated successfully", ip: "172.56.9.102" }
  ]);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono bg-luxury-pureBlack">Initializing Admin Command Engine...</div>;
  }

  // Doctor Verification Action
  const approveDoctor = (docUid: string) => {
    const currentDb = getMediSyncDb();
    const doc = currentDb.users.find(u => u.uid === docUid);
    if (doc) {
      doc.status = "approved";
      
      // Log Action
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Administrator verified clinical credentials for ${doc.name} (${doc.licenseNumber})`,
        ip: "10.0.0.1"
      };
      setAuditLogs([newLog, ...auditLogs]);
    }
    saveMediSyncDb(currentDb);
    loadDb();
    
    // Broadcast storage event
    window.dispatchEvent(new Event("storage"));
  };

  const rejectDoctor = (docUid: string) => {
    const currentDb = getMediSyncDb();
    const doc = currentDb.users.find(u => u.uid === docUid);
    if (doc) {
      doc.status = "pending";
    }
    saveMediSyncDb(currentDb);
    loadDb();
    window.dispatchEvent(new Event("storage"));
  };

  const doctorsPending = db.users.filter(u => u.role === "doctor" && u.status === "applied");
  const verifiedDoctors = db.users.filter(u => u.role === "doctor" && u.status === "approved");

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Top Banner Header */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Security Command console</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/20 font-mono uppercase font-bold">Superuser Mode</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Control Center • MediSync AI Node: Global-US-East</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
              <Terminal size={14} className="text-luxury-goldRoyal animate-pulse" />
              <span className="font-mono text-zinc-500">Node Status: </span>
              <span className="text-luxury-greenEmerald font-bold font-mono">NOMINAL</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 relative z-10">
        
        {/* Statistics row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Total Users</p>
            <p className="text-2xl font-black text-white mt-1">{db.users.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Clinicians</p>
            <p className="text-2xl font-black text-luxury-blueElectric mt-1">{verifiedDoctors.length + doctorsPending.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Patients</p>
            <p className="text-2xl font-black text-luxury-goldRoyal mt-1">{db.patients.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Devices Connected</p>
            <p className="text-2xl font-black text-white mt-1">{db.patients.filter(p => p.connectedDevice !== null).length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center">
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Active Alerts</p>
            <p className="text-2xl font-black text-luxury-redCrimson mt-1">{db.alerts.filter(a => a.status === "active").length}</p>
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Workspace Tabs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 overflow-hidden animate-glow-gold">
              <div className="flex bg-zinc-950 border-b border-zinc-900 p-2">
                <button
                  onClick={() => setActiveTab("doctors")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "doctors" ? "bg-luxury-goldRoyal text-luxury-pureBlack font-bold shadow-lg" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Doctor Verification Workspace
                </button>
                <button
                  onClick={() => setActiveTab("devices")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "devices" ? "bg-luxury-goldRoyal text-luxury-pureBlack font-bold shadow-lg" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Paired IoT Nodes
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "logs" ? "bg-luxury-goldRoyal text-luxury-pureBlack font-bold shadow-lg" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Audit Command Logs
                </button>
              </div>

              <div className="p-6">
                {/* 1. Doctor Verification Roster */}
                {activeTab === "doctors" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest mb-3 font-mono">Credentials Verification Queue ({doctorsPending.length})</h3>
                      {doctorsPending.length === 0 ? (
                        <p className="text-xs text-zinc-400 py-4 italic">Roster certified. No requests in pool.</p>
                      ) : (
                        <div className="space-y-3">
                          {doctorsPending.map((doc) => (
                            <div key={doc.uid} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                              <div>
                                <h4 className="font-bold text-white text-sm">{doc.name}</h4>
                                <p className="text-zinc-400 mt-1">Specialty: {doc.specialty} • Affiliation: {doc.hospitalAffiliation}</p>
                                <p className="text-[10px] text-zinc-500 mt-1 font-mono">License File: {doc.licenseNumber}</p>
                              </div>
                              
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  onClick={() => approveDoctor(doc.uid)}
                                  className="flex-1 md:flex-none px-4 py-2 bg-luxury-goldRoyal hover:opacity-95 text-luxury-pureBlack font-bold rounded-lg transition-colors flex items-center justify-center gap-1 uppercase text-[10px] tracking-wider border border-luxury-goldRoyal/20"
                                >
                                  Approve License
                                </button>
                                <button
                                  onClick={() => rejectDoctor(doc.uid)}
                                  className="flex-1 md:flex-none px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-luxury-redCrimson border border-zinc-850 rounded-lg transition-colors flex items-center justify-center gap-1 uppercase text-[10px] tracking-wider"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-zinc-900">
                      <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest mb-3 font-mono">Verified Active Clinicians ({verifiedDoctors.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {verifiedDoctors.map((doc) => (
                          <div key={doc.uid} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900/60 flex items-center justify-between text-xs">
                            <div>
                              <h4 className="font-bold text-white">{doc.name}</h4>
                              <p className="text-zinc-500 mt-0.5">{doc.hospitalAffiliation} • {doc.licenseNumber}</p>
                            </div>
                            <span className="p-1 bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/25 rounded-full"><ShieldCheck size={16} /></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Device Registry */}
                {activeTab === "devices" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest mb-3 font-mono">System Hardware Registry</h3>
                    <div className="space-y-3">
                      {db.patients.filter(p => p.connectedDevice !== null).map((patient) => (
                        <div key={patient.uid} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 flex items-center justify-between flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-luxury-blueElectric/10 rounded-lg text-luxury-blueElectric border border-luxury-blueElectric/20">
                              <Radio size={16} className="animate-pulse" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white font-mono">{patient.connectedDevice?.deviceId}</h4>
                              <p className="text-zinc-500 mt-0.5 font-mono">Patient Owner: {patient.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[9px] text-zinc-500 font-mono">BATTERY</p>
                              <p className="font-bold text-white font-mono mt-0.5">{patient.connectedDevice?.battery}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-zinc-500 font-mono">STREAM STATUS</p>
                              <p className="font-bold text-luxury-greenEmerald font-mono mt-0.5">ONLINE</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. System Logs */}
                {activeTab === "logs" && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest mb-3 font-mono">System Audit Log Streams</h3>
                    <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-zinc-900 max-h-[300px] overflow-y-auto font-mono text-[9px] text-zinc-400">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="py-2 border-b border-zinc-900 flex justify-between gap-4">
                          <span>[{new Date(log.timestamp).toLocaleTimeString()}] <span className="text-zinc-200">{log.action}</span></span>
                          <span className="text-zinc-500">{log.ip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Configurations */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
              <h3 className="text-xs font-bold mb-4 flex items-center gap-1.5 text-zinc-300 uppercase tracking-widest font-mono">
                <Settings size={14} className="text-luxury-goldRoyal" /> configurations
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2.5 border-b border-zinc-900">
                  <div>
                    <p className="font-semibold text-white">AI Symptom check models</p>
                    <p className="text-[8px] text-zinc-500">Auto assess patient pathology logs</p>
                  </div>
                  <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/20 rounded font-mono text-[8px] uppercase font-bold">Enabled</span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-zinc-900">
                  <div>
                    <p className="font-semibold text-white">Emergency 911 SMS Engine</p>
                    <p className="text-[8px] text-zinc-500">Dispatch alerts to paired family</p>
                  </div>
                  <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/20 rounded font-mono text-[8px] uppercase font-bold">Active</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <p className="font-semibold text-white">Audit Trail Ciphering</p>
                    <p className="text-[8px] text-zinc-500">Encrypted logs for database writes</p>
                  </div>
                  <span className="px-2 py-0.5 bg-luxury-goldRoyal/15 text-luxury-goldRoyal border border-luxury-goldRoyal/20 rounded font-mono text-[8px] uppercase font-bold">AES-256</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
