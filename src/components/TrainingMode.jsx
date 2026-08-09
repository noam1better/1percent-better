import { useState, useEffect, useRef } from 'react'
import MirrorView from './MirrorView'
import { loadPoseLandmarker, analyzeBoxingForm, drawSkeleton } from '../services/poseService'

const DIFFICULTIES = {
  light:  { label: 'קל',     sublabel: 'תרגול טכניקה', emoji: '🌊', color: '#10b981', xpMult: 1,   coachInterval: 6 },
  medium: { label: 'בינוני', sublabel: 'ספארינג',      emoji: '⚡', color: '#f59e0b', xpMult: 1.5, coachInterval: 4 },
  hard:   { label: 'קשה',    sublabel: 'פרו',           emoji: '🔥', color: '#ef4444', xpMult: 2,   coachInterval: 2.5 },
}

const DISC_CONFIG = {
  boxing:    { label: 'בוקסינג', emoji: '🥊', color: '#60a5fa', sublabel: 'אגרופים ותנועת ראש' },
  'muay-thai': { label: 'מוי תאי', emoji: '🦵', color: '#a78bfa', sublabel: 'אגרופים, בעיטות, ברכיים, מרפקים' },
}

const COMBOS = {
  boxing: {
    light: [
      'ג׳אב, קרוס',
      'ג׳אב, הוק',
      'קרוס, הוק',
      'ג׳אב, ג׳אב, קרוס',
      'הוק, קרוס',
      'ג׳אב, אפרקאט',
      'קרוס, ג׳אב, הוק',
    ],
    medium: [
      'ג׳אב, קרוס, הוק',
      'קרוס, הוק, אפרקאט',
      'ג׳אב, קרוס, הוק, אפרקאט',
      'ג׳אב, ג׳אב, קרוס, הוק',
      'ג׳אב, קרוס, גוף, ראש',
      'ג׳אב, החלקה, קרוס',
      'קרוס, הוק, ג׳אב, הוק',
    ],
    hard: [
      'ג׳אב, קרוס, הוק, החלקה, אפרקאט',
      'ג׳אב, קרוס, החלקה, ג׳אב, קרוס',
      'ג׳אב, קרוס, הוק, אפרקאט, הוק',
      'ג׳אב כפול, קרוס, הוק, אפרקאט',
      'ג׳אב, ג׳אב, קרוס, הוק, החלקה, קרוס',
      'קרוס, הוק, החלקה, ג׳אב, קרוס, הוק',
      'ג׳אב, קרוס, גוף, ראש, הוק, אפרקאט',
    ],
  },
  'muay-thai': {
    light: [
      'ג׳אב, קרוס',
      'ג׳אב, בעיטה נמוכה',
      'קרוס, בעיטה עגולה',
      'ג׳אב, קרוס, בעיטה נמוכה',
      'בעיטה נמוכה, ג׳אב',
      'ג׳אב, ברך',
      'קרוס, הוק, בעיטה נמוכה',
    ],
    medium: [
      'ג׳אב, קרוס, הוק, בעיטה נמוכה',
      'ג׳אב, הוק, קרוס, בעיטה עגולה',
      'בעיטה נמוכה, ג׳אב, קרוס, הוק',
      'ג׳אב, קרוס, ברך, מרפק',
      'קרוס, הוק, בעיטה גבוהה',
      'ג׳אב, ג׳אב, קרוס, בעיטה נמוכה',
      'בעיטה עגולה, ג׳אב, קרוס',
    ],
    hard: [
      'ג׳אב, קרוס, הוק, אפרקאט, בעיטה עגולה',
      'ג׳אב כפול, קרוס, הוק, בעיטה נמוכה, ברך',
      'ג׳אב, קרוס, הוק, בעיטה גבוהה',
      'בעיטה עגולה, ג׳אב, קרוס, הוק, אפרקאט',
      'ג׳אב, קרוס, גוף, ברך, מרפק',
      'ג׳אב, ג׳אב, קרוס, בעיטה עגולה, ברך',
      'בעיטה נמוכה, ג׳אב, קרוס, הוק, בעיטה גבוהה',
    ],
  },
}

const MOTIVATIONAL = {
  light: [
    'יפה! שמור על המשמר',
    'הרפה את הכתפיים',
    'נשום בקצב, אל תעצור',
    'עיניים קדימה תמיד',
    'תנועה רציפה, אל תקפא',
  ],
  medium: [
    'מהיר יותר! הדק את הקומבו',
    'אל תוריד ידיים!',
    'לחץ קדימה, אל תחכה',
    'ממוקד! קומבו נקי',
    'שמור על הקצב, אל תישבר',
    'תוקף! הוא לא נח',
  ],
  hard: [
    'מהיר יותר! פיצוץ!',
    'תן הכל עכשיו!',
    'ללא הפסקה! עוד!',
    'לא נחים! לחץ!',
    'ראש למטה, לחץ קדימה!',
    'פיצוץ! אל תברח!',
  ],
}

const OPENERS = {
  boxing: {
    light:  'מוכן? ג׳אב, קרוס — בוקסינג קלאסי, התחל!',
    medium: 'בואו נעבוד! ג׳אב, קרוס, הוק — קדימה!',
    hard:   'הכל עכשיו! ג׳אב, קרוס, הוק, אפרקאט — פיצוץ!',
  },
  'muay-thai': {
    light:  'מוכן? ג׳אב, קרוס, בעיטה — מוי תאי, התחל!',
    medium: 'ארסנל מלא! ג׳אב, קרוס, בעיטה עגולה — קדימה!',
    hard:   'הכל עכשיו! ג׳אב, קרוס, הוק, ברך — פיצוץ!',
  },
}

const STAT_KEYS   = ['strikes', 'power', 'timing', 'stance', 'cardio']
const STAT_LABELS = ['מכות', 'עוצמה', 'תזמון', 'יציבה', 'סיבולת']

const BASE = {
  light:  { strikes: 18, power: 22, timing: 28, stance: 32, cardio: 24 },
  medium: { strikes: 32, power: 38, timing: 42, stance: 44, cardio: 36 },
  hard:   { strikes: 52, power: 56, timing: 60, stance: 64, cardio: 54 },
}

const STAT_RATES = {
  light:  { strikes: [1, 2], power: [0, 2], timing: [0, 1], stance: [0, 1], cardio: [0, 1] },
  medium: { strikes: [1, 3], power: [1, 2], timing: [0, 2], stance: [0, 1], cardio: [0, 2] },
  hard:   { strikes: [2, 4], power: [1, 3], timing: [0, 2], stance: [0, 1], cardio: [-1, 2] },
}

const IMPROVEMENT_TIPS = {
  timing: {
    boxing:      'הדק תזמון — פגע מיד אחרי ג׳אב, אל תחכה',
    'muay-thai': 'שפר תזמון — בעיטה עגולה מיד אחרי ג׳אב, קרוס, בלי הפסקה',
  },
  stance: {
    boxing:      'שמור יציבה — ברכיים כפופות קלות, משקל מאוזן בין הרגליים',
    'muay-thai': 'בסיס יציב — רגליים ברוחב כתפיים, על כדורי הרגל תמיד',
  },
  power: {
    boxing:      'סובב ירכיים בכל מכה — הכוח מגיע מהרצפה, לא מהזרוע',
    'muay-thai': 'העצם בעיטות — יישר מהירך, פגע עם הסיבוב המלא',
  },
  cardio: {
    boxing:      'נשום בקצב — נשיפה קצרה עם כל אגרוף, שאיפה בין קומבו',
    'muay-thai': 'נהל אנרגיה — קצב בינוני בקומבו, הפסקה קצרה בין סדרות',
  },
  strikes: {
    boxing:      'הגבר נפח — שלב שניים-שלושה קומבו בכל פרץ התקפי',
    'muay-thai': 'שלב יותר — ג׳אב, קרוס חייבים לפתוח כל קומבו לפני בעיטה',
  },
}

const STAT_LABEL_MAP = { strikes: 'מכות', power: 'עוצמה', timing: 'תזמון', stance: 'יציבה', cardio: 'סיבולת' }

const BOXING_FORM_ALERTS = {
  guardBoth:  'ידיים למעלה! שמור על הסנטר!',
  guardLeft:  'יד שמאל ירדה — שמור על המשמר!',
  guardRight: 'יד ימין ירדה — שמור על המשמר!',
  elbowFlare: 'כפוף את המרפקים, הגן על הגוף!',
}
const POSE_COOLDOWN_MS  = 4500  // min ms between same alert type
const POSE_INTERVAL_MS  = 100   // ~10 fps analysis rate

function buildSummary(stats, disc) {
  const accuracy = Math.round(stats.timing * 0.4 + stats.stance * 0.35 + stats.power * 0.25)
  const accuracyLabel =
    accuracy >= 85 ? 'מצוין' : accuracy >= 70 ? 'טוב מאוד' : accuracy >= 55 ? 'טוב' : accuracy >= 40 ? 'בינוני' : 'דורש שיפור'

  const cardio = stats.cardio
  const intensityLabel = cardio >= 70 ? 'גבוהה' : cardio >= 45 ? 'בינונית' : 'נמוכה'
  const intensityEmoji = cardio >= 70 ? '🔥' : cardio >= 45 ? '⚡' : '🌊'

  const sorted = STAT_KEYS.map(k => ({ key: k, val: stats[k] })).sort((a, b) => a.val - b.val)
  const weakest  = sorted.slice(0, 2).map(s => s.key)
  const strongest = sorted[sorted.length - 1].key

  const tips = weakest.map(k => IMPROVEMENT_TIPS[k]?.[disc] || IMPROVEMENT_TIPS[k]?.boxing)

  const highlight = `כל הכבוד! ה${STAT_LABEL_MAP[strongest]} שלך הייתה מצוינת היום.`
  const voiceTip  = tips[0] || ''

  return { accuracy, accuracyLabel, intensityLabel, intensityEmoji, tips, highlight, voiceTip }
}

const SPEECH_PARAMS = {
  light:  { rate: 0.94, pitch: 0.88, volume: 0.85 },  // calm but authoritative
  medium: { rate: 1.1,  pitch: 0.88, volume: 0.95 },  // assertive, urgent
  hard:   { rate: 1.28, pitch: 0.92, volume: 1.0  },  // intense, explosive
}

const QUALITY_HINTS = ['premium', 'enhanced', 'natural']
const MALE_HINTS    = ['yoav', 'male', 'man', 'daniel', 'jorge', 'thomas', 'aaron']
function _isQuality(v) { return QUALITY_HINTS.some(h => v.name.toLowerCase().includes(h)) }
function _isMale(v)    { return MALE_HINTS.some(h => v.name.toLowerCase().includes(h)) }

let _cachedVoice = undefined
function getHebrewVoice() {
  if (_cachedVoice !== undefined) return _cachedVoice
  const voices = window.speechSynthesis?.getVoices() || []
  const he = voices.filter(v => v.lang === 'he-IL' || v.lang.startsWith('he'))
  _cachedVoice =
    he.find(v => _isQuality(v) && _isMale(v)) ||
    he.find(v => _isQuality(v))               ||
    he.find(v => _isMale(v))                  ||
    he.find(v => !v.localService)             ||
    he[0]                                     ||
    null
  return _cachedVoice
}
if (typeof window !== 'undefined') {
  window.speechSynthesis?.addEventListener('voiceschanged', () => { _cachedVoice = undefined })
}

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function speakSummary(highlight, tip) {
  try {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const voice = getHebrewVoice()
    ;[highlight, tip].forEach((text, i) => {
      const utt    = new SpeechSynthesisUtterance(text)
      utt.lang     = 'he-IL'
      utt.rate     = i === 0 ? 0.92 : 0.88
      utt.pitch    = 0.88
      utt.volume   = i === 0 ? 1 : 0.9
      if (voice) utt.voice = voice
      window.speechSynthesis.speak(utt)
    })
  } catch {}
}

function speak(text, diff) {
  try {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt   = new SpeechSynthesisUtterance(text)
    utt.lang    = 'he-IL'
    const p     = SPEECH_PARAMS[diff] || SPEECH_PARAMS.medium
    utt.rate    = p.rate
    utt.pitch   = p.pitch
    utt.volume  = p.volume
    const voice = getHebrewVoice()
    if (voice) utt.voice = voice
    window.speechSynthesis.speak(utt)
  } catch {}
}

export default function TrainingMode({ onClose, onAwardXP }) {
  const [phase,      setPhase]      = useState('select')
  const [discipline, setDiscipline] = useState(null)   // 'boxing' | 'muay-thai'
  const [difficulty, setDifficulty] = useState(null)
  const [elapsed,    setElapsed]    = useState(0)
  const [stats,      setStats]      = useState({ strikes: 0, power: 0, timing: 0, stance: 0, cardio: 0 })
  const [coachLog,   setCoachLog]   = useState([])
  const [xpEarned,   setXpEarned]   = useState(0)
  const [showMirror, setShowMirror] = useState(false)
  const [summary,    setSummary]    = useState(null)

  const [countdown, setCountdown] = useState(null)  // 3 | 2 | 1 | null

  const timerRef        = useRef(null)
  const statsRafRef     = useRef(null)
  const lastStatsTick   = useRef(0)
  const coachRef        = useRef(null)
  const cueType         = useRef(0)   // 0,1=combo  2=motivation (2:1 ratio)
  const pendingDiff     = useRef(null)
  const poseRafRef      = useRef(null)
  const videoElRef      = useRef(null)
  const canvasElRef     = useRef(null)
  const prevLmRef       = useRef(null)
  const alertedRef      = useRef({})
  const sessionActive   = useRef(false)

  useEffect(() => () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(statsRafRef.current)
    cancelAnimationFrame(poseRafRef.current)
    clearInterval(coachRef.current)
    sessionActive.current = false
    try { window.speechSynthesis?.cancel() } catch {}
  }, [])

  // Countdown clock: 3 → 2 → 1 → fire startSession
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      const diff = pendingDiff.current
      pendingDiff.current = null
      setCountdown(null)
      startSession(diff)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function initiateSession(diff) {
    if (countdown !== null || !discipline) return
    pendingDiff.current = diff
    setCountdown(3)
  }

  function addCue(msg) {
    setCoachLog(prev => [{ msg, id: Date.now() }, ...prev].slice(0, 7))
  }

  function startSession(diff) {
    sessionActive.current = true
    setDifficulty(diff)
    setStats({ ...BASE[diff] })
    setElapsed(0)
    setCoachLog([])
    cueType.current = 0
    setPhase('active')
    startPoseLoop(diff)

    const cfg    = DIFFICULTIES[diff]
    const disc   = discipline   // capture for interval closures
    const opener = OPENERS[disc]?.[diff] || OPENERS.boxing[diff]
    addCue(opener)
    speak(opener, diff)

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    const rates = STAT_RATES[diff]
    lastStatsTick.current = performance.now()
    function tickStats(ts) {
      if (ts - lastStatsTick.current >= 2000) {
        lastStatsTick.current = ts
        setStats(prev => {
          const next = {}
          STAT_KEYS.forEach(k => {
            const [lo, hi] = rates[k]
            next[k] = Math.min(99, Math.max(0, prev[k] + lo + Math.floor(Math.random() * (hi - lo + 1))))
          })
          return next
        })
      }
      statsRafRef.current = requestAnimationFrame(tickStats)
    }
    statsRafRef.current = requestAnimationFrame(tickStats)

    coachRef.current = setInterval(() => {
      cueType.current = (cueType.current + 1) % 3
      const pool = cueType.current === 2 ? MOTIVATIONAL[diff] : COMBOS[disc][diff]
      const cue  = pool[Math.floor(Math.random() * pool.length)]
      addCue(cue)
      speak(cue, diff)
    }, cfg.coachInterval * 1000)
  }

  function handleVideoReady(videoEl, canvasEl) {
    videoElRef.current  = videoEl
    canvasElRef.current = canvasEl
    if (canvasEl && videoEl) {
      canvasEl.width  = videoEl.videoWidth  || 320
      canvasEl.height = videoEl.videoHeight || 240
    }
  }

  async function startPoseLoop(diff) {
    let landmarker
    try { landmarker = await loadPoseLandmarker() } catch { return }

    prevLmRef.current = null
    alertedRef.current = {}
    let lastTick = 0

    function tick(ts) {
      if (!sessionActive.current) return
      poseRafRef.current = requestAnimationFrame(tick)

      if (ts - lastTick < POSE_INTERVAL_MS) return
      lastTick = ts

      const video = videoElRef.current
      if (!video || video.readyState < 2 || video.paused) return

      let results
      try { results = landmarker.detectForVideo(video, performance.now()) } catch { return }

      const lm = results?.landmarks?.[0]
      if (!lm || lm.length < 17) return

      const { violations, punchLeft, punchRight, confidence } = analyzeBoxingForm(lm, prevLmRef.current)
      prevLmRef.current = lm

      // Draw skeleton overlay
      const canvas = canvasElRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawSkeleton(ctx, lm, 'boxing', canvas.width, canvas.height, confidence)
      }

      const now = Date.now()
      for (const v of violations) {
        const last = alertedRef.current[v] || 0
        if (now - last > POSE_COOLDOWN_MS) {
          alertedRef.current[v] = now
          const msg = BOXING_FORM_ALERTS[v]
          if (msg) { addCue(msg); speak(msg, diff) }
        }
      }

      // Punch detected and guard is clean → brief positive reinforcement (max once per 6s)
      if ((punchLeft || punchRight) && violations.length === 0) {
        const last = alertedRef.current['punch+'] || 0
        if (now - last > 6000) {
          alertedRef.current['punch+'] = now
          const msg = diff === 'hard' ? 'פיצוץ! כך ממשיכים!' : 'מכה נקייה!'
          addCue(msg); speak(msg, diff)
        }
      }
    }

    poseRafRef.current = requestAnimationFrame(tick)
  }

  function stopSession() {
    sessionActive.current = false
    clearInterval(timerRef.current)
    cancelAnimationFrame(statsRafRef.current)
    cancelAnimationFrame(poseRafRef.current)
    clearInterval(coachRef.current)
    const canvas = canvasElRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

    const xp  = Math.max(10, Math.round((elapsed / 60) * 25 * DIFFICULTIES[difficulty].xpMult))
    const sum = buildSummary(stats, discipline)
    setXpEarned(xp)
    setSummary(sum)

    speakSummary(sum.highlight, sum.voiceTip)

    try {
      const session = {
        date: new Date().toISOString().slice(0, 10),
        difficulty,
        discipline,
        elapsed,
        xp,
        accuracy: sum.accuracy,
        timestamp: Date.now(),
      }
      const prev = JSON.parse(localStorage.getItem('prime_combat_log') || '[]')
      localStorage.setItem('prime_combat_log', JSON.stringify([session, ...prev].slice(0, 50)))
    } catch {}

    setPhase('done')
  }

  function handleFinish() {
    onAwardXP(xpEarned)
    onClose()
  }

  const cfg = difficulty ? DIFFICULTIES[difficulty] : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5500, background: 'rgba(4,4,10,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: 480, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Countdown overlay ── */}
        {countdown !== null && (() => {
          const col = (pendingDiff.current && DIFFICULTIES[pendingDiff.current]?.color) || '#ef4444'
          return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,4,10,0.92)', borderRadius: 0 }}>
              <div style={{ textAlign: 'center', userSelect: 'none' }}>
                <div key={countdown} style={{ color: col, fontSize: '8rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1, textShadow: `0 0 60px ${col}88`, animation: 'fadeIn 0.15s ease' }}>
                  {countdown}
                </div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.82rem', fontWeight: 700, marginTop: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  מתכונן...
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Header — fixed top ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.25rem 0.6rem', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'rgba(239,68,68,0.55)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ COMBAT TRAINING</div>
            {cfg
              ? <div style={{ color: cfg.color, fontSize: '0.72rem', fontWeight: 700, marginTop: '0.18rem' }}>{cfg.emoji} {cfg.label} · {cfg.sublabel}</div>
              : discipline
                ? <div style={{ color: DISC_CONFIG[discipline].color, fontSize: '0.72rem', fontWeight: 700, marginTop: '0.18rem' }}>{DISC_CONFIG[discipline].emoji} {DISC_CONFIG[discipline].label} — בחר עצימות</div>
                : <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.72rem', marginTop: '0.18rem' }}>בחר סגנון ועצימות</div>
            }
          </div>
          {phase === 'active'
            ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={() => setShowMirror(v => !v)}
                  className="btn-tactile"
                  title="מצלמה חכמה — ניתוח טכניקה בזמן אמת"
                  style={{ background: showMirror ? `${cfg.color}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${showMirror ? cfg.color + '55' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: showMirror ? cfg.color : 'rgba(241,245,249,0.45)', cursor: 'pointer', fontWeight: 800, padding: '0.28rem 0.55rem', minHeight: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}
                >
                  <span style={{ fontSize: '0.88rem', lineHeight: 1 }}>📷</span>
                  <span style={{ fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.04em', opacity: 0.7 }}>מצלמה</span>
                </button>
                <div style={{ color: cfg.color, fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '1.65rem', fontWeight: 900, letterSpacing: '0.04em' }}>{fmtTime(elapsed)}</div>
              </div>
            : <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(241,245,249,0.5)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
          }
        </div>

        {/* ── Discipline selector — always visible ── */}
        <div style={{ display: 'flex', gap: '0.55rem', padding: '0 1.25rem 0.6rem', flexShrink: 0 }}>
          {Object.entries(DISC_CONFIG).map(([key, d]) => {
            const isSelected = discipline === key
            const isDisabled = phase !== 'select'
            return (
              <button
                key={key}
                onClick={() => !isDisabled && setDiscipline(key)}
                disabled={isDisabled}
                className={isDisabled ? '' : 'btn-tactile'}
                style={{
                  flex: 1, padding: '0.7rem 0.5rem', borderRadius: 14,
                  background: isSelected ? `${d.color}16` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isSelected ? d.color + '65' : 'rgba(255,255,255,0.07)'}`,
                  color: isSelected ? d.color : isDisabled ? 'rgba(241,245,249,0.2)' : 'rgba(241,245,249,0.5)',
                  fontSize: '0.8rem', fontWeight: isSelected ? 900 : 600,
                  cursor: isDisabled ? 'default' : 'pointer',
                  transition: 'all 0.25s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Difficulty pills — always visible, disabled when session active/done ── */}
        <div style={{ display: 'flex', gap: '0.55rem', padding: '0 1.25rem 0.75rem', flexShrink: 0 }}>
          {Object.entries(DIFFICULTIES).map(([key, d]) => {
            const isSelected = difficulty === key
            const isDisabled = phase !== 'select' || !discipline
            return (
              <button
                key={key}
                onClick={() => !isDisabled && initiateSession(key)}
                disabled={isDisabled}
                className={isDisabled ? '' : 'btn-tactile'}
                style={{
                  flex: 1, padding: '0.6rem 0.2rem', borderRadius: 14,
                  background: isSelected ? `${d.color}18` : `${d.color}08`,
                  border: `1px solid ${isSelected ? d.color + '60' : d.color + '18'}`,
                  color: isSelected ? d.color : isDisabled ? 'rgba(241,245,249,0.2)' : 'rgba(241,245,249,0.6)',
                  fontSize: '0.7rem', fontWeight: isSelected ? 900 : 600,
                  cursor: isDisabled ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.12rem',
                }}
              >
                <span style={{ fontSize: '1.05rem' }}>{d.emoji}</span>
                <span>{d.label}</span>
                <span style={{ fontSize: '0.5rem', opacity: isSelected ? 0.7 : 0.4 }}>×{d.xpMult} XP</span>
              </button>
            )
          })}
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

        {/* ── Scrollable content area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {/* Select: descriptive info */}
          {phase === 'select' && (
            <div style={{ animation: 'slide-up 0.28s ease' }}>
              <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
                המאמן יתאים את הפידבק הקולי לרמה שתבחר. הקש על אחד הכפתורים למעלה.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(DIFFICULTIES).map(([key, d]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem', borderRadius: 14, background: `${d.color}07`, border: `1px solid ${d.color}15` }}>
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{d.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.82rem' }}>{d.label}</div>
                      <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.68rem', marginTop: '0.08rem' }}>{d.sublabel}</div>
                    </div>
                    <span style={{ color: d.color, fontWeight: 900, fontSize: '0.82rem', flexShrink: 0 }}>×{d.xpMult}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active: scanner + coach log */}
          {phase === 'active' && cfg && (
            <>
              <div style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}1e`, borderRadius: 18, padding: '0.9rem 1.1rem', flexShrink: 0 }}>
                <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.53rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.8rem' }}>◈ PERFORMANCE SCANNER</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {STAT_KEYS.map((key, i) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.64rem', fontWeight: 700, width: 40, flexShrink: 0, textAlign: 'right' }}>{STAT_LABELS[i]}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${stats[key]}%`, background: `linear-gradient(90deg,${cfg.color}70,${cfg.color})`, borderRadius: 99, transition: 'width 1.2s ease' }} />
                      </div>
                      <span style={{ color: cfg.color, fontSize: '0.68rem', fontWeight: 900, width: 24, flexShrink: 0, fontFamily: "'SF Mono','Fira Code',monospace", textAlign: 'left' }}>{stats[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '0.9rem 1.05rem', minHeight: 120 }}>
                <div style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.53rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.7rem' }}>◈ COACH</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {coachLog.map((entry, i) => (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'opacity 0.3s ease', opacity: i === 0 ? 1 : Math.max(0.15, 0.55 - i * 0.1) }}>
                      {i === 0 && <span style={{ color: cfg.color, fontSize: '0.7rem', flexShrink: 0 }}>▶</span>}
                      {i > 0  && <span style={{ width: '0.7rem', flexShrink: 0 }} />}
                      <span style={{ color: i === 0 ? '#f1f5f9' : 'rgba(241,245,249,0.4)', fontSize: i === 0 ? '1rem' : '0.78rem', fontWeight: i === 0 ? 800 : 500, lineHeight: 1.4 }}>
                        {entry.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Done: results summary */}
          {phase === 'done' && cfg && (
            <div style={{ animation: 'slide-up 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '0.5rem' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '0.55rem' }}>🥊</div>
              <h2 style={{ color: cfg.color, fontWeight: 900, fontSize: '1.25rem', margin: '0 0 0.25rem' }}>אימון הושלם!</h2>
              <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.82rem', margin: '0 0 1rem' }}>{fmtTime(elapsed)} · {cfg.emoji} {cfg.label}</p>

              {/* ── Session Summary ── */}
              {summary && (
                <div style={{ width: '100%', marginBottom: '0.9rem', borderRadius: 18, overflow: 'hidden', border: `1px solid ${cfg.color}25` }}>
                  {/* Accuracy + Intensity row */}
                  <div style={{ display: 'flex', background: `${cfg.color}0e` }}>
                    <div style={{ flex: 1, padding: '0.85rem 0.9rem', textAlign: 'center', borderRight: `1px solid ${cfg.color}18` }}>
                      <div style={{ color: cfg.color, fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, fontFamily: "'SF Mono','Fira Code',monospace" }}>{summary.accuracy}</div>
                      <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.55rem', fontWeight: 700, marginTop: '0.2rem', letterSpacing: '0.06em' }}>דיוק טכניקה</div>
                      <div style={{ color: cfg.color, fontSize: '0.62rem', fontWeight: 800, marginTop: '0.15rem' }}>{summary.accuracyLabel}</div>
                    </div>
                    <div style={{ flex: 1, padding: '0.85rem 0.9rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>{summary.intensityEmoji}</div>
                      <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.55rem', fontWeight: 700, marginTop: '0.2rem', letterSpacing: '0.06em' }}>עצימות</div>
                      <div style={{ color: '#f1f5f9', fontSize: '0.62rem', fontWeight: 800, marginTop: '0.15rem' }}>{summary.intensityLabel}</div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.15rem' }}>◈ שיפור לאימון הבא</div>
                    {summary.tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ color: cfg.color, fontSize: '0.6rem', marginTop: '0.1rem', flexShrink: 0 }}>{i === 0 ? '▶' : '▷'}</span>
                        <span style={{ color: i === 0 ? 'rgba(241,245,249,0.85)' : 'rgba(241,245,249,0.5)', fontSize: '0.72rem', lineHeight: 1.45, fontWeight: i === 0 ? 600 : 400 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ width: '100%', background: `${cfg.color}08`, border: `1px solid ${cfg.color}18`, borderRadius: 16, padding: '0.9rem 1.1rem', marginBottom: '1rem' }}>
                {STAT_KEYS.map((key, i) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < STAT_KEYS.length - 1 ? '0.5rem' : 0 }}>
                    <span style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.72rem', fontWeight: 700, flex: 1, textAlign: 'right' }}>{STAT_LABELS[i]}</span>
                    <div style={{ width: 90, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${stats[key]}%`, background: cfg.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ color: cfg.color, fontSize: '0.72rem', fontWeight: 900, width: 24, fontFamily: "'SF Mono','Fira Code',monospace", textAlign: 'left' }}>{stats[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Bottom action bar — anchored, safe-area aware ── */}
        <div style={{
          flexShrink: 0,
          padding: '0.75rem 1.25rem',
          paddingBottom: 'max(0.85rem, calc(0.75rem + env(safe-area-inset-bottom)))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(4,4,10,0.8)',
          backdropFilter: 'blur(12px)',
        }}>
          {phase === 'select' && (
            <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.18)', fontSize: '0.7rem', padding: '0.5rem 0' }}>
              {discipline ? '↑ הקש על עצימות להתחיל' : '↑ בחר סגנון לחימה תחילה'}
            </div>
          )}
          {phase === 'active' && (
            <button
              onClick={stopSession}
              className="btn-tactile"
              style={{ width: '100%', padding: '1rem', borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#f87171', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }}
            >
              ⏹ סיים אימון
            </button>
          )}
          {phase === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.22)', borderRadius: 14, padding: '0.5rem 1rem' }}>
                <span style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.1rem' }}>+{xpEarned} XP</span>
                <span style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.7rem' }}>× {DIFFICULTIES[difficulty].xpMult} מכפיל</span>
              </div>
              <button
                onClick={handleFinish}
                className="btn-primary btn-tactile btn-wide"
                style={{ padding: '1rem', borderRadius: 16, fontSize: '1rem', fontWeight: 900, width: '100%' }}
              >
                קבל {xpEarned} XP ←
              </button>
            </div>
          )}
        </div>

      </div>

      {showMirror && cfg && (
        <MirrorView
          stats={stats}
          accentColor={cfg.color}
          onClose={() => setShowMirror(false)}
          onVideoReady={handleVideoReady}
          initialPos={{
            x: Math.max(12, Math.min(window.innerWidth, 480) - 194),
            y: Math.max(12, window.innerHeight - 268),
          }}
        />
      )}
    </div>
  )
}
