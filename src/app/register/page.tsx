"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Activity, ShieldAlert, User, Mail, Lock, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "doctor" | "hospital">("patient");
  
  // Doctor/Hospital specific fields
  const [license, setLicense] = useState("");
  const [affiliation, setAffiliation] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const additionalFields: any = {};
      if (role === "doctor") {
        additionalFields.licenseNumber = license || `LIC-${Math.floor(Math.random() * 90000) + 10000}-A`;
        additionalFields.hospitalAffiliation = affiliation || "Independent Clinic";
        additionalFields.specialty = "General Medicine";
        additionalFields.workload = 0;
        additionalFields.availability = "Available";
      }

      await register(email, password, name, role, additionalFields);
      setSuccess(true);
      
      setTimeout(() => {
        if (role === "doctor") {
          // Doctors need admin verification, so route back to login showing status details
          router.push("/login");
        } else {
          router.push("/patient/dashboard");
        }
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Verify credentials format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Glow Orbs */}
      <div className="absolute top-[20%] left-[20%] w-[35%] h-[35%] bg-luxury-blueMedical/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[35%] h-[35%] bg-luxury-goldRoyal/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="p-2 bg-gradient-to-tr from-luxury-goldRoyal to-luxury-goldMetallic rounded-xl border border-luxury-goldRoyal/20">
              <Activity size={20} className="text-luxury-pureBlack group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-base tracking-wider text-white">
              MEDISYNC <span className="text-luxury-goldRoyal font-medium">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold tracking-wide uppercase text-white">Register Clinical Profile</h2>
          <p className="text-xs text-zinc-550 mt-1">Enroll your account in the MediSync Health network</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 shadow-2xl animate-glow-gold">
          
          {errorMsg && (
            <div className="p-3.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson text-xs flex items-start gap-1.5 mb-4 animate-shake">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/30 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>
              <h4 className="font-bold text-sm text-white uppercase tracking-wider">REGISTRATION SUCCESSFUL</h4>
              <p className="text-xs text-zinc-400">
                {role === "doctor"
                  ? "Your credentials have been submitted for clinical verification review."
                  : "Syncing your patient portal dashboard..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. James Anderson"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <User size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Ecosystem Role</label>
                <select
                  value={role} onChange={(e: any) => setRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none text-zinc-350 focus:border-luxury-goldRoyal"
                >
                  <option value="patient">Patient Portal</option>
                  <option value="doctor">Physician Specialist (Doctor)</option>
                  <option value="hospital">Hospital ERP Manager</option>
                </select>
              </div>

              {/* Doctor inputs */}
              {role === "doctor" && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-3 animate-fadeIn">
                  <p className="text-[8px] text-luxury-goldRoyal font-bold uppercase tracking-widest font-mono">Clinician Verification Details</p>
                  
                  <div>
                    <label className="block text-[8px] text-zinc-500 uppercase mb-1">Medical License ID</label>
                    <input
                      type="text" required value={license} onChange={(e) => setLicense(e.target.value)}
                      placeholder="e.g. LIC-99402-A"
                      className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-750"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] text-zinc-500 uppercase mb-1">Hospital Affiliation</label>
                    <input
                      type="text" required value={affiliation} onChange={(e) => setAffiliation(e.target.value)}
                      placeholder="e.g. Mayo Clinic"
                      className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-750"
                    />
                  </div>

                  <p className="text-[9px] text-zinc-500 leading-relaxed italic">
                    *Upon registration, your status will set to applied. Access to patient records remains blocked until verified by admin console.
                  </p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] border border-luxury-goldRoyal/30"
              >
                {loading ? "REGISTERING PROFILE..." : "Sign Up"} <ArrowRight size={14} />
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[10px] text-zinc-500">
            Already registered? <Link href="/login" className="text-luxury-goldRoyal hover:underline font-semibold">Sign In</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
