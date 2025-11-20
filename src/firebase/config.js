// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration object
// These values come from your Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication (optional, if you want to use Firebase Auth)
export const auth = getAuth(app);

export default app;

// Helpful debug export: expose the projectId so UI can display it for troubleshooting
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

// Log project id at startup to help locate which project is in use (dev/preview mismatch)
try {
  // Log only the project id to avoid leaking secrets in console unnecessarily
  // This helps detect when Netlify preview points to a different Firestore project.
  // eslint-disable-next-line no-console
  console.info('[Firebase] projectId:', firebaseConfig.projectId);
} catch (e) {
  // ignore
}
