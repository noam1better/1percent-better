import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import './AIBoxingCoach.css'

// ── Constants ─────────────────────────────────────────────────────
const ROUND_DURATION      = 3 * 60   // 3 minutes
const REST_DURATION       = 60        // 1 minute
const MAX_ROUNDS          = 12
const GUARD_THRESHOLD     = 0.10      // wrists may be ≤ 10% below nose before alert
const PUNCH_VEL_THRESHOLD = 1.6       // normalized units/sec
const PUNCH_COOLDOWN_MS   = 280       // debounce between counted punches
const STATS_EVERY         = 10        // frames between React state flushes

// Arm connections for skeleton overlay (MediaPipe landmark indices)
const ARM_CONNECTIONS = [
  [11, 13], [13, 15],  // left  shoulder→elbow→wrist
  [12, 14], [14, 16],  // right shoulder→elbow→wrist
  [11, 12],            // shoulder bar
]

// ── MediaPipe singleton (load once across remounts) ───────────────
let _landmarker = null
let _loadPromise = null

async function loadPoseLandmarker() {
  if (_landmarker)   return _landmarker
  if (_loadPromise)  return _loadPromise

  _loadPromise = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    )
    const opts = {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode:                  'VIDEO',
      numPoses:                     1,
      minPoseDetectionConfidence:   0.5,
      minPosePresenceConfidence:    0.5,
      minTrackingConfidence:        0.5,
      outputSegmentationMasks:      false,
    }
    try {
      _landmarker = await PoseLandmarker.createFromOptions(vision, opts)
    } catch {
      opts.baseOptions.delegate = 'CPU'
      _landmarker = await PoseLandmarker.createFromOptions(vision, opts)
    }
    return _landmarker
  })()

  return _loadPromise
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function isProActive(data) {
  if (!data?.isPro) return false
  const exp = data.proExpirationDate
  if (!exp) return true
  const ms = typeof exp === 'number' ? exp : exp?.toMillis?.() ?? Date.parse(exp)
  return Date.now() < ms
}

// ── Paywall ───────────────────────────────────────────────────────
function BoxingPaywall() {
  const navigate = useNavigate()
  return (
    <div className="bc-paywall">
      <div className="bc-paywall-card">
        <div className="bc-paywall-icon">🥊</div>
        <div className="bc-paywall-badge">PRO FEATURE</div>
        <h1 className="bc-paywall-title">AI Boxing Coach</h1>
        <p className="bc-paywall-sub">
          Real-time pose detection, punch counting, guard analysis — all local, no cloud.
        </p>
        <ul className="bc-paywall-perks">
          <li><span className="bc-perk-check">⚔️</span> Live punch detection &amp; counter</li>
          <li><span className="bc-perk-check">🧠</span> AI guard &amp; posture feedback</li>
          <li><span className="bc-perk-check">📊</span> Full session performance report</li>
        </ul>
        <button className="bc-paywall-cta" onClick={() => navigate('/pricing')}>
          Unlock PRO — Get Access
        </button>
        <button className="bc-paywall-back" onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function AIBoxingCoach() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  // Pro gate
  const [proStatus,  setProStatus]  = useState('loading')

  // Camera
  const [camReady,   setCamReady]   = useState(false)
  const [camError,   setCamError]   = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  // MediaPipe
  const [poseReady,  setPoseReady]  = useState(false)
  const [poseError,  setPoseError]  = useState(null)

  // Session
  const [phase,    setPhase]    = useState('idle')
  const [round,    setRound]    = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [report,   setReport]   = useState(null)

  // Live HUD
  const [guardDown, setGuardDown] = useState(false)
  const [stats,     setStats]     = useState({ punches: 0, speed: 0, accuracy: 100 })

  // Refs — avoid stale closures inside rAF
  const videoRef       = useRef(null)
  const overlayRef     = useRef(null)   // pose skeleton canvas
  const streamRef      = useRef(null)
  const landmarkerRef  = useRef(null)
  const rafRef         = useRef(null)
  const timerRef       = useRef(null)
  const lastVidTimeRef = useRef(-1)
  const phaseRef       = useRef('idle')

  // All in-frame analytics — never causes React re-render inside hot loop
  const poseState = useRef({
    prevLeft:         null,
    prevRight:        null,
    prevTs:           null,
    lastPunchAt:      0,
    punchCount:       0,
    velWindow:        [],
    guardDownFrames:  0,
    totalFrames:      0,
    guardDownStart:   null,
    totalGuardDownMs: 0,
  })

  // ── Pro gate ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !user) { setProStatus('locked'); return }
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setProStatus(isProActive(snap.data()) ? 'active' : 'locked'))
      .catch(() => setProStatus('locked'))
  }, [user])

  // ── Camera ───────────────────────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamError(null)
    setCamReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamReady(true)
      }
    } catch (err) {
      setCamError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and reload.'
          : `Camera error: ${err.message}`
      )
    }
  }, [facingMode])

  // ── MediaPipe init ───────────────────────────────────────────
  useEffect(() => {
    if (proStatus !== 'active') return
    startCamera()
    loadPoseLandmarker()
      .then(lm => { landmarkerRef.current = lm; setPoseReady(true) })
      .catch(err => { setPoseError(`AI failed to load: ${err.message}`); setPoseReady(true) })

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [proStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }

  // ── Frame Analysis ────────────────────────────────────────────
  const analyzeFrame = useCallback((timestamp) => {
    const landmarker = landmarkerRef.current
    const video      = videoRef.current
    if (!landmarker || !video || video.readyState < 2) return
    if (video.currentTime === lastVidTimeRef.current) return
    lastVidTimeRef.current = video.currentTime

    let results
    try {
      results = landmarker.detectForVideo(video, performance.now())
    } catch { return }

    if (!results.landmarks?.length) return
    const lm = results.landmarks[0]

    drawOverlay(lm)

    const nose        = lm[0]
    const leftWrist   = lm[15]
    const rightWrist  = lm[16]
    const ps          = poseState.current
    const chinY       = nose.y + GUARD_THRESHOLD

    // ── Guard ──────────────────────────────────────────────────
    const guardIsDown = (leftWrist.visibility  > 0.4 && leftWrist.y  > chinY) ||
                        (rightWrist.visibility > 0.4 && rightWrist.y > chinY)
    setGuardDown(guardIsDown)

    if (guardIsDown && ps.guardDownStart === null) {
      ps.guardDownStart = timestamp
    } else if (!guardIsDown && ps.guardDownStart !== null) {
      ps.totalGuardDownMs += timestamp - ps.guardDownStart
      ps.guardDownStart = null
    }

    ps.totalFrames++
    if (guardIsDown) ps.guardDownFrames++

    // ── Punch velocity ─────────────────────────────────────────
    if (ps.prevLeft && ps.prevTs) {
      const dt = (timestamp - ps.prevTs) / 1000
      if (dt > 0) {
        const lVel = leftWrist.visibility  > 0.4
          ? Math.hypot(leftWrist.x  - ps.prevLeft.x,  leftWrist.y  - ps.prevLeft.y)  / dt : 0
        const rVel = rightWrist.visibility > 0.4
          ? Math.hypot(rightWrist.x - ps.prevRight.x, rightWrist.y - ps.prevRight.y) / dt : 0
        const maxVel = Math.max(lVel, rVel)

        ps.velWindow.push(maxVel)
        if (ps.velWindow.length > 12) ps.velWindow.shift()

        if (maxVel > PUNCH_VEL_THRESHOLD && timestamp - ps.lastPunchAt > PUNCH_COOLDOWN_MS) {
          ps.punchCount++
          ps.lastPunchAt = timestamp
        }
      }
    }

    ps.prevLeft  = leftWrist.visibility  > 0.2 ? { x: leftWrist.x,  y: leftWrist.y  } : ps.prevLeft
    ps.prevRight = rightWrist.visibility > 0.2 ? { x: rightWrist.x, y: rightWrist.y } : ps.prevRight
    ps.prevTs    = timestamp

    // Batch UI update (avoid flooding React scheduler)
    if (ps.totalFrames % STATS_EVERY === 0) {
      const avgVel   = ps.velWindow.reduce((a, b) => a + b, 0) / (ps.velWindow.length || 1)
      const speed    = Math.min(Math.round(avgVel * 28), 99)
      const accuracy = ps.totalFrames > 10
        ? Math.max(0, Math.round((1 - ps.guardDownFrames / ps.totalFrames) * 100))
        : 100
      setStats({ punches: ps.punchCount, speed, accuracy })
    }
  }, [])

  // ── Skeleton overlay drawing ──────────────────────────────────
  function drawOverlay(lm) {
    const canvas = overlayRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const w = video.videoWidth  || 640
    const h = video.videoHeight || 360
    if (canvas.width !== w)  canvas.width  = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    // Arm skeleton
    ctx.lineWidth   = 2.5
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    for (const [a, b] of ARM_CONNECTIONS) {
      const la = lm[a], lb = lm[b]
      if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue
      ctx.beginPath()
      ctx.moveTo(la.x * w, la.y * h)
      ctx.lineTo(lb.x * w, lb.y * h)
      ctx.stroke()
    }

    // Guard line (golden dashed) at chin
    const chinY = (lm[0].y + GUARD_THRESHOLD) * h
    ctx.strokeStyle = 'rgba(251,191,36,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(0, chinY)
    ctx.lineTo(w, chinY)
    ctx.stroke()
    ctx.setLineDash([])

    // Wrist dots
    for (const [idx] of [[15], [16]]) {
      const wrist = lm[idx]
      if ((wrist.visibility ?? 1) < 0.3) continue
      const up = wrist.y <= lm[0].y + GUARD_THRESHOLD
      ctx.shadowBlur  = 10
      ctx.shadowColor = up ? '#22c55e' : '#ef4444'
      ctx.fillStyle   = up ? '#22c55e' : '#ef4444'
      ctx.beginPath()
      ctx.arc(wrist.x * w, wrist.y * h, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur  = 0
      ctx.fillStyle   = '#fff'
      ctx.beginPath()
      ctx.arc(wrist.x * w, wrist.y * h, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── rAF loop (only while round is active) ────────────────────
  useEffect(() => {
    phaseRef.current = phase
    if (phase === 'round') {
      const loop = (ts) => {
        if (phaseRef.current !== 'round') return
        analyzeFrame(ts)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, analyzeFrame])

  // ── Session timer ─────────────────────────────────────────────
  const startSession = () => {
    if (!camReady) return
    poseState.current = {
      prevLeft: null, prevRight: null, prevTs: null,
      lastPunchAt: 0, punchCount: 0, velWindow: [],
      guardDownFrames: 0, totalFrames: 0,
      guardDownStart: null, totalGuardDownMs: 0,
    }
    setRound(1)
    setTimeLeft(ROUND_DURATION)
    setPhase('round')
    setStats({ punches: 0, speed: 0, accuracy: 100 })
    setGuardDown(false)
    setReport(null)
  }

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return
    clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev > 1) return prev - 1

        // Time expired
        clearInterval(timerRef.current)
        setPhase(current => {
          if (current === 'round') {
            setRound(r => {
              if (r >= MAX_ROUNDS) { finishSession(); return r }
              setTimeLeft(REST_DURATION)
              return r
            })
            return 'rest'
          }
          // rest ended → next round
          setRound(r => { setTimeLeft(ROUND_DURATION); return r + 1 })
          return 'round'
        })
        return 0
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishSession = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    const ps = poseState.current
    const guardDownMs = ps.totalGuardDownMs +
      (ps.guardDownStart != null ? performance.now() - ps.guardDownStart : 0)
    setReport({
      completedAt:     new Date().toISOString(),
      rounds:          MAX_ROUNDS,
      punches:         ps.punchCount,
      guardDownSecs:   Math.round(guardDownMs / 1000),
      accuracy:        ps.totalFrames > 10
        ? Math.max(0, Math.round((1 - ps.guardDownFrames / ps.totalFrames) * 100))
        : 100,
    })
    setPhase('done')
  }

  const stopSession = () => { finishSession() }

  // ── Render guards ─────────────────────────────────────────────
  if (proStatus === 'loading') {
    return (
      <div className="bc-loading">
        <div className="bc-spinner" />
        <p>Checking access…</p>
      </div>
    )
  }
  if (proStatus === 'locked') return <BoxingPaywall />

  // ── Session report ────────────────────────────────────────────
  if (phase === 'done' && report) {
    return (
      <div className="bc-report">
        <div className="bc-report-card">
          <div className="bc-report-trophy">🏆</div>
          <h2 className="bc-report-title">Session Complete</h2>
          <div className="bc-report-grid">
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.rounds}</span>
              <span className="bc-rs-label">Rounds</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.punches}</span>
              <span className="bc-rs-label">Punches</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.accuracy}%</span>
              <span className="bc-rs-label">Guard</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.guardDownSecs}s</span>
              <span className="bc-rs-label">Guard Down</span>
            </div>
          </div>
          <p className="bc-report-ai-note">
            🧠 Tracked by on-device MediaPipe Pose — no data leaves your device.
          </p>
          <button className="bc-btn-primary" onClick={() => {
            setPhase('idle'); setRound(1); setTimeLeft(ROUND_DURATION)
          }}>
            New Session
          </button>
          <button className="bc-btn-ghost" onClick={() => navigate(-1)}>Exit</button>
        </div>
      </div>
    )
  }

  // ── Camera HUD ────────────────────────────────────────────────
  const mirror = facingMode === 'user' ? 'scaleX(-1)' : 'none'

  return (
    <div className="bc-root">

      {/* Live video */}
      <video ref={videoRef} className="bc-video" autoPlay playsInline muted
        style={{ transform: mirror }} />

      {/* Pose skeleton overlay (same mirror as video) */}
      <canvas ref={overlayRef} className="bc-overlay-canvas"
        style={{ transform: mirror }} />

      {/* Edge vignette */}
      <div className="bc-vignette" />

      {/* Guard DOWN flash */}
      {guardDown && phase === 'round' && (
        <div className="bc-guard-alert">
          <span>⚠️ GUARD UP!</span>
        </div>
      )}

      {/* Camera error */}
      {camError && (
        <div className="bc-cam-error">
          <p>{camError}</p>
          <button onClick={() => startCamera()}>Retry</button>
        </div>
      )}

      {/* ── Top HUD ── */}
      <div className="bc-hud-top">
        <div className="bc-round-badge">
          {phase === 'rest'
            ? <span className="bc-phase-rest">REST</span>
            : <>
                <span className="bc-round-label">ROUND</span>
                <span className="bc-round-num">{round}</span>
                <span className="bc-round-total">/ {MAX_ROUNDS}</span>
              </>
          }
        </div>

        <div className={`bc-timer ${timeLeft <= 10 && phase === 'round' ? 'bc-timer--danger' : ''} ${phase === 'rest' ? 'bc-timer--rest' : ''}`}>
          {fmt(timeLeft)}
        </div>

        <button className="bc-btn-exit" onClick={() => { stopSession(); navigate(-1) }}>✕</button>
      </div>

      {/* ── AI status badge ── */}
      {!poseReady && (
        <div className="bc-ai-badge bc-ai-badge--loading">
          <div className="bc-ai-spinner" /> Loading AI…
        </div>
      )}
      {poseReady && !poseError && phase === 'idle' && (
        <div className="bc-ai-badge bc-ai-badge--ready">
          🧠 AI Ready
        </div>
      )}
      {poseError && (
        <div className="bc-ai-badge bc-ai-badge--error" title={poseError}>
          ⚠ AI offline
        </div>
      )}

      {/* ── Target reticle (idle only) ── */}
      {phase === 'idle' && (
        <div className="bc-reticle-wrap">
          <div className="bc-reticle">
            <div className="bc-reticle-inner" />
            <div className="bc-reticle-cross bc-reticle-cross--h" />
            <div className="bc-reticle-cross bc-reticle-cross--v" />
            <div className="bc-reticle-corner bc-corner-tl" />
            <div className="bc-reticle-corner bc-corner-tr" />
            <div className="bc-reticle-corner bc-corner-bl" />
            <div className="bc-reticle-corner bc-corner-br" />
          </div>
          <p className="bc-reticle-hint">Position your guard within the frame</p>
        </div>
      )}

      {/* ── Side stats ── */}
      {phase !== 'idle' && (
        <div className="bc-stats-side">
          <div className="bc-stat-chip">
            <span className="bc-stat-val">{stats.punches}</span>
            <span className="bc-stat-lbl">PUNCHES</span>
          </div>
          <div className={`bc-stat-chip ${stats.speed > 60 ? 'bc-stat-chip--hot' : ''}`}>
            <span className="bc-stat-val">{stats.speed}</span>
            <span className="bc-stat-lbl">SPEED</span>
          </div>
          <div className={`bc-stat-chip ${stats.accuracy < 70 ? 'bc-stat-chip--warn' : ''}`}>
            <span className="bc-stat-val">{stats.accuracy}%</span>
            <span className="bc-stat-lbl">GUARD</span>
          </div>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div className="bc-controls">
        <button className="bc-ctrl-flip" onClick={flipCamera} title="Flip camera">🔄</button>

        {phase === 'idle' ? (
          <button
            className={`bc-ctrl-start ${(!camReady || !poseReady) ? 'bc-ctrl-start--disabled' : ''}`}
            onClick={startSession}
            disabled={!camReady || !poseReady}
          >
            {camReady && poseReady ? '▶' : '…'}
          </button>
        ) : (
          <button className="bc-ctrl-stop" onClick={stopSession}>■</button>
        )}

        <div className="bc-ctrl-spacer" />
      </div>
    </div>
  )
}
