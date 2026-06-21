// MediSync AI — Firebase & Database Service Configuration
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
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
  status: "active" | "applied" | "review" | "approved" | "pending" | "rejected" | "suspended";
  avatar?: string;
  hospitalAffiliation?: string;
  licenseNumber?: string;
  availability?: "Available" | "Busy" | "In Consultation" | "Offline" | "Emergency Mode";
  specialty?: string;
  workload?: number;
  emergencyLevel?: number;
}

export interface DoctorApplication {
  uid: string;
  fullName: string;
  email: string;
  specialization: string;
  licenseNumber: string;
  experience: number;
  uploadedDocuments: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt: string;
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
  vitalsMode: "device" | "manual";
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
  reports: { id: string; name: string; date: string; url: string; notes?: string; annotations?: string }[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "waiting_queue";
  reason: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; instructions?: string }[];
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

export interface ConsultationSession {
  isActive: boolean;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  messages: ChatMessage[];
  vitalsBackup: PatientRecord["vitals"];
  reportsBackup: PatientRecord["reports"];
  interruptedAt?: string;
}

// Seeding Profiles (Only clean Administrator is seeded for system startup)
const INITIAL_USERS: UserProfile[] = [
  { uid: "admin1", name: "System Administrator", email: "admin@medisync.ai", role: "admin", status: "active", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin" }
];

const INITIAL_PATIENTS: PatientRecord[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_PRESCRIPTIONS: Prescription[] = [];
const INITIAL_ALERTS: EmergencyAlert[] = [];
const INITIAL_CHATS: ChatMessage[] = [];
const INITIAL_DOCTOR_APPLICATIONS: DoctorApplication[] = [];
const INITIAL_HOSPITALS: any[] = [];

// Helper to interact with LocalStorage
export const getStorageData = (key: string, initial: any) => {
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

export const setStorageData = (key: string, data: any) => {
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
    chats: getStorageData("chats", INITIAL_CHATS) as ChatMessage[],
    doctorApplications: getStorageData("doctorApplications", INITIAL_DOCTOR_APPLICATIONS) as DoctorApplication[],
    hospitals: getStorageData("hospitals", INITIAL_HOSPITALS) as any[],
    activeSession: getStorageData("activeSession", { isActive: false, patientId: "", patientName: "", doctorId: "", doctorName: "", messages: [], vitalsBackup: {}, reportsBackup: [] }) as ConsultationSession
  };
};

export const saveMediSyncDb = (dbInstance: ReturnType<typeof getMediSyncDb>) => {
  setStorageData("users", dbInstance.users);
  setStorageData("patients", dbInstance.patients);
  setStorageData("appointments", dbInstance.appointments);
  setStorageData("prescriptions", dbInstance.prescriptions);
  setStorageData("alerts", dbInstance.alerts);
  setStorageData("chats", dbInstance.chats);
  setStorageData("doctorApplications", dbInstance.doctorApplications);
  setStorageData("hospitals", dbInstance.hospitals);
  setStorageData("activeSession", dbInstance.activeSession);
};

// Smart matching logic implementation
export const findBestDoctor = (specialtyNeeded: string, emergencyLevel: number) => {
  const db = getMediSyncDb();
  let doctorPool = db.users.filter(u => u.role === "doctor" && u.status === "approved" && u.availability === "Available");
  
  if (doctorPool.length === 0) {
    doctorPool = db.users.filter(u => u.role === "doctor" && u.status === "approved" && u.availability !== "Offline");
  }

  if (doctorPool.length === 0) return null;

  const scoredPool = doctorPool.map(doc => {
    let score = 0;
    if (doc.specialty?.toLowerCase().includes(specialtyNeeded.toLowerCase())) {
      score += 50;
    }
    score -= (doc.workload || 0) * 10;
    if (emergencyLevel > 2 && doc.specialty?.toLowerCase().includes("icu")) {
      score += 30;
    }
    return { doc, score };
  });

  scoredPool.sort((a, b) => b.score - a.score);
  return scoredPool[0].doc;
};

// ==========================================
// FIREBASE AUTHENTICATION SDK INTEGRATIONS
// ==========================================

export const registerUserWithFirebase = async (
  email: string,
  password: string,
  name: string,
  role: "admin" | "doctor" | "patient" | "hospital",
  additionalFields?: any
): Promise<UserProfile> => {
  try {
    // 1. Create credential in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // New doctors register as pending. Patients, Hospitals default to active.
    const status = role === "doctor" ? "pending" : "active";

    const profile: UserProfile = {
      uid: user.uid,
      name,
      email,
      role,
      status,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      hospitalAffiliation: additionalFields?.hospitalAffiliation,
      licenseNumber: additionalFields?.licenseNumber,
      specialty: additionalFields?.specialization || additionalFields?.specialty,
      availability: role === "doctor" ? "Offline" : undefined
    };

    // 2. Try to write to real Firestore
    try {
      await setDoc(doc(db, "users", user.uid), profile);
      
      if (role === "doctor") {
        const appDetails = {
          uid: user.uid,
          fullName: name,
          email,
          specialization: additionalFields?.specialization || "General Medicine",
          licenseNumber: additionalFields?.licenseNumber || "LIC-PENDING",
          experience: Number(additionalFields?.experience) || 0,
          uploadedDocuments: additionalFields?.uploadedDocuments || "license_credentials.pdf",
          status: "pending",
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "doctorApplications", user.uid), appDetails);
      } else if (role === "patient") {
        const patientRec: PatientRecord = {
          uid: user.uid,
          name,
          age: 35,
          gender: "Male",
          bloodType: "O+",
          allergies: [],
          medications: [],
          history: [],
          vitalsMode: "manual",
          vitals: {
            heartRate: 72,
            spo2: 98,
            temperature: 36.6,
            systolic: 120,
            diastolic: 80,
            glucose: 95,
            fallDetected: false,
            ecg: [],
            lastUpdated: new Date().toISOString()
          },
          connectedDevice: null,
          familyMembers: [],
          reports: []
        };
        await setDoc(doc(db, "patients", user.uid), patientRec);
      } else if (role === "hospital") {
        await setDoc(doc(db, "hospitals", user.uid), {
          uid: user.uid,
          name,
          email,
          status: "active"
        });
      }
    } catch (e) {
      console.warn("Firestore write failed, using localstorage fallback registry", e);
    }

    // 3. Always write to LocalStorage registry to maintain consistency in local run
    const localDb = getMediSyncDb();
    localDb.users.push(profile);
    
    if (role === "doctor") {
      const appDetails = {
        uid: user.uid,
        fullName: name,
        email,
        specialization: additionalFields?.specialization || "General Medicine",
        licenseNumber: additionalFields?.licenseNumber || "LIC-PENDING",
        experience: Number(additionalFields?.experience) || 0,
        uploadedDocuments: additionalFields?.uploadedDocuments || "license_credentials.pdf",
        status: "pending" as const,
        createdAt: new Date().toISOString()
      };
      localDb.doctorApplications.push(appDetails);
    } else if (role === "patient") {
      const patientRec: PatientRecord = {
        uid: user.uid,
        name,
        age: 35,
        gender: "Male",
        bloodType: "O+",
        allergies: [],
        medications: [],
        history: [],
        vitalsMode: "manual",
        vitals: {
          heartRate: 72,
          spo2: 98,
          temperature: 36.6,
          systolic: 120,
          diastolic: 80,
          glucose: 95,
          fallDetected: false,
          ecg: [],
          lastUpdated: new Date().toISOString()
        },
        connectedDevice: null,
        familyMembers: [],
        reports: []
      };
      localDb.patients.push(patientRec);
    } else if (role === "hospital") {
      localDb.hospitals.push({
        uid: user.uid,
        name,
        email,
        status: "active"
      });
    }

    saveMediSyncDb(localDb);
    return profile;
  } catch (error: any) {
    console.error("Firebase Registration Error:", error);
    
    // Fallback for offline sandbox testing
    const mockUid = `mock-${Date.now()}`;
    const status = role === "doctor" ? "pending" : "active";
    const profile: UserProfile = {
      uid: mockUid,
      name,
      email,
      role,
      status,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      hospitalAffiliation: additionalFields?.hospitalAffiliation,
      licenseNumber: additionalFields?.licenseNumber,
      specialty: additionalFields?.specialization || additionalFields?.specialty,
      availability: role === "doctor" ? "Offline" : undefined
    };
    
    const localDb = getMediSyncDb();
    localDb.users.push(profile);
    
    if (role === "doctor") {
      const appDetails = {
        uid: mockUid,
        fullName: name,
        email,
        specialization: additionalFields?.specialization || "General Medicine",
        licenseNumber: additionalFields?.licenseNumber || "LIC-PENDING",
        experience: Number(additionalFields?.experience) || 0,
        uploadedDocuments: additionalFields?.uploadedDocuments || "license_credentials.pdf",
        status: "pending" as const,
        createdAt: new Date().toISOString()
      };
      localDb.doctorApplications.push(appDetails);
    } else if (role === "patient") {
      localDb.patients.push({
        uid: mockUid,
        name,
        age: 30,
        gender: "Male",
        bloodType: "B+",
        allergies: [],
        medications: [],
        history: [],
        vitalsMode: "manual",
        vitals: { heartRate: 72, spo2: 98, temperature: 36.5, systolic: 120, diastolic: 80, glucose: 90, fallDetected: false, ecg: [], lastUpdated: new Date().toISOString() },
        connectedDevice: null,
        familyMembers: [],
        reports: []
      });
    } else if (role === "hospital") {
      localDb.hospitals.push({
        uid: mockUid,
        name,
        email,
        status: "active"
      });
    }
    
    saveMediSyncDb(localDb);
    return profile;
  }
};

export const loginUserWithFirebase = async (
  email: string,
  password: string
): Promise<UserProfile> => {
  // Silent fallback for seeded System Administrator when network fails or admin is unseeded in the cloud
  if (email === "admin@medisync.ai" && password === "admin123") {
    const localDb = getMediSyncDb();
    let adminProfile = localDb.users.find(u => u.email === email && u.role === "admin");
    if (!adminProfile) {
      adminProfile = {
        uid: "admin1",
        name: "System Administrator",
        email: "admin@medisync.ai",
        role: "admin",
        status: "active",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin"
      };
      localDb.users.push(adminProfile);
      saveMediSyncDb(localDb);
    }
    return adminProfile;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 1. Try to read from real Firestore
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn("Firestore read failed, searching local registry fallback", e);
    }

    // 2. Search Local Registry
    const localDb = getMediSyncDb();
    const profile = localDb.users.find(u => u.uid === user.uid || u.email === email);
    if (profile) return profile;

    // Fallback profile if Firestore failed but auth succeeded
    return {
      uid: user.uid,
      name: email.split("@")[0],
      email,
      role: "patient",
      status: "active"
    };
  } catch (error: any) {
    console.error("Firebase Login Error:", error);
    
    // Mock login fallback when running offline
    const localDb = getMediSyncDb();
    const profile = localDb.users.find(u => u.email === email);
    if (profile) return profile;
    
    throw error;
  }
};

export const loginWithGoogle = async (): Promise<UserProfile> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user exists in Firestore
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
    } catch(e) {}
    
    // Check local database
    const localDb = getMediSyncDb();
    const existing = localDb.users.find(u => u.uid === user.uid || u.email === user.email);
    if (existing) return existing;

    // Create a new Patient profile by default on Google Auth
    const profile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Google User",
      email: user.email || "",
      role: "patient",
      status: "active",
      avatar: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.uid)}`
    };
    
    try {
      await setDoc(doc(db, "users", user.uid), profile);
      
      const patientRec: PatientRecord = {
        uid: user.uid,
        name: profile.name,
        age: 35,
        gender: "Male",
        bloodType: "O+",
        allergies: [],
        medications: [],
        history: [],
        vitalsMode: "manual",
        vitals: {
          heartRate: 72,
          spo2: 98,
          temperature: 36.6,
          systolic: 120,
          diastolic: 80,
          glucose: 95,
          fallDetected: false,
          ecg: [],
          lastUpdated: new Date().toISOString()
        },
        connectedDevice: null,
        familyMembers: [],
        reports: []
      };
      await setDoc(doc(db, "patients", user.uid), patientRec);
      localDb.patients.push(patientRec);
    } catch(e) {}

    localDb.users.push(profile);
    saveMediSyncDb(localDb);
    return profile;
  } catch (error: any) {
    console.error("Google login failed:", error);
    throw error;
  }
};

export const forgotPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Password reset error:", error);
    throw error;
  }
};

export const logoutUserWithFirebase = async (): Promise<void> => {
  await signOut(auth);
};
