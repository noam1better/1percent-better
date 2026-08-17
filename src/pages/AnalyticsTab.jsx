import { useMemo, useState } from 'react'
import { CHALLENGES } from '../data/challenges'
import { getDailyNudgeMessage } from '../services/notificationService'

const WHATSAPP_LINK = 'https://chat.whatsapp.com/L5AoG0c2l4H29BkAZanCw4'
const APP_URL       = 'https://1percent-better-app.web.app'

function Toast({ icon, msg, onDone: _onDone }) {
  return (
    <div
      style={{
        position: 'fixed', top: '1.2rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center',
        gap: '0.6rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'toast-in 0.3s cubic-bezier(.34,1.56,.64,1) both',
        whiteSpace: 'nowrap', pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{msg}</span>
    </div>
  )
}

function InitiationModal({ level, onClose }) {
  const [signed, setSigned] = useState(false)

  function handleSign() {
    setSigned(true)
    localStorage.setItem('ft_fight_club_signed', '1')
    window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer')
    setTimeout(onClose, 600)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'initiation-fade 0.3s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg,#0f172a,#0a0f1e)',
          border: '1px solid rgba(37,211,102,0.25)',
          borderRadius: 24,
          padding: '2.5rem 2rem',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(37,211,102,0.12), 0 20px 60px rgba(0,0,0,0.6)',
          animation: 'initiation-slide 0.35s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg,#25d366,#128c7e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.4rem', margin: '0 auto 1.5rem',
          boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
          animation: 'fight-club-pulse 2.5s ease-in-out infinite',
        }}>🥊</div>

        {/* Label */}
        <div style={{ color: '#25d366', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          רמה {level} · טקס ההתחייבות
        </div>

        {/* Headline */}
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.35rem', lineHeight: 1.3, margin: '0 0 1rem' }}>
          הוכחת משמעת עצמית.
        </h2>

        {/* Body */}
        <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 0.5rem' }}>
          5+ ימים של נוכחות. אתה בין ה-1% הטובים.
        </p>
        <p style={{ color: 'rgba(241,245,249,0.75)', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.6, margin: '0 0 2rem' }}>
          ברוך הבא לפייט קלאב.<br />
          מוכן לשמור על הסטנדרט הזה?
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(37,211,102,0.15)', marginBottom: '1.75rem' }} />

        {/* Pledge */}
        <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>ההתחייבות שלך</div>
          <div style={{ color: 'rgba(241,245,249,0.7)', fontSize: '0.8rem', lineHeight: 1.6, fontStyle: 'italic' }}>
            "אגיע כל יום, אחזיק את עצמי בסטנדרט הגבוה ואסייע לאחרים בקהילה."
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSign}
          disabled={signed}
          style={{
            width: '100%',
            background: signed ? 'rgba(37,211,102,0.2)' : 'linear-gradient(135deg,#25d366,#128c7e)',
            border: 'none', borderRadius: 14,
            color: '#fff', fontWeight: 800, fontSize: '1rem',
            padding: '1rem', cursor: signed ? 'default' : 'pointer',
            boxShadow: signed ? 'none' : '0 6px 24px rgba(37,211,102,0.35)',
            transition: 'all 0.3s ease',
            letterSpacing: '0.03em',
          }}
        >
          {signed ? '✓ חתמת — ברוך הבא' : '✍️ חותם ומאשר ← הצטרף לקלאב'}
        </button>

        <button
          onClick={onClose}
          style={{ marginTop: '0.85rem', background: 'none', border: 'none', color: 'rgba(241,245,249,0.25)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}
        >
          עדיין לא
        </button>
      </div>

    </div>
  )
}

const FIGHT_CLUB_LEVEL = 5
const FIGHT_CLUB_XP    = (FIGHT_CLUB_LEVEL - 1) * 100  // 400 XP

const DAY_LABELS  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
const DAY_SHORT   = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function dateKey(d) { return d.toISOString().slice(0, 10) }

function last14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d
  })
}

function generateInsight(activitySet, streak, totalXP, challengeCount) {
  if (activitySet.size === 0) {
    return { icon: '🌱', text: 'עדיין אין פעילות. השלם את ההרגל הראשון שלך היום כדי לבנות רצף.' }
  }

  // Day-of-week frequency
  const dowCount = Array(7).fill(0)
  for (const dateStr of activitySet) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    dowCount[dow]++
  }
  const peakDow   = dowCount.indexOf(Math.max(...dowCount))
  const peakLabel = DAY_LABELS[peakDow]
  const peakCount = dowCount[peakDow]

  if (streak >= 7)  return { icon: '🔥', text: `רצף של ${streak} ימים! אתה בטריטוריה של העילית. יום ${peakLabel} הוא היום החזק ביותר שלך — שמור על העוגן הזה.` }
  if (streak >= 3)  return { icon: '⚡', text: `${streak} ימים ברצף. יום ${peakLabel} הוא היום העקבי ביותר שלך. תרכב על המומנטום הזה.` }
  if (peakCount >= 2) return { icon: '📈', text: `אתה מגיע הכי הרבה ביום ${peakLabel}. בנה סביב זה — תזמן את המשימות הקשות ליום הטוב ביותר שלך.` }
  if (challengeCount >= 3) return { icon: '🎯', text: `${challengeCount} מסלולים פעילים. שקול להתמקד באחד עד יום 10 לפני שמסתעפים.` }
  return { icon: '💡', text: 'עקביות עולה על עצימות. אפילו הרגל אחד שהושלם ביום מצטבר ל-365× יתרון לאורך שנה.' }
}

export default function AnalyticsTab({ profile, currentUid: _currentUid, activePathName, customPath: _customPath }) {
  const [showCeremony, setShowCeremony] = useState(false)
  const [toast, setToast]               = useState(null)
  const hasSigned = !!localStorage.getItem('ft_fight_club_signed')

  function showToast(icon, msg) {
    setToast({ icon, msg })
    setTimeout(() => setToast(null), 2800)
  }

  function handleShare() {
    const challenges = profile?.challenges || {}
    const best = CHALLENGES
      .filter(ch => (challenges[ch.id]?.daysCompleted || 0) > 0)
      .sort((a, b) => (challenges[b.id]?.daysCompleted || 0) - (challenges[a.id]?.daysCompleted || 0))[0]
    const trackName = best ? best.title : '1% Better'
    const streakVal = profile?.streak?.count || 0
    const name      = profile?.name || ''
    const text = streakVal > 0
      ? `${name} על רצף של ${streakVal} ימים ב"${trackName}" ב-1% Better.\nהצטרף לתנועה ← ${APP_URL}`
      : `אני בונה הרגלים טובים יותר עם 1% Better.\nהצטרף לתנועה ← ${APP_URL}`
    navigator.clipboard.writeText(text)
      .then(() => showToast('📋', 'ההתקדמות הועתקה! מוכן לשיתוף.'))
      .catch(() => showToast('⚠️', 'ההעתקה נכשלה — נסה שוב'))
  }

  function handlePreviewNudge() {
    const streakVal = profile?.streak?.count || 0
    const { title, body } = getDailyNudgeMessage(profile?.name, streakVal)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg', tag: 'nudge-preview' })
      showToast('🔔', 'נשלח — בדוק את ההתראות שלך')
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification(title, { body, icon: '/favicon.svg', tag: 'nudge-preview' })
          showToast('🔔', 'נשלח — בדוק את ההתראות שלך')
        } else {
          showToast('🔔', `"${title}" — ${body.slice(0, 50)}…`)
        }
      })
    } else {
      showToast('🔔', `"${title}" — ${body.slice(0, 50)}…`)
    }
  }

  const activityLog = profile?.activityLog || []
  const activitySet = useMemo(() => new Set(activityLog), [activityLog])
  const days14      = useMemo(() => last14Days(), [])

  const xp             = profile?.xp || 0
  const streak         = profile?.streak?.count || 0
  const level          = Math.floor(xp / 100) + 1
  const challenges     = profile?.challenges || {}
  const _challengesDone = Object.values(challenges).filter(c => (c.daysCompleted || 0) >= 30).length
  const challengeActive = Object.values(challenges).filter(c => (c.daysCompleted || 0) > 0).length
  const totalLessons   = Object.values(challenges).reduce((s, c) => s + (c.daysCompleted || 0), 0)

  // Only show tracks relevant to user's current niche (quiz recs or most active track)
  const quizRecs = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('prime_track_quiz'))
      return Array.isArray(stored?.recommendations) ? stored.recommendations : []
    } catch { return [] }
  }, [])
  const relevantTrackIds = useMemo(() => {
    const recs = profile?.trackQuizRecs || quizRecs
    if (recs.length > 0) return new Set(recs)
    // fallback: most recently active track by lastCompletedDate
    const top = CHALLENGES
      .filter(ch => (challenges[ch.id]?.daysCompleted || 0) > 0)
      .sort((a, b) => {
        const da = challenges[a.id]?.lastCompletedDate || ''
        const db = challenges[b.id]?.lastCompletedDate || ''
        return db.localeCompare(da)
      })
      .slice(0, 1)
      .map(ch => ch.id)
    return new Set(top)
  }, [profile?.trackQuizRecs, quizRecs, challenges])

  // Longest streak from log
  const insight      = useMemo(() => generateInsight(activitySet, streak, xp, challengeActive), [activitySet, streak, xp, challengeActive])
  const nudge        = useMemo(() => getDailyNudgeMessage(profile?.name, streak), [profile?.name, streak])
  const hasBadge     = streak >= 3
  const inFightClub  = level >= FIGHT_CLUB_LEVEL
  const xpToClub     = Math.max(0, FIGHT_CLUB_XP - xp)
  const clubProgress = Math.min(100, Math.round((xp / FIGHT_CLUB_XP) * 100))

  // 14-day bar data
  const _maxActive = 1
  const barData = days14.map(d => {
    const key    = dateKey(d)
    const active = activitySet.has(key)
    const isToday = key === dateKey(new Date())
    const _label  = d.getDate() === 1 ? MONTH_SHORT[d.getMonth()] : (d.getDay() === 0 ? DAY_LABELS[0] : '')
    const dayLbl = DAY_SHORT[d.getDay()]
    return { key, active, isToday, dayLbl, date: d }
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1.25rem 90px', animation: 'slide-up 0.3s ease both' }}>
      {showCeremony && <InitiationModal level={level} onClose={() => setShowCeremony(false)} />}
      {toast && <Toast icon={toast.icon} msg={toast.msg} />}

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>האנליטיקה שלך</h2>
          <p style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.78rem', marginTop: '0.2rem' }}>מבט כללי על ההתקדמות</p>
        </div>
        <button
          className="btn-tactile"
          onClick={handleShare}
          style={{
            flexShrink: 0, background: 'linear-gradient(135deg,#c4795a,#d4956e)',
            border: 'none', borderRadius: 12, padding: '0.5rem 0.9rem',
            color: '#fff', fontSize: '0.75rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            boxShadow: '0 4px 16px rgba(196,121,90,0.35)',
          }}
        >
          <span>📤</span> שתף
        </button>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'סה״כ XP',            value: xp.toLocaleString(),   icon: '✨', color: '#6366f1' },
          { label: 'רצף נוכחי',          value: `${streak}d`,          icon: '🔥', color: '#f59e0b' },
          { label: 'רמה',               value: level,                 icon: '⭐', color: '#8b5cf6' },
          { label: 'שיעורים שהושלמו',    value: totalLessons,          icon: '📚', color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.9rem 1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
              <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            </div>
            <div style={{ color: s.color, fontSize: '1.55rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Consistency Badge ── */}
      {hasBadge && (
        <div style={{ marginBottom: '1rem', background: 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))', border: '1px solid rgba(251,191,36,0.28)', borderRadius: 16, padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 20px rgba(251,191,36,0.15)', animation: 'badge-glow 3s ease-in-out infinite', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,transparent 40%,rgba(251,191,36,0.08) 50%,transparent 60%)', animation: 'shimmer 2.8s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0, boxShadow: '0 4px 14px rgba(251,191,36,0.4)' }}>🏅</div>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.15rem' }}>אלוף העקביות</div>
            <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.75rem' }}>{streak} ימים ברצף · אל תשבור את השרשרת</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1 }}>{streak}</div>
            <div style={{ color: 'rgba(251,191,36,0.5)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>days</div>
          </div>
        </div>
      )}

      {/* ── Club Status card ── */}
      <div style={{ marginBottom: '1rem', borderRadius: 16, overflow: 'hidden', boxShadow: inFightClub ? '0 4px 24px rgba(37,211,102,0.2)' : '0 2px 10px rgba(0,0,0,0.18)' }}>
        {inFightClub ? (
          <div style={{ background: 'linear-gradient(135deg,rgba(37,211,102,0.12),rgba(18,140,126,0.08))', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 16, padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'fight-club-pulse 2.5s ease-in-out infinite' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, boxShadow: '0 4px 14px rgba(37,211,102,0.4)' }}>🥊</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#25d366', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.15rem' }}>חבר בפייט קלאב</div>
              <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.75rem' }}>רמה {level} · גישה מלאה לקהילה</div>
            </div>
            <button
              onClick={() => hasSigned ? window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer') : setShowCeremony(true)}
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', border: 'none', borderRadius: 10, padding: '0.45rem 0.8rem', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 10px rgba(37,211,102,0.3)' }}
            >{hasSigned ? 'פתח ←' : 'הצטרף ←'}</button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🔒</div>
              <div>
                <div style={{ color: 'rgba(241,245,249,0.6)', fontWeight: 700, fontSize: '0.88rem' }}>פייט קלאב</div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.72rem' }}>הגע לרמה {FIGHT_CLUB_LEVEL} כדי לפתוח · נותרו {xpToClub} XP</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'rgba(241,245,249,0.35)', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>רמה {level}</div>
                <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.6rem' }}>/ רמה {FIGHT_CLUB_LEVEL}</div>
              </div>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${clubProgress}%`, transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
              <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.63rem' }}>{xp} XP</span>
              <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.63rem' }}>נדרש {FIGHT_CLUB_XP} XP</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Nudge Preview ── */}
      <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem' }}>🔔</span>
            <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>הנדנוד של היום · 08:00</span>
          </div>
          <button
            onClick={handlePreviewNudge}
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 8, padding: '0.2rem 0.55rem', color: '#a5b4fc', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
          >▶ תצוגה מקדימה</button>
        </div>
        <div style={{ color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.15rem' }}>{nudge.title}</div>
        <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.77rem', lineHeight: 1.5 }}>{nudge.body}</div>
      </div>

      {/* ── 14-day consistency chart ── */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.1rem 1.1rem 0.85rem', marginBottom: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>עקביות יומית</span>
          <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.68rem' }}>14 הימים האחרונים</span>
        </div>

        {/* Bar chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 60, marginBottom: '0.4rem' }}>
          {barData.map(d => (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
              <div
                title={d.key}
                style={{
                  width: '100%',
                  height: d.active ? '100%' : '12%',
                  borderRadius: 4,
                  background: d.active
                    ? d.isToday
                      ? 'linear-gradient(180deg,#a5b4fc,#6366f1)'
                      : 'linear-gradient(180deg,#6366f188,#6366f144)'
                    : 'rgba(255,255,255,0.06)',
                  transition: 'height 0.4s ease',
                  boxShadow: d.active && d.isToday ? '0 2px 8px rgba(99,102,241,0.5)' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Day labels */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {barData.map(d => (
            <div key={d.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.55rem', color: d.isToday ? '#a5b4fc' : 'rgba(241,245,249,0.2)', fontWeight: d.isToday ? 800 : 400 }}>
              {d.isToday ? '•' : d.dayLbl}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(135deg,#a5b4fc,#6366f1)' }} />
            <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem' }}>פעיל</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem' }}>לא פעיל</span>
          </div>
          <span style={{ marginLeft: 'auto', color: 'rgba(241,245,249,0.25)', fontSize: '0.65rem' }}>
            {activitySet.size} ימים פעילים סה״כ
          </span>
        </div>
      </div>

      {/* ── Weekly Insight card ── */}
      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 16, padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{insight.icon}</span>
          <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.82rem' }}>תובנה שבועית</span>
        </div>
        <p style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{insight.text}</p>
      </div>

      {/* ── Future Trajectory ── */}
      {xp > 0 && (() => {
        const activeChallenge = CHALLENGES
          .filter(ch => relevantTrackIds.has(ch.id) && (challenges[ch.id]?.daysCompleted || 0) > 0 && (challenges[ch.id]?.daysCompleted || 0) < ch.days)[0]
          || CHALLENGES.filter(ch => (challenges[ch.id]?.daysCompleted || 0) > 0 && (challenges[ch.id]?.daysCompleted || 0) < ch.days)[0]
        const dailyXP  = activeChallenge?.xpPerDay || 50
        const proj = [
          { days: 30, label: '30 יום',  xp: xp + dailyXP * 30 },
          { days: 60, label: '60 יום',  xp: xp + dailyXP * 60 },
          { days: 90, label: '90 יום',  xp: xp + dailyXP * 90 },
        ]
        const maxXP  = proj[2].xp
        return (
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04))', border: '1px solid rgba(99,102,241,0.16)', borderRadius: 16, padding: '1.1rem 1.1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
              <div>
                <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.88rem' }}>מסלול הצמיחה שלך</span>
                <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.62rem', marginTop: '0.1rem' }}>בהנחה של {dailyXP} XP/יום</div>
              </div>
              <span style={{ fontSize: '0.7rem' }}>🚀</span>
            </div>

            {/* Current marker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
              <div style={{ width: 56, textAlign: 'left', color: 'rgba(241,245,249,0.35)', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>עכשיו</div>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', direction: 'ltr' }}>
                <div style={{ height: '100%', width: `${Math.round((xp / maxXP) * 100)}%`, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div style={{ width: 60, textAlign: 'right', color: 'rgba(241,245,249,0.5)', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>{xp.toLocaleString()} XP</div>
            </div>

            {proj.map((p, i) => {
              const colors = ['#6366f1', '#8b5cf6', '#a855f7']
              const lvl    = Math.floor(p.xp / 100) + 1
              return (
                <div key={p.days} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 2 ? '0.5rem' : 0 }}>
                  <div style={{ width: 56, textAlign: 'left', color: colors[i], fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{p.label}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)', direction: 'ltr' }}>
                    <div style={{ height: '100%', width: `${Math.round((p.xp / maxXP) * 100)}%`, borderRadius: 99, background: `linear-gradient(90deg,${colors[i]}88,${colors[i]})`, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ width: 60, textAlign: 'right', color: colors[i], fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                    {p.xp.toLocaleString()} XP
                    <div style={{ color: `${colors[i]}88`, fontSize: '0.55rem', fontWeight: 600 }}>רמה {lvl}</div>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(99,102,241,0.15)', color: 'rgba(241,245,249,0.32)', fontSize: '0.68rem', lineHeight: 1.55 }}>
              💡 המספרים האלה אמיתיים — זה מה שיקרה אם תמשיך בקצב הנוכחי.
            </div>
          </div>
        )
      })()}

      {/* ── Tracks progress breakdown — always shows niche tracks ── */}
      {relevantTrackIds.size > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1rem 1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>מסלול פעיל</span>
            {activePathName && <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.62rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePathName}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {CHALLENGES.filter(ch => relevantTrackIds.has(ch.id)).map(ch => {
              const done = challenges[ch.id]?.daysCompleted || 0
              const pct  = Math.round((done / ch.days) * 100)
              const isActive = done > 0 && done < ch.days
              return (
                <div key={ch.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{ch.emoji}</span>{ch.title}
                      {isActive && <span style={{ background: `${ch.color}18`, border: `1px solid ${ch.color}30`, borderRadius: 20, padding: '0.05rem 0.4rem', color: ch.color, fontSize: '0.55rem', fontWeight: 800 }}>פעיל</span>}
                      {done === 0 && <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.6rem' }}>טרם התחיל</span>}
                    </span>
                    <span style={{ color: ch.color, fontSize: '0.68rem', fontWeight: 700 }}>{done}/{ch.days}d · {pct}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${ch.color}88,${ch.color})`, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
