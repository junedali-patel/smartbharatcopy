import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';

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
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let messaging: Messaging | null = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Initialize Firestore
  db = getFirestore(app);

  // Initialize Auth
  auth = getAuth(app);

  // Initialize Messaging (only in browser environment)
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { db, auth, messaging };
export default app; 