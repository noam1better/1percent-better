import { createContext, useContext, useState, useEffect } from 'react'
import t from '../i18n/translations'

const LangCtx = createContext()

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ft_lang') || 'he')

  function setLang(l) {
    localStorage.setItem('ft_lang', l)
    setLangState(l)
    document.documentElement.dir  = l === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  return (
    <LangCtx.Provider value={{ lang, setLang, t: t[lang] }}>
      {children}
    </LangCtx.Provider>
  )
}

export const useLang = () => useContext(LangCtx)
