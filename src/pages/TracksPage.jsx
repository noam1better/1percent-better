import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUserPrefs } from '../context/UserContext'
import { saveProfile } from '../services/focusTriggerService'
import { CHALLENGES, CHALLENGE_WEEKS, LESSON_TYPES, getDayTask, getLessonType, getModuleIndex } from '../data/challenges'
import { getDayContent } from '../data/lessonContent'

const todayKey = () => new Date().toISOString().slice(0, 10)
const MIN_REFLECTION = 40
function hasValidWordCount(text, min = 5) {
  return text.trim().split(/\s+/).filter(w => w.length > 1).length >= min
}
const QUIZ_KEY = 'prime_track_quiz'

// ── Quiz data ──────────────────────────────────────────────────────

const QUIZ_QUESTIONS = [
  {
    step: 1, emoji: '🎯',
    question: 'מה המטרה הראשית שלך?',
    options: [
      { id: 'finance',  emoji: '📈', text: 'צמיחה פיננסית ומסחר' },
      { id: 'physical', emoji: '💪', text: 'משמעת גופנית וכוח' },
      { id: 'business', emoji: '💼', text: 'עסקים ויזמות' },
      { id: 'tech',     emoji: '🤖', text: 'טכנולוגיה ו-AI' },
    ],
  },
  {
    step: 2, emoji: '⚡',
    question: 'איך אתה לומד הכי טוב?',
    options: [
      { id: 'practical', emoji: '🔧', text: 'יישום מיידי — כלים ועשייה' },
      { id: 'deep',      emoji: '📚', text: 'הבנה עמוקה — עקרונות קודם' },
      { id: 'challenge', emoji: '🔥', text: 'אתגר — ישר לעומק' },
    ],
  },
  {
    step: 3, emoji: '🚀',
    question: 'מה רמת הניסיון שלך?',
    options: [
      { id: 'beginner',     emoji: '🌱', text: 'מתחיל — בונה בסיס' },
      { id: 'intermediate', emoji: '⚡', text: 'בינוני — רוצה להתקדם' },
      { id: 'advanced',     emoji: '🚀', text: 'מתקדם — רוצה לשלוט' },
    ],
  },
]

function computeRecommendations(answers) {
  const [goal, style, level] = answers
  const scores = Object.fromEntries(CHALLENGES.map(ch => [ch.id, 0]))

  const goalMap = {
    finance:  { 'capital-markets': 4, 'business-mind': 2, 'deal-closer': 2, 'self-discipline': 1 },
    physical: { 'self-discipline': 4, 'business-soul': 2, 'capital-markets': 1 },
    business: { 'business-mind': 4, 'deal-closer': 3, 'product-builder': 3, 'business-soul': 2, 'self-discipline': 1 },
    tech:     { 'ai-beginners': 4, 'ai-pioneer': 3, 'claude-code-mastery': 3, 'product-builder': 2 },
  }
  const styleMap = {
    practical: { 'ai-beginners': 2, 'deal-closer': 2, 'capital-markets': 2, 'product-builder': 1 },
    deep:      { 'self-discipline': 2, 'business-soul': 2, 'business-mind': 1, 'ai-pioneer': 1 },
    challenge: { 'claude-code-mastery': 3, 'ai-pioneer': 2, 'capital-markets': 1, 'self-discipline': 1 },
  }
  const levelMap = {
    beginner:     { 'ai-beginners': 2, 'self-discipline': 2, 'business-soul': 1, 'claude-code-mastery': -2, 'ai-pioneer': -1 },
    intermediate: { 'business-mind': 2, 'deal-closer': 2, 'capital-markets': 1, 'product-builder': 1 },
    advanced:     { 'claude-code-mastery': 3, 'ai-pioneer': 2, 'business-mind': 1, 'capital-markets': 1 },
  }

  for (const map of [goalMap[goal], styleMap[style], levelMap[level]]) {
    if (!map) continue
    for (const [id, pts] of Object.entries(map)) {
      if (id in scores) scores[id] += pts
    }
  }

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => id)
}

function loadQuizData() {
  try { return JSON.parse(localStorage.getItem(QUIZ_KEY)) } catch { return null }
}
function saveQuizData(recs) {
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify({ v: 1, recommendations: recs })) } catch {}
}

// ── Course Quiz ────────────────────────────────────────────────────

function CourseQuiz({ onComplete, onSkip }) {
  const [step,      setStep]      = useState(0)
  const [answers,   setAnswers]   = useState([])
  const [revealing, setRevealing] = useState(false)
  const [recs,      setRecs]      = useState([])

  const q = QUIZ_QUESTIONS[step]

  function handleAnswer(optionId) {
    const next = [...answers, optionId]
    if (step < QUIZ_QUESTIONS.length - 1) {
      setAnswers(next)
      setStep(s => s + 1)
    } else {
      const computed = computeRecommendations(next)
      setRecs(computed)
      setRevealing(true)
      setTimeout(() => onComplete(computed), 2400)
    }
  }

  if (revealing) {
    const matched = CHALLENGES.filter(ch => recs.includes(ch.id))
    return (
      <div style={{ padding: '2.5rem 0', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '0.65rem' }}>✨</div>
          <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.2rem', margin: '0 0 0.4rem' }}>מצאנו את המסלולים שלך</h2>
          <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
            3 מסלולים שמתאימים בדיוק למטרות שלך
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {matched.map((ch, i) => (
            <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.95rem 1.1rem', borderRadius: 16, background: `${ch.color}12`, border: `1px solid ${ch.color}30`, animation: `slide-up 0.3s ${i * 0.1}s ease both` }}>
              <span style={{ fontSize: '1.45rem', flexShrink: 0 }}>{ch.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>{ch.title}</div>
                <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.68rem', marginTop: '0.1rem' }}>{ch.subtitle}</div>
              </div>
              <span style={{ background: 'linear-gradient(135deg,#c4795a,#d4956e)', borderRadius: 20, padding: '0.15rem 0.55rem', color: '#fff', fontSize: '0.6rem', fontWeight: 900, flexShrink: 0 }}>#{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0', animation: 'fadeIn 0.25s ease' }}>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2.25rem' }}>
        {QUIZ_QUESTIONS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? '#c4795a' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Question */}
      <div style={{ marginBottom: '1.85rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.65rem', lineHeight: 1 }}>{q.emoji}</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.2rem', margin: '0 0 0.3rem', lineHeight: 1.3 }}>{q.question}</h2>
        <p style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.72rem', margin: 0 }}>שלב {q.step} מתוך {QUIZ_QUESTIONS.length}</p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {q.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleAnswer(opt.id)}
            className="btn-tactile"
            style={{ display: 'flex', alignItems: 'center', gap: '0.95rem', padding: '1rem 1.2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', width: '100%', textAlign: 'right' }}
          >
            <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>{opt.emoji}</span>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{opt.text}</span>
            <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.85rem', flexShrink: 0 }}>←</span>
          </button>
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.2)', fontSize: '0.73rem', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', padding: '1.5rem 0 0' }}
      >
        דלג על השאלון
      </button>
    </div>
  )
}

// ── Locked Course Modal ────────────────────────────────────────────

// ── Review Modal (past lessons only) ──────────────────────────────

function ReviewModal({ challenge, dayNum, onClose }) {
  const lessonType  = getLessonType(dayNum)
  const moduleTheme = getDayTask(challenge.id, dayNum)
  const col         = challenge.color

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#13131f', borderRadius: '22px 22px 0 0', padding: '1.5rem 1.5rem 2.8rem', borderTop: `2.5px solid ${col}45`, maxHeight: '80vh', overflowY: 'auto', animation: 'slide-up 0.28s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{lessonType.icon}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem' }}>{lessonType.label}</div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {challenge.emoji} {challenge.title} · יום {dayNum}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(241,245,249,0.55)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ background: `${col}0e`, border: `1px solid ${col}22`, borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>🎯 משימת היום</div>
          <p style={{ color: '#f1f5f9', fontSize: '0.92rem', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>{moduleTheme}</p>
        </div>

        <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.16)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>💡</span>
          <p style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>{lessonType.insight}</p>
        </div>

        <div style={{ marginTop: '1.1rem', textAlign: 'center' }}>
          <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>✓ שיעור זה הושלם</span>
        </div>
      </div>
    </div>
  )
}

// ── Course Dashboard ───────────────────────────────────────────────

function CourseDashboard({ challenge, progress, onBack, onLessonComplete, isRecommended }) {
  const [reflection,   setReflection]   = useState('')
  const [completing,   setCompleting]   = useState(false)
  const [completedNow, setCompletedNow] = useState(false)
  const [showSyllabus, setShowSyllabus] = useState(false)
  const [reviewDay,    setReviewDay]    = useState(null)

  const col              = challenge.color
  const rawDaysCompleted = progress?.daysCompleted || 0
  const daysFloor        = useRef(rawDaysCompleted)
  daysFloor.current      = Math.max(daysFloor.current, rawDaysCompleted)
  const daysCompleted    = daysFloor.current
  const finished         = daysCompleted >= challenge.days
  const doneToday     = progress?.lastCompletedDate === todayKey()
  const pct           = Math.round((daysCompleted / challenge.days) * 100)

  const currentDay   = Math.min(daysCompleted + 1, challenge.days)
  const lessonType   = getLessonType(currentDay)
  const moduleTheme  = getDayTask(challenge.id, currentDay)
  const moduleIdx    = getModuleIndex(currentDay)
  const dayInModule  = (currentDay - 1) % 5
  const modules      = CHALLENGE_WEEKS[challenge.id] || []
  const richContent  = getDayContent(challenge.id, moduleIdx, dayInModule)
  const microTaskPh  = richContent?.microTask || 'מה באמת נשאר אתך? תהיה כן — אפילו משפט אחד אמיתי עדיף על פסקה מלוטשת.'
  const reflLen      = reflection.trim().length
  const reflWords    = hasValidWordCount(reflection)
  const canSubmit    = reflLen >= MIN_REFLECTION && reflWords

  function handleComplete() {
    if (!canSubmit || completing || doneToday) return
    setCompleting(true)
    setCompletedNow(true)
    setTimeout(() => onLessonComplete(challenge, currentDay, reflection), 1400)
  }

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>

      {/* ── Hero header ── */}
      <div style={{ background: `linear-gradient(160deg,${col}16 0%,${col}05 65%,transparent 100%)`, borderBottom: `1px solid ${col}1a`, padding: '1rem 1.25rem 1.2rem' }}>

        <button
          onClick={onBack}
          className="btn-tactile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '0.38rem 0.85rem', color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem' }}
        >
          ← מסלולים
        </button>

        {/* Track identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.1rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${col}20`, border: `1.5px solid ${col}32`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.85rem', flexShrink: 0 }}>
            {challenge.emoji}
          </div>
          <div style={{ flex: 1 }}>
            {isRecommended && (
              <div style={{ marginBottom: '0.22rem' }}>
                <span style={{ background: 'linear-gradient(90deg,#c4795a,#d4956e)', borderRadius: 20, padding: '0.1rem 0.5rem', color: '#fff', fontSize: '0.57rem', fontWeight: 800 }}>✨ מותאם עבורך</span>
              </div>
            )}
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.2 }}>{challenge.title}</div>
            <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.72rem', marginTop: '0.12rem' }}>{challenge.subtitle}</div>
          </div>
        </div>

        {/* Segmented module progress */}
        <div style={{ display: 'flex', gap: 3, marginBottom: '0.5rem' }}>
          {modules.map((_, i) => {
            const segStart = i * 5
            const segDone  = Math.min(Math.max(0, daysCompleted - segStart), 5)
            const isCurMod = daysCompleted >= segStart && daysCompleted < segStart + 5
            return (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', outline: isCurMod ? `1.5px solid ${col}50` : 'none', outlineOffset: 1, direction: 'ltr' }}>
                <div style={{ height: '100%', width: `${(segDone / 5) * 100}%`, background: `linear-gradient(90deg,${col}99,${col})`, borderRadius: 99 }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: col, fontSize: '0.63rem', fontWeight: 800 }}>
            {finished ? '✓ הושלם' : daysCompleted === 0 ? `יום 1 / ${challenge.days}` : `יום ${currentDay} / ${challenge.days} · ${daysCompleted} הושלמו`}
          </span>
          <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.6rem' }}>
            מודול {moduleIdx + 1} / {modules.length} · {pct}%
          </span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '1.25rem 1.25rem 0' }}>

        {/* ─── FINISHED ─── */}
        {finished ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏆</div>
            <h2 style={{ color: col, fontWeight: 900, fontSize: '1.3rem', margin: '0 0 0.5rem' }}>השלמת את {challenge.title}!</h2>
            <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
              {challenge.days} ימים · {challenge.days * challenge.xpPerDay} XP · אתה לא אותו אדם שהתחיל.
            </p>
          </div>

        /* ─── DONE TODAY ─── */
        ) : (doneToday || completedNow) ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.65rem' }}>✅</div>
            <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1.15rem', marginBottom: '0.4rem' }}>יום {daysCompleted} הושלם!</div>
            <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              חזור מחר ליום {daysCompleted + 1} · {pct}% מהמסלול מאחוריך
            </div>
            {daysCompleted > 0 && daysCompleted % 5 === 0 && (
              <div style={{ marginTop: '1.1rem', display: 'inline-block', background: `${col}12`, border: `1px solid ${col}28`, borderRadius: 14, padding: '0.75rem 1.2rem' }}>
                <span style={{ color: col, fontWeight: 800, fontSize: '0.88rem' }}>🎖 מודול {moduleIdx} הושלם!</span>
              </div>
            )}
          </div>

        /* ─── ACTIVE LESSON ─── */
        ) : (
          <>
            {/* ── Lesson header chip ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: `${col}14`, border: `1px solid ${col}28`, borderRadius: 20, padding: '0.28rem 0.75rem' }}>
                <span style={{ fontSize: '0.85rem' }}>{lessonType.icon}</span>
                <span style={{ color: col, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lessonType.label}</span>
              </div>
              <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.6rem' }}>יום {currentDay} · מודול {moduleIdx + 1}</span>
            </div>

            {richContent ? (
              <>
                {/* ── 1. השורה התחתונה ── */}
                <div style={{ background: `${col}0d`, border: `1.5px solid ${col}28`, borderRadius: 16, padding: '1rem 1.15rem', marginBottom: '0.75rem' }}>
                  <div style={{ color: col, fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>
                    📌 השורה התחתונה
                  </div>
                  <p style={{ color: '#f1f5f9', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.65, margin: 0 }}>{richContent.bottomLine}</p>
                </div>

                {/* ── 2. פרקטיקה בשטח ── */}
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem 1.15rem', marginBottom: '0.75rem' }}>
                  <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.65rem' }}>
                    ⚡ פרקטיקה בשטח
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {(richContent.fieldAction || []).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 20, height: 20, borderRadius: '50%', background: `${col}22`, border: `1px solid ${col}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 900, color: col, flexShrink: 0, marginTop: '0.05rem' }}>
                          {i + 1}
                        </div>
                        <p style={{ color: 'rgba(241,245,249,0.82)', fontSize: '0.83rem', lineHeight: 1.6, margin: 0 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 3. דוגמה אמיתית ── */}
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 16, padding: '1rem 1.15rem', marginBottom: '0.75rem' }}>
                  <div style={{ color: 'rgba(251,191,36,0.7)', fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>
                    🌍 דוגמה אמיתית
                  </div>
                  <p style={{ color: 'rgba(241,245,249,0.7)', fontSize: '0.83rem', lineHeight: 1.65, margin: 0 }}>{richContent.realExample}</p>
                </div>
              </>
            ) : (
              /* Fallback for courses without rich content yet */
              <div style={{ background: `linear-gradient(145deg,${col}0e,${col}04)`, border: `1.5px solid ${col}26`, borderRadius: 16, padding: '1.1rem 1.15rem', marginBottom: '0.75rem' }}>
                <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.6rem' }}>
                  🎯 המשימה שלך היום
                </div>
                <p style={{ color: '#f1f5f9', fontSize: '0.97rem', fontWeight: 700, lineHeight: 1.65, margin: '0 0 1rem' }}>{moduleTheme}</p>
                <div style={{ background: 'rgba(251,191,36,0.055)', border: '1px solid rgba(251,191,36,0.14)', borderRadius: 11, padding: '0.7rem 0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>💡</span>
                  <p style={{ color: 'rgba(241,245,249,0.52)', fontSize: '0.77rem', lineHeight: 1.58, margin: 0 }}>{lessonType.insight}</p>
                </div>
              </div>
            )}

            {/* ── 4. משימת היום / Reflection ── */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                ✍️ משימת היום
              </div>
              {richContent && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.65rem 0.85rem', marginBottom: '0.55rem' }}>
                  <p style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.76rem', lineHeight: 1.6, margin: 0 }}>{richContent.microTask}</p>
                </div>
              )}
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder={microTaskPh}
                rows={3}
                className="glow-input"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 0.95rem', borderRadius: 12, border: `1px solid ${canSubmit ? col + '50' : reflLen >= MIN_REFLECTION ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.55, marginBottom: '0.35rem', transition: 'border-color 0.2s' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.62rem', color: canSubmit ? '#10b981' : reflLen >= MIN_REFLECTION && !reflWords ? '#f5c518' : 'rgba(241,245,249,0.18)' }}>
                  {canSubmit ? `✓ ${reflLen} תווים` : reflLen >= MIN_REFLECTION && !reflWords ? 'נדרשות לפחות 5 מילים לתשובה אמיתית' : `${reflLen} / ${MIN_REFLECTION} תווים`}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'rgba(241,245,249,0.18)' }}>
                  +{challenge.xpPerDay} XP
                </span>
              </div>
            </div>

            {/* Completion CTA */}
            <button
              onClick={handleComplete}
              disabled={!canSubmit || completing}
              className="btn-tactile"
              style={{ width: '100%', padding: '1.1rem', borderRadius: 16, border: 'none', fontSize: '1rem', fontWeight: 800, cursor: canSubmit && !completing ? 'pointer' : 'not-allowed', marginBottom: '1rem', background: canSubmit ? `linear-gradient(135deg,${col}cc,${col})` : 'rgba(255,255,255,0.05)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s', boxShadow: canSubmit ? `0 8px 28px ${col}30` : 'none' }}
            >
              {completing ? '⏳ שומר...' : `✅ סיים שיעור ${currentDay} · +${challenge.xpPerDay} XP`}
            </button>
          </>
        )}

        {/* ── Curriculum accordion ── */}
        <button
          onClick={() => setShowSyllabus(v => !v)}
          className="btn-tactile"
          style={{ width: '100%', padding: '0.65rem', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: 'rgba(241,245,249,0.28)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: showSyllabus ? '0.9rem' : 0 }}
        >
          {showSyllabus ? '▲' : '▼'} תכנית הלימודים — {modules.length} מודולים · {challenge.days} שיעורים
        </button>

        {showSyllabus && (
          <div style={{ animation: 'fadeIn 0.22s ease' }}>
            {modules.map((modText, mIdx) => {
              const startDay      = mIdx * 5 + 1
              const moduleDone    = daysCompleted >= startDay + 4
              const moduleLocked  = daysCompleted < startDay - 1
              const moduleActive  = !moduleDone && !moduleLocked

              return (
                <div key={mIdx} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: moduleDone ? 'rgba(16,185,129,0.16)' : moduleLocked ? 'rgba(255,255,255,0.04)' : `${col}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: moduleDone ? '#10b981' : moduleLocked ? 'rgba(255,255,255,0.16)' : col }}>
                      {moduleDone ? '✓' : mIdx + 1}
                    </div>
                    <span style={{ color: moduleLocked ? 'rgba(241,245,249,0.18)' : moduleDone ? 'rgba(241,245,249,0.38)' : '#f1f5f9', fontSize: '0.78rem', fontWeight: 700 }}>מודול {mIdx + 1}</span>
                    <span style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.66rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {modText.slice(0, 38)}{modText.length > 38 ? '…' : ''}</span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    {LESSON_TYPES.map((lt, dayOffset) => {
                      const dayNum    = startDay + dayOffset
                      const completed = daysCompleted >= dayNum
                      const isCurrent = daysCompleted === dayNum - 1
                      const locked    = !completed && !isCurrent

                      return (
                        <div
                          key={dayNum}
                          onClick={() => completed && setReviewDay(dayNum)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', borderBottom: dayOffset < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: completed ? 'pointer' : 'default', background: isCurrent ? `${col}0c` : 'transparent' }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: completed ? '0.72rem' : '0.85rem', background: completed ? 'rgba(16,185,129,0.1)' : isCurrent ? `${col}1c` : 'rgba(255,255,255,0.03)', border: isCurrent ? `1px solid ${col}32` : 'none' }}>
                            {completed ? '✓' : locked ? '🔒' : lt.icon}
                          </div>
                          <span style={{ flex: 1, color: locked ? 'rgba(241,245,249,0.18)' : completed ? 'rgba(241,245,249,0.38)' : '#f1f5f9', fontSize: '0.77rem', fontWeight: isCurrent ? 700 : 400 }}>
                            יום {dayNum} · {lt.label}
                          </span>
                          {isCurrent && <span style={{ background: `${col}1c`, border: `1px solid ${col}35`, borderRadius: 20, padding: '0.08rem 0.4rem', color: col, fontSize: '0.57rem', fontWeight: 800, flexShrink: 0 }}>היום ↑</span>}
                          {completed && <span style={{ color: 'rgba(16,185,129,0.6)', fontSize: '0.62rem', flexShrink: 0 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>

      {reviewDay !== null && (
        <ReviewModal
          challenge={challenge}
          dayNum={reviewDay}
          onClose={() => setReviewDay(null)}
        />
      )}
    </div>
  )
}

// ── 4-Pillar definitions ─────────────────────────────────────────

const PILLARS = [
  {
    id: 'builder',
    label: 'The Builder',
    icon: '🛠️',
    color: '#6366f1',
    desc: 'AI, עסקים, צמיחה כלכלית',
    longDesc: 'בנה מיומנויות AI, עסקים ומסחר. זו העמודה שמכניסה כסף ובונה עתיד.',
    courseIds: ['ai-beginners', 'ai-pioneer', 'business-mind', 'claude-code-mastery', 'capital-markets'],
  },
  {
    id: 'creator',
    label: 'The Creator',
    icon: '🎨',
    color: '#ec4899',
    desc: 'יצירה, מותג, ביטוי עצמי',
    longDesc: 'פתח את היצירתיות שלך. מותג, עיצוב, ובניית נשמת העסק.',
    courseIds: ['product-builder', 'business-soul'],
  },
  {
    id: 'reset',
    label: 'The Reset',
    icon: '🧘',
    color: '#10b981',
    desc: 'משמעת, בהירות, שקט מנטלי',
    longDesc: 'משמעת עצמית ובהירות מנטלית. בלי זה — שאר העמודות קורסות.',
    courseIds: ['self-discipline'],
  },
  {
    id: 'connection',
    label: 'The Connection',
    icon: '💛',
    color: '#f59e0b',
    desc: 'מכירות, יחסים, נוכחות',
    longDesc: 'יחסים, מכירות ונוכחות אנושית. כי ההצלחה לבד היא ריקה.',
    courseIds: ['deal-closer'],
  },
]

// ── TracksPage ─────────────────────────────────────────────────────

export default function TracksPage({ profile, onAwardXP, onSaveProfile }) {
  const { user, isGuest }                      = useAuth()
  const { prefs }                              = useUserPrefs()
  const [selected,      setSelected]           = useState(null)
  const [activePillar,  setActivePillar]       = useState(null)
  const [showQuiz,      setShowQuiz]           = useState(false)
  const [quizRecs, setQuizRecs] = useState(() => loadQuizData()?.recommendations || [])

  const fallbackRec    = prefs.recommendedTrack || profile?.preferences?.recommendedTrack
  const recommendedIds = quizRecs.length > 0 ? quizRecs : (fallbackRec ? [fallbackRec] : [])

  function getProgress(id) { return profile?.challenges?.[id] }

  function handleSelect(ch) { setSelected(ch) }

  async function handleQuizComplete(recs) {
    saveQuizData(recs)
    setQuizRecs(recs)
    setShowQuiz(false)
    const topRec = recs[0]
    if (topRec) {
      const p = PILLARS.find(pl => pl.courseIds.includes(topRec))
      if (p) setActivePillar(p.id)
    }
    if (!isGuest && user) {
      await saveProfile(user.uid, { trackQuizRecs: recs }).catch(() => {})
    }
  }

  async function handleLessonComplete(challenge, dayNum, reflection) {
    if (isGuest) { onAwardXP(challenge.xpPerDay, true); return }
    const today  = todayKey()
    const prev   = profile?.challenges?.[challenge.id] || {}
    if (prev.lastCompletedDate === today) return
    const daysCompleted   = Math.min((prev.daysCompleted || 0) + 1, challenge.days)
    const challengeUpdate = { ...(profile?.challenges || {}), [challenge.id]: { daysCompleted, lastCompletedDate: today } }
    onSaveProfile({ challenges: challengeUpdate })
    if (!isGuest) await saveProfile(user.uid, { challenges: challengeUpdate }).catch(() => {})
    onAwardXP(challenge.xpPerDay, false)
  }

  const TAB_H = 64
  const PAD   = `1.5rem 1.25rem ${TAB_H + 24}px`

  // ── View: Course Dashboard ────────────────────────────────────────
  if (selected) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: TAB_H + 24 }}>
        <CourseDashboard
          challenge={selected}
          progress={getProgress(selected.id)}
          isRecommended={recommendedIds.includes(selected.id)}
          onBack={() => setSelected(null)}
          onLessonComplete={handleLessonComplete}
        />
      </div>
    )
  }

  // ── View: Quiz (opt-in only) ──────────────────────────────────────
  if (showQuiz) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: PAD }}>
        <button
          onClick={() => setShowQuiz(false)}
          className="btn-tactile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '0.38rem 0.85rem', color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.5rem' }}
        >
          ← חזור
        </button>
        <CourseQuiz onComplete={handleQuizComplete} onSkip={() => setShowQuiz(false)} />
      </div>
    )
  }

  // ── View: Pillar drill-down ───────────────────────────────────────
  if (activePillar) {
    const pillar  = PILLARS.find(p => p.id === activePillar)
    const courses = CHALLENGES.filter(ch => pillar.courseIds.includes(ch.id))

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: PAD, animation: 'slide-up 0.28s ease both' }}>

        <button
          onClick={() => setActivePillar(null)}
          className="btn-tactile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '0.38rem 0.85rem', color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1.25rem' }}
        >
          ← 4 עמודות
        </button>

        <div style={{ background: `linear-gradient(145deg,${pillar.color}12,${pillar.color}06)`, border: `1.5px solid ${pillar.color}28`, borderRadius: 18, padding: '1.1rem 1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${pillar.color}20`, border: `1px solid ${pillar.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', flexShrink: 0 }}>{pillar.icon}</div>
          <div>
            <div style={{ color: pillar.color, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>עמודה</div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem', marginBottom: '0.15rem' }}>{pillar.label}</div>
            <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.73rem', lineHeight: 1.4 }}>{pillar.longDesc}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {courses.map(ch => {
            const prog  = getProgress(ch.id)
            const days  = prog?.daysCompleted || 0
            const pct   = Math.round((days / ch.days) * 100)
            const isRec = recommendedIds?.includes(ch.id)
            const done  = days >= ch.days
            const inProgress = days > 0 && !done

            return (
              <div
                key={ch.id}
                className="track-card"
                onClick={() => handleSelect(ch)}
                style={{
                  background: inProgress
                    ? `linear-gradient(135deg,${ch.color}0e,rgba(255,255,255,0.02))`
                    : isRec
                      ? `linear-gradient(135deg,${ch.color}0a,rgba(255,255,255,0.018))`
                      : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${inProgress ? ch.color + '30' : isRec ? ch.color + '20' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 18,
                  padding: '1.1rem 1.2rem',
                  boxShadow: inProgress ? `0 4px 22px ${ch.color}12` : isRec ? `0 4px 22px ${ch.color}08` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: `${ch.color}1e`, border: `1px solid ${ch.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.55rem', flexShrink: 0 }}>
                    {ch.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.12rem' }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>{ch.title}</span>
                      {isRec && !done && <span style={{ background: 'linear-gradient(90deg,#c4795a,#d4956e)', borderRadius: 20, padding: '0.1rem 0.45rem', color: '#fff', fontSize: '0.57rem', fontWeight: 800 }}>✨ בשבילך</span>}
                      {ch.expert && !done && <span style={{ background: 'linear-gradient(90deg,#0e7490,#06b6d4)', borderRadius: 20, padding: '0.1rem 0.45rem', color: '#fff', fontSize: '0.57rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: '0.06em' }}>EXPERT</span>}
                      {done && <span style={{ color: '#10b981', fontSize: '0.57rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', borderRadius: 20, padding: '0.1rem 0.4rem' }}>✓ הושלם</span>}
                      {inProgress && <span style={{ color: ch.color, fontSize: '0.57rem', fontWeight: 800, background: `${ch.color}12`, border: `1px solid ${ch.color}28`, borderRadius: 20, padding: '0.1rem 0.45rem' }}>פעיל</span>}
                    </div>
                    <div style={{ color: 'rgba(241,245,249,0.27)', fontSize: '0.68rem' }}>{ch.subtitle}</div>
                    {days > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.45rem' }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', direction: 'ltr', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${ch.color}80,${ch.color})`, width: `${pct}%` }} />
                        </div>
                        <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.6rem', fontWeight: 700 }}>{days}/{ch.days}d</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ color: ch.color, fontSize: '0.68rem', fontWeight: 800 }}>+{ch.xpPerDay} XP</div>
                    <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.58rem' }}>/ יום</div>
                    <div style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.58rem', marginTop: '0.22rem' }}>{ch.days} שיעורים →</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── View: 4-Pillar Grid (default / root) ─────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: PAD, animation: 'slide-up 0.28s ease both' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.35rem' }}>◈ 4 עמודות החיים</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.15rem', margin: '0 0 0.25rem' }}>בחר עמודה. בנה את הגרסה הבאה שלך.</h2>
        <p style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.78rem', margin: 0 }}>כל עמודה — מסלול עמוק של 30 יום.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {PILLARS.map(p => {
          const pillarCourses = CHALLENGES.filter(ch => p.courseIds.includes(ch.id))
          const totalDays     = pillarCourses.reduce((s, ch) => s + (getProgress(ch.id)?.daysCompleted || 0), 0)
          const totalPossible = pillarCourses.reduce((s, ch) => s + ch.days, 0)
          const pct           = totalPossible > 0 ? Math.round((totalDays / totalPossible) * 100) : 0

          return (
            <button
              key={p.id}
              className="btn-tactile"
              onClick={() => setActivePillar(p.id)}
              style={{
                background: `linear-gradient(145deg,${p.color}12,${p.color}06)`,
                border: `1.5px solid ${p.color}30`,
                borderRadius: 20,
                padding: '1.25rem 1rem',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: `0 4px 20px ${p.color}10`,
                transition: 'all 0.18s ease',
                minHeight: 130,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${p.color}08 50%,transparent 60%)`, animation: 'shimmer 3s ease-in-out infinite', pointerEvents: 'none' }} />
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{p.icon}</span>
              <span style={{ color: p.color, fontSize: '0.82rem', fontWeight: 900, letterSpacing: '-0.01em' }}>{p.label}</span>
              <span style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.65rem', lineHeight: 1.35 }}>{p.desc}</span>
              {pct > 0 ? (
                <div style={{ width: '100%', marginTop: '0.3rem' }}>
                  <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', direction: 'ltr', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg,${p.color}88,${p.color})` }} />
                  </div>
                  <div style={{ color: `${p.color}99`, fontSize: '0.58rem', marginTop: '0.2rem', fontWeight: 700 }}>{pct}%</div>
                </div>
              ) : (
                <div style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.6rem', marginTop: '0.2rem' }}>{pillarCourses.length} מסלולים</div>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setShowQuiz(true)}
        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, width: '100%', padding: '0.75rem', color: 'rgba(241,245,249,0.28)', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
      >
        לא בטוח מאיפה להתחיל?
        <span style={{ color: 'rgba(196,121,90,0.65)' }}>ענה על שאלון קצר ←</span>
      </button>

    </div>
  )
}
