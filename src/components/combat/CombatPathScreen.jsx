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

const DIFFICULTY_LABEL = {
  beginner:     'מתחילים',
  intermediate: 'בינוני',
  advanced:     'מתקדם',
}

function ProgressBar({ value, total, color = C.accent }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function TechniqueRow({ name, status }) {
  const iconMap = { done: { symbol: '✓', color: C.green }, current: { symbol: '●', color: C.accent }, locked: { symbol: '🔒', color: '#3A3A40' } }
  const { symbol, color } = iconMap[status] ?? iconMap.locked
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}`, direction: 'rtl' }}>
      <span style={{ color, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{symbol}</span>
      <span style={{ fontSize: 14, color: status === 'locked' ? '#3A3A40' : C.text, flex: 1 }}>{name}</span>
    </div>
  )
}

function WorkoutRow({ workout, completedIds }) {
  const done = completedIds.includes(workout.id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: done ? 'rgba(16,185,129,0.08)' : 'transparent', direction: 'rtl' }}>
      <span style={{ fontSize: 15, color: done ? C.green : C.muted, minWidth: 20, textAlign: 'center' }}>{done ? '✓' : '○'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: done ? C.muted : C.text }}>{workout.titleHe}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{workout.estimatedMinutes} דקות</div>
      </div>
    </div>
  )
}

const TECHNIQUES_DEFAULT_VISIBLE = 3

function CollapsibleTechniqueList({ techniques, techStatus }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? techniques : techniques.slice(0, TECHNIQUES_DEFAULT_VISIBLE)
  const hidden  = techniques.length - TECHNIQUES_DEFAULT_VISIBLE

  return (
    <>
      {visible.map((tech) => <TechniqueRow key={tech} name={tech} status={techStatus(tech)} />)}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '10px 0 2px', width: '100%', textAlign: 'right', direction: 'rtl' }}
        >
          הצג את כל הטכניקות ({hidden} נוספות) ▼
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '10px 0 2px', width: '100%', textAlign: 'right', direction: 'rtl' }}
        >
          הסתר ▲
        </button>
      )}
    </>
  )
}

function LevelAccordion({ level, completedIds, engine, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const unlocked = engine.isLevelUnlocked(level.level, completedIds)
  const done     = engine.isLevelComplete(level.level, completedIds)
  const progress = engine.getLevelProgress(level.level, completedIds)
  const icon     = done ? '✓' : unlocked ? '◉' : '🔒'
  const color    = done ? C.green : unlocked ? C.accent : C.muted

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => unlocked && setOpen((o) => !o)} style={{ width: '100%', background: open ? C.surface : 'transparent', border: 'none', padding: '14px 16px', cursor: unlocked ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl' }}>
        <span style={{ fontSize: 18, color, minWidth: 24, textAlign: 'center' }}>{icon}</span>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: unlocked ? C.text : C.muted }}>רמה {level.level} — {level.titleHe}</div>
          {unlocked && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{progress.completed}/{progress.total} אימונים</div>}
          {!unlocked && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>נעול — השלם את הרמה הקודמת</div>}
        </div>
        {unlocked && <span style={{ color: C.muted, fontSize: 14 }}>{open ? '▲' : '▼'}</span>}
      </button>
      {open && unlocked && (
        <div style={{ background: C.surface, padding: '4px 8px 8px' }}>
          {level.workouts.map((w) => <WorkoutRow key={w.id} workout={w} completedIds={completedIds} />)}
        </div>
      )}
    </div>
  )
}

/**
 * Generic combat path overview screen.
 *
 * Props:
 *   title             — header title string
 *   levels            — LEVELS array
 *   levelOneTechniques — string[] shown in techniques section
 *   state             — { currentLevel, completedWorkoutIds, ... }
 *   engine            — progression engine from createCombatProgressionEngine
 *   freePracticeLabel — string
 *   allCompletedLabel — string shown when entire curriculum is done
 *   onStartWorkout    — fn(workout)
 *   onFreeTraining    — fn()
 *   onClose           — fn()
 */
export default function CombatPathScreen({
  title,
  levels,
  levelOneTechniques,
  state,
  engine,
  freePracticeLabel,
  allCompletedLabel,
  onStartWorkout,
  onFreeTraining,
  onClose,
}) {
  const completedIds  = state?.completedWorkoutIds ?? []
  const nextWorkout   = engine.getNextWorkout(state ?? { completedWorkoutIds: [], currentLevel: 1 })
  const learnedTechs  = engine.getLearnedTechniques(completedIds)
  const allDone       = !nextWorkout && levels?.every((lv) => engine.isLevelComplete(lv.level, completedIds))

  const nextLevel = nextWorkout
    ? levels?.find((lv) => lv.workouts.some((w) => w.id === nextWorkout.id))
    : null

  function techStatus(tech) {
    if (learnedTechs.includes(tech)) return 'done'
    const firstUnlearned = (levelOneTechniques ?? []).find((t) => !learnedTechs.includes(t))
    if (tech === firstUnlearned) return 'current'
    return 'locked'
  }

  const levelProgress = nextLevel ? engine.getLevelProgress(nextLevel.level, completedIds) : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', paddingBottom: 32 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', minHeight: 56, padding: '0 16px', gap: 12 }}>
        <button onClick={onClose} className="btn-tactile" style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 22, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, lineHeight: 1 }}>←</button>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'right' }}>{title}</h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Current workout card */}
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
          {allDone ? (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 15 }}>🏆 {allCompletedLabel}</div>
          ) : nextWorkout ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ background: C.accent + '22', color: C.accent, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  רמה {nextLevel?.level ?? 1} · {nextLevel?.titleHe ?? ''}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  אימון {nextWorkout.order} מתוך {nextLevel?.workouts.length ?? 6}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{nextWorkout.titleHe}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
                {nextWorkout.estimatedMinutes} דקות ·{' '}
                {DIFFICULTY_LABEL[nextWorkout.difficulty] ?? nextWorkout.difficulty} ·{' '}
                {(nextWorkout.equipment ?? []).length === 0 ? 'ללא ציוד' : (nextWorkout.equipment ?? []).join(', ')}
              </div>
              <button className="btn-tactile" onClick={() => onStartWorkout(nextWorkout)} style={{ width: '100%', background: C.accent, color: '#111317', border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 17, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}>
                התחל אימון ←
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 15 }}>🎉 {allCompletedLabel}</div>
          )}
        </div>

        {/* Level progress bar */}
        {nextLevel && levelProgress && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{levelProgress.completed}/{levelProgress.total}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>התקדמות ברמה</span>
            </div>
            <ProgressBar value={levelProgress.completed} total={levelProgress.total} />
          </div>
        )}

        {/* Techniques */}
        {levelOneTechniques && levelOneTechniques.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>טכניקות</div>
            <CollapsibleTechniqueList techniques={levelOneTechniques} techStatus={techStatus} />
          </div>
        )}

        {/* Level roadmap */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>מפת הדרך</div>
          {(levels ?? []).map((level) => (
            <LevelAccordion
              key={level.level}
              level={level}
              completedIds={completedIds}
              engine={engine}
              defaultOpen={nextLevel?.level === level.level}
            />
          ))}
        </div>

        {/* Free training */}
        <button className="btn-tactile" onClick={onFreeTraining} style={{ width: '100%', background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 0', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
          {freePracticeLabel}
        </button>
      </div>
    </div>
  )
}
