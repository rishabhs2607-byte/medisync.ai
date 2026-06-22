"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, PatientRecord, Appointment, Prescription, EmergencyAlert, findBestDoctor, rtdb } from "@/services/firebase";
import { ref, onValue } from "firebase/database";
import { analyzeVitals } from "@/services/aiEngine";
import IoTSimulator from "@/components/IoTSimulator";
import AuthGuard from "@/components/AuthGuard";
import { 
  Heart, 
  Wind, 
  Thermometer, 
  Activity as ECGIcon, 
  Droplet, 
  Calendar, 
  FileText, 
  Users, 
  AlertTriangle, 
  Radio, 
  Plus, 
  ArrowLeft,
  Bell,
  Cpu,
  ShieldCheck,
  Stethoscope,
  Check
} from "lucide-react";

export default function PatientDashboard() {
  const [patientId] = useState("pat1");
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  
  // Smart matching booking state
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [specialtyNeeded, setSpecialtyNeeded] = useState("Cardiology");
  const [matchingReason, setMatchingReason] = useState("");
  const [matchedDoctor, setMatchedDoctor] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);

  // IoT Thermometer states
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<number | null>(null);
  const [liveRssi, setLiveRssi] = useState<number | null>(null);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Never");

  useEffect(() => {
    if (!rtdb) return;

    const deviceId = "thermometer_01";
    const telemetryRef = ref(rtdb, `device_telemetry/${deviceId}`);

    const unsubscribe = onValue(telemetryRef, (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data.temperature === "number") {
        const tempVal = data.temperature;
        const tsVal = data.timestamp || Date.now();
        const rssiVal = typeof data.rssi === "number" ? data.rssi : null;

        setLiveTemp(tempVal);
        setLiveTimestamp(tsVal);
        setLiveRssi(rssiVal);

        setTempHistory((prev) => {
          const next = [...prev, tempVal];
          if (next.length > 12) {
            next.shift();
          }
          return next;
        });

        // Sync with local database so health metrics and alerts are updated dynamically
        const dbInstance = getMediSyncDb();
        const p = dbInstance.patients.find(x => x.uid === "pat1");
        if (p && p.vitalsMode === "device") {
          p.vitals.temperature = parseFloat(tempVal.toFixed(1));
          p.vitals.lastUpdated = new Date(tsVal).toISOString();
          if (p.connectedDevice) {
            p.connectedDevice.status = "online";
            p.connectedDevice.lastSync = new Date(tsVal).toISOString();
          } else {
            p.connectedDevice = {
              deviceId,
              status: "online",
              battery: 98,
              lastSync: new Date(tsVal).toISOString()
            };
          }
          saveMediSyncDb(dbInstance);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [rtdb]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (liveTimestamp) {
        const diffMs = Date.now() - liveTimestamp;
        const diffSec = Math.floor(diffMs / 1000);
        
        const online = diffSec <= 30;
        setIsDeviceOnline(online);

        if (diffSec < 5) {
          setLastUpdatedText("Just now");
        } else if (diffSec < 60) {
          setLastUpdatedText(`${diffSec} seconds ago`);
        } else {
          const diffMin = Math.floor(diffSec / 60);
          setLastUpdatedText(`${diffMin} minute${diffMin > 1 ? "s" : ""} ago`);
        }
      } else {
        setIsDeviceOnline(false);
        setLastUpdatedText("Never");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [liveTimestamp]);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    window.addEventListener("storage", loadDb);
    return () => window.removeEventListener("storage", loadDb);
  }, []);

  if (!db) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-mono bg-luxury-pureBlack">Connecting to MediSync DB...</div>;
  }

  const patient = db.patients.find((p) => p.uid === patientId);
  
  if (!patient) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-red-400 font-mono">Patient record not found.</div>;
  }

  const activeAlerts = db.alerts.filter(a => a.patientId === patientId && a.status === "active");

  const currentTemp = (liveTemp !== null && isDeviceOnline) ? parseFloat(liveTemp.toFixed(1)) : patient.vitals.temperature;

  const aiReport = analyzeVitals(
    patient.vitals.heartRate,
    patient.vitals.spo2,
    currentTemp,
    patient.vitals.systolic,
    patient.vitals.diastolic,
    patient.vitals.glucose
  );

  // Smart Matching Assignment Trigger
  const handleSmartMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingReason) return;

    setIsMatching(true);
    setMatchedDoctor(null);

    setTimeout(() => {
      // Run smart matching algorithm
      const doctor = findBestDoctor(specialtyNeeded, aiReport.riskLevel === "Critical" ? 5 : 1);
      
      if (doctor) {
        setMatchedDoctor(doctor);
        
        // Add appointment directly to database
        const newApt: Appointment = {
          id: `apt-${Date.now()}`,
          patientId: patient.uid,
          patientName: patient.name,
          doctorId: doctor.uid,
          doctorName: doctor.name,
          date: new Date().toISOString().split("T")[0],
          time: new Date(Date.now() + 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "scheduled",
          reason: matchingReason
        };

        const currentDb = getMediSyncDb();
        currentDb.appointments.unshift(newApt);
        
        // Save matching session info in activeSession database for WebRTC recovery
        currentDb.activeSession = {
          isActive: true,
          patientId: patient.uid,
          patientName: patient.name,
          doctorId: doctor.uid,
          doctorName: doctor.name,
          messages: [],
          vitalsBackup: patient.vitals,
          reportsBackup: patient.reports
        };
        
        // Increment doctor workload in registry
        const docInDb = currentDb.users.find(u => u.uid === doctor.uid);
        if (docInDb) {
          docInDb.workload = (docInDb.workload || 0) + 1;
        }

        saveMediSyncDb(currentDb);
        loadDb();
      } else {
        // Queue appointment request if no doctors are currently active
        const newApt: Appointment = {
          id: `apt-${Date.now()}`,
          patientId: patient.uid,
          patientName: patient.name,
          doctorId: "doc-pending",
          doctorName: "Pending Auto-Match",
          date: new Date().toISOString().split("T")[0],
          time: "Queue Placement",
          status: "waiting_queue",
          reason: matchingReason
        };
        const currentDb = getMediSyncDb();
        currentDb.appointments.unshift(newApt);
        saveMediSyncDb(currentDb);
        loadDb();
      }
      setIsMatching(false);
    }, 1200);
  };

  return (
    <AuthGuard allowedRoles={["patient"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Top Header Banner */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">{patient.name}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/20 font-mono uppercase font-bold">Patient Workspace</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Age: {patient.age} • Gender: {patient.gender} • Blood Type: {patient.bloodType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
              <Cpu size={14} className="text-luxury-blueElectric animate-pulse" />
              <span className="font-mono text-zinc-500">Source: </span>
              <span className="font-bold text-luxury-blueElectric uppercase font-mono">
                {patient.vitalsMode === "device" ? "ESP32 Device" : "Manual Input"}
              </span>
            </div>
            
            <div className="relative p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 cursor-pointer border border-zinc-900 bg-zinc-950">
              <Bell size={18} />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-luxury-redCrimson rounded-full animate-ping" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Live IoT Metrics Widgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Vitals Summary Card */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 relative overflow-hidden animate-glow-gold">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-luxury-goldRoyal/10 to-transparent blur-xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-luxury-goldRoyal flex items-center gap-2"><ECGIcon className="text-luxury-redCrimson animate-pulse" size={16} /> Live Patient Telemetry</h2>
              <span className="text-[10px] text-zinc-500 font-mono">Status: Secure connection</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Heart Rate */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Heart Rate</p>
                  <p className="text-3xl font-black mt-1 text-white animate-heartbeat">{patient.vitals.heartRate}</p>
                  <p className="text-[9px] text-zinc-400 mt-1 font-mono">BPM</p>
                </div>
                <div className="p-2.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson">
                  <Heart size={18} />
                </div>
              </div>

              {/* SpO2 */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Oxygen saturation</p>
                  <p className="text-3xl font-black mt-1 text-white">{patient.vitals.spo2}%</p>
                  <p className="text-[9px] text-zinc-400 mt-1 font-mono">{patient.vitals.spo2 < 90 ? "Hypoxia Alert" : "Stable"}</p>
                </div>
                <div className="p-2.5 bg-luxury-blueElectric/10 border border-luxury-blueElectric/25 rounded-xl text-luxury-blueElectric">
                  <Wind size={18} />
                </div>
              </div>

              {/* Temp */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Body Temperature</p>
                  <p className={`text-3xl font-black mt-1 ${((currentTemp * 9/5) + 32) > 100.4 ? "text-luxury-redCrimson" : "text-white"}`}>
                    {((currentTemp * 9/5) + 32).toFixed(1)}°F
                  </p>
                  <p className="text-[9px] text-zinc-400 mt-1 font-mono">
                    {((currentTemp * 9/5) + 32) > 100.4 ? "Fever Detected" : "Normal"}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border ${currentTemp > 38.0 ? "bg-luxury-redCrimson/10 border-luxury-redCrimson/25 text-luxury-redCrimson" : "bg-luxury-goldRoyal/10 border-luxury-goldRoyal/25 text-luxury-goldRoyal"}`}>
                  <Thermometer size={18} />
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Blood Pressure</p>
                  <p className="text-2xl font-black mt-1 text-white">{patient.vitals.systolic}/{patient.vitals.diastolic}</p>
                  <p className="text-[9px] text-zinc-400 mt-2 font-mono">mmHg</p>
                </div>
                <div className="p-2.5 bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/25 rounded-xl text-luxury-greenEmerald">
                  <ECGIcon size={18} />
                </div>
              </div>

              {/* Glucose */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Blood Sugar</p>
                  <p className="text-3xl font-black mt-1 text-white">{patient.vitals.glucose}</p>
                  <p className="text-[9px] text-zinc-400 mt-1 font-mono">mg/dL</p>
                </div>
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-500">
                  <Droplet size={18} />
                </div>
              </div>

              {/* Device Battery/Sync */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">IoT sync status</span>
                  <span className="w-2 h-2 bg-luxury-greenEmerald rounded-full animate-pulse" />
                </div>
                <p className="text-base font-bold text-white mt-1 font-mono">{patient.connectedDevice?.deviceId}</p>
                <div className="flex justify-between items-center text-[9px] text-zinc-400 mt-1 font-mono">
                  <span>Battery: {patient.connectedDevice?.battery}%</span>
                  <span>1s ago</span>
                </div>
              </div>
            </div>

            {/* AI Diagnostics status */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-luxury-goldRoyal/10 to-luxury-blueMedical/10 border border-luxury-goldRoyal/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-luxury-goldRoyal/15 text-luxury-goldRoyal flex items-center justify-center font-black text-sm border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/5">
                  {aiReport.healthScore}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">AI Health Assessment: {aiReport.riskLevel} Risk</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{aiReport.clinicalInsights}</p>
                </div>
              </div>
              <Link href="/ai-center" className="px-3.5 py-1.5 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                Run AI Diagnostic
              </Link>
            </div>
          </div>

          {/* MediSync Thermometer IoT Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 relative overflow-hidden animate-glow-gold">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-luxury-goldRoyal/10 to-transparent blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isDeviceOnline ? "bg-luxury-greenEmerald animate-pulse" : "bg-zinc-650"}`} />
                <span className="text-[10px] text-zinc-400 font-mono uppercase">{isDeviceOnline ? "Online" : "Offline"}</span>
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-luxury-goldRoyal flex items-center gap-2 text-right">
                <Thermometer className="text-luxury-goldRoyal animate-pulse" size={16} /> 
                MediSync Thermometer (IoT)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Live Temperature & Fever Alert */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
                {liveTemp !== null && isDeviceOnline && liveTemp > 38.0 && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-luxury-redCrimson animate-pulse" />
                )}
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Live Temperature</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`text-4xl font-black ${liveTemp !== null && isDeviceOnline && liveTemp > 38.0 ? "text-luxury-redCrimson" : "text-white"}`}>
                      {liveTemp !== null && isDeviceOnline ? `${liveTemp.toFixed(1)}` : "--.-"}
                    </p>
                    <span className="text-xs text-zinc-400 font-bold font-mono">°C</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  {liveTemp !== null && isDeviceOnline ? (
                    liveTemp > 38.0 ? (
                      <div className="flex items-center gap-1.5 text-[9px] text-luxury-redCrimson font-bold uppercase font-mono bg-luxury-redCrimson/10 border border-luxury-redCrimson/20 px-2 py-1 rounded">
                        <AlertTriangle size={10} /> Fever Alert (&gt;38°C)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[9px] text-luxury-greenEmerald font-bold uppercase font-mono bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/20 px-2 py-1 rounded">
                        <Check size={10} /> Normal Range
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                      Waiting for connection
                    </div>
                  )}
                </div>
              </div>

              {/* Device Info & Last Sync */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Device ID</p>
                  <p className="text-sm font-bold text-white mt-1 font-mono">thermometer_01</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Last Synchronized</p>
                  <p className="text-[10px] text-zinc-300 font-mono mt-1">{lastUpdatedText}</p>
                </div>
              </div>

              {/* WiFi Strength Metric */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">WiFi Connection</p>
                  {isDeviceOnline && liveRssi !== null ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-white font-mono">{liveRssi} dBm</p>
                      <p className="text-[9px] text-luxury-blueElectric font-mono font-semibold uppercase mt-0.5">
                        Signal: {liveRssi >= -50 ? "Excellent" : liveRssi >= -70 ? "Good" : liveRssi >= -85 ? "Fair" : "Weak"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-zinc-500 mt-1 font-mono">Offline</p>
                  )}
                </div>
                <div>
                  <div className="flex gap-0.5 items-end h-3 mt-2">
                    <div className={`w-1 h-1.5 rounded-sm ${isDeviceOnline && liveRssi !== null && liveRssi >= -90 ? "bg-luxury-blueElectric" : "bg-zinc-800"}`} />
                    <div className={`w-1 h-2 rounded-sm ${isDeviceOnline && liveRssi !== null && liveRssi >= -85 ? "bg-luxury-blueElectric" : "bg-zinc-800"}`} />
                    <div className={`w-1 h-2.5 rounded-sm ${isDeviceOnline && liveRssi !== null && liveRssi >= -75 ? "bg-luxury-blueElectric" : "bg-zinc-800"}`} />
                    <div className={`w-1 h-3 rounded-sm ${isDeviceOnline && liveRssi !== null && liveRssi >= -60 ? "bg-luxury-blueElectric" : "bg-zinc-800"}`} />
                  </div>
                </div>
              </div>

              {/* Sparkline / History Graph */}
              <div className="bg-luxury-pureBlack border border-zinc-900 p-4 rounded-xl flex flex-col justify-between col-span-1">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Temperature Trend</p>
                  <div className="h-10 flex items-end gap-1.5 pb-1">
                    {tempHistory.length === 0 ? (
                      <span className="text-[9px] text-zinc-650 font-mono">Waiting for readings...</span>
                    ) : (
                      tempHistory.map((val, idx) => {
                        const minVal = 34.0;
                        const maxVal = 42.0;
                        const percent = Math.min(100, Math.max(10, ((val - minVal) / (maxVal - minVal)) * 100));
                        const isHigh = val > 38.0;
                        return (
                          <div
                            key={idx}
                            style={{ height: `${percent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isHigh ? "bg-luxury-redCrimson" : "bg-luxury-goldRoyal"
                            }`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[8px] text-zinc-500 font-mono border-t border-zinc-900 pt-1.5">
                  <span>34°C</span>
                  <span>42°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* IoT Simulator / Vital Entry forms */}
          <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-luxury-richBlack/40">
            <IoTSimulator />
          </div>

          {/* EHR Records */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h2 className="text-sm font-extrabold uppercase tracking-wider mb-4 flex items-center gap-2 text-zinc-300"><FileText size={16} className="text-luxury-goldRoyal" /> Clinical Timeline & Records</h2>
            <div className="space-y-4 border-l border-zinc-800 pl-4 ml-2">
              {patient.history.map((record, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-1.5 h-1.5 rounded-full bg-luxury-goldRoyal" />
                  <p className="text-[10px] text-zinc-500 font-mono">{record.date}</p>
                  <h4 className="text-xs font-bold text-white mt-0.5">{record.diagnosis}</h4>
                  <p className="text-[10px] text-zinc-400">Attending Physician: {record.doctor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts, Matching Queue, Prescriptions */}
        <div className="space-y-6">
          
          {/* Active Emergency alerts banner */}
          {activeAlerts.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-luxury-redCrimson/30 bg-luxury-redCrimson/5 animate-pulse">
              <h3 className="text-xs font-bold text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle size={14} /> Active Emergency Alert
              </h3>
              <div className="mt-3 space-y-2">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-luxury-pureBlack border border-luxury-redCrimson/20 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">Vitals Breach: {alert.metric}</p>
                      <p className="text-[9px] text-zinc-500">Triggered: {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-luxury-redCrimson/25 text-luxury-redCrimson border border-luxury-redCrimson/30 rounded font-mono font-bold">{alert.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Telemedicine & Smart Matching Engine */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2"><Calendar size={16} className="text-luxury-blueElectric" /> Telehealth consultations</h3>
              <button 
                onClick={() => setShowMatchingModal(true)}
                className="px-2.5 py-1 bg-luxury-blueElectric/20 hover:bg-luxury-blueElectric/30 text-luxury-blueElectric rounded-lg text-[9px] font-bold uppercase tracking-wider border border-luxury-blueElectric/30 transition-colors flex items-center gap-1"
              >
                <Plus size={10} /> Smart Match
              </button>
            </div>

            <div className="space-y-3">
              {db.appointments.filter(a => a.patientId === patientId).length === 0 ? (
                <p className="text-[10px] text-zinc-500 text-center py-4">No scheduled video rooms</p>
              ) : (
                db.appointments.filter(a => a.patientId === patientId).map((apt) => (
                  <div key={apt.id} className="p-3.5 bg-luxury-pureBlack rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-white">{apt.doctorName}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{apt.date} • {apt.time}</p>
                      {apt.status === "waiting_queue" ? (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase">Matching queue</span>
                      ) : (
                        <p className="text-[9px] text-zinc-400 mt-1.5 italic">"{apt.reason}"</p>
                      )}
                    </div>
                    {apt.status !== "waiting_queue" && (
                      <Link 
                        href="/consultation" 
                        className="px-2.5 py-1.5 bg-luxury-greenEmerald/20 hover:bg-luxury-greenEmerald/30 text-luxury-greenEmerald border border-luxury-greenEmerald/30 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all"
                      >
                        Join Call
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Prescriptions */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2"><FileText size={16} className="text-luxury-goldRoyal" /> Active Prescriptions</h3>
            
            <div className="space-y-4">
              {db.prescriptions.filter(p => p.patientId === patientId).map((pres) => (
                <div key={pres.id} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900">
                  <div className="flex justify-between items-start mb-2 border-b border-zinc-900 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">{pres.doctorName}</h4>
                      <p className="text-[9px] text-zinc-500 font-mono">{pres.date}</p>
                    </div>
                    <button className="text-[9px] px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white transition-colors uppercase font-mono font-semibold">
                      PDF
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-3">
                    {pres.medicines.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{med.name} <span className="text-[10px] text-zinc-500 font-normal">({med.dosage})</span></span>
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-400 font-semibold">{med.frequency} x {med.duration}</p>
                          {med.instructions && (
                            <span className="text-[8px] text-luxury-goldRoyal font-bold font-mono uppercase bg-luxury-goldRoyal/5 border border-luxury-goldRoyal/10 px-1 py-0.5 rounded">{med.instructions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {pres.notes && (
                    <p className="text-[10px] text-zinc-500 italic mt-3 pt-2 border-t border-zinc-900">"{pres.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Family Authorization */}
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2"><Users size={16} className="text-luxury-goldRoyal" /> Authorized Family</h3>
            <div className="space-y-3">
              {patient.familyMembers.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-luxury-pureBlack rounded-xl border border-zinc-900 text-xs">
                  <div>
                    <p className="font-bold text-white">{member.name}</p>
                    <p className="text-[9px] text-zinc-500">{member.relation} • {member.email}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/25 rounded-full font-mono text-[9px] uppercase font-bold">ALERTS ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Smart matching booking Modal */}
      {showMatchingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-2xl border border-luxury-goldRoyal/20 w-full max-w-md text-white bg-luxury-richBlack animate-glow-gold">
            <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-zinc-800">
              <Stethoscope className="text-luxury-blueElectric" size={20} />
              <h3 className="text-base font-bold tracking-wide uppercase">AI Smart Match Engine</h3>
            </div>
            
            {!matchedDoctor ? (
              <form onSubmit={handleSmartMatch} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-1">Select Specialty Needed</label>
                  <select 
                    value={specialtyNeeded}
                    onChange={(e) => setSpecialtyNeeded(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg focus:outline-none text-zinc-200"
                  >
                    <option value="Cardiology">Cardiology (Heart/Vitals)</option>
                    <option value="ICU / Emergency Medicine">ICU / Emergency Medicine (Critical Care)</option>
                    <option value="Pulmonology">Pulmonology (Lungs/SpO2)</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-1">Chief medical complaint</label>
                  <textarea 
                    rows={3}
                    value={matchingReason}
                    onChange={(e) => setMatchingReason(e.target.value)}
                    placeholder="Describe your current status or symptom check logs..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg focus:outline-none placeholder-zinc-700 text-white"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowMatchingModal(false)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isMatching}
                    className="px-5 py-2 bg-luxury-blueElectric text-luxury-pureBlack rounded-lg text-xs font-bold uppercase tracking-wider transition-colors hover:bg-luxury-blueElectric/90"
                  >
                    {isMatching ? "RUNNING MATCH..." : "REQUEST ASSIGNMENT"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-luxury-greenEmerald/15 text-luxury-greenEmerald flex items-center justify-center mx-auto border border-luxury-greenEmerald/30">
                  <ShieldCheck size={32} />
                </div>
                
                <div>
                  <h4 className="font-extrabold text-sm text-white">DOCTOR SUCCESSFULLY MATCHED</h4>
                  <p className="text-xs text-zinc-400 mt-2">The clinical algorithm has routed you to our available clinician:</p>
                </div>

                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 text-left text-xs space-y-1">
                  <p className="font-bold text-white text-sm">{matchedDoctor.name}</p>
                  <p className="text-luxury-goldRoyal font-semibold">{matchedDoctor.specialty} Specialist</p>
                  <p className="text-zinc-500 font-mono text-[9px] pt-1">Availability: Available • Workload: Low</p>
                </div>

                <button
                  onClick={() => {
                    setMatchedDoctor(null);
                    setShowMatchingModal(false);
                  }}
                  className="px-6 py-2.5 bg-luxury-goldRoyal text-luxury-pureBlack rounded-lg text-xs font-extrabold uppercase tracking-wider"
                >
                  Go to Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
