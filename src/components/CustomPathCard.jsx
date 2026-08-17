import { useState } from 'react'
import { completePathDay } from '../services/pathBuilderService'
import LessonView from './LessonView'

const TODAY     = () => new Date().toISOString().slice(0, 10)
const HABIT_KEY = date => `prime_checklist_${date}`

function loadChecks() {
  try { return JSON.parse(localStorage.getItem(HABIT_KEY(TODAY()))) || {} } catch { return {} }
}
function saveChecks(v) {
  try { localStorage.setItem(HABIT_KEY(TODAY()), JSON.stringify(v)) } catch {}
}

function weekColor(week) {
  if (week <= 1) return '#a78bfa'
  if (week === 2) return '#F5C518'
  if (week === 3) return '#f59e0b'
  return '#10b981'
}

function missionType(task = '') {
  if (/^זהה/.test(task))  return { badge: '🔍 גילוי', color: '#60a5fa' }
  if (/^תרגל/.test(task)) return { badge: '💪 אימון', color: '#a78bfa' }
  if (/^אתגר/.test(task)) return { badge: '⚡ אתגר', color: '#f59e0b' }
  if (/^עמת/.test(task))  return { badge: '⚔️ עימות', color: '#f87171' }
  if (/^בחן/.test(task))  return { badge: '🎯 בחינה', color: '#F5C518' }
  if (/^שלב/.test(task))  return { badge: '🔗 שילוב', color: '#34d399' }
  if (/^יישם/.test(task)) return { badge: '🚀 יישום', color: '#fb923c' }
  return { badge: '⚡ משימה',  color: '#F5C518' }
}

function isEvening() {
  return new Date().getHours() >= 19
}

// ── Empty state ──────────────────────────────────────────────────────
function EmptyState({ onRebuild }) {
  return (
    <div style={{
      background: 'linear-gradient(160deg,rgba(245,197,24,0.09) 0%,rgba(245,197,24,0.03) 100%)',
      border: '1px solid rgba(245,197,24,0.28)',
      borderRadius: 20, padding: '1.5rem 1.35rem 1.35rem',
      animation: 'slide-up 0.3s ease both',
    }}>
      <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.55rem' }}>
        ◈ מסלול אישי · PRIME
      </div>
      <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.3, marginBottom: '1.1rem' }}>
        תוכנית 30 יום מותאמת אישית
      </div>
      <button onClick={onRebuild} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1.1rem 1rem', borderRadius: 14, fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem' }}>
        <span>🚀</span><span>בנה את המסלול שלי ←</span>
      </button>
    </div>
  )
}

// ── Expanded habit row — title + description + today's action ─────────
function HabitRow({ item, todayAction, checked, onToggle }) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      className="btn-tactile"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
        padding: '0.7rem 0.85rem',
        background: checked ? `${item.color}0e` : 'rgba(255,255,255,0.025)',
        border: `1px solid ${checked ? `${item.color}40` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, cursor: 'pointer',
        textAlign: 'right', width: '100%',
        transition: 'all 0.18s ease',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: checked ? item.color : 'transparent',
        border: `2px solid ${checked ? item.color : 'rgba(255,255,255,0.18)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', fontSize: '0.6rem', color: '#0e0e16', fontWeight: 900,
      }}>{checked ? '✓' : ''}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: item.description ? '0.2rem' : 0 }}>
          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{item.emoji}</span>
          <span style={{
            color: checked ? item.color : '#f1f5f9',
            fontSize: '0.82rem', fontWeight: checked ? 700 : 600,
            textDecoration: checked ? 'line-through' : 'none',
            textDecorationColor: `${item.color}55`, flex: 1,
          }}>{item.label}</span>
          {item.duration && (
            <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.52rem', fontFamily: 'monospace', flexShrink: 0 }}>{item.duration}′</span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div style={{
            color: checked ? `${item.color}80` : 'rgba(241,245,249,0.38)',
            fontSize: '0.7rem', lineHeight: 1.45, marginBottom: todayAction ? '0.3rem' : 0,
            textDecoration: checked ? 'line-through' : 'none',
            textDecorationColor: `${item.color}30`,
          }}>
            {item.description}
          </div>
        )}

        {/* Today's specific action */}
        {todayAction && !checked && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.3rem',
            padding: '0.3rem 0.5rem',
            background: `${item.color}0a`,
            border: `1px solid ${item.color}20`,
            borderRadius: 7, marginTop: '0.2rem',
          }}>
            <span style={{ color: item.color, fontSize: '0.55rem', marginTop: '0.12rem', flexShrink: 0 }}>▶</span>
            <span style={{ color: `${item.color}cc`, fontSize: '0.68rem', lineHeight: 1.4, fontWeight: 600 }}>
              {todayAction}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Divider ──────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 1rem', margin: '0.1rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
      {label && <span style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", flexShrink: 0 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function CustomPathCard({ user, pathRecord, onPathUpdate, onRebuild }) {
  const [record,     setRecord]     = useState(pathRecord)
  const [checks,     setChecks]     = useState(loadChecks)
  const [toastMsg,   setToastMsg]   = useState(null)
  const [showLesson, setShowLesson] = useState(false)
  const [completing, setCompleting] = useState(false)

  if (!record?.path?.daily_habits?.length) return <EmptyState onRebuild={onRebuild} />

  const { path, progress, status, consistency } = record
  const vp           = record.vision_profile || {}
  const vision       = (vp.three_year_vision || '').slice(0, 60)
  const gap          = (vp.the_gap           || '').slice(0, 55)
  const currentDay   = progress?.currentDay || 1
  const completedDs  = progress?.completedDays || []
  const todayDone    = completedDs.some(d => d.completedAt === TODAY())
  const streak       = consistency?.current_streak || 0
  const pathPct      = Math.round((completedDs.length / 30) * 100)
  const todayTask    = path?.roadmap?.[currentDay - 1]
  const tomorrowTask = path?.roadmap?.[currentDay]
  const week         = todayTask?.week || Math.ceil(currentDay / 7)
  const phaseColor   = weekColor(week)
  const mission      = missionType(todayTask?.task || '')
  const isMilestone  = !!todayTask?.is_milestone
  const xpTotal      = completedDs.length * 50
  const urgency      = isEvening() && !todayDone

  const habitItems = [
    path.daily_habits[0] && {
      id: path.daily_habits[0].id,
      emoji: path.daily_habits[0].emoji || '🔒',
      label: path.daily_habits[0].title,
      description: path.daily_habits[0].description || '',
      color: '#a78bfa',
      duration: path.daily_habits[0].duration_min,
      todayAction: todayTask?.habit_1_action || '',
    },
    path.daily_habits[1] && {
      id: path.daily_habits[1].id,
      emoji: path.daily_habits[1].emoji || '🔒',
      label: path.daily_habits[1].title,
      description: path.daily_habits[1].description || '',
      color: '#34d399',
      duration: path.daily_habits[1].duration_min,
      todayAction: todayTask?.habit_2_action || '',
    },
    path.daily_habits[2] && {
      id: path.daily_habits[2].id,
      emoji: path.daily_habits[2].emoji || '💎',
      label: path.daily_habits[2].title,
      description: path.daily_habits[2].description || '',
      color: '#F5C518',
      duration: path.daily_habits[2].duration_min,
      todayAction: '',
    },
  ].filter(Boolean)

  const checkedHabits = todayDone ? habitItems.length : habitItems.filter(h => checks[h.id]).length
  const allDone       = todayDone || (checkedHabits === habitItems.length)

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  function toggleCheck(id) {
    if (todayDone) return
    const next = { ...checks, [id]: !checks[id] }
    saveChecks(next)
    setChecks(next)
  }

  function handleLessonComplete(updatedRecord) {
    setRecord(updatedRecord)
    setChecks({})
    saveChecks({})
    onPathUpdate?.(updatedRecord)
    setShowLesson(false)
    showToast(isMilestone ? `🏆 MILESTONE! יום ${currentDay} הושלם!` : `🔥 +50 XP · יום ${currentDay} הושלם!`)
  }

  async function handleCompleteDay() {
    if (completing || todayDone) return
    setCompleting(true)
    try {
      const updated = await completePathDay(user.uid, record)
      setRecord(updated)
      setChecks({})
      saveChecks({})
      onPathUpdate?.(updated)
      showToast(isMilestone ? `🏆 MILESTONE COMPLETE! +100 XP` : `🔥 +50 XP · יום ${currentDay} הושלם!`)
    } catch {
      showToast('שגיאה — נסה שוב')
    } finally {
      setCompleting(false)
    }
  }

  // ── 30-day completed ──────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <div style={{ background: 'linear-gradient(145deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
        <div style={{ color: '#34d399', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.2rem' }}>30 יום. DONE. גדלת.</div>
        <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem', marginBottom: '1rem' }}>{path.path_name}</div>
        <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.8rem' }}>{xpTotal.toLocaleString()} XP</div>
        {onRebuild && (
          <button onClick={onRebuild} className="btn-tactile"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '0.65rem 1.25rem', color: '#34d399', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
            🔄 מסלול חדש ←
          </button>
        )}
      </div>
    )
  }

  // ── Victory state ─────────────────────────────────────────────────
  if (todayDone) {
    return (
      <>
        <div style={{
          background: 'linear-gradient(145deg,rgba(16,185,129,0.1),rgba(16,185,129,0.03))',
          border: '1.5px solid rgba(16,185,129,0.35)',
          borderRadius: 20, overflow: 'hidden',
          animation: 'slide-up 0.3s ease both',
        }}>
          {/* Victory header */}
          <div style={{ padding: '1rem 1.15rem 0.85rem', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'rgba(52,211,153,0.7)', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.15rem' }}>
                  ✅ משימה הושלמה
                </div>
                <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.95rem' }}>{path.path_name}</div>
              </div>
              {onRebuild && (
                <button onClick={onRebuild} className="btn-tactile" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', opacity: 0.3, padding: '0.2rem' }}>♻️</button>
              )}
            </div>
          </div>

          {/* Victory identity line */}
          {vision && (
            <div style={{ padding: '0.75rem 1.15rem 0', fontSize: '0.75rem', color: 'rgba(52,211,153,0.55)', lineHeight: 1.4, fontStyle: 'italic' }}>
              "{vision}{vision.length >= 60 ? '...' : ''}"
            </div>
          )}

          {/* Stats */}
          <div style={{ padding: '0.75rem 1.15rem', display: 'flex', gap: '0.6rem' }}>
            <div style={{ flex: 1, background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.18)', borderRadius: 12, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
              <div style={{ color: '#F5C518', fontSize: '1.15rem', fontWeight: 900, lineHeight: 1 }}>+50</div>
              <div style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.46rem', fontWeight: 800, marginTop: '0.2rem', letterSpacing: '0.1em' }}>XP נצבר</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
              <div style={{ color: '#fb923c', fontSize: '1.15rem', fontWeight: 900, lineHeight: 1 }}>🔥 {streak}</div>
              <div style={{ color: 'rgba(251,146,60,0.45)', fontSize: '0.46rem', fontWeight: 800, marginTop: '0.2rem', letterSpacing: '0.1em' }}>ימים ברצף</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
              <div style={{ color: '#34d399', fontSize: '1.15rem', fontWeight: 900, lineHeight: 1 }}>{currentDay}/30</div>
              <div style={{ color: 'rgba(52,211,153,0.45)', fontSize: '0.46rem', fontWeight: 800, marginTop: '0.2rem', letterSpacing: '0.1em' }}>ימים הושלמו</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: '0 1.15rem 0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.53rem', fontWeight: 600 }}>התקדמות כללית</span>
              <span style={{ color: '#34d399', fontSize: '0.53rem', fontWeight: 800 }}>{pathPct}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${pathPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* Tomorrow unlock */}
          {tomorrowTask ? (
            <div style={{ margin: '0 1.15rem 1.15rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 0.8rem', background: 'rgba(245,197,24,0.06)', borderBottom: '1px solid rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#F5C518', fontSize: '0.6rem' }}>🔓</span>
                <span style={{ color: 'rgba(245,197,24,0.8)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                  יום {currentDay + 1} נפתח
                </span>
                <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.52rem', marginRight: 'auto' }}>
                  {missionType(tomorrowTask.task || '').badge}
                </span>
              </div>
              <div style={{ padding: '0.65rem 0.8rem' }}>
                <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.78rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tomorrowTask.task}
                </div>
              </div>
            </div>
          ) : currentDay === 30 ? (
            <div style={{ margin: '0 1.15rem 1.15rem', padding: '0.85rem', background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '0.9rem' }}>🏆 30 יום הושלמו — אגדה.</div>
            </div>
          ) : null}
        </div>

        {toastMsg && <Toast msg={toastMsg} />}
      </>
    )
  }

  // ── Active mission state ──────────────────────────────────────────
  const weeklyTheme  = todayTask?.weekly_theme || ''
  const coachNote    = path.coach_note || path.tagline || ''
  const phaseName    = todayTask?.phase || ''

  return (
    <>
      <div style={{
        background: 'linear-gradient(160deg,rgba(8,8,22,0.99) 0%,rgba(12,12,26,0.99) 100%)',
        border: `1.5px solid ${urgency ? 'rgba(239,68,68,0.4)' : isMilestone ? 'rgba(245,197,24,0.5)' : 'rgba(245,197,24,0.18)'}`,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: urgency ? '0 0 28px rgba(239,68,68,0.07)' : isMilestone ? '0 0 32px rgba(245,197,24,0.09)' : 'none',
      }}>

        {/* ── Status bar ── */}
        <div style={{
          padding: '0.65rem 1.1rem',
          background: urgency ? 'rgba(239,68,68,0.07)' : 'rgba(0,0,0,0.3)',
          borderBottom: `1px solid ${urgency ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: urgency ? '#ef4444' : '#22c55e', boxShadow: `0 0 6px ${urgency ? '#ef4444' : '#22c55e'}`, animation: 'pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ color: urgency ? '#fca5a5' : 'rgba(241,245,249,0.45)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
              {urgency ? '⚠ נסגר בחצות' : '⚡ משימה פעילה'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            {streak > 0 && <span style={{ color: '#fb923c', fontSize: '0.7rem', fontWeight: 800 }}>🔥 {streak}</span>}
            <span style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.56rem', fontWeight: 800, fontFamily: 'monospace' }}>{currentDay}/30</span>
            {onRebuild && (
              <button onClick={onRebuild} className="btn-tactile" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', opacity: 0.22, padding: 0 }}>♻️</button>
            )}
          </div>
        </div>

        {/* ── Phase + mission badges ── */}
        <div style={{ padding: '0.9rem 1.1rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ background: `${mission.color}16`, border: `1px solid ${mission.color}38`, borderRadius: 20, padding: '0.15rem 0.55rem', color: mission.color, fontSize: '0.56rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace" }}>
            {mission.badge}
          </span>
          {phaseName && (
            <span style={{ background: `${phaseColor}10`, border: `1px solid ${phaseColor}28`, borderRadius: 20, padding: '0.15rem 0.55rem', color: `${phaseColor}cc`, fontSize: '0.53rem', fontWeight: 700, fontFamily: "'SF Mono','Fira Code',monospace" }}>
              {phaseName.length > 28 ? phaseName.slice(0, 28) + '…' : phaseName}
            </span>
          )}
          {isMilestone && (
            <span style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.38)', borderRadius: 20, padding: '0.15rem 0.55rem', color: '#F5C518', fontSize: '0.56rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace" }}>
              🏆 אבן דרך
            </span>
          )}
        </div>

        {/* ── THE MISSION — hero block ── */}
        <div style={{ padding: '0.15rem 1.1rem 0.9rem' }}>
          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>
            ◈ משימת יום {currentDay}
          </div>
          <div style={{
            color: '#f1f5f9', fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.6,
            borderRight: `3px solid ${phaseColor}`,
            paddingRight: '0.9rem',
          }}>
            {todayTask?.task || 'בצע את משימת היום שלך'}
          </div>

          {/* XP line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.65rem' }}>
            <span style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.56rem', fontWeight: 700 }}>+50 XP</span>
            <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${pathPct}%`, background: `linear-gradient(90deg,${phaseColor}55,${phaseColor})`, transition: 'width 0.4s' }} />
            </div>
            <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.52rem', fontFamily: 'monospace' }}>{pathPct}%</span>
          </div>
        </div>

        <Divider label="למה זה חשוב" />

        {/* ── WHY block — narrative bridge ── */}
        <div style={{ padding: '0.85rem 1.1rem 0.75rem' }}>
          {weeklyTheme && (
            <div style={{
              background: `${phaseColor}08`,
              border: `1px solid ${phaseColor}20`,
              borderRadius: 12, padding: '0.7rem 0.85rem', marginBottom: '0.6rem',
            }}>
              <div style={{ color: `${phaseColor}99`, fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '0.3rem' }}>
                נושא השבוע
              </div>
              <div style={{ color: `${phaseColor}e6`, fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.45 }}>
                {weeklyTheme}
              </div>
            </div>
          )}

          {vision && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'rgba(245,197,24,0.4)', fontSize: '0.72rem', marginTop: '0.05rem', flexShrink: 0 }}>↗</span>
              <div>
                <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', fontWeight: 600 }}>מוביל ל: </span>
                <span style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.68rem', lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{vision}{vision.length >= 60 ? '...' : ''}"
                </span>
              </div>
            </div>
          )}

          {gap && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.35rem' }}>
              <span style={{ color: 'rgba(239,68,68,0.4)', fontSize: '0.72rem', marginTop: '0.05rem', flexShrink: 0 }}>⊘</span>
              <div>
                <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', fontWeight: 600 }}>הפער שנסגר: </span>
                <span style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.68rem', lineHeight: 1.4 }}>
                  "{gap}{gap.length >= 55 ? '...' : ''}"
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Coach voice ── */}
        {coachNote && (
          <>
            <Divider label="המאמן אומר" />
            <div style={{ padding: '0.75rem 1.1rem 0.7rem' }}>
              <div style={{
                background: 'rgba(245,197,24,0.04)',
                border: '1px solid rgba(245,197,24,0.12)',
                borderRadius: 12, padding: '0.7rem 0.9rem',
                display: 'flex', gap: '0.55rem', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>💬</span>
                <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.73rem', lineHeight: 1.55, fontStyle: 'italic' }}>
                  {coachNote.length > 180 ? coachNote.slice(0, 180) + '...' : coachNote}
                </div>
              </div>
            </div>
          </>
        )}

        <Divider label="פרוטוקולים יומיים" />

        {/* ── Daily protocols — expanded ── */}
        <div style={{ padding: '0.7rem 1rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {habitItems.map(item => (
            <HabitRow
              key={item.id}
              item={item}
              todayAction={item.todayAction}
              checked={!!checks[item.id]}
              onToggle={toggleCheck}
            />
          ))}
        </div>

        {/* ── Execute CTA ── */}
        <div style={{ padding: '0.2rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <button
            onClick={handleCompleteDay}
            disabled={completing}
            className="btn-primary btn-tactile"
            style={{
              width: '100%', padding: '1.1rem', borderRadius: 14,
              fontSize: '1rem', fontWeight: 900, opacity: completing ? 0.7 : 1,
              background: allDone
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : urgency
                  ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                  : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem',
            }}
          >
            {completing
              ? <><span className="anim-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%' }} /><span>שומר...</span></>
              : allDone
                ? <><span>🏆</span><span>משימה הושלמה — יום {currentDay}!</span></>
                : urgency
                  ? <><span>⚡</span><span>סגור את היום לפני חצות</span></>
                  : <><span>🔥</span><span>בצע משימה — יום {currentDay}</span></>
            }
          </button>

          {/* Locked tomorrow */}
          {tomorrowTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 }}>
              <span style={{ color: 'rgba(241,245,249,0.16)', fontSize: '0.75rem', flexShrink: 0 }}>🔒</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace' }}>יום {currentDay + 1} — </span>
                <span style={{ color: 'rgba(241,245,249,0.14)', fontSize: '0.6rem', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%', verticalAlign: 'bottom' }}>
                  {tomorrowTask.task.slice(0, 45)}...
                </span>
              </div>
              <span style={{ color: 'rgba(241,245,249,0.1)', fontSize: '0.56rem', fontWeight: 600, flexShrink: 0 }}>סיים היום ←</span>
            </div>
          )}

          <button onClick={() => setShowLesson(true)} className="btn-tactile"
            style={{ background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 10, color: 'rgba(245,197,24,0.82)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.45rem 0.85rem', textAlign: 'center', width: '100%' }}>
            📖 שיעור מעמיק ←
          </button>
        </div>
      </div>

      {showLesson && (
        <LessonView
          user={user}
          pathRecord={record}
          dayIndex={currentDay}
          onComplete={handleLessonComplete}
          onClose={() => setShowLesson(false)}
        />
      )}

      {toastMsg && <Toast msg={toastMsg} />}
    </>
  )
}

function Toast({ msg }) {
  return (
    <div style={{
      position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(8,8,20,0.97)', border: '1px solid rgba(245,197,24,0.4)',
      borderRadius: 14, padding: '0.7rem 1.2rem', zIndex: 4000,
      color: '#F5C518', fontSize: '0.84rem', fontWeight: 800,
      animation: 'slide-up 0.2s ease', whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {msg}
    </div>
  )
}
