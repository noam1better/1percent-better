import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let _landmarker = null
let _loadPromise = null

export async function loadPoseLandmarker() {
  if (_landmarker) return _landmarker
  if (_loadPromise) return _loadPromise

  _loadPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    )
    const opts = (delegate) => ({
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    })
    try {
      _landmarker = await PoseLandmarker.createFromOptions(vision, opts('GPU'))
    } catch {
      _landmarker = await PoseLandmarker.createFromOptions(vision, opts('CPU'))
    }
    return _landmarker
  })().catch(err => {
    _loadPromise = null
    _landmarker  = null
    throw err
  })

  return _loadPromise
}

function v(lm) { return lm?.visibility ?? 0 }

// 2D angle for pushups (side view, z irrelevant)
function angleDeg2D(A, B, C) {
  const ab = { x: A.x - B.x, y: A.y - B.y }
  const cb = { x: C.x - B.x, y: C.y - B.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2)
  if (mag === 0) return 180
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI)
}

// ── Skeleton connections ──────────────────────────────────────────────
const PUSHUP_SEGS = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24]]
const SQUAT_SEGS  = [[23,25],[25,27],[24,26],[26,28],[23,24],[11,23],[12,24],[11,12]]
const PULLUP_SEGS = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24]]
const DIPS_SEGS   = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24]]
const BOXING_SEGS = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[0,11],[0,12]]

export function drawSkeleton(ctx, lm, poseType, w, h, confidence = 1) {
  const segs = poseType === 'squats'  ? SQUAT_SEGS
             : poseType === 'pullups' ? PULLUP_SEGS
             : poseType === 'dips'    ? DIPS_SEGS
             : poseType === 'boxing'  ? BOXING_SEGS
             : PUSHUP_SEGS
  const good = confidence >= 0.7
  const lineColor = good ? 'rgba(245,197,24,0.6)' : 'rgba(239,68,68,0.75)'
  const dotColor  = good ? '#F5C518'               : '#ef4444'

  ctx.lineWidth = 2.5
  ctx.strokeStyle = lineColor
  for (const [a, b] of segs) {
    const A = lm[a], B = lm[b]
    if ((A?.visibility ?? 0) < 0.3 || (B?.visibility ?? 0) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(A.x * w, A.y * h)
    ctx.lineTo(B.x * w, B.y * h)
    ctx.stroke()
  }

  ctx.fillStyle = dotColor
  for (const pt of lm) {
    if ((pt?.visibility ?? 0) < 0.3) continue
    ctx.beginPath()
    ctx.arc(pt.x * w, pt.y * h, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Pushups: elbow angle, 2D side-view ────────────────────────────────
export function analyzePushup(lm, prevState) {
  let s, e, w2
  const rConf = v(lm[12]) + v(lm[14]) + v(lm[16])
  const lConf = v(lm[11]) + v(lm[13]) + v(lm[15])
  if (rConf >= lConf && v(lm[12]) > 0.4 && v(lm[14]) > 0.4 && v(lm[16]) > 0.4) {
    ;[s, e, w2] = [lm[12], lm[14], lm[16]]
  } else if (v(lm[11]) > 0.4 && v(lm[13]) > 0.4 && v(lm[15]) > 0.4) {
    ;[s, e, w2] = [lm[11], lm[13], lm[15]]
  } else {
    return { angle: null, depth: 0, state: prevState, confidence: 0, kneeCaveIn: false, repCompleted: false }
  }

  const angle      = Math.round(angleDeg2D(s, e, w2))
  let newState     = prevState
  let repCompleted = false
  if (prevState === 'up'   && angle < 80)  newState = 'down'
  if (prevState === 'down' && angle > 145) { newState = 'up'; repCompleted = true }

  const conf = (v(s) + v(e) + v(w2)) / 3
  return { angle, depth: 0, state: newState, confidence: conf, kneeCaveIn: false, repCompleted }
}

// ── Squats: hip-Y displacement method ────────────────────────────────
//
// "depth" = how far the hip has dropped relative to the knee.
//   0.0 = standing (hip well above knee)
//   1.0 = hip at knee height (parallel squat)
//
// rep completion is handled in the component (100ms hold timer).
// this function never sets repCompleted — always false.

export function analyzeSquat(lm, prevState) {
  // Pick better-visibility side
  const rConf = v(lm[24]) + v(lm[26]) + v(lm[28])
  const lConf = v(lm[23]) + v(lm[25]) + v(lm[27])

  let hip, knee, ankle
  if (rConf >= lConf && v(lm[24]) > 0.3 && v(lm[26]) > 0.3) {
    ;[hip, knee, ankle] = [lm[24], lm[26], lm[28]]
  } else if (v(lm[23]) > 0.3 && v(lm[25]) > 0.3) {
    ;[hip, knee, ankle] = [lm[23], lm[25], lm[27]]
  } else {
    return { angle: null, depth: 0, state: prevState, confidence: 0, kneeCaveIn: false, repCompleted: false }
  }

  const conf = (v(hip) + v(knee) + (ankle ? v(ankle) : 0)) / 3

  // gap = knee.y - hip.y  (positive = hip above knee, normal standing)
  // standing gap ≈ 0.22–0.28; parallel squat gap ≈ 0.0–0.05
  const gap = knee.y - hip.y
  // clamp depth to [0, 1]
  const STANDING_GAP = 0.24   // expected gap when upright (tunable)
  const depth = Math.max(0, Math.min(1, 1 - gap / STANDING_GAP))

  let newState = prevState
  // DOWN: hip has dropped to 70% of the way to parallel (depth ≥ 0.70)
  if (prevState === 'up'   && depth >= 0.70) newState = 'down'
  // UP: hip has returned to within 25% of standing (depth ≤ 0.25)
  if (prevState === 'down' && depth <= 0.25) newState = 'up'

  // Knee cave-in: both knees visible & narrower than ankles by > 25%
  let kneeCaveIn = false
  const rk = lm[26], lk = lm[25], ra = lm[28], la = lm[27]
  if (v(rk) > 0.5 && v(lk) > 0.5 && v(ra) > 0.5 && v(la) > 0.5) {
    const kneeW  = Math.abs(rk.x - lk.x)
    const ankleW = Math.abs(ra.x - la.x)
    kneeCaveIn = ankleW > 0.05 && kneeW < ankleW * 0.72
  }

  // angle for display: map depth → visual "angle" so badge still makes sense
  const displayAngle = Math.round(180 - depth * 90)   // 180° standing → 90° full squat

  return { angle: displayAngle, depth, state: newState, confidence: conf, kneeCaveIn, repCompleted: false }
}

// ── Pull-ups: elbow angle, front-facing camera ────────────────────────
// Dead hang = angle ~165° (UP state), chin over bar = angle ~50° (DOWN state)
// Lower visibility threshold (0.35) — wrists often partially out of frame
export function analyzePullup(lm, prevState) {
  const rConf = v(lm[12]) + v(lm[14]) + v(lm[16])
  const lConf = v(lm[11]) + v(lm[13]) + v(lm[15])
  let s, e, w2
  if (rConf >= lConf && v(lm[12]) > 0.35 && v(lm[14]) > 0.35 && v(lm[16]) > 0.35) {
    ;[s, e, w2] = [lm[12], lm[14], lm[16]]
  } else if (v(lm[11]) > 0.35 && v(lm[13]) > 0.35 && v(lm[15]) > 0.35) {
    ;[s, e, w2] = [lm[11], lm[13], lm[15]]
  } else {
    return { angle: null, depth: 0, state: prevState, confidence: 0, kneeCaveIn: false, repCompleted: false }
  }

  const angle      = Math.round(angleDeg2D(s, e, w2))
  let newState     = prevState
  let repCompleted = false
  if (prevState === 'up'   && angle < 65)  newState = 'down'              // pulled up
  if (prevState === 'down' && angle > 150) { newState = 'up'; repCompleted = true } // returned to hang

  const conf  = (v(s) + v(e) + v(w2)) / 3
  const depth = Math.max(0, Math.min(1, (165 - angle) / 100))
  return { angle, depth, state: newState, confidence: conf, kneeCaveIn: false, repCompleted }
}

// ── Dips: elbow angle, side/front view ───────────────────────────────
// Arms extended at top = angle ~160° (UP), deep dip = angle ~80° (DOWN)
export function analyzeDip(lm, prevState) {
  const rConf = v(lm[12]) + v(lm[14]) + v(lm[16])
  const lConf = v(lm[11]) + v(lm[13]) + v(lm[15])
  let s, e, w2
  if (rConf >= lConf && v(lm[12]) > 0.35 && v(lm[14]) > 0.35 && v(lm[16]) > 0.35) {
    ;[s, e, w2] = [lm[12], lm[14], lm[16]]
  } else if (v(lm[11]) > 0.35 && v(lm[13]) > 0.35 && v(lm[15]) > 0.35) {
    ;[s, e, w2] = [lm[11], lm[13], lm[15]]
  } else {
    return { angle: null, depth: 0, state: prevState, confidence: 0, kneeCaveIn: false, repCompleted: false }
  }

  const angle      = Math.round(angleDeg2D(s, e, w2))
  let newState     = prevState
  let repCompleted = false
  if (prevState === 'up'   && angle < 85)  newState = 'down'              // dipped down
  if (prevState === 'down' && angle > 145) { newState = 'up'; repCompleted = true } // locked out

  const conf  = (v(s) + v(e) + v(w2)) / 3
  const depth = Math.max(0, Math.min(1, (155 - angle) / 70))
  return { angle, depth, state: newState, confidence: conf, kneeCaveIn: false, repCompleted }
}

export function analyzeFrame(poseType, landmarks, prevState) {
  if (poseType === 'pushups') return analyzePushup(landmarks, prevState)
  if (poseType === 'squats')  return analyzeSquat(landmarks, prevState)
  if (poseType === 'pullups') return analyzePullup(landmarks, prevState)
  if (poseType === 'dips')    return analyzeDip(landmarks, prevState)
  return { angle: null, depth: 0, state: prevState, confidence: 0, kneeCaveIn: false, repCompleted: false }
}

// ── Boxing AI Technical Coach ─────────────────────────────────────────
//
// Detects 4 error types in real time:
//   armPunch   — wrist extension without shoulder/hip rotation
//   dropHand   — guard hand falls below chin during opposite punch
//   elbowFlare — elbow wing > 55% of shoulder width
//   guardSlip  — both wrists below chin while not punching
//
// State (opaque object caller must pass back each frame):
//   { lastPunchTs: number, consecutiveGuardDropFrames: number }
//
// Returns:
//   { errors, punchDetected, punchType, punchHand, confidence, nextState }
export function analyzeBoxingTechnique(lm, prevLm, state = {}) {
  const vis = pt => pt?.visibility ?? 0

  const nose   = lm[0]
  const lShldr = lm[11], rShldr = lm[12]
  const lElbow = lm[13], rElbow = lm[14]
  const lWrist = lm[15], rWrist = lm[16]
  const lHip   = lm[23], rHip   = lm[24]

  const conf = (vis(nose) + vis(lShldr) + vis(rShldr) + vis(lWrist) + vis(rWrist)) / 5
  if (conf < 0.30) {
    return { errors: [], punchDetected: false, punchType: null, punchHand: null, confidence: conf, nextState: state }
  }

  const errors = []
  let punchDetected = false
  let punchType     = null
  let punchHand     = null

  const now = performance.now()

  // ── Chin guard line ───────────────────────────────────────────────
  const chinY          = nose.y + 0.07
  const guardDropLine  = chinY + 0.12   // >12% below chin = dropped guard

  // ── Punch detection via wrist velocity ───────────────────────────
  // Threshold: 0.0049 = 0.07² (7% frame per frame ≈ fast punch)
  const PUNCH_THRESHOLD   = 0.0049
  const PUNCH_COOLDOWN_MS = 220  // min time between counted punches per hand

  let leftSpeed = 0, rightSpeed = 0
  if (prevLm) {
    const pl = prevLm[15], pr = prevLm[16]
    if (vis(lWrist) > 0.35 && vis(pl) > 0.35) {
      const dx = lWrist.x - pl.x, dy = lWrist.y - pl.y
      leftSpeed = dx * dx + dy * dy
    }
    if (vis(rWrist) > 0.35 && vis(pr) > 0.35) {
      const dx = rWrist.x - pr.x, dy = rWrist.y - pr.y
      rightSpeed = dx * dx + dy * dy
    }
  }

  const maxSpeed = Math.max(leftSpeed, rightSpeed)

  if (maxSpeed > PUNCH_THRESHOLD) {
    const lastPunchTs = state.lastPunchTs || 0
    if (now - lastPunchTs >= PUNCH_COOLDOWN_MS) {
      punchDetected = true
      punchHand     = leftSpeed >= rightSpeed ? 'left' : 'right'

      // Classify punch type by velocity direction
      const wrist  = punchHand === 'left' ? lWrist : rWrist
      const pWrist = punchHand === 'left' ? prevLm?.[15] : prevLm?.[16]
      if (pWrist && vis(wrist) > 0.35) {
        const dy = wrist.y - pWrist.y
        const dx = Math.abs(wrist.x - pWrist.x)
        if      (dy < -0.04)             punchType = 'uppercut'
        else if (dx > 0.06)              punchType = 'hook'
        else if (punchHand === 'left')   punchType = 'jab'
        else                             punchType = 'cross'
      } else {
        punchType = punchHand === 'left' ? 'jab' : 'cross'
      }

      // ── Arm punch check: shoulder/hip displacement ratio ──────────
      // During jab/cross the punching shoulder should rotate forward.
      // Front-cam proxy: wristDx should track shoulderDx + hipDx.
      // High ratio = wrist moved a lot but body stayed still → arm punch.
      if (prevLm && (punchType === 'jab' || punchType === 'cross')) {
        const shldr  = punchHand === 'left' ? lShldr : rShldr
        const pShldr = punchHand === 'left' ? prevLm[11] : prevLm[12]
        const hip    = punchHand === 'left' ? lHip : rHip
        const pHip   = punchHand === 'left' ? prevLm[23] : prevLm[24]

        if (vis(shldr) > 0.35 && vis(pShldr) > 0.35) {
          const wristDx  = Math.sqrt(maxSpeed)
          const shldrDx  = Math.abs(shldr.x - pShldr.x)
          const hipDx    = (vis(hip) > 0.3 && pHip) ? Math.abs(hip.x - pHip.x) : 0
          const bodyMove = Math.max(shldrDx, hipDx, 0.004)
          if (wristDx / bodyMove > 4.5) errors.push('armPunch')
        }
      }

      // ── Drop guard check: non-punching hand falls during punch ────
      if (punchHand && vis(lWrist) > 0.35 && vis(rWrist) > 0.35) {
        const guardWrist = punchHand === 'left' ? rWrist : lWrist
        if (guardWrist.y > guardDropLine) errors.push('dropHand')
      }
    }
  }

  // ── Elbow flare (always checked) ─────────────────────────────────
  const shoulderW = Math.max(0.08, Math.abs(lShldr.x - rShldr.x))
  const lFlare    = vis(lElbow) > 0.35 && Math.abs(lElbow.x - lShldr.x) > shoulderW * 0.55
  const rFlare    = vis(rElbow) > 0.35 && Math.abs(rElbow.x - rShldr.x) > shoulderW * 0.55
  if (lFlare || rFlare) errors.push('elbowFlare')

  // ── Guard slip at rest: both wrists below chin > 2 frames ────────
  let consecutiveGuardDropFrames = state.consecutiveGuardDropFrames || 0
  if (!punchDetected) {
    const lDrop = vis(lWrist) > 0.35 && lWrist.y > guardDropLine
    const rDrop = vis(rWrist) > 0.35 && rWrist.y > guardDropLine
    if (lDrop && rDrop) {
      consecutiveGuardDropFrames++
      if (consecutiveGuardDropFrames >= 3) errors.push('guardSlip')
    } else {
      consecutiveGuardDropFrames = 0
    }
  } else {
    consecutiveGuardDropFrames = 0
  }

  return {
    errors,
    punchDetected,
    punchType,
    punchHand,
    confidence: conf,
    nextState: {
      lastPunchTs:                punchDetected ? now : (state.lastPunchTs || 0),
      consecutiveGuardDropFrames,
    },
  }
}

// ── Boxing form (front-facing camera) ────────────────────────────────
// Detects guard height, elbow tuck, and punch velocity.
// lm: 33 landmarks from PoseLandmarker; prevLm: previous frame (for punch velocity)
// Returns { violations: string[], punchLeft: bool, punchRight: bool, confidence: number }
export function analyzeBoxingForm(lm, prevLm) {
  function vis(pt) { return pt?.visibility ?? 0 }

  const nose      = lm[0]
  const lShoulder = lm[11], rShoulder = lm[12]
  const lElbow    = lm[13], rElbow    = lm[14]
  const lWrist    = lm[15], rWrist    = lm[16]

  const conf = (vis(nose) + vis(lShoulder) + vis(rShoulder) + vis(lWrist) + vis(rWrist)) / 5
  if (conf < 0.35) return { violations: [], punchLeft: false, punchRight: false, confidence: conf }

  const violations = []

  // Guard height: chin ≈ nose.y + 0.07; guard dropped if wrist > chin + 0.10
  const chinY     = nose.y + 0.07
  const dropLine  = chinY + 0.10
  const lDrop = vis(lWrist) > 0.45 && lWrist.y > dropLine
  const rDrop = vis(rWrist) > 0.45 && rWrist.y > dropLine
  if      (lDrop && rDrop) violations.push('guardBoth')
  else if (lDrop)          violations.push('guardLeft')
  else if (rDrop)          violations.push('guardRight')

  // Elbow tuck: elbow should stay within 50% of shoulder-width of its own shoulder
  const shoulderW = Math.max(0.1, Math.abs(lShoulder.x - rShoulder.x))
  const lFlare = vis(lElbow) > 0.4 && Math.abs(lElbow.x - lShoulder.x) > shoulderW * 0.5
  const rFlare = vis(rElbow) > 0.4 && Math.abs(rElbow.x - rShoulder.x) > shoulderW * 0.5
  if (lFlare || rFlare) violations.push('elbowFlare')

  // Punch velocity: speed of wrist between frames (>9% of frame per 100ms = fast punch)
  let punchLeft = false, punchRight = false
  if (prevLm) {
    const pl = prevLm[15], pr = prevLm[16]
    if (vis(lWrist) > 0.4 && vis(pl) > 0.4) {
      const dx = lWrist.x - pl.x, dy = lWrist.y - pl.y
      punchLeft = (dx * dx + dy * dy) > 0.0081  // 0.09²
    }
    if (vis(rWrist) > 0.4 && vis(pr) > 0.4) {
      const dx = rWrist.x - pr.x, dy = rWrist.y - pr.y
      punchRight = (dx * dx + dy * dy) > 0.0081
    }
  }

  return { violations, punchLeft, punchRight, confidence: conf }
}
