import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Web config: these values identify the public client app.
// The API key is loaded from the local Vite environment file; it is still public in the browser bundle.
// Access to user data is protected by Firebase Authentication and Firestore Rules.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'gymtracker-87854.firebaseapp.com',
  projectId: 'gymtracker-87854',
  storageBucket: 'gymtracker-87854.firebasestorage.app',
  messagingSenderId: '172993024608',
  appId: '1:172993024608:web:78507dc5b27483df31e905',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
