"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getMediSyncDb, saveMediSyncDb, ChatMessage } from "@/services/firebase";
import { summarizeConsultation } from "@/services/aiEngine";
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
  Clock, 
  MessageSquare,
  ArrowLeft,
  Tv,
  CheckCheck
} from "lucide-react";

export default function ConsultationRoom() {
  const [db, setDb] = useState<ReturnType<typeof getMediSyncDb> | null>(null);
  
  // Call Controls
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeCall, setActiveCall] = useState(true);

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // AI Summary States
  const [consultSummary, setConsultSummary] = useState<ReturnType<typeof summarizeConsultation> | null>(null);
  const [transcriptText, setTranscriptText] = useState<string>(
    "Patient: Good morning doctor. My blood pressure cuffs registered 135/85 this morning. Doctor: Okay James, I see that. Your SpO2 and temperature logs are stable. Let's continue taking Metformin with meals and Lisinopril every morning."
  );

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDb = () => {
    setDb(getMediSyncDb());
  };

  useEffect(() => {
    loadDb();
    
    // Set initial chat messages
    const initialChats: ChatMessage[] = [
      { id: "c-1", senderId: "doc1", senderRole: "doctor", text: "Welcome to the secure telehealth room, James. Can you hear and see me clearly?", timestamp: new Date(Date.now() - 60000).toISOString() },
      { id: "c-2", senderId: "pat1", senderRole: "patient", text: "Yes doctor! The camera feed is crystal clear.", timestamp: new Date(Date.now() - 40000).toISOString() }
    ];
    setMessages(initialChats);
  }, []);

  useEffect(() => {
    // Generate AI Summary from transcript on mount/edit
    setConsultSummary(summarizeConsultation(transcriptText));
  }, [transcriptText]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText) return;

    const newMsg: ChatMessage = {
      id: `c-msg-${Date.now()}`,
      senderId: "doc1", // Simulating doctor sending message
      senderRole: "doctor",
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, newMsg]);
    setInputText("");

    // Simulate Patient Reply after 1.5s
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: ChatMessage = {
        id: `c-msg-${Date.now() + 1}`,
        senderId: "pat1",
        senderRole: "patient",
        text: "Got it doctor, I will download the updated prescription immediately.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col h-screen overflow-hidden">
      
      {/* Top Consultation Room Navigation */}
      <div className="bg-zinc-950 border-b border-zinc-900 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              Telemedicine Consultation Room
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </h1>
            <p className="text-[10px] text-zinc-400">Doctor: Dr. Alexander Marcus • Patient: James Anderson</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-cyan-400 font-mono">
            WebRTC Encrypted: AES-GCM
          </div>
        </div>
      </div>

      {/* Main Grid: Video Consult Feed & Chat & AI Notes */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Section: Video Streams */}
        <div className="flex-1 flex flex-col p-6 gap-6 justify-between overflow-y-auto bg-zinc-950/40">
          {activeCall ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Doctor Stream Card (Primary) */}
              <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                {videoEnabled ? (
                  <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800')" }} />
                ) : (
                  <div className="text-zinc-500 font-semibold flex flex-col items-center gap-2">
                    <VideoOff size={32} /> Video Off
                  </div>
                )}
                
                {/* Overlay Name */}
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs font-semibold text-white">
                  Dr. Alexander Marcus (You)
                </div>
              </div>

              {/* Patient Stream Card */}
              <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800')" }} />
                
                {/* Overlay Name */}
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs font-semibold text-white">
                  James Anderson (Patient)
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <PhoneOff size={48} className="text-red-500" />
              <p className="font-semibold text-lg">Call Session Terminated</p>
              <button 
                onClick={() => setActiveCall(true)}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
              >
                Reconnect Call
              </button>
            </div>
          )}

          {/* WebRTC Video Call Control Bar */}
          <div className="flex justify-center items-center gap-4 py-3 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl max-w-lg mx-auto w-full px-6 shrink-0">
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-3 rounded-full transition-all ${
                audioEnabled ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button 
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-3 rounded-full transition-all ${
                videoEnabled ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button 
              onClick={() => setScreenSharing(!screenSharing)}
              className={`p-3 rounded-full transition-all ${
                screenSharing ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Monitor size={18} />
            </button>

            <button 
              onClick={() => setActiveCall(false)}
              className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
            >
              <PhoneOff size={18} />
            </button>
          </div>

        </div>

        {/* Right Section: Telehealth Consultation Sidebar (Chat & AI summaries) */}
        <div className="w-full lg:w-96 border-l border-zinc-900 bg-zinc-950 flex flex-col divide-y divide-zinc-900 shrink-0">
          
          {/* Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="p-4 bg-zinc-900/30 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"><MessageSquare size={14} /> Consultation Chat</span>
              <span className="text-[10px] text-zinc-500">Auto Save Enabled</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isDoc = msg.senderRole === "doctor";
                return (
                  <div key={msg.id} className={`flex flex-col ${isDoc ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-zinc-500 mb-1">{isDoc ? "You" : "Patient"}</span>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs ${
                      isDoc 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-zinc-500 mb-1">Patient</span>
                  <div className="p-2.5 bg-zinc-900 rounded-xl text-zinc-500 text-xs italic animate-pulse">
                    Typing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-900 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type clinical advice..."
                className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none placeholder-zinc-700"
              />
              <button type="submit" className="p-2.5 bg-primary hover:opacity-95 text-white rounded-xl transition-all">
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* AI Clinical Summary Panel */}
          <div className="p-5 overflow-y-auto max-h-[350px] shrink-0">
            <h3 className="text-xs font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-wider mb-3"><Bot size={14} /> AI Consultation Summary</h3>
            
            {consultSummary ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Clinical summary</h4>
                  <p className="text-zinc-400 mt-1 leading-relaxed">{consultSummary.clinicalSummary}</p>
                </div>

                <div>
                  <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Suggested Prescriptions</h4>
                  <div className="space-y-2 mt-2">
                    {consultSummary.prescriptionsDraft.map((med, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-900 border border-zinc-850 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{med.name} ({med.dosage})</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{med.frequency} • {med.duration}</p>
                        </div>
                        <FileCheck size={14} className="text-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Follow-up items</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-zinc-400">
                    {consultSummary.followUpActions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Transcribing conversation audio to compile summaries...</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
