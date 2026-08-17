import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUserPrefs } from '../context/UserContext'
import { saveProfile } from '../services/focusTriggerService'
import { CHALLENGES, CHALLENGE_WEEKS, LESSON_TYPES, getDayTask, getLessonType, getModuleIndex } from '../data/challenges'
import { getDayContent } from '../data/lessonContent'
import BenchmarkTracker from '../components/BenchmarkTracker'

const todayKey = () => new Date().toISOString().slice(0, 10)
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
    physical: { 'self-discipline': 6, 'business-soul': -3, 'capital-markets': -3, 'business-mind': -3, 'deal-closer': -2 },
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
    const matched = recs.map(id => CHALLENGES.find(ch => ch.id === id)).filter(Boolean)
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
            <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.85rem', flexShrink: 0 }}>→</span>
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
  const [completing,   setCompleting]   = useState(false)
  const [completedNow, setCompletedNow] = useState(false)
  const [showSyllabus, setShowSyllabus] = useState(false)
  const [reviewDay,    setReviewDay]    = useState(null)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  const col              = challenge.color
  const rawDaysCompleted = progress?.daysCompleted || 0
  const daysFloor        = useRef(rawDaysCompleted)
  daysFloor.current      = Math.max(daysFloor.current, rawDaysCompleted)
  const daysCompleted    = daysFloor.current
  const finished         = daysCompleted >= challenge.days
  const doneToday     = progress?.lastCompletedDate === todayKey()
  const pct           = Math.round((daysCompleted / challenge.days) * 100)

  const currentDay   = Math.min(daysCompleted + 1, challenge.days)
  const _lessonType  = getLessonType(currentDay)
  const moduleTheme  = getDayTask(challenge.id, currentDay)
  const moduleIdx    = getModuleIndex(currentDay)
  const dayInModule  = (currentDay - 1) % 5
  const modules      = CHALLENGE_WEEKS[challenge.id] || []
  const richContent  = getDayContent(challenge.id, moduleIdx, dayInModule)

  function handleComplete() {
    if (completing || doneToday) return
    setCompleting(true)
    setCompletedNow(true)
    setTimeout(() => onLessonComplete(challenge, currentDay, ''), 500)
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
          → מסלולים
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
              {challenge.days} ימים · {challenge.days * challenge.xpPerDay} XP · גדלת. 🌟
            </p>
          </div>

        /* ─── DONE TODAY ─── */
        ) : (doneToday || completedNow) ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.65rem' }}>✅</div>
            <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1.15rem', marginBottom: '0.4rem' }}>🎉 יום {daysCompleted} הושלם!</div>
            <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              חזור מחר — ממשיכים לנצח! 🚀 · {pct}% הושלם
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
            {/* All steps */}
            <div style={{ background: `${col}0a`, border: `1.5px solid ${col}28`, borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '0.75rem' }}>
              <p style={{ color: col, fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                ⚡ משימות יום {currentDay}
              </p>
              {richContent?.fieldAction?.length > 0
                ? richContent.fieldAction.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: i < richContent.fieldAction.length - 1 ? '0.7rem' : 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: `${col}22`, border: `1px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: col, marginTop: '0.1rem' }}>
                        {i + 1}
                      </div>
                      <p style={{ color: '#f1f5f9', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{step}</p>
                    </div>
                  ))
                : <p style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.5, margin: 0 }}>⚡ {moduleTheme}</p>
              }
            </div>

            {/* Real example */}
            {richContent?.realExample && (
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
                <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>📖 דוגמה אמיתית</p>
                <p style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>{richContent.realExample}</p>
              </div>
            )}

            {/* Micro task / reflection */}
            {richContent?.microTask && (
              <div style={{ background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.16)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
                <p style={{ color: 'rgba(245,197,24,0.65)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>✏️ רפלקציה</p>
                <p style={{ color: 'rgba(241,245,249,0.68)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{richContent.microTask}</p>
              </div>
            )}

            {/* Completion CTA */}
            <button
              onClick={handleComplete}
              disabled={completing}
              className="btn-tactile"
              style={{ width: '100%', padding: '1.1rem', borderRadius: 16, border: 'none', fontSize: '1rem', fontWeight: 800, cursor: completing ? 'not-allowed' : 'pointer', marginBottom: '1rem', background: `linear-gradient(135deg,${col}cc,${col})`, color: '#fff', transition: 'all 0.2s', boxShadow: `0 8px 28px ${col}30`, opacity: completing ? 0.7 : 1 }}
            >
              {completing ? '🎉' : `🔥 סיים יום ${currentDay}!`}
            </button>
          </>
        )}

        {/* ── Personal Benchmarks ── */}
        <div style={{ marginBottom: '1rem' }}>
          <BenchmarkTracker challengeId={challenge.id} color={col} />
        </div>

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
              const _moduleActive = !moduleDone && !moduleLocked

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
    label: 'הבונה',
    icon: '🛠️',
    color: '#6366f1',
    desc: 'AI, עסקים, צמיחה כלכלית',
    longDesc: 'בנה מיומנויות AI, עסקים ומסחר. זו העמודה שמכניסה כסף ובונה עתיד.',
    courseIds: ['ai-beginners', 'ai-pioneer', 'business-mind', 'claude-code-mastery', 'capital-markets'],
  },
  {
    id: 'creator',
    label: 'היוצר',
    icon: '🎨',
    color: '#ec4899',
    desc: 'יצירה, מותג, ביטוי עצמי',
    longDesc: 'פתח את היצירתיות שלך. מותג, עיצוב, ובניית נשמת העסק.',
    courseIds: ['product-builder', 'business-soul', 'ai-pioneer', 'claude-code-mastery'],
  },
  {
    id: 'reset',
    label: 'האיפוס',
    icon: '🧘',
    color: '#10b981',
    desc: 'משמעת, בהירות, שקט מנטלי',
    longDesc: 'משמעת עצמית ובהירות מנטלית. בלי זה — שאר העמודות קורסות.',
    courseIds: ['self-discipline', 'capital-markets', 'business-mind'],
  },
  {
    id: 'connection',
    label: 'הקשר',
    icon: '💛',
    color: '#f59e0b',
    desc: 'מכירות, יחסים, נוכחות',
    longDesc: 'יחסים, מכירות ונוכחות אנושית. כי ההצלחה לבד היא ריקה.',
    courseIds: ['deal-closer', 'business-mind', 'ai-beginners'],
  },
]

// ── TracksPage ─────────────────────────────────────────────────────

export default function TracksPage({ profile, onAwardXP, onSaveProfile }) {
  const { user, isGuest }                      = useAuth()
  const { prefs }                              = useUserPrefs()
  const [selected,           setSelected]           = useState(null)
  const [activePillar,       setActivePillar]       = useState(null)
  const [showQuiz,           setShowQuiz]           = useState(false)
  const [quizRecs,           setQuizRecs]           = useState(() => loadQuizData()?.recommendations || [])
  const [expandedSlot,       setExpandedSlot]       = useState(null)
  const [showTracksArchive,  setShowTracksArchive]  = useState(false)

  // Priority: Firestore trackQuizRecs (set by PathBuilder niche detection) > localStorage > legacy OnboardingFlow fallback
  const recommendedIds = (profile?.trackQuizRecs?.length > 0)
    ? profile.trackQuizRecs
    : quizRecs.length > 0
      ? quizRecs
      : (prefs.recommendedTrack || profile?.preferences?.recommendedTrack)
        ? [prefs.recommendedTrack || profile?.preferences?.recommendedTrack]
        : []

  function getProgress(id) { return profile?.challenges?.[id] }

  function handleSelect(ch) { setSelected(ch) }

  async function handleQuizComplete(recs) {
    saveQuizData(recs)
    setQuizRecs(recs)
    setShowQuiz(false)
    try {
      CHALLENGES.forEach(ch => {
        if (!recs.includes(ch.id)) localStorage.removeItem(`prime_benchmarks_${ch.id}`)
      })
    } catch {}
    const topRec = recs[0]
    if (topRec) {
      const topChallenge = CHALLENGES.find(ch => ch.id === topRec)
      if (topChallenge) setSelected(topChallenge)
    }
    if (!isGuest && user) {
      await saveProfile(user.uid, { trackQuizRecs: recs }).catch(() => {})
    }
  }

  async function handleLessonComplete(challenge, _dayNum, _reflection) {
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
          → חזור
        </button>
        <CourseQuiz onComplete={handleQuizComplete} onSkip={() => setShowQuiz(false)} />
      </div>
    )
  }

  // ── View: Pillar drill-down ───────────────────────────────────────
  if (activePillar) {
    const pillar  = PILLARS.find(p => p.id === activePillar)
    const allPillarCourses = CHALLENGES.filter(ch => pillar.courseIds.includes(ch.id))
    const courses = recommendedIds.length > 0
      ? allPillarCourses.filter(ch => recommendedIds.includes(ch.id)).length > 0
        ? allPillarCourses.filter(ch => recommendedIds.includes(ch.id))
        : allPillarCourses  // pillar has no niche match → show all (user browsing off-niche)
      : allPillarCourses

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: PAD, animation: 'slide-up 0.28s ease both' }}>

        <button
          onClick={() => setActivePillar(null)}
          className="btn-tactile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '0.38rem 0.85rem', color: 'rgba(241,245,249,0.55)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1.25rem' }}
        >
          → 4 עמודות
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
                        <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.6rem', fontWeight: 700 }}>{pct}%</span>
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

  // ── View: Daily Protocol Hub (default / root) ────────────────────
  const currentHour = new Date().getHours()
  const currentSlot = currentHour < 12 ? 'morning' : currentHour < 18 ? 'noon' : 'evening'

  const topTrackId     = recommendedIds[0]
  const topTrack       = topTrackId ? CHALLENGES.find(ch => ch.id === topTrackId) : null
  const topProgress    = topTrack ? getProgress(topTrack.id) : null
  const nextDay        = (topProgress?.daysCompleted || 0) + 1
  const todayTask      = topTrack ? getDayTask(topTrack.id, nextDay) : null
  const trackDoneToday = topProgress?.lastCompletedDate === todayKey()

  const PROTOCOL_SLOTS = [
    {
      id: 'morning', icon: '🌅', color: '#F5C518',
      title: 'פרוטוקול בוקר', subtitle: 'מיקוד ומנטליות',
      timeLabel: '06:00 – 12:00',
      steps: [
        'סקור את הוויזיה שלך ל-3 שנים — 2 דקות בלבד',
        'הגדר מטרה אחת קריטית שתבצע היום',
        'קבע מה לא ייכנס ליום שלך (Non-Negotiable)',
      ],
      cta: 'כוון את הבוקר ←',
      onCta: null,
    },
    {
      id: 'noon', icon: '⚡', color: '#fb923c',
      title: 'פרוטוקול צהריים', subtitle: 'עשייה ממוקדת',
      timeLabel: '12:00 – 18:00',
      steps: [
        'כבה הודעות — 25 דקות ללא הפרעות',
        todayTask
          ? `משימת היום: ${todayTask.length > 72 ? todayTask.slice(0, 72) + '…' : todayTask}`
          : 'בצע את משימת היום מהמסלול שלך',
        'תעד תוצאה אחת קונקרטית שביצעת בפועל',
      ],
      cta: topTrack && !trackDoneToday ? `פתח מסלול: ${topTrack.title} ←` : '⚡ התחל בלוק עשייה ←',
      onCta: topTrack && !trackDoneToday ? () => setSelected(topTrack) : null,
    },
    {
      id: 'evening', icon: '🌙', color: '#a78bfa',
      title: 'פרוטוקול ערב', subtitle: 'רפלקציה והתאוששות',
      timeLabel: '18:00 – 23:00',
      steps: [
        'מה ביצעתי היום בפועל? (עובדה, לא הערכה)',
        'מה הייתי עושה אחרת? (שיפור אחד בלבד)',
        'הגדר מטרה אחת קונקרטית לבוקר של מחר',
      ],
      cta: 'סכם את היום ←',
      onCta: null,
    },
  ]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: PAD, animation: 'slide-up 0.28s ease both' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.2rem' }}>◈ PRIME · פרוטוקול יומי</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem', margin: '0 0 0.18rem' }}>היום שלך מחכה לך.</h2>
        <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.74rem', margin: 0 }}>בחר חלק יום. התרכז בפעולה אחת. קדימה.</p>
      </div>

      {/* 3 Protocol cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {PROTOCOL_SLOTS.map(slot => {
          const isActive   = slot.id === currentSlot
          const isExpanded = expandedSlot === slot.id

          return (
            <div
              key={slot.id}
              style={{
                background: isActive
                  ? `linear-gradient(145deg,${slot.color}10,${slot.color}04)`
                  : 'rgba(255,255,255,0.025)',
                border: `1.5px solid ${isActive ? slot.color + '38' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: isActive ? `0 4px 24px ${slot.color}10` : 'none',
                transition: 'border 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Card header — always visible */}
              <button
                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                className="btn-tactile"
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  textAlign: 'right',
                }}
              >
                <span style={{ fontSize: '1.35rem', flexShrink: 0 }}>{slot.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: isActive ? slot.color : '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>{slot.title}</span>
                    {isActive && (
                      <span style={{ background: `${slot.color}18`, border: `1px solid ${slot.color}30`, borderRadius: 20, padding: '0.08rem 0.45rem', color: slot.color, fontSize: '0.52rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace" }}>עכשיו</span>
                    )}
                  </div>
                  <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.67rem', marginTop: '0.08rem' }}>
                    {slot.subtitle} · {slot.timeLabel}
                  </div>
                </div>
                <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.75rem', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '0 1rem 1rem', animation: 'fadeIn 0.18s ease' }}>

                  {/* Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.9rem' }}>
                    {slot.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: `${slot.color}18`, border: `1px solid ${slot.color}35`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.58rem', fontWeight: 900, color: slot.color, marginTop: '0.1rem',
                        }}>{i + 1}</div>
                        <p style={{ color: 'rgba(241,245,249,0.75)', fontSize: '0.82rem', lineHeight: 1.55, margin: 0 }}>{step}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={slot.onCta || undefined}
                    className="btn-tactile"
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: 13, border: 'none',
                      background: `linear-gradient(135deg,${slot.color}cc,${slot.color})`,
                      color: '#0e0e16', fontSize: '0.85rem', fontWeight: 900,
                      cursor: 'pointer', letterSpacing: '0.01em',
                    }}
                  >
                    {slot.cta}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Archive toggle */}
      <button
        onClick={() => setShowTracksArchive(v => !v)}
        className="btn-tactile"
        style={{
          width: '100%', background: 'none',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
          padding: '0.7rem', color: 'rgba(241,245,249,0.25)', fontSize: '0.7rem',
          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '0.4rem', marginBottom: showTracksArchive ? '0.85rem' : 0,
        }}
      >
        {showTracksArchive ? '▲' : '▼'}
        <span>מסלולים עמוקים — 4 עמודות · 30 יום</span>
      </button>

      {/* Collapsed archive: 4-pillar grid */}
      {showTracksArchive && (
        <div style={{ animation: 'fadeIn 0.22s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
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
                    background: `linear-gradient(145deg,${p.color}10,${p.color}05)`,
                    border: `1.5px solid ${p.color}28`, borderRadius: 18,
                    padding: '1.1rem 0.85rem', cursor: 'pointer', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                    minHeight: 120, position: 'relative', overflow: 'hidden',
                  }}
                >
                  <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{p.icon}</span>
                  <span style={{ color: p.color, fontSize: '0.78rem', fontWeight: 900 }}>{p.label}</span>
                  <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.6rem', lineHeight: 1.3 }}>{p.desc}</span>
                  <div style={{ width: '100%', marginTop: '0.2rem' }}>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', direction: 'ltr', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg,${p.color}80,${p.color})` }} />
                    </div>
                    <div style={{ color: pct > 0 ? `${p.color}88` : 'rgba(241,245,249,0.15)', fontSize: '0.55rem', fontWeight: 700, marginTop: '0.15rem' }}>{pct > 0 ? `${pct}%` : `${pillarCourses.length} מסלולים`}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setShowQuiz(true)}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, width: '100%', padding: '0.65rem', color: 'rgba(241,245,249,0.22)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            לא בטוח מאיפה להתחיל?
            <span style={{ color: 'rgba(196,121,90,0.55)' }}>ענה על שאלון קצר ←</span>
          </button>
        </div>
      )}

    </div>
  )
}
