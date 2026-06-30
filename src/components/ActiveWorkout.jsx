import { useState, useEffect, useRef, useCallback } from 'react'
import { loadPoseLandmarker, analyzeFrame } from '../services/poseService'
import { hapticRep, hapticMilestone, hapticGoal } from '../services/hapticService'

// ── Cardio (timer-based) ────────────────────────────────────────────

function CardioWorkout({ track, goal, onComplete, onClose }) {
  const [elapsed,  setElapsed]  = useState(0)
  const [running,  setRunning]  = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (running && !finished) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [running, finished])

  function handleDone() {
    clearInterval(timerRef.current)
    setRunning(false)
    setFinished(true)
    onComplete({ amount: Math.round(elapsed / 60), unit: track.unit })
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  const pct  = Math.min(100, (elapsed / 60 / goal) * 100)

  const ringColor  = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#F5C518'
  const timerColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#F5C518'
  const isSprint   = running && pct >= 80 && pct < 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
      {/* Timer ring */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(245,197,24,0.1)" strokeWidth="8" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={ringColor} strokeWidth={pct >= 90 ? 10 : 8}
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            color: timerColor, fontSize: pct >= 90 ? '2.2rem' : '2rem', fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            animation: pct >= 90 && running ? 'danger-pulse 0.8s ease infinite' : 'none',
            transition: 'font-size 0.3s ease, color 0.4s ease',
          }}>{mins}:{secs}</span>
          <span style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.7rem', fontWeight: 700 }}>יעד: {goal} דק'</span>
        </div>
        {isSprint && (
          <div style={{
            position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 20, padding: '0.18rem 0.75rem',
            color: '#f87171', fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.1em', whiteSpace: 'nowrap',
            animation: 'danger-pulse 1s ease infinite',
          }}>FINAL PUSH</div>
        )}
      </div>

      {!finished ? (
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={() => setRunning(r => !r)}
            className="btn-tactile"
            style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '1rem', fontWeight: 800, background: running ? 'rgba(239,68,68,0.12)' : 'rgba(245,197,24,0.12)', border: `1px solid ${running ? 'rgba(239,68,68,0.3)' : 'rgba(245,197,24,0.3)'}`, color: running ? '#f87171' : '#F5C518', cursor: 'pointer' }}
          >
            {running ? '⏸ עצור' : '▶ התחל'}
          </button>
          {elapsed > 0 && (
            <button onClick={handleDone} className="btn-primary btn-tactile" style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '0.95rem', fontWeight: 800 }}>
              סיימתי ←
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>
            {Math.round(elapsed / 60) >= goal ? 'יעד הושג!' : `${Math.round(elapsed / 60)} דקות נרשמו`}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Strength (camera + pose) ────────────────────────────────────────

function StrengthWorkout({ track, goal, onComplete, onClose }) {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const landmarkerRef = useRef(null)
  const streamRef     = useRef(null)
  const rafRef        = useRef(null)
  const poseStateRef  = useRef('up')
  const repsRef       = useRef(0)
  const lastTsRef     = useRef(-1)

  const [phase,     setPhase]     = useState('loading')  // loading | running | done | manual | error
  const [reps,      setReps]      = useState(0)
  const [angle,     setAngle]     = useState(null)
  const [poseState, setPoseState] = useState('up')
  const [manualRep, setManualRep] = useState('')
  const goalHaptedRef = useRef(false)
  const halfHaptedRef = useRef(false)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const lm = await loadPoseLandmarker()
        if (cancelled) return
        if (!lm) { setPhase('manual'); return }
        landmarkerRef.current = lm
        setPhase('running')
      } catch (err) {
        if (!cancelled) setPhase(err.name === 'NotAllowedError' ? 'error' : 'manual')
      }
    }

    init()
    return () => { cancelled = true; cleanup() }
  }, [cleanup])

  // Pose detection loop
  useEffect(() => {
    if (phase !== 'running') return

    function loop(ts) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const lm = landmarkerRef.current
      if (!video || !canvas || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (ts !== lastTsRef.current) {
        lastTsRef.current = ts
        const results = lm.detectForVideo(video, ts)
        const ctx = canvas.getContext('2d')
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (results.landmarks?.length) {
          const landmarks = results.landmarks[0]
          const { angle: a, state: s, repCompleted } = analyzeFrame(track.poseType, landmarks, poseStateRef.current)

          if (a !== null) {
            poseStateRef.current = s
            setPoseState(s)
            setAngle(a)
            if (repCompleted) {
              repsRef.current += 1
              const newReps = repsRef.current
              setReps(newReps)
              hapticRep()
              const half = Math.floor(goal / 2)
              if (newReps === half && !halfHaptedRef.current) {
                halfHaptedRef.current = true
                hapticMilestone()
              }
              if (newReps >= goal && !goalHaptedRef.current) {
                goalHaptedRef.current = true
                hapticGoal()
              }
            }
          }

          // Draw skeleton dots
          ctx.fillStyle = '#F5C518'
          for (const pt of landmarks) {
            if ((pt.visibility ?? 1) > 0.5) {
              ctx.beginPath()
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, track.poseType])

  function handleDone() {
    cleanup()
    onComplete({ amount: repsRef.current, unit: track.unit })
  }

  function handleManualSave() {
    const n = parseInt(manualRep)
    if (!n || n < 0) return
    cleanup()
    onComplete({ amount: n, unit: track.unit })
  }

  // ── Loading ──
  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem' }}>טוען מצלמה ו-AI…</p>
    </div>
  )

  // ── Camera error / manual fallback ──
  if (phase === 'error' || phase === 'manual') return (
    <div style={{ padding: '1rem 0' }}>
      {phase === 'error' && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.82rem' }}>
          ⚠️ לא ניתן לגשת למצלמה — הרשאה נדחתה
        </div>
      )}
      <label style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>כמה חזרות עשית?</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number"
          inputMode="numeric"
          value={manualRep}
          onChange={e => setManualRep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualSave()}
          placeholder={`יעד: ${goal} חזרות`}
          className="glow-input"
          autoFocus
          style={{ flex: 1, padding: '0.75rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit' }}
        />
        <button onClick={handleManualSave} disabled={!manualRep} className="btn-primary btn-tactile" style={{ padding: '0.75rem 1.1rem', borderRadius: 11, fontSize: '0.9rem', fontWeight: 800, opacity: manualRep ? 1 : 0.4 }}>
          שמור ←
        </button>
      </div>
    </div>
  )

  // ── Live camera + pose ──
  const goalReached = reps >= goal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Camera + overlay */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

        {/* Rep counter overlay */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(5,5,5,0.78)', borderRadius: 12, padding: '0.5rem 0.85rem', backdropFilter: 'blur(8px)' }}>
          <div key={reps} style={{ color: '#F5C518', fontSize: '2rem', fontWeight: 900, lineHeight: 1, animation: reps > 0 ? 'rep-flash 0.28s ease-out' : 'none' }}>{reps}</div>
          <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.62rem', fontWeight: 700 }}>/ {goal} חזרות</div>
        </div>

        {/* Pose state badge */}
        {angle !== null && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: poseState === 'down' ? 'rgba(16,185,129,0.8)' : 'rgba(99,102,241,0.8)', borderRadius: 10, padding: '0.3rem 0.65rem', backdropFilter: 'blur(6px)' }}>
            <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>{angle}° {poseState === 'down' ? '▼' : '▲'}</span>
          </div>
        )}

        {/* Goal reached banner */}
        {goalReached && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(5,5,5,0.9)', borderRadius: 18, padding: '1.25rem 2rem', textAlign: 'center', border: '2px solid rgba(245,197,24,0.5)' }}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.1rem', marginTop: '0.25rem' }}>יעד הושג!</div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleDone}
        className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800 }}
      >
        {goalReached ? 'סיום אימון ←' : `סיימתי (${reps} חזרות) ←`}
      </button>
    </div>
  )
}

// ── Shell modal ─────────────────────────────────────────────────────

export default function ActiveWorkout({ track, goal, onComplete, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3100 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0e0e16', borderRadius: '20px 20px 0 0', padding: '1.4rem 1.4rem 2.5rem', borderTop: '2px solid rgba(245,197,24,0.3)', animation: 'slide-up 0.28s ease' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>{track.emoji}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.97rem' }}>{track.name}</div>
              <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.7rem', fontWeight: 700 }}>יעד: {goal} {track.unit}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.5)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕</button>
        </div>

        {track.useCamera
          ? <StrengthWorkout track={track} goal={goal} onComplete={onComplete} onClose={onClose} />
          : <CardioWorkout   track={track} goal={goal} onComplete={onComplete} onClose={onClose} />
        }
      </div>
    </div>
  )
}
