"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Activity,
  ShieldAlert,
  User,
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Stethoscope,
  Building2,
  ClipboardList,
  BriefcaseMedical,
} from "lucide-react";

const MEDICAL_SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Radiology",
  "Oncology",
  "Psychiatry",
  "Emergency Medicine",
  "Intensive Care / ICU",
  "Endocrinology",
  "Gastroenterology",
  "Pulmonology",
  "Nephrology",
  "Gynecology & Obstetrics",
  "Ophthalmology",
  "ENT (Otolaryngology)",
  "Urology",
  "Anesthesiology",
  "Pathology",
  "Surgery (General)",
  "Plastic Surgery",
  "Infectious Diseases",
  "Rheumatology",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"patient" | "doctor" | "hospital">("patient");

  // Doctor-specific fields
  const [license, setLicense] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [specialization, setSpecialization] = useState("General Medicine");
  const [experience, setExperience] = useState("");

  // Hospital-specific fields
  const [hospitalCity, setHospitalCity] = useState("");
  const [hospitalType, setHospitalType] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const additionalFields: Record<string, any> = {};

      if (role === "doctor") {
        additionalFields.licenseNumber = license.trim() || `LIC-${Math.floor(Math.random() * 90000) + 10000}-A`;
        additionalFields.hospitalAffiliation = affiliation.trim() || "Independent Clinic";
        additionalFields.specialization = specialization;
        additionalFields.specialty = specialization;
        additionalFields.experience = Number(experience) || 0;
        additionalFields.workload = 0;
        additionalFields.availability = "Offline";
      } else if (role === "hospital") {
        additionalFields.city = hospitalCity;
        additionalFields.type = hospitalType;
      }

      await register(email, password, name, role, additionalFields);
      setSuccess(true);

      setTimeout(() => {
        if (role === "doctor") {
          router.push("/login");
        } else if (role === "hospital") {
          router.push("/hospital/dashboard");
        } else {
          router.push("/patient/dashboard");
        }
      }, 2500);
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "This email is already registered. Please sign in instead."
          : err.code === "auth/invalid-email"
          ? "Invalid email address format."
          : err.code === "auth/weak-password"
          ? "Password is too weak. Use at least 6 characters."
          : err.message || "Registration failed. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    patient: {
      icon: <User size={16} className="text-luxury-greenEmerald" />,
      color: "border-luxury-greenEmerald/30 bg-luxury-greenEmerald/5",
      label: "Patient Portal",
      desc: "Monitor your health, book appointments, connect IoT devices",
    },
    doctor: {
      icon: <Stethoscope size={16} className="text-luxury-goldRoyal" />,
      color: "border-luxury-goldRoyal/30 bg-luxury-goldRoyal/5",
      label: "Physician Specialist",
      desc: "Manage patients, prescribe medication, conduct telemedicine",
    },
    hospital: {
      icon: <Building2 size={16} className="text-luxury-blueElectric" />,
      color: "border-luxury-blueElectric/30 bg-luxury-blueElectric/5",
      label: "Hospital ERP Manager",
      desc: "Manage your institution, staff, and patient workflows",
    },
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-4 text-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-[15%] left-[15%] w-[40%] h-[40%] bg-luxury-blueMedical/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[15%] w-[40%] h-[40%] bg-luxury-goldRoyal/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-5 py-8">

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
          <h1 className="text-xl font-bold tracking-wide uppercase text-white">Create Your Account</h1>
          <p className="text-xs text-zinc-400 mt-1">Enroll in the MediSync Health network</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 shadow-2xl animate-glow-gold">

          {errorMsg && (
            <div className="p-3.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson text-xs flex items-start gap-1.5 mb-5">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 bg-luxury-greenEmerald/15 text-luxury-greenEmerald border border-luxury-greenEmerald/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-bold text-sm text-white uppercase tracking-wider">Registration Successful</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {role === "doctor"
                  ? "Your clinical credentials have been submitted. Await administrator verification before accessing the Physician Hub."
                  : role === "hospital"
                  ? "Hospital profile created. Redirecting to your ERP dashboard..."
                  : "Patient profile created. Redirecting to your health dashboard..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Role Selector */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["patient", "doctor", "hospital"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                        role === r
                          ? roleConfig[r].color
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      {roleConfig[r].icon}
                      <span className={`text-[9px] font-bold uppercase tracking-wide ${
                        role === r ? "text-white" : "text-zinc-500"
                      }`}>
                        {r === "patient" ? "Patient" : r === "doctor" ? "Doctor" : "Hospital"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-600 mt-1.5 text-center">{roleConfig[role].desc}</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">
                  {role === "hospital" ? "Hospital / Institution Name" : "Full Name"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === "hospital" ? "e.g. City General Hospital" : "e.g. Dr. Sarah Lin"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <User size={13} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <Mail size={13} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                    />
                    <Lock size={13} className="absolute left-3.5 top-3.5 text-zinc-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full bg-zinc-900 border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none text-white placeholder-zinc-700 ${
                        confirmPassword && confirmPassword !== password
                          ? "border-luxury-redCrimson focus:border-luxury-redCrimson"
                          : "border-zinc-800 focus:border-luxury-goldRoyal"
                      }`}
                    />
                    <Lock size={13} className="absolute left-3.5 top-3.5 text-zinc-500" />
                  </div>
                </div>
              </div>

              {/* Doctor-specific Fields */}
              {role === "doctor" && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-luxury-goldRoyal/15 space-y-3">
                  <p className="text-[9px] text-luxury-goldRoyal font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Stethoscope size={11} /> Clinician Verification Details
                  </p>

                  {/* Specialization */}
                  <div>
                    <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">
                      Medical Specialization
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-goldRoyal"
                    >
                      {MEDICAL_SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* License + Experience (side by side) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">
                        Medical License ID
                      </label>
                      <input
                        type="text"
                        required
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        placeholder="e.g. LIC-99402-A"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                      />
                    </div>
                  </div>

                  {/* Hospital Affiliation */}
                  <div>
                    <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">
                      Hospital Affiliation
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        placeholder="e.g. Mayo Clinic, Apollo Hospitals"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                      />
                      <Building2 size={12} className="absolute left-2.5 top-2.5 text-zinc-600" />
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 p-2.5 bg-luxury-goldRoyal/5 rounded-lg border border-luxury-goldRoyal/10">
                    <ClipboardList size={11} className="text-luxury-goldRoyal mt-0.5 shrink-0" />
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      After registration your status will be <strong className="text-luxury-goldRoyal">Pending</strong>. Access to patient records is blocked until an Administrator verifies your credentials.
                    </p>
                  </div>
                </div>
              )}

              {/* Hospital-specific Fields */}
              {role === "hospital" && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-luxury-blueElectric/15 space-y-3">
                  <p className="text-[9px] text-luxury-blueElectric font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Building2 size={11} /> Institution Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">City / Location</label>
                      <input
                        type="text"
                        value={hospitalCity}
                        onChange={(e) => setHospitalCity(e.target.value)}
                        placeholder="e.g. New York"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-luxury-blueElectric text-white placeholder-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-zinc-500 uppercase font-mono mb-1">Hospital Type</label>
                      <select
                        value={hospitalType}
                        onChange={(e) => setHospitalType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-blueElectric"
                      >
                        <option value="">Select type</option>
                        <option value="General">General</option>
                        <option value="Specialty">Specialty</option>
                        <option value="Teaching">Teaching</option>
                        <option value="Clinic">Clinic</option>
                        <option value="Diagnostic">Diagnostic Center</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Activity size={14} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[10px] text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-luxury-goldRoyal hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
