import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
} from 'firebase/auth'
import { auth, isFirebaseConfigured, googleProvider } from '../services/firebase'
import { loadProjects, saveProject, deleteProject } from '../services/projectService'
import { loadPrompts, savePrompt, deletePrompt } from '../services/promptsService'
import { loadWebsites, saveWebsite, updateWebsite, deleteWebsite } from '../services/websiteService'

const Ctx = createContext(null)

// ── LocalStorage helpers ──────────────────────────────────────────
const LS_PROJ     = 'bb_projects'
const LS_PROMPTS  = 'bb_prompts'
const LS_WEBSITES = 'bb_websites'

const lsGet = key => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }
const lsSet = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null)
  const [authLoading,    setAuthLoading]    = useState(true)
  const [projects,       setProjects]       = useState([])
  const [projLoading,    setProjLoading]    = useState(false)
  const [prompts,        setPrompts]        = useState([])
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [websites,       setWebsites]       = useState([])
  const [sitesLoading,   setSitesLoading]   = useState(false)

  // ── Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setProjects(lsGet(LS_PROJ))
      setPrompts(lsGet(LS_PROMPTS))
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        setProjLoading(true)
        setPromptsLoading(true)
        setSitesLoading(true)
        const [projs, proms, sites] = await Promise.allSettled([
          loadProjects(u.uid),
          loadPrompts(u.uid),
          loadWebsites(u.uid),
        ])
        setProjects(projs.status === 'fulfilled' ? projs.value  : lsGet(LS_PROJ))
        setPrompts(proms.status === 'fulfilled'  ? proms.value  : lsGet(LS_PROMPTS))
        setWebsites(sites.status === 'fulfilled' ? sites.value  : lsGet(LS_WEBSITES))
        setProjLoading(false)
        setPromptsLoading(false)
        setSitesLoading(false)
      } else {
        setProjects(lsGet(LS_PROJ))
        setPrompts(lsGet(LS_PROMPTS))
        setWebsites(lsGet(LS_WEBSITES))
      }
      setAuthLoading(false)
    })
  }, [])

  // ── Persist to localStorage when guest ────────────────────────
  useEffect(() => { if (!user) lsSet(LS_PROJ,     projects) }, [projects, user])
  useEffect(() => { if (!user) lsSet(LS_PROMPTS,  prompts)  }, [prompts,  user])
  useEffect(() => { if (!user) lsSet(LS_WEBSITES, websites) }, [websites, user])

  // ── Auth actions ──────────────────────────────────────────────
  const login  = (email, pw) => {
    if (!isFirebaseConfigured) return Promise.reject({ code: 'auth/not-configured' })
    return signInWithEmailAndPassword(auth, email, pw)
  }
  const signup = (email, pw) => {
    if (!isFirebaseConfigured) return Promise.reject({ code: 'auth/not-configured' })
    return createUserWithEmailAndPassword(auth, email, pw)
  }
  const logout = async () => {
    if (isFirebaseConfigured) await signOut(auth)
    setUser(null)
    setProjects(lsGet(LS_PROJ))
    setPrompts(lsGet(LS_PROMPTS))
    setWebsites(lsGet(LS_WEBSITES))
  }
  const loginWithGoogle = () => {
    if (!isFirebaseConfigured || !googleProvider) return Promise.reject({ code: 'auth/not-configured' })
    return signInWithPopup(auth, googleProvider)
  }

  // ── Project actions ───────────────────────────────────────────
  const addProject = useCallback(async project => {
    const entry = { ...project, savedAt: new Date().toLocaleDateString('he-IL') }
    if (user && isFirebaseConfigured) {
      try {
        const saved = await saveProject(user.uid, entry)
        setProjects(p => [saved, ...p.slice(0, 19)])
        return saved.id
      } catch (e) {
        console.error('saveProject failed:', e)
      }
    }
    const id = Date.now().toString()
    setProjects(prev => [{ ...entry, id }, ...prev.slice(0, 19)])
    return id
  }, [user])

  const removeProject = useCallback(async id => {
    if (user && isFirebaseConfigured) {
      try { await deleteProject(id) } catch (e) { console.error('deleteProject failed:', e) }
    }
    setProjects(p => p.filter(x => x.id !== id))
  }, [user])

  // ── Prompt history actions ────────────────────────────────────
  const addPrompt = useCallback(async data => {
    const entry = { ...data, generatedAt: new Date().toLocaleDateString('he-IL') }
    if (user && isFirebaseConfigured) {
      try {
        const saved = await savePrompt(user.uid, entry)
        setPrompts(p => [saved, ...p.slice(0, 49)])
        return saved.id
      } catch (e) {
        console.error('savePrompt failed:', e)
      }
    }
    const id = Date.now().toString()
    setPrompts(prev => [{ ...entry, id }, ...prev.slice(0, 29)])
    return id
  }, [user])

  const removePrompt = useCallback(async id => {
    if (user && isFirebaseConfigured) {
      try { await deletePrompt(id) } catch (e) { console.error('deletePrompt failed:', e) }
    }
    setPrompts(p => p.filter(x => x.id !== id))
  }, [user])

  // ── Website actions ───────────────────────────────────────────
  const addWebsite = useCallback(async website => {
    const entry = { ...website, updatedAt: new Date().toISOString() }
    if (user && isFirebaseConfigured) {
      try {
        const saved = await saveWebsite(user.uid, entry)
        setWebsites(w => [saved, ...w.slice(0, 19)])
        return saved
      } catch (e) { console.error('saveWebsite failed:', e) }
    }
    const id = Date.now().toString()
    const local = { ...entry, id }
    setWebsites(w => [local, ...w.slice(0, 19)])
    return local
  }, [user])

  const updateWebsiteCtx = useCallback(async website => {
    if (user && isFirebaseConfigured) {
      try { await updateWebsite(website) } catch (e) { console.error('updateWebsite failed:', e) }
    }
    setWebsites(w => w.map(x => x.id === website.id ? website : x))
    return website
  }, [user])

  const removeWebsite = useCallback(async id => {
    if (user && isFirebaseConfigured) {
      try { await deleteWebsite(id) } catch (e) { console.error('deleteWebsite failed:', e) }
    }
    setWebsites(w => w.filter(x => x.id !== id))
  }, [user])

  return (
    <Ctx.Provider value={{
      user, authLoading, isFirebaseConfigured,
      login, signup, logout, loginWithGoogle,
      projects, projLoading, addProject, removeProject,
      prompts, promptsLoading, addPrompt, removePrompt,
      websites, sitesLoading, addWebsite, updateWebsiteCtx, removeWebsite,
    }}>
      {!authLoading && children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
