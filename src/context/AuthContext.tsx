"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  auth, 
  UserProfile, 
  loginUserWithFirebase, 
  registerUserWithFirebase, 
  logoutUserWithFirebase, 
  loginWithGoogle as loginWithGoogleApi,
  forgotPassword as forgotPasswordApi,
  updateUserProfile,
  getStorageData, 
  setStorageData,
  db
} from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  forgotPassword: (email: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserProfile["role"], fields?: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (fields: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check local session storage first for instant load
    const storedUser = getStorageData("activeUser", null);
    if (storedUser) {
      setUser(storedUser);
    }

    // 2. Listen to Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profileLoaded = false;
        // Try fetching fresh profile from Firestore to catch Admin status approvals
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            let profile = docSnap.data() as UserProfile;
            
            // SELF-HEAL: If Admin approved in localStorage but Firestore failed due to rules,
            // the Doctor can use their own write permissions to heal Firestore!
            const localUsers = getStorageData("users", []);
            const localProfile = localUsers.find((u: UserProfile) => u.uid === profile.uid);
            if (localProfile && localProfile.status === "approved" && profile.status === "pending") {
              profile.status = "approved";
              try { await setDoc(docRef, { status: "approved" }, { merge: true }); } catch (e) {}
            }

            setUser(profile);
            setStorageData("activeUser", profile);
            
            // Sync to local array registry
            const idx = localUsers.findIndex((u: UserProfile) => u.uid === profile.uid);
            if (idx !== -1) localUsers[idx] = profile;
            else localUsers.push(profile);
            setStorageData("users", localUsers);
            profileLoaded = true;
          } else {
            // SELF-HEAL: If document is completely missing in Firestore, create it!
            const localUsers = getStorageData("users", []);
            const localProfile = localUsers.find((u: UserProfile) => u.uid === firebaseUser.uid);
            if (localProfile) {
               try { await setDoc(docRef, localProfile); } catch (e) {}
               setUser(localProfile);
               setStorageData("activeUser", localProfile);
               profileLoaded = true;
            }
          }
        } catch (e) {
          console.warn("Firestore fetch on refresh failed, using local storage", e);
        }

        // Fallback to local storage if Firestore fails
        if (!profileLoaded) {
          const dbUser = getStorageData("users", []).find((u: UserProfile) => u.uid === firebaseUser.uid || u.email === firebaseUser.email);
          if (dbUser) {
            setUser(dbUser);
            setStorageData("activeUser", dbUser);
          }
        }
      } else {
        // If not logged in in Firebase, and also no manual session
        const hasMockSession = localStorage.getItem("medisync_activeUser");
        if (!hasMockSession) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await loginUserWithFirebase(email, password);
      setUser(profile);
      setStorageData("activeUser", profile);
      return profile;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const profile = await loginWithGoogleApi();
      setUser(profile);
      setStorageData("activeUser", profile);
      return profile;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await forgotPasswordApi(email);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserProfile["role"],
    fields?: Partial<UserProfile>
  ) => {
    setLoading(true);
    try {
      const profile = await registerUserWithFirebase(email, password, name, role, fields);
      setUser(profile);
      setStorageData("activeUser", profile);
      return profile;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileFn = async (fields: Partial<UserProfile>) => {
    if (!user) return;
    await updateUserProfile(user.uid, fields);
    const updated = { ...user, ...fields };
    setUser(updated);
    setStorageData("activeUser", updated);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUserWithFirebase();
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("medisync_activeUser");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, forgotPassword, register, logout, updateProfile: updateProfileFn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
