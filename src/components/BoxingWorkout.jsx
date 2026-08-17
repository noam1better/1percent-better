import { useState, useEffect, useRef, useCallback } from 'react'
import { loadPoseLandmarker, drawSkeleton, analyzeBoxingTechnique } from '../services/poseService'
import { hapticRep, hapticMilestone, hapticGoal } from '../services/hapticService'

// ── Error type metadata ───────────────────────────────────────────────

const ERROR_META = {
  armPunch: {
    label:  'לא סיבוב גוף!',
    emoji:  '🚫',
    color:  '#ef4444',
    desc:   'מחית בזרוע בלבד — ללא סיבוב ירך ושכם',
    shortHe: 'ARM PUNCH',
  },
  dropHand: {
    label:  'ידיים נופלות!',
    emoji:  '🙈',
    color:  '#f97316',
    desc:   'היד השנייה ירדה מהגארד בזמן המכה',
    shortHe: 'DROP HANDS',
  },
  elbowFlare: {
    label:  'מרפק פורח!',
    emoji:  '⚡',
    color:  '#eab308',
    desc:   'המרפק יוצא הצידה — חושף את הגוף ומחליש את המכה',
    shortHe: 'ELBOW OUT',
  },
  guardSlip: {
    label:  'גארד נשבר!',
    emoji:  '🛡️',
    color:  '#ef4444',
    desc:   'שתי הידיים ירדו מהגארד — הסנטר פתוח',
    shortHe: 'GUARD DOWN',
  },
}

const ERROR_DRILLS = {
  armPunch: [
    'Shadow boxing מול מראה — עצור בשיא כל מכה ובדוק שהכתף מסובבת קדימה',
    'גלגל ירך 3×20: תנועת ירך בלי ידיים — בנה את השריר הנכון',
    'Slow-motion cross: 3×10 קרוסים בסלואו-מושן, דגש על סיבוב מהורך',
  ],
  dropHand: [
    'Double-jab drill: בכל ג׳אב שני — בדוק ידנית שהיד הימנית על הלחי',
    'Chin guard hold: שמור ספוג קטן בין הזרוע הנגדית לסנטר — אל תיתן לו ליפול',
    'Partner tap: בן זוג נוגע בסנטרך בכל פעם שהיד יורדת — 3 × 2 דקות',
  ],
  elbowFlare: [
    'Wall jab: עמוד 15 ס״מ ממראה ואמן ג׳אבים — המרפק לא יכול לפרוח לצד',
    'Towel drill: תחוב קצה מגבת מתחת לחיקך ואל תיתן לה ליפול בזמן מכות',
    'Shadow boxing עם מוקד: הכה מרכז, לא מהצד — 3 × 2 דקות',
  ],
  guardSlip: [
    'Hands-up reset: בין כל קומבינציה — ספור 3 עם שתי ידיים על הלחיים',
    'Combo + guard: 1-2, עצירה מלאה בגארד 2 שניות, המשך — 5 × 12 קומבינציות',
    'Mirror shadow: shadow boxing מול מראה עם קריאה מילולית "גארד!" אחרי כל מכה',
  ],
}

const PUNCH_LABELS_HE = {
  jab:      'ג׳אב',
  cross:    'קרוס',
  hook:     'הוק',
  uppercut: 'אפרקט',
}

// ── Tech score ────────────────────────────────────────────────────────

function calcTechScore(errorLog, punches) {
  if (punches === 0) return 100
  const rate  = errorLog.length / Math.max(punches, 1)
  const score = Math.max(0, Math.round((1 - Math.min(1, rate)) * 100))
  return Math.round(score / 10) * 10
}

// ── Visual: error warning overlay ────────────────────────────────────

function ErrorWarningOverlay({ warning }) {
  if (!warning) return null
  const meta = ERROR_META[warning.type]
  if (!meta) return null
  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 10, right: 10,
      background: `${meta.color}dd`,
      borderRadius: 14, padding: '0.7rem 1rem',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${meta.color}`,
      animation: 'slide-up 0.18s ease',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      zIndex: 20,
    }}>
      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{meta.emoji}</span>
      <div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.88rem', letterSpacing: '0.04em' }}>
          {meta.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', fontWeight: 600, marginTop: '0.1rem' }}>
          {meta.desc}
        </div>
      </div>
      {warning.count > 1 && (
        <div style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '0.15rem 0.55rem', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.75rem' }}>×{warning.count}</span>
        </div>
      )}
    </div>
  )
}

// ── Technical Debt Report ─────────────────────────────────────────────

function TechDebtReport({ punches, errorLog, duration, onSave }) {
  const [expandedDrill, setExpandedDrill] = useState(null)

  const techScore = calcTechScore(errorLog, punches)

  // Group errors by type, sorted by frequency
  const byType = {}
  errorLog.forEach(e => {
    if (!byType[e.type]) byType[e.type] = { count: 0, punches: [] }
    byType[e.type].count++
    if (e.punchType) byType[e.type].punches.push(e.punchType)
  })
  const sorted = Object.entries(byType).sort((a, b) => b[1].count - a[1].count)

  const scoreColor = techScore >= 90 ? '#34d399'
                   : techScore >= 70 ? '#F5C518'
                   : techScore >= 50 ? '#f59e0b'
                   :                   '#ef4444'

  const scoreLabel = techScore >= 90 ? 'טכניקה מצוינת 🔥'
                   : techScore >= 70 ? 'טוב — יש מקום לשיפור'
                   : techScore >= 50 ? 'בוא נתקן את הבסיס'
                   :                   'חזרה ליסודות — בסדר, זה למה אנחנו כאן'

  const durationMin = Math.round(duration / 60000) || 1

  return (
    <div style={{ animation: 'slide-up 0.3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
        <span style={{ fontSize: '1.1rem' }}>🛠️</span>
        <div>
          <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            ◈ TECHNICAL DEBT REPORT
          </div>
          <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.88rem' }}>דוח מאמן AI — ניתוח טכני</div>
        </div>
      </div>

      {/* Score + stats row */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        {/* Tech score circle */}
        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: '50%', border: `3px solid ${scoreColor}`, background: `${scoreColor}12`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: scoreColor, fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{techScore}</span>
          <span style={{ color: `${scoreColor}99`, fontSize: '0.45rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>טכניקה</span>
        </div>

        {/* Stat chips */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
          <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.82rem' }}>{scoreLabel}</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { label: 'מכות', value: punches },
              { label: 'שגיאות', value: errorLog.length },
              { label: 'דקות', value: durationMin },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.25rem 0.6rem', textAlign: 'center' }}>
                <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.82rem' }}>{s.value}</div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.52rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error breakdown */}
      {sorted.length === 0 ? (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✅</div>
          <div style={{ color: '#34d399', fontWeight: 900, fontSize: '0.88rem' }}>ניקיון מושלם!</div>
          <div style={{ color: 'rgba(52,211,153,0.55)', fontSize: '0.7rem', marginTop: '0.2rem' }}>לא זוהו שגיאות טכניות בסשן הזה</div>
        </div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.55rem' }}>
            ◈ שגיאות מזוהות
          </div>
          {sorted.map(([type, data]) => {
            const meta  = ERROR_META[type]
            if (!meta) return null
            const rate  = Math.round((data.count / Math.max(punches, 1)) * 100)
            const drills = ERROR_DRILLS[type] || []
            const isOpen = expandedDrill === type
            const topPunch = data.punches.length > 0
              ? Object.entries(data.punches.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc }, {}))
                  .sort((a, b) => b[1] - a[1])[0][0]
              : null

            return (
              <div key={type} style={{ marginBottom: '0.55rem' }}>
                <button
                  onClick={() => setExpandedDrill(isOpen ? null : type)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? meta.color + '55' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'right' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{meta.emoji}</span>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.82rem' }}>{meta.label.replace('!', '')}</div>
                      <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.65rem' }}>
                        {data.count}× {topPunch ? `— בעיקר ב${PUNCH_LABELS_HE[topPunch] || topPunch}` : ''}
                      </div>
                    </div>
                    {/* Frequency bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                      <div style={{ width: 48, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, rate)}%`, background: meta.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ color: meta.color, fontSize: '0.55rem', fontWeight: 800 }}>{rate}%</span>
                    </div>
                    <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.7rem', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Drills (expanded) */}
                {isOpen && drills.length > 0 && (
                  <div style={{ background: 'rgba(245,197,24,0.04)', border: `1px solid ${meta.color}22`, borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '0.65rem 0.85rem', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.45rem' }}>
                      ◈ תרגילי תיקון
                    </div>
                    {drills.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: i < drills.length - 1 ? '0.45rem' : 0 }}>
                        <span style={{ color: meta.color, fontSize: '0.75rem', flexShrink: 0, marginTop: '0.1rem' }}>{i + 1}.</span>
                        <span style={{ color: 'rgba(241,245,249,0.72)', fontSize: '0.75rem', lineHeight: 1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Coach message */}
      <div style={{ background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.14)', borderRadius: 12, padding: '0.75rem 0.9rem', marginBottom: '1rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.3rem' }}>
          ◈ מאמן AI
        </div>
        <div style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.75rem', lineHeight: 1.55 }}>
          {sorted.length === 0
            ? `${punches} מכות ללא שגיאות — גארד נשמר, גוף עובד. תמשיך לשמור על הרמה הזו.`
            : sorted[0]?.[0] === 'armPunch'
              ? `${punches} מכות, השגיאה הדומיננטית: מכות זרוע. המכה שלך חזקה רק כשהגוף מגבה. הוסף גלגל ירך לחימום של כל אימון.`
              : sorted[0]?.[0] === 'dropHand'
                ? `${punches} מכות, ידיים נופלות ${sorted[0][1].count}×. האגרוף שהפסדת היה לסנטר הפתוח. שמור את היד הנגדית — תמיד.`
                : sorted[0]?.[0] === 'guardSlip'
                  ? `${punches} מכות, גארד נשבר ${sorted[0][1].count}×. בין קומבינציות הסנטר שלך חשוף. "מכה — גארד" — כמו נשימה.`
                  : `${punches} מכות, מרפקים פורחים ${sorted[0][1].count}×. מרפק פורח = כוח אבוד + חשיפה. שמור אותם צמודים לגוף.`
          }
        </div>
      </div>

      <button onClick={onSave} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 900 }}>
        שמור וסגור ←
      </button>
    </div>
  )
}

// ── Boxing Workout (main component) ──────────────────────────────────

export default function BoxingWorkout({ track, goal, onComplete, onClose }) {
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const landmarkerRef= useRef(null)
  const streamRef    = useRef(null)
  const rafRef       = useRef(null)
  const lastTsRef    = useRef(-1)
  const prevLmRef    = useRef(null)
  const boxStateRef  = useRef({})           // boxing analysis state
  const punchCountRef= useRef(0)
  const errorLogRef  = useRef([])           // [{ type, ts, punchType }]
  const errorCoolRef = useRef({})           // { [type]: lastTs (performance.now) }
  const warnTimerRef = useRef(null)
  const sessionStartRef = useRef(null)
  const goalHaptedRef= useRef(false)
  const halfHaptedRef= useRef(false)

  const [phase,       setPhase]       = useState('loading')  // loading | running | summary | error
  const [punches,     setPunches]     = useState(0)
  const [confidence,  setConfidence]  = useState(1)
  const [warning,     setWarning]     = useState(null)       // { type, count } | null
  const [manualRep,   setManualRep]   = useState('')
  const [errorCounts, setErrorCounts] = useState({})         // { [type]: count } — mirrors errorLogRef for render
  const [summaryData, setSummaryData] = useState(null)       // { log, finalPunches, duration }

  const ERROR_COOLDOWN_MS = 2500
  const WARNING_MS        = 1600

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    clearTimeout(warnTimerRef.current)
  }, [])

  // Effect 1: init camera + landmarker
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const lm = await loadPoseLandmarker()
        if (cancelled) return
        if (!lm) { setPhase('error'); return }
        landmarkerRef.current = lm
        setPhase('running')
      } catch (err) {
        if (cancelled) return
        setPhase(err.name === 'NotAllowedError' ? 'error' : 'error')
      }
    }
    init()
    return () => { cancelled = true; cleanup() }
  }, [cleanup])

  // Effect 2: attach stream to video
  useEffect(() => {
    if (phase !== 'running') return
    const video = videoRef.current
    if (!video || !streamRef.current) return
    video.muted = true; video.playsInline = true
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('autoplay', '')
    video.srcObject = streamRef.current
    sessionStartRef.current = Date.now()
    video.load()
    video.play().catch(() => {})
  }, [phase])

  // Effect 3: RAF pose loop
  useEffect(() => {
    if (phase !== 'running') return

    function loop(ts) {
      const video  = videoRef.current
      const canvas = canvasRef.current
      const lm     = landmarkerRef.current
      if (!video || !canvas || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop); return
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
        const analysis  = analyzeBoxingTechnique(landmarks, prevLmRef.current, boxStateRef.current)

        setConfidence(analysis.confidence)
        boxStateRef.current = analysis.nextState

        // Count punches
        if (analysis.punchDetected) {
          punchCountRef.current += 1
          const n = punchCountRef.current
          setPunches(n)
          hapticRep()
          const half = Math.floor(goal / 2)
          if (n === half && !halfHaptedRef.current) { halfHaptedRef.current = true; hapticMilestone() }
          if (n >= goal  && !goalHaptedRef.current) { goalHaptedRef.current = true; hapticGoal() }
        }

        // Process detected errors
        if (analysis.errors.length > 0) {
          const nowTs = performance.now()
          const firstNew = analysis.errors.find(type => {
            const last = errorCoolRef.current[type] || 0
            return nowTs - last >= ERROR_COOLDOWN_MS
          })

          if (firstNew) {
            errorCoolRef.current[firstNew] = nowTs
            errorLogRef.current.push({
              type:      firstNew,
              ts:        nowTs,
              punchType: analysis.punchType,
            })
            const newCount = errorLogRef.current.filter(e => e.type === firstNew).length

            // Sync error counts to state so badge renders update
            setErrorCounts(prev => ({ ...prev, [firstNew]: newCount }))

            // Show warning overlay
            clearTimeout(warnTimerRef.current)
            setWarning({ type: firstNew, count: newCount })
            warnTimerRef.current = setTimeout(() => setWarning(null), WARNING_MS)
          }
        }

        drawSkeleton(ctx, landmarks, 'boxing', canvas.width, canvas.height, analysis.confidence)
        prevLmRef.current = landmarks
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, goal])

  function finishSession(finalPunches) {
    cleanup()
    const duration = Date.now() - (sessionStartRef.current || Date.now())
    setSummaryData({ log: [...errorLogRef.current], finalPunches, duration })
    setPhase('summary')
  }

  function handleDone()       { finishSession(punchCountRef.current) }
  function handleManualSave() {
    const n = parseInt(manualRep)
    if (!n || n < 0) return
    // Manual mode: no error detection; just save punch count
    onComplete({ amount: n, unit: track.unit })
  }

  const goalReached    = punches >= goal
  const confidenceLow  = confidence < 0.6

  // ── Loading ──
  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
      <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem' }}>טוען מצלמה ו-AI מאמן…</p>
    </div>
  )

  // ── Error / manual ──
  if (phase === 'error') return (
    <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '0.85rem 1rem' }}>
        <p style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem' }}>⚠️ הרשאת מצלמה נדחתה</p>
        <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', margin: 0 }}>אפשר גישה למצלמה בהגדרות הדפדפן.</p>
      </div>
      <label style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
        הכנס מכות ידנית
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number" inputMode="numeric" value={manualRep}
          onChange={e => setManualRep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualSave()}
          placeholder={`יעד: ${goal} מכות`} className="glow-input"
          style={{ flex: 1, padding: '0.75rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit' }}
        />
        <button onClick={handleManualSave} disabled={!manualRep} className="btn-primary btn-tactile"
          style={{ padding: '0.75rem 1.1rem', borderRadius: 11, fontSize: '0.9rem', fontWeight: 800, opacity: manualRep ? 1 : 0.4 }}>
          שמור ←
        </button>
      </div>
    </div>
  )

  // ── Summary — Technical Debt Report ──
  if (phase === 'summary') {
    const { log = [], finalPunches = 0, duration = 0 } = summaryData || {}
    return (
      <TechDebtReport
        punches={finalPunches}
        errorLog={log}
        duration={duration}
        onSave={() => onComplete({ amount: finalPunches, unit: track.unit })}
      />
    )
  }

  // ── Corner bracket helper ──
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

  // ── Live camera ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
        <video ref={videoRef} muted playsInline autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

        {/* Corner brackets */}
        {!goalReached && (<>
          <div style={corner(8, null, null, 8)} />
          <div style={corner(8, 8, null, null)} />
          <div style={corner(null, null, 8, 8)} />
          <div style={corner(null, 8, 8, null)} />
        </>)}

        {/* Punch counter — top left */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(4,4,10,0.84)', borderRadius: 14,
          padding: '0.5rem 0.8rem', backdropFilter: 'blur(10px)',
          border: goalReached ? '1px solid rgba(245,197,24,0.55)' : '1px solid rgba(245,197,24,0.22)',
        }}>
          <div style={{ color: goalReached ? '#F5C518' : '#f1f5f9', fontSize: '2rem', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {punches}
          </div>
          <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.55rem', fontWeight: 700 }}>
            / {goal} מכות
          </div>
          {/* Mini error badges */}
          <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
            {Object.entries(ERROR_META).map(([type, meta]) => {
              const count = errorCounts[type] || 0
              if (count === 0) return null
              return (
                <span key={type} style={{
                  background: `${meta.color}22`, border: `1px solid ${meta.color}55`,
                  borderRadius: 20, padding: '0.08rem 0.3rem',
                  color: meta.color, fontSize: '0.5rem', fontWeight: 800,
                  fontFamily: "'SF Mono','Fira Code',monospace",
                }}>
                  {meta.emoji}{count}
                </span>
              )
            })}
          </div>
        </div>

        {/* Error warning overlay */}
        <ErrorWarningOverlay warning={warning} />

        {/* AI status — bottom left */}
        {!goalReached && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(5,5,5,0.72)', borderRadius: 20, padding: '0.25rem 0.6rem', backdropFilter: 'blur(6px)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: confidenceLow ? '#ef4444' : '#34d399', animation: 'cam-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ color: confidenceLow ? '#fca5a5' : 'rgba(52,211,153,0.9)', fontSize: '0.6rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: '0.06em' }}>
              {confidenceLow ? 'זיהוי חלש' : 'AI COACH פעיל'}
            </span>
          </div>
        )}

        {/* Close — bottom right */}
        {!goalReached && (
          <button onClick={() => { cleanup(); onClose() }} className="btn-tactile"
            style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(5,5,5,0.72)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.25rem 0.7rem', backdropFilter: 'blur(6px)', color: 'rgba(241,245,249,0.55)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
            ✕ סגור
          </button>
        )}

        {/* Goal banner */}
        {goalReached && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(5,5,5,0.9)', borderRadius: 18, padding: '1.25rem 2rem', textAlign: 'center', border: '2px solid rgba(245,197,24,0.5)' }}>
              <div style={{ fontSize: '2.5rem' }}>🥊</div>
              <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.1rem', marginTop: '0.25rem' }}>יעד הושג!</div>
              <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.7rem', marginTop: '0.15rem' }}>{punches} מכות</div>
            </div>
          </div>
        )}
      </div>

      <button onClick={handleDone} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800 }}>
        {goalReached ? 'סיום אימון — צפה בדוח ←' : `סיימתי (${punches} מכות) ←`}
      </button>
    </div>
  )
}
