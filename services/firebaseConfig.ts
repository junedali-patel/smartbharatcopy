// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAVJXEaWZytJomJYcthPmg9Lag7nzJ5ths",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "appa-ad38a.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "appa-ad38a",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "appa-ad38a.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "623892476246",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:623892476246:web:0be29aa4c7514144be26f7",
};

// Initialize Firebase
let app;

// Check if Firebase app is already initialized
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
