import { useState, useRef, useEffect } from 'react'
import { buildCustomPath } from '../services/pathBuilderService'

// ── Questions ────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id:       'goal',
    question: 'מה המטרה הכי חשובה לך ב-30 הימים הקרובים?',
    options:  [
      { value: 'כוח ומשמעת גופנית',  label: 'כוח גופני',     emoji: '💪' },
      { value: 'חשיבה ומיקוד מנטלי', label: 'מיקוד מנטלי',   emoji: '🧠' },
      { value: 'פרודוקטיביות ועשייה', label: 'פרודוקטיביות',  emoji: '⚡' },
      { value: 'שינוי הרגלים חיובי',  label: 'שינוי הרגלים',  emoji: '🔥' },
    ],
  },
  {
    id:       'timeCommitment',
    question: 'כמה זמן אתה יכול להקדיש ביום?',
    options:  [
      { value: '15 דקות',       label: '15 דקות',  emoji: '⚡' },
      { value: '30 דקות',       label: '30 דקות',  emoji: '🎯' },
      { value: 'שעה',           label: 'שעה',       emoji: '💪' },
      { value: 'שעתיים ומעלה', label: '2+ שעות',  emoji: '🔱' },
    ],
  },
  {
    id:       'challenge',
    question: 'מה מפיל אותך הכי הרבה?',
    options:  [
      { value: 'חוסר עקביות',          label: 'חוסר עקביות',    emoji: '😮‍💨' },
      { value: 'מוטיבציה נמוכה בבוקר', label: 'מוטיבציה נמוכה', emoji: '😴'  },
      { value: 'הסחות דעת',             label: 'הסחות דעת',       emoji: '📱'  },
      { value: 'דחיינות',               label: 'דחיינות',          emoji: '🌀'  },
    ],
  },
  {
    id:       'experience',
    question: 'מה הניסיון שלך עם בניית הרגלים?',
    options:  [
      { value: 'מתחיל — בונה בסיס',          label: 'מתחיל',   emoji: '🌱' },
      { value: 'בינוני — יש לי קצב',          label: 'בינוני',  emoji: '⚡' },
      { value: 'מתקדם — רוצה לפרוץ תקרה',    label: 'מתקדם',   emoji: '🔱' },
    ],
  },
  {
    id:       'peakTime',
    question: 'מתי אתה הכי חד ואנרגטי?',
    options:  [
      { value: 'בוקר',   label: 'בוקר',   emoji: '🌅' },
      { value: 'צהריים', label: 'צהריים', emoji: '☀️' },
      { value: 'ערב',    label: 'ערב',    emoji: '🌆' },
    ],
  },
]

const BUILDING_STEPS = [
  'מנתח את הפרופיל שלך...',
  'בונה הרגלים יומיים מותאמים אישית...',
  'יוצר מפת דרכים ל-30 יום...',
  'מוסיף מגע אחרון...',
]

// ── Chat message bubble ───────────────────────────────────────────────

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
        <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>{text}</p>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'slide-up 0.2s ease both' }}>
      <div style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: '14px 4px 14px 14px', padding: '0.55rem 0.85rem' }}>
        <p style={{ color: '#F5C518', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{text}</p>
      </div>
    </div>
  )
}

// ── Path preview ──────────────────────────────────────────────────────

function PathPreview({ pathRecord, onConfirm }) {
  const { path } = pathRecord
  return (
    <div style={{ animation: 'slide-up 0.35s ease both' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(145deg,rgba(245,197,24,0.12),rgba(245,197,24,0.04))', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ המסלול האישי שלך</div>
        <div style={{ color: '#F5C518', fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.25, marginBottom: '0.4rem' }}>{path.path_name}</div>
        <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>{path.tagline}</div>
      </div>

      {/* Coach note */}
      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ color: '#a5b4fc', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>🤖 מהמאמן שלך</div>
        <p style={{ color: 'rgba(241,245,249,0.75)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{path.coach_note}</p>
      </div>

      {/* Daily habits */}
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

      {/* First week preview */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.55rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>שבוע ראשון — מבט מקדים</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {path.roadmap.slice(0, 3).map(r => (
            <div key={r.day} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.45rem 0' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(245,197,24,0.7)', fontFamily: 'monospace', flexShrink: 0 }}>{r.day}</div>
              <span style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', lineHeight: 1.45 }}>{r.task}</span>
            </div>
          ))}
          <div style={{ color: 'rgba(245,197,24,0.35)', fontSize: '0.68rem', marginTop: '0.2rem', fontFamily: "'SF Mono','Fira Code',monospace' " }}>+ עוד 27 ימים...</div>
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

// ── Main component ────────────────────────────────────────────────────

export default function PathBuilder({ user, onDone }) {
  const [chatItems,   setChatItems]   = useState([
    { type: 'agent', text: 'ברוך הבא לבניית המסלול האישי שלך. 5 שאלות. תוכנית 30 יום שבנויה בדיוק עבורך.' },
    { type: 'question', qIdx: 0 },
  ])
  const [currentQ,    setCurrentQ]    = useState(0)
  const [answers,     setAnswers]     = useState({})
  const [phase,       setPhase]       = useState('questions')  // questions | building | preview
  const [buildStep,   setBuildStep]   = useState(0)
  const [pathRecord,  setPathRecord]  = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatItems, phase, buildStep])

  function selectAnswer(qId, value, label, emoji) {
    setChatItems(prev => [...prev, { type: 'user', text: `${emoji} ${label}` }])
    const newAnswers = { ...answers, [qId]: value }
    setAnswers(newAnswers)

    if (currentQ < QUESTIONS.length - 1) {
      const next = currentQ + 1
      setTimeout(() => {
        setChatItems(prev => [...prev, { type: 'question', qIdx: next }])
        setCurrentQ(next)
      }, 350)
    } else {
      // All answered — build
      setTimeout(async () => {
        setPhase('building')
        for (let i = 0; i < BUILDING_STEPS.length; i++) {
          setBuildStep(i)
          await new Promise(r => setTimeout(r, 900))
        }
        const record = await buildCustomPath(user.uid, newAnswers)
        setPathRecord(record)
        setPhase('preview')
      }, 350)
    }
  }

  const activeQ = phase === 'questions' ? QUESTIONS[currentQ] : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.98)', display: 'flex', flexDirection: 'column', zIndex: 5000 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/prime-logo.svg" alt="PRIME" style={{ height: 22, opacity: 0.7 }} />
        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", color: 'rgba(245,197,24,0.5)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          ◈ PERSONAL PATH BUILDER
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < currentQ || phase !== 'questions' ? '#F5C518' : i === currentQ && phase === 'questions' ? 'rgba(245,197,24,0.6)' : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      {/* Chat scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

        {phase === 'questions' && chatItems.map((item, i) => {
          if (item.type === 'agent')    return <AgentBubble    key={i} text={item.text} />
          if (item.type === 'user')     return <UserBubble     key={i} text={item.text} />
          if (item.type === 'question') {
            const q = QUESTIONS[item.qIdx]
            return (
              <AgentBubble key={i} text={q.question} delay={i === 0 ? 0 : 250} />
            )
          }
          return null
        })}

        {phase === 'building' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {BUILDING_STEPS.slice(0, buildStep + 1).map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', animation: 'fadeIn 0.3s ease' }}>
                {i === buildStep ? (
                  <div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid rgba(245,197,24,0.15)', borderTopColor: '#F5C518', borderRadius: '50%', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>✓</div>
                )}
                <span style={{ color: i === buildStep ? '#f1f5f9' : 'rgba(241,245,249,0.35)', fontSize: '0.85rem', fontWeight: i === buildStep ? 700 : 400 }}>{step}</span>
              </div>
            ))}
          </div>
        )}

        {phase === 'preview' && pathRecord && (
          <PathPreview pathRecord={pathRecord} onConfirm={() => onDone(pathRecord)} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Option buttons — only shown during questions */}
      {phase === 'questions' && activeQ && (
        <div style={{ padding: '0.85rem 1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(5,5,10,0.95)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: activeQ.options.length === 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)', gap: '0.5rem' }}>
            {activeQ.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => selectAnswer(activeQ.id, opt.value, opt.label, opt.emoji)}
                className="btn-tactile"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.75rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '1.35rem' }}>{opt.emoji}</span>
                <span style={{ color: '#f1f5f9', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
