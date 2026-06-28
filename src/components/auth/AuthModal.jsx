import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const ERR_MAP = {
  'auth/invalid-email':          'כתובת מייל לא תקינה',
  'auth/user-not-found':         'משתמש לא נמצא',
  'auth/wrong-password':         'סיסמה שגויה',
  'auth/email-already-in-use':   'כתובת המייל כבר רשומה',
  'auth/weak-password':          'סיסמה חלשה – לפחות 6 תווים',
  'auth/invalid-credential':     'פרטי התחברות שגויים',
  'auth/too-many-requests':      'יותר מדי ניסיונות. נסה מאוחר יותר',
  'auth/not-configured':         'Firebase לא מוגדר. הגדר VITE_FIREBASE_* ב-.env',
}

export default function AuthModal({ onClose }) {
  const [tab,      setTab]      = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const { login, signup, loginWithGoogle } = useAuth()

  const switchTab = t => { setTab(t); setError(null) }

  const handleGoogle = async () => {
    setGoogleBusy(true)
    setError(null)
    try {
      await loginWithGoogle()
      onClose()
    } catch (err) {
      setError(ERR_MAP[err.code] || 'שגיאה. נסה שנית')
    } finally {
      setGoogleBusy(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (tab === 'login') await login(email, password)
      else await signup(email, password)
      onClose()
    } catch (err) {
      setError(ERR_MAP[err.code] || 'שגיאה. נסה שנית')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box" dir="rtl">
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="modal-logo-row">
          <span className="logo-bb">BusinessBuilder</span>
          <span className="logo-ai"> AI</span>
        </div>
        <p className="modal-tagline">שמור פרויקטים, גש מכל מקום</p>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'login'  ? 'active' : ''}`} onClick={() => switchTab('login')}>כניסה</button>
          <button className={`modal-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>הרשמה חינמית</button>
        </div>

        <button
          type="button"
          className={`btn-google ${googleBusy ? 'btn-loading' : ''}`}
          onClick={handleGoogle}
          disabled={googleBusy || busy}
        >
          {googleBusy
            ? <><span className="spinner" /> מתחבר...</>
            : <><span className="google-icon">G</span> המשך עם Google</>
          }
        </button>
        <div className="auth-divider"><span>או</span></div>

        <form onSubmit={submit} className="modal-form">
          <div className="field">
            <label>אימייל</label>
            <div className="input-wrap">
              <span className="input-icon">📧</span>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="field">
            <label>סיסמה</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="לפחות 6 תווים"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <div className="modal-error">⚠️ {error}</div>}

          <button
            className={`btn-generate ${busy ? 'btn-loading' : ''}`}
            type="submit"
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy
              ? <><span className="spinner" /> מעבד...</>
              : tab === 'login'
                ? '🚀 כניסה לחשבון'
                : '✨ יצירת חשבון חינמי'
            }
          </button>
        </form>

        <button className="modal-skip-btn" onClick={onClose}>
          המשך ללא חשבון ←
        </button>
      </div>
    </>
  )
}
