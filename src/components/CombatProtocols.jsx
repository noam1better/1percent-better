import { useState, useEffect, useRef, useCallback } from 'react'
import { loadPoseLandmarker, analyzeTeep, analyzeHeadMovement, drawSkeleton } from '../services/poseService'

// ── Protocol definitions ──────────────────────────────────────────────
const PROTOCOLS = [
  {
    id: 'muay-thai-drills',
    name: 'Muay Thai Drills',
    nameHe: 'תרגילי מוי תאי',
    emoji: '🦵',
    color: '#a78bfa',
    discipline: 'muay-thai',
    type: 'rounds',
    rounds: [
      { label: 'סיבוב 1 — טיפ (בעיטות דחיפה)' },
      { label: 'סיבוב 2 — בעיטות נמוכות' },
      { label: 'סיבוב 3 — ברכיים' },
      { label: 'סיבוב 4 — תרגילים משולבים' },
    ],
    workSec: 180,
    restSec: 60,
    xpPerRound: 50,
    poseFeature: 'teepCounter',
    desc: '4 סיבובים × 3 דק׳ · טיפ, בעיטות נמוכות, ברכיים',
  },
  {
    id: 'combinations-builder',
    name: 'Combinations Builder',
    nameHe: 'בנאי קומבינציות',
    emoji: '⚡',
    color: '#f59e0b',
    discipline: 'boxing',
    type: 'combos',
    combos: [
      { label: 'ג׳אב — קרוס — הוק — בעיטה נמוכה', reps: 10 },
      { label: 'ג׳אב — ג׳אב — קרוס — הוק', reps: 10 },
      { label: 'קרוס — הוק — אפרקאט — ג׳אב', reps: 8 },
      { label: 'ג׳אב — קרוס — הוק — אפרקאט — הוק', reps: 6 },
      { label: 'ג׳אב — קרוס — סליפ — קרוס — הוק', reps: 6 },
    ],
    xpPerCombo: 30,
    poseFeature: 'none',
    desc: '5 קומבינציות לתרגול · חזרות ממוקדות',
  },
]

const XP_PER_ROUND = 50
const XP_PER_COMBO = 30

function fmtTime(s) {
  const secs = Math.max(0, Math.round(s))
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}

// Circular timer arc (SVG)
function TimerRing({ progress, color, size = 96, strokeWidth = 7, children }) {
  const r   = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - Math.max(0, Math.min(1, progress)))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ── Camera / Pose hook ────────────────────────────────────────────────
function usePoseCamera(poseFeature, active) {
  const [cameraOn,         setCameraOn]         = useState(false)
  const [teepCount,        setTeepCount]        = useState(0)
  const [headInsufficient, setHeadInsufficient] = useState(false)
  const [poseReady,        setPoseReady]        = useState(false)
  const [cameraError,      setCameraError]      = useState(null)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const streamRef   = useRef(null)
  const teepRef     = useRef({ raised: false, count: 0 })
  const noseHistRef = useRef([])
  const activeRef   = useRef(active)

  useEffect(() => { activeRef.current = active }, [active])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Load landmarker
      let landmarker
      try { landmarker = await loadPoseLandmarker() } catch { setCameraError('pose-load-failed'); return }
      setPoseReady(true)

      let lastTick = 0
      function tick(ts) {
        if (!activeRef.current) return
        rafRef.current = requestAnimationFrame(tick)
        if (ts - lastTick < 100) return  // ~10 fps
        lastTick = ts
        const video = videoRef.current
        if (!video || video.readyState < 2 || video.paused) return

        let results
        try { results = landmarker.detectForVideo(video, performance.now()) } catch { return }
        const lm = results?.landmarks?.[0]
        if (!lm || lm.length < 29) return

        // Draw skeleton
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          drawSkeleton(ctx, lm, 'boxing', canvas.width, canvas.height, 1)
        }

        if (poseFeature === 'teepCounter') {
          const result = analyzeTeep(lm, teepRef.current)
          teepRef.current = result
          setTeepCount(result.count)
        }

        if (poseFeature === 'headMovement') {
          const result = analyzeHeadMovement(lm, noseHistRef.current)
          noseHistRef.current = result.noseHistory
          setHeadInsufficient(result.insufficient)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
      setCameraOn(true)
    } catch (err) {
      setCameraError(err?.name === 'NotAllowedError' ? 'permission-denied' : 'unavailable')
    }
  }, [poseFeature])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setCameraOn(false)
    setPoseReady(false)
    teepRef.current = { raised: false, count: 0 }
    noseHistRef.current = []
    setTeepCount(0)
    setHeadInsufficient(false)
  }, [])

  // Stop on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  // Stop when session becomes inactive
  useEffect(() => {
    if (!active && cameraOn) stopCamera()
  }, [active, cameraOn, stopCamera])

  return { cameraOn, teepCount, headInsufficient, poseReady, cameraError, videoRef, canvasRef, startCamera, stopCamera }
}

// ── Round timer component ─────────────────────────────────────────────
function RoundTimer({ protocol, onRoundComplete, onSessionEnd, headInsufficient }) {
  const [roundIdx,   setRoundIdx]   = useState(-1)   // -1 = not started
  const [roundPhase, setRoundPhase] = useState('pre') // 'pre' | 'work' | 'rest'
  const [timeLeft,   setTimeLeft]   = useState(protocol.workSec)
  const [completed,  setCompleted]  = useState([])   // array of round indices done

  const phaseRef  = useRef('pre')
  const timeRef   = useRef(protocol.workSec)
  const roundRef  = useRef(-1)
  const timerRef  = useRef(null)
  const totalRounds = protocol.rounds.length

  function clearTimer() { clearInterval(timerRef.current) }

  function startRound(idx) {
    clearTimer()
    roundRef.current  = idx
    phaseRef.current  = 'work'
    timeRef.current   = protocol.workSec
    setRoundIdx(idx)
    setRoundPhase('work')
    setTimeLeft(protocol.workSec)

    timerRef.current = setInterval(() => {
      timeRef.current -= 1
      if (timeRef.current <= 0) {
        if (phaseRef.current === 'work') {
          // Work phase done → start rest or finish
          const ri = roundRef.current
          setCompleted(prev => [...prev, ri])
          onRoundComplete(ri)
          if (ri + 1 >= totalRounds) {
            clearTimer()
            phaseRef.current = 'done'
            setRoundPhase('done')
            onSessionEnd(totalRounds)
            return
          }
          phaseRef.current = 'rest'
          timeRef.current  = protocol.restSec
          setRoundPhase('rest')
          setTimeLeft(protocol.restSec)
        } else if (phaseRef.current === 'rest') {
          // Rest done → auto next round
          startRound(roundRef.current + 1)
        }
      } else {
        setTimeLeft(timeRef.current)
      }
    }, 1000)
  }

  useEffect(() => () => clearTimer(), [])

  const color    = protocol.color
  const progress = roundPhase === 'work'
    ? timeLeft / protocol.workSec
    : roundPhase === 'rest'
      ? timeLeft / protocol.restSec
      : 0

  const phaseColor = roundPhase === 'rest' ? '#34d399' : color
  const notStarted = roundIdx === -1
  const isDone     = roundPhase === 'done'

  if (isDone) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Timer display */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
        padding: '1.1rem',
        background: 'rgba(255,255,255,0.025)',
        border: headInsufficient && roundPhase === 'work'
          ? '1px solid rgba(239,68,68,0.35)'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        transition: 'border-color 0.35s',
      }}>
        <TimerRing progress={notStarted ? 1 : progress} color={phaseColor} size={104} strokeWidth={8}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: notStarted ? 'rgba(241,245,249,0.3)' : phaseColor,
              fontFamily: "'SF Mono','Fira Code',monospace",
              fontSize: '1.5rem', fontWeight: 900, lineHeight: 1,
            }}>
              {notStarted ? '3:00' : fmtTime(timeLeft)}
            </div>
            <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.5rem', fontWeight: 700, marginTop: 4, letterSpacing: '0.1em' }}>
              {notStarted ? 'READY' : roundPhase === 'work' ? 'WORK' : 'REST'}
            </div>
          </div>
        </TimerRing>

        <div style={{ flex: 1 }}>
          {notStarted && (
            <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              לחץ ״התחל״ להפעלת הטיימר הראשון
            </div>
          )}
          {!notStarted && roundPhase === 'work' && (
            <>
              <div style={{ color: color, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                סיבוב {roundIdx + 1} / {totalRounds}
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.3 }}>
                {protocol.rounds[roundIdx]?.label}
              </div>
              {headInsufficient && (
                <div style={{ color: '#f87171', fontSize: '0.68rem', fontWeight: 700, marginTop: 6, animation: 'fadeIn 0.3s ease' }}>
                  🔴 זוז את הראש — יותר תנועה!
                </div>
              )}
            </>
          )}
          {!notStarted && roundPhase === 'rest' && (
            <>
              <div style={{ color: '#34d399', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                מנוחה
              </div>
              <div style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                סיבוב {roundIdx + 2} / {totalRounds} מתחיל אוטומטית
              </div>
            </>
          )}
        </div>
      </div>

      {/* Round checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {protocol.rounds.map((round, i) => {
          const done   = completed.includes(i)
          const active = roundIdx === i && roundPhase === 'work'
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.8rem 1rem',
                background: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 14,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                border: `2.5px solid ${done ? '#34d399' : active ? color : 'rgba(255,255,255,0.2)'}`,
                background: done ? 'rgba(52,211,153,0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34d399', fontSize: '0.88rem', fontWeight: 900,
                transition: 'all 0.3s ease',
              }}>
                {done && '✓'}
                {active && !done && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 1s ease infinite' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: done ? 'rgba(241,245,249,0.35)' : active ? '#f1f5f9' : 'rgba(241,245,249,0.6)',
                  fontSize: '0.88rem', fontWeight: active ? 800 : 600,
                  textDecoration: done ? 'line-through' : 'none',
                  textDecorationColor: 'rgba(241,245,249,0.22)',
                }}>
                  {round.label}
                </div>
                <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.65rem', marginTop: 2 }}>
                  {done ? '✓ הושלם' : `3:00 עבודה · 1:00 מנוחה · +${XP_PER_ROUND} XP`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Start / next round button */}
      {notStarted && (
        <button
          onClick={() => startRound(0)}
          style={{
            width: '100%', padding: '1rem', borderRadius: 16,
            background: 'linear-gradient(135deg,#c49020,#d4a843)',
            border: 'none',
            color: '#0d0d0d', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          ▶ התחל סיבוב 1
        </button>
      )}
    </div>
  )
}

// ── Combo checklist ───────────────────────────────────────────────────
function ComboChecklist({ protocol, onComplete }) {
  const [checked, setChecked] = useState([])

  function toggle(i) {
    setChecked(prev => {
      const next = prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
      if (next.length === protocol.combos.length) {
        onComplete(protocol.combos.length)
      }
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      {protocol.combos.map((combo, i) => {
        const done = checked.includes(i)
        return (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.85rem',
              padding: '0.9rem 1rem',
              background: done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${done ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 14, cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              border: `2.5px solid ${done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.2)'}`,
              background: done ? 'rgba(34,197,94,0.1)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#22c55e', fontSize: '0.88rem', fontWeight: 900,
              transition: 'all 0.25s ease',
            }}>
              {done && '✓'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: done ? 'rgba(241,245,249,0.35)' : '#f1f5f9',
                fontSize: '0.9rem', fontWeight: 700,
                textDecoration: done ? 'line-through' : 'none',
                textDecorationColor: 'rgba(241,245,249,0.22)',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {combo.label}
              </div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', marginTop: 2 }}>
                {combo.reps} חזרות · +{XP_PER_COMBO} XP
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────
export default function CombatProtocols({ onClose, onAwardXP, onOpenFreeSession }) {
  const [phase,    setPhase]    = useState('select')   // 'select' | 'active' | 'done'
  const [protocol, setProtocol] = useState(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [logs,     setLogs]     = useState([])         // session log lines

  const activeRef = useRef(false)
  useEffect(() => { activeRef.current = phase === 'active' }, [phase])

  const {
    cameraOn, teepCount, headInsufficient, poseReady, cameraError,
    videoRef, canvasRef, startCamera, stopCamera,
  } = usePoseCamera(protocol?.poseFeature || 'none', phase === 'active')

  function selectProtocol(p) {
    setProtocol(p)
    setXpEarned(0)
    setLogs([])
    setPhase('active')
  }

  function handleRoundComplete(roundIdx) {
    const xp = XP_PER_ROUND
    setXpEarned(prev => prev + xp)
    setLogs(prev => [`✓ סיבוב ${roundIdx + 1} הושלם · +${xp} XP`, ...prev])
  }

  function handleComboComplete(comboCount) {
    const xp = comboCount * XP_PER_COMBO
    setXpEarned(xp)
    setLogs([`✓ ${comboCount} קומבינציות הושלמו · +${xp} XP`])
    setPhase('done')
  }

  function handleSessionEnd(roundsCompleted) {
    const xp = roundsCompleted * XP_PER_ROUND
    setXpEarned(xp)
    // Save to localStorage for daily summary
    try {
      const entry = {
        date: new Date().toISOString().slice(0, 10),
        protocol: protocol.id,
        rounds: roundsCompleted,
        xp,
        teepCount: protocol.poseFeature === 'teepCounter' ? teepCount : undefined,
        timestamp: Date.now(),
      }
      const prev = JSON.parse(localStorage.getItem('prime_combat_protocols_log') || '[]')
      localStorage.setItem('prime_combat_protocols_log', JSON.stringify([entry, ...prev].slice(0, 50)))
    } catch {}
    setPhase('done')
  }

  function handleFinish() {
    stopCamera()
    onAwardXP(xpEarned)
    onClose()
  }

  const col = protocol?.color || '#60a5fa'

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 5500,
        background: '#09090b',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ color: 'rgba(239,68,68,0.55)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
              ◈ COMBAT PROTOCOLS
            </div>
            <div style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 900, marginTop: 2 }}>
              {phase === 'select' ? 'בחר פרוטוקול' : protocol?.nameHe}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Camera toggle — only during active round-based protocols with pose feature */}
            {phase === 'active' && protocol?.poseFeature !== 'none' && (
              <button
                onClick={() => cameraOn ? stopCamera() : startCamera()}
                className="btn-tactile"
                style={{
                  background: cameraOn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${cameraOn ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8, color: cameraOn ? '#f1f5f9' : 'rgba(241,245,249,0.45)',
                  cursor: 'pointer', fontWeight: 800, padding: '0.28rem 0.55rem',
                  minHeight: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                  fontSize: '0.85rem',
                }}
                title={cameraOn ? 'כבה מצלמה' : 'הפעל מצלמה + AI'}
              >
                📷
                <span style={{ fontSize: '0.42rem', fontWeight: 700, opacity: 0.7 }}>
                  {cameraOn ? 'ON' : 'AI'}
                </span>
              </button>
            )}
            <button
              onClick={() => { stopCamera(); onClose() }}
              className="btn-tactile"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(241,245,249,0.5)', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44,
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Camera preview (compact, top of scroll area) ── */}
        {cameraOn && (
          <div style={{
            position: 'relative', width: '100%', background: '#000', flexShrink: 0,
            height: 160, overflow: 'hidden',
          }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              onLoadedMetadata={e => {
                if (canvasRef.current) {
                  canvasRef.current.width  = e.target.videoWidth
                  canvasRef.current.height = e.target.videoHeight
                }
              }}
            />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

            {/* Pose badges */}
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: '0.4rem' }}>
              {protocol?.poseFeature === 'teepCounter' && (
                <div style={{
                  background: 'rgba(167,139,250,0.85)', borderRadius: 10,
                  padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 900, color: '#fff',
                }}>
                  🦵 {teepCount} טיפ
                </div>
              )}
              {protocol?.poseFeature === 'headMovement' && (
                <div style={{
                  background: headInsufficient ? 'rgba(239,68,68,0.85)' : 'rgba(96,165,250,0.85)',
                  borderRadius: 10, padding: '0.25rem 0.6rem',
                  fontSize: '0.72rem', fontWeight: 900, color: '#fff',
                  animation: headInsufficient ? 'pulse 0.8s ease infinite' : 'none',
                }}>
                  {headInsufficient ? '⚠️ זוז!' : '✓ תנועה טובה'}
                </div>
              )}
              {!poseReady && (
                <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: '0.25rem 0.6rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                  טוען AI...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>
              {cameraError === 'permission-denied'
                ? '🔒 אין הרשאת מצלמה — אפשר בהגדרות הדפדפן'
                : 'מצלמה לא זמינה במכשיר זה'}
            </span>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── SELECT phase ── */}
          {phase === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'slide-up 0.25s ease' }}>
              <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.76rem', margin: 0, lineHeight: 1.55 }}>
                3:00 עבודה · 1:00 מנוחה · מעקב AI אופציונלי
              </p>
              {/* Free AI session shortcut */}
              {onOpenFreeSession && (
                <button
                  onClick={onOpenFreeSession}
                  className="btn-tactile"
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(232,232,232,0.5)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  🥊 סשן חופשי עם מאמן AI ←
                </button>
              )}
              {PROTOCOLS.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProtocol(p)}
                  className="btn-tactile"
                  style={{
                    width: '100%', textAlign: 'right', padding: '1rem',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    transition: 'border-color 0.18s',
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>
                    {p.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#f1f5f9', fontSize: '0.92rem', fontWeight: 900, marginBottom: 3 }}>{p.nameHe}</div>
                    <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.7rem', lineHeight: 1.4 }}>{p.desc}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 5, flexWrap: 'wrap' }}>
                      {p.type === 'rounds' && (
                        <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '0.12rem 0.5rem', color: p.color, fontSize: '0.62rem', fontWeight: 700 }}>
                          {p.rounds.length} סיבובים · {p.rounds.length * XP_PER_ROUND} XP
                        </span>
                      )}
                      {p.type === 'combos' && (
                        <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '0.12rem 0.5rem', color: p.color, fontSize: '0.62rem', fontWeight: 700 }}>
                          {p.combos.length} קומבינציות · {p.combos.length * XP_PER_COMBO} XP
                        </span>
                      )}
                      {p.poseFeature !== 'none' && (
                        <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '0.12rem 0.5rem', color: 'rgba(165,180,252,0.7)', fontSize: '0.62rem', fontWeight: 700 }}>
                          📷 AI
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '1rem', flexShrink: 0 }}>←</span>
                </button>
              ))}
            </div>
          )}

          {/* ── ACTIVE phase ── */}
          {phase === 'active' && protocol && (
            <div style={{ animation: 'slide-up 0.25s ease' }}>
              {/* Protocol header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                }}>
                  {protocol.emoji}
                </div>
                <div>
                  <div style={{ color: col, fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    ◈ COMBAT PROTOCOL
                  </div>
                  <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem' }}>{protocol.nameHe}</div>
                </div>
                {xpEarned > 0 && (
                  <div style={{ marginInlineStart: 'auto', color: '#d4a843', fontWeight: 900, fontSize: '0.88rem', background: 'transparent', border: '1px solid rgba(212,168,67,0.22)', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                    +{xpEarned} XP
                  </div>
                )}
              </div>

              {protocol.type === 'rounds' && (
                <RoundTimer
                  protocol={protocol}
                  onRoundComplete={handleRoundComplete}
                  onSessionEnd={handleSessionEnd}
                  headInsufficient={headInsufficient && cameraOn}
                />
              )}

              {protocol.type === 'combos' && (
                <ComboChecklist
                  protocol={protocol}
                  onComplete={handleComboComplete}
                />
              )}

              {/* AI hint */}
              {protocol.poseFeature !== 'none' && !cameraOn && (
                <div style={{
                  marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.65rem 0.9rem',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                }}>
                  <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>📷</span>
                  <span style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.73rem' }}>
                    הפעל מצלמה למעקב AI ·{' '}
                    {protocol.poseFeature === 'teepCounter' ? 'מונה טיפ' : 'תנועת ראש'}
                  </span>
                </div>
              )}

              {/* Teep count (visible below camera) */}
              {protocol.poseFeature === 'teepCounter' && cameraOn && (
                <div style={{
                  marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ color: '#a78bfa', fontSize: '1.9rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1 }}>
                      {teepCount}
                    </div>
                    <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>טיפ</div>
                  </div>
                  <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.71rem', lineHeight: 1.5 }}>
                    טיפ נספרים אוטומטית
                  </div>
                </div>
              )}

              {/* Activity log */}
              {logs.length > 0 && (
                <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ color: 'rgba(52,211,153,0.7)', fontSize: '0.72rem', fontFamily: "'SF Mono','Fira Code',monospace", padding: '0.2rem 0' }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DONE phase ── */}
          {phase === 'done' && protocol && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', animation: 'slide-up 0.3s ease', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '3rem' }}>{protocol.emoji}</div>
              <div>
                <h2 style={{ color: col, fontWeight: 900, fontSize: '1.3rem', margin: 0, textAlign: 'center' }}>פרוטוקול הושלם!</h2>
                <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.82rem', textAlign: 'center', marginTop: 4 }}>{protocol.nameHe}</p>
              </div>

              {/* XP earned */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                background: '#111114', border: '1px solid rgba(212,168,67,0.22)',
                borderRadius: 16, padding: '0.85rem 1.5rem', width: '100%',
              }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
                <div>
                  <div style={{ color: '#d4a843', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1, fontFamily: "'SF Mono','Fira Code',monospace" }}>+{xpEarned} XP</div>
                  <div style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.65rem', marginTop: 2 }}>נצברו מ-{protocol.type === 'combos' ? `${protocol.combos.length} קומבינציות` : `${protocol.rounds.length} סיבובים`}</div>
                </div>
              </div>

              {/* Teep summary */}
              {protocol.poseFeature === 'teepCounter' && teepCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '0.85rem 1rem',
                }}>
                  <span style={{ fontSize: '1.25rem' }}>🦵</span>
                  <div>
                    <div style={{ color: '#a78bfa', fontWeight: 900, fontSize: '1rem' }}>
                      {teepCount} טיפ נרשמו
                    </div>
                    <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.68rem', marginTop: 2 }}>
                      נשמר בסיכום היומי
                    </div>
                  </div>
                </div>
              )}

              {/* Activity log */}
              {logs.length > 0 && (
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.85rem' }}>
                  <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>◈ SESSION LOG</div>
                  {logs.map((log, i) => (
                    <div key={i} style={{ color: 'rgba(52,211,153,0.7)', fontSize: '0.72rem', fontFamily: "'SF Mono','Fira Code',monospace", padding: '0.18rem 0' }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ height: 80 }} />
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          flexShrink: 0, padding: '0.75rem 1.25rem',
          paddingBottom: 'max(0.85rem, calc(0.75rem + env(safe-area-inset-bottom)))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#111111',
        }}>
          {phase === 'select' && (
            <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.18)', fontSize: '0.7rem' }}>
              50 XP לכל סיבוב · מצלמה AI אופציונלית
            </div>
          )}
          {phase === 'active' && protocol?.type === 'rounds' && (
            <button
              onClick={() => { stopCamera(); setPhase('select') }}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.85rem', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(232,232,232,0.6)', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' }}
            >
              ✕ עצור ויצא
            </button>
          )}
          {phase === 'active' && protocol?.type === 'combos' && (
            <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.22)', fontSize: '0.72rem' }}>
              סמן כל קומבינציה לאחר השלמת {/* number */} החזרות
            </div>
          )}
          {phase === 'done' && (
            <button
              onClick={handleFinish}
              className="btn-primary btn-tactile"
              style={{ width: '100%', padding: '1rem', borderRadius: 16, fontSize: '1rem', fontWeight: 900 }}
            >
              קבל {xpEarned} XP ←
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
