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

    _landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    })
    return _landmarker
  })()

  return _loadPromise
}

function angleDeg(A, B, C) {
  const ab = { x: A.x - B.x, y: A.y - B.y }
  const cb = { x: C.x - B.x, y: C.y - B.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2)
  if (mag === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI)
}

// ── Pushups: elbow angle ──────────────────────────────────────────────
// Landmarks: 12=R-shoulder 14=R-elbow 16=R-wrist | 11=L-shoulder 13=L-elbow 15=L-wrist
export function analyzePushup(lm, prevState) {
  const visible = v => v && (v.visibility ?? 1) > 0.4
  let s, e, w
  if (visible(lm[12]) && visible(lm[14]) && visible(lm[16])) {
    ;[s, e, w] = [lm[12], lm[14], lm[16]]
  } else if (visible(lm[11]) && visible(lm[13]) && visible(lm[15])) {
    ;[s, e, w] = [lm[11], lm[13], lm[15]]
  } else {
    return { angle: null, state: prevState, repCompleted: false }
  }

  const angle       = Math.round(angleDeg(s, e, w))
  let newState      = prevState
  let repCompleted  = false

  if (prevState === 'up'   && angle < 80)  newState = 'down'
  if (prevState === 'down' && angle > 145) { newState = 'up'; repCompleted = true }

  return { angle, state: newState, repCompleted }
}

// ── Squats: knee angle ────────────────────────────────────────────────
// Landmarks: 24=R-hip 26=R-knee 28=R-ankle | 23=L-hip 25=L-knee 27=L-ankle
export function analyzeSquat(lm, prevState) {
  const visible = v => v && (v.visibility ?? 1) > 0.4
  let h, k, a
  if (visible(lm[24]) && visible(lm[26]) && visible(lm[28])) {
    ;[h, k, a] = [lm[24], lm[26], lm[28]]
  } else if (visible(lm[23]) && visible(lm[25]) && visible(lm[27])) {
    ;[h, k, a] = [lm[23], lm[25], lm[27]]
  } else {
    return { angle: null, state: prevState, repCompleted: false }
  }

  const angle      = Math.round(angleDeg(h, k, a))
  let newState     = prevState
  let repCompleted = false

  if (prevState === 'up'   && angle < 100) newState = 'down'
  if (prevState === 'down' && angle > 160) { newState = 'up'; repCompleted = true }

  return { angle, state: newState, repCompleted }
}

export function analyzeFrame(poseType, landmarks, prevState) {
  if (poseType === 'pushups') return analyzePushup(landmarks, prevState)
  if (poseType === 'squats')  return analyzeSquat(landmarks, prevState)
  return { angle: null, state: prevState, repCompleted: false }
}
