import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth'
import { auth, isFirebaseConfigured, googleProvider } from '../services/firebase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) { setAuthLoading(false); return }
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = () => {
    if (!isFirebaseConfigured || !googleProvider)
      return Promise.reject({ code: 'auth/not-configured' })
    return signInWithPopup(auth, googleProvider)
  }

  const logout = async () => {
    if (isFirebaseConfigured) await signOut(auth)
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, authLoading, isFirebaseConfigured, loginWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
