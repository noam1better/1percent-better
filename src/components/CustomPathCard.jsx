import { useState } from 'react'
import { applyWin } from '../services/disciplineScore'
import { generateMicroSteps } from '../services/microProgressService'
import LessonView from './LessonView'

const TODAY     = () => new Date().toISOString().slice(0, 10)
const HABIT_KEY = date => `prime_path_habits_${date}`

function loadHabits() {
  try { return JSON.parse(localStorage.getItem(HABIT_KEY(TODAY()))) || {} } catch { return {} }
}
function saveHabits(v) {
  try { localStorage.setItem(HABIT_KEY(TODAY()), JSON.stringify(v)) } catch {}
}

const MICRO_KEY  = (createdAt, day) => `prime_micro_${createdAt}_d${day}`
function loadMicroDone(createdAt, day) {
  try { return new Set(JSON.parse(localStorage.getItem(MICRO_KEY(createdAt, day))) || []) }
  catch { return new Set() }
}
function saveMicroDone(createdAt, day, set) {
  try { localStorage.setItem(MICRO_KEY(createdAt, day), JSON.stringify([...set])) } catch {}
}

const PHASE_COLORS = {
  'בניית יסודות': '#a78bfa',
  'בניית תאוצה':  '#F5C518',
  'לחץ ובחינה':   '#f59e0b',
  'שילוב ועוצמה': '#10b981',
}

// ── Next-day suggestion card ───────────────────────────────────────
function NextDaySuggestion({ task, dayIndex, phaseColor }) {
  if (!task) return null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '0.85rem 1rem',
      marginTop: '0.75rem',
      animation: 'slide-up 0.35s ease both',
    }}>
      <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>
        ◈ מחר · יום {dayIndex}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <div style={{ width: 3, background: `${phaseColor}60`, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0 }} />
        <div>
          <div style={{ color: phaseColor, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.25rem' }}>
            {task.phase}
          </div>
          <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.5 }}>
            {task.task}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomPathCard({ user, pathRecord, onPathUpdate, onRebuild }) {
  const [record,       setRecord]       = useState(pathRecord)
  const [habits,       setHabits]       = useState(loadHabits)
  const [toastMsg,     setToastMsg]     = useState(null)
  const [showLesson,   setShowLesson]   = useState(false)
  const [microSteps,   setMicroSteps]   = useState(() => {
    if (!pathRecord) return null
    const day = (pathRecord.progress?.currentDay || 1)
    const cached = pathRecord.micro_steps?.[String(day)]
    return Array.isArray(cached) && cached.length > 0 ? cached : null
  })
  const [microLoading, setMicroLoading] = useState(false)
  const [microDone,    setMicroDone]    = useState(() =>
    pathRecord ? loadMicroDone(pathRecord.createdAt, pathRecord.progress?.currentDay || 1) : new Set()
  )

  // ── INITIAL STATE (no path yet) ───────────────────────────────────
  if (!record) {
    return (
      <div style={{
        background: 'linear-gradient(160deg,rgba(245,197,24,0.09) 0%,rgba(245,197,24,0.03) 100%)',
        border: '1px solid rgba(245,197,24,0.28)',
        borderRadius: 20,
        padding: '1.5rem 1.35rem 1.35rem',
        marginBottom: '1.1rem',
        animation: 'slide-up 0.3s ease both',
      }}>
        <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.55rem' }}>
          ◈ מסלול אישי · PRIME
        </div>
        <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.35, marginBottom: '0.4rem' }}>
          תוכנית 30 יום מותאמת אישית
        </div>
        <div style={{ color: 'rgba(241,245,249,0.42)', fontSize: '0.8rem', lineHeight: 1.65, marginBottom: '1.35rem' }}>
          AI ינתח את המטרה שלך וייצור מסלול יומי עם משימות, הרגלים וצעדים קטנים.
        </div>
        <button
          onClick={onRebuild}
          className="btn-primary btn-tactile"
          style={{
            width: '100%',
            padding: '1.1rem 1rem',
            borderRadius: 14,
            fontSize: '1rem',
            fontWeight: 900,
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🚀</span>
          <span>בנה את המסלול שלי ← 5 שאלות</span>
        </button>
      </div>
    )
  }

  // ── ACTIVE STATE ──────────────────────────────────────────────────
  const { path, progress, status } = record
  const currentDay  = progress?.currentDay || 1
  const completedDs = progress?.completedDays || []
  const todayDone   = completedDs.some(d => d.completedAt === TODAY())
  const pct         = Math.round((completedDs.length / 30) * 100)
  const todayTask   = path?.roadmap?.[currentDay - 1]
  const tomorrowTask = path?.roadmap?.[currentDay]   // valid after completion (currentDay already incremented)
  const phaseColor  = todayTask ? (PHASE_COLORS[todayTask.phase] || '#F5C518') : '#F5C518'
  const tomorrowPhaseColor = tomorrowTask ? (PHASE_COLORS[tomorrowTask.phase] || '#F5C518') : '#F5C518'
  const allHabitsDone = path?.daily_habits?.every(h => habits[h.id])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  function toggleHabit(id) {
    if (todayDone) return
    const next = { ...habits, [id]: !habits[id] }
    saveHabits(next)
    setHabits(next)
  }

  async function handleGenerateMicro() {
    if (microLoading || todayDone) return
    setMicroLoading(true)
    try {
      const steps = await generateMicroSteps(user.uid, record, currentDay)
      setMicroSteps(steps)
    } catch {
      showToast('לא הצלחנו לפרק — נסה שוב')
    } finally {
      setMicroLoading(false)
    }
  }

  function toggleMicroStep(order) {
    if (todayDone) return
    const next = new Set(microDone)
    if (next.has(order)) { next.delete(order) }
    else {
      next.add(order)
      showToast('⚡ מיקרו-ניצחון!')
    }
    setMicroDone(next)
    saveMicroDone(record.createdAt, currentDay, next)
  }

  function handleLessonComplete(updatedRecord) {
    setRecord(updatedRecord)
    setHabits({})
    saveHabits({})
    onPathUpdate?.(updatedRecord)
    setShowLesson(false)
    const completedDay = record.progress?.currentDay || 1
    showToast(todayTask?.is_milestone ? `🏆 אבן דרך! השלמת ${completedDay} ימים` : `✅ יום ${completedDay} הושלם`)
  }

  if (status === 'completed') {
    return (
      <div style={{ background: 'linear-gradient(145deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 18, padding: '1.25rem', marginBottom: '1.1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
        <div style={{ color: '#34d399', fontWeight: 900, fontSize: '1rem', marginBottom: '0.25rem' }}>השלמת 30 ימים!</div>
        <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.78rem' }}>{path.path_name}</div>
      </div>
    )
  }

  return (
    <>
      <div style={{ background: 'rgba(245,197,24,0.04)', border: `1px solid ${todayDone ? 'rgba(16,185,129,0.28)' : 'rgba(245,197,24,0.18)'}`, borderRadius: 18, padding: '1.1rem 1.15rem', marginBottom: '1.1rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ מסלול אישי · יום {currentDay}/30</div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.95rem', marginTop: '0.1rem' }}>{path.path_name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 12, padding: '0.35rem 0.65rem', minWidth: 48 }}>
              <div style={{ color: '#F5C518', fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{pct}%</div>
              <div style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.5rem', fontWeight: 700 }}>הושלם</div>
            </div>
            {onRebuild && (
              <button
                onClick={onRebuild}
                className="btn-tactile"
                title="בנה מסלול חדש"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.4, padding: '0.2rem', lineHeight: 1 }}
              >♻️</button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.9rem' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,rgba(245,197,24,0.5),#F5C518)', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>

        {/* Today's task */}
        {todayTask && (
          <div style={{ background: `${phaseColor}0d`, border: `1px solid ${phaseColor}30`, borderRadius: 12, padding: '0.75rem 0.9rem', marginBottom: microSteps ? '0.5rem' : '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {todayTask.is_milestone && <span style={{ fontSize: '0.8rem' }}>🏆</span>}
                <span style={{ color: phaseColor, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>{todayTask.phase}</span>
              </div>
              {!todayDone && !microSteps && (
                <button
                  onClick={handleGenerateMicro}
                  disabled={microLoading}
                  className="btn-tactile"
                  style={{ background: 'none', border: 'none', color: `${phaseColor}99`, fontSize: '0.62rem', fontWeight: 700, cursor: microLoading ? 'default' : 'pointer', padding: '0.1rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'SF Mono','Fira Code',monospace" }}
                >
                  {microLoading
                    ? <><span className="anim-spin" style={{ display: 'inline-block', width: 10, height: 10, border: `1.5px solid ${phaseColor}33`, borderTopColor: phaseColor, borderRadius: '50%' }} /> מפרק...</>
                    : '⚡ פרק למשימות ←'}
                </button>
              )}
            </div>
            <p style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.5, margin: 0 }}>{todayTask.task}</p>
          </div>
        )}

        {/* Micro-steps checklist */}
        {microSteps && (
          <div style={{ marginBottom: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.1rem' }}>
              ⚡ צעדים קטנים — {microDone.size}/{microSteps.length} הושלמו
            </div>
            {microSteps.map(step => {
              const done = microDone.has(step.order) || todayDone
              return (
                <button
                  key={step.order}
                  onClick={() => toggleMicroStep(step.order)}
                  className="btn-tactile"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, cursor: todayDone ? 'default' : 'pointer', textAlign: 'right' }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${done ? '#34d399' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.55rem', color: '#34d399' }}>
                    {done ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: done ? 'rgba(52,211,153,0.7)' : '#e8eaf0', fontSize: '0.8rem', fontWeight: 600, textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'rgba(52,211,153,0.4)' }}>{step.action}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '0.1rem 0.4rem', color: 'rgba(241,245,249,0.25)', fontSize: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace", flexShrink: 0 }}>
                    {step.duration_min}′
                  </div>
                </button>
              )
            })}
            {microDone.size === microSteps.length && !todayDone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.7rem', background: 'rgba(16,185,129,0.06)', borderRadius: 10, marginTop: '0.1rem' }}>
                <span style={{ fontSize: '0.8rem' }}>🎯</span>
                <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>כל הצעדים הושלמו — פתח את השיעור לסיום היום</span>
              </div>
            )}
          </div>
        )}

        {/* Daily habits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.9rem' }}>
          {path.daily_habits.map(h => {
            const done = habits[h.id] || todayDone
            return (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                className="btn-tactile"
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', background: done ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: todayDone ? 'default' : 'pointer', textAlign: 'right' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${done ? '#34d399' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem' }}>
                  {done ? '✓' : ''}
                </div>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{h.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: done ? '#34d399' : '#f1f5f9', fontSize: '0.78rem', fontWeight: 700 }}>{h.title}</div>
                  <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.62rem' }}>{h.duration_min} דקות</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        {todayDone ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 12, justifyContent: 'center' }}>
              <span>✅</span>
              <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>יום {currentDay - 1} הושלם — כל הכבוד</span>
            </div>
            {/* Next-day preview */}
            <NextDaySuggestion
              task={tomorrowTask}
              dayIndex={currentDay}
              phaseColor={tomorrowPhaseColor}
            />
          </>
        ) : (
          <button
            onClick={() => setShowLesson(true)}
            className="btn-primary btn-tactile"
            style={{ width: '100%', padding: '1.1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <span>📖</span>
            <span>פתח שיעור יום {currentDay} ←</span>
          </button>
        )}
      </div>

      {/* Focus Mode lesson overlay */}
      {showLesson && (
        <LessonView
          user={user}
          pathRecord={record}
          dayIndex={currentDay}
          onComplete={handleLessonComplete}
          onClose={() => setShowLesson(false)}
        />
      )}

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(245,197,24,0.35)', borderRadius: 12, padding: '0.65rem 1.1rem', zIndex: 4000, color: '#F5C518', fontSize: '0.82rem', fontWeight: 700, animation: 'fadeIn 0.2s ease', whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {toastMsg}
        </div>
      )}
    </>
  )
}
