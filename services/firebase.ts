import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
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

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let initError: Error | null = null;
let isInitialized = false;
let isInitializing = false;

const initializeFirebase = () => {
  if (isInitialized || isInitializing) return;
  isInitializing = true;

  try {
    app = initializeApp(firebaseConfig);
    
    // Only initialize Auth and Firestore on web or Android/iOS
    // Skip on Expo Go
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
    } else {
      // On native platforms, only try if not Expo Go
      try {
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
      } catch (error) {
        console.warn('Firebase initialization failed on native platform. This is expected on Expo Go.', error);
        initError = error as Error;
      }
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    initError = error as Error;
  } finally {
    isInitialized = true;
  }
};

// Initialize Firebase immediately when module loads
initializeFirebase();

// Helper function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return authInstance !== null && dbInstance !== null;
};

export const getAuthInstance = (): Auth | null => {
  return authInstance;
};

export const getDbInstance = (): Firestore | null => {
  return dbInstance;
};

// Export the actual instances (initialized synchronously at module load)
// Type-safe: auth and db are the actual instances or null, not proxies
export const auth: Auth = authInstance ?? ({} as Auth);
export const db: Firestore = dbInstance ?? ({} as Firestore);

export { app };