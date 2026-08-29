import { useState, useEffect, useRef, useCallback } from 'react'

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
  gray:    '#71717A',
  red:     '#ef4444',
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function padTime(n) {
  return String(n).padStart(2, '0')
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${padTime(m)}:${padTime(s)}`
}

function roundTimerColor(type) {
  switch (type) {
    case 'work':      return C.blue
    case 'warmup':    return C.green
    case 'cooldown':  return C.green
    case 'rest':      return C.gray
    case 'technique': return C.accent
    default:          return C.blue
  }
}

function roundPhaseLabel(round, workRoundIndex, totalWorkRounds) {
  switch (round.type) {
    case 'warmup':    return 'חימום'
    case 'technique': return 'טכניקה'
    case 'rest':      return 'מנוחה'
    case 'cooldown':  return 'שחרור'
    case 'work':
      return `סיבוב ${workRoundIndex} מתוך ${totalWorkRounds}`
    default:
      return round.titleHe
  }
}

// ─── Circular SVG timer ────────────────────────────────────────────────────
const RADIUS = 90
const STROKE = 8
const SIZE   = (RADIUS + STROKE) * 2

function CircularTimer({ timeLeft, totalSeconds, color }) {
  const circumference = 2 * Math.PI * RADIUS
  const pct = totalSeconds > 0 ? timeLeft / totalSeconds : 0
  const dashoffset = circumference * (1 - pct)

  return (
    <div
      style={{
        position: 'relative',
        width: SIZE,
        height: SIZE,
        margin: '0 auto',
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={C.border}
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
      </svg>
      {/* Time label in center */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: C.text,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  )
}

// ─── Progress dots ─────────────────────────────────────────────────────────
function RoundDots({ rounds, currentIndex }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
      {rounds.map((r, i) => {
        const isCurrent  = i === currentIndex
        const isComplete = i < currentIndex
        let bg
        if (isComplete)   bg = C.green
        else if (isCurrent) bg = roundTimerColor(r.type)
        else bg = C.border

        return (
          <div
            key={r.id ?? i}
            style={{
              width: isCurrent ? 10 : 7,
              height: isCurrent ? 10 : 7,
              borderRadius: '50%',
              background: bg,
              transition: 'all 0.2s ease',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Exit confirm modal ────────────────────────────────────────────────────
function ExitModal({ onContinue, onExit }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          padding: 28,
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>לצאת מהאימון?</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
          ההתקדמות לא תישמר ולא יינתן XP
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn-tactile"
            onClick={onContinue}
            style={{
              background: C.accent,
              color: '#111317',
              border: 'none',
              borderRadius: 12,
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            המשך אימון
          </button>
          <button
            className="btn-tactile"
            onClick={onExit}
            style={{
              background: 'transparent',
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '14px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            צא ללא שכר
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function BoxingActiveWorkout({ workout, trainingType: _trainingType, onComplete, onExit }) {
  const rounds = workout?.rounds ?? []

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [timeLeft,          setTimeLeft]           = useState(rounds[0]?.durationSeconds ?? 60)
  const [isRunning,         _setIsRunning]         = useState(true)
  const [isPaused,          setIsPaused]           = useState(false)
  const [showExitConfirm,   setShowExitConfirm]    = useState(false)

  const intervalRef  = useRef(null)
  const startTimeRef = useRef(Date.now())
  // Track total work rounds completed
  const workDoneRef  = useRef(0)

  const currentRound = rounds[currentRoundIndex]
  const totalSeconds = currentRound?.durationSeconds ?? 60

  // Work round tracking
  const workRoundsAll   = rounds.filter((r) => r.type === 'work')
  const totalWorkRounds = workRoundsAll.length
  // How many work rounds have we passed (including current if it's work)
  const workRoundsSoFar = rounds
    .slice(0, currentRoundIndex)
    .filter((r) => r.type === 'work').length
  const currentWorkRoundNum = currentRound?.type === 'work' ? workRoundsSoFar + 1 : null

  // Next round preview
  const nextRound = rounds[currentRoundIndex + 1] ?? null

  // ── Advance to next round or complete ────────────────────────────────────
  const advanceRound = useCallback(() => {
    if (currentRound?.type === 'work') {
      workDoneRef.current += 1
    }

    const nextIndex = currentRoundIndex + 1
    if (nextIndex >= rounds.length) {
      // Workout complete
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      const techniques = workout?.techniques ?? []
      onComplete({
        durationSeconds,
        roundsCompleted: workDoneRef.current,
        techniques,
      })
      return
    }
    setCurrentRoundIndex(nextIndex)
    setTimeLeft(rounds[nextIndex].durationSeconds)
  }, [currentRoundIndex, currentRound, rounds, workout, onComplete])

  // ── Timer interval ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          // Schedule advance on next tick to avoid setState-in-render
          setTimeout(() => advanceRound(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning, isPaused, advanceRound])

  // ── Pause / resume ───────────────────────────────────────────────────────
  function togglePause() {
    setIsPaused((p) => !p)
  }

  // ── Guard: no rounds ─────────────────────────────────────────────────────
  if (!currentRound) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 15 }}>אין סיבובים לאימון זה</div>
      </div>
    )
  }

  const timerColor = roundTimerColor(currentRound.type)
  const phaseLabel = roundPhaseLabel(currentRound, currentWorkRoundNum ?? 0, totalWorkRounds)
  const coachingCues = (currentRound.coachingCuesHe ?? []).slice(0, 2)

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
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          minHeight: 56,
          gap: 10,
        }}
      >
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'right', color: C.text }}>
          {workout.titleHe}
        </div>
        {/* In RTL the "left" of the screen is where content ends — we put ✕ at end of flex row (left visually) */}
        <button
          className="btn-tactile"
          onClick={() => setShowExitConfirm(true)}
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 16,
            cursor: 'pointer',
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Main content (scrollable) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {/* Phase label */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: timerColor,
              background: timerColor + '18',
              borderRadius: 20,
              padding: '4px 14px',
            }}
          >
            {phaseLabel}
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ marginBottom: 20 }}>
          <RoundDots rounds={rounds} currentIndex={currentRoundIndex} />
        </div>

        {/* Circular timer */}
        <CircularTimer
          timeLeft={timeLeft}
          totalSeconds={totalSeconds}
          color={timerColor}
        />

        {/* Instruction section */}
        <div
          style={{
            background: C.surface,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: '16px',
            marginTop: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>
            {currentRound.titleHe}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#D4D0C8',
              lineHeight: 1.7,
              textAlign: 'right',
            }}
          >
            {currentRound.instructionHe}
          </div>
        </div>

        {/* Coaching cues — work rounds only */}
        {currentRound.type === 'work' && coachingCues.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {coachingCues.map((cue, i) => (
              <div
                key={i}
                style={{
                  background: timerColor + '12',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  color: C.muted,
                  textAlign: 'right',
                  borderRight: `3px solid ${timerColor}`,
                }}
              >
                {cue}
              </div>
            ))}
          </div>
        )}

        {/* Next round preview — rest rounds only */}
        {currentRound.type === 'rest' && nextRound && (
          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: '12px 16px',
              marginBottom: 16,
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>בסיבוב הבא:</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{nextRound.titleHe}</div>
          </div>
        )}
      </div>

      {/* ── Controls (fixed bottom) ── */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
        }}
      >
        <button
          className="btn-tactile"
          onClick={togglePause}
          style={{
            width: '100%',
            minHeight: 54,
            background: isPaused ? C.accent : C.surface,
            color: isPaused ? '#111317' : C.text,
            border: `1px solid ${isPaused ? C.accent : C.border}`,
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {isPaused ? '▶ המשך' : '⏸ השהה'}
        </button>
      </div>

      {/* ── Exit confirm modal ── */}
      {showExitConfirm && (
        <ExitModal
          onContinue={() => setShowExitConfirm(false)}
          onExit={onExit}
        />
      )}
    </div>
  )
}
