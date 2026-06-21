"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, EmergencyAlert } from "@/services/firebase";
import { 
  AlertTriangle, 
  MapPin, 
  PhoneCall, 
  ShieldAlert, 
  Truck, 
  User, 
  Check, 
  ArrowLeft,
  BellRing,
  Volume2,
  Navigation
} from "lucide-react";

export default function EmergencyCenter() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono">Loading Emergency Dispatch Hub...</div>;
  }

  const activeAlerts = db.alerts.filter((a) => a.status !== "resolved");
  const selectedAlert = db.alerts.find((a) => a.id === activeAlertId) || activeAlerts[0];

  const handleAction = (alertId: string, status: "dispatched" | "resolved") => {
    const currentDb = getMediSyncDb();
    const alert = currentDb.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
    }
    saveMediSyncDb(currentDb);
    loadDb();
    
    // Broadcast storage event
    window.dispatchEvent(new Event("storage"));
  };

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
                <h1 className="text-2xl font-extrabold tracking-tight text-red-500">MediSync Emergency Command</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold uppercase animate-pulse">911 Link Active</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Critical response coordinator • Dispatch channel: US-Central</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 animate-bounce">
              <Volume2 size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Live Emergency Alerts Queue */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                <BellRing size={16} className="animate-pulse" /> Alerts Feed ({activeAlerts.length})
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Sync: 1s</span>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono italic">
                  No active emergency alerts. Systems nominal.
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <button
                      key={alert.id}
                      onClick={() => setActiveAlertId(alert.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected 
                          ? "bg-red-500/15 border-red-500/40 text-white shadow-lg shadow-red-500/5"
                          : alert.status === "dispatched"
                          ? "bg-zinc-900/80 border-amber-500/20 text-zinc-300"
                          : "bg-zinc-950/60 border-zinc-900/60 hover:bg-zinc-900/40 text-zinc-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-white">{alert.patientName}</h4>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                          alert.status === "dispatched" 
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                            : "bg-red-500/25 text-red-400 border border-red-500/30 animate-pulse"
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      
                      <p className="text-xs font-semibold text-red-400 mt-2">{alert.metric}: {alert.value}</p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-1">Logged: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Section: Active Emergency Detailed Map & Dispatch Info */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAlert ? (
            <div className="space-y-6">
              
              {/* Patient Geolocation Map (Mock) */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-zinc-300">
                    <MapPin size={16} className="text-red-400" /> Patient Geolocation Map
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Lat: 44.024 / Lon: -92.483 (Rochester, MN)</span>
                </div>

                {/* Mock GPS Map Canvas representation using elegant SVG */}
                <div className="bg-zinc-950 rounded-xl h-64 border border-zinc-900 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-grid-pattern opacity-40" />
                  
                  {/* Styled concentric radar lines */}
                  <div className="absolute w-32 h-32 border border-red-500/25 rounded-full animate-ping pointer-events-none" />
                  <div className="absolute w-16 h-16 border border-red-500/40 rounded-full animate-pulse pointer-events-none" />
                  
                  {/* MAP NODES */}
                  {/* Patient Node */}
                  <div className="absolute flex flex-col items-center">
                    <div className="p-2.5 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/50 relative">
                      <User size={18} />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse-fast" />
                    </div>
                    <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded mt-1.5">{selectedAlert.patientName}</span>
                  </div>

                  {/* Dispatcher Ambulance Node */}
                  {selectedAlert.status === "dispatched" && (
                    <div className="absolute top-10 right-28 flex flex-col items-center animate-float">
                      <div className="p-2 bg-amber-500 text-zinc-950 rounded-full shadow-lg shadow-amber-500/50">
                        <Truck size={14} />
                      </div>
                      <span className="text-[8px] font-bold text-amber-400 bg-black/60 px-1.5 py-0.5 rounded mt-1">Ambulance #42</span>
                    </div>
                  )}

                  {/* Quick coordinates */}
                  <div className="absolute bottom-4 left-4 text-[9px] text-zinc-500 font-mono bg-zinc-900/80 px-2 py-1 rounded">
                    Dispatch Destination: 290 Mayo Clinic Blvd
                  </div>
                </div>
              </div>

              {/* Response Dispatch Info & Action Bar */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-white">Emergency Response Actions</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Vital thresholds breached for {selectedAlert.patientName}. Telemetry logs indicate acute clinical warning. 
                    Immediate response and verification required.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 font-mono block text-[9px]">RESPONSE ETA</span>
                      <span className="text-sm font-extrabold text-white">
                        {selectedAlert.status === "dispatched" ? "4 mins (En-Route)" : "Awaiting Dispatch Coordinator"}
                      </span>
                    </div>
                    
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 font-mono block text-[9px]">NOTIFICATIONS SENT</span>
                      <span className="text-sm font-extrabold text-emerald-400">Doctor, Family (Emily A.)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 justify-center">
                  {selectedAlert.status === "active" && (
                    <button
                      onClick={() => handleAction(selectedAlert.id, "dispatched")}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                    >
                      <Truck size={14} /> Dispatch Ambulance
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(selectedAlert.id, "resolved")}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Mark Case Resolved
                  </button>

                  <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold border border-zinc-850 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                    <PhoneCall size={14} /> Call Local ER Team
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-zinc-500 text-center">
              <ShieldAlert size={48} className="mb-4 text-emerald-500" />
              <h3 className="font-bold text-lg text-white">All Patient Vitals Healthy</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">No active warnings or fall detection reports logged in database streams.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
