"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  ShieldAlert, 
  Mail, 
  Lock, 
  ArrowRight, 
  Key, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function LoginPage() {
  const { login, loginWithGoogle, forgotPassword } = useAuth();
  const router = useRouter();

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const profile = await login(email, password);
      routeUser(profile.role);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const profile = await loginWithGoogle();
      routeUser(profile.role);
    } catch (err: any) {
      setErrorMsg(err.message || "Google Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setLoading(true);
    setErrorMsg("");
    setResetSuccess("");
    try {
      await forgotPassword(resetEmail);
      setResetSuccess("A password reset link has been dispatched to your email address.");
      setResetEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch reset email. Please verify the address.");
    } finally {
      setLoading(false);
    }
  };

  const routeUser = (role: string) => {
    switch (role) {
      case "admin": router.push("/admin/dashboard"); break;
      case "doctor": router.push("/doctor/dashboard"); break;
      case "patient": router.push("/patient/dashboard"); break;
      case "hospital": router.push("/hospital/dashboard"); break;
      default: router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack flex items-center justify-center p-6 text-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Glow Orbs */}
      <div className="absolute top-[20%] left-[20%] w-[35%] h-[35%] bg-luxury-blueMedical/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[35%] h-[35%] bg-luxury-goldRoyal/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="p-2 bg-gradient-to-tr from-luxury-goldRoyal to-luxury-goldMetallic rounded-xl border border-luxury-goldRoyal/20">
              <Activity size={20} className="text-luxury-pureBlack group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-extrabold text-base tracking-wider text-white">
              MEDISYNC <span className="text-luxury-goldRoyal font-medium">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold tracking-wide uppercase text-white">
            {showForgotPassword ? "Reset Workspace Password" : "Clinical Workspace Auth"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {showForgotPassword 
              ? "Recover access to your MediSync clinical node" 
              : "Please authenticate using your clinical credentials"}
          </p>
        </div>

        {/* Auth form card */}
        <div className="glass-panel p-8 rounded-3xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 shadow-2xl animate-glow-gold">
          
          {errorMsg && (
            <div className="p-3.5 bg-luxury-redCrimson/10 border border-luxury-redCrimson/25 rounded-xl text-luxury-redCrimson text-xs flex items-start gap-1.5 mb-4 animate-shake">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 bg-luxury-greenEmerald/10 border border-luxury-greenEmerald/25 rounded-xl text-luxury-greenEmerald text-xs flex items-start gap-1.5 mb-4">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {!showForgotPassword ? (
            /* Sign In Flow */
            <div className="space-y-6">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Ecosystem / User Email</label>
                  <div className="relative">
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@medisync.ai"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                    />
                    <Mail size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setErrorMsg("");
                        setResetSuccess("");
                      }}
                      className="text-[9px] text-luxury-goldRoyal hover:underline uppercase font-mono tracking-widest"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                    />
                    <Lock size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] border border-luxury-goldRoyal/30 shadow-lg shadow-luxury-goldRoyal/5"
                >
                  {loading ? "AUTHENTICATING..." : "Sign In"} <ArrowRight size={14} />
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[9px] text-zinc-500 uppercase font-mono tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              {/* Google login button */}
              <button
                type="button" onClick={handleGoogleLogin} disabled={loading}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.673 1.353 6.582l3.913 3.183Z"
                  />
                  <path
                    fill="#34A853"
                    d="M16.04 15.345c-1.16.737-2.618 1.164-4.04 1.164a7.077 7.077 0 0 1-6.734-4.855L1.353 14.837C3.307 18.745 7.354 21.418 12 21.418c2.936 0 5.618-.973 7.645-2.645l-3.605-3.428Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.09 12.245c0-.682-.064-1.336-.182-1.964H12v3.718h5.664a4.85 4.85 0 0 1-2.09 3.182l3.605 3.427c2.109-1.945 3.327-4.8 3.327-8.363Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 12.245a7.05 7.05 0 0 1 0-2.48L1.353 6.582a11.96 11.96 0 0 0 0 11.327l3.913-3.182a7.05 7.05 0 0 1 0-2.482Z"
                  />
                </svg>
                Google Federated Sign In
              </button>
            </div>
          ) : (
            /* Forgot Password Flow */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Account Email</label>
                <div className="relative">
                  <input
                    type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-luxury-goldRoyal text-white placeholder-zinc-700"
                  />
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] border border-luxury-goldRoyal/30"
              >
                {loading ? "DISPATCHING LINK..." : "Send Reset Link"} <Key size={14} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setErrorMsg("");
                  setResetSuccess("");
                }}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-500">
          Don't have an account? <Link href="/register" className="text-luxury-goldRoyal hover:underline font-semibold">Register Profile</Link>
        </p>

      </div>
    </div>
  );
}
