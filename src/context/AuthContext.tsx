"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isDemoMode } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // In Demo Mode, retrieve "logged in user" from localStorage if exists
      const savedUser = localStorage.getItem("demo_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
        
        const allUsers = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
        const foundUser = allUsers.find((userObj: any) => userObj.email === u.email);
        
        if (u.email === "tarunkummaryenuganti07@gmail.com") {
          setRole("admin");
        } else if (foundUser) {
          setRole(foundUser.role);
        } else {
          setRole(u.role || "viewer");
        }
      }
      setLoading(false);
      return;
    }

// No changes to main useEffect yet except formatting
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      setUser(currentUser);
      
      if (currentUser) {
        const isAdmin = currentUser.email === "tarunkummaryenuganti07@gmail.com";
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        if (userDoc.exists()) {
          const currentRole = userDoc.data().role;
          if (isAdmin && currentRole !== "admin") {
            await setDoc(doc(db, "users", currentUser.uid), { role: "admin" }, { merge: true });
            setRole("admin");
          } else {
            setRole(currentRole);
          }
        } else {
          const defaultRole = isAdmin ? "admin" : "viewer";
          await setDoc(doc(db, "users", currentUser.uid), {
            uid: currentUser.uid,
            name: currentUser.displayName || "User",
            email: currentUser.email,
            role: defaultRole,
            createdAt: new Date().toISOString()
          });
          setRole(defaultRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (isDemoMode) return alert("Google Login not available in Demo Mode. Use Email login.");
    
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isDemoMode) {
      const safeEmail = email.trim().toLowerCase();
      const allUsers = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
      const foundUser = allUsers.find((u: any) => u?.email?.trim()?.toLowerCase() === safeEmail);
      
      if (!foundUser && safeEmail !== "tarunkummaryenuganti07@gmail.com") {
        throw new Error("auth/user-not-found");
      }

      const assignedRole = safeEmail === "tarunkummaryenuganti07@gmail.com" ? "admin" : (foundUser ? foundUser.role : "viewer");
      const mockUser = {
        uid: foundUser ? foundUser.id : "demo_admin_uid",
        email: safeEmail,
        displayName: foundUser ? foundUser.name : "Master Admin",
        role: assignedRole
      } as any;
      setUser(mockUser);
      setRole(assignedRole);
      localStorage.setItem("demo_user", JSON.stringify(mockUser));
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      throw error; // Let Login component handle "User not found"
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string) => {
    if (isDemoMode) {
      const allUsers = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
      if (allUsers.find((u: any) => u.email === email)) {
        throw new Error("auth/email-already-in-use");
      }

      const role = email === "tarunkummaryenuganti07@gmail.com" ? "admin" : "viewer";
      const newUser = { id: "demo_" + Date.now(), name, email, role };
      allUsers.push(newUser);
      localStorage.setItem("temple_demo_users_list", JSON.stringify(allUsers));
      
      // Auto login
      const mockUser = { uid: newUser.id, email, displayName: name, role } as any;
      setUser(mockUser);
      setRole(role);
      localStorage.setItem("demo_user", JSON.stringify(mockUser));
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      role: email === "tarunkummaryenuganti07@gmail.com" ? "admin" : "viewer",
      createdAt: new Date().toISOString()
    });
  };

  const logout = async () => {
    if (isDemoMode) {
      setUser(null);
      setRole(null);
      localStorage.removeItem("demo_user");
      return;
    }
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
