// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHEAR5YTypCBOAvfWkGD6w_eg3Onn2xWg",
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

// Lazy initialize Firestore, Auth, and Storage - only when needed
let dbInstance: any = null;
let authInstance: any = null;
let storageInstance: any = null;
let isInitialized = false;
let isInitializing = false;

const initializeServices = () => {
  if (isInitialized || isInitializing) return;
  isInitializing = true;

  try {
    if (Platform.OS === 'web') {
      // Web platform - safe to initialize all services
      const { getFirestore } = require('firebase/firestore');
      const { getAuth } = require('firebase/auth');
      const { getStorage } = require('firebase/storage');

      dbInstance = getFirestore(app);
      authInstance = getAuth(app);
      storageInstance = getStorage(app);
    } else {
      // Native platform - try to initialize, but gracefully fail on Expo Go
      try {
        const { getFirestore } = require('firebase/firestore');
        const { getAuth } = require('firebase/auth');
        const { getStorage } = require('firebase/storage');

        dbInstance = getFirestore(app);
        authInstance = getAuth(app);
        storageInstance = getStorage(app);
      } catch (error) {
        console.warn('Firebase services failed to initialize on native platform (expected on Expo Go):', error);
        // Leave as null - will be handled by proxy objects
      }
    }
  } catch (error) {
    console.error('Firebase service initialization failed:', error);
  } finally {
    isInitialized = true;
  }
};

// Initialize immediately on module load
initializeServices();

// Helper functions to get instances
export const getDbInstance = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return dbInstance;
};

export const getAuthInstance = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return authInstance;
};

export const getStorageInstance = () => {
  if (!isInitialized) {
    initializeServices();
  }
  return storageInstance;
};

// Create proxy objects that handle null gracefully
export const db = new Proxy({}, {
  get(target, prop) {
    if (!isInitialized) {
      initializeServices();
    }
    if (dbInstance && prop in dbInstance) {
      return (dbInstance as any)[prop];
    }
    return undefined;
  }
});

export const auth = new Proxy({}, {
  get(target, prop) {
    if (!isInitialized) {
      initializeServices();
    }
    if (authInstance && prop in authInstance) {
      return (authInstance as any)[prop];
    }
    if (prop === 'currentUser') {
      return authInstance?.currentUser ?? null;
    }
    return undefined;
  }
});

export const storage = new Proxy({}, {
  get(target, prop) {
    if (!isInitialized) {
      initializeServices();
    }
    if (storageInstance && prop in storageInstance) {
      return (storageInstance as any)[prop];
    }
    return undefined;
  }
});
