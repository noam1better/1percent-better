import { useState, useEffect, useRef } from 'react'

const DISMISSED_KEY = 'prime_a2hs_dismissed'

export default function AddToHomeScreen() {
  const [show,          setShow]  = useState(false)
  const [isIOS,         setIOS]   = useState(false)
  const deferredPrompt            = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIOS(ios)

    if (ios) {
      setShow(true)
    } else {
      const handler = e => {
        e.preventDefault()
        deferredPrompt.current = e
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function install() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') setShow(false)
    deferredPrompt.current = null
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 4000,
      background: '#1a1a2e', border: '1px solid rgba(196,121,90,0.35)',
      borderRadius: 16, padding: '1rem 1rem 1rem 1.1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      animation: 'slide-up 0.28s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: 2 }}>📲</span>

        <div style={{ flex: 1 }}>
          <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem', margin: '0 0 0.2rem' }}>
            הוסף את PRIME למסך הבית
          </p>

          {isIOS ? (
            <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.75rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
              לחץ על{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 5, padding: '1px 5px', fontSize: '0.8rem' }}>
                <svg width="12" height="14" viewBox="0 0 24 26" fill="none" style={{ display: 'inline' }}>
                  <path d="M12 1v16M6 7l6-6 6 6" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="2" y="10" width="20" height="14" rx="3" stroke="#60a5fa" strokeWidth="2"/>
                </svg>
                שתף
              </span>
              {' '}ואז{' '}
              <strong style={{ color: 'rgba(241,245,249,0.8)' }}>«הוסף למסך הבית»</strong>
            </p>
          ) : (
            <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
              גישה מהירה ישירות מהמסך הראשי, ללא דפדפן.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isIOS && (
              <button
                onClick={install}
                className="btn-primary btn-tactile"
                style={{ flex: 1, padding: '0.55rem 0.8rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 800 }}
              >
                התקן עכשיו
              </button>
            )}
            <button
              onClick={dismiss}
              className="btn-tactile"
              style={{
                flex: isIOS ? 1 : 'none',
                padding: '0.55rem 0.9rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(241,245,249,0.4)', cursor: 'pointer',
              }}
            >
              {isIOS ? 'הבנתי ←' : 'אחר כך'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
