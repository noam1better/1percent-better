import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'
import FitnessOnboarding from './FitnessOnboarding'
import './AIBoxingCoach.css'

// ── Tier config ───────────────────────────────────────────────────
const TIERS = {
  free:   { roundDuration: 2 * 60, restDuration: 0,  maxRounds: 1  },
  active: { roundDuration: 3 * 60, restDuration: 60, maxRounds: 12 },
}

// ── Combo pools ───────────────────────────────────────────────────
const BOXING_COMBOS = [
  { label: 'Jab — Cross',               speech: 'Jab, Cross!' },
  { label: 'Jab — Cross — Hook',         speech: 'Jab, Cross, Hook!' },
  { label: 'Double Jab — Cross',         speech: 'Double Jab, Cross!' },
  { label: 'Jab — Hook',                 speech: 'Jab, Hook!' },
  { label: 'Jab — Cross — Uppercut',     speech: 'Jab, Cross, Uppercut!' },
  { label: 'Cross — Hook — Cross',       speech: 'Cross, Hook, Cross!' },
  { label: 'Jab — Body Shot — Cross',    speech: 'Jab, Body Shot, Cross!' },
  { label: 'Jab — Cross — Hook — Cross', speech: 'Jab, Cross, Hook, Cross!' },
  { label: 'Jab — Uppercut — Cross',     speech: 'Jab, Uppercut, Cross!' },
  { label: 'Double Jab — Hook',          speech: 'Double Jab, Hook!' },
]

const MUAY_THAI_COMBOS = [
  { label: 'Jab — Cross — Right Kick',        speech: 'Jab, Cross, Right Kick!' },
  { label: 'Left Hook — Right Knee',           speech: 'Left Hook, Right Knee!' },
  { label: 'Jab — Teep',                       speech: 'Jab, Teep!' },
  { label: 'Cross — Left Kick — Cross',        speech: 'Cross, Left Kick, Cross!' },
  { label: 'Jab — Cross — Left Elbow',         speech: 'Jab, Cross, Left Elbow!' },
  { label: 'Right Kick — Jab — Cross',         speech: 'Right Kick, Jab, Cross!' },
  { label: 'Jab — Cross — Right Knee',         speech: 'Jab, Cross, Right Knee!' },
  { label: 'Double Jab — Right Body Kick',     speech: 'Double Jab, Right Body Kick!' },
  { label: 'Left Knee — Right Kick',           speech: 'Left Knee, Right Kick!' },
  { label: 'Jab — Cross — Hook — Left Kick',   speech: 'Jab, Cross, Hook, Left Kick!' },
]

const COMBO_INTERVAL_MS = 12_000

const ORDINALS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
                  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

// ── Mid-session tips (shown during active round) ─────────────────
const BOXING_TIPS = [
  'Guard tight between every combo. No gaps.',
  'Exhale sharp on impact — drives the power.',
  'Stay light on the balls of your feet.',
  'Snap punches back fast. Don\'t push — pop.',
  'Full shoulder rotation on the cross. Hip first.',
]

const MUAY_THAI_TIPS = [
  'Chamber the knee high before every kick.',
  'Full hip rotation on the roundhouse. Commit.',
  'Guard stays up when throwing kicks. Always.',
  'Shin connects — not the foot. Angle the ankle.',
  'Core tight when absorbing leg kicks.',
]

// ── Vision constants ──────────────────────────────────────────────
const GUARD_THRESHOLD     = 0.10
const PUNCH_VEL_THRESHOLD = 1.6
const PUNCH_COOLDOWN_MS   = 280
const STATS_EVERY         = 10
const ARM_CONNECTIONS     = [
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 12],
]

// ── MediaPipe singleton ───────────────────────────────────────────
let _landmarker  = null
let _loadPromise = null

async function loadPoseLandmarker() {
  if (_landmarker)  return _landmarker
  if (_loadPromise) return _loadPromise
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
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence:  0.5,
      minTrackingConfidence:      0.5,
      outputSegmentationMasks:    false,
    }
    try { _landmarker = await PoseLandmarker.createFromOptions(vision, opts) }
    catch { opts.baseOptions.delegate = 'CPU'; _landmarker = await PoseLandmarker.createFromOptions(vision, opts) }
    return _landmarker
  })()
  return _loadPromise
}

// ── Helpers ───────────────────────────────────────────────────────
const fmt = secs =>
  `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`

function isProActive(data) {
  if (!data?.isPro) return false
  const exp = data.proExpirationDate
  if (!exp) return true
  const ms = typeof exp === 'number' ? exp : exp?.toMillis?.() ?? Date.parse(exp)
  return Date.now() < ms
}

function lsIsPro() {
  try { const d = JSON.parse(localStorage.getItem('1pb_is_pro')); return !!(d?.plan) }
  catch { return false }
}

// ── Report helpers ────────────────────────────────────────────────
function computeScore(accuracy, avgSpeed, punches, rounds) {
  const volumeScore = Math.min(100, Math.round((punches / Math.max(rounds, 1)) * 5))
  return Math.min(100, Math.round(accuracy * 0.45 + avgSpeed * 0.35 + volumeScore * 0.20))
}

function getGrade(score) {
  if (score >= 90) return { letter: 'S', color: '#ffb703' }
  if (score >= 80) return { letter: 'A', color: '#34d399' }
  if (score >= 65) return { letter: 'B', color: '#60a5fa' }
  if (score >= 50) return { letter: 'C', color: '#f97316' }
  return                  { letter: 'D', color: '#ef4444' }
}

// ── Structured coach feedback (end-of-session report) ───────────
// Returns { positive, improvement, tip } — all in EN coaching voice.
function getCoachFeedback(accuracy, avgSpeed, punches, rounds, score) {
  const punchRate = punches / Math.max(rounds, 1)

  // ── POSITIVE ──────────────────────────────────────────────────
  let positive
  if (accuracy >= 82)
    positive = 'Guard discipline is elite. Hands stayed high between every combo.'
  else if (avgSpeed >= 65)
    positive = 'Snap speed is sharp. Punches popping, not pushing — that\'s power generation.'
  else if (punchRate >= 10)
    positive = 'High output maintained across rounds. Cardio engine is working.'
  else if (score >= 80)
    positive = 'Well-rounded session. Solid guard coverage and consistent pressure throughout.'
  else
    positive = 'Commitment to the round was strong. You stayed in the pocket and kept moving.'

  // ── IMPROVEMENT ───────────────────────────────────────────────
  let improvement
  if (accuracy < 60)
    improvement = 'Defensive gap. Guard drops after every combo — chin is exposed. Critical fix.'
  else if (accuracy < 75)
    improvement = 'Guard breaks between exchanges. Elbows need to reset faster post-combo.'
  else if (avgSpeed < 30)
    improvement = 'Punches are telegraphed. Shorten the windup. Speed comes from the hip, not the arm.'
  else if (punchRate < 5)
    improvement = 'Output too low. Continuous pressure is the goal — don\'t rest between combos.'
  else if (accuracy < 88)
    improvement = 'Minor defensive gaps detected. Tighten the guard between exchanges.'
  else
    improvement = 'Weight distribution on power shots — drive from the rear foot, not the shoulder.'

  // ── COACHING TIP ──────────────────────────────────────────────
  let tip
  if (accuracy < 70)
    tip = 'After every combo: hands back to face. Non-negotiable. Make it muscle memory.'
  else if (avgSpeed < 35)
    tip = 'Exhale sharp on impact. Hip rotation drives the cross — not the arm. Snap it.'
  else if (punchRate < 6)
    tip = 'Set a 10-punch minimum per round. Keep hands busy even on defense. No downtime.'
  else
    tip = '1% better every session. One fix per round. Consistency beats intensity long-term.'

  return { positive, improvement, tip }
}

// ── ProGateModal ──────────────────────────────────────────────────
function ProGateModal({ reason, onClose }) {
  const isMuayThai = reason === 'muay-thai'
  return (
    <div className="pgm-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pgm-card">
        <div className="pgm-glow-top" />
        <div className="pgm-glow-bottom" />
        <div className="pgm-badge">⚡ PRO MEMBERS ONLY</div>
        <div className="pgm-icon">{isMuayThai ? '🦵' : '🥊'}</div>
        <h2 className="pgm-title">
          {isMuayThai ? 'Muay Thai is PRO' : 'Unlock the Full AI Coach'}
        </h2>
        <p className="pgm-sub">
          {reason === 'time'
            ? "Your 2-minute free preview has ended. Go PRO to keep training without limits."
            : isMuayThai
            ? "Kicks, knees, and elbows — the full Muay Thai arsenal is reserved for PRO members."
            : "Advanced combo detection and technique analysis are reserved for PRO members."}
        </p>
        <ul className="pgm-perks">
          {isMuayThai ? (
            <>
              <li><span className="pgm-perk-icon">🦵</span><span><strong>Full Muay Thai</strong> — kicks, knees &amp; elbows</span></li>
              <li><span className="pgm-perk-icon">🥊</span><span><strong>Classic Boxing</strong> mode included</span></li>
              <li><span className="pgm-perk-icon">⏱</span><span><strong>12 full rounds</strong> — unlimited training time</span></li>
              <li><span className="pgm-perk-icon">📊</span><span><strong>Full session</strong> performance report</span></li>
            </>
          ) : (
            <>
              <li><span className="pgm-perk-icon">⏱</span><span><strong>12 full rounds</strong> — unlimited training time</span></li>
              <li><span className="pgm-perk-icon">🧠</span><span><strong>Real-time guard</strong> &amp; technique analysis</span></li>
              <li><span className="pgm-perk-icon">🥋</span><span><strong>Advanced combo</strong> detection &amp; tracking</span></li>
              <li><span className="pgm-perk-icon">📊</span><span><strong>Full session</strong> performance report</span></li>
            </>
          )}
        </ul>
        <button className="pgm-cta" onClick={() => { window.location.href = '/' }}>
          Upgrade to PRO Now ⚡
        </button>
        <button className="pgm-secondary" onClick={onClose}>
          {isMuayThai ? 'Use Classic Boxing' : 'Continue Free Preview'}
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function AIBoxingCoach() {
  const { user } = useAuth()

  // First-run onboarding gate
  const [onboarded, setOnboarded] = useState(
    () => !!localStorage.getItem('1pb_fitness_onboarded')
  )

  // Monk Mode
  const [monkMode, setMonkMode] = useState(() => !!localStorage.getItem('1pb_monk_mode'))
  const monkStreak = (() => {
    try { return JSON.parse(localStorage.getItem('1pb_streak') || '{}').current || 0 } catch { return 0 }
  })()
  const toggleMonkMode = () => {
    setMonkMode(prev => {
      const next = !prev
      if (next) localStorage.setItem('1pb_monk_mode', '1')
      else localStorage.removeItem('1pb_monk_mode')
      return next
    })
  }

  // Mode
  const [mode, setMode] = useState(null) // null | 'boxing' | 'muay-thai'

  // Tier
  const [proStatus,    setProStatus]    = useState(() => lsIsPro() ? 'active' : 'loading')
  const [showProModal, setShowProModal] = useState(false)
  const [modalReason,  setModalReason]  = useState('time')

  // Camera
  const [camReady,   setCamReady]   = useState(false)
  const [camError,   setCamError]   = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  // MediaPipe
  const [poseReady, setPoseReady] = useState(false)
  const [poseError, setPoseError] = useState(null)

  // Session
  const [phase,    setPhase]    = useState('idle')
  const [round,    setRound]    = useState(1)
  const [timeLeft, setTimeLeft] = useState(TIERS.free.roundDuration)
  const [report,   setReport]   = useState(null)

  // HUD
  const [guardDown,    setGuardDown]    = useState(false)
  const [stats,        setStats]        = useState({ punches: 0, speed: 0, accuracy: 100 })
  const [currentCombo, setCurrentCombo] = useState(null)
  const [muted,        setMuted]        = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef          = useRef(null)
  const overlayRef        = useRef(null)
  const streamRef         = useRef(null)
  const landmarkerRef     = useRef(null)
  const rafRef            = useRef(null)
  const timerRef          = useRef(null)
  const comboIntervalRef  = useRef(null)
  const tipTimerRef       = useRef(null)   // cancellable toast tip timeout
  const modalTimerRef     = useRef(null)   // cancellable paywall modal timeout
  const roundRef          = useRef(1)      // mirrors round state for use in closures
  const sessionStartRef   = useRef(0)      // Date.now() at session start
  const lastVidTimeRef    = useRef(-1)
  const phaseRef          = useRef('idle')
  const proStatusRef      = useRef(proStatus)
  const mutedRef          = useRef(false)
  const voicesRef         = useRef([])
  const speakRef          = useRef(null)
  const tenWarnedRef      = useRef(false)
  const roundAnnouncedRef = useRef(0)

  const poseState = useRef({
    prevLeft: null, prevRight: null, prevTs: null,
    lastPunchAt: 0, punchCount: 0, velWindow: [],
    guardDownFrames: 0, totalFrames: 0,
    guardDownStart: null, totalGuardDownMs: 0,
  })

  // Keep hot refs in sync
  useEffect(() => { proStatusRef.current = proStatus }, [proStatus])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { roundRef.current = round }, [round])

  // ── TTS: voice loading ────────────────────────────────────────────
  useEffect(() => {
    if (!window.speechSynthesis) return
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      window.speechSynthesis.cancel()
    }
  }, [])

  // speakRef: rewritten every render so it always closes over latest voicesRef/mutedRef
  speakRef.current = (text) => {
    if (!window.speechSynthesis || mutedRef.current) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate   = 1.1
    utt.pitch  = 1.05
    utt.volume = 1.0
    utt.lang   = 'en-US'
    const voices = voicesRef.current
    utt.voice =
      voices.find(v => v.name === 'Google US English')                        ||
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find(v => v.name === 'Samantha')                                 ||
      voices.find(v => v.lang === 'en-US' && v.localService === false)        ||
      voices.find(v => v.lang === 'en-US')                                    ||
      null
    window.speechSynthesis.speak(utt)
  }

  // ── TTS: mute toggle ──────────────────────────────────────────────
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (next) window.speechSynthesis?.cancel()
  }

  // ── TTS: round announcement ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'round') return
    if (round === roundAnnouncedRef.current) return
    roundAnnouncedRef.current = round
    const ord = ORDINALS[round] || round.toString()
    const t = setTimeout(() => speakRef.current?.(`Round ${ord}. Fight!`), 300)
    return () => clearTimeout(t)
  }, [phase, round])

  // ── TTS: rest announcement + round-complete toast ─────────────────
  useEffect(() => {
    if (phase !== 'rest') return
    const t = setTimeout(() => speakRef.current?.('Rest! Next round coming up.'), 200)
    const remaining = TIERS.active.maxRounds - round
    toast.success(
      `⚡ סיבוב ${round} הושלם!`,
      remaining > 0 ? `עוד ${remaining} ${remaining === 1 ? 'סיבוב' : 'סיבובים'}. תישאר חד!` : null
    )
    return () => clearTimeout(t)
  }, [phase, round])

  // ── Combo engine ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'round') {
      clearInterval(comboIntervalRef.current)
      return
    }

    const pool = mode === 'muay-thai' ? MUAY_THAI_COMBOS : BOXING_COMBOS
    const fire = () => {
      const combo = pool[Math.floor(Math.random() * pool.length)]
      setCurrentCombo(combo)
      speakRef.current?.(combo.speech)
    }

    fire()
    comboIntervalRef.current = setInterval(fire, COMBO_INTERVAL_MS)
    return () => clearInterval(comboIntervalRef.current)
  }, [phase, round, mode])

  // ── Pro gate ──────────────────────────────────────────────────────
  useEffect(() => {
    if (proStatus === 'active') return
    if (!isFirebaseConfigured || !user) { setProStatus('free'); return }
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setProStatus(isProActive(snap.data()) ? 'active' : 'free'))
      .catch(() => setProStatus('free'))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera + MediaPipe init (only after mode is selected) ─────────
  useEffect(() => {
    if (proStatus === 'loading' || mode === null) return
    startCamera()
    loadPoseLandmarker()
      .then(lm  => { landmarkerRef.current = lm; setPoseReady(true) })
      .catch(err => { setPoseError(`AI failed to load: ${err.message}`); setPoseReady(true) })
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
      clearInterval(comboIntervalRef.current)
      cancelAnimationFrame(rafRef.current)
      window.speechSynthesis?.cancel()
    }
  }, [proStatus, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const tier   = TIERS[proStatus] ?? TIERS.free
  const isFree = proStatus === 'free'

  // ── Camera ────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamError(null); setCamReady(false)
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
          ? 'Camera permission denied. Please allow access and reload.'
          : `Camera error: ${err.message}`
      )
    }
  }, [facingMode])

  const flipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }

  // ── Back to mode selector ─────────────────────────────────────────
  const handleBack = () => {
    window.speechSynthesis?.cancel()
    clearInterval(timerRef.current)
    clearInterval(comboIntervalRef.current)
    cancelAnimationFrame(rafRef.current)
    clearTimeout(tipTimerRef.current)
    clearTimeout(modalTimerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setPhase('idle')
    setMode(null)
    setCamReady(false)
    setCamError(null)
    setCurrentCombo(null)
    setReport(null)
    setPoseReady(false)
    setPoseError(null)
  }

  // ── Mode selection ────────────────────────────────────────────────
  const handleMuayThai = () => {
    setMode('muay-thai')
    const tip = MUAY_THAI_TIPS[Math.floor(Math.random() * MUAY_THAI_TIPS.length)]
    clearTimeout(tipTimerRef.current)
    tipTimerRef.current = setTimeout(() => toast.info('💡 Muay Thai Tip', tip), 2200)
  }

  // ── Frame analysis ────────────────────────────────────────────────
  const analyzeFrame = useCallback((timestamp) => {
    const landmarker = landmarkerRef.current
    const video      = videoRef.current
    if (!landmarker || !video || video.readyState < 2) return
    if (video.currentTime === lastVidTimeRef.current) return
    lastVidTimeRef.current = video.currentTime

    let results
    try { results = landmarker.detectForVideo(video, performance.now()) }
    catch { return }
    if (!results.landmarks?.length) return

    const lm         = results.landmarks[0]
    const nose       = lm[0]
    const leftWrist  = lm[15]
    const rightWrist = lm[16]
    const ps         = poseState.current
    const chinY      = nose.y + GUARD_THRESHOLD

    drawOverlay(lm)

    const guardIsDown = (leftWrist.visibility  > 0.4 && leftWrist.y  > chinY) ||
                        (rightWrist.visibility > 0.4 && rightWrist.y > chinY)
    setGuardDown(guardIsDown)
    if (guardIsDown && ps.guardDownStart === null)       ps.guardDownStart = timestamp
    else if (!guardIsDown && ps.guardDownStart !== null) {
      ps.totalGuardDownMs += timestamp - ps.guardDownStart
      ps.guardDownStart = null
    }
    ps.totalFrames++
    if (guardIsDown) ps.guardDownFrames++

    if (ps.prevLeft && ps.prevTs) {
      const dt = (timestamp - ps.prevTs) / 1000
      if (dt > 0) {
        const lVel = leftWrist.visibility  > 0.4 ? Math.hypot(leftWrist.x  - ps.prevLeft.x,  leftWrist.y  - ps.prevLeft.y)  / dt : 0
        const rVel = rightWrist.visibility > 0.4 ? Math.hypot(rightWrist.x - ps.prevRight.x, rightWrist.y - ps.prevRight.y) / dt : 0
        const maxVel = Math.max(lVel, rVel)
        if (maxVel > ps.peakVel) ps.peakVel = maxVel
        ps.totalVel += maxVel
        ps.velCount++
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

    if (ps.totalFrames % STATS_EVERY === 0) {
      const avgVel   = ps.velWindow.reduce((a, b) => a + b, 0) / (ps.velWindow.length || 1)
      const speed    = Math.min(Math.round(avgVel * 28), 99)
      const accuracy = ps.totalFrames > 10
        ? Math.max(0, Math.round((1 - ps.guardDownFrames / ps.totalFrames) * 100))
        : 100
      setStats({ punches: ps.punchCount, speed, accuracy })
    }
  }, [])

  // ── Skeleton overlay ──────────────────────────────────────────────
  function drawOverlay(lm) {
    const canvas = overlayRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const w = video.videoWidth || 640, h = video.videoHeight || 360
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    for (const [a, b] of ARM_CONNECTIONS) {
      const la = lm[a], lb = lm[b]
      if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue
      ctx.beginPath(); ctx.moveTo(la.x * w, la.y * h); ctx.lineTo(lb.x * w, lb.y * h); ctx.stroke()
    }
    const chinY = (lm[0].y + GUARD_THRESHOLD) * h
    ctx.strokeStyle = 'rgba(255,183,3,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([10, 8])
    ctx.beginPath(); ctx.moveTo(0, chinY); ctx.lineTo(w, chinY); ctx.stroke()
    ctx.setLineDash([])
    for (const idx of [15, 16]) {
      const wrist = lm[idx]
      if ((wrist.visibility ?? 1) < 0.3) continue
      const up = wrist.y <= lm[0].y + GUARD_THRESHOLD
      ctx.shadowBlur = 10; ctx.shadowColor = up ? '#22c55e' : '#ef4444'
      ctx.fillStyle  = up ? '#22c55e' : '#ef4444'
      ctx.beginPath(); ctx.arc(wrist.x * w, wrist.y * h, 9, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(wrist.x * w, wrist.y * h, 3.5, 0, Math.PI * 2); ctx.fill()
    }
  }

  // ── rAF loop ──────────────────────────────────────────────────────
  useEffect(() => {
    phaseRef.current = phase
    if (phase === 'round') {
      const loop = ts => {
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

  // ── Session timer ─────────────────────────────────────────────────
  const startSession = () => {
    if (!camReady) return
    poseState.current = {
      prevLeft: null, prevRight: null, prevTs: null,
      lastPunchAt: 0, punchCount: 0, velWindow: [],
      guardDownFrames: 0, totalFrames: 0,
      guardDownStart: null, totalGuardDownMs: 0,
      peakVel: 0, totalVel: 0, velCount: 0,
    }
    sessionStartRef.current = Date.now()
    tenWarnedRef.current    = false
    roundAnnouncedRef.current = 0
    setRound(1)
    setTimeLeft(tier.roundDuration)
    setPhase('round')
    setStats({ punches: 0, speed: 0, accuracy: 100 })
    setGuardDown(false)
    setReport(null)
    setShowProModal(false)
    setCurrentCombo(null)
  }

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return
    clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === 11 && phase === 'round' && !tenWarnedRef.current) {
          tenWarnedRef.current = true
          speakRef.current?.('Ten seconds left!')
        }

        if (prev > 1) return prev - 1
        clearInterval(timerRef.current)

        setPhase(cur => {
          if (cur === 'round') {
            setRound(r => {
              const maxR = (proStatusRef.current === 'active' ? TIERS.active : TIERS.free).maxRounds
              if (r >= maxR) { finishSession(); return r }
              if (proStatusRef.current === 'active') {
                setTimeLeft(TIERS.active.restDuration)
                return r
              }
              finishSession(); return r
            })
            return proStatusRef.current === 'active' ? 'rest' : cur
          }
          tenWarnedRef.current = false
          setRound(r => { setTimeLeft(TIERS.active.roundDuration); return r + 1 })
          return 'round'
        })
        return 0
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishSession = () => {
    clearInterval(timerRef.current)
    clearInterval(comboIntervalRef.current)
    cancelAnimationFrame(rafRef.current)

    const isFreeNow = proStatusRef.current === 'free'
    speakRef.current?.(isFreeNow
      ? "Time's up! Upgrade to PRO for a full session."
      : "Time's up! Great session!")

    const ps = poseState.current
    const guardDownMs = ps.totalGuardDownMs +
      (ps.guardDownStart != null ? performance.now() - ps.guardDownStart : 0)

    if (isFreeNow) {
      toast.streak('⚡ 2 דקות אימון!', 'שדרג ל-PRO לאימונים מלאים של 12 סיבובים.')
      setPhase('idle')
      setCurrentCombo(null)
      modalTimerRef.current = setTimeout(() => {
        window.speechSynthesis?.cancel()
        setModalReason('time')
        setShowProModal(true)
      }, 1400)
      return
    }

    const accuracy     = ps.totalFrames > 10
      ? Math.max(0, Math.round((1 - ps.guardDownFrames / ps.totalFrames) * 100))
      : 100
    const avgVelRaw    = ps.velCount > 0 ? ps.totalVel / ps.velCount : 0
    const avgSpeed     = Math.min(Math.round(avgVelRaw * 28), 99)
    const peakSpeed    = Math.min(Math.round(ps.peakVel * 28), 99)
    const actualRounds = roundRef.current
    const activeTimeSecs = sessionStartRef.current > 0
      ? Math.round((Date.now() - sessionStartRef.current) / 1000)
      : actualRounds * tier.roundDuration
    const score    = computeScore(accuracy, avgSpeed, ps.punchCount, actualRounds)
    const coaching = getCoachFeedback(accuracy, avgSpeed, ps.punchCount, actualRounds, score)

    toast.success('🏆 האימון הסתיים!', `${ps.punchCount} מכות זוהו. עבודת אליטה!`)

    setReport({
      rounds:        actualRounds,
      punches:       ps.punchCount,
      guardDownSecs: Math.round(guardDownMs / 1000),
      accuracy,
      avgSpeed,
      peakSpeed,
      activeTimeSecs,
      score,
      coaching,
    })
    setPhase('done')
    setCurrentCombo(null)
  }

  const stopSession = () => {
    window.speechSynthesis?.cancel()
    finishSession()
  }

  const openComboLocked = () => {
    window.speechSynthesis?.cancel()
    setModalReason('feature')
    setShowProModal(true)
  }

  const handleCloseModal = () => {
    setShowProModal(false)
    window.speechSynthesis?.cancel()
  }

  // ── Render: first-run onboarding ─────────────────────────────────
  if (!onboarded) {
    return (
      <FitnessOnboarding
        onComplete={() => setOnboarded(true)}
      />
    )
  }

  // ── Render: loading ───────────────────────────────────────────────
  if (proStatus === 'loading') {
    return (
      <div className="bc-loading">
        <div className="bc-spinner" /><p>Checking access…</p>
      </div>
    )
  }

  // ── Render: mode selector ─────────────────────────────────────────
  if (mode === null) {
    return (
      <div className={`bc-mode-select${monkMode ? ' bc-monk-mode' : ''}`}>
        <button className="bc-ms-exit" onClick={() => window.location.href = '/'}>חזרה לתפריט</button>
        <div className="bc-ms-content">
          <div className="bc-ms-eyebrow">🥋 AI COACH</div>
          <h1 className="bc-ms-title">Choose Your Style</h1>
          <p className="bc-ms-sub">Select a training mode to begin your session</p>

          {/* Monk Mode toggle */}
          <button
            className={`bc-monk-toggle${monkMode ? ' bc-monk-toggle--active' : ''}`}
            onClick={toggleMonkMode}
            dir="rtl"
          >
            <span className="bc-monk-switch" aria-hidden="true" />
            <span className="bc-monk-toggle-label">
              <span className="bc-monk-toggle-title">🧎 מצב נזיר</span>
              <span className="bc-monk-toggle-sub">משמעת מקסימלית · פוקוס מלא</span>
            </span>
          </button>

          {/* Active badge */}
          {monkMode && (
            <div className="bc-monk-badge" dir="rtl">
              <span className="bc-monk-badge-icon">🔥</span>
              <div className="bc-monk-badge-text">
                <div className="bc-monk-badge-title">מצב נזיר פעיל</div>
                <div className="bc-monk-badge-sub">
                  {monkStreak > 0 ? `יום ${monkStreak} ברצף · אפס תירוצים` : 'אפס תירוצים · מקסימום פוקוס'}
                </div>
              </div>
              <span className="bc-monk-badge-streak">{monkStreak > 0 ? `🔥×${monkStreak}` : ''}</span>
            </div>
          )}

          <div className="bc-ms-cards">
            <button className="bc-ms-card" onClick={() => {
              setMode('boxing')
              const tip = BOXING_TIPS[Math.floor(Math.random() * BOXING_TIPS.length)]
              clearTimeout(tipTimerRef.current)
              tipTimerRef.current = setTimeout(() => toast.info('💡 Boxing Tip', tip), 2200)
            }}>
              <div className="bc-ms-card-glow bc-ms-card-glow--boxing" />
              <span className="bc-ms-icon">🥊</span>
              <span className="bc-ms-name">Classic Boxing</span>
              <span className="bc-ms-desc">Jabs, crosses, hooks &amp; uppercuts</span>
              <div className="bc-ms-combos">
                {BOXING_COMBOS.slice(0, 2).map(c => <span key={c.label}>{c.label}</span>)}
                <span>+ {BOXING_COMBOS.length - 2} more combos</span>
              </div>
              <span className="bc-ms-badge bc-ms-badge--free">FREE</span>
            </button>

            <button
              className="bc-ms-card bc-ms-card--pro"
              onClick={handleMuayThai}
            >
              <div className="bc-ms-card-glow bc-ms-card-glow--muaythai" />
              <span className="bc-ms-icon">🦵</span>
              <span className="bc-ms-name">Muay Thai</span>
              <span className="bc-ms-desc">Punches, kicks, knees &amp; elbows</span>
              <div className="bc-ms-combos">
                {MUAY_THAI_COMBOS.slice(0, 2).map(c => <span key={c.label}>{c.label}</span>)}
                <span>+ {MUAY_THAI_COMBOS.length - 2} more combos</span>
              </div>
              <span className="bc-ms-badge bc-ms-badge--pro">⚡ PRO</span>
            </button>
          </div>
        </div>
        {showProModal && <ProGateModal reason={modalReason} onClose={handleCloseModal} />}
      </div>
    )
  }

  // ── Render: session report (PRO only) ─────────────────────────────
  if (phase === 'done' && report) {
    const grade = getGrade(report.score)
    return (
      <div className="bc-report" dir="rtl">
        <div className="bc-report-card">
          <div className="bc-report-trophy">{mode === 'muay-thai' ? '🦵' : '🏆'}</div>
          <h2 className="bc-report-title">האימון הסתיים</h2>

          {/* Score + Grade */}
          <div className="bc-report-score-row">
            <div className="bc-report-score-block">
              <span className="bc-report-score-num" style={{ color: grade.color }}>{report.score}</span>
              <span className="bc-report-score-lbl">ניקוד</span>
            </div>
            <div
              className="bc-report-grade"
              style={{ color: grade.color, borderColor: grade.color + '55', background: grade.color + '18' }}
            >
              {grade.letter}
            </div>
          </div>

          {/* Stats grid 2 × 3 */}
          <div className="bc-report-grid">
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.punches}</span>
              <span className="bc-rs-label">מכות</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.avgSpeed}</span>
              <span className="bc-rs-label">מהירות</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.accuracy}%</span>
              <span className="bc-rs-label">הגנה</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.peakSpeed}</span>
              <span className="bc-rs-label">שיא מהירות</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{report.rounds}</span>
              <span className="bc-rs-label">סיבובים</span>
            </div>
            <div className="bc-report-stat">
              <span className="bc-rs-value">{fmt(report.activeTimeSecs)}</span>
              <span className="bc-rs-label">זמן פעיל</span>
            </div>
          </div>

          {/* Structured coach feedback */}
          <div className="bc-coach-feedback">
            <div className="bc-cf-header">
              <span className="bc-cf-header-icon">🥊</span>
              <span className="bc-cf-header-label">COACH ANALYSIS</span>
            </div>
            <div className="bc-cf-row bc-cf-positive">
              <span className="bc-cf-tag">✓ Clean Technique</span>
              <p className="bc-cf-text">{report.coaching.positive}</p>
            </div>
            <div className="bc-cf-row bc-cf-improvement">
              <span className="bc-cf-tag">⚠ Fix This</span>
              <p className="bc-cf-text">{report.coaching.improvement}</p>
            </div>
            <div className="bc-cf-row bc-cf-tip">
              <span className="bc-cf-tag">💡 Next Rep</span>
              <p className="bc-cf-text">{report.coaching.tip}</p>
            </div>
          </div>

          <p className="bc-report-ai-note">🧠 MediaPipe Pose — מעקב מקומי, ללא שיתוף נתונים.</p>
          <button className="bc-btn-primary" onClick={() => { setPhase('idle'); setRound(1); setTimeLeft(tier.roundDuration) }}>אימון חדש</button>
          <button className="bc-btn-ghost" onClick={handleBack}>חזרה לתפריט</button>
        </div>
      </div>
    )
  }

  // ── Render: camera HUD ────────────────────────────────────────────
  const mirror = facingMode === 'user' ? 'scaleX(-1)' : 'none'
  const modeName = mode === 'muay-thai' ? 'Muay Thai' : 'Classic Boxing'

  return (
    <div className={`bc-root${monkMode ? ' bc-monk-mode' : ''}`}>
      <canvas ref={overlayRef} className="bc-overlay-canvas" style={{ transform: mirror }} />
      <video  ref={videoRef}   className="bc-video" autoPlay playsInline muted style={{ transform: mirror }} />
      <div className="bc-vignette" />

      {/* Guard alert */}
      {guardDown && phase === 'round' && (
        <div className="bc-guard-alert"><span>⚠️ GUARD UP!</span></div>
      )}

      {/* Free preview banner */}
      {isFree && phase !== 'idle' && (
        <div className="bc-free-banner" dir="rtl">תצוגה חינם · נותר {fmt(timeLeft)}</div>
      )}

      {/* Combo display */}
      {currentCombo && phase === 'round' && (
        <div key={currentCombo.label} className="bc-combo-display">
          <span className="bc-combo-eyebrow">COMBO</span>
          <span className="bc-combo-text">{currentCombo.label}</span>
        </div>
      )}

      {camError && (
        <div className="bc-cam-error">
          <p>{camError}</p><button onClick={() => startCamera()}>Retry</button>
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
                <span className="bc-round-total">/ {tier.maxRounds}</span>
              </>
          }
        </div>

        <div className={`bc-timer ${timeLeft <= 10 && phase === 'round' ? 'bc-timer--danger' : ''} ${phase === 'rest' ? 'bc-timer--rest' : ''}`}>
          {fmt(timeLeft)}
        </div>

        <div className="bc-hud-top-right">
          <button
            className={`bc-mute-btn ${muted ? 'bc-mute-btn--muted' : ''}`}
            onClick={toggleMute}
            title={muted ? 'Unmute coach' : 'Mute coach'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="bc-btn-exit" onClick={handleBack} title="Change mode">✕</button>
        </div>
      </div>

      {/* AI status badge */}
      {!poseReady && <div className="bc-ai-badge bc-ai-badge--loading"><div className="bc-ai-spinner" /> Loading AI…</div>}
      {poseReady && !poseError && phase === 'idle' && <div className="bc-ai-badge bc-ai-badge--ready">🧠 AI Ready · {modeName}</div>}
      {poseError && <div className="bc-ai-badge bc-ai-badge--error" title={poseError}>⚠ AI offline</div>}

      {/* Reticle (idle only) */}
      {phase === 'idle' && (
        <div className="bc-reticle-wrap">
          <div className={`bc-reticle ${camReady ? 'bc-reticle--active' : ''}`}>
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

      {/* Side stats */}
      {phase !== 'idle' && (
        <div className="bc-stats-side">
          <div className="bc-stat-chip">
            <span className="bc-stat-val">{stats.punches}</span>
            <span className="bc-stat-lbl">STRIKES</span>
          </div>
          <div className={`bc-stat-chip ${stats.speed > 60 ? 'bc-stat-chip--hot' : ''}`}>
            <span className="bc-stat-val">{stats.speed}</span>
            <span className="bc-stat-lbl">SPEED</span>
          </div>
          <div className={`bc-stat-chip ${stats.accuracy < 70 ? 'bc-stat-chip--warn' : ''}`}>
            <span className="bc-stat-val">{stats.accuracy}%</span>
            <span className="bc-stat-lbl">GUARD</span>
          </div>
          <div
            className={`bc-stat-chip bc-stat-chip--combo ${isFree ? 'bc-stat-chip--locked' : ''}`}
            onClick={isFree ? openComboLocked : undefined}
            style={isFree ? { cursor: 'pointer' } : {}}
          >
            <span className="bc-stat-val">{isFree ? '🔒' : '--'}</span>
            <span className="bc-stat-lbl">COMBO</span>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="bc-controls">
        <button className="bc-ctrl-flip" onClick={flipCamera}>🔄</button>
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

      {/* Pro Gate Modal */}
      {showProModal && (
        <ProGateModal reason={modalReason} onClose={handleCloseModal} />
      )}
    </div>
  )
}
