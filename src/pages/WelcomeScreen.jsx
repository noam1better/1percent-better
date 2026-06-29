import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { loadProfile } from '../services/focusTriggerService'

const S = {
  page: { minHeight: '100vh', background: '#0e0e16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' },
  card: { width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center' },
  logo: { width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 1rem' },
  h1: { color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.35rem' },
  sub: { color: 'rgba(241,245,249,0.45)', fontSize: '0.9rem', marginBottom: '2rem' },
  btn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: '2rem', transition: 'background 0.15s' },
  err: { color: '#f87171', fontSize: '0.8rem', marginTop: '0.75rem' },
  legal: { color: 'rgba(255,255,255,0.22)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 },
}

export default function WelcomeScreen() {
  const { user, authLoading, loginWithGoogle, loginAsGuest } = useAuth()
  const { lang, setLang, t } = useLang()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || !user) return
    loadProfile(user.uid)
      .then(p => navigate(p?.onboardingDone ? '/dashboard' : '/setup', { replace: true }))
      .catch(() => navigate('/setup', { replace: true }))
  }, [user, authLoading, navigate])

  async function handleGoogle() {
    setError(''); setLoading(true)
    try { await loginWithGoogle() }
    catch { setError(t.welcome.error); setLoading(false) }
  }

  function handleGuest() {
    loginAsGuest()
    navigate('/dashboard', { replace: true })
  }

  const isHe = lang === 'he'

  return (
    <div style={S.page}>
      {/* Language toggle */}
      <button
        onClick={() => setLang(isHe ? 'en' : 'he')}
        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(241,245,249,0.7)', fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.65rem', cursor: 'pointer', letterSpacing: '0.03em' }}
      >
        {isHe ? 'EN' : 'עב'}
      </button>

      <div style={S.card}>
        <div style={S.logo}>⚡</div>
        <h1 style={S.h1}>{t.welcome.title}</h1>
        <p style={S.sub}>{t.welcome.subtitle}</p>

        <div style={{ marginBottom: '0.5rem' }}>
          {t.welcome.features.map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'rgba(241,245,249,0.6)', fontSize: '0.875rem', marginBottom: '0.55rem', textAlign: isHe ? 'right' : 'left' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.11)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
        >
          {loading
            ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
            : <GoogleIcon />}
          {loading ? t.welcome.signingIn : t.welcome.signIn}
        </button>

        <button
          onClick={handleGuest}
          disabled={loading}
          style={{ ...S.btn, marginTop: '0.65rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(241,245,249,0.38)', fontSize: '0.83rem', opacity: loading ? 0.4 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.color = 'rgba(241,245,249,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(241,245,249,0.38)' }}
        >
          👁 המשך כאורח
        </button>

        {error && <p style={S.err}>{error}</p>}

        <p style={S.legal}>
          {t.welcome.legalPre}{' '}
          <a href="/terms" style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'underline' }}>{t.welcome.terms}</a>
          {t.welcome.legalAnd}
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'underline' }}>{t.welcome.privacy}</a>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
