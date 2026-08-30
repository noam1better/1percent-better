import { useState } from 'react'
import { BOXING_LEVELS, L1_TECHNIQUES } from '../../data/boxingPath'
import {
  getBoxingState,
  getNextWorkout,
  getLevelProgress,
  isLevelUnlocked,
  isLevelComplete,
  getLearnedTechniques,
} from '../../utils/boxingProgress'

// ─── palette ────────────────────────────────────────────────────────────────
const C = {
  bg:      '#111317',
  surface: '#1C1F26',
  border:  '#2A2D35',
  text:    '#F4F1E8',
  muted:   '#71717A',
  accent:  '#D9B34C',
  blue:    '#60a5fa',
  green:   '#10b981',
  red:     '#ef4444',
}

const DIFFICULTY_LABEL = {
  beginner:     'מתחילים',
  intermediate: 'בינוני',
  advanced:     'מתקדם',
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function levelStatusIcon(levelNum, completedIds) {
  if (isLevelComplete(levelNum, completedIds)) return { icon: '✓', color: C.green }
  if (isLevelUnlocked(levelNum, completedIds)) return { icon: '◉', color: C.accent }
  return { icon: '🔒', color: C.muted }
}

// ─── sub-components ──────────────────────────────────────────────────────────
function ProgressBar({ value, total, color = C.accent }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 8,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

function TechniqueRow({ name, status }) {
  // status: 'done' | 'current' | 'locked'
  const iconMap = {
    done:    { symbol: '✓', color: C.green },
    current: { symbol: '●', color: C.accent },
    locked:  { symbol: '🔒', color: '#3A3A40' },
  }
  const { symbol, color } = iconMap[status]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: `1px solid ${C.border}`,
        direction: 'rtl',
      }}
    >
      <span style={{ color, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{symbol}</span>
      <span
        style={{
          fontSize: 14,
          color: status === 'locked' ? '#3A3A40' : C.text,
          flex: 1,
        }}
      >
        {name}
      </span>
    </div>
  )
}

function WorkoutRow({ workout, completedIds }) {
  const done = completedIds.includes(workout.id)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        background: done ? 'rgba(16,185,129,0.08)' : 'transparent',
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: 15, color: done ? C.green : C.muted, minWidth: 20, textAlign: 'center' }}>
        {done ? '✓' : '○'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: done ? C.muted : C.text }}>{workout.titleHe}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {workout.estimatedMinutes} דקות
        </div>
      </div>
    </div>
  )
}

function LevelAccordion({ level, completedIds, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const unlocked = isLevelUnlocked(level.level, completedIds)
  const { icon, color } = levelStatusIcon(level.level, completedIds)
  const progress = getLevelProgress(level.level, completedIds)

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      {/* header row */}
      <button
        onClick={() => unlocked && setOpen((o) => !o)}
        style={{
          width: '100%',
          background: open ? C.surface : 'transparent',
          border: 'none',
          padding: '14px 16px',
          cursor: unlocked ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          direction: 'rtl',
        }}
      >
        <span style={{ fontSize: 18, color, minWidth: 24, textAlign: 'center' }}>{icon}</span>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: unlocked ? C.text : C.muted }}>
            רמה {level.level} — {level.titleHe}
          </div>
          {unlocked && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {progress.completed}/{progress.total} אימונים
            </div>
          )}
          {!unlocked && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>נעול — השלם את הרמה הקודמת</div>
          )}
        </div>
        {unlocked && (
          <span style={{ color: C.muted, fontSize: 14 }}>{open ? '▲' : '▼'}</span>
        )}
      </button>

      {/* expanded workout list */}
      {open && unlocked && (
        <div style={{ background: C.surface, padding: '4px 8px 8px' }}>
          {level.workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} completedIds={completedIds} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function BoxingPathScreen({ profile, onStartWorkout, onFreeTraining, onClose }) {
  const state        = getBoxingState(profile)
  const nextWorkout  = getNextWorkout(state)
  const completedIds = state.completedWorkoutIds ?? []

  // Level 1 progress for progress bar section
  const _l1Progress    = getLevelProgress(1, completedIds)
  const learnedTechs   = getLearnedTechniques(completedIds)
  const allL1Complete  = isLevelComplete(1, completedIds)

  // Determine which level the next workout belongs to
  const nextLevel = nextWorkout
    ? BOXING_LEVELS.find((lv) => lv.workouts.some((w) => w.id === nextWorkout.id))
    : null

  // Determine technique status using the imported L1_TECHNIQUES list
  function techStatus(tech) {
    if (learnedTechs.includes(tech)) return 'done'
    // Is this the next unlearned technique in order?
    const firstUnlearned = L1_TECHNIQUES.find((t) => !learnedTechs.includes(t))
    if (tech === firstUnlearned) return 'current'
    return 'locked'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        direction: 'rtl',
        fontFamily: 'system-ui, sans-serif',
        paddingBottom: 32,
      }}
    >
      {/* ── Sticky header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          minHeight: 56,
          padding: '0 16px',
          gap: 12,
        }}
      >
        <button
          onClick={onClose}
          className="btn-tactile"
          style={{
            background: 'transparent',
            border: 'none',
            color: C.text,
            fontSize: 22,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 8,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'right' }}>
          🥊 איגרוף — מהיסודות ללוחם
        </h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── Current workout card ── */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {allL1Complete && !nextWorkout ? (
            /* All Level 1 done */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
                כל אימוני רמה 1 הושלמו!
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                רמה 2 — תנועה ועבודת רגליים ממתינה לך
              </div>
              <button
                className="btn-tactile"
                onClick={onFreeTraining}
                style={{
                  background: C.border,
                  color: C.text,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 24px',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                חזור לתרגל 🥋
              </button>
            </div>
          ) : nextWorkout ? (
            <>
              {/* Level badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    background: C.accent + '22',
                    color: C.accent,
                    borderRadius: 20,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  רמה {nextLevel?.level ?? 1} · {nextLevel?.titleHe ?? ''}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  אימון {nextWorkout.order} מתוך {nextLevel?.workouts.length ?? 6}
                </span>
              </div>

              {/* Workout title */}
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {nextWorkout.titleHe}
              </div>

              {/* Meta */}
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
                {nextWorkout.estimatedMinutes} דקות ·{' '}
                {DIFFICULTY_LABEL[nextWorkout.difficulty] ?? nextWorkout.difficulty} ·{' '}
                {(nextWorkout.equipment ?? []).join(', ')}
              </div>

              {/* Primary CTA */}
              <button
                className="btn-tactile"
                onClick={() => onStartWorkout(nextWorkout)}
                style={{
                  width: '100%',
                  background: C.accent,
                  color: '#111317',
                  border: 'none',
                  borderRadius: 14,
                  padding: '15px 0',
                  fontSize: 17,
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                }}
              >
                התחל אימון ←
              </button>
            </>
          ) : (
            /* No workouts left (all curriculum done) */
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 15 }}>
              🏆 השלמת את כל תכנית האיגרוף!
            </div>
          )}
        </div>

        {/* ── Level progress bar ── */}
        {nextLevel && (
          <div
            style={{
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, color: C.muted }}>
                {getLevelProgress(nextLevel.level, completedIds).completed}/
                {getLevelProgress(nextLevel.level, completedIds).total}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                התקדמות ברמה
              </span>
            </div>
            <ProgressBar
              value={getLevelProgress(nextLevel.level, completedIds).completed}
              total={getLevelProgress(nextLevel.level, completedIds).total}
            />
          </div>
        )}

        {/* ── Techniques section ── */}
        <div
          style={{
            background: C.surface,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>
            טכניקות
          </div>
          {L1_TECHNIQUES.map((tech) => (
            <TechniqueRow key={tech} name={tech} status={techStatus(tech)} />
          ))}
        </div>

        {/* ── Level list ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>
            מפת הדרך
          </div>
          {BOXING_LEVELS.map((level) => (
            <LevelAccordion
              key={level.level}
              level={level}
              completedIds={completedIds}
              defaultOpen={nextLevel?.level === level.level}
            />
          ))}
        </div>

        {/* ── Free training button ── */}
        <button
          className="btn-tactile"
          onClick={onFreeTraining}
          style={{
            width: '100%',
            background: C.surface,
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '14px 0',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          אימון חופשי 🥊
        </button>
      </div>
    </div>
  )
}
