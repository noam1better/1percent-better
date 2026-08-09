import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, isFirebaseConfigured, googleProvider } from '../services/firebase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isGuest,     setIsGuest]     = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured) { setAuthLoading(false); return }
    // Handle redirect result on page load (signInWithRedirect flow)
    getRedirectResult(auth).catch(() => {})
    return onAuthStateChanged(auth, u => {
      setUser(u)
      if (u) setIsGuest(false)
      setAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !googleProvider)
      return Promise.reject({ code: 'auth/not-configured' })
    try {
      return await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // Popup blocked or unsupported (PWA, Safari, some mobile browsers) — fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-cancelled' || err.code === 'auth/cancelled-popup-request') {
        return signInWithRedirect(auth, googleProvider)
      }
      throw err
    }
  }

  const loginWithEmail = (email, password) => {
    if (!isFirebaseConfigured) return Promise.reject({ code: 'auth/not-configured' })
    return signInWithEmailAndPassword(auth, email, password)
  }

  const registerWithEmail = (email, password) => {
    if (!isFirebaseConfigured) return Promise.reject({ code: 'auth/not-configured' })
    return createUserWithEmailAndPassword(auth, email, password)
  }

  const loginAsGuest = () => {
    setIsGuest(true)
    setUser(null)
  }

  const logout = async () => {
    if (isFirebaseConfigured && !isGuest) await signOut(auth)
    setUser(null)
    setIsGuest(false)
  }

  return (
    <Ctx.Provider value={{ user, authLoading, isFirebaseConfigured, isGuest, loginWithGoogle, loginWithEmail, registerWithEmail, loginAsGuest, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
