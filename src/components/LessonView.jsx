import { useState, useEffect, useRef } from 'react'
import { generateDayLesson, completePathDay } from '../services/pathBuilderService'
import { applyWin } from '../services/disciplineScore'

// ── Section config ───────────────────────────────────────────────────

const SECTIONS = [
  {
    key:    'deep_dive',
    label:  '◈ DEEP DIVE',
    icon:   '🧠',
    color:  '#a5b4fc',
    bg:     'rgba(99,102,241,0.07)',
    border: 'rgba(99,102,241,0.2)',
    desc:   'הרעיון המרכזי',
  },
  {
    key:    'case_study',
    label:  '◈ CASE STUDY',
    icon:   '📊',
    color:  '#67e8f9',
    bg:     'rgba(6,182,212,0.07)',
    border: 'rgba(6,182,212,0.2)',
    desc:   'דוגמה מהעולם האמיתי',
  },
  {
    key:    'pro_tip',
    label:  '◈ PRO TIP',
    icon:   '💎',
    color:  '#F5C518',
    bg:     'rgba(245,197,24,0.07)',
    border: 'rgba(245,197,24,0.28)',
    desc:   'תובנה נסתרת',
  },
  {
    key:    'challenge',
    label:  '◈ CHALLENGE',
    icon:   '⚡',
    color:  '#34d399',
    bg:     'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.28)',
    desc:   'האתגר שלך להיום',
  },
]

// ── Loading skeleton ─────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="anim-spin" style={{ width: 22, height: 22, border: '2px solid rgba(245,197,24,0.15)', borderTopColor: '#F5C518', borderRadius: '50%', flexShrink: 0 }} />
        <span style={{ color: 'rgba(245,197,24,0.65)', fontSize: '0.88rem', fontWeight: 600 }}>מכין שיעור פרמיום...</span>
      </div>
      {[180, 80, 120, 90].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 14, background: 'rgba(255,255,255,0.03)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ${i * 0.15}s infinite` }} />
        </div>
      ))}
    </div>
  )
}

// ── Section block ────────────────────────────────────────────────────

function LessonSection({ section, content, animDelay }) {
  if (!content) return null
  return (
    <div style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: 18, padding: '1.2rem 1.3rem', animation: `slide-up 0.3s ${animDelay}s ease both` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.95rem' }}>{section.icon}</span>
        <div>
          <div style={{ color: section.color, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>{section.label}</div>
          <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.62rem', fontWeight: 600 }}>{section.desc}</div>
        </div>
      </div>
      <p style={{ color: 'rgba(241,245,249,0.85)', fontSize: '0.9rem', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

export default function LessonView({ user, pathRecord, dayIndex, onComplete, onClose }) {
  const [lesson,    setLesson]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [readPct,   setReadPct]   = useState(0)
  const scrollRef = useRef(null)

  const dayEntry  = pathRecord.path?.roadmap?.[dayIndex - 1]
  const todayDone = (pathRecord.progress?.completedDays || []).some(d => d.day === dayIndex)

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Load lesson
  useEffect(() => {
    setLoading(true)
    generateDayLesson(user.uid, pathRecord, dayIndex)
      .then(setLesson)
      .catch(() => setError('שגיאה בטעינת השיעור — נסה שוב'))
      .finally(() => setLoading(false))
  }, [user.uid, dayIndex]) // eslint-disable-line

  // Track read progress (scroll %)
  function handleScroll(e) {
    const el  = e.currentTarget
    const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
    setReadPct(Math.min(pct, 100))
  }

  async function handleComplete() {
    if (saving || todayDone) return
    setSaving(true)
    try {
      const updated = await completePathDay(user.uid, pathRecord)
      applyWin()
      onComplete(updated)
    } catch {
      setSaving(false)
    }
  }

  const PHASE_COLORS = {
    'בניית יסודות': '#a78bfa',
    'בניית תאוצה':  '#F5C518',
    'לחץ ובחינה':   '#f59e0b',
    'שילוב ועוצמה': '#10b981',
  }
  const phaseColor = dayEntry ? (PHASE_COLORS[dayEntry.phase] || '#F5C518') : '#F5C518'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080810', zIndex: 6000, display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky header ── */}
      <div style={{ position: 'relative', zIndex: 10, background: 'rgba(8,8,16,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Read progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: `${readPct}%`, background: `linear-gradient(90deg,${phaseColor}80,${phaseColor})`, transition: 'width 0.1s linear' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1.25rem' }}>
          <div>
            <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
              יום {dayIndex} / 30 · {dayEntry?.phase}
              {dayEntry?.is_milestone && ' · 🏆 אבן דרך'}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem', marginTop: '0.1rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson ? lesson.title : '...'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, color: 'rgba(241,245,249,0.4)', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', cursor: 'pointer', minHeight: 34 }}
          >
            ✕ סגור
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

          {loading && <LoadingSkeleton />}
          {error   && <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '2rem 0' }}>{error}</div>}

          {lesson && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.35s ease' }}>

              {/* Concept intro */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {dayEntry?.is_milestone && (
                    <div style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: '0.2rem 0.65rem', color: '#F5C518', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.06em', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                      🏆 MILESTONE
                    </div>
                  )}
                  <div style={{ background: `${phaseColor}18`, border: `1px solid ${phaseColor}35`, borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                    <span style={{ color: phaseColor, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', fontFamily: "'SF Mono','Fira Code',monospace" }}>{dayEntry?.phase}</span>
                  </div>
                </div>
                <h1 style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', margin: '0 0 0.85rem' }}>{lesson.title}</h1>
                <p style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.95rem', lineHeight: 1.75, margin: '0 0 0.5rem', borderRight: `3px solid ${phaseColor}50`, paddingRight: '1rem' }}>
                  {lesson.concept}
                </p>
                {lesson.duration_min && (
                  <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.65rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                    ⏱ זמן קריאה: ~{lesson.duration_min} דקות
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />

              {SECTIONS.map((sec, i) => (
                <LessonSection
                  key={sec.key}
                  section={sec}
                  content={lesson[sec.key]}
                  animDelay={i * 0.07}
                />
              ))}

              {/* Complete CTA */}
              <div style={{ paddingTop: '0.5rem' }}>
                {todayDone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1.1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>✅</span>
                    <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}>יום {dayIndex} הושלם — כל הכבוד</span>
                  </div>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="btn-primary btn-tactile"
                    style={{ width: '100%', padding: '1.3rem', borderRadius: 18, fontSize: '1rem', fontWeight: 900, opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? '...' : `✅ ביצעתי את האתגר — סיים יום ${dayIndex} ←`}
                  </button>
                )}
                <p style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.65rem', textAlign: 'center', marginTop: '0.65rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                  לחץ רק לאחר ביצוע האתגר
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
