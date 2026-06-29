import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth'
import { auth, isFirebaseConfigured, googleProvider } from '../services/firebase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isGuest,     setIsGuest]     = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured) { setAuthLoading(false); return }
    return onAuthStateChanged(auth, u => {
      setUser(u)
      if (u) setIsGuest(false)
      setAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = () => {
    if (!isFirebaseConfigured || !googleProvider)
      return Promise.reject({ code: 'auth/not-configured' })
    return signInWithPopup(auth, googleProvider)
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
    <Ctx.Provider value={{ user, authLoading, isFirebaseConfigured, isGuest, loginWithGoogle, loginAsGuest, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
