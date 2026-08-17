import { useState, useEffect, useRef } from 'react'
import { generateDayLesson, completePathDay } from '../services/pathBuilderService'
import { applyWin } from '../services/disciplineScore'

// ── Loading skeleton ─────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="anim-spin" style={{ width: 20, height: 20, border: '2px solid rgba(245,197,24,0.15)', borderTopColor: '#F5C518', borderRadius: '50%', flexShrink: 0 }} />
        <span style={{ color: 'rgba(245,197,24,0.65)', fontSize: '0.85rem', fontWeight: 600 }}>טוען שיעור...</span>
      </div>
      {[80, 160, 60].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 14, background: 'rgba(255,255,255,0.03)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ${i * 0.15}s infinite` }} />
        </div>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

export default function LessonView({ user, pathRecord, dayIndex, onComplete, onClose }) {
  const [lesson,    setLesson]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [saving,    setSaving]    = useState(false)
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
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

          {loading && <LoadingSkeleton />}
          {error   && <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '2rem 0' }}>{error}</div>}

          {lesson && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease' }}>

              {/* Title line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {dayEntry?.is_milestone && <span style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: '0.15rem 0.55rem', color: '#F5C518', fontSize: '0.58rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace" }}>🏆 MILESTONE</span>}
                <span style={{ color: phaseColor, fontSize: '0.58rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace" }}>{dayEntry?.phase}</span>
                <span style={{ color: 'rgba(241,245,249,0.88)', fontSize: '1rem', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{lesson.title}</span>
              </div>

              {/* Challenge — full width, no sub-label */}
              {lesson.challenge && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)', borderRadius: 18, padding: '1.2rem 1.3rem' }}>
                  <p style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.5, margin: 0 }}>⚡ {lesson.challenge}</p>
                </div>
              )}

              {/* Complete CTA */}
              {todayDone ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16 }}>
                  <span style={{ fontSize: '1.4rem' }}>🎉</span>
                  <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 800 }}>יום {dayIndex} הושלם! 🔥</span>
                </div>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="btn-primary btn-tactile"
                  style={{ width: '100%', padding: '1.25rem', borderRadius: 16, fontSize: '1rem', fontWeight: 900, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? '🎉' : `🔥 סיים יום ${dayIndex}!`}
                </button>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
