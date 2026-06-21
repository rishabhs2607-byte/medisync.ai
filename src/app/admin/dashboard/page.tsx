"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, UserProfile, EmergencyAlert } from "@/services/firebase";
import { 
  Lock, 
  Users, 
  UserCheck, 
  Activity, 
  AlertTriangle, 
  FileText, 
  Radio, 
  ShieldCheck, 
  TrendingUp, 
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
    { id: "log-1", timestamp: new Date(Date.now() - 300000).toISOString(), action: "ESP32 transmission accepted for Device MS-ESP32-098X", ip: "192.168.1.15" },
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono">Initializing Admin Command Engine...</div>;
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
        action: `Administrator approved clinical license for ${doc.name} (${doc.licenseNumber})`,
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
    <div className="min-h-screen bg-background pb-12 text-zinc-100">
      {/* Top Banner Header */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">Admin System Console</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold uppercase">Superuser Mode</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Control Center • MediSync AI Node: Global-US-East</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <Terminal size={14} className="text-amber-400 animate-pulse" />
              <span className="font-mono text-zinc-300">Firebase DB status: </span>
              <span className="text-emerald-400 font-bold font-mono">CONNECTED</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Statistics row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Total Users</p>
            <p className="text-3xl font-extrabold text-white mt-1">{db.users.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Clinicians</p>
            <p className="text-3xl font-extrabold text-cyan-400 mt-1">{verifiedDoctors.length + doctorsPending.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Patients</p>
            <p className="text-3xl font-extrabold text-violet-400 mt-1">{db.patients.length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">IoT Devices</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{db.patients.filter(p => p.connectedDevice !== null).length}</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Active Alerts</p>
            <p className="text-3xl font-extrabold text-red-400 mt-1">{db.alerts.filter(a => a.status === "active").length}</p>
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex bg-zinc-950 border-b border-zinc-900 p-2">
                <button
                  onClick={() => setActiveTab("doctors")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "doctors" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Doctor Verification Workflow
                </button>
                <button
                  onClick={() => setActiveTab("devices")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "devices" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Connected IoT Devices
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === "logs" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  System Security Audit Logs
                </button>
              </div>

              <div className="p-6">
                {/* 1. Doctor Verification Roster */}
                {activeTab === "doctors" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-3 font-mono">Pending Registration Requests ({doctorsPending.length})</h3>
                      {doctorsPending.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4 italic">No pending licenses to review</p>
                      ) : (
                        <div className="space-y-3">
                          {doctorsPending.map((doc) => (
                            <div key={doc.uid} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                              <div>
                                <h4 className="text-sm font-bold text-white">{doc.name}</h4>
                                <p className="text-zinc-400 mt-1">Hospital: {doc.hospitalAffiliation} • License: {doc.licenseNumber}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">Submitted: License scan, Medical degree certification, State medical ID</p>
                              </div>
                              
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  onClick={() => approveDoctor(doc.uid)}
                                  className="flex-1 md:flex-none px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Check size={14} /> Verify & Approve
                                </button>
                                <button
                                  onClick={() => rejectDoctor(doc.uid)}
                                  className="flex-1 md:flex-none px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-red-400 border border-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-zinc-900">
                      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-3 font-mono">Verified Active Clinicians ({verifiedDoctors.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {verifiedDoctors.map((doc) => (
                          <div key={doc.uid} className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-900/60 flex items-center justify-between text-xs">
                            <div>
                              <h4 className="font-bold text-white">{doc.name}</h4>
                              <p className="text-zinc-500 mt-0.5">{doc.hospitalAffiliation} • {doc.licenseNumber}</p>
                            </div>
                            <span className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full"><ShieldCheck size={16} /></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Device Registry */}
                {activeTab === "devices" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-3 font-mono">Global IoT Nodes</h3>
                    <div className="space-y-3">
                      {db.patients.filter(p => p.connectedDevice !== null).map((patient) => (
                        <div key={patient.uid} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 flex items-center justify-between flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                              <Radio size={16} className="animate-pulse" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{patient.connectedDevice?.deviceId}</h4>
                              <p className="text-zinc-500 mt-0.5">Assigned to: {patient.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[10px] text-zinc-500 font-mono">BATTERY</p>
                              <p className="font-bold text-white font-mono mt-0.5">{patient.connectedDevice?.battery}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-zinc-500 font-mono">LAST STREAMED</p>
                              <p className="font-bold text-emerald-400 font-mono mt-0.5">{new Date(patient.connectedDevice!.lastSync).toLocaleTimeString()}</p>
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
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-3 font-mono">System Audit Logs</h3>
                    <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-zinc-900 max-h-[300px] overflow-y-auto font-mono text-[10px] text-zinc-400">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="py-2 border-b border-zinc-900 flex justify-between gap-4">
                          <span>[{new Date(log.timestamp).toLocaleTimeString()}] <span className="text-zinc-200">{log.action}</span></span>
                          <span className="text-zinc-600">{log.ip}</span>
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
            <div className="glass-panel p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-1.5 text-zinc-300">
                <Settings size={16} /> Global Configurations
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <div>
                    <p className="font-semibold text-white">AI Symptom Check module</p>
                    <p className="text-[9px] text-zinc-500">Auto assess patient input pathology</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] uppercase font-bold">Enabled</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <div>
                    <p className="font-semibold text-white">Emergency 911 SMS Alert</p>
                    <p className="text-[9px] text-zinc-500">Dispatch alerts to registered family</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] uppercase font-bold">Active</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-semibold text-white">Audit Log Encryption</p>
                    <p className="text-[9px] text-zinc-500">Cipher system log streams</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] uppercase font-bold">AES-256</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
