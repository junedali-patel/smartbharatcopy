import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVJXEaWZytJomJYcthPmg9Lag7nzJ5ths",
  authDomain: "appa-ad38a.firebaseapp.com",
  databaseURL: "https://appa-ad38a-default-rtdb.firebaseio.com",
  projectId: "appa-ad38a",
  storageBucket: "appa-ad38a.firebasestorage.app",
  messagingSenderId: "623892476246",
  appId: "1:623892476246:web:0be29aa4c7514144be26f7",
  measurementId: "G-SP687GD64W"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth with AsyncStorage persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If already initialized, get the existing instance
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}

// Initialize Messaging (only in browser environment)
let messaging = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Failed to initialize Firebase Messaging:', error);
  }
}

export { db, auth, messaging };
export default app;