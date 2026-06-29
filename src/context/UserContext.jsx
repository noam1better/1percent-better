import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'ft_user_prefs'

const DEFAULT_PREFS = {
  energy:           null,   // 'low' | 'medium' | 'high'
  timeAvail:        null,   // '15' | '30' | '60'
  focusGoal:        null,
  recommendedTrack: null,
}

const Ctx = createContext(null)

export function UserProvider({ children }) {
  const [prefs, setPrefsState] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
    catch { return DEFAULT_PREFS }
  })

  function setPrefs(update) {
    setPrefsState(prev => {
      const next = { ...prev, ...update }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function clearPrefs() {
    setPrefsState(DEFAULT_PREFS)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <Ctx.Provider value={{ prefs, setPrefs, clearPrefs }}>
      {children}
    </Ctx.Provider>
  )
}

export const useUserPrefs = () => useContext(Ctx)
