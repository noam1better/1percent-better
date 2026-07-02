import { useState, useEffect, useRef, useCallback } from 'react'
import { loadPoseLandmarker, analyzeFrame, drawSkeleton } from '../services/poseService'
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

const HOLD_MS = 120   // min time at bottom before rep counts

function StrengthWorkout({ track, goal, onComplete, onClose }) {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const landmarkerRef = useRef(null)
  const streamRef     = useRef(null)
  const rafRef        = useRef(null)
  const poseStateRef  = useRef('up')
  const repsRef       = useRef(0)
  const lastTsRef     = useRef(-1)
  const downSinceRef  = useRef(null)   // timestamp when state entered 'down'
  const goalHaptedRef = useRef(false)
  const halfHaptedRef = useRef(false)

  const [phase,       setPhase]       = useState('loading')
  const [reps,        setReps]        = useState(0)
  const [repFlash,    setRepFlash]    = useState(false)
  const [angle,       setAngle]       = useState(null)
  const [poseState,   setPoseState]   = useState('up')
  const [squatDepth,  setSquatDepth]  = useState(0)      // 0-1 for depth bar
  const [confidence,  setConfidence]  = useState(1)
  const [formWarning, setFormWarning] = useState(false)
  const [manualRep,   setManualRep]   = useState('')
  const formWarnTimer = useRef(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    clearTimeout(formWarnTimer.current)
  }, [])

  // Effect 1: acquire camera stream + load landmarker → set phase to 'running'
  // Does NOT touch videoRef — video element doesn't exist yet during 'loading'
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        console.log('[camera] requesting stream…')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        console.log('[camera] stream acquired, tracks:', stream.getVideoTracks().map(t => t.label))
        streamRef.current = stream   // store; will attach to <video> in Effect 2

        const lm = await loadPoseLandmarker()
        if (cancelled) return
        if (!lm) { setPhase('manual'); return }
        landmarkerRef.current = lm
        setPhase('running')          // <video> now mounts → Effect 2 attaches stream
      } catch (err) {
        if (cancelled) return
        console.error('[camera] init error:', err.name, err.message)
        setPhase(err.name === 'NotAllowedError' ? 'error' : 'manual')
      }
    }
    init()
    return () => { cancelled = true; cleanup() }
  }, [cleanup])

  // Effect 2: attach stream to <video> once it's in the DOM (phase === 'running')
  useEffect(() => {
    if (phase !== 'running') return
    const video = videoRef.current
    if (!video || !streamRef.current) return
    video.srcObject = streamRef.current
    video.play().catch(err => console.error('[camera] play() failed:', err.name, err.message))
    console.log('[camera] stream attached to <video>, readyState:', video.readyState)
  }, [phase])

  // Pose detection loop
  useEffect(() => {
    if (phase !== 'running') return

    function loop(ts) {
      const video  = videoRef.current
      const canvas = canvasRef.current
      const lm     = landmarkerRef.current
      if (!video || !canvas || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (ts === lastTsRef.current) { rafRef.current = requestAnimationFrame(loop); return }
      lastTsRef.current = ts

      const results = lm.detectForVideo(video, ts)
      const ctx = canvas.getContext('2d')
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (results.landmarks?.length) {
        const landmarks = results.landmarks[0]
        const result    = analyzeFrame(track.poseType, landmarks, poseStateRef.current)

        if (result.angle !== null) {
          const prevState = poseStateRef.current
          const newState  = result.state

          // ── Squat hold-timer rep logic ──────────────────────────────
          let repCompleted = result.repCompleted   // pushups: from service
          if (track.poseType === 'squats') {
            if (prevState === 'up' && newState === 'down') {
              downSinceRef.current = ts              // start hold timer
            }
            if (prevState === 'down' && newState === 'up') {
              const held = ts - (downSinceRef.current ?? ts)
              repCompleted = held >= HOLD_MS
              downSinceRef.current = null
            }
            setSquatDepth(result.depth)
            setConfidence(result.confidence)

            // Knee cave-in: show warning for 2s
            if (result.kneeCaveIn && !formWarning) {
              setFormWarning(true)
              clearTimeout(formWarnTimer.current)
              formWarnTimer.current = setTimeout(() => setFormWarning(false), 2000)
            }
          }

          poseStateRef.current = newState
          setPoseState(newState)
          setAngle(result.angle)

          if (repCompleted) {
            repsRef.current += 1
            const n = repsRef.current
            setReps(n)
            setRepFlash(true)
            setTimeout(() => setRepFlash(false), 380)
            hapticRep()
            const half = Math.floor(goal / 2)
            if (n === half && !halfHaptedRef.current) { halfHaptedRef.current = true; hapticMilestone() }
            if (n >= goal  && !goalHaptedRef.current) { goalHaptedRef.current = true; hapticGoal() }
          }

          drawSkeleton(ctx, landmarks, track.poseType, canvas.width, canvas.height, result.confidence)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, track.poseType, goal])

  function handleDone() { cleanup(); onComplete({ amount: repsRef.current, unit: track.unit }) }
  function handleManualSave() {
    const n = parseInt(manualRep)
    if (!n || n < 0) return
    cleanup()
    onComplete({ amount: n, unit: track.unit })
  }

  function retryCamera() {
    cleanup()
    poseStateRef.current  = 'up'
    repsRef.current       = 0
    lastTsRef.current     = -1
    downSinceRef.current  = null
    goalHaptedRef.current = false
    halfHaptedRef.current = false
    setReps(0); setAngle(null); setPoseState('up')
    setSquatDepth(0); setConfidence(1); setFormWarning(false)
    setPhase('loading')
  }

  // ── Loading ──
  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
      <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem' }}>טוען מצלמה ו-AI…</p>
    </div>
  )

  // ── Error / manual fallback ──
  if (phase === 'error' || phase === 'manual') return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <p style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          {phase === 'error' ? '⚠️ הרשאת מצלמה נדחתה' : '⚠️ לא ניתן לטעון את המצלמה'}
        </p>
        <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>
          {phase === 'error'
            ? 'אפשר גישה למצלמה בהגדרות הדפדפן ולאחר מכן נסה שוב.'
            : 'ייתכן שהמודל לא נטען. בדוק חיבור לאינטרנט.'}
        </p>
        <button
          onClick={retryCamera}
          className="btn-tactile"
          style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 10, padding: '0.5rem 1rem', color: '#F5C518', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
        >
          🔄 נסה שוב
        </button>
      </div>

      <label style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
        או הכנס ידנית
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number" inputMode="numeric" value={manualRep}
          onChange={e => setManualRep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualSave()}
          placeholder={`יעד: ${goal} חזרות`} className="glow-input"
          style={{ flex: 1, padding: '0.75rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit' }}
        />
        <button onClick={handleManualSave} disabled={!manualRep} className="btn-primary btn-tactile"
          style={{ padding: '0.75rem 1.1rem', borderRadius: 11, fontSize: '0.9rem', fontWeight: 800, opacity: manualRep ? 1 : 0.4 }}>
          שמור ←
        </button>
      </div>
    </div>
  )

  // ── Live camera ──
  const goalReached   = reps >= goal
  const isSquat       = track.poseType === 'squats'
  const confidenceLow = confidence < 0.7

  const corner = (top, right, bottom, left) => ({
    position: 'absolute', width: 22, height: 22,
    borderColor: confidenceLow ? 'rgba(239,68,68,0.6)' : 'rgba(245,197,24,0.7)',
    borderStyle: 'solid', borderWidth: 0,
    ...(top    != null ? { top:    top    + '%' } : {}),
    ...(right  != null ? { right:  right  + '%' } : {}),
    ...(bottom != null ? { bottom: bottom + '%' } : {}),
    ...(left   != null ? { left:   left   + '%' } : {}),
    borderTopWidth:    top    != null ? 2 : 0,
    borderRightWidth:  right  != null ? 2 : 0,
    borderBottomWidth: bottom != null ? 2 : 0,
    borderLeftWidth:   left   != null ? 2 : 0,
  })

  // Squat depth bar color
  const depthColor = squatDepth >= 0.70 ? '#34d399'
                   : squatDepth >= 0.40 ? '#F5C518'
                   : 'rgba(255,255,255,0.25)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

        {/* Corner brackets — red when confidence low */}
        {!goalReached && (<>
          <div style={corner(8,  null, null, 8)}  />
          <div style={corner(8,  8,    null, null)} />
          <div style={corner(null, null, 8,   8)}  />
          <div style={corner(null, 8,   8,   null)} />
        </>)}

        {/* Squat depth bar — right edge */}
        {isSquat && !goalReached && (
          <div style={{ position: 'absolute', right: 8, top: '12%', bottom: '12%', width: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 0, width: '100%',
              height: `${squatDepth * 100}%`,
              background: depthColor,
              borderRadius: 99,
              transition: 'height 0.05s linear, background 0.2s ease',
            }} />
          </div>
        )}

        {/* Rep counter — top left */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(5,5,5,0.78)', borderRadius: 12, padding: '0.5rem 0.85rem', backdropFilter: 'blur(8px)' }}>
          <div key={reps} style={{
            fontSize: '2rem', fontWeight: 900, lineHeight: 1,
            color: repFlash ? '#34d399' : '#F5C518',
            transform: repFlash ? 'scale(1.4)' : 'scale(1)',
            transition: 'transform 0.15s ease, color 0.15s ease',
            animation: reps > 0 && !repFlash ? 'rep-flash 0.28s ease-out' : 'none',
          }}>{reps}</div>
          <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.62rem', fontWeight: 700 }}>/ {goal} חזרות</div>
        </div>

        {/* State / angle badge — top right */}
        {angle !== null && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: poseState === 'down' ? 'rgba(16,185,129,0.82)' : 'rgba(99,102,241,0.82)',
            borderRadius: 10, padding: '0.3rem 0.65rem', backdropFilter: 'blur(6px)',
          }}>
            <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>
              {isSquat
                ? (poseState === 'down' ? '⬇ שוקע' : '⬆ עומד')
                : `${angle}° ${poseState === 'down' ? '▼' : '▲'}`
              }
            </span>
          </div>
        )}

        {/* Form warning — knee cave-in */}
        {formWarning && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'rgba(239,68,68,0.88)', borderRadius: 12, padding: '0.5rem 1rem',
            backdropFilter: 'blur(6px)', animation: 'fadeIn 0.15s ease',
            color: '#fff', fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap',
          }}>
            ⚠️ שים לב לברכיים!
          </div>
        )}

        {/* Low confidence hint */}
        {confidenceLow && !goalReached && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'rgba(239,68,68,0.75)', borderRadius: 10, padding: '0.4rem 0.85rem',
            color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
            animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(4px)',
          }}>
            🔍 זוז לתוך הפריים
          </div>
        )}

        {/* AI pulse — bottom left */}
        {!goalReached && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(5,5,5,0.72)', borderRadius: 20, padding: '0.25rem 0.6rem', backdropFilter: 'blur(6px)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: confidenceLow ? '#ef4444' : '#34d399', animation: 'cam-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ color: confidenceLow ? '#fca5a5' : 'rgba(52,211,153,0.9)', fontSize: '0.6rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: '0.06em' }}>
              {confidenceLow ? 'זיהוי חלש' : 'AI פעיל'}
            </span>
          </div>
        )}

        {/* Close camera — bottom right */}
        {!goalReached && (
          <button onClick={() => { cleanup(); onClose() }} className="btn-tactile"
            style={{ position: 'absolute', bottom: 10, right: isSquat ? 22 : 10, background: 'rgba(5,5,5,0.72)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.25rem 0.7rem', backdropFilter: 'blur(6px)', color: 'rgba(241,245,249,0.55)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
            ✕ סגור מצלמה
          </button>
        )}

        {/* Goal banner */}
        {goalReached && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(5,5,5,0.9)', borderRadius: 18, padding: '1.25rem 2rem', textAlign: 'center', border: '2px solid rgba(245,197,24,0.5)' }}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.1rem', marginTop: '0.25rem' }}>יעד הושג!</div>
            </div>
          </div>
        )}
      </div>

      <button onClick={handleDone} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800 }}>
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
