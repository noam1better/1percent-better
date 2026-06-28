import { useState, useEffect, useRef } from 'react'
import { coachConfigured, analyzeSession } from '../services/coachService'
import { initPose, detectPose, drawSkeleton } from '../services/poseService'
import { createTracker } from '../services/repTracker'

const EXERCISES = [
  { id: 'pushups', label: 'Push-ups',           emoji: '💪' },
  { id: 'pullups', label: 'Pull-ups',           emoji: '🔝' },
  { id: 'dips',    label: 'Dips',               emoji: '🤸' },
  { id: 'squats',  label: 'Squats',             emoji: '🦵' },
  { id: 'boxing',  label: 'Boxing / Muay Thai', emoji: '🥊' },
]

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function AICoachModal({ onClose, focusGoal }) {
  const [status,       setStatus]       = useState('selecting')
  // selecting | loading | live | working | analyzing | feedback | error | no-key
  const [exercise,     setExercise]     = useState(null)
  const [feedback,     setFeedback]     = useState('')
  const [reps,         setReps]         = useState(0)
  const [elapsed,      setElapsed]      = useState(0)
  const [sessionStats, setSessionStats] = useState(null)
  const [loadMsg,      setLoadMsg]      = useState('')

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const trackerRef  = useRef(null)
  const trackingRef = useRef(false)
  const startRef    = useRef(null)
  const timerRef    = useRef(null)

  useEffect(() => () => cleanup(), [])

  function cleanup() {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    stopStream()
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function selectExercise(id) {
    if (!coachConfigured()) {
      setExercise(id)
      setStatus('no-key')
      return
    }
    setExercise(id)
    setStatus('loading')

    try {
      setLoadMsg('Starting camera…')
      await startCamera()
      setLoadMsg('Loading AI pose model…')
      await initPose()
      setStatus('live')
      runLoop()
    } catch (err) {
      console.error('AICoach init error:', err)
      setStatus('error')
    }
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    streamRef.current = stream
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      await video.play()
    }
  }

  function runLoop() {
    const loop = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      if (video.videoWidth > 0 && video.readyState >= 2) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const result = detectPose(video)
        if (result) {
          drawSkeleton(canvas, result.landmarks)
          if (trackingRef.current && trackerRef.current) {
            const stats = trackerRef.current.update(result.landmarks)
            setReps(stats.reps)
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function startWorkout() {
    trackerRef.current  = createTracker(exercise)
    trackingRef.current = true
    startRef.current    = Date.now()
    setReps(0)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    setStatus('working')
  }

  async function stopWorkout() {
    trackingRef.current = false
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    stopStream()

    const duration   = Math.floor((Date.now() - startRef.current) / 1000)
    const stats      = trackerRef.current?.getStats() || { reps: 0, formScore: 0 }
    const finalStats = { ...stats, duration }
    setSessionStats(finalStats)
    setStatus('analyzing')

    try {
      const text = await analyzeSession(exercise, finalStats)
      setFeedback(text)
      setStatus('feedback')
    } catch (err) {
      const msg = err?.message || err?.toString() || 'Unknown error'
      setFeedback(`שגיאה: ${msg}`)
      setStatus('feedback')
    }
  }

  function reset() {
    cleanup()
    setExercise(null)
    setFeedback('')
    setReps(0)
    setElapsed(0)
    setSessionStats(null)
    setStatus('selecting')
  }

  const ex          = EXERCISES.find(e => e.id === exercise)
  const repLabel    = exercise === 'boxing' ? 'אגרופים' : 'reps'
  const showCamera  = ['loading', 'live', 'working'].includes(status)
  const isWorking   = status === 'working'
  const isAnalyzing = status === 'analyzing'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,14,0.97)', zIndex: 2000, display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤖</div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>AI Coach</div>
            <div style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 500 }}>
              {status === 'selecting' && 'Choose an exercise'}
              {status === 'loading'   && loadMsg}
              {status === 'live'      && (ex ? `${ex.emoji} ${ex.label} — ready` : '')}
              {isWorking              && `${ex?.emoji} ${ex?.label} — tracking`}
              {isAnalyzing            && 'Preparing coaching…'}
              {status === 'feedback'  && 'Session complete'}
            </div>
          </div>
        </div>
        <button
          onClick={() => { cleanup(); onClose() }}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: 'rgba(255,255,255,0.5)', width: 34, height: 34, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1rem', overflowY: 'auto' }}>

        {/* ── Exercise selection ── */}
        {status === 'selecting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeUp 0.3s ease' }}>
            <p style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>
              Real-time pose detection + rep counting
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {EXERCISES.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => selectExercise(ex.id)}
                  style={{
                    padding: '1.1rem 0.75rem',
                    borderRadius: 14,
                    border: '1px solid rgba(99,102,241,0.3)',
                    background: 'rgba(99,102,241,0.08)',
                    color: '#f1f5f9',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.45rem',
                    gridColumn: ex.id === 'boxing' ? 'span 2' : undefined,
                  }}
                >
                  <span style={{ fontSize: '1.7rem' }}>{ex.emoji}</span>
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── No key ── */}
        {status === 'no-key' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem 1.5rem', textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: '2.5rem' }}>🔑</span>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              Firebase is not initialised. Check your <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '0.15rem 0.4rem', color: '#a5b4fc' }}>.env.local</code> and rebuild.
            </p>
            <button onClick={reset} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#a5b4fc', fontSize: '0.85rem', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Camera + skeleton viewfinder ── */}
        {showCamera && (
          <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#06060f', border: '1px solid rgba(255,255,255,0.07)', aspectRatio: '4/3', maxHeight: 340, flexShrink: 0 }}>

            {/* Loading spinner */}
            {status === 'loading' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 5 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#8b5cf6', animation: 'spin 0.9s linear infinite' }} />
                <span style={{ color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600 }}>{loadMsg}</span>
              </div>
            )}

            {/* Live video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: status !== 'loading' ? 'block' : 'none' }}
            />

            {/* Skeleton canvas */}
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            />

            {/* Exercise badge */}
            {ex && (
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(99,102,241,0.82)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '0.22rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                <span>{ex.emoji}</span>
                <span>{ex.label}</span>
              </div>
            )}

            {/* Working overlay: timer + reps */}
            {isWorking && (
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', borderRadius: 10, padding: '0.35rem 0.7rem', color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  ⏱ {fmt(elapsed)}
                </div>
                <div style={{ background: 'rgba(99,102,241,0.7)', backdropFilter: 'blur(6px)', borderRadius: 10, padding: '0.35rem 0.7rem', color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>
                  {reps} {repLabel}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Analyzing ── */}
        {isAnalyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#8b5cf6', animation: 'spin 0.9s linear infinite' }} />
            <span style={{ color: '#a5b4fc', fontSize: '0.88rem', fontWeight: 600 }}>מכין משוב מאמן…</span>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {status === 'live' && (
            <button
              onClick={startWorkout}
              style={{ flex: 1, padding: '0.95rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              ▶ Start Workout
            </button>
          )}

          {isWorking && (
            <button
              onClick={stopWorkout}
              style={{ flex: 1, padding: '0.95rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              ⏹ Stop & Analyze
            </button>
          )}

          {status === 'feedback' && (
            <button
              onClick={reset}
              style={{ flex: 1, padding: '0.95rem', borderRadius: 14, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 New Analysis
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={reset}
              style={{ flex: 1, padding: '0.95rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              ← Try Again
            </button>
          )}
        </div>

        {/* ── Error message ── */}
        {status === 'error' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '1rem 1.25rem', textAlign: 'center' }}>
            <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
              Could not start camera or load pose model.<br />
              Check camera permissions and internet connection.
            </p>
          </div>
        )}

        {/* ── Feedback card ── */}
        {status === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeUp 0.4s ease' }}>
            {/* Session stats */}
            {sessionStats && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: fmt(sessionStats.duration), icon: '⏱' },
                  { label: `${sessionStats.reps} ${repLabel}`, icon: exercise === 'boxing' ? '🥊' : '🔁' },
                  { label: `${sessionStats.formScore}% visibility`, icon: '👁' },
                ].map(({ label, icon }) => (
                  <div key={label} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '0.25rem 0.7rem', color: '#c4b5fd', fontSize: '0.78rem', fontWeight: 600 }}>
                    {icon} {label}
                  </div>
                ))}
              </div>
            )}

            {/* Gemini Hebrew feedback */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1rem' }}>🤖</span>
                <span style={{ color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Coach Feedback</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.95rem', lineHeight: 1.75, margin: 0, direction: 'rtl', textAlign: 'right' }}>
                {feedback}
              </p>
            </div>
          </div>
        )}

        {/* ── Hint when live, pre-workout ── */}
        {status === 'live' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.81rem', lineHeight: 1.6, margin: 0 }}>
              Position yourself so your full body is visible. Press <strong style={{ color: 'rgba(241,245,249,0.5)' }}>Start Workout</strong> when ready — the AI will count your reps in real time.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
