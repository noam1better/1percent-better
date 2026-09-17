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
import {
  DRILL_CATEGORIES,
  DRILL_DURATIONS,
  buildDrill,
  getLastDuration,
  saveLastDuration,
} from '../../data/boxingDrills'
import BoxingDrillTimer from './BoxingDrillTimer'
import BoxingFormAnalysis from './BoxingFormAnalysis'
import BoxingSessionAnalysis from './BoxingSessionAnalysis'

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

// ─── category brief instructions ────────────────────────────────────────────
const CATEGORY_BRIEF = {
  'footwork':       'עבוד על תנועה, מיקום ויציאות זווית בכל רמת אינטנסיביות.',
  'punch-technique': 'תרגל ג׳אב, קרוס, הוק ואפרקט — כל מכה עם חזרה מלאה לגארד.',
  'defense':        'תרגל גארד נכון, סנטר מורד, התחמקות והתאוששות אחרי מכות.',
  'combinations':   'תרגל רצפי מכות (1-2, 1-2-3) משולבים עם הגנה ותנועה.',
  'free-training':  'בחר כמה זמן ותאמן כל טכניקה שתרצה — בלי הגבלה.',
  'analysis': 'בדיקת יציבה ומיקום גוף מתמונה בודדת. לא מתאים להערכת תנועה או קומבינציות.',
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function levelStatusIcon(levelNum, completedIds) {
  if (isLevelComplete(levelNum, completedIds)) return { icon: '✓', color: C.green }
  if (isLevelUnlocked(levelNum, completedIds)) return { icon: '◉', color: C.accent }
  return { icon: '🔒', color: C.muted }
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── sub-components (kept for guided course section) ─────────────────────────
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
export default function BoxingPathScreen({
  profile,
  onStartWorkout,
  onFreeTraining,
  onClose,
  onDrillComplete,
}) {
  // ── guided course state ──
  const state        = getBoxingState(profile)
  const nextWorkout  = getNextWorkout(state)
  const completedIds = state.completedWorkoutIds ?? []

  const learnedTechs  = getLearnedTechniques(completedIds)
  const allL1Complete = isLevelComplete(1, completedIds)

  const nextLevel = nextWorkout
    ? BOXING_LEVELS.find((lv) => lv.workouts.some((w) => w.id === nextWorkout.id))
    : null

  function techStatus(tech) {
    if (learnedTechs.includes(tech)) return 'done'
    const firstUnlearned = L1_TECHNIQUES.find((t) => !learnedTechs.includes(t))
    if (tech === firstUnlearned) return 'current'
    return 'locked'
  }

  // ── view state machine ──
  const [view,             setView]             = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(() => getLastDuration())
  const [skipWarmup,       setSkipWarmup]       = useState(false)
  const [activeDrill,      setActiveDrill]      = useState(null)
  const [drillStats,       setDrillStats]       = useState(null)
  const [showCourse,       setShowCourse]       = useState(false)
  const [xpAwarded,        setXpAwarded]        = useState(0)
  const [videoReturnView,  setVideoReturnView]  = useState('home')

  // ── guided course summary text for collapsed header ──
  const courseProgressText = (() => {
    if (!nextLevel) return null
    const p = getLevelProgress(nextLevel.level, completedIds)
    return `אימון ${p.completed + 1}/${p.total} · רמה ${nextLevel.level}`
  })()

  // ─── VIEW: drill-active ───────────────────────────────────────────────────
  if (view === 'drill-active' && activeDrill) {
    return (
      <BoxingDrillTimer
        workout={activeDrill}
        skipWarmup={skipWarmup}
        onComplete={async (stats) => {
          // Only award XP for sessions with meaningful activity (≥60s elapsed OR ≥1 work round)
          const earnedXP = stats.durationSeconds >= 60 || stats.roundsCompleted >= 1
          const xp = (earnedXP && onDrillComplete) ? await onDrillComplete(stats) : 0
          const awarded = xp ?? 0
          setXpAwarded(awarded)
          setDrillStats({ ...stats, xpAwarded: awarded })
          setActiveDrill(null)
          setView('drill-complete')
        }}
        onExit={() => {
          setActiveDrill(null)
          setView('drill-config')
        }}
      />
    )
  }

  // ─── VIEW: analysis ───────────────────────────────────────────────────────
  if (view === 'analysis') {
    return (
      <BoxingFormAnalysis
        onClose={() => setView('home')}
        categoryHint="טכניקת איגרוף"
      />
    )
  }

  // ─── VIEW: drill-complete ─────────────────────────────────────────────────
  if (view === 'drill-complete' && drillStats) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.text,
          direction: 'rtl',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥊</div>

        <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, marginBottom: 24 }}>
          אימון הושלם!
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '12px 18px',
              textAlign: 'center',
              minWidth: 80,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
              {formatDuration(drillStats.durationSeconds)}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>זמן</div>
          </div>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '12px 18px',
              textAlign: 'center',
              minWidth: 80,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
              {drillStats.roundsCompleted}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>סיבובים</div>
          </div>
          {selectedCategory && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '12px 18px',
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 20}}>{selectedCategory.emoji}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {selectedCategory.labelHe}
              </div>
            </div>
          )}
        </div>

        {/* XP */}
        {xpAwarded > 0 && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.accent,
              marginBottom: 28,
            }}
          >
            +{xpAwarded} XP ✨
          </div>
        )}

        {/* Buttons */}
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-tactile"
            onClick={() => {
              const drill = buildDrill(selectedCategory?.id, selectedDuration, skipWarmup)
              setActiveDrill(drill)
              setDrillStats(null)
              setView('drill-active')
            }}
            style={{
              width: '100%',
              minHeight: 54,
              background: C.accent,
              color: '#111317',
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🔁 חזור על האימון
          </button>
          <button
            className="btn-tactile"
            onClick={() => {
              setDrillStats(null)
              setView('home')
            }}
            style={{
              width: '100%',
              minHeight: 54,
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            אימון נוסף
          </button>
          <button
            onClick={() => { setVideoReturnView('drill-complete'); setView('video-analysis') }}
            style={{
              width: '100%',
              minHeight: 44,
              background: 'transparent',
              color: C.muted,
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            🎬 ניתוח וידאו של הסשן
          </button>
        </div>
      </div>
    )
  }

  // ─── VIEW: video-analysis ────────────────────────────────────────────────────
  if (view === 'video-analysis') {
    return (
      <BoxingSessionAnalysis
        sessionStats={drillStats}
        categoryId={selectedCategory?.id}
        onClose={() => setView(videoReturnView)}
      />
    )
  }

  // ─── VIEW: drill-config ───────────────────────────────────────────────────
  if (view === 'drill-config' && selectedCategory) {
    const brief = CATEGORY_BRIEF[selectedCategory.id] ?? ''

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
        {/* Sticky header */}
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
            onClick={() => setView('home')}
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
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{selectedCategory.labelHe}</span>
            <span style={{ fontSize: 22 }}>{selectedCategory.emoji}</span>
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          {/* Brief instructions */}
          {brief && (
            <div
              style={{
                fontSize: 14,
                color: C.muted,
                lineHeight: 1.6,
                marginBottom: 24,
                textAlign: 'right',
                background: C.surface,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: '12px 14px',
                borderRight: `3px solid ${C.accent}`,
              }}
            >
              {brief}
            </div>
          )}

          {/* Duration label */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 12,
              textAlign: 'right',
              color: C.text,
            }}
          >
            כמה זמן?
          </div>

          {/* Duration buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            {DRILL_DURATIONS.map((dur) => {
              const isSelected = selectedDuration === dur
              return (
                <button
                  key={dur}
                  className="btn-tactile"
                  onClick={() => setSelectedDuration(dur)}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    minWidth: 64,
                    background: isSelected ? C.accent + '22' : C.surface,
                    color: isSelected ? C.accent : C.text,
                    border: `2px solid ${isSelected ? C.accent : C.border}`,
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {dur} דקות
                </button>
              )
            })}
          </div>

          {/* Warmup toggle — only for 5+ min */}
          {selectedDuration >= 5 && (
            <button
              className="btn-tactile"
              onClick={() => setSkipWarmup((v) => !v)}
              style={{
                width: '100%',
                minHeight: 52,
                background: skipWarmup ? C.surface : 'transparent',
                color: skipWarmup ? C.text : C.muted,
                border: `1px solid ${skipWarmup ? C.accent : C.border}`,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '0 16px',
                marginBottom: 28,
                textAlign: 'right',
                transition: 'all 0.15s ease',
              }}
            >
              <span>כבר מחוממ/ת — דלג על חימום</span>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${skipWarmup ? C.accent : C.border}`,
                  background: skipWarmup ? C.accent : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 13,
                  color: skipWarmup ? '#111317' : 'transparent',
                }}
              >
                ✓
              </span>
            </button>
          )}

          {/* Start button */}
          <button
            className="btn-tactile"
            onClick={() => {
              saveLastDuration(selectedDuration)
              const drill = buildDrill(selectedCategory.id, selectedDuration, skipWarmup)
              setActiveDrill(drill)
              setView('drill-active')
            }}
            style={{
              width: '100%',
              minHeight: 58,
              background: C.accent,
              color: '#111317',
              border: 'none',
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            התחל {selectedDuration} דקות ←
          </button>
        </div>
      </div>
    )
  }

  // ─── VIEW: home ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        direction: 'rtl',
        fontFamily: 'system-ui, sans-serif',
        paddingBottom: 32,
        overflowX: 'hidden',
      }}
    >
      {/* Sticky header */}
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
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ←
        </button>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'right' }}>
          🥊 איגרוף
        </h1>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* ── Quick Start ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, textAlign: 'right', letterSpacing: 0.3 }}>
            ⚡ הפעלה מהירה
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-tactile"
              onClick={() => {
                const cat = DRILL_CATEGORIES.find(c => c.id === 'footwork')
                setSelectedCategory(cat)
                saveLastDuration(selectedDuration)
                const drill = buildDrill('footwork', selectedDuration)
                setActiveDrill(drill)
                setView('drill-active')
              }}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 72,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '12px 8px',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>👟</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>רגליים מהיר</span>
              <span style={{ fontSize: 11, color: C.muted }}>{selectedDuration} דק׳</span>
            </button>
            <button
              className="btn-tactile"
              onClick={() => {
                const cat = DRILL_CATEGORIES.find(c => c.id === 'combinations')
                setSelectedCategory(cat)
                saveLastDuration(selectedDuration)
                const drill = buildDrill('combinations', selectedDuration)
                setActiveDrill(drill)
                setView('drill-active')
              }}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 72,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '12px 8px',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>🥊</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>ידיים מהיר</span>
              <span style={{ fontSize: 11, color: C.muted }}>{selectedDuration} דק׳</span>
            </button>
          </div>
        </div>

        {/* Section title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            marginBottom: 12,
            textAlign: 'right',
          }}
        >
          על מה עובדים היום?
        </div>

        {/* Category grid — 2 columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 24,
          }}
        >
          {DRILL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="btn-tactile"
              onClick={() => {
                if (cat.id === 'analysis') {
                  setView('analysis')
                } else {
                  setSelectedCategory(cat)
                  setView('drill-config')
                }
              }}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '14px 12px',
                cursor: 'pointer',
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                minHeight: 88,
                minWidth: 0,
                overflow: 'hidden',
                transition: 'border-color 0.15s ease',
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>{cat.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2, wordBreak: 'break-word' }}>
                {cat.labelHe}
              </span>
              <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, wordBreak: 'break-word' }}>
                {cat.descHe}
              </span>
            </button>
          ))}
        </div>

        {/* Video session analysis — standalone entry */}
        <button
          className="btn-tactile"
          onClick={() => { setVideoReturnView('home'); setDrillStats(null); setView('video-analysis') }}
          style={{
            width: '100%',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '14px 16px',
            cursor: 'pointer',
            textAlign: 'right',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>🎬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>ניתוח סשן</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>העלה קליפ מהאימון לניתוח AI מפורט</div>
          </div>
          <span style={{ fontSize: 16, color: C.muted, flexShrink: 0 }}>←</span>
        </button>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: C.border,
            marginBottom: 20,
          }}
        />

        {/* Guided course — collapsible */}
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {/* Collapsible header */}
          <button
            className="btn-tactile"
            onClick={() => setShowCourse((v) => !v)}
            style={{
              width: '100%',
              background: showCourse ? C.surface : 'transparent',
              border: 'none',
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              direction: 'rtl',
              minHeight: 52,
            }}
          >
            <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>
              {showCourse ? '▲' : '▼'}
            </span>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                מסלול מודרך
              </span>
              {courseProgressText && !showCourse && (
                <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>
                  {courseProgressText}
                </span>
              )}
            </div>
          </button>

          {/* Expanded content */}
          {showCourse && (
            <div style={{ background: C.surface, padding: '4px 16px 16px' }}>

              {/* Current workout card */}
              <div
                style={{
                  background: C.bg,
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  padding: 16,
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                {allL1Complete && !nextWorkout ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
                      כל אימוני רמה 1 הושלמו!
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
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
                        fontSize: 14,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      חזור לתרגל 🥋
                    </button>
                  </div>
                ) : nextWorkout ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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

                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
                      {nextWorkout.titleHe}
                    </div>

                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                      {nextWorkout.estimatedMinutes} דקות ·{' '}
                      {DIFFICULTY_LABEL[nextWorkout.difficulty] ?? nextWorkout.difficulty} ·{' '}
                      {(nextWorkout.equipment ?? []).join(', ')}
                    </div>

                    <button
                      className="btn-tactile"
                      onClick={() => onStartWorkout(nextWorkout)}
                      style={{
                        width: '100%',
                        background: C.accent,
                        color: '#111317',
                        border: 'none',
                        borderRadius: 12,
                        padding: '14px 0',
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      התחל אימון ←
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: C.muted, fontSize: 14 }}>
                    🏆 השלמת את כל תכנית האיגרוף!
                  </div>
                )}
              </div>

              {/* Level progress bar */}
              {nextLevel && (
                <div
                  style={{
                    background: C.bg,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    padding: '12px 14px',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: C.muted }}>
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

              {/* Techniques section */}
              <div
                style={{
                  background: C.bg,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  padding: '12px 14px',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>
                  טכניקות
                </div>
                {L1_TECHNIQUES.map((tech) => (
                  <TechniqueRow key={tech} name={tech} status={techStatus(tech)} />
                ))}
              </div>

              {/* Level list */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textAlign: 'right', color: C.text }}>
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

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
