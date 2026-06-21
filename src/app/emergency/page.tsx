"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb } from "@/services/firebase";
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
  Volume2
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono bg-luxury-pureBlack">Loading Emergency Dispatch Hub...</div>;
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
    window.dispatchEvent(new Event("storage"));
  };

  return (
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
                <h1 className="text-2xl font-extrabold tracking-tight text-luxury-redCrimson">Emergency Command board</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-redCrimson/15 text-luxury-redCrimson border border-luxury-redCrimson/35 font-mono uppercase font-bold animate-pulse">911 Dispatch Link active</span>
              </div>
              <p className="text-[10px] text-zinc-555 font-mono mt-0.5">Critical response coordinator • Region: US-Midwest</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-2 bg-luxury-redCrimson/10 border border-luxury-redCrimson/20 rounded-xl text-luxury-redCrimson animate-bounce">
              <Volume2 size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Live Emergency Alerts Queue */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
              <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <BellRing size={14} className="animate-pulse" /> Active Alarms Feed ({activeAlerts.length})
              </h3>
              <span className="text-[9px] text-zinc-400 font-mono">Sync: 1s</span>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono italic">
                  Systems nominal. No vitals breached.
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
                          ? "bg-luxury-redCrimson/15 border-luxury-redCrimson/45 text-white shadow-lg shadow-luxury-redCrimson/5"
                          : alert.status === "dispatched"
                          ? "bg-luxury-richBlack border-luxury-goldRoyal/20 text-zinc-300 animate-pulse"
                          : "bg-luxury-pureBlack border-zinc-900 hover:bg-zinc-900/40 text-zinc-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-xs">{alert.patientName}</h4>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                          alert.status === "dispatched" 
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                            : "bg-luxury-redCrimson/25 text-luxury-redCrimson border border-luxury-redCrimson/30 animate-pulse"
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      
                      <p className="text-xs font-bold text-luxury-redCrimson mt-2 font-mono">{alert.metric}: {alert.value}</p>
                      <p className="text-[8px] text-zinc-400 font-mono mt-1">Logged: {new Date(alert.timestamp).toLocaleTimeString()}</p>
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
              
              {/* Map */}
              <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 animate-glow-gold">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-300 uppercase tracking-wider font-mono">
                    <MapPin size={16} className="text-luxury-redCrimson" /> GPS Responder Tracking
                  </h3>
                  <span className="text-[9px] text-zinc-500 font-mono">Affiliation: Mayo Clinic dispatch center</span>
                </div>

                <div className="bg-luxury-pureBlack rounded-xl h-64 border border-zinc-900 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-grid-pattern opacity-30" />
                  
                  {/* Radar Circles */}
                  <div className="absolute w-32 h-32 border border-luxury-redCrimson/20 rounded-full animate-ping pointer-events-none" />
                  <div className="absolute w-16 h-16 border border-luxury-redCrimson/35 rounded-full animate-pulse pointer-events-none" />
                  
                  {/* Patient Node */}
                  <div className="absolute flex flex-col items-center">
                    <div className="p-2.5 bg-luxury-redCrimson text-white rounded-full shadow-lg shadow-luxury-redCrimson/50 relative">
                      <User size={18} />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse-fast" />
                    </div>
                    <span className="text-[9px] font-bold text-white bg-black/75 border border-white/5 px-2 py-0.5 rounded mt-1.5">{selectedAlert.patientName}</span>
                  </div>

                  {/* Dispatcher Ambulance Node */}
                  {selectedAlert.status === "dispatched" && (
                    <div className="absolute top-10 right-28 flex flex-col items-center animate-float">
                      <div className="p-2 bg-luxury-goldRoyal text-luxury-pureBlack rounded-full shadow-lg shadow-luxury-goldRoyal/50 border border-luxury-goldRoyal/30">
                        <Truck size={14} />
                      </div>
                      <span className="text-[8px] font-bold text-luxury-goldRoyal bg-black/75 border border-luxury-goldRoyal/20 px-1.5 py-0.5 rounded mt-1">Ambulance #42</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Dispatch Info & Action Bar */}
              <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Critical Dispatch Logs</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Vital thresholds breached for {selectedAlert.patientName}. Telemetry logs indicate acute clinical warning. 
                    Immediate response and verification required.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-luxury-pureBlack rounded-xl border border-zinc-900">
                      <span className="text-zinc-400 font-mono block text-[8px] uppercase">RESPONSE ETA</span>
                      <span className="text-xs font-extrabold text-white">
                        {selectedAlert.status === "dispatched" ? "4 mins (En-Route)" : "Awaiting Dispatch Coordinator"}
                      </span>
                    </div>
                    
                    <div className="p-3 bg-luxury-pureBlack rounded-xl border border-zinc-900">
                      <span className="text-zinc-400 font-mono block text-[8px] uppercase">NOTIFICATIONS SENT</span>
                      <span className="text-xs font-extrabold text-luxury-greenEmerald">Doctor, Family (Emily A.)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 justify-center">
                  {selectedAlert.status === "active" && (
                    <button
                      onClick={() => handleAction(selectedAlert.id, "dispatched")}
                      className="w-full py-3 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider transition-transform hover:scale-[1.02] flex items-center justify-center gap-1.5 border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/10"
                    >
                      <Truck size={14} /> Dispatch Ambulance
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(selectedAlert.id, "resolved")}
                    className="w-full py-3 bg-luxury-greenEmerald hover:bg-luxury-greenEmerald/90 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider transition-transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Resolve Alert
                  </button>

                  <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold border border-zinc-850 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                    <PhoneCall size={14} /> Contact Hospital
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-16 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 flex flex-col items-center justify-center text-zinc-500 text-center">
              <ShieldAlert size={48} className="mb-4 text-luxury-greenEmerald animate-pulse" />
              <h3 className="font-bold text-base text-white uppercase tracking-wider">All Systems Nominal</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">No vital breaches or fall logs currently registered in database telemetry.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
