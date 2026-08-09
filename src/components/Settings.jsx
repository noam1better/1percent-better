import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ color: '#e8eaf0', fontSize: '0.88rem', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ color: 'rgba(232,234,240,0.45)', fontSize: '0.72rem', marginTop: '0.1rem' }}>{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="btn-tactile"
      style={{
        width: 46, height: 26, borderRadius: 99, flexShrink: 0,
        background: on ? 'rgba(245,197,24,0.9)' : 'rgba(255,255,255,0.1)',
        border: on ? '1px solid rgba(245,197,24,0.6)' : '1px solid rgba(255,255,255,0.12)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s, border 0.2s',
      }}
      aria-pressed={on}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: on ? '#0e0e16' : 'rgba(255,255,255,0.55)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginTop: '1.5rem', marginBottom: '0.2rem' }}>
      {title}
    </div>
  )
}

export default function Settings({ onRebuildPath }) {
  const { user, isGuest, logout } = useAuth()
  const { lang, setLang }         = useLang()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } catch { setLoggingOut(false) }
  }

  const isHe      = lang === 'he'
  const initials  = user?.displayName?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || '?'

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1.25rem 0' }}>

      {/* Header */}
      <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '1.1rem' }}>
        ⚙ הגדרות
      </div>

      {/* Account section */}
      <SectionHeader title="◈ חשבון" />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.2rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,197,24,0.15)', border: '2px solid rgba(245,197,24,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#F5C518', flexShrink: 0 }}>
            {isGuest ? '👤' : initials}
          </div>
          <div>
            <div style={{ color: '#e8eaf0', fontSize: '0.9rem', fontWeight: 700 }}>
              {isGuest ? 'אורח' : (user?.displayName || 'משתמש')}
            </div>
            <div style={{ color: 'rgba(232,234,240,0.4)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
              {isGuest ? 'התחבר כדי לשמור נתונים' : user?.email}
            </div>
          </div>
        </div>

        <Row label="התנתקות" desc="יוציא אותך מהחשבון">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn-tactile"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: loggingOut ? 'not-allowed' : 'pointer', opacity: loggingOut ? 0.5 : 1, minHeight: 44 }}
          >
            {loggingOut ? '...' : 'התנתק'}
          </button>
        </Row>
      </div>

      {/* Appearance section */}
      <SectionHeader title="◈ מראה" />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>
        <Row
          label={isHe ? 'English' : 'עברית'}
          desc={isHe ? 'Switch interface to English' : 'עבור ממשק לעברית'}
        >
          <button
            onClick={() => setLang(isHe ? 'en' : 'he')}
            className="btn-tactile"
            style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 10, color: 'rgba(245,197,24,0.8)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44 }}
          >
            {isHe ? 'EN' : 'עב'}
          </button>
        </Row>
      </div>

      {/* Path section */}
      {!isGuest && (
        <>
          <SectionHeader title="◈ מסלול אישי" />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>
            <Row label="בנה מסלול מחדש" desc="תוכנית AI חדשה של 30 יום — מחיקת ההתקדמות הנוכחית">
              <button
                onClick={onRebuildPath}
                className="btn-tactile"
                style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.18)', borderRadius: 10, color: 'rgba(245,197,24,0.7)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44 }}
              >
                ♻️ בנה מחדש
              </button>
            </Row>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.15)', fontSize: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace", marginTop: '2rem', paddingBottom: '1rem' }}>
        PRIME · v1.0 · prime-app-84fe0.web.app
      </div>
    </div>
  )
}
