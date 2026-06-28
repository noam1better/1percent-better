import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase config from environment variables
// Copy your values from Firebase Console -> Project Settings
// Add them to your .env file with VITE_ prefix:
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// etc.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Validate config
const requiredKeys = ['apiKey', 'authDomain', 'projectId']
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.error(`Missing Firebase config: VITE_FIREBASE_${key.toUpperCase()} not set in .env`)
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export Firestore and Auth instances
export const db = getFirestore(app)
export const auth = getAuth(app)

export default app
