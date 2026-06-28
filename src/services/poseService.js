import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// Upper + lower body connections (landmark index pairs)
const CONNECTIONS = [
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [11, 12], [11, 23], [12, 24], [23, 24], // torso
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
  [27, 29], [28, 30],                     // lower legs
]

let detector = null
let initPromise = null

export async function initPose() {
  if (detector) return
  if (initPromise) return initPromise
  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    const opts = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }
    try {
      detector = await PoseLandmarker.createFromOptions(vision, opts)
    } catch {
      opts.baseOptions.delegate = 'CPU'
      detector = await PoseLandmarker.createFromOptions(vision, opts)
    }
  })()
  return initPromise
}

export function detectPose(video) {
  if (!detector || video.readyState < 2) return null
  try {
    return detector.detectForVideo(video, performance.now())
  } catch {
    return null
  }
}

export function drawSkeleton(canvas, landmarks) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  if (!landmarks?.length) return
  const lm = landmarks[0]

  // Draw bones
  ctx.lineWidth = 2.5
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  for (const [a, b] of CONNECTIONS) {
    const p1 = lm[a], p2 = lm[b]
    if (!p1 || !p2) continue
    if ((p1.visibility ?? 1) < 0.3 || (p2.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(p1.x * W, p1.y * H)
    ctx.lineTo(p2.x * W, p2.y * H)
    ctx.stroke()
  }

  // Draw joints
  const drawn = new Set()
  for (const [a, b] of CONNECTIONS) {
    for (const idx of [a, b]) {
      if (drawn.has(idx)) continue
      drawn.add(idx)
      const p = lm[idx]
      if (!p || (p.visibility ?? 1) < 0.3) continue
      ctx.shadowBlur = 8
      ctx.shadowColor = '#6366f1'
      ctx.fillStyle = '#8b5cf6'
      ctx.beginPath()
      ctx.arc(p.x * W, p.y * H, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0
}
