function calcAngle(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y
  const v2x = c.x - b.x, v2y = c.y - b.y
  const dot = v1x * v2x + v1y * v2y
  const mag = Math.sqrt(v1x ** 2 + v1y ** 2) * Math.sqrt(v2x ** 2 + v2y ** 2)
  if (mag === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI
}

// pts: [shoulder, elbow, wrist] or [hip, knee, ankle]
// invertLogic: pull-ups go from straight → bent
const CONFIGS = {
  pushups: { pts: [12, 14, 16], upAngle: 155, downAngle: 90,  invertLogic: false },
  pullups: { pts: [12, 14, 16], upAngle: 70,  downAngle: 155, invertLogic: true  },
  dips:    { pts: [12, 14, 16], upAngle: 155, downAngle: 90,  invertLogic: false },
  squats:  { pts: [24, 26, 28], upAngle: 155, downAngle: 100, invertLogic: false },
  boxing:  { pts: null },
}

export function createTracker(exercise) {
  const config = CONFIGS[exercise] || CONFIGS.boxing
  let repState = 'up'
  let reps = 0
  let goodFrames = 0
  let totalFrames = 0

  // Boxing punch tracking
  let prevWrist = null
  let prevTs = null
  let lastPunchAt = 0

  function update(landmarks) {
    if (!landmarks?.length) return getStats()
    const lm = landmarks[0]
    totalFrames++

    if (exercise === 'boxing') {
      const wrist = lm[16] // right wrist
      if (wrist && (wrist.visibility ?? 1) > 0.4) {
        goodFrames++
        const now = performance.now()
        if (prevWrist && prevTs) {
          const dt = (now - prevTs) / 1000
          if (dt > 0) {
            const vel = Math.hypot(wrist.x - prevWrist.x, wrist.y - prevWrist.y) / dt
            if (vel > 1.6 && now - lastPunchAt > 280) {
              reps++
              lastPunchAt = now
            }
          }
        }
        prevWrist = { x: wrist.x, y: wrist.y }
        prevTs = now
      }
      return getStats()
    }

    if (!config?.pts) return getStats()
    const [ai, bi, ci] = config.pts
    const a = lm[ai], b = lm[bi], c = lm[ci]
    if (!a || !b || !c) return getStats()

    const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1)
    if (vis > 0.5) goodFrames++
    if (vis < 0.3) return getStats()

    const ang = calcAngle(a, b, c)

    if (config.invertLogic) {
      if (ang < config.upAngle && repState === 'down') { reps++; repState = 'up' }
      else if (ang > config.downAngle && repState === 'up') { repState = 'down' }
    } else {
      if (ang > config.upAngle && repState === 'down') { reps++; repState = 'up' }
      else if (ang < config.downAngle && repState === 'up') { repState = 'down' }
    }

    return getStats()
  }

  function getStats() {
    return {
      reps,
      formScore: totalFrames > 0 ? Math.round((goodFrames / totalFrames) * 100) : 0,
    }
  }

  return { update, getStats }
}
