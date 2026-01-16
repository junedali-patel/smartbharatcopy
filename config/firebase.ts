import { initializeApp, getApps, getApp } from 'firebase/app';
import { Platform } from 'react-native';

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

// Initialize Firebase app (this is safe, doesn't require native modules)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Lazy initialize Firestore and Auth - only on web or production builds
let db: any = null;
let auth: any = null;
let messaging: any = null;
let isInitialized = false;

const initializeServices = () => {
  if (isInitialized) return;
  isInitialized = true;

  try {
    if (Platform.OS === 'web') {
      // Web platform - safe to use full Firebase
      const { getFirestore } = require('firebase/firestore');
      const { getAuth: FirebaseGetAuth } = require('firebase/auth');
      
      db = getFirestore(app);
      auth = FirebaseGetAuth(app);
      
      // Skip Firebase Messaging on web as it's not supported
      messaging = null;
    } else {
      // Native platform - use minimal approach
      try {
        const { getFirestore } = require('firebase/firestore');
        const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
        const { getAuth: FirebaseGetAuth } = require('firebase/auth');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        
        db = getFirestore(app);
        
        try {
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        } catch (error) {
          // Already initialized or Expo Go - use getAuth as fallback
          try {
            auth = FirebaseGetAuth(app);
          } catch (e) {
            console.warn('Firebase Auth not available on this platform (Expo Go)');
            auth = null;
          }
        }
      } catch (error) {
        console.warn('Firebase services initialization failed on native platform:', error);
        // Gracefully degrade - these will be null on Expo Go
        db = null;
        auth = null;
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase services:', error);
  }
};

// Helper functions to get instances (used by Firebase functions like collection(), getDocs(), etc.)
const getDb = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return db;
};

const getAuth = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return auth;
};

const getMessaging = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return messaging;
};

export { getDb, getAuth, getMessaging, app as default };

// Re-export auth functions for convenience
export { onAuthStateChanged } from 'firebase/auth';