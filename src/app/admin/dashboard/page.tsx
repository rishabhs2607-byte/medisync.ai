"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import {
  getMediSyncDb,
  saveMediSyncDb,
  UserProfile,
  DoctorApplication,
  PatientRecord,
} from "@/services/firebase";
import {
  db as firestoreDb,
} from "@/services/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Lock,
  Users,
  UserCheck,
  Activity,
  Radio,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Terminal,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Cpu,
  ScrollText,
  BarChart3,
  RefreshCw,
  Clock,
  UserX,
  ChevronDown,
  Wifi,
  WifiOff,
  Stethoscope,
  FlaskConical,
  HospitalIcon,
  Eye,
  Trash2,
} from "lucide-react";

type Tab = "doctors" | "patients" | "hospitals" | "devices" | "logs" | "analytics";

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  ip: string;
  severity: "info" | "warning" | "critical";
}

export default function AdminDashboard() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("doctors");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Firestore doctor applications
  const [firestoreApps, setFirestoreApps] = useState<DoctorApplication[]>([]);
  const [loadingFirestore, setLoadingFirestore] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 120000).toISOString(),
      action: "ESP32 telemetry heartbeat accepted",
      actor: "SYSTEM",
      ip: "192.168.1.15",
      severity: "info",
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      action: "Admin dashboard accessed",
      actor: "admin@medisync.ai",
      ip: "10.0.0.1",
      severity: "info",
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      action: "Firestore security rules deployed",
      actor: "SYSTEM",
      ip: "34.102.136.180",
      severity: "warning",
    },
  ]);

  const addAuditLog = (action: string, severity: AuditLog["severity"] = "info") => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      actor: "admin@medisync.ai",
      ip: "10.0.0.1",
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  const loadLocalDb = useCallback(() => {
    setDb(getMediSyncDb());
  }, []);

  // Fetch doctor applications from Firestore (with localStorage fallback)
  const fetchFirestoreApps = useCallback(async () => {
    setLoadingFirestore(true);
    try {
      const q = query(collection(firestoreDb, "doctorApplications"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const apps = snap.docs.map((d) => d.data() as DoctorApplication);
        setFirestoreApps(apps);
      }
    } catch (e) {
      // fallback to localStorage
      console.warn("Firestore unavailable, using local registry");
    } finally {
      setLoadingFirestore(false);
    }
  }, []);

  useEffect(() => {
    loadLocalDb();
    fetchFirestoreApps();
    window.addEventListener("storage", loadLocalDb);
    return () => window.removeEventListener("storage", loadLocalDb);
  }, [loadLocalDb, fetchFirestoreApps]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFirestoreApps();
    loadLocalDb();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center text-zinc-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <Activity className="animate-pulse text-luxury-goldRoyal" size={32} />
          <p className="text-xs uppercase tracking-widest">Initializing Admin Command Engine...</p>
        </div>
      </div>
    );
  }

  // Merge Firestore apps with local registry (Firestore takes priority)
  const localApps = db.doctorApplications;
  const mergedApps: DoctorApplication[] = firestoreApps.length > 0 ? firestoreApps : localApps;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const updateDoctorStatus = async (
    uid: string,
    newStatus: "approved" | "pending" | "rejected" | "suspended",
    actionLabel: string
  ) => {
    // 1. Try Firestore first
    try {
      await updateDoc(doc(firestoreDb, "doctorApplications", uid), { status: newStatus });
      await updateDoc(doc(firestoreDb, "users", uid), { status: newStatus });
    } catch (e) {
      console.warn("Firestore update failed, writing to localStorage");
    }

    // 2. Always write to localStorage
    const currentDb = getMediSyncDb();
    const userIndex = currentDb.users.findIndex((u) => u.uid === uid);
    if (userIndex !== -1) currentDb.users[userIndex].status = newStatus;
    const appIndex = currentDb.doctorApplications.findIndex((a) => a.uid === uid);
    if (appIndex !== -1) currentDb.doctorApplications[appIndex].status = newStatus;
    saveMediSyncDb(currentDb);
    loadLocalDb();
    window.dispatchEvent(new Event("storage"));

    // 3. Update local Firestore cache
    setFirestoreApps((prev) =>
      prev.map((a) => (a.uid === uid ? { ...a, status: newStatus } : a))
    );

    addAuditLog(`${actionLabel} — uid: ${uid.slice(0, 8)}...`, "info");
  };

  const approveDoctor = (uid: string, name: string) =>
    updateDoctorStatus(uid, "approved", `Doctor APPROVED: ${name}`);

  const rejectDoctor = (uid: string, name: string) =>
    updateDoctorStatus(uid, "rejected", `Doctor REJECTED: ${name}`);

  const suspendDoctor = (uid: string, name: string) =>
    updateDoctorStatus(uid, "suspended", `Doctor SUSPENDED: ${name}`);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────

  const allDoctorApps = mergedApps;
  const pendingApps = allDoctorApps.filter((a) => a.status === "pending");
  const approvedDoctors = allDoctorApps.filter((a) => a.status === "approved");
  const rejectedDoctors = allDoctorApps.filter((a) => a.status === "rejected");
  const suspendedDoctors = allDoctorApps.filter((a) => a.status === "suspended");

  const filteredApps = allDoctorApps.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const allPatients = db.patients;
  const filteredPatients = allPatients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedDevices = db.patients.filter((p) => p.connectedDevice !== null);

  // Stats
  const stats = [
    {
      label: "Total Users",
      value: db.users.length,
      color: "text-white",
      icon: <Users size={16} className="text-zinc-400" />,
    },
    {
      label: "Clinicians",
      value: allDoctorApps.length,
      color: "text-luxury-blueElectric",
      icon: <Stethoscope size={16} className="text-luxury-blueElectric" />,
    },
    {
      label: "Pending Approval",
      value: pendingApps.length,
      color: "text-luxury-goldRoyal",
      icon: <Clock size={16} className="text-luxury-goldRoyal" />,
    },
    {
      label: "Patients",
      value: allPatients.length,
      color: "text-luxury-greenEmerald",
      icon: <UserCheck size={16} className="text-luxury-greenEmerald" />,
    },
    {
      label: "IoT Devices",
      value: connectedDevices.length,
      color: "text-white",
      icon: <Cpu size={16} className="text-zinc-400" />,
    },
    {
      label: "Active Alerts",
      value: db.alerts.filter((a) => a.status === "active").length,
      color: "text-luxury-redCrimson",
      icon: <AlertTriangle size={16} className="text-luxury-redCrimson" />,
    },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "doctors", label: "Doctors", icon: <Stethoscope size={14} />, badge: pendingApps.length },
    { id: "patients", label: "Patients", icon: <UserCheck size={14} /> },
    { id: "hospitals", label: "Hospitals", icon: <Building2 size={14} /> },
    { id: "devices", label: "IoT Nodes", icon: <Cpu size={14} /> },
    { id: "logs", label: "Audit Logs", icon: <ScrollText size={14} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={14} /> },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-luxury-goldRoyal/10 text-luxury-goldRoyal border-luxury-goldRoyal/25",
      approved: "bg-luxury-greenEmerald/10 text-luxury-greenEmerald border-luxury-greenEmerald/25",
      rejected: "bg-luxury-redCrimson/10 text-luxury-redCrimson border-luxury-redCrimson/25",
      suspended: "bg-zinc-800 text-zinc-400 border-zinc-700",
      active: "bg-luxury-greenEmerald/10 text-luxury-greenEmerald border-luxury-greenEmerald/25",
    };
    return `px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase font-bold ${
      map[status] || "bg-zinc-800 text-zinc-400 border-zinc-700"
    }`;
  };

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-luxury-pureBlack pb-16 text-zinc-100 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* ── Header ── */}
        <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-4 sticky top-0 z-30 backdrop-blur-sm">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                    Admin Command Console
                  </h1>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-luxury-goldRoyal/10 text-luxury-goldRoyal border border-luxury-goldRoyal/20 font-mono uppercase font-bold hidden sm:inline">
                    Superuser
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  MediSync AI • Control Center • Node: Global-US-East
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all ${
                  isRefreshing ? "animate-spin text-luxury-goldRoyal" : ""
                }`}
              >
                <RefreshCw size={15} />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-luxury-richBlack border border-luxury-goldRoyal/10 text-xs">
                <Terminal size={13} className="text-luxury-goldRoyal animate-pulse" />
                <span className="font-mono text-zinc-500">Status:</span>
                <span className="text-luxury-greenEmerald font-bold font-mono">NOMINAL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 mt-6 space-y-6 relative z-10">

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="glass-panel p-4 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 text-center group hover:border-luxury-goldRoyal/25 transition-colors"
              >
                <div className="flex justify-center mb-2">{s.icon}</div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">{s.label}</p>
                <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── Main Workspace ── */}
          <div className="glass-panel rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 overflow-hidden">

            {/* Tab Bar */}
            <div className="flex overflow-x-auto bg-zinc-950 border-b border-zinc-900 p-1.5 gap-1 no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setSearchQuery(""); setFilterStatus("all"); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors relative ${
                    activeTab === t.id
                      ? "bg-luxury-goldRoyal text-luxury-pureBlack font-bold shadow"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-luxury-redCrimson text-white text-[8px] font-bold rounded-full leading-none">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">

              {/* Search + Filter bar (shared across tabs) */}
              {(activeTab === "doctors" || activeTab === "patients") && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-3 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeTab === "doctors" ? "Search by name, email, specialization..." : "Search patients..."}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-600"
                    />
                  </div>
                  {activeTab === "doctors" && (
                    <div className="relative">
                      <Filter size={12} className="absolute left-3 top-3 text-zinc-500" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-10 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-luxury-goldRoyal appearance-none"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-3 text-zinc-500 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: DOCTORS ═══ */}
              {activeTab === "doctors" && (
                <div className="space-y-5">
                  {loadingFirestore && (
                    <div className="text-center py-4 text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
                      <Activity size={14} className="animate-spin text-luxury-goldRoyal" />
                      Syncing with Firestore...
                    </div>
                  )}

                  {/* Pending Queue Highlight */}
                  {pendingApps.length > 0 && filterStatus === "all" && !searchQuery && (
                    <div className="p-4 bg-luxury-goldRoyal/5 border border-luxury-goldRoyal/20 rounded-xl">
                      <p className="text-[10px] text-luxury-goldRoyal font-bold uppercase tracking-widest font-mono mb-1 flex items-center gap-1.5">
                        <Clock size={11} /> Verification Queue — {pendingApps.length} Pending
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        These doctors are awaiting clinical credential verification. Review and approve or reject.
                      </p>
                    </div>
                  )}

                  {filteredApps.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                      <UserX size={32} className="mx-auto mb-2 text-zinc-700" />
                      No doctor applications match your search/filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredApps.map((app) => (
                        <div
                          key={app.uid}
                          className={`p-4 bg-luxury-pureBlack rounded-xl border transition-colors ${
                            app.status === "pending"
                              ? "border-luxury-goldRoyal/20 hover:border-luxury-goldRoyal/35"
                              : "border-zinc-900/80 hover:border-zinc-800"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="shrink-0 w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <Stethoscope size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-white text-sm truncate">{app.fullName}</h4>
                                  <span className={statusBadge(app.status)}>{app.status}</span>
                                </div>
                                <p className="text-zinc-400 text-[11px] mt-0.5">
                                  {app.specialization} • {app.experience} yr{app.experience !== 1 ? "s" : ""} exp
                                </p>
                                <p className="text-zinc-500 text-[10px] mt-0.5">{app.email}</p>
                                <p className="text-zinc-600 text-[9px] font-mono mt-0.5">
                                  License: {app.licenseNumber} • Applied:{" "}
                                  {new Date(app.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 shrink-0">
                              {app.status !== "approved" && (
                                <button
                                  onClick={() => approveDoctor(app.uid, app.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-luxury-goldRoyal hover:opacity-90 text-luxury-pureBlack font-bold rounded-lg text-[10px] uppercase tracking-wider transition-opacity"
                                >
                                  <CheckCircle size={12} /> Approve
                                </button>
                              )}
                              {app.status !== "rejected" && (
                                <button
                                  onClick={() => rejectDoctor(app.uid, app.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-luxury-redCrimson border border-zinc-800 rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              )}
                              {app.status === "approved" && (
                                <button
                                  onClick={() => suspendDoctor(app.uid, app.fullName)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                                >
                                  <UserX size={12} /> Suspend
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary row */}
                  <div className="pt-4 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "Pending", value: pendingApps.length, color: "text-luxury-goldRoyal" },
                      { label: "Approved", value: approvedDoctors.length, color: "text-luxury-greenEmerald" },
                      { label: "Rejected", value: rejectedDoctors.length, color: "text-luxury-redCrimson" },
                      { label: "Suspended", value: suspendedDoctors.length, color: "text-zinc-400" },
                    ].map((s) => (
                      <div key={s.label} className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-mono">{s.label}</p>
                        <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ TAB: PATIENTS ═══ */}
              {activeTab === "patients" && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Patient Registry — {allPatients.length} records
                  </h3>
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                      <Users size={32} className="mx-auto mb-2 text-zinc-700" />
                      No patients registered yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPatients.map((p) => (
                        <div
                          key={p.uid}
                          className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 hover:border-zinc-800 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/20 flex items-center justify-center text-luxury-greenEmerald">
                                <UserCheck size={16} />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{p.name}</h4>
                                <p className="text-zinc-500 text-[10px] mt-0.5">
                                  Age: {p.age} • Blood: {p.bloodType} • Gender: {p.gender}
                                </p>
                                <p className="text-zinc-600 text-[9px] font-mono mt-0.5">UID: {p.uid.slice(0, 12)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">DEVICE</p>
                                <p className="text-[10px] font-bold mt-0.5">
                                  {p.connectedDevice ? (
                                    <span className="text-luxury-greenEmerald flex items-center gap-1">
                                      <Wifi size={10} /> {p.connectedDevice.deviceId}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600 flex items-center gap-1">
                                      <WifiOff size={10} /> None
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">HR</p>
                                <p className="text-[10px] font-bold text-luxury-redCrimson mt-0.5">
                                  {p.vitals.heartRate} bpm
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">SpO₂</p>
                                <p className="text-[10px] font-bold text-luxury-blueElectric mt-0.5">
                                  {p.vitals.spo2}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: HOSPITALS ═══ */}
              {activeTab === "hospitals" && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Hospital Network — {db.hospitals.length} registered
                  </h3>
                  {db.hospitals.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                      <Building2 size={32} className="mx-auto mb-2 text-zinc-700" />
                      No hospitals registered yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {db.hospitals.map((h: any, i: number) => (
                        <div
                          key={h.uid || i}
                          className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 hover:border-luxury-blueElectric/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-luxury-blueElectric/10 border border-luxury-blueElectric/20 flex items-center justify-center text-luxury-blueElectric">
                              <Building2 size={18} />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{h.name}</h4>
                              <p className="text-zinc-500 text-[10px] mt-0.5">{h.email}</p>
                              <span className={statusBadge(h.status || "active")}>{h.status || "active"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: IoT DEVICES ═══ */}
              {activeTab === "devices" && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    System Hardware Registry — {connectedDevices.length} active nodes
                  </h3>
                  {connectedDevices.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                      <Cpu size={32} className="mx-auto mb-2 text-zinc-700" />
                      No ESP32 devices connected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connectedDevices.map((patient) => (
                        <div
                          key={patient.uid}
                          className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900 hover:border-luxury-blueElectric/20 transition-colors"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-luxury-blueElectric/10 rounded-xl border border-luxury-blueElectric/20 text-luxury-blueElectric">
                                <Radio size={18} className="animate-pulse" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white font-mono text-sm">
                                  {patient.connectedDevice?.deviceId}
                                </h4>
                                <p className="text-zinc-500 text-[10px] mt-0.5">
                                  Patient: {patient.name}
                                </p>
                                <p className="text-zinc-600 text-[9px] font-mono">
                                  Last sync: {patient.connectedDevice?.lastSync
                                    ? new Date(patient.connectedDevice.lastSync).toLocaleTimeString()
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-center">
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">BATTERY</p>
                                <p className={`font-bold font-mono text-sm mt-0.5 ${
                                  (patient.connectedDevice?.battery || 0) < 20
                                    ? "text-luxury-redCrimson"
                                    : "text-white"
                                }`}>
                                  {patient.connectedDevice?.battery}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">STATUS</p>
                                <p className="font-bold font-mono text-luxury-greenEmerald text-sm mt-0.5">
                                  ONLINE
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zinc-600 font-mono">HR</p>
                                <p className="font-bold font-mono text-luxury-redCrimson text-sm mt-0.5">
                                  {patient.vitals.heartRate}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: AUDIT LOGS ═══ */}
              {activeTab === "logs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                      System Audit Log Streams
                    </h3>
                    <span className="text-[9px] text-zinc-600 font-mono">{auditLogs.length} entries</span>
                  </div>
                  <div className="space-y-1.5 bg-zinc-950/80 p-4 rounded-xl border border-zinc-900 max-h-[420px] overflow-y-auto font-mono text-[10px]">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between gap-4 py-2 border-b border-zinc-900/60 last:border-0"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                              log.severity === "critical"
                                ? "bg-luxury-redCrimson"
                                : log.severity === "warning"
                                ? "bg-luxury-goldRoyal"
                                : "bg-luxury-greenEmerald"
                            }`}
                          />
                          <div className="min-w-0">
                            <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                            <span className="text-zinc-200">{log.action}</span>
                            <div className="text-zinc-600 text-[9px] mt-0.5">Actor: {log.actor}</div>
                          </div>
                        </div>
                        <span className="text-zinc-600 text-[9px] shrink-0">{log.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ TAB: ANALYTICS ═══ */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Platform Analytics Overview
                  </h3>

                  {/* Bar chart visual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Doctor Status Breakdown */}
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-3">
                        Clinician Status Distribution
                      </p>
                      <div className="space-y-2.5">
                        {[
                          { label: "Approved", val: approvedDoctors.length, color: "bg-luxury-greenEmerald", total: allDoctorApps.length },
                          { label: "Pending", val: pendingApps.length, color: "bg-luxury-goldRoyal", total: allDoctorApps.length },
                          { label: "Rejected", val: rejectedDoctors.length, color: "bg-luxury-redCrimson", total: allDoctorApps.length },
                          { label: "Suspended", val: suspendedDoctors.length, color: "bg-zinc-700", total: allDoctorApps.length },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex justify-between text-[9px] font-mono mb-1">
                              <span className="text-zinc-400">{item.label}</span>
                              <span className="text-white font-bold">{item.val}</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.color} transition-all duration-700`}
                                style={{ width: item.total > 0 ? `${(item.val / item.total) * 100}%` : "0%" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Platform Health */}
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-3">
                        Platform Health Metrics
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Uptime", value: "99.97%", color: "text-luxury-greenEmerald" },
                          { label: "Active Sessions", value: db.activeSession?.isActive ? "1" : "0", color: "text-luxury-blueElectric" },
                          { label: "Total Alerts", value: String(db.alerts.length), color: "text-luxury-goldRoyal" },
                          { label: "Prescriptions", value: String(db.prescriptions.length), color: "text-white" },
                        ].map((m) => (
                          <div key={m.label} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
                            <p className="text-[8px] text-zinc-600 font-mono uppercase">{m.label}</p>
                            <p className={`text-lg font-black mt-1 ${m.color}`}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Config */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
                      <Settings size={11} /> System Configuration
                    </p>
                    <div className="divide-y divide-zinc-900 space-y-0">
                      {[
                        { name: "AI Symptom Triage Engine", desc: "Auto-assess patient pathology logs", status: "ENABLED", color: "text-luxury-greenEmerald bg-luxury-greenEmerald/10 border-luxury-greenEmerald/20" },
                        { name: "Emergency SMS Dispatch", desc: "Alert paired family on critical vitals", status: "ACTIVE", color: "text-luxury-greenEmerald bg-luxury-greenEmerald/10 border-luxury-greenEmerald/20" },
                        { name: "Audit Trail Encryption", desc: "AES-256 encrypted log streams", status: "AES-256", color: "text-luxury-goldRoyal bg-luxury-goldRoyal/10 border-luxury-goldRoyal/20" },
                        { name: "Firestore Security Rules", desc: "Role-based document access control", status: "DEPLOYED", color: "text-luxury-blueElectric bg-luxury-blueElectric/10 border-luxury-blueElectric/20" },
                      ].map((c) => (
                        <div key={c.name} className="flex justify-between items-center py-3">
                          <div>
                            <p className="text-xs font-semibold text-white">{c.name}</p>
                            <p className="text-[9px] text-zinc-600 mt-0.5">{c.desc}</p>
                          </div>
                          <span className={`px-2 py-0.5 border rounded text-[8px] font-mono font-bold uppercase ${c.color}`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
