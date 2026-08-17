import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { isNudgesEnabled } from '../services/notificationService'

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

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(8,8,20,0.88)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', animation: 'slide-up 0.2s ease',
    }}>
      <div style={{
        background: 'rgba(14,14,26,0.98)',
        border: '1.5px solid rgba(239,68,68,0.35)',
        borderRadius: 20, padding: '1.5rem 1.35rem',
        maxWidth: 360, width: '100%',
        boxShadow: '0 0 40px rgba(239,68,68,0.08)',
      }}>
        <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '0.75rem' }}>⚠️</div>
        <div style={{ color: '#f87171', fontWeight: 900, fontSize: '1rem', textAlign: 'center', marginBottom: '0.4rem' }}>
          בטוח שאתה רוצה למחוק?
        </div>
        <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.78rem', lineHeight: 1.6, textAlign: 'center', marginBottom: '1.25rem' }}>
          פעולה זו תמחק את כל ההתקדמות הנוכחית ותדרוש בניית מסלול חדש מאפס. לא ניתן לשחזר.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={onConfirm}
            className="btn-tactile"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#f87171', fontSize: '0.88rem', fontWeight: 900, padding: '0.85rem', cursor: 'pointer', width: '100%' }}
          >
            כן, מחק הכל ובנה מחדש
          </button>
          <button
            onClick={onCancel}
            className="btn-tactile"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem', fontWeight: 700, padding: '0.85rem', cursor: 'pointer', width: '100%' }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings({ onRebuildPath, activePathName }) {
  const { user, isGuest, logout } = useAuth()
  const { lang, setLang }         = useLang()
  const [loggingOut,     setLoggingOut]     = useState(false)
  const [nudgesEnabled,  setNudgesEnabled]  = useState(isNudgesEnabled)
  const [rebuildConfirm, setRebuildConfirm] = useState(false)
  const [notifPerm,      setNotifPerm]      = useState(() =>
    ('Notification' in window) ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    if (!('Notification' in window)) return
    setNotifPerm(Notification.permission)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } catch { setLoggingOut(false) }
  }

  const isHe      = lang === 'he'
  const initials  = user?.displayName?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || '?'

  return (
    <>
    {rebuildConfirm && (
      <ConfirmModal
        onConfirm={() => { setRebuildConfirm(false); onRebuildPath() }}
        onCancel={() => setRebuildConfirm(false)}
      />
    )}
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
          desc={isHe ? 'עבור לממשק אנגלי' : 'Switch to Hebrew'}
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

      {/* Notifications section */}
      {!isGuest && notifPerm !== 'unsupported' && (
        <>
          <SectionHeader title="◈ התראות" />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>
            <Row label="תזכורות PRIME" desc="תזכורות ב-10:00 ו-16:00 מבוססות Non-Negotiables וחזון 3 שנים">
              <Toggle
                on={nudgesEnabled}
                onToggle={() => {
                  const next = !nudgesEnabled
                  setNudgesEnabled(next)
                  try { localStorage.setItem('prime_nudges_enabled', String(next)) } catch {}
                }}
              />
            </Row>
            <Row
              label="הרשאת דפדפן"
              desc={
                notifPerm === 'granted' ? 'התראות מאושרות' :
                notifPerm === 'denied'  ? 'חסומות — שנה בהגדרות הדפדפן' :
                'נדרש אישור חד-פעמי'
              }
            >
              {notifPerm === 'default' && (
                <button
                  onClick={() => Notification.requestPermission().then(p => setNotifPerm(p))}
                  className="btn-tactile"
                  style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.18)', borderRadius: 10, color: 'rgba(245,197,24,0.7)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44 }}
                >
                  אשר
                </button>
              )}
              {notifPerm === 'granted' && (
                <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 800 }}>✓</span>
              )}
              {notifPerm === 'denied' && (
                <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 800 }}>✗</span>
              )}
            </Row>
          </div>
        </>
      )}

      {/* Path section */}
      {!isGuest && (
        <>
          <SectionHeader title="◈ מסלול אישי" />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>
            <Row label="בנה מסלול מחדש" desc={activePathName ? `מסלול פעיל: ${activePathName} — מחיקת ההתקדמות הנוכחית` : 'תוכנית AI חדשה של 30 יום — מחיקת ההתקדמות הנוכחית'}>
                <button
                  onClick={() => setRebuildConfirm(true)}
                  className="btn-tactile"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, color: '#f87171', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44 }}
                >
                  ⚠️ מחק ובנה מחדש
                </button>
            </Row>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.15)', fontSize: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace", marginTop: '2rem', paddingBottom: '1rem' }}>
        PRIME · v1.2 · prime-app-84fe0.web.app
      </div>
    </div>
    </>
  )
}
