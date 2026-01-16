import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, getAuthInstance, getDbInstance } from '../services/firebase';

interface User {
  uid: string;
  email: string | null;
  profile?: UserProfile;
}

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  location: {
    state: string;
    district: string;
    village: string;
  };
  soilType: string;
  landSize: number;
  irrigationMethod: string;
  annualRainfall: number;
  farmingExperience: number;
  occupation: string;
  preferredCrop: string;
  farmingType: string;
  hasLivestock: boolean;
  hasFertilizersPesticides: boolean;
  governmentSchemes: string;
  voiceAssistantLanguage: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth initialization if Firebase is not available (e.g., Expo Go)
    if (!auth || typeof onAuthStateChanged !== 'function') {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const userProfile = userDoc.data() as UserProfile | undefined;

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              profile: userProfile,
            });
          } catch (error) {
            console.warn('Failed to load user profile:', error);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } catch (error) {
      console.warn('Failed to setup auth listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not available');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not available');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    if (!auth) throw new Error('Firebase Auth is not available');
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (profile: UserProfile) => {
    if (!user) throw new Error('No user logged in');
    if (!db) throw new Error('Firebase Firestore is not available');

    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      setUser(prev => prev ? { ...prev, profile } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut: signOutUser,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 