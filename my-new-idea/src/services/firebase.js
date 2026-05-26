import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = !!(config.apiKey && config.projectId)

let _auth    = null
let _db      = null
let _storage = null

if (isFirebaseConfigured) {
  const app = initializeApp(config)
  _auth    = getAuth(app)
  _db      = getFirestore(app)
  _storage = getStorage(app)
}

export const auth    = _auth
export const db      = _db
export const storage = _storage
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null
