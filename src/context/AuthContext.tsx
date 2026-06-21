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
  getStorageData, 
  setStorageData 
} from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  forgotPassword: (email: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserProfile["role"], fields?: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
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
        // Fetch or reconstruct profile
        const dbUser = getStorageData("users", []).find((u: UserProfile) => u.uid === firebaseUser.uid || u.email === firebaseUser.email);
        if (dbUser) {
          setUser(dbUser);
          setStorageData("activeUser", dbUser);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
