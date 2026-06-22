"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getMediSyncDb } from "@/services/firebase";
import { assessSymptoms, analyzeVitals } from "@/services/aiEngine";
import { 
  Bot, 
  Stethoscope, 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  ArrowLeft,
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
  const [temp, setTemp] = useState(98.6);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [glucose, setGlucose] = useState(104);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    const currentDb = getMediSyncDb();
    const pat = currentDb.patients[0];
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
      case "Emergency": return "bg-luxury-redCrimson/20 text-luxury-redCrimson border border-luxury-redCrimson/30 animate-pulse";
      case "Severe": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "Moderate": return "bg-luxury-goldRoyal/20 text-luxury-goldRoyal border border-luxury-goldRoyal/30";
      default: return "bg-luxury-greenEmerald/20 text-luxury-greenEmerald border border-luxury-greenEmerald/30";
    }
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack pb-12 text-zinc-100 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Header Banner */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">AI Diagnostics Center</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-luxury-goldRoyal/15 text-luxury-goldRoyal border border-luxury-goldRoyal/35 font-mono uppercase font-bold">Clinical Models Active</span>
              </div>
              <p className="text-[10px] text-zinc-555 font-mono mt-0.5">Decision Engine: Clinical-v2-Pro</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Symptom Checker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60 relative overflow-hidden animate-glow-gold">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-luxury-goldRoyal/10 to-transparent blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-luxury-goldRoyal/10 border border-luxury-goldRoyal/30 rounded-xl text-luxury-goldRoyal">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-luxury-goldRoyal">AI Symptom Diagnostic Assessor</h2>
                <p className="text-[10px] text-zinc-400">Input patient complaints to check probable pathologies</p>
              </div>
            </div>

            <form onSubmit={handleSymptomSubmit} className="flex gap-2">
              <input 
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="e.g. Chest pain radiating to left arm, blurry vision..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none placeholder-zinc-700 text-white"
              />
              <button 
                type="submit"
                className="px-6 bg-luxury-goldRoyal text-luxury-pureBlack rounded-xl text-xs font-bold uppercase tracking-wider transition-transform hover:scale-[1.02] flex items-center gap-1.5 shrink-0 border border-luxury-goldRoyal/30"
              >
                <Sparkles size={14} /> Analyze
              </button>
            </form>

            {loadingAssessment && (
              <div className="mt-8 py-8 text-center text-xs text-zinc-500 animate-pulse font-mono">
                Running diagnosis models...
              </div>
            )}

            {assessment && !loadingAssessment && (
              <div className="mt-8 space-y-6 pt-6 border-t border-zinc-900">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${getSeverityBadgeColor(assessment.severity)}`}>
                    Severity: {assessment.severity}
                  </span>
                  
                  <div className="text-[10px] text-zinc-500">
                    Recommended Dept: <span className="font-bold text-white uppercase">{assessment.recommendedDepartment}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono mb-3">Probable clinical matches</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessment.possibleCauses.map((cause, idx) => (
                      <div key={idx} className="p-4 bg-luxury-pureBlack rounded-xl border border-zinc-900">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-xs">{cause.disease}</h4>
                          <span className="text-xs text-luxury-goldRoyal font-extrabold font-mono">{cause.probability}%</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">{cause.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-luxury-redCrimson/10 border border-luxury-redCrimson/20">
                  <h4 className="text-[10px] text-luxury-redCrimson flex items-center gap-1.5 uppercase tracking-wider font-extrabold">
                    <ShieldAlert size={14} /> Critical protocol actions
                  </h4>
                  <p className="text-[10px] text-zinc-300 mt-2 leading-relaxed">{assessment.clinicalAdvice}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Vitals Slider risk analyser */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-luxury-goldRoyal/10 bg-luxury-richBlack/60">
            <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-300 mb-4 uppercase tracking-widest font-mono">
              <BrainCircuit size={18} className="text-luxury-blueElectric" /> Vital Risk Evaluator
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] text-zinc-500 flex justify-between uppercase font-mono">Heart Rate: <span className="text-white font-bold">{heartRate} bpm</span></label>
                <input 
                  type="range" min="40" max="150" value={heartRate} onChange={(e) => setHeartRate(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal mt-1"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 flex justify-between uppercase font-mono">SpO2 Level: <span className="text-white font-bold">{spo2}%</span></label>
                <input 
                  type="range" min="80" max="100" value={spo2} onChange={(e) => setSpo2(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal mt-1"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 flex justify-between uppercase font-mono">Temperature: <span className="text-white font-bold">{temp.toFixed(1)}°F</span></label>
                <input 
                  type="range" min="93" max="106" step="0.1" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-mono block">Systolic BP</label>
                  <input 
                    type="number" value={systolic} onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 mt-1 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-mono block">Diastolic BP</label>
                  <input 
                    type="number" value={diastolic} onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-center py-1.5 mt-1 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 flex justify-between uppercase font-mono">Fasting Sugar: <span className="text-white font-bold">{glucose} mg/dL</span></label>
                <input 
                  type="range" min="60" max="200" value={glucose} onChange={(e) => setGlucose(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-luxury-goldRoyal mt-1"
                />
              </div>
            </div>

            {/* AI Output Result */}
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Model Vital Score</span>
                <span className="text-lg font-black text-white">{vitalReport.healthScore} / 100</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span>Vital Risk Level</span>
                <span className={`px-2.5 py-0.5 rounded font-mono font-bold ${
                  vitalReport.riskLevel === "Critical" ? "text-luxury-redCrimson bg-luxury-redCrimson/10" :
                  vitalReport.riskLevel === "High" ? "text-orange-400 bg-orange-500/10" :
                  vitalReport.riskLevel === "Moderate" ? "text-luxury-goldRoyal bg-luxury-goldRoyal/10" : "text-luxury-greenEmerald bg-luxury-greenEmerald/10"
                }`}>{vitalReport.riskLevel} Risk</span>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900">
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">Recommendations</p>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{vitalReport.recommendations[0]}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
