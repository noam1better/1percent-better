import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const MUTE_KEY = 'prime_boxing_audio_muted'

function useAudio() {
  const ctxRef    = useRef(null)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === 'true' } catch { return false }
  })

  const tryUnlock = useCallback(() => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }
    } catch {}
  }, [])

  // beepSpecs: array of [freq, durationSec, delaySec]
  const play = useCallback((beepSpecs) => {
    if (muted) return
    try {
      const ctx = ctxRef.current
      if (!ctx || ctx.state === 'suspended') return
      beepSpecs.forEach(([freq, dur, delay]) => {
        const osc   = ctx.createOscillator()
        const gain  = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type      = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + (delay ?? 0)
        gain.gain.setValueAtTime(0.35, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.01)
      })
    } catch {}
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      try { localStorage.setItem(MUTE_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  return { muted, toggleMute, play, tryUnlock }
}

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

function padTime(n) { return String(n).padStart(2, '0') }
function formatTime(s) {
  const m = Math.floor(s / 60)
  return `${padTime(m)}:${padTime(s % 60)}`
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
    case 'work':      return `סיבוב ${workRoundIndex} מתוך ${totalWorkRounds}`
    default:          return round.titleHe
  }
}

const RADIUS = 90
const STROKE = 8
const SIZE   = (RADIUS + STROKE) * 2

function CircularTimer({ timeLeft, totalSeconds, color }) {
  const circumference = 2 * Math.PI * RADIUS
  const pct           = totalSeconds > 0 ? timeLeft / totalSeconds : 0
  const dashoffset    = circumference * (1 - pct)

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto' }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={C.border} strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: 2, lineHeight: 1 }}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  )
}

function RoundDots({ rounds, currentIndex }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
      {rounds.map((r, i) => {
        const isCurrent  = i === currentIndex
        const isComplete = i < currentIndex
        const bg = isComplete ? C.green : isCurrent ? roundTimerColor(r.type) : C.border
        return (
          <div key={r.id ?? i} style={{ width: isCurrent ? 10 : 7, height: isCurrent ? 10 : 7, borderRadius: '50%', background: bg, transition: 'all 0.2s ease' }} />
        )
      })}
    </div>
  )
}

function ExitModal({ onContinue, onExit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center', direction: 'rtl' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>לצאת מהאימון?</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>ההתקדמות לא תישמר ולא יינתן XP</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-tactile" onClick={onContinue} style={{ background: C.accent, color: '#111317', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>המשך אימון</button>
          <button className="btn-tactile" onClick={onExit} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>צא ללא שכר</button>
        </div>
      </div>
    </div>
  )
}

// Audio beep specs: [freq, durationSec, delaySec]
const BEEP_WORK_START = [[660, 0.12, 0], [880, 0.12, 0.18]]
const BEEP_REST_START = [[440, 0.3,  0]]
const BEEP_COMPLETE   = [[440, 0.15, 0], [550, 0.15, 0.2], [660, 0.15, 0.4]]
const BEEP_WARNING    = [[880, 0.08, 0], [880, 0.08, 0.15], [880, 0.08, 0.3]]

export default function BoxingDrillTimer({ workout, onComplete, onExit, skipWarmup = false }) {
  const effectiveRounds = useMemo(() => {
    const rounds = workout?.rounds ?? []
    if (!skipWarmup) return rounds
    const first = rounds.findIndex(r => r.type !== 'warmup')
    return first >= 0 ? rounds.slice(first) : rounds
  }, [workout?.rounds, skipWarmup])

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [timeLeft,          setTimeLeft]           = useState(effectiveRounds[0]?.durationSeconds ?? 60)
  const [isPaused,        setIsPaused]        = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const intervalRef   = useRef(null)
  const startTimeRef  = useRef(Date.now())
  const workDoneRef   = useRef(0)
  const advancingRef  = useRef(false)
  const warned3Ref    = useRef(false)

  const audio = useAudio()

  const currentRound    = effectiveRounds[currentRoundIndex]
  const totalSeconds    = currentRound?.durationSeconds ?? 60
  const workRoundsAll   = effectiveRounds.filter((r) => r.type === 'work')
  const totalWorkRounds = workRoundsAll.length
  const workRoundsSoFar = effectiveRounds.slice(0, currentRoundIndex).filter((r) => r.type === 'work').length
  const currentWorkRoundNum = currentRound?.type === 'work' ? workRoundsSoFar + 1 : null
  const nextRound = effectiveRounds[currentRoundIndex + 1] ?? null

  const advanceRound = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true

    if (currentRound?.type === 'work') workDoneRef.current += 1

    const nextIndex = currentRoundIndex + 1
    if (nextIndex >= effectiveRounds.length) {
      audio.play(BEEP_COMPLETE)
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      onComplete({ durationSeconds, roundsCompleted: workDoneRef.current, techniques: workout?.techniques ?? [] })
      return
    }
    warned3Ref.current = false
    setCurrentRoundIndex(nextIndex)
    setTimeLeft(effectiveRounds[nextIndex].durationSeconds)
    setTimeout(() => { advancingRef.current = false }, 50)
  }, [currentRoundIndex, currentRound, effectiveRounds, workout, onComplete, audio])

  function skipStep() {
    clearInterval(intervalRef.current)
    advanceRound()
  }

  function repeatRound() {
    clearInterval(intervalRef.current)
    advancingRef.current = false
    setTimeLeft(currentRound?.durationSeconds ?? 60)
    setIsPaused(false)
  }

  function finishEarly() {
    clearInterval(intervalRef.current)
    audio.play(BEEP_COMPLETE)
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
    // Count work rounds completed up to (but not including) current round
    const roundsCompleted = effectiveRounds
      .slice(0, currentRoundIndex)
      .filter((r) => r.type === 'work').length
    onComplete({ durationSeconds, roundsCompleted, techniques: workout?.techniques ?? [] })
  }

  useEffect(() => {
    if (isPaused) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); setTimeout(() => advanceRound(), 0); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isPaused, advanceRound])

  // Round transition sounds
  useEffect(() => {
    if (!effectiveRounds[currentRoundIndex]) return
    const type = effectiveRounds[currentRoundIndex].type
    if (type === 'work' || type === 'technique') {
      audio.play(BEEP_WORK_START)
    } else if (type === 'rest' || type === 'cooldown') {
      audio.play(BEEP_REST_START)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundIndex])

  // 3-second warning (work rounds only, once per round)
  useEffect(() => {
    if (timeLeft === 3 && currentRound?.type === 'work' && !warned3Ref.current) {
      warned3Ref.current = true
      audio.play(BEEP_WARNING)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  if (!currentRound) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 15 }}>אין סיבובים לאימון זה</div>
      </div>
    )
  }

  const timerColor  = roundTimerColor(currentRound.type)
  const phaseLabel  = roundPhaseLabel(currentRound, currentWorkRoundNum ?? 0, totalWorkRounds)
  const coachingCues = (currentRound.coachingCuesHe ?? []).slice(0, 2)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, minHeight: 56, gap: 10 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: 'right', color: C.text }}>{workout.titleHe}</div>
        <button
          className="btn-tactile"
          onClick={() => { audio.toggleMute(); audio.tryUnlock() }}
          aria-label={audio.muted ? 'הפעל שמע' : 'השתק שמע'}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, color: audio.muted ? C.muted : C.accent, fontSize: 18, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          {audio.muted ? '🔇' : '🔊'}
        </button>
        <button className="btn-tactile" onClick={() => { setShowExitConfirm(true); audio.tryUnlock() }} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 16, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: timerColor, background: timerColor + '18', borderRadius: 20, padding: '4px 14px' }}>{phaseLabel}</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <RoundDots rounds={effectiveRounds} currentIndex={currentRoundIndex} />
        </div>

        <CircularTimer timeLeft={timeLeft} totalSeconds={totalSeconds} color={timerColor} />

        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px', marginTop: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>{currentRound.titleHe}</div>
          <div style={{ fontSize: 14, color: '#D4D0C8', lineHeight: 1.7, textAlign: 'right' }}>
            {currentRound.instructionHe}
          </div>
        </div>

        {currentRound.type === 'work' && coachingCues.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {coachingCues.map((cue, i) => (
              <div key={i} style={{ background: timerColor + '12', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: C.muted, textAlign: 'right', borderRight: `3px solid ${timerColor}` }}>{cue}</div>
            ))}
          </div>
        )}


        {currentRound.type === 'rest' && nextRound && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 16, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>בסיבוב הבא:</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{nextRound.titleHe}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
        {/* Primary row: pause | repeat | skip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            className="btn-tactile"
            onClick={() => { audio.tryUnlock(); setIsPaused((p) => !p) }}
            style={{ flex: 2, minHeight: 54, background: isPaused ? C.accent : C.surface, color: isPaused ? '#111317' : C.text, border: `1px solid ${isPaused ? C.accent : C.border}`, borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            {isPaused ? '▶ המשך' : '⏸ השהה'}
          </button>
          <button
            className="btn-tactile"
            onClick={() => { audio.tryUnlock(); repeatRound() }}
            aria-label="חזור על הסיבוב"
            style={{ flex: 1, minHeight: 54, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.3 }}
          >
            🔁{' '}חזור
          </button>
          <button
            className="btn-tactile"
            onClick={() => { audio.tryUnlock(); skipStep() }}
            aria-label="דלג לשלב הבא"
            style={{ flex: 1, minHeight: 54, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            דלג ←
          </button>
        </div>

        {/* Secondary row: finish early */}
        <div>
          <button
            className="btn-tactile"
            onClick={() => { audio.tryUnlock(); finishEarly() }}
            style={{ width: '100%', minHeight: 44, background: 'transparent', color: C.red, border: `1px solid ${C.red}30`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            סיים אימון
          </button>
        </div>
      </div>

      {showExitConfirm && <ExitModal onContinue={() => setShowExitConfirm(false)} onExit={onExit} />}
    </div>
  )
}
