import { useState } from 'react'

const C = {
  bg:      '#111317',
  surface: '#1C1F26',
  border:  '#2A2D35',
  text:    '#F4F1E8',
  muted:   '#71717A',
  accent:  '#D9B34C',
  blue:    '#60a5fa',
  green:   '#10b981',
}

function formatDuration(seconds) {
  if (!seconds || seconds < 60) return `${seconds ?? 0} שנ׳`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (s === 0) return `${m} דק׳`
  return `${m}:${String(s).padStart(2, '0')} דק׳`
}

function StatCard({ value, label }) {
  return (
    <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
    </div>
  )
}

/**
 * Generic combat completion screen.
 *
 * @param {string}   disciplineEmoji    - e.g. "🥊" or "🦵"
 * @param {string}   completionTitle    - e.g. "האימון הושלם!"
 * @param {Array}    levels             - BOXING_LEVELS or MT_LEVELS (for next workout lookup)
 * @param {Array}    reflectionOptions  - [{ id, label }]
 * @param {object}   workout            - completed workout
 * @param {object}   stats              - { durationSeconds, roundsCompleted, techniques }
 * @param {number}   xpAwarded          - XP given (0 = already earned today)
 * @param {object}   nextWorkout        - next recommended workout (or null)
 * @param {number}   levelJustCompleted - level number that was just finished (or null)
 * @param {Function} onDone             - callback on Done button
 */
export default function CombatCompletion({
  disciplineEmoji,
  completionTitle,
  levels,
  reflectionOptions,
  workout,
  stats,
  xpAwarded,
  nextWorkout,
  levelJustCompleted,
  onDone,
}) {
  const [selectedReflection, setSelectedReflection] = useState(null)

  const completedLevelNum = workout?.level ?? 1
  const nextLevelObj      = levels?.find((lv) => lv.level === completedLevelNum + 1)
  const techniqueCount    = (stats?.techniques ?? []).length

  function findNextWorkoutLevelLength() {
    if (!nextWorkout || !levels) return 6
    const lv = levels.find((l) => l.workouts.some((w) => w.id === nextWorkout.id))
    return lv?.workouts.length ?? 6
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', padding: '32px 16px 40px', display: 'flex', flexDirection: 'column' }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{disciplineEmoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 8px', color: C.text }}>{completionTitle}</h1>
        <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>{workout?.titleHe ?? ''}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatCard value={formatDuration(stats?.durationSeconds)} label="זמן" />
        <StatCard value={stats?.roundsCompleted ?? 0} label="סיבובים" />
        {techniqueCount > 0 && <StatCard value={techniqueCount} label="טכניקות" />}
      </div>

      {/* XP card */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: C.muted }}>{xpAwarded > 0 ? 'XP שנצבר' : 'XP'}</div>
        </div>
        {xpAwarded > 0 ? (
          <div style={{ fontSize: 24, fontWeight: 900, color: C.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>+{xpAwarded}</span>
            <span style={{ fontSize: 16 }}>XP</span>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: C.muted, fontStyle: 'italic' }}>ה־XP היומי כבר התקבל</div>
        )}
      </div>

      {/* Level completion banner */}
      {levelJustCompleted && (
        <div style={{ background: `linear-gradient(135deg, ${C.accent}22, ${C.green}18)`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: '18px 16px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.accent, marginBottom: 6 }}>רמה {completedLevelNum} הושלמה!</div>
          {nextLevelObj && (
            <div style={{ fontSize: 13, color: C.muted }}>רמה {nextLevelObj.level} מופתחת — {nextLevelObj.titleHe}</div>
          )}
        </div>
      )}

      {/* Next workout teaser */}
      {!levelJustCompleted && nextWorkout && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>הבא:</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{nextWorkout.titleHe}</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            אימון {nextWorkout.order} מתוך {findNextWorkoutLevelLength()} · {nextWorkout.estimatedMinutes} דקות
          </div>
        </div>
      )}

      {/* Reflection */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>מה היה לך הכי קשה?</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>אופציונלי — בחר אם מרגיש לך</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(reflectionOptions ?? []).map((opt) => {
            const selected = selectedReflection === opt.id
            return (
              <button key={opt.id} className="btn-tactile" onClick={() => setSelectedReflection(selected ? null : opt.id)} style={{ background: selected ? C.blue + '22' : C.bg, color: selected ? C.blue : C.muted, border: `1px solid ${selected ? C.blue : C.border}`, borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn-tactile" onClick={() => onDone(selectedReflection)} style={{ width: '100%', background: C.accent, color: '#111317', border: 'none', borderRadius: 14, padding: '16px 0', fontSize: 17, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}>
        המשך ←
      </button>
    </div>
  )
}
