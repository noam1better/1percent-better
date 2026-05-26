import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { db, isFirebaseConfigured } from '../services/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import WebsitePreview from '../components/website/WebsitePreview'
import { recordVisit } from '../services/analyticsService'
import { FONTS } from '../engine/websiteSchema'

export default function PublicSitePage() {
  const { slug } = useParams()
  const [website, setWebsite] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    async function load() {
      // 1. Firebase
      if (isFirebaseConfigured && db) {
        try {
          const q = query(collection(db, 'websites'), where('slug', '==', slug), where('published', '==', true), limit(1))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const site = { id: snap.docs[0].id, ...snap.docs[0].data() }
            setWebsite(site); setStatus('found')
            recordVisit(site.id)
            return
          }
        } catch {}
      }
      // 2. localStorage fallback
      try {
        const all = JSON.parse(localStorage.getItem('bb_websites')) || []
        const site = all.find(w => w.slug === slug && w.published)
        if (site) { setWebsite(site); setStatus('found'); recordVisit(site.id); return }
      } catch {}
      setStatus('notfound')
    }
    load()
  }, [slug])

  // Inject font
  useEffect(() => {
    if (!website) return
    const fontKey = website.theme?.font || 'heebo'
    const fontUrl = FONTS[fontKey]?.url
    if (fontUrl && !document.querySelector(`link[data-bb-font="${fontKey}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = fontUrl
      link.setAttribute('data-bb-font', fontKey)
      document.head.appendChild(link)
    }
  }, [website])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040c18', gap: 16 }}>
        <div className="spinner" style={{ width: 38, height: 38, borderWidth: 3, borderColor: 'rgba(212,175,55,.2)', borderTopColor: '#d4af37' }} />
        <p style={{ color: '#4a6585', fontSize: 14, fontFamily: 'inherit' }}>טוען אתר...</p>
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040c18', color: '#e8edf4', textAlign: 'center', padding: 32, fontFamily: 'Heebo, sans-serif' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, margin: '0 0 8px' }}>האתר לא נמצא</h1>
        <p style={{ color: '#4a6585', marginBottom: 28, margin: '0 0 28px' }}>הכתובת שגויה או האתר טרם פורסם.</p>
        <a href="/" style={{ color: '#d4af37', textDecoration: 'none', fontSize: 14, border: '1px solid rgba(212,175,55,.3)', padding: '10px 22px', borderRadius: 10 }}>← חזרה לדף הבית</a>
      </div>
    )
  }

  return (
    <>
      <SEOHead website={website} />
      <WebsitePreview website={website} editMode={false} />
      <a
        href="/"
        dir="rtl"
        style={{
          position: 'fixed', bottom: 14, right: 14, zIndex: 100,
          background: 'rgba(4,12,24,.88)', border: '1px solid rgba(212,175,55,.22)',
          color: '#d4af37', fontSize: 11, fontWeight: 700, padding: '5px 11px',
          borderRadius: 999, textDecoration: 'none',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        נוצר עם BusinessBuilder AI ✨
      </a>
    </>
  )
}

function SEOHead({ website }) {
  useEffect(() => {
    if (!website) return
    const seo = website.seo || {}
    document.title = seo.title || website.name || 'BusinessBuilder'
    const setMeta = (name, content) => {
      if (!content) return
      let el = document.querySelector(`meta[name="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    const setOG = (prop, content) => {
      if (!content) return
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', seo.description)
    setMeta('keywords', seo.keywords)
    setOG('og:title', seo.title || website.name)
    setOG('og:description', seo.description)
    setOG('og:type', 'website')
  }, [website])
  return null
}
