import { useState, useRef, useEffect } from 'react'
import { buildCustomPath, loadCustomPath } from '../services/pathBuilderService'

// ── Vision discovery questions ────────────────────────────────────────

const VISION_QUESTIONS = [
  {
    id:        'three_year_vision',
    icon:      '🔭',
    label:     'חזון 3 שנים',
    question:  'בעוד 3 שנים — איפה אתה רוצה להיות?\nקריירה. בריאות. מחשבה. אורח חיים.',
    inputType: 'textarea',
    placeholder: 'בעוד 3 שנים אני...',
    hint:      'תהיה ספציפי — לא "להיות מוצלח", אלא מה זה אומר בפועל עבורך.',
    minChars:  20,
  },
  {
    id:        'the_gap',
    icon:      '⛰️',
    label:     'הפער',
    question:  'מה המכשול הגדול ביותר שעומד בינך לבין הגרסה הזו של עצמך?',
    inputType: 'textarea',
    placeholder: 'המכשול האמיתי הוא...',
    hint:      'לא גורמים חיצוניים — מה בך עוצר אותך עכשיו?',
    minChars:  15,
  },
  {
    id:        'core_values',
    icon:      '💎',
    label:     'ערכי ליבה',
    question:  '3 ערכים שחייב לגלם כל יום כדי להגיע לחזון הזה.',
    inputType: 'values',
    count:     3,
    placeholder: 'ערך...',
    hint:      'ערכים הם מי שאתה — לא מה שאתה רוצה להשיג.',
    minFilled: 1,
  },
  {
    id:        'non_negotiables',
    icon:      '🔒',
    label:     'Non-Negotiables',
    question:  '2 הרגלים שחייב לבצע כל יום כדי להרגיש כמו הפריים-סלף שלך.',
    inputType: 'habits',
    count:     2,
    placeholder: 'הרגל...',
    hint:      'אלה לא "הרגלים טובים" — אלה ה-DNA שלך.',
    minFilled: 1,
  },
]

const TOTAL_STEPS = VISION_QUESTIONS.length  // 4

const BUILDING_STEPS = [
  'מנתח את החזון שלך...',
  'ממפה את הפער ובונה גשר...',
  'יוצר מפת דרכים ל-30 יום...',
  'מוסיף מגע אישי אחרון...',
]

// ── Chat bubbles ──────────────────────────────────────────────────────

function AgentBubble({ text, delay = 0 }) {
  const [visible, setVisible] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  if (!visible) return null
  return (
    <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', animation: 'slide-up 0.25s ease both' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, marginTop: 2 }}>
        ◈
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '4px 14px 14px 14px', padding: '0.65rem 0.9rem', maxWidth: '85%' }}>
        <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{text}</p>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'slide-up 0.2s ease both' }}>
      <div style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: '14px 4px 14px 14px', padding: '0.55rem 0.85rem', maxWidth: '88%' }}>
        <p style={{ color: '#F5C518', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{text}</p>
      </div>
    </div>
  )
}

// ── Question label chip shown above each vision question ──────────────

function VisionLabelChip({ q, stepNum }) {
  return (
    <div style={{ paddingRight: '2.35rem', marginBottom: '-0.1rem' }}>
      <span style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 20, padding: '0.15rem 0.6rem', color: 'rgba(245,197,24,0.65)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', fontFamily: "'SF Mono','Fira Code',monospace" }}>
        {q.icon} {q.label} · {stepNum}/{TOTAL_STEPS}
      </span>
    </div>
  )
}

// ── Path preview ──────────────────────────────────────────────────────

function PathPreview({ pathRecord, onConfirm }) {
  const { path } = pathRecord
  return (
    <div style={{ animation: 'slide-up 0.35s ease both' }}>
      <div style={{ background: 'linear-gradient(145deg,rgba(245,197,24,0.12),rgba(245,197,24,0.04))', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ המסלול האישי שלך</div>
        <div style={{ color: '#F5C518', fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.25, marginBottom: '0.4rem' }}>{path.path_name}</div>
        <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{path.tagline}</div>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ color: '#a5b4fc', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>🤖 מהמאמן שלך</div>
        <p style={{ color: 'rgba(241,245,249,0.75)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{path.coach_note}</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.55rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>הרגלים יומיים</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {path.daily_habits.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.65rem 0.85rem', animation: `slide-up 0.3s ${i * 0.07}s ease both` }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{h.emoji}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 800 }}>{h.title}</div>
                <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.7rem', marginTop: '0.1rem' }}>{h.description} · {h.duration_min} דק'</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.55rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>שבוע ראשון — מבט מקדים</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {path.roadmap.slice(0, 3).map(r => (
            <div key={r.day} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.45rem 0' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(245,197,24,0.7)', fontFamily: 'monospace', flexShrink: 0 }}>{r.day}</div>
              <span style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', lineHeight: 1.45 }}>{r.task}</span>
            </div>
          ))}
          <div style={{ color: 'rgba(245,197,24,0.35)', fontSize: '0.68rem', marginTop: '0.2rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>+ עוד 27 ימים...</div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1.3rem', borderRadius: 18, fontSize: '1rem', fontWeight: 900 }}
      >
        מתחיל את המסלול שלי ←
      </button>
    </div>
  )
}

// ── Archive Warning ───────────────────────────────────────────────────

function ArchiveWarning({ existingPath, onConfirm, onCancel }) {
  const path          = existingPath?.path
  const daysCompleted = existingPath?.progress?.completedDays?.length || 0
  const streak        = existingPath?.consistency?.current_streak || 0

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)', borderRadius: 18, padding: '1rem 1.1rem', marginBottom: '0.75rem' }}>
        <div style={{ color: '#fbbf24', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
          ⚠️ מסלול פעיל קיים
        </div>
        <div style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 900, marginBottom: '0.2rem' }}>
          {path?.path_name || 'מסלול קיים'}
        </div>
        {path?.tagline && (
          <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem', marginBottom: '0.65rem', lineHeight: 1.45 }}>
            {path.tagline}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.4rem 0.7rem', textAlign: 'center' }}>
            <div style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{daysCompleted}</div>
            <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', marginTop: '0.15rem' }}>ימים ✓</div>
          </div>
          {streak > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.4rem 0.7rem', textAlign: 'center' }}>
              <div style={{ color: '#f97316', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>🔥{streak}</div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', marginTop: '0.15rem' }}>רצף</div>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.4rem 0.7rem', textAlign: 'center' }}>
            <div style={{ color: '#06b6d4', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>30</div>
            <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', marginTop: '0.15rem' }}>ימי מסלול</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '0.75rem 0.9rem', marginBottom: '1rem' }}>
        <p style={{ color: 'rgba(241,245,249,0.62)', fontSize: '0.8rem', lineHeight: 1.65, margin: 0 }}>
          המסלול הנוכחי <strong style={{ color: '#a5b4fc' }}>יועבר לארכיון</strong> — הוא לא יימחק ותוכל לשחזר אותו בכל עת מהגדרות.
        </p>
      </div>

      <button
        onClick={onConfirm}
        className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1.1rem', borderRadius: 16, fontSize: '0.95rem', fontWeight: 900, marginBottom: '0.55rem' }}
      >
        ארכב ובנה מסלול חדש ←
      </button>
      <button
        onClick={onCancel}
        className="btn-tactile"
        style={{ width: '100%', padding: '0.85rem', borderRadius: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(241,245,249,0.38)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
      >
        חזור למסלול הנוכחי
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  GEMINI_TIMEOUT:    { he: 'ה-AI לקח יותר מ-20 שניות — ייתכן שהשרת עמוס', en: 'AI timeout (>20s)' },
  FIRESTORE_TIMEOUT: { he: 'השמירה ל-Firestore לא הצליחה — בדוק חיבור', en: 'Firestore write timeout' },
  default:           { he: 'שגיאה לא צפויה', en: 'Unexpected error' },
}

export default function PathBuilder({ user, onDone }) {
  const [chatItems,      setChatItems]      = useState([
    { type: 'agent', text: 'ברוך הבא למסלול הפריים.\n\nאני אשאל אותך 4 שאלות — ואבנה עבורך מסלול אישי ל-30 יום שמחבר בין מי שאתה עכשיו לבין מי שאתה רוצה להיות.\n\nתהיה כן. ככל שתהיה כן, כך המסלול יהיה מדויק יותר.' },
    { type: 'vision_q', qIdx: 0 },
  ])
  const [visionQ,        setVisionQ]        = useState(0)
  const [visionAnswers,  setVisionAnswers]  = useState({})
  const [textInput,      setTextInput]      = useState('')
  const [multiValues,    setMultiValues]    = useState(['', '', ''])
  const [phase,          setPhase]          = useState('vision')
  const [buildStep,      setBuildStep]      = useState(0)
  const [apiStatus,      setApiStatus]      = useState(null)
  const [error,          setError]          = useState(null)
  const [pathRecord,     setPathRecord]     = useState(null)
  const [existingPath,   setExistingPath]   = useState(null)
  const pendingData = useRef(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatItems, phase, buildStep, apiStatus, error])

  useEffect(() => {
    const q = VISION_QUESTIONS[visionQ]
    if (phase === 'vision' && q?.inputType === 'textarea') {
      textareaRef.current?.focus()
    }
  }, [phase, visionQ])

  useEffect(() => {
    if (user?.uid) loadCustomPath(user.uid).then(p => { if (p) setExistingPath(p) })
  }, [user?.uid])

  async function runBuild(visionProfile) {
    setPhase('building')
    setError(null)
    setApiStatus(null)
    for (let i = 0; i < 3; i++) {
      setBuildStep(i)
      await new Promise(r => setTimeout(r, 900))
    }
    setBuildStep(3)
    try {
      const record = await buildCustomPath(user.uid, visionProfile, status => setApiStatus(status))
      setPathRecord(record)
      setPhase('preview')
    } catch (err) {
      setError(err.code || 'default')
      setPhase('error')
    }
  }

  function submitVisionAnswer(rawValue) {
    const q = VISION_QUESTIONS[visionQ]

    let answer
    let displayText
    if (q.inputType === 'textarea') {
      answer      = rawValue.trim()
      displayText = answer
    } else {
      const filled = rawValue.filter(v => v.trim())
      answer       = filled
      displayText  = `${q.icon} ${filled.join(' · ')}`
    }

    const newAnswers = { ...visionAnswers, [q.id]: answer }
    setVisionAnswers(newAnswers)
    setTextInput('')
    setMultiValues(['', '', ''])

    setChatItems(prev => [...prev, { type: 'user', text: displayText }])

    if (visionQ < VISION_QUESTIONS.length - 1) {
      const next = visionQ + 1
      setTimeout(() => {
        setChatItems(prev => [...prev, { type: 'vision_q', qIdx: next }])
        setVisionQ(next)
      }, 350)
    } else {
      const visionProfile = newAnswers
      pendingData.current = visionProfile
      if (existingPath) {
        setTimeout(() => setPhase('archive_warning'), 350)
      } else {
        setTimeout(() => runBuild(visionProfile), 350)
      }
    }
  }

  function handleRetry() {
    if (pendingData.current) runBuild(pendingData.current)
  }

  const activeQ           = VISION_QUESTIONS[visionQ]
  const isActivePhase     = phase === 'vision'
  const globalStep        = isActivePhase ? visionQ : TOTAL_STEPS

  const canSubmitTextarea = textInput.trim().length >= (activeQ?.minChars || 1)
  const canSubmitMulti    = multiValues.filter(v => v.trim()).length >= (activeQ?.minFilled || 1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.98)', display: 'flex', flexDirection: 'column', zIndex: 5000 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/prime-logo.svg" alt="PRIME" style={{ height: 22, opacity: 0.7 }} />
        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", color: 'rgba(245,197,24,0.5)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          ◈ חזון הפריים
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const filled  = i < globalStep || !isActivePhase
            const current = i === globalStep && isActivePhase
            return (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: filled ? '#F5C518' : current ? 'rgba(245,197,24,0.6)' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.3s',
              }} />
            )
          })}
        </div>
      </div>

      {/* ── Chat scroll area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

        {(phase === 'vision' || phase === 'archive_warning') && chatItems.map((item, i) => {
          if (item.type === 'agent') return <AgentBubble key={i} text={item.text} />
          if (item.type === 'user')  return <UserBubble  key={i} text={item.text} />
          if (item.type === 'vision_q') {
            const q = VISION_QUESTIONS[item.qIdx]
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <VisionLabelChip q={q} stepNum={item.qIdx + 1} />
                <AgentBubble text={q.question} delay={i <= 1 ? 0 : 280} />
              </div>
            )
          }
          return null
        })}

        {/* ── Building / Error ── */}
        {(phase === 'building' || phase === 'error') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {BUILDING_STEPS.slice(0, buildStep + 1).map((step, i) => {
              const isCurrent = i === buildStep && phase === 'building'
              const isDone    = i < buildStep || phase === 'error'
              return (
                <div key={i} style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {isCurrent ? (
                      <div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid rgba(245,197,24,0.15)', borderTopColor: '#F5C518', borderRadius: '50%', flexShrink: 0 }} />
                    ) : phase === 'error' && i === buildStep ? (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>✗</div>
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>✓</div>
                    )}
                    <span style={{ color: isCurrent ? '#f1f5f9' : 'rgba(241,245,249,0.35)', fontSize: '0.85rem', fontWeight: isCurrent ? 700 : 400 }}>{step}</span>
                  </div>
                  {isCurrent && i === 3 && apiStatus && (
                    <div style={{ marginTop: '0.35rem', marginRight: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.68rem', fontFamily: "'SF Mono','Fira Code',monospace", fontWeight: 600 }}>
                        {apiStatus === 'ai'     ? '→ שולח ל-Gemini AI...' : ''}
                        {apiStatus === 'saving' ? '→ שומר ב-Firestore...' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

            {phase === 'error' && error && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '1rem 1.1rem', marginTop: '0.5rem', animation: 'slide-up 0.3s ease' }}>
                <div style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.3rem' }}>⚠ שגיאה</div>
                <div style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.78rem', marginBottom: '0.15rem' }}>
                  {(ERROR_MESSAGES[error] || ERROR_MESSAGES.default).he}
                </div>
                <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.62rem', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.85rem' }}>
                  code: {error}
                </div>
                <button
                  onClick={handleRetry}
                  className="btn-primary btn-tactile"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: 12, fontSize: '0.88rem', fontWeight: 800 }}
                >
                  🔄 נסה שוב
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Archive warning ── */}
        {phase === 'archive_warning' && existingPath && (
          <ArchiveWarning
            existingPath={existingPath}
            onConfirm={() => runBuild(pendingData.current)}
            onCancel={() => onDone(existingPath)}
          />
        )}

        {/* ── Preview ── */}
        {phase === 'preview' && pathRecord && (
          <PathPreview pathRecord={pathRecord} onConfirm={() => onDone(pathRecord)} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Bottom input: textarea (Q1, Q2) ── */}
      {phase === 'vision' && activeQ?.inputType === 'textarea' && (
        <div style={{ padding: '0.85rem 1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,10,0.95)' }}>
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && canSubmitTextarea) {
                e.preventDefault()
                submitVisionAnswer(textInput)
              }
            }}
            placeholder={activeQ.placeholder}
            rows={3}
            className="glow-input"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 0.95rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, marginBottom: '0.35rem', direction: 'rtl' }}
          />
          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.62rem', marginBottom: '0.55rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            {activeQ.hint}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => submitVisionAnswer(textInput)}
              disabled={!canSubmitTextarea}
              className="btn-primary btn-tactile"
              style={{ flex: 1, padding: '0.85rem', borderRadius: 12, fontSize: '0.9rem', fontWeight: 800, opacity: canSubmitTextarea ? 1 : 0.4 }}
            >
              המשך ←
            </button>
          </div>
          <div style={{ marginTop: '0.4rem', color: canSubmitTextarea ? 'rgba(16,185,129,0.6)' : 'rgba(241,245,249,0.18)', fontSize: '0.62rem', fontFamily: "'SF Mono','Fira Code',monospace", textAlign: 'left' }}>
            {textInput.trim().length} / {activeQ.minChars} תווים לפחות · Enter לשליחה
          </div>
        </div>
      )}

      {/* ── Bottom input: multi-input (Q3 values, Q4 habits) ── */}
      {phase === 'vision' && (activeQ?.inputType === 'values' || activeQ?.inputType === 'habits') && (
        <div style={{ padding: '0.85rem 1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,10,0.95)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.5rem' }}>
            {Array.from({ length: activeQ.count }, (_, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.68rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace", minWidth: 16, textAlign: 'center' }}>
                  {idx + 1}
                </span>
                <input
                  value={multiValues[idx] || ''}
                  onChange={e => {
                    const next = [...multiValues]
                    next[idx] = e.target.value
                    setMultiValues(next)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && canSubmitMulti) {
                      e.preventDefault()
                      submitVisionAnswer(multiValues)
                    }
                  }}
                  placeholder={activeQ.placeholder}
                  className="glow-input"
                  style={{ flex: 1, padding: '0.7rem 0.85rem', borderRadius: 12, border: `1px solid ${multiValues[idx]?.trim() ? 'rgba(245,197,24,0.28)' : 'rgba(255,255,255,0.09)'}`, background: multiValues[idx]?.trim() ? 'rgba(245,197,24,0.05)' : 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', direction: 'rtl', transition: 'border-color 0.2s, background 0.2s' }}
                />
              </div>
            ))}
          </div>
          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.62rem', marginBottom: '0.55rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            {activeQ.hint}
          </div>
          <button
            onClick={() => submitVisionAnswer(multiValues)}
            disabled={!canSubmitMulti}
            className="btn-primary btn-tactile"
            style={{ width: '100%', padding: '0.85rem', borderRadius: 12, fontSize: '0.9rem', fontWeight: 800, opacity: canSubmitMulti ? 1 : 0.4 }}
          >
            {visionQ === VISION_QUESTIONS.length - 1 ? 'בנה את המסלול שלי ←' : 'המשך ←'}
          </button>
        </div>
      )}
    </div>
  )
}
