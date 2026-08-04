import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { loadProfile } from '../services/focusTriggerService'

const S = {
  page: { minHeight: '100vh', background: '#0e0e16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' },
  card: { width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center' },
  logo: { width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#e8b800,#facc15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 1rem' },
  h1: { color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.35rem' },
  sub: { color: 'rgba(241,245,249,0.6)', fontSize: '0.9rem', marginBottom: '2rem' },
  btn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.95rem 1.5rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#e8b800,#facc15)', color: '#111', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', marginTop: '2rem', boxShadow: '0 6px 24px rgba(250,204,21,0.38)', transition: 'filter 0.15s, box-shadow 0.15s, transform 0.12s' },
  err: { color: '#f87171', fontSize: '0.8rem', marginTop: '0.75rem' },
  legal: { color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginTop: '1.5rem', lineHeight: 1.5 },
}

function emailAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':        return 'כתובת אימייל לא תקינה'
    case 'auth/user-not-found':       return 'לא נמצא חשבון עם אימייל זה'
    case 'auth/wrong-password':       return 'סיסמה שגויה'
    case 'auth/invalid-credential':   return 'אימייל או סיסמה שגויים'
    case 'auth/email-already-in-use': return 'אימייל כבר רשום — נסה להתחבר'
    case 'auth/weak-password':        return 'הסיסמה חייבת להכיל לפחות 6 תווים'
    case 'auth/too-many-requests':    return 'יותר מדי ניסיונות — נסה שוב מאוחר יותר'
    default:                          return 'שגיאה. נסה שוב.'
  }
}

const TERMS_CONTENT = `תנאי שימוש — PRIME

עדכון אחרון: ינואר 2025

1. קבלת התנאים
השימוש באפליקציית PRIME מהווה הסכמה לתנאים אלה. אם אינך מסכים — אנא הפסק שימוש.

2. שימוש מורשה
השירות מיועד לשימוש אישי בלבד. אין להעתיק, להפיץ, או להשתמש מסחרית בתכנים ללא אישור מפורש.

3. חשבון משתמש
אתה אחראי לשמירת פרטי הגישה לחשבונך ולכל פעילות המתבצעת תחת חשבונך.

4. שינויים בשירות
PRIME שומרת לעצמה את הזכות לשנות, להשהות, או להפסיק כל חלק מהשירות בכל עת, עם הודעה מוקדמת סבירה.

5. הגבלת אחריות
השירות מסופק "כמו שהוא". PRIME לא תישא באחריות לנזקים ישירים או עקיפים הנובעים מהשימוש בשירות.

6. יצירת קשר
לשאלות בנוגע לתנאים אלה: support@prime-app.io`

const PRIVACY_CONTENT = `מדיניות פרטיות — PRIME

עדכון אחרון: ינואר 2025

1. מידע שאנו אוספים
• פרטי חשבון: שם, כתובת אימייל (דרך Google Auth או רישום ישיר)
• נתוני שימוש: התקדמות, XP, הרגלים, ומסלולי אימון
• נתוני מכשיר: סוג דפדפן וגרסה (לצורך תאימות)

2. שימוש במידע
המידע משמש אך ורק להפעלת השירות, שיפור חוויית המשתמש, ושליחת עדכונים רלוונטיים (בהסכמה).

3. שיתוף מידע
אנו לא מוכרים, מעבירים, או מגלים מידע אישי לצדדים שלישיים, למעט כנדרש על פי חוק.

4. אבטחת מידע
המידע מאוחסן בשרתי Firebase/Google ומוצפן בהעברה ובמנוחה.

5. זכויות המשתמש
תוכל לבקש מחיקת חשבונך ומידע אישי בכל עת דרך דף ההגדרות.

6. יצירת קשר
לשאלות בנוגע לפרטיות: privacy@prime-app.io`

function LegalModal({ type, onClose }) {
  const isTerms = type === 'terms'
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: '#0e0e16', borderRadius: '20px 20px 0 0', borderTop: '2px solid rgba(255,255,255,0.1)', padding: '1.5rem 1.5rem 2.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
            {isTerms ? '📄 תנאי שימוש' : '🔒 מדיניות פרטיות'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(241,245,249,0.6)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: '0.3rem 0.7rem', lineHeight: 1 }}
          >✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <pre style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.78rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
            {isTerms ? TERMS_CONTENT : PRIVACY_CONTENT}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function WelcomeScreen() {
  const { user, authLoading, loginWithGoogle, loginWithEmail, registerWithEmail, loginAsGuest } = useAuth()
  const { lang, setLang, t } = useLang()
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [emailMode,   setEmailMode]   = useState(false)
  const [isSignUp,    setIsSignUp]    = useState(false)
  const [emailVal,    setEmailVal]    = useState('')
  const [pwVal,       setPwVal]       = useState('')
  const [emailLoading,setEmailLoading]= useState(false)
  const [emailError,  setEmailError]  = useState('')
  const [legalModal,  setLegalModal]  = useState(null) // 'terms' | 'privacy' | null
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading || !user) return
    loadProfile(user.uid)
      .then(p => {
        const hasProgress = (p?.xp || 0) > 0
          || Object.keys(p?.challenges || {}).some(k => (p.challenges[k]?.daysCompleted || 0) > 0)
          || (p?.triggers || []).length > 0
        navigate((p?.onboardingDone || hasProgress) ? '/dashboard' : '/setup', { replace: true })
      })
      .catch(() => navigate('/setup', { replace: true }))
  }, [user, authLoading, navigate])

  async function handleGoogle() {
    setError(''); setLoading(true)
    try { await loginWithGoogle() }
    catch (err) {
      const code = err?.code || ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('') // user dismissed — not an error
      } else if (code === 'auth/unauthorized-domain') {
        setError('הדומיין לא מורשה ב-Firebase. הוסף את prime-app-84fe0.web.app תחת Authentication → Authorized Domains.')
      } else if (code) {
        setError(`שגיאה: ${code}`)
      } else {
        setError(t.welcome.error)
      }
      setLoading(false)
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setEmailError('')
    if (!emailVal.trim() || !pwVal) { setEmailError('נא למלא אימייל וסיסמה'); return }
    setEmailLoading(true)
    try {
      if (isSignUp) await registerWithEmail(emailVal.trim(), pwVal)
      else          await loginWithEmail(emailVal.trim(), pwVal)
    } catch (err) {
      setEmailError(emailAuthError(err.code))
      setEmailLoading(false)
    }
  }

  function handleGuest() {
    loginAsGuest()
    navigate('/dashboard', { replace: true })
  }

  const isHe = lang === 'he'
  const inputStyle = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f1f5f9', fontSize: '0.88rem', padding: '0.7rem 0.9rem', outline: 'none', direction: 'ltr', marginBottom: '0.6rem' }

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

        {/* Google Sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ ...S.btn, opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(250,204,21,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(250,204,21,0.38)'; e.currentTarget.style.transform = '' }}
        >
          {loading
            ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#111', animation: 'spin 0.8s linear infinite' }} />
            : <GoogleIcon />}
          {loading ? t.welcome.signingIn : t.welcome.signIn}
        </button>
        {error && <p style={S.err}>{error}</p>}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0 0.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.75rem' }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email toggle */}
        {!emailMode ? (
          <button
            onClick={() => setEmailMode(true)}
            style={{ ...S.btn, marginTop: '0.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(241,245,249,0.45)', fontSize: '0.85rem' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(241,245,249,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(241,245,249,0.45)' }}
          >
            ✉️ {isHe ? 'כניסה עם אימייל' : 'Sign in with Email'}
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} style={{ marginTop: '0.25rem' }}>
            <input
              type="email"
              placeholder={isHe ? 'אימייל' : 'Email'}
              value={emailVal}
              onChange={e => { setEmailVal(e.target.value); setEmailError('') }}
              style={inputStyle}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder={isHe ? 'סיסמה (6+ תווים)' : 'Password (6+ chars)'}
              value={pwVal}
              onChange={e => { setPwVal(e.target.value); setEmailError('') }}
              style={{ ...inputStyle, marginBottom: '0.75rem' }}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
            {emailError && <p style={{ ...S.err, marginTop: 0, marginBottom: '0.5rem' }}>{emailError}</p>}
            <button
              type="submit"
              disabled={emailLoading}
              style={{ ...S.btn, marginTop: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 700, opacity: emailLoading ? 0.6 : 1, cursor: emailLoading ? 'not-allowed' : 'pointer' }}
            >
              {emailLoading
                ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                : null}
              {emailLoading ? '...' : isSignUp ? (isHe ? 'צור חשבון' : 'Create Account') : (isHe ? 'כניסה' : 'Sign In')}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.65rem' }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(s => !s); setEmailError('') }}
                style={{ background: 'none', border: 'none', color: 'rgba(165,180,252,0.7)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
              >
                {isSignUp ? (isHe ? 'כבר יש לי חשבון — כניסה' : 'Already have an account? Sign In') : (isHe ? 'אין לי חשבון — הרשמה' : "Don't have an account? Sign Up")}
              </button>
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.78rem' }}>·</span>
              <button
                type="button"
                onClick={() => { setEmailMode(false); setEmailError(''); setEmailVal(''); setPwVal('') }}
                style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.25)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
              >
                {isHe ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        <button
          onClick={handleGuest}
          disabled={loading}
          style={{ ...S.btn, marginTop: '0.65rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(241,245,249,0.38)', fontSize: '0.83rem', opacity: loading ? 0.4 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.color = 'rgba(241,245,249,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(241,245,249,0.38)' }}
        >
          👁 המשך כאורח
        </button>

        <p style={S.legal}>
          {t.welcome.legalPre}{' '}
          <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>{t.welcome.terms}</button>
          {t.welcome.legalAnd}
          <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>{t.welcome.privacy}</button>
        </p>
      </div>
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
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
