import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isNudgesEnabled } from '../services/notificationService'
import { useUserPrefs } from '../context/UserContext'
import { LESSON_TOPICS } from '../data/dailyLessons'

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
      background: 'rgba(8,8,20,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', animation: 'slide-up 0.2s ease',
    }}>
      <div style={{
        background: '#111111',
        border: '1.5px solid rgba(239,68,68,0.35)',
        borderRadius: 20, padding: '1.5rem 1.35rem',
        maxWidth: 360, width: '100%',
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
  const { prefs, setPrefs } = useUserPrefs()
  const [loggingOut,     setLoggingOut]     = useState(false)
  const [nudgesEnabled,  setNudgesEnabled]  = useState(isNudgesEnabled)
  const [rebuildConfirm, setRebuildConfirm] = useState(false)
  const [notifPerm,      setNotifPerm]      = useState(() =>
    ('Notification' in window) ? Notification.permission : 'unsupported'
  )
  const [testSent, setTestSent] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    setNotifPerm(Notification.permission)
  }, [])

  const handleRequestPermission = useCallback(async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }, [])

  const handleTestNotif = useCallback(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    new Notification('🧪 בדיקת PRIME', {
      body: 'ההתראות עובדות! תזכורות יגיעו בזמן הנכון.',
      icon: '/icon-192.png',
      tag:  'prime-local-test',
    })
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } catch { setLoggingOut(false) }
  }

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

      {/* Notifications section */}
      {!isGuest && notifPerm !== 'unsupported' && (
        <>
          <SectionHeader title="◈ התראות" />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>

            <Row label="תזכורות PRIME" desc="תזכורות ב-10:00 ו-16:00 מבוססות הרגלי חובה וחזון 3 שנים">
              <Toggle
                on={nudgesEnabled}
                onToggle={() => {
                  const next = !nudgesEnabled
                  setNudgesEnabled(next)
                  try { localStorage.setItem('prime_nudges_enabled', String(next)) } catch {}
                }}
              />
            </Row>

            {/* Browser permission status */}
            <Row
              label="הרשאת דפדפן"
              desc={
                notifPerm === 'granted' ? 'התראות מאושרות ✓' :
                notifPerm === 'denied'  ? 'חסומות — שנה בהגדרות הדפדפן' :
                'נדרש אישור חד-פעמי כדי לקבל תזכורות'
              }
            >
              {notifPerm === 'denied' && (
                <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 800 }}>✗</span>
              )}
              {notifPerm === 'granted' && (
                <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 800 }}>✓</span>
              )}
              {notifPerm === 'default' && (
                <button
                  onClick={handleRequestPermission}
                  className="btn-tactile"
                  style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 10, color: 'rgba(245,197,24,0.85)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44, whiteSpace: 'nowrap' }}
                >
                  הפעל
                </button>
              )}
            </Row>

            {/* Local test notification — no server required */}
            {notifPerm === 'granted' && (
              <Row label="שלח התראת בדיקה" desc="התראה מקומית — בדוק שהדפדפן מציג אותה">
                <button
                  onClick={handleTestNotif}
                  disabled={testSent}
                  className="btn-tactile"
                  style={{ background: testSent ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${testSent ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: testSent ? '#34d399' : 'rgba(241,245,249,0.6)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: testSent ? 'default' : 'pointer', minHeight: 44, whiteSpace: 'nowrap' }}
                >
                  {testSent ? '✓ נשלח' : 'בדיקה'}
                </button>
              </Row>
            )}

          </div>
        </>
      )}

      {/* Path section */}
      {!isGuest && (
        <>
          <SectionHeader title="◈ מסלול אישי" />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.1rem 1rem', marginBottom: '0.5rem' }}>
            <Row label="בנה מסלול מחדש" desc={activePathName ? `מסלול פעיל: ${activePathName} — מחיקת ההתקדמות הנוכחית` : 'תוכנית חדשה שנבנתה בעזרת בינה מלאכותית — מחיקת ההתקדמות הנוכחית'}>
                <button
                  onClick={() => setRebuildConfirm(true)}
                  className="btn-tactile"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer', minHeight: 44 }}
                >
                  ⚠️ מחק ובנה מחדש
                </button>
            </Row>
          </div>
        </>
      )}

      {/* Learning preferences section */}
      <SectionHeader title="◈ העדפות למידה" />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '0.85rem 1rem', marginBottom: '0.5rem' }}>
        <div style={{ color: '#e8eaf0', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.55rem' }}>נושאי למידה מועדפים</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.9rem' }}>
          {LESSON_TOPICS.map(t => {
            const selected = (prefs.learnTopics || []).includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => {
                  const current = prefs.learnTopics || []
                  const next = selected ? current.filter(id => id !== t.id) : [...current, t.id]
                  setPrefs({ learnTopics: next })
                }}
                style={{
                  background: selected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20, padding: '0.3rem 0.75rem',
                  color: selected ? '#c4b5fd' : 'rgba(241,245,249,0.5)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                <span>{t.emoji}</span>{t.label}
              </button>
            )
          })}
        </div>
        <div style={{ color: '#e8eaf0', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.4rem' }}>זמן מועדף לשיעור</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[{ v: '2', label: '2 דקות' }, { v: '5', label: '5 דקות' }, { v: '10', label: '10 דקות' }].map(opt => {
            const selected = prefs.prefDuration === opt.v
            return (
              <button
                key={opt.v}
                onClick={() => setPrefs({ prefDuration: selected ? null : opt.v })}
                style={{
                  flex: 1, background: selected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, padding: '0.45rem 0',
                  color: selected ? '#c4b5fd' : 'rgba(241,245,249,0.5)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.68rem', marginTop: '0.5rem' }}>
          שינוי ההעדפות לא מאפס את ההתקדמות שלך
        </div>
      </div>

      {/* Legal link */}
      <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
        <a
          href="/legal"
          style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(245,197,24,0.2)', paddingBottom: 2 }}
        >
          משפטי ותמיכה
        </a>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.15)', fontSize: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace", marginTop: '0.75rem', paddingBottom: '1rem' }}>
        PRIME · v1.2 · prime-app-84fe0.web.app
      </div>
    </div>
    </>
  )
}
