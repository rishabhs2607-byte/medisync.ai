// MediSync AI — Firebase & Database Service Configuration
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Real-world Firebase credentials fallback
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBsedBBMCahJXiNShwNICk7UxUJwY4229A",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "medisync-2b25a.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://medisync-2b25a-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "medisync-2b25a",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "medisync-2b25a.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1078960342951",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1078960342951:web:c4f92f6ce7aea984b0d882"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// ==========================================
// MOCK STATE ENGINE & DATABASE SEED (FALLBACK)
// ==========================================

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "patient" | "hospital";
  status: "active" | "applied" | "review" | "approved" | "pending";
  avatar?: string;
  hospitalAffiliation?: string;
  licenseNumber?: string;
}

export interface PatientRecord {
  uid: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies: string[];
  medications: string[];
  history: { date: string; diagnosis: string; doctor: string }[];
  vitals: {
    heartRate: number;
    spo2: number;
    temperature: number;
    systolic: number;
    diastolic: number;
    glucose: number;
    fallDetected: boolean;
    ecg: number[];
    lastUpdated: string;
  };
  connectedDevice: {
    deviceId: string;
    status: "online" | "offline";
    battery: number;
    lastSync: string;
  } | null;
  familyMembers: { name: string; relation: string; email: string; alertStatus: boolean }[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
  reason: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string }[];
  notes: string;
  pdfUrl?: string;
}

export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  metric: "Heart Rate" | "SpO2" | "Temperature" | "Fall" | "ECG";
  value: string;
  severity: "critical" | "warning";
  timestamp: string;
  status: "active" | "dispatched" | "resolved";
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  timestamp: string;
  attachment?: { name: string; url: string; type: "pdf" | "image" };
}

// Initial Data Seeding for the Startup Dashboard UI
const INITIAL_USERS: UserProfile[] = [
  { uid: "admin1", name: "Dr. Sarah Lin (CTO)", email: "admin@medisync.ai", role: "admin", status: "active", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" },
  { uid: "doc1", name: "Dr. Alexander Marcus", email: "alexander@medisync.ai", role: "doctor", status: "approved", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150", hospitalAffiliation: "Mayo Clinic", licenseNumber: "LIC-88290-A" },
  { uid: "doc2", name: "Dr. Elizabeth Carter", email: "elizabeth@medisync.ai", role: "doctor", status: "applied", avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?w=150", hospitalAffiliation: "Stanford Medicine", licenseNumber: "LIC-11204-B" },
  { uid: "pat1", name: "James Anderson (Patient)", email: "james@gmail.com", role: "patient", status: "active", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
  { uid: "hosp1", name: "St. Jude Research Hospital", email: "stjude@hospital.org", role: "hospital", status: "approved" }
];

const INITIAL_PATIENTS: PatientRecord[] = [
  {
    uid: "pat1",
    name: "James Anderson",
    age: 64,
    gender: "Male",
    bloodType: "A+",
    allergies: ["Penicillin", "Peanuts"],
    medications: ["Lisinopril 10mg", "Metformin 500mg"],
    history: [
      { date: "2026-03-12", diagnosis: "Stage 1 Hypertension onset", doctor: "Dr. Alexander Marcus" },
      { date: "2026-05-19", diagnosis: "Type II Diabetes routine review", doctor: "Dr. Alexander Marcus" }
    ],
    vitals: {
      heartRate: 72,
      spo2: 98,
      temperature: 36.6,
      systolic: 120,
      diastolic: 80,
      glucose: 104,
      fallDetected: false,
      ecg: Array.from({ length: 40 }, () => Math.sin(Math.random() * Math.PI) * 10 + 50),
      lastUpdated: new Date().toISOString()
    },
    connectedDevice: {
      deviceId: "MS-ESP32-098X",
      status: "online",
      battery: 89,
      lastSync: new Date().toISOString()
    },
    familyMembers: [
      { name: "Emily Anderson", relation: "Daughter", email: "emily.a@gmail.com", alertStatus: true }
    ]
  },
  {
    uid: "pat2",
    name: "Sophia Martinez",
    age: 72,
    gender: "Female",
    bloodType: "O-",
    allergies: ["Sulfa Drugs"],
    medications: ["Atorvastatin 20mg"],
    history: [
      { date: "2025-11-04", diagnosis: "Mild Hyperlipidemia diagnosis", doctor: "Dr. Alexander Marcus" }
    ],
    vitals: {
      heartRate: 85,
      spo2: 96,
      temperature: 36.8,
      systolic: 135,
      diastolic: 85,
      glucose: 112,
      fallDetected: false,
      ecg: Array.from({ length: 40 }, () => Math.sin(Math.random() * Math.PI) * 10 + 50),
      lastUpdated: new Date().toISOString()
    },
    connectedDevice: {
      deviceId: "MS-ESP32-114M",
      status: "online",
      battery: 92,
      lastSync: new Date().toISOString()
    },
    familyMembers: [
      { name: "Robert Martinez", relation: "Son", email: "robert.m@gmail.com", alertStatus: true }
    ]
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "apt1", patientId: "pat1", patientName: "James Anderson", doctorId: "doc1", doctorName: "Dr. Alexander Marcus", date: "2026-06-25", time: "10:30 AM", status: "scheduled", reason: "Real-time vital review and prescription adjustment" },
  { id: "apt2", patientId: "pat2", patientName: "Sophia Martinez", doctorId: "doc1", doctorName: "Dr. Alexander Marcus", date: "2026-06-28", time: "02:15 PM", status: "scheduled", reason: "Follow-up blood sugar check and cholesterol review" }
];

const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: "pr1",
    patientId: "pat1",
    doctorId: "doc1",
    doctorName: "Dr. Alexander Marcus",
    date: "2026-05-19",
    medicines: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily (Morning)", duration: "3 months" },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily (With meals)", duration: "3 months" }
    ],
    notes: "Avoid grapefruit juice. Maintain light morning walks and check blood sugar before breakfast."
  }
];

const INITIAL_ALERTS: EmergencyAlert[] = [
  { id: "alert1", patientId: "pat1", patientName: "James Anderson", metric: "Heart Rate", value: "134 bpm", severity: "critical", timestamp: new Date(Date.now() - 3600000).toISOString(), status: "resolved" }
];

const INITIAL_CHATS: ChatMessage[] = [
  { id: "m1", senderId: "doc1", senderRole: "doctor", text: "Hello James, how is your blood pressure tracking today?", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "m2", senderId: "pat1", senderRole: "patient", text: "Hi Doctor! It's hovering around 120/80 now since starting the new routine. The IoT device is syncing nicely.", timestamp: new Date(Date.now() - 86000000).toISOString() }
];

// Helper to interact with LocalStorage
const getStorageData = (key: string, initial: any) => {
  if (typeof window === "undefined") return initial;
  const item = localStorage.getItem(`medisync_${key}`);
  if (!item) {
    localStorage.setItem(`medisync_${key}`, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(item);
  } catch {
    return initial;
  }
};

const setStorageData = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`medisync_${key}`, JSON.stringify(data));
  }
};

export const getMediSyncDb = () => {
  return {
    users: getStorageData("users", INITIAL_USERS) as UserProfile[],
    patients: getStorageData("patients", INITIAL_PATIENTS) as PatientRecord[],
    appointments: getStorageData("appointments", INITIAL_APPOINTMENTS) as Appointment[],
    prescriptions: getStorageData("prescriptions", INITIAL_PRESCRIPTIONS) as Prescription[],
    alerts: getStorageData("alerts", INITIAL_ALERTS) as EmergencyAlert[],
    chats: getStorageData("chats", INITIAL_CHATS) as ChatMessage[]
  };
};

export const saveMediSyncDb = (dbInstance: ReturnType<typeof getMediSyncDb>) => {
  setStorageData("users", dbInstance.users);
  setStorageData("patients", dbInstance.patients);
  setStorageData("appointments", dbInstance.appointments);
  setStorageData("prescriptions", dbInstance.prescriptions);
  setStorageData("alerts", dbInstance.alerts);
  setStorageData("chats", dbInstance.chats);
};
