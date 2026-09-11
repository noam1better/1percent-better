import { useState, useCallback } from 'react'
import { LESSON_TOPICS } from '../data/dailyLessons'
import {
  getTodayLesson,
  getAlternativeLesson,
  markLessonOpened,
  markLessonCompleted,
  markLessonApplied,
  saveLessonFeedback,
  getTodayLessonEntry,
} from '../services/dailyLessonService'

const C = {
  bg:      '#111317',
  surface: '#17191E',
  border:  'rgba(255,255,255,0.07)',
  text:    '#F4F1E8',
  muted:   '#71717A',
  gold:    '#D9B34C',
  green:   '#3FAF7A',
  purple:  '#a78bfa',
  blue:    '#60a5fa',
}

function TopicChip({ topicId }) {
  const topic = LESSON_TOPICS.find(t => t.id === topicId)
  if (!topic) return null
  return (
    <span style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20,
      padding: '0.12rem 0.55rem',
      color: 'rgba(241,245,249,0.5)',
      fontSize: '0.62rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
    }}>
      <span>{topic.emoji}</span>
      <span>{topic.label}</span>
    </span>
  )
}

// Full lesson bottom sheet
function LessonView({ lesson, topicId, entry, onClose, onAlternative, onFeedback, onComplete, onApply }) {
  const [step,       setStep]       = useState('read')   // 'read' | 'question' | 'done'
  const [answered,   setAnswered]   = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [applied,    setApplied]    = useState(!!(entry?.appliedAt))
  const [feedbackGiven, setFeedbackGiven] = useState(entry?.feedback || null)

  const topic = LESSON_TOPICS.find(t => t.id === topicId)
  const alreadyCompleted = !!(entry?.completedAt)

  function handleScroll() {
    if (!alreadyCompleted && step === 'read') {
      setStep('question')
      onComplete()
    }
  }

  function handleAnswer() {
    setAnswered(true)
    setShowAnswer(true)
    if (step === 'question') setStep('done')
  }

  function handleApply() {
    if (applied) return
    setApplied(true)
    onApply()
  }

  function handleFeedback(type) {
    if (feedbackGiven) return
    setFeedbackGiven(type)
    onFeedback(type)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: '#131416',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem 1.25rem 2.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{topic?.emoji}</span>
            <span style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {topic?.label} · {lesson.readingMinutes} דקות
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: C.muted, fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', cursor: 'pointer', minHeight: 36 }}
          >✕ סגור</button>
        </div>

        {/* Title */}
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.35, margin: '0 0 0.75rem' }}>
          {lesson.titleHe}
        </h2>

        {/* Summary */}
        <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 1.25rem', fontStyle: 'italic' }}>
          {lesson.summaryHe}
        </p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: '1.25rem' }} />

        {/* Idea */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: C.gold, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>הרעיון המרכזי</div>
          <p style={{ color: C.text, fontSize: '0.88rem', lineHeight: 1.65, margin: 0, fontWeight: 600 }}>{lesson.ideaHe}</p>
        </div>

        {/* Explanation */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ color: C.blue, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>ההסבר</div>
          <p style={{ color: 'rgba(244,241,232,0.8)', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>{lesson.explanationHe}</p>
        </div>

        {/* Example */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ color: C.green, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>דוגמה מהחיים</div>
          <p style={{ color: 'rgba(244,241,232,0.7)', fontSize: '0.83rem', lineHeight: 1.65, margin: 0 }}>{lesson.exampleHe}</p>
        </div>

        {/* Comprehension question */}
        {(step !== 'read' || alreadyCompleted) && (
          <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, padding: '0.9rem 1rem', marginBottom: '1.1rem', animation: 'slide-up 0.22s ease' }}>
            <div style={{ color: C.purple, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>שאלת הבנה</div>
            <p style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.75rem', fontWeight: 600 }}>{lesson.questionHe}</p>

            {!answered && !alreadyCompleted && (
              <button
                onClick={handleAnswer}
                style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, color: C.purple, fontSize: '0.8rem', fontWeight: 700, padding: '0.55rem 1rem', cursor: 'pointer', width: '100%' }}
              >
                הצג תשובה
              </button>
            )}

            {(showAnswer || alreadyCompleted) && (
              <div style={{ background: 'rgba(63,175,122,0.07)', border: '1px solid rgba(63,175,122,0.2)', borderRadius: 10, padding: '0.7rem 0.85rem', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ color: C.green, fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>✓ תשובה</div>
                <p style={{ color: 'rgba(244,241,232,0.75)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{lesson.answerHe}</p>
              </div>
            )}
          </div>
        )}

        {/* Scroll-to-reveal prompt */}
        {step === 'read' && !alreadyCompleted && (
          <button
            onClick={handleScroll}
            style={{ width: '100%', background: 'rgba(217,179,76,0.08)', border: '1px solid rgba(217,179,76,0.2)', borderRadius: 12, color: C.gold, fontSize: '0.85rem', fontWeight: 700, padding: '0.85rem', cursor: 'pointer', marginBottom: '0.75rem' }}
          >
            קראתי — הצג שאלת הבנה ←
          </button>
        )}

        {/* Optional action */}
        {(step === 'done' || alreadyCompleted) && lesson.actionHe && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${applied ? 'rgba(63,175,122,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1.1rem', animation: 'slide-up 0.22s ease' }}>
            <div style={{ color: C.muted, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>פעולה קטנה — רשות</div>
            <p style={{ color: 'rgba(244,241,232,0.7)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 0.65rem' }}>{lesson.actionHe}</p>
            <button
              onClick={handleApply}
              disabled={applied}
              style={{
                background: applied ? 'rgba(63,175,122,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${applied ? 'rgba(63,175,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                color: applied ? C.green : C.muted,
                fontSize: '0.75rem', fontWeight: 700,
                padding: '0.4rem 0.85rem',
                cursor: applied ? 'default' : 'pointer',
              }}
            >
              {applied ? '✓ ביצעתי את הפעולה' : 'ביצעתי ←'}
            </button>
          </div>
        )}

        {/* Feedback */}
        {(step === 'done' || alreadyCompleted) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', animation: 'fadeIn 0.3s ease' }}>
            <button
              onClick={() => handleFeedback('more')}
              style={{
                flex: 1, background: feedbackGiven === 'more' ? 'rgba(63,175,122,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${feedbackGiven === 'more' ? 'rgba(63,175,122,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, color: feedbackGiven === 'more' ? C.green : C.muted,
                fontSize: '0.78rem', fontWeight: 700, padding: '0.55rem', cursor: feedbackGiven ? 'default' : 'pointer',
              }}
            >👍 עוד כאלה</button>
            <button
              onClick={() => handleFeedback('less')}
              style={{
                flex: 1, background: feedbackGiven === 'less' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${feedbackGiven === 'less' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, color: feedbackGiven === 'less' ? '#f87171' : C.muted,
                fontSize: '0.78rem', fontWeight: 700, padding: '0.55rem', cursor: feedbackGiven ? 'default' : 'pointer',
              }}
            >👎 פחות מתאים לי</button>
          </div>
        )}

        {/* Alternative lesson button */}
        <button
          onClick={onAlternative}
          style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: C.muted, fontSize: '0.75rem', fontWeight: 600, padding: '0.65rem', cursor: 'pointer' }}
        >
          🔄 לבחור שיעור אחר
        </button>
      </div>
    </div>
  )
}

// ── Main exported card ──────────────────────────────────────────────

export default function DailyLessonCard({ prefTopics = [] }) {
  const [lessonData, setLessonData] = useState(() => getTodayLesson(prefTopics))
  const [showLesson, setShowLesson] = useState(false)
  const [entry,      setEntry]      = useState(() => getTodayLessonEntry())

  const { lesson, topicId } = lessonData
  const topic = LESSON_TOPICS.find(t => t.id === topicId)

  const completed = !!(entry?.completedAt)
  const applied   = !!(entry?.appliedAt)

  function handleOpen() {
    markLessonOpened(lesson.id)
    setEntry(getTodayLessonEntry())
    setShowLesson(true)
  }

  function handleAlternative() {
    const alt = getAlternativeLesson(lesson.id, prefTopics)
    setLessonData(alt)
    setEntry(getTodayLessonEntry())
  }

  const handleComplete = useCallback(() => {
    markLessonCompleted(lesson.id)
    setEntry(getTodayLessonEntry())
  }, [lesson.id])

  const handleApply = useCallback(() => {
    markLessonApplied(lesson.id)
    setEntry(getTodayLessonEntry())
  }, [lesson.id])

  const handleFeedback = useCallback((type) => {
    saveLessonFeedback(lesson.id, type)
    setEntry(getTodayLessonEntry())
  }, [lesson.id])

  return (
    <>
      {showLesson && (
        <LessonView
          lesson={lesson}
          topicId={topicId}
          entry={entry}
          onClose={() => { setShowLesson(false); setEntry(getTodayLessonEntry()) }}
          onAlternative={() => { setShowLesson(false); handleAlternative() }}
          onComplete={handleComplete}
          onApply={handleApply}
          onFeedback={handleFeedback}
        />
      )}

      <div style={{
        background: C.bg,
        border: '1px solid rgba(255,255,255,0.07)',
        borderRight: `3px solid ${completed ? 'rgba(63,175,122,0.4)' : 'rgba(167,139,250,0.4)'}`,
        borderRadius: 14,
        padding: '1rem',
        animation: 'slide-up 0.3s ease both',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ color: C.muted, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              משהו חדש להיום
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {completed && (
              <span style={{ color: C.green, fontSize: '0.6rem', fontWeight: 800 }}>✓ נלמד</span>
            )}
            {applied && (
              <span style={{ color: C.green, fontSize: '0.6rem', fontWeight: 800 }}>· יושם</span>
            )}
            <span style={{ color: C.muted, fontSize: '0.6rem' }}>{lesson.readingMinutes} דקות</span>
          </div>
        </div>

        {/* Topic + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{topic?.emoji}</span>
          <div>
            <div style={{ color: completed ? C.muted : C.text, fontWeight: 800, fontSize: '0.93rem', lineHeight: 1.35, marginBottom: '0.2rem', textDecoration: completed ? 'none' : 'none' }}>
              {lesson.titleHe}
            </div>
            <div style={{ color: C.muted, fontSize: '0.72rem', lineHeight: 1.5 }}>
              {lesson.summaryHe}
            </div>
          </div>
        </div>

        <TopicChip topicId={topicId} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
          <button
            onClick={handleOpen}
            className="btn-tactile"
            style={{
              flex: 2,
              padding: '0.7rem',
              borderRadius: 10,
              border: 'none',
              background: completed ? 'rgba(63,175,122,0.08)' : 'rgba(167,139,250,0.12)',
              color: completed ? C.green : C.purple,
              fontSize: '0.83rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {completed ? '✓ קרא שוב' : 'ללמוד עכשיו ←'}
          </button>
          <button
            onClick={handleAlternative}
            style={{
              flex: 1,
              padding: '0.7rem',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: C.muted,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            נושא אחר
          </button>
        </div>
      </div>
    </>
  )
}
