"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, ChatMessage, Prescription, ConsultationSession } from "@/services/firebase";
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Monitor, 
  PhoneOff, 
  Send, 
  Bot, 
  FileText, 
  FileCheck, 
  MessageSquare,
  ArrowLeft,
  Tv,
  Check,
  AlertTriangle,
  Play,
  RotateCcw
} from "lucide-react";

export default function ConsultationRoom() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  
  // Call Session Control
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeCall, setActiveCall] = useState(true);
  
  // Recovery State
  const [recoverySessionDetected, setRecoverySessionDetected] = useState(false);

  // Chat/Transcript
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Prescription Form state
  const [medName, setMedName] = useState("Paracetamol");
  const [medDosage, setMedDosage] = useState("500mg");
  const [medFreq, setMedFreq] = useState("Twice Daily");
  const [medDur, setMedDur] = useState("5 Days");
  const [medInst, setMedInst] = useState("After Food");
  const [draftedMeds, setDraftedMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }[]>([]);
  const [presNotes, setPresNotes] = useState("");
  const [showWarningBlock, setShowWarningBlock] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDb = () => {
    const currentDb = getMediSyncDb();
    setDb(currentDb);

    // ----------------------------------------
    // SESSION RECOVERY LOGIC CHECK
    // ----------------------------------------
    if (currentDb.activeSession && currentDb.activeSession.isActive) {
      // If there is an active session in localstorage with messages, prompt to recover!
      setRecoverySessionDetected(true);
    }
  };

  useEffect(() => {
    loadDb();
    
    // Seed initial chat logs
    setMessages([
      { id: "c-1", senderId: "doc1", senderRole: "doctor", text: "Welcome to the telemedicine workspace, James. I see your wireless ESP32 telemetry is active.", timestamp: new Date(Date.now() - 60000).toISOString() },
      { id: "c-2", senderId: "pat1", senderRole: "patient", text: "Yes doctor, I'm streaming live now.", timestamp: new Date(Date.now() - 45000).toISOString() }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Execute session recovery
  const handleRecoverSession = () => {
    if (!db || !db.activeSession) return;
    
    const recovered = db.activeSession;
    if (recovered.messages && recovered.messages.length > 0) {
      setMessages(recovered.messages);
    }
    
    setRecoverySessionDetected(false);
    setActiveCall(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText || !db) return;

    const newMsg: ChatMessage = {
      id: `c-msg-${Date.now()}`,
      senderId: "doc1",
      senderRole: "doctor",
      text: inputText,
      timestamp: new Date().toISOString()
    };

    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    setInputText("");

    // Backup state in activeSession for recovery checks
    const currentDb = getMediSyncDb();
    currentDb.activeSession = {
      ...currentDb.activeSession,
      isActive: true,
      messages: updatedMsgs,
      vitalsBackup: currentDb.patients[0].vitals,
      reportsBackup: currentDb.patients[0].reports
    };
    saveMediSyncDb(currentDb);

    // Simulate Reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: ChatMessage = {
        id: `c-msg-${Date.now() + 1}`,
        senderId: "pat1",
        senderRole: "patient",
        text: "Understood, doctor. I'll make sure to follow those guidelines.",
        timestamp: new Date().toISOString()
      };
      
      const newChats = [...updatedMsgs, replyMsg];
      setMessages(newChats);
      
      // Update backup
      const backupDb = getMediSyncDb();
      backupDb.activeSession.messages = newChats;
      saveMediSyncDb(backupDb);
    }, 1500);
  };

  const handleAddMedicineDraft = () => {
    if (!medName || !medDosage || !medFreq || !medDur) return;
    setDraftedMeds([...draftedMeds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur, instructions: medInst }]);
    setMedName("");
    setMedDosage("");
    setMedFreq("");
    setMedDur("");
    setShowWarningBlock(false);
  };

  // Prescription validation end-session check
  const handleEndConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (draftedMeds.length === 0) {
      // BLOCK CLOSURE - Mandate prescription
      setShowWarningBlock(true);
      return;
    }

    if (!db) return;

    // Compile and save prescription
    const newPres: Prescription = {
      id: `pres-${Date.now()}`,
      patientId: "pat1",
      doctorId: "doc1",
      doctorName: "Dr. Alexander Marcus",
      date: new Date().toISOString().split("T")[0],
      medicines: draftedMeds,
      notes: presNotes
    };

    const currentDb = getMediSyncDb();
    currentDb.prescriptions.unshift(newPres);
    
    // Add to history
    const patient = currentDb.patients.find(p => p.uid === "pat1");
    if (patient) {
      patient.history.unshift({
        date: new Date().toISOString().split("T")[0],
        diagnosis: `Telehealth consult completed: ${draftedMeds.map(m => m.name).join(", ")}`,
        doctor: "Dr. Alexander Marcus"
      });
    }

    // Reset activeSession
    currentDb.activeSession = {
      isActive: false,
      patientId: "",
      patientName: "",
      doctorId: "",
      doctorName: "",
      messages: [],
      vitalsBackup: patient ? patient.vitals : {} as any,
      reportsBackup: patient ? patient.reports : []
    };

    saveMediSyncDb(currentDb);
    
    // Redirect back to doctor dashboard
    window.location.href = "/doctor/dashboard";
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="min-h-screen bg-luxury-pureBlack text-zinc-100 flex flex-col h-screen overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Top Banner & Title */}
      <div className="bg-luxury-pureBlack border-b border-luxury-goldRoyal/10 px-6 py-4 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/doctor/dashboard" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-900 bg-zinc-950">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
              Clinical Video Consult Room
              <span className="w-2.5 h-2.5 bg-luxury-redCrimson rounded-full animate-ping" />
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">WebRTC Tunnel: Enabled • AES-GCM 256-Bit</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-luxury-richBlack border border-luxury-goldRoyal/10 rounded-lg text-luxury-goldRoyal text-xs font-mono">
          Patient: James Anderson (Offline Cuffs Active)
        </div>
      </div>

      {/* ----------------------------------------
          SESSION RECOVERY BANNER ALERTS
          ---------------------------------------- */}
      {recoverySessionDetected && (
        <div className="bg-luxury-goldRoyal/15 border-b border-luxury-goldRoyal/30 px-6 py-3 flex items-center justify-between text-xs text-white shrink-0 relative z-10 animate-pulse">
          <span className="font-semibold flex items-center gap-1.5"><RotateCcw size={14} className="text-luxury-goldRoyal" /> Interrupted consultation session detected for James Anderson.</span>
          <button 
            onClick={handleRecoverSession}
            className="px-4 py-1 bg-luxury-goldRoyal text-luxury-pureBlack font-bold uppercase tracking-wider rounded text-[10px]"
          >
            Resume Previous Session
          </button>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* Left column: Video consult frames */}
        <div className="flex-1 flex flex-col p-6 gap-6 justify-between overflow-y-auto bg-luxury-pureBlack/60">
          
          {activeCall ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Doctor Video frame (Electric Blue Glow border) */}
              <div className="bg-luxury-richBlack rounded-2xl overflow-hidden border border-luxury-blueElectric/20 relative flex items-center justify-center shadow-lg shadow-luxury-blueElectric/5 animate-glow-blue">
                {videoEnabled ? (
                  <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800')" }} />
                ) : (
                  <div className="text-zinc-500 font-semibold flex flex-col items-center gap-2">
                    <VideoOff size={32} /> Video Paused
                  </div>
                )}
                
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/75 border border-white/5 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white">
                  Dr. Alexander Marcus (You)
                </div>
              </div>

              {/* Patient Video frame (Gold Glow border) */}
              <div className="bg-luxury-richBlack rounded-2xl overflow-hidden border border-luxury-goldRoyal/20 relative flex items-center justify-center shadow-lg shadow-luxury-goldRoyal/5 animate-glow-gold">
                <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800')" }} />
                
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/75 border border-white/5 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white">
                  James Anderson (Patient)
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-luxury-richBlack rounded-2xl border border-zinc-900 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <PhoneOff size={48} className="text-luxury-redCrimson" />
              <p className="font-semibold text-lg">WebRTC Consult Disconnected</p>
              <button 
                onClick={() => setActiveCall(true)}
                className="px-6 py-2 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase"
              >
                Reconnect Cuffs
              </button>
            </div>
          )}

          {/* WebRTC Video call panel buttons */}
          <div className="flex justify-center items-center gap-4 py-3 bg-zinc-950/85 backdrop-blur-md border border-zinc-900 rounded-2xl max-w-lg mx-auto w-full px-6 shrink-0 shadow-xl">
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-3 rounded-full transition-all border ${
                audioEnabled 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" 
                  : "bg-luxury-redCrimson/20 text-luxury-redCrimson border-luxury-redCrimson/30"
              }`}
            >
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button 
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-3 rounded-full transition-all border ${
                videoEnabled 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" 
                  : "bg-luxury-redCrimson/20 text-luxury-redCrimson border-luxury-redCrimson/30"
              }`}
            >
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button 
              onClick={() => setScreenSharing(!screenSharing)}
              className={`p-3 rounded-full transition-all border ${
                screenSharing 
                  ? "bg-luxury-blueElectric/20 text-luxury-blueElectric border-luxury-blueElectric/30" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Monitor size={18} />
            </button>

            <button 
              onClick={() => setActiveCall(false)}
              className="p-3 bg-luxury-redCrimson hover:opacity-95 text-white rounded-full transition-colors border border-luxury-redCrimson/30"
            >
              <PhoneOff size={18} />
            </button>
          </div>

        </div>

        {/* Right column: telehealth chat & smart prescriptions */}
        <div className="w-full lg:w-96 border-l border-zinc-900 bg-luxury-pureBlack flex flex-col divide-y divide-zinc-900 shrink-0">
          
          {/* Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="p-4 bg-luxury-richBlack/60 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-1.5"><MessageSquare size={14} /> Telehealth Messages</span>
            </div>

            {/* Chats */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isDoc = msg.senderRole === "doctor";
                return (
                  <div key={msg.id} className={`flex flex-col ${isDoc ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-zinc-400 mb-1">{isDoc ? "You" : "Patient"}</span>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs ${
                      isDoc 
                        ? "bg-luxury-goldRoyal text-luxury-pureBlack rounded-tr-none font-semibold" 
                        : "bg-luxury-richBlack text-zinc-200 rounded-tl-none border border-zinc-850"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-zinc-500 mb-1">Patient</span>
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 text-xs italic animate-pulse">
                    Typing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input field */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-900 flex gap-2 shrink-0 bg-luxury-richBlack/40">
              <input 
                type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="Type clinical message..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none placeholder-zinc-700 text-white"
              />
              <button type="submit" className="p-2.5 bg-luxury-goldRoyal text-luxury-pureBlack rounded-xl transition-all font-bold">
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* AI Prescription Blocker form */}
          <div className="p-5 overflow-y-auto max-h-[350px] shrink-0 bg-luxury-richBlack/20">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-luxury-goldRoyal flex items-center gap-1.5"><Bot size={14} /> AI Prescription safeguard</h3>
              <span className="text-[8px] text-zinc-500 font-mono">Mandatory Form</span>
            </div>
            
            {showWarningBlock && (
              <div className="p-3 bg-luxury-redCrimson/10 border border-luxury-redCrimson/30 rounded-xl text-[10px] text-luxury-redCrimson flex items-start gap-1.5 mb-4 animate-shake">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Clinical protocol requires at least 1 drafted medication before terminating consult channel.</span>
              </div>
            )}

            <form onSubmit={handleEndConsultation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Med Name</label>
                  <input 
                    type="text" value={medName} onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Paracetamol" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded focus:outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Dosage</label>
                  <input 
                    type="text" value={medDosage} onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 500mg" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded focus:outline-none text-white text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Freq</label>
                  <input 
                    type="text" value={medFreq} onChange={(e) => setMedFreq(e.target.value)}
                    placeholder="Twice Daily" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-1 py-1.5 rounded focus:outline-none text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Duration</label>
                  <input 
                    type="text" value={medDur} onChange={(e) => setMedDur(e.target.value)}
                    placeholder="5 Days" 
                    className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-1 py-1.5 rounded focus:outline-none text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Instruction</label>
                  <select 
                    value={medInst} onChange={(e) => setMedInst(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-[9px] py-1.5 rounded focus:outline-none text-zinc-300"
                  >
                    <option value="After Food">After Food</option>
                    <option value="Before Food">Before Food</option>
                    <option value="With Water">With Water</option>
                  </select>
                </div>
              </div>

              <button
                type="button" onClick={handleAddMedicineDraft}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 text-[9px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1 transition-all"
              >
                Add Medication
              </button>

              {/* Draft List */}
              {draftedMeds.length > 0 && (
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 space-y-2">
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Drafted prescriptions ({draftedMeds.length})</p>
                  {draftedMeds.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-zinc-900 pb-1">
                      <span className="font-bold text-white">{med.name} ({med.dosage})</span>
                      <span className="text-zinc-500 font-mono text-[8px]">{med.frequency} • {med.instructions}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Advice & Notes</label>
                <textarea 
                  rows={2} value={presNotes} onChange={(e) => setPresNotes(e.target.value)}
                  placeholder="Additional patient guidance..." 
                  className="w-full bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1.5 rounded focus:outline-none placeholder-zinc-700 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-luxury-goldRoyal text-luxury-pureBlack font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-luxury-goldRoyal/10 border border-luxury-goldRoyal/30"
              >
                <FileCheck size={14} /> Commit & End Consult
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
