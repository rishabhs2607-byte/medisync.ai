"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb } from "@/services/firebase";
import { 
  Heart, 
  Activity, 
  Bot, 
  Radio, 
  Users, 
  Building2, 
  Lock, 
  Zap, 
  ChevronRight, 
  CheckCircle,
  Menu,
  X,
  Stethoscope,
  Video
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ patients: 2, doctors: 2, devices: 2, alerts: 1 });
  const [doctorAvailability, setDoctorAvailability] = useState({ available: 0, busy: 0, ic: 0, emergency: 0 });

  useEffect(() => {
    const db = getMediSyncDb();
    const docs = db.users.filter(u => u.role === "doctor" && u.status === "approved");
    setLiveStats({
      patients: db.patients.length,
      doctors: docs.length,
      devices: db.patients.filter(p => p.connectedDevice !== null).length,
      alerts: db.alerts.filter(a => a.status === "active").length
    });

    setDoctorAvailability({
      available: docs.filter(d => d.availability === "Available").length,
      busy: docs.filter(d => d.availability === "Busy").length,
      ic: docs.filter(d => d.availability === "In Consultation").length,
      emergency: docs.filter(d => d.availability === "Emergency Mode").length
    });
  }, []);

  return (
    <div className="relative min-h-screen text-zinc-100 overflow-x-hidden bg-luxury-pureBlack">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Luxury Ambient Lighting Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[40%] bg-luxury-blueMedical/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-luxury-goldRoyal/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-luxury-goldRoyal/10 backdrop-blur-md bg-luxury-pureBlack/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2.5 bg-gradient-to-tr from-luxury-goldRoyal to-luxury-goldMetallic rounded-xl shadow-lg shadow-luxury-goldRoyal/10 border border-luxury-goldRoyal/30">
              <Activity size={22} className="text-luxury-pureBlack group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-xl tracking-wider text-white">
              MEDISYNC <span className="text-luxury-goldRoyal font-medium">AI</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <a href="#features" className="hover:text-luxury-goldRoyal transition-colors">System Features</a>
            <a href="#portals" className="hover:text-luxury-blueElectric transition-colors">Portals</a>
            <a href="#pricing" className="hover:text-luxury-goldRoyal transition-colors">Scale Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="#portals" 
              className="px-5 py-2.5 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-luxury-goldRoyal/10 border border-luxury-goldRoyal/30"
            >
              Enter Dashboard Workspace
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-luxury-goldRoyal/10 px-6 py-6 space-y-4 bg-luxury-richBlack">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-luxury-goldRoyal text-sm font-semibold uppercase">Features</a>
            <a href="#portals" onClick={() => setMobileMenuOpen(false)} className="block text-luxury-blueElectric text-sm font-semibold uppercase">Access Portals</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-luxury-goldRoyal text-sm font-semibold uppercase">Pricing</a>
            <Link 
              href="#portals" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase"
            >
              Launch Portals
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 md:pt-32 pb-24 flex flex-col items-center text-center relative">
        
        {/* Heartbeat Pulse SVG Path Background */}
        <div className="absolute top-24 left-0 right-0 h-44 opacity-25 pointer-events-none flex items-center justify-center">
          <svg className="w-full max-w-5xl h-full text-luxury-goldRoyal" viewBox="0 0 600 100" preserveAspectRatio="none">
            <path
              className="heartbeat-path"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              d="M 0 50 L 150 50 L 170 20 L 180 80 L 190 40 L 200 60 L 210 50 L 350 50 L 370 10 L 380 90 L 390 30 L 400 70 L 410 50 L 600 50"
            />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-950/80 border border-luxury-goldRoyal/20 text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldRoyal mb-8">
          <Zap size={10} /> Startup Hackathon Edition v1.2
        </div>

        <h1 className="text-5xl md:text-8xl font-black tracking-tight max-w-6xl leading-[1.05] text-white">
          Healthcare <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-luxury-softWhite via-luxury-goldRoyal to-luxury-goldMetallic drop-shadow-[0_2px_15px_rgba(212,175,55,0.15)]">
            Without Boundaries
          </span>
        </h1>

        <p className="mt-8 text-base md:text-lg text-zinc-400 max-w-3xl leading-relaxed">
          Real-time Telemedicine, Live Patient Monitoring, AI Health Intelligence and ESP32 Medical Device Integration. 
          A production-level operating system tailored for clinical environments.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <a 
            href="#portals" 
            className="px-8 py-4 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack font-extrabold rounded-xl transition-all flex items-center gap-2 group shadow-xl shadow-luxury-goldRoyal/10 text-sm uppercase tracking-wider"
          >
            Launch Client Modules <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a 
            href="#features" 
            className="px-8 py-4 glass-panel border border-white/5 hover:bg-white/5 text-zinc-300 font-semibold rounded-xl text-sm"
          >
            Read Technical Spec
          </a>
        </div>

        {/* Doctor Availability Live Ribbon */}
        <div className="mt-12 flex flex-wrap justify-center items-center gap-6 px-6 py-3 rounded-2xl bg-zinc-950/85 border border-zinc-900 text-xs">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Clinicians On-Call:</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-luxury-greenEmerald animate-pulse-fast" /> {doctorAvailability.available || 1} Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-luxury-blueMedical" /> {doctorAvailability.ic || 1} In consultation</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-luxury-redCrimson animate-bounce" /> {doctorAvailability.emergency || 0} Emergency Mode</span>
        </div>

        {/* Floating Health Cards Grid Preview */}
        <div className="mt-20 w-full max-w-5xl rounded-3xl border border-luxury-goldRoyal/10 overflow-hidden relative shadow-2xl glass-panel p-2.5 animate-glow-gold">
          <div className="bg-luxury-pureBlack rounded-2xl overflow-hidden aspect-[16/9] flex flex-col p-6 text-left relative">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-luxury-redCrimson" />
                <span className="w-2.5 h-2.5 rounded-full bg-luxury-goldMetallic" />
                <span className="w-2.5 h-2.5 rounded-full bg-luxury-greenEmerald" />
                <span className="text-[10px] text-zinc-500 ml-2 font-mono">vital-telemetry-panel.sh</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                <span className="inline-block w-2 h-2 bg-luxury-blueElectric rounded-full animate-ping" />
                <span className="text-luxury-blueElectric font-bold uppercase tracking-wider font-mono">ESP32 STREAM CONNECTED</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-richBlack/60">
                <p className="text-[10px] text-zinc-500 font-mono">HEART RATE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-luxury-redCrimson animate-heartbeat inline-block">78</span>
                  <span className="text-xs text-zinc-400">BPM</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-richBlack/60">
                <p className="text-[10px] text-zinc-500 font-mono">BLOOD PRESSURE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-luxury-greenEmerald">120/80</span>
                  <span className="text-xs text-zinc-500">mmHg</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-richBlack/60">
                <p className="text-[10px] text-zinc-500 font-mono">OXYGEN LEVEL</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-luxury-blueElectric">98</span>
                  <span className="text-xs text-zinc-400">%</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5 bg-luxury-richBlack/60">
                <p className="text-[10px] text-zinc-500 font-mono">TEMPERATURE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-luxury-goldRoyal">36.7</span>
                  <span className="text-xs text-zinc-400">°C</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <p className="text-xs font-mono text-zinc-500">Telemetry Target: patients/pat1/liveVitals</p>
              <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-2 border border-zinc-900">
                <div className="bg-gradient-to-r from-luxury-goldRoyal to-luxury-blueElectric h-full w-[80%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Stats Count */}
      <section className="bg-luxury-richBlack py-16 border-y border-luxury-goldRoyal/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
          <div>
            <p className="text-4xl md:text-5xl font-black text-luxury-goldRoyal">{liveStats.patients}</p>
            <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold">Active Inpatients</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black text-luxury-blueElectric">{liveStats.doctors}</p>
            <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold">On-Call Doctors</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black text-white">{liveStats.devices}</p>
            <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold">Active IoT Devices</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black text-luxury-redCrimson">{liveStats.alerts}</p>
            <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold">Critical Dispatches</p>
          </div>
        </div>
      </section>

      {/* Portal Gateways */}
      <section id="portals" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">Clinical Workspaces</h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-sm">
            Select your clinical role to launch dashboard workspaces. Real-time alerts and logs synchronize immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Patient */}
          <Link href="/patient/dashboard" className="group glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 hover:border-luxury-goldRoyal/50 hover:bg-luxury-goldRoyal/5 transition-all duration-300 flex flex-col justify-between min-h-[260px] hover:shadow-xl hover:shadow-luxury-goldRoyal/5">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-luxury-goldRoyal/10 text-luxury-goldRoyal flex items-center justify-center mb-6 border border-luxury-goldRoyal/20">
                <Users size={22} />
              </div>
              <h3 className="text-lg font-bold group-hover:text-luxury-goldRoyal transition-colors">Patient Workspace</h3>
              <p className="mt-3 text-zinc-400 text-xs leading-relaxed">
                Log medical reports, input vitals manually, pair your ESP32 cuffs, and initiate matching telehealth consultations.
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldRoyal mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Portal <ChevronRight size={12} />
            </span>
          </Link>

          {/* Doctor */}
          <Link href="/doctor/dashboard" className="group glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 hover:border-luxury-blueMedical/50 hover:bg-luxury-blueMedical/5 transition-all duration-300 flex flex-col justify-between min-h-[260px] hover:shadow-xl hover:shadow-luxury-blueMedical/5">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-luxury-blueMedical/10 text-luxury-blueMedical flex items-center justify-center mb-6 border border-luxury-blueMedical/20">
                <Stethoscope size={22} />
              </div>
              <h3 className="text-lg font-bold group-hover:text-luxury-blueMedical transition-colors">Physician Hub</h3>
              <p className="mt-3 text-zinc-400 text-xs leading-relaxed">
                Monitor live patient telemetry, coordinate doctor-transfers, check AI diagnostic recommendations, and generate prescriptions.
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-blueMedical mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Portal <ChevronRight size={12} />
            </span>
          </Link>

          {/* Hospital */}
          <Link href="/hospital/dashboard" className="group glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 hover:border-luxury-greenEmerald/50 hover:bg-luxury-greenEmerald/5 transition-all duration-300 flex flex-col justify-between min-h-[260px] hover:shadow-xl hover:shadow-luxury-greenEmerald/5">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-luxury-greenEmerald/10 text-luxury-greenEmerald flex items-center justify-center mb-6 border border-luxury-greenEmerald/20">
                <Building2 size={22} />
              </div>
              <h3 className="text-lg font-bold group-hover:text-luxury-greenEmerald transition-colors">Hospital ERP</h3>
              <p className="mt-3 text-zinc-400 text-xs leading-relaxed">
                Observe ICU bed occupancy rates, analyze department rosters, review patient registries, and check system census charts.
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-greenEmerald mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Portal <ChevronRight size={12} />
            </span>
          </Link>

          {/* Admin */}
          <Link href="/admin/dashboard" className="group glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 hover:border-luxury-goldMetallic/50 hover:bg-luxury-goldMetallic/5 transition-all duration-300 flex flex-col justify-between min-h-[260px] hover:shadow-xl hover:shadow-luxury-goldMetallic/5">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-luxury-goldMetallic/10 text-luxury-goldMetallic flex items-center justify-center mb-6 border border-luxury-goldMetallic/20">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold group-hover:text-luxury-goldMetallic transition-colors">Admin Command</h3>
              <p className="mt-3 text-zinc-400 text-xs leading-relaxed">
                Manage doctor approval workflows, inspect system audit logs, check registered hardware MAC addresses, and toggle global configurations.
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldMetallic mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Console <ChevronRight size={12} />
            </span>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-luxury-richBlack/40 border-t border-luxury-goldRoyal/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black">Clinical System Integrity</h2>
            <p className="mt-4 text-zinc-400 text-sm max-w-xl mx-auto">Designed for real-world hospitals and elderly care environments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-pureBlack/60">
              <Radio className="text-luxury-blueElectric mb-6" size={32} />
              <h3 className="text-base font-bold">Continuous Telemetry</h3>
              <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                Auto-streams Heart Rate, SpO2, Temp, BP, and glucose every second. Features offline SPIFFS flash storage synchronization.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-pureBlack/60">
              <Bot className="text-luxury-goldRoyal mb-6" size={32} />
              <h3 className="text-base font-bold">AI Diagnostic Engine</h3>
              <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                Parses multi-sensor streams to calculate diagnostic probability indices, severity markers, and department referrals.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-pureBlack/60">
              <Video className="text-luxury-greenEmerald mb-6" size={32} />
              <h3 className="text-base font-bold">HD WebRTC Rooms</h3>
              <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                Telehealth consultation channels equipped with session state recovery triggers, live chat, and audio-to-text summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black">Scalable Plans</h2>
          <p className="mt-4 text-zinc-400 text-sm">Flexible developer and enterprise subscriptions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-zinc-300">Sandbox Sandbox</h4>
              <p className="text-[10px] text-zinc-500 mt-1">For custom ESP32 developers</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-xs text-zinc-500"> / forever</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> 1 Connected Device Node</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> Basic REST / MQTT Access</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> Patient Dashboard access</li>
              </ul>
            </div>
            <a href="#portals" className="mt-8 block text-center py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors">
              Get Started
            </a>
          </div>

          {/* Clinical Suite */}
          <div className="glass-panel p-8 rounded-3xl border-2 border-luxury-goldRoyal/30 bg-luxury-richBlack/60 flex flex-col justify-between relative shadow-xl shadow-luxury-goldRoyal/5">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-luxury-goldRoyal text-luxury-pureBlack text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-luxury-goldRoyal/30">
              Clinical Standard
            </div>
            <div>
              <h4 className="text-base font-bold text-luxury-goldRoyal">Clinical Suite</h4>
              <p className="text-[10px] text-zinc-400 mt-1">For medical clinics and care homes</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">$149</span>
                <span className="text-xs text-zinc-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> Up to 50 IoT nodes active</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> Complete Physician Hub</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> Automated AI Prescriptions</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-goldRoyal" /> WebRTC Telehealth rooms</li>
              </ul>
            </div>
            <a href="#portals" className="mt-8 block text-center py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase transition-transform hover:scale-[1.02]">
              Deploy Now
            </a>
          </div>

          {/* Hospital Enterprise */}
          <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/40 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-zinc-350">Enterprise Roster</h4>
              <p className="text-[10px] text-zinc-500 mt-1">For regional hospital networks</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">$899</span>
                <span className="text-sm text-zinc-500"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-400">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-blueElectric" /> Unlimited patient nodes</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-blueElectric" /> Custom ESP32 OTA controls</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-luxury-blueElectric" /> Hospital ERP integration</li>
              </ul>
            </div>
            <a href="#portals" className="mt-8 block text-center py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors">
              Request Enterprise
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 max-w-3xl mx-auto px-6">
        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-luxury-goldRoyal/15 bg-luxury-richBlack/40">
          <h3 className="text-2xl font-bold text-center">Contact Integrations Roster</h3>
          <p className="text-xs text-zinc-500 text-center mt-2">Scale MediSync AI for clinical or regional health systems</p>

          <form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" placeholder="Full Name" 
                className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-4 py-3 text-xs w-full text-white focus:outline-none focus:border-luxury-goldRoyal"
              />
              <input 
                type="email" placeholder="Clinical Work Email" 
                className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-4 py-3 text-xs w-full text-white focus:outline-none focus:border-luxury-goldRoyal"
              />
            </div>
            <textarea 
              rows={4} placeholder="Describe clinical requirements or hardware specifications..." 
              className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-4 py-3 text-xs w-full text-white focus:outline-none focus:border-luxury-goldRoyal"
            />
            <button className="w-full py-3 bg-luxury-goldRoyal hover:bg-luxury-goldRoyal/90 text-luxury-pureBlack font-bold rounded-xl text-xs uppercase transition-colors">
              Submit Spec Request
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/80 py-12 text-center text-xs text-zinc-500 bg-luxury-pureBlack">
        <p>© 2026 MediSync AI. Designed for hospitals, clinics, and smart care systems.</p>
        <p className="mt-2 font-mono text-[9px]">Production-Ready Build v1.2.0 • Firebase Mode Active</p>
      </footer>
    </div>
  );
}
