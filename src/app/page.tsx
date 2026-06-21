"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb } from "@/services/firebase";
import { 
  Heart, 
  Shield, 
  Activity, 
  Bot, 
  Radio, 
  PhoneCall, 
  Users, 
  Building2, 
  Lock, 
  Zap, 
  ChevronRight, 
  CheckCircle,
  Menu,
  X
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ patients: 2, doctors: 2, devices: 2, alerts: 1 });

  // Load stats from Mock Firebase Database on mount
  useEffect(() => {
    const db = getMediSyncDb();
    setLiveStats({
      patients: db.patients.length,
      doctors: db.users.filter(u => u.role === "doctor").length,
      devices: db.patients.filter(p => p.connectedDevice !== null).length,
      alerts: db.alerts.filter(a => a.status === "active").length
    });
  }, []);

  return (
    <div className="relative min-h-screen text-zinc-100 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-xl shadow-lg shadow-violet-600/25">
              <Activity size={24} className="text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-2xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              MEDISYNC <span className="text-cyan-400 font-medium">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#about" className="hover:text-white transition-colors">Mission</a>
            <a href="#portals" className="hover:text-cyan-400 transition-colors font-semibold">Access Portals</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="#portals" 
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-violet-600/20"
            >
              Enter Workspace
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel-heavy border-b border-white/10 px-6 py-6 space-y-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-white text-base">Features</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-white text-base">About</a>
            <a href="#portals" onClick={() => setMobileMenuOpen(false)} className="block text-cyan-400 font-semibold text-base">Portals</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-white text-base">Pricing</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-zinc-300 hover:text-white text-base">Contact</a>
            <Link 
              href="#portals" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-3 bg-primary text-white font-bold rounded-xl"
            >
              Launch Portal
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-28 pb-16 flex flex-col items-center text-center relative">
        {/* Banner Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-cyan-400 mb-6 animate-bounce">
          <Zap size={12} /> Next-Gen Healthcare Operating System
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight md:leading-none">
          Deploy Intelligence. <br className="hidden md:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">
            Sync Live Vitals. Save Lives.
          </span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed">
          MediSync AI is a startup-ready digital healthcare operating system linking clinical telemedicine, 
          continuous IoT telemetry, AI Diagnostics, and automated Emergency Dispatch.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <a 
            href="#portals" 
            className="px-8 py-4 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-xl transition-all flex items-center gap-2 group shadow-xl hover:shadow-white/5"
          >
            Launch Core Portals <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a 
            href="#features" 
            className="px-8 py-4 glass-panel border border-white/10 hover:bg-white/5 text-white font-semibold rounded-xl transition-all"
          >
            Explore System Architecture
          </a>
        </div>

        {/* Floating IoT Dash preview card */}
        <div className="mt-16 w-full max-w-5xl rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl glass-panel p-2">
          <div className="bg-zinc-950/80 rounded-xl overflow-hidden aspect-[16/9] flex flex-col p-6 text-left relative">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-500 ml-2 font-mono">live-patient-monitor.sh</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-emerald-400 font-semibold uppercase tracking-wider">Device Stream Active</span>
              </div>
            </div>

            {/* Quick Demo grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <p className="text-xs text-zinc-500 font-mono">HEART RATE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-red-400">76</span>
                  <span className="text-xs text-zinc-400">BPM</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <p className="text-xs text-zinc-500 font-mono">BLOOD PRESSURE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-400">120/80</span>
                  <span className="text-xs text-zinc-400">mmHg</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <p className="text-xs text-zinc-500 font-mono">OXYGEN LEVEL</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-cyan-400">98</span>
                  <span className="text-xs text-zinc-400">%</span>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <p className="text-xs text-zinc-500 font-mono">TEMPERATURE</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-orange-400">36.6</span>
                  <span className="text-xs text-zinc-400">°C</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <p className="text-sm font-mono text-zinc-500">Connected: ESP32 IoT Transmitter (Device MS-ESP32-098X)</p>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-gradient-to-r from-violet-600 to-cyan-500 h-full w-[80%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time State Statistics */}
      <section className="bg-zinc-950 py-16 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-violet-400">{liveStats.patients}</p>
            <p className="mt-2 text-sm text-zinc-400 uppercase tracking-widest font-semibold">Active Patients</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-cyan-400">{liveStats.doctors}</p>
            <p className="mt-2 text-sm text-zinc-400 uppercase tracking-widest font-semibold">Approved Doctors</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-emerald-400">{liveStats.devices}</p>
            <p className="mt-2 text-sm text-zinc-400 uppercase tracking-widest font-semibold">Connected IoT Nodes</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-extrabold text-red-500">{liveStats.alerts}</p>
            <p className="mt-2 text-sm text-zinc-400 uppercase tracking-widest font-semibold">Emergency Cases Triggered</p>
          </div>
        </div>
      </section>

      {/* Role-Based Portal Gateway (CRITICAL STEP FOR DEMOS) */}
      <section id="portals" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Access Role workspaces</h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            Log directly into any clinical module. State updates are shared locally via mock Firebase database synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Patient Portal Card */}
          <Link href="/patient/dashboard" className="group glass-panel p-8 rounded-2xl border border-white/5 hover:border-violet-500/50 hover:bg-violet-950/5 transition-all duration-300 flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold group-hover:text-violet-400 transition-colors">Patient Portal</h3>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                Connect your IoT hardware, check medical history, book telemedicine consultations, and see live telemetry.
              </p>
            </div>
            <span className="text-xs font-semibold text-violet-400 mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Enter Dashboard <ChevronRight size={14} />
            </span>
          </Link>

          {/* Doctor Portal Card */}
          <Link href="/doctor/dashboard" className="group glass-panel p-8 rounded-2xl border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-950/5 transition-all duration-300 flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-bold group-hover:text-cyan-400 transition-colors">Doctor Portal</h3>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                Monitor vitals in real time, draft clinical prescriptions, handle emergencies, and manage waiting consultation queues.
              </p>
            </div>
            <span className="text-xs font-semibold text-cyan-400 mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Enter Dashboard <ChevronRight size={14} />
            </span>
          </Link>

          {/* Hospital Management Card */}
          <Link href="/hospital/dashboard" className="group glass-panel p-8 rounded-2xl border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-950/5 transition-all duration-300 flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <Building2 size={24} />
              </div>
              <h3 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">Hospital Portal</h3>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                Control clinical departments, oversee personnel records, coordinate on-call rosters, and trace hospital analytics.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Enter Dashboard <ChevronRight size={14} />
            </span>
          </Link>

          {/* Admin Command Console */}
          <Link href="/admin/dashboard" className="group glass-panel p-8 rounded-2xl border border-white/5 hover:border-amber-500/50 hover:bg-amber-950/5 transition-all duration-300 flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold group-hover:text-amber-400 transition-colors">Admin Console</h3>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                Approve licenses in the physician verification pool, adjust configurations, inspect security logs, and check revenue.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-400 mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Enter Console <ChevronRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-zinc-950/60 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold">System Features & Modules</h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">Engineered to outperform legacy clinic systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl border border-white/5">
              <Radio className="text-cyan-400 mb-6" size={32} />
              <h3 className="text-lg font-bold">IoT Telemetry</h3>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                Plug-and-play support for ESP32 boards tracking Heart Rate, SpO2, Temp, ECG, and falls with automatic local buffers.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/5">
              <Bot className="text-violet-400 mb-6" size={32} />
              <h3 className="text-lg font-bold">AI Diagnostic Engine</h3>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                Clinical assessment protocols generating health scores, predicting pathologies from symptom arrays, and writing summaries.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/5">
              <Shield className="text-red-400 mb-6" size={32} />
              <h3 className="text-lg font-bold">Emergency Alert Engine</h3>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                Auto-evaluates vitals and instantly coordinates 911 dispatch, alerts doctor hubs, and sends SMS alerts to family.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About & Mission Section */}
      <section id="about" className="py-24 max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-xs uppercase tracking-widest font-extrabold text-primary">Our Mission</h2>
        <h3 className="text-3xl md:text-5xl font-bold mt-4 leading-tight">
          Providing Intelligent, Affordable Healthcare Anywhere on Earth.
        </h3>
        <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
          MediSync AI bridges rural health and emergency responsiveness. By combining lightweight, power-efficient IoT firmware 
          with next-generation digital EHR frameworks, patients can rest assured knowing their health status is monitored in real-time by clinical teams.
        </p>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-zinc-950/60 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">Flexible Plans for Every Scale</h2>
            <p className="mt-4 text-zinc-400">Scale telemetry capability from custom setups to enterprise systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold">Developer Sandbox</h4>
                <p className="text-xs text-zinc-500 mt-1">For custom ESP32 developers</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-sm text-zinc-500"> / forever</span>
                </div>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> 1 Connected Device Node</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> Basic REST / MQTT Broker access</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> Standard Patient Portal</li>
                </ul>
              </div>
              <a href="#portals" className="mt-8 block text-center py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors">
                Get Started
              </a>
            </div>

            {/* Clinic Plan */}
            <div className="glass-panel p-8 rounded-2xl border-2 border-violet-500/30 flex flex-col justify-between relative shadow-xl shadow-violet-500/5">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-violet-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div>
                <h4 className="text-lg font-bold text-violet-400">Clinical Suite</h4>
                <p className="text-xs text-zinc-400 mt-1">For medical clinics and care homes</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">$149</span>
                  <span className="text-sm text-zinc-400"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-violet-400" /> Up to 50 IoT nodes active</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-violet-400" /> Complete Doctor Dashboard</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-violet-400" /> Automated AI Prescriptions</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-violet-400" /> Emergency Alert System</li>
                </ul>
              </div>
              <a href="#portals" className="mt-8 block text-center py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl transition-transform hover:scale-[1.02]">
                Deploy Now
              </a>
            </div>

            {/* Hospital Enterprise */}
            <div className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold">Hospital Network</h4>
                <p className="text-xs text-zinc-500 mt-1">For multi-department networks</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">$899</span>
                  <span className="text-sm text-zinc-500"> / month</span>
                </div>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> Unlimited devices & patients</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> Custom ESP32 OTA updates</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> Dedicated Admin Command Hub</li>
                  <li className="flex items-center gap-2"><CheckCircle size={16} className="text-cyan-400" /> HIPAA compliance logs</li>
                </ul>
              </div>
              <a href="#portals" className="mt-8 block text-center py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors">
                Contact Enterprise
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 max-w-3xl mx-auto px-6">
        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5">
          <h3 className="text-2xl md:text-3xl font-bold text-center">Contact MediSync AI</h3>
          <p className="text-sm text-zinc-400 text-center mt-2">Get in touch with clinical systems integration developers</p>

          <form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Full Name" 
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:border-primary"
              />
              <input 
                type="email" 
                placeholder="Work Email" 
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:border-primary"
              />
            </div>
            <textarea 
              rows={4} 
              placeholder="Clinical or hardware details of your project..." 
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:border-primary"
            />
            <button className="w-full py-3 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-100 transition-colors">
              Submit Request
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 text-center text-xs text-zinc-500">
        <p>© 2026 MediSync AI. Certified for clinical tele-supervision. All rights reserved.</p>
        <p className="mt-2 font-mono">Build v1.0.4 - Firebase Mock Mode Enabled</p>
      </footer>
    </div>
  );
}
