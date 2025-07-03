import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);