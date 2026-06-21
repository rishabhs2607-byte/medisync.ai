"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb } from "@/services/firebase";
import { assessSymptoms, analyzeVitals } from "@/services/aiEngine";
import { 
  Bot, 
  Stethoscope, 
  ShieldAlert, 
  TrendingUp, 
  Heart, 
  Search, 
  Sparkles, 
  Activity, 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit
} from "lucide-react";

export default function AICenter() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  
  // Symptom checker input
  const [symptomInput, setSymptomInput] = useState("");
  const [assessment, setAssessment] = useState<ReturnType<typeof assessSymptoms> | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Vitals inputs for risk analysis
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.6);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [glucose, setGlucose] = useState(104);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    const currentDb = getMediSyncDb();
    const pat = currentDb.patients[0]; // Seed initial inputs with first patient's vitals
    if (pat) {
      setHeartRate(pat.vitals.heartRate);
      setSpo2(pat.vitals.spo2);
      setTemp(pat.vitals.temperature);
      setSystolic(pat.vitals.systolic);
      setDiastolic(pat.vitals.diastolic);
      setGlucose(pat.vitals.glucose);
    }
  }, []);

  const handleSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomInput) return;

    setLoadingAssessment(true);
    setTimeout(() => {
      setAssessment(assessSymptoms(symptomInput));
      setLoadingAssessment(false);
    }, 800);
  };

  const vitalReport = analyzeVitals(heartRate, spo2, temp, systolic, diastolic, glucose);

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "Emergency": return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "Severe": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "Moderate": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      default: return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12 text-zinc-100">
      
      {/* Header Banner */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">AI Health Center</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/30 font-semibold uppercase">Clinical Decision Support</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">MediSync Core Model: Clinical-v2-Pro</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: AI Symptom Checker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-600/10 to-transparent blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-violet-500/15 rounded-xl text-violet-400">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI Clinical Symptom Assessor</h2>
                <p className="text-xs text-zinc-400">Input patient complaints to check probable etiologies</p>
              </div>
            </div>

            <form onSubmit={handleSymptomSubmit} className="flex gap-2">
              <input 
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="Describe symptoms (e.g. Chest pain radiating to left shoulder, blurry vision...)"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-zinc-700"
              />
              <button 
                type="submit"
                className="px-6 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02] flex items-center gap-1.5 shrink-0"
              >
                <Sparkles size={16} /> Analyze
              </button>
            </form>

            {loadingAssessment && (
              <div className="mt-8 py-8 text-center text-sm text-zinc-500 animate-pulse font-mono">
                Consulting diagnostic models...
              </div>
            )}

            {assessment && !loadingAssessment && (
              <div className="mt-8 space-y-6 pt-6 border-t border-zinc-900">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getSeverityBadgeColor(assessment.severity)}`}>
                    Severity: {assessment.severity}
                  </span>
                  
                  <div className="text-xs text-zinc-400">
                    Recommended Dept: <span className="font-bold text-white">{assessment.recommendedDepartment}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono mb-3">Probable Clinical Diagnoses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessment.possibleCauses.map((cause, idx) => (
                      <div key={idx} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-white text-sm">{cause.disease}</h4>
                          <span className="text-xs text-violet-400 font-bold font-mono">{cause.probability}%</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{cause.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20">
                  <h4 className="text-xs font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <ShieldAlert size={14} /> Immediate Clinical Actions
                  </h4>
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{assessment.clinicalAdvice}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Health Risk Assessment Simulator */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-base font-bold flex items-center gap-1.5 text-zinc-300 mb-4">
              <BrainCircuit size={18} className="text-cyan-400" /> Vital Risk Analyzer
            </h3>

            <div className="space-y-4">
              {/* Sliders for fast diagnostic testing */}
              <div>
                <label className="text-[10px] text-zinc-500 flex justify-between uppercase font-mono">Heart Rate: <span className="text-white font-bold">{heartRate} bpm</span></label>
                <input 
                  type="range" min="40" max="150" value={heartRate} onChange={(e) => setHeartRate(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 flex justify-between uppercase font-mono">SpO2: <span className="text-white font-bold">{spo2}%</span></label>
                <input 
                  type="range" min="80" max="100" value={spo2} onChange={(e) => setSpo2(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 flex justify-between uppercase font-mono">Temperature: <span className="text-white font-bold">{temp.toFixed(1)}°C</span></label>
                <input 
                  type="range" min="34" max="41" step="0.1" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-mono block">Systolic BP</label>
                  <input 
                    type="number" value={systolic} onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 mt-1 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-mono block">Diastolic BP</label>
                  <input 
                    type="number" value={diastolic} onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 mt-1 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 flex justify-between uppercase font-mono">Glucose: <span className="text-white font-bold">{glucose} mg/dL</span></label>
                <input 
                  type="range" min="60" max="200" value={glucose} onChange={(e) => setGlucose(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                />
              </div>
            </div>

            {/* AI Output Result Card */}
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Calculated Health Score</span>
                <span className="text-xl font-extrabold text-white">{vitalReport.healthScore} / 100</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span>Vital Risk Status</span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                  vitalReport.riskLevel === "Critical" ? "text-red-400 bg-red-500/10" :
                  vitalReport.riskLevel === "High" ? "text-orange-400 bg-orange-500/10" :
                  vitalReport.riskLevel === "Moderate" ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                }`}>{vitalReport.riskLevel} Risk</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Expert recommendation</p>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{vitalReport.recommendations[0]}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
