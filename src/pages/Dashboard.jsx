import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { subscribeProfile, saveProfile, syncLeaderboard } from '../services/focusTriggerService'
import { checkContractStatus, getRank, getScore } from '../services/disciplineScore'
import { requestPermission, checkNotifications, checkNudges, saveNudgeResponse, snoozeNudge, markNudgeDone } from '../services/notificationService'
import { analyzeVideoForm } from '../services/coachService'
import { CHALLENGES, getDayTask, getModuleIndex } from '../data/challenges'
import { getDayContent } from '../data/lessonContent'
import { MANTRAS } from '../data/mantras'
import TracksPage from './TracksPage'
import AnalyticsTab from './AnalyticsTab'
import InitiationFlow from './InitiationFlow'
import AddToHomeScreen from '../components/AddToHomeScreen'
import DisciplineGoalCard from '../components/DisciplineGoalCard'
import DailyBrief from '../components/DailyBrief'
import ContractLock from '../components/ContractLock'
import PrimeOnboarding, { hasSeenOnboarding } from '../components/PrimeOnboarding'
import PathBuilder from '../components/PathBuilder'
import CustomPathCard from '../components/CustomPathCard'
import MirrorCard from '../components/MirrorCard'
import Settings from '../components/Settings'
import ArenaPage from './ArenaPage'
import TrainingMode from '../components/TrainingMode'
import { buildCustomPath } from '../services/pathBuilderService'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { checkAndGenerateMirror, setMirrorTriggered } from '../services/mirrorService'
import MonthlyRoadmap from '../components/MonthlyRoadmap'
import WeeklySpark from '../components/WeeklySpark'
import { logEnergy, getTodayEnergy, ENERGY_TAGS } from '../services/energyLogService'
import ProofOfActionModal from '../components/ProofOfActionModal'
import PathHistory from '../components/PathHistory'
import ActiveWorkout from '../components/ActiveWorkout'
import { TRACK_MAP } from '../data/trainingTracks'

// ── Constants ──────────────────────────────────────────────────────

const todayKey     = () => new Date().toISOString().slice(0, 10)
const getCheckins  = () => { try { return JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`)) || {} } catch { return {} } }
const saveCheckins = v  => { try { localStorage.setItem(`ft_checkins_${todayKey()}`, JSON.stringify(v)) } catch {} }

function getHabitStreak(tid) {
  try {
    const todayDone = JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`) || '{}')[tid] === true
    let count = 0
    for (let i = todayDone ? 0 : 1; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (JSON.parse(localStorage.getItem(`ft_checkins_${d}`) || '{}')[tid] === true) {
        count++
      } else {
        break
      }
    }
    return count
  } catch {
    return 0
  }
}

// Strip HTML tags and control chars from user-submitted text before sending to AI
/* eslint-disable no-control-regex */
const sanitizeInput = str =>
  str.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 1000)
/* eslint-enable no-control-regex */

const XP_PER_TRIGGER = 10
const XP_PER_LEVEL   = 100

const getLevel   = xp => Math.floor((xp || 0) / XP_PER_LEVEL) + 1
const getLevelXP = xp => (xp || 0) % XP_PER_LEVEL
const getToNext  = xp => XP_PER_LEVEL - getLevelXP(xp)

// ── Confetti ───────────────────────────────────────────────────────

const CONF_COLORS = ['#6366f1','#8b5cf6','#10b981','#a5b4fc','#34d399','#fbbf24','#f472b6','#60a5fa']

function ConfettiBurst() {
  const p = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const a = ((i / 20) * Math.PI * 2) + (Math.random() - 0.5) * 0.5
    const d = 40 + Math.random() * 60
    return { id: i, color: CONF_COLORS[i % CONF_COLORS.length], size: Math.round(4 + Math.random() * 6), round: Math.random() > 0.35, left: `${20 + Math.random() * 60}%`, tx: `${(Math.cos(a) * d).toFixed(1)}px`, ty: `${(-(12 + Math.sin(Math.abs(a)) * d * 0.9)).toFixed(1)}px`, rot: `${Math.random() > 0.5 ? '' : '-'}${Math.round(180 + Math.random() * 360)}deg`, delay: `${Math.round(Math.random() * 200)}ms` }
  }), [])
  return (
    <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 0, pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}>
      {p.map(x => <div key={x.id} style={{ position: 'absolute', left: x.left, top: 0, width: x.size, height: x.size, borderRadius: x.round ? '50%' : 2, background: x.color, '--tx': x.tx, '--ty': x.ty, '--rot': x.rot, animation: `confetti-pop 0.85s ${x.delay} ease-out forwards` }} />)}
    </div>
  )
}

// ── XP Toast ───────────────────────────────────────────────────────

function XPToast({ xp, onDone }) {
  const doneRef = useRef(onDone)
  useEffect(() => { const t = setTimeout(() => doneRef.current(), 2200); return () => clearTimeout(t) }, [])
  const isSignin = xp === 'signin'
  return (
    <div style={{ position: 'fixed', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', background: isSignin ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#c4795a,#d4956e)', color: '#fff', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.83rem', fontWeight: 800, zIndex: 9999, animation: 'xp-pop 0.35s cubic-bezier(.34,1.56,.64,1) forwards', boxShadow: isSignin ? '0 4px 20px rgba(245,158,11,0.5)' : '0 4px 20px rgba(196,121,90,0.5)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      {isSignin ? '🔒 התחבר כדי לשמור XP' : `+${xp} XP ✨`}
    </div>
  )
}

// ── Add Trigger Modal ──────────────────────────────────────────────

function AddTriggerModal({ onSave, onClose, td, to }) {
  const [cue, setCue]   = useState('')
  const [habit, setHabit] = useState('')
  const [time, setTime]   = useState('')
  const [note, setNote]   = useState('')
  const canSave = cue.trim() && habit.trim()
  const sx = { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem', fontFamily: 'inherit' }
  const lx = { display: 'block', color: 'rgba(241,245,249,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>⚡ {td.modalTitle}</span>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44, minWidth: 44 }}>✕</button>
        </div>
        <label style={lx}>{to.cue}</label>
        <input autoFocus className="glow-input" style={sx} placeholder={to.cuePh} value={cue} onChange={e => setCue(e.target.value)} />
        <label style={lx}>{to.habit}</label>
        <input className="glow-input" style={sx} placeholder={to.habitPh} value={habit} onChange={e => setHabit(e.target.value)} />
        <label style={lx}>{to.time} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', fontSize: '0.68rem' }}>{to.timeOpt}</span></label>
        <input type="time" className="glow-input" style={{ ...sx, colorScheme: 'dark' }} value={time} onChange={e => setTime(e.target.value)} />
        <label style={lx}>{to.note} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', fontSize: '0.68rem' }}>{to.optional}</span></label>
        <textarea className="glow-input" style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'none', height: 72, fontFamily: 'inherit', marginBottom: '1.25rem' }} placeholder={to.notePh} value={note} onChange={e => setNote(e.target.value)} />
        <button onClick={() => canSave && onSave({ cue: cue.trim(), habit: habit.trim(), time: time || null, note: note.trim() })} disabled={!canSave} className={canSave ? 'btn-tactile' : ''} style={{ width: '100%', padding: '0.95rem', borderRadius: 12, border: 'none', background: canSave ? 'linear-gradient(135deg,#e8b800,#facc15)' : 'rgba(255,255,255,0.06)', color: canSave ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: canSave ? 'pointer' : 'not-allowed', boxShadow: canSave ? '0 6px 20px rgba(250,204,21,0.35)' : 'none', transition: 'all 0.15s' }}>{td.save}</button>
      </div>
    </div>
  )
}

// ── Workout Library ────────────────────────────────────────────────

const WORKOUT_EXERCISES = [
  { id: 'pushups',  emoji: '💪', name: 'שכיבות סמיכה', desc: 'כוח פלג גוף עליון',         trackId: 'self-discipline',  available: true  },
  { id: 'pullups',  emoji: '🔝', name: 'מתח',           desc: 'גב, כתפיים וזרועות',        trackId: 'self-discipline',  available: true  },
  { id: 'dips',     emoji: '⬇️', name: 'מקבילים',       desc: 'טריצפס וחזה',                trackId: 'self-discipline',  available: true  },
  { id: 'squats',   emoji: '🦵', name: 'סקווטים',       desc: 'כוח פלג גוף תחתון',         trackId: 'self-discipline',  available: true  },
  { id: 'run',      emoji: '🏃', name: 'ריצה',           desc: 'טיימר + GPS מרחק בזמן אמת', trackId: 'cardio-run',       available: true  },
  { id: 'walk',     emoji: '🚶', name: 'הליכה',          desc: 'קצב + מרחק עם GPS',          trackId: 'cardio-walk',      available: true  },
  { id: 'boxing',   emoji: '🥊', name: 'בוקסינג',         desc: 'AI מאמן טכניקה בזמן אמת',  trackId: 'boxing-muaythai',  available: true },
  { id: 'muaythai', emoji: '🥋', name: 'מואי תאי',       desc: 'AI מאמן טכניקה בזמן אמת',  trackId: 'boxing-muaythai',  available: true },
]

function WorkoutLibraryModal({ onSelect, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '2px solid rgba(196,121,90,0.35)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>🏋️ ספריית האימונים</span>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕ סגור</button>
        </div>
        <p style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.73rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          בחר אימון — נעביר אותך ישירות למסלול שלו
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          {WORKOUT_EXERCISES.map(ex => (
            <button
              key={ex.id}
              className={ex.available ? 'btn-tactile' : ''}
              onClick={() => ex.available && onSelect(ex)}
              style={{
                position: 'relative',
                background: ex.available ? 'rgba(196,121,90,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${ex.available ? 'rgba(196,121,90,0.22)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 16,
                padding: '1rem 0.9rem',
                textAlign: 'right',
                cursor: ex.available ? 'pointer' : 'default',
                opacity: ex.available ? 1 : 0.42,
              }}
            >
              {!ex.available && (
                <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '0.1rem 0.45rem', fontSize: '0.56rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.04em' }}>
                  בקרוב
                </span>
              )}
              <div style={{ fontSize: '1.8rem', marginBottom: '0.45rem' }}>{ex.emoji}</div>
              <div style={{ color: ex.available ? '#f1f5f9' : 'rgba(241,245,249,0.45)', fontSize: '0.87rem', fontWeight: 800, marginBottom: '0.18rem' }}>{ex.name}</div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.7rem' }}>{ex.desc}</div>
              {ex.available && (
                <div style={{ marginTop: '0.55rem', color: '#d4956e', fontSize: '0.65rem', fontWeight: 700 }}>התחל ←</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────

// ── Video frame extractor ───────────────────────────────────────────

function extractVideoFrame(blobUrl) {
  return new Promise((resolve, reject) => {
    const video  = document.createElement('video')
    const canvas = document.createElement('canvas')
    video.src   = blobUrl
    video.muted = true
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(video.duration * 0.4, 3)
    }
    video.onseeked = () => {
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      canvas.getContext('2d').drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
    }
    video.onerror = () => reject(new Error('frame extract failed'))
    video.load()
  })
}

// ── Set Summary Modal ───────────────────────────────────────────────

function SetSummaryModal({ exercise, onDone, onClose, onAwardXP }) {
  const [reps,         setReps]         = useState('')
  const [focus,        setFocus]        = useState('')
  const [saved,        setSaved]        = useState(false)
  const [videoBlobUrl, setVideoBlobUrl] = useState(null)
  const [aiState,      setAiState]      = useState('idle')   // idle | analyzing | done | error
  const [aiFeedback,   setAiFeedback]   = useState(null)

  const fileInputRef = useRef(null)
  const blobUrlRef   = useRef(null)

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  async function handleVideoCapture(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(file)
    blobUrlRef.current = url
    setVideoBlobUrl(url)
    setAiState('analyzing')
    try {
      const base64   = await extractVideoFrame(url)
      const feedback = await analyzeVideoForm(base64, exercise.name)
      if (feedback) {
        setAiFeedback(feedback)
        setAiState('done')
      } else {
        setAiState('idle')
      }
    } catch {
      setAiState('error')
    }
  }

  function deleteVideo() {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setVideoBlobUrl(null)
    setAiState('idle')
    setAiFeedback(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSave() {
    const entry = {
      id:             Date.now(),
      date:           new Date().toISOString().slice(0, 10),
      timestamp:      Date.now(),
      exerciseId:     exercise.id,
      exerciseName:   exercise.name,
      exerciseEmoji:  exercise.emoji,
      reps:           sanitizeInput(reps),
      technicalFocus: sanitizeInput(focus),
      hasVideo:       !!videoBlobUrl,
      aiFeedback:     aiFeedback || null,
    }
    try {
      const prev = JSON.parse(localStorage.getItem('ft_workout_log') || '[]')
      localStorage.setItem('ft_workout_log', JSON.stringify([entry, ...prev].slice(0, 300)))
    } catch {}
    onAwardXP?.()
    setSaved(true)
    setTimeout(onDone, 900)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3100 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '2px solid rgba(196,121,90,0.38)', animation: 'slide-up 0.25s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{exercise.emoji}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.97rem' }}>סיכום סט</div>
              <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.7rem' }}>{exercise.name}</div>
            </div>
          </div>
          {!saved && <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕</button>}
        </div>

        {saved ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>הסט נשמר!</p>
          </div>
        ) : (
          <>
            {/* Hidden native file/camera input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleVideoCapture}
              style={{ display: 'none' }}
            />

            {/* ── Form fields ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>זמן / חזרות</label>
              {!videoBlobUrl && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-tactile"
                  style={{ background: 'rgba(196,121,90,0.08)', border: '1px solid rgba(196,121,90,0.3)', borderRadius: 20, color: '#d4956e', fontSize: '0.72rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', minHeight: 44 }}
                >
                  📹 הקלט טופס
                </button>
              )}
              {videoBlobUrl && (
                <button
                  onClick={deleteVideo}
                  className="btn-tactile"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 20, color: '#f87171', fontSize: '0.72rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', minHeight: 44 }}
                >
                  🗑 מחק וידאו
                </button>
              )}
            </div>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="למשל: 12 חזרות, 30 שניות…"
              className="glow-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '0.75rem' }}
            />

            <label style={{ display: 'block', color: 'rgba(241,245,249,0.38)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>דגש טכני</label>
            <input
              type="text"
              value={focus}
              onChange={e => setFocus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="על מה עבדת היום? (למשל: נשימה, יציבות, טווח תנועה)"
              className="glow-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: videoBlobUrl ? '0.75rem' : '1rem' }}
            />

            {/* Video preview */}
            {videoBlobUrl && (
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: '0.75rem', background: '#000', aspectRatio: '16/9' }}>
                <video
                  src={videoBlobUrl}
                  controls
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* AI analysis — inline below video */}
            {aiState === 'analyzing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.7rem 0.85rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 11, marginBottom: '1rem' }}>
                <div className="anim-spin" style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.25)', borderTopColor: '#818cf8', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: 'rgba(165,180,252,0.8)', fontSize: '0.78rem', fontWeight: 600 }}>מנתח טופס...</span>
              </div>
            )}

            {aiState === 'done' && aiFeedback && (
              <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🤖</span>
                  <span style={{ color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Form Coach</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {aiFeedback.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => (
                    <div key={i} style={{
                      background: i === 0 ? 'rgba(99,102,241,0.07)' : i === 1 ? 'rgba(196,121,90,0.07)' : 'rgba(16,185,129,0.07)',
                      border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.2)' : i === 1 ? 'rgba(196,121,90,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      borderRadius: 10, padding: '0.6rem 0.85rem',
                    }}>
                      <p style={{ color: 'rgba(241,245,249,0.85)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiState === 'error' && (
              <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 11, marginBottom: '1rem', color: '#f87171', fontSize: '0.75rem' }}>
                לא ניתן לנתח — בדוק חיבור רשת
              </div>
            )}

            <button onClick={handleSave} className="btn-primary btn-tactile" style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              שמור ←
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.2)', fontSize: '0.75rem', cursor: 'pointer', width: '100%', textAlign: 'center', padding: '0.4rem' }}>
              דלג
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Goal Tracker ───────────────────────────────────────────────────

function GoalTracker({ goal, onEdit }) {
  const today    = new Date()
  const target   = new Date(goal.targetDate)
  const created  = new Date(goal.createdAt)
  const total    = Math.max(1, Math.round((target - created) / 86400000))
  const remaining = Math.max(0, Math.ceil((target - today) / 86400000))
  const elapsed  = total - remaining
  const pct      = Math.min(100, Math.round((elapsed / total) * 100))
  const done     = remaining === 0
  const fmtDate  = target.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ background: 'rgba(99,102,241,0.055)', border: '1px solid rgba(99,102,241,0.14)', borderRadius: 18, padding: '1.15rem 1.25rem 1.05rem', marginBottom: 0, position: 'relative' }}>
      <button
        onClick={onEdit}
        className="btn-tactile"
        style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'none', border: 'none', color: 'rgba(241,245,249,0.28)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, fontWeight: 700 }}
      >✎</button>
      <div style={{ color: 'rgba(99,102,241,0.65)', fontSize: '0.53rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.3rem' }}>🎯 מטרה אישית</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.7rem', paddingLeft: '0.5rem' }}>{goal.title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.55rem' }}>
        <span style={{ color: done ? '#34d399' : '#a5b4fc', fontSize: '2.2rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1 }}>
          {done ? '✓' : remaining}
        </span>
        <span style={{ color: done ? 'rgba(52,211,153,0.7)' : 'rgba(165,180,252,0.65)', fontSize: '0.95rem', fontWeight: 700 }}>
          {done ? 'הגעת ליעד!' : 'ימים נותרו'}
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f180,#a5b4fc)', borderRadius: 99, transition: 'width 0.7s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.6rem' }}>{elapsed} / {total} ימים</span>
        <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.6rem' }}>{fmtDate}</span>
      </div>
    </div>
  )
}

function GoalEditModal({ goal, onSave, onClear, onClose }) {
  const [title,      setTitle]      = useState(goal?.title || '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate || '')
  const canSave = title.trim().length > 0 && targetDate.length > 0
  const minDate = new Date().toISOString().slice(0, 10)

  function setDaysFromNow(d) {
    const date = new Date()
    date.setDate(date.getDate() + d)
    setTargetDate(date.toISOString().slice(0, 10))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 5200, background: 'rgba(5,5,12,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0e0e16', borderRadius: '20px 20px 0 0', borderTop: '2px solid rgba(99,102,241,0.4)', padding: '1.5rem 1.4rem 2.6rem', animation: 'slide-up 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <span style={{ color: 'rgba(99,102,241,0.7)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>🎯 מטרה אישית</span>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(241,245,249,0.55)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
        </div>
        <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem' }}>שם המטרה</div>
        <input
          autoFocus
          className="glow-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="לדוגמה: מוכנות לגיוס, השקת האפליקציה..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '1.1rem', outline: 'none' }}
        />
        <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>תאריך יעד</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
          {[{l:'14 יום',d:14},{l:'30 יום',d:30},{l:'60 יום',d:60},{l:'90 יום',d:90}].map(q => (
            <button
              key={q.l}
              onClick={() => setDaysFromNow(q.d)}
              className="btn-tactile"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 20, color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', minHeight: 44, minWidth: 0 }}
            >{q.l}</button>
          ))}
        </div>
        <input
          type="date"
          className="glow-input"
          value={targetDate}
          min={minDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: `1px solid ${targetDate ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '1.4rem', outline: 'none', colorScheme: 'dark' }}
        />
        <button
          onClick={() => canSave && onSave(title.trim(), targetDate)}
          disabled={!canSave}
          className="btn-tactile"
          style={{ width: '100%', padding: '0.95rem', borderRadius: 14, border: 'none', background: canSave ? 'linear-gradient(135deg,#e8b800,#facc15)' : 'rgba(255,255,255,0.06)', color: canSave ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: canSave ? 'pointer' : 'not-allowed', marginBottom: '0.6rem', boxShadow: canSave ? '0 6px 20px rgba(250,204,21,0.35)' : 'none', transition: 'all 0.15s' }}
        >שמור מטרה</button>
        {goal && (
          <button
            onClick={onClear}
            className="btn-tactile"
            style={{ width: '100%', padding: '0.7rem', borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: 'rgba(248,113,113,0.6)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >מחק מטרה</button>
        )}
      </div>
    </div>
  )
}

function EditHabitModal({ trigger, onSave, onDelete, onClose }) {
  const [cue,        setCue]        = useState(trigger.cue)
  const [habit,      setHabit]      = useState(trigger.habit)
  const [confirmDel, setConfirmDel] = useState(false)
  const canSave = cue.trim().length > 0 && habit.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 5100, background: 'rgba(5,5,12,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0e0e16', borderRadius: '20px 20px 0 0', borderTop: '2px solid rgba(245,197,24,0.3)', padding: '1.5rem 1.4rem 2.6rem', animation: 'slide-up 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <span style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>✎ עריכת הרגל</span>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(241,245,249,0.55)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
        </div>

        {confirmDel ? (
          <div style={{ animation: 'fadeIn 0.18s ease' }}>
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 14, padding: '1.1rem 1.2rem', marginBottom: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>🗑</div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.35rem' }}>למחוק את ההרגל?</div>
              <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem', lineHeight: 1.5 }}>"{trigger.cue} → {trigger.habit}"</div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => setConfirmDel(false)}
                className="btn-tactile"
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(241,245,249,0.6)', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >ביטול</button>
              <button
                onClick={onDelete}
                className="btn-tactile"
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
              >מחק סופית</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem' }}>כשאני... (הטריגר)</div>
            <input
              autoFocus
              className="glow-input"
              value={cue}
              onChange={e => setCue(e.target.value)}
              placeholder="לדוגמה: אחרי שאני מתעורר"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '1rem', outline: 'none' }}
            />
            <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem' }}>אני אבצע... (ההרגל)</div>
            <input
              className="glow-input"
              value={habit}
              onChange={e => setHabit(e.target.value)}
              placeholder="לדוגמה: 10 שכיבות סמיכה"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '1.25rem', outline: 'none' }}
            />
            <button
              onClick={() => canSave && onSave(cue.trim(), habit.trim())}
              disabled={!canSave}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.95rem', borderRadius: 14, border: 'none', background: canSave ? 'linear-gradient(135deg,#D4A017,#F5C518)' : 'rgba(255,255,255,0.06)', color: canSave ? '#050505' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', marginBottom: '0.6rem' }}
            >
              שמור שינויים
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'none', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(248,113,113,0.55)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🗑 מחק הרגל
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MantraCard({ idx, onCycle }) {
  const mantra = MANTRAS[idx % MANTRAS.length]
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1.25rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
      <p style={{ color: 'rgba(241,245,249,0.82)', fontSize: '1.08rem', fontWeight: 700, lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 1rem', letterSpacing: '0.01em' }}>
        "{mantra}"
      </p>
      <button
        onClick={onCycle}
        className="btn-tactile"
        style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.28)', borderRadius: 20, color: 'rgba(245,197,24,0.85)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.3rem 0.9rem', minHeight: 36, letterSpacing: '0.06em', fontFamily: "'SF Mono','Fira Code',monospace" }}
        aria-label="מנטרה הבאה"
      >
        ↻ הבא
      </button>
    </div>
  )
}

const NICHE_KEYWORDS = {
  physical: ['gym','sport','fitness','strength','health','body','muscle','workout','train','nutrition','diet','running','כושר','בריאות','כוח','ספורט','גוף','שרירים','אימון','תזונה','ריצה','משמעת','discipline','weight','lifting'],
  tech:     ['code','coding', 'ai','software','tech','developer','program','app','automation','קוד','בינה','פיתוח','טכנולוגיה','אפליקציה','מפתח','אוטומציה','claude','gpt','machine learning'],
  finance:  ['trading','invest','investment','money','capital','market','stock','crypto','wealth','מסחר','השקעות','הון','כסף','מניות','בורסה','פיננסי','נדלן','real estate','portfolio'],
  business: ['business','startup','company','brand','client','sale','product','entrepreneur','freelance','עסק','יזמות','מותג','לקוח','מכירות','מוצר','פרילנס','agency','revenue'],
}
const NICHE_TRACKS = {
  physical: ['self-discipline', 'business-soul'],
  tech:     ['ai-beginners', 'ai-pioneer', 'claude-code-mastery', 'product-builder'],
  finance:  ['capital-markets', 'business-mind', 'deal-closer'],
  business: ['business-mind', 'deal-closer', 'product-builder', 'business-soul'],
}
function detectNicheRecs(visionProfile) {
  const text = [
    visionProfile?.three_year_vision || '',
    visionProfile?.the_gap || '',
    ...(visionProfile?.core_values || []),
    ...(visionProfile?.non_negotiables || []),
  ].join(' ').toLowerCase()
  const scores = Object.fromEntries(Object.keys(NICHE_KEYWORDS).map(k => [k, 0]))
  for (const [niche, kws] of Object.entries(NICHE_KEYWORDS)) {
    for (const kw of kws) { if (text.includes(kw)) scores[niche]++ }
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  return NICHE_TRACKS[top] || NICHE_TRACKS.business
}

export default function Dashboard() {
  const { user, isGuest }  = useAuth()
  const { lang: _lang, t: tAll } = useLang()
  const td  = tAll.dashboard
  const to  = tAll.onboarding

  const [initiationDone, setInitiationDone] = useState(() => !!localStorage.getItem('onboardingCompleted'))

  const [profile,      setProfile]      = useState(null)
  const [checkins,     setCheckinsS]    = useState(getCheckins)
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [xpToast,      setXPToast]      = useState(null)
  const [activeTab,    setActiveTab]    = useState('home')
  const [showWorkoutLib,    setShowWorkoutLib]    = useState(false)
  const [workoutSession,    setWorkoutSession]    = useState(null)
  const [boxingSession,     setBoxingSession]     = useState(null)  // { track, goal } | null
  const [showCombatTraining,setShowCombatTraining]= useState(false)
  const [showDetails,       setShowDetails]       = useState(false)
  const [_contractLocked, setContractLocked] = useState(() => checkContractStatus().locked)
  const [_headerScore,    setHeaderScore]    = useState(getScore)
  const [customPath,     setCustomPath]     = useState(null)
  const [showPathBuilder,setShowPathBuilder]= useState(false)
  const [pathLoading,    setPathLoading]    = useState(true)
  const [mirrorData,     setMirrorData]     = useState(null)   // { gapDays, message }
  const [liveCardio,    setLiveCardio]    = useState(null)    // active cardio session from localStorage
  const [liveTick,      setLiveTick]      = useState(0)       // increments every second for mini-bar

  // proofModal: { type: 'habit'|'challenge', id, title, taskDesc, xp, color }
  const [proofModal,   setProofModal]   = useState(null)
  // quickTask merged into proofModal
  const [editHabit,    setEditHabit]    = useState(null)
  const [showGoalEdit, setShowGoalEdit] = useState(false)
  const [levelUpModal, setLevelUpModal] = useState(null)
  const [mantraIdx,        setMantraIdx]        = useState(() => new Date().getDate() % MANTRAS.length)
  const [showUnlockBanner, setShowUnlockBanner] = useState(false)
  const [showAntiChurn,    setShowAntiChurn]    = useState(false)
  const [completingId,     setCompletingId]     = useState(null)
  const [showPathHistory,  setShowPathHistory]  = useState(false)
  const [todayEnergy,      setTodayEnergy]      = useState(() => getTodayEnergy())
  const [sectionsOpen,     setSectionsOpen]     = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('prime_sections_open')) || {}; return { roadmap: false, tracks: false, ...saved } } catch { return { roadmap: false, tracks: false } }
  })

  const regenRef    = useRef(false)  // prevents concurrent silent re-generations
  const pathCardRef = useRef(null)

  useEffect(() => {
    if (!user || isGuest) { setPathLoading(false); return }
    const pathRef = doc(db, 'userPaths', user.uid)
    const unsub = onSnapshot(pathRef, snap => {
      const rawData     = snap.exists() ? snap.data() : null
      const hasValidPath = !!(rawData?.path?.daily_habits?.length > 0 && rawData?.path?.roadmap?.length > 0)

      // Patch stale habit titles in-memory so old Firestore docs always show user's actual labels
      let data = rawData
      if (hasValidPath && rawData?.vision_profile) {
        const vp    = rawData.vision_profile
        const nnArr = (vp.non_negotiables || []).filter(Boolean)
        const cvArr = (vp.core_values     || []).filter(Boolean)
        const h1 = nnArr[0] || cvArr[0]
        const h2 = nnArr[1] || cvArr[1] || cvArr[0]
        const cv1 = cvArr[0]
        const habits = rawData.path.daily_habits.map((h, i) => {
          if (i === 0 && h1)  return { ...h, title: h1 }
          if (i === 1 && h2)  return { ...h, title: h2 }
          if (i === 2 && cv1) return { ...h, title: `גילום ${cv1}` }
          return h
        })
        data = { ...rawData, path: { ...rawData.path, daily_habits: habits } }
      }

      // Only expose a path to state when it is structurally complete
      setCustomPath(hasValidPath ? data : null)
      setPathLoading(false)

      if (hasValidPath) {
        regenRef.current = false
        checkAndGenerateMirror(data).then(d => { if (d) setMirrorData(d) }).catch(() => {})
      }

      // Silent re-generation: doc has vision_profile but no valid path yet
      if (data && !hasValidPath && data.vision_profile && !regenRef.current) {
        regenRef.current = true
        buildCustomPath(user.uid, data.vision_profile)
          .catch(() => {})
          .finally(() => { regenRef.current = false })
      }
    }, () => setPathLoading(false))
    return () => unsub()
  }, [user, isGuest])

  // Auto-open PathBuilder for authenticated users who have no path and no regen in progress
  useEffect(() => {
    if (loading || pathLoading || isGuest || customPath || regenRef.current) return
    setShowPathBuilder(true)
  }, [loading, pathLoading, isGuest, customPath])

  useEffect(() => {
    if (isGuest) { setProfile({ name: 'Guest', xp: 0, triggers: [], challenges: {} }); setLoading(false); return }
    if (!user) return
    const unsub = subscribeProfile(
      user.uid,
      p => { setProfile(p); setLoading(false) },
      () => { setLoading(false) }  // network error: stop spinner, keep last profile
    )
    return unsub
  }, [user, isGuest])

  useEffect(() => {
    if (!profile) return
    requestPermission()
    const triggers     = profile?.triggers || []
    const visionProf   = customPath?.vision_profile || null
    const uid          = user?.uid || null
    const run = () => {
      checkNotifications(triggers, profile)
      checkNudges(visionProf, uid)
    }
    run()
    const id = setInterval(run, 60_000)
    return () => clearInterval(id)
  }, [profile, customPath, user])

  // SW message handler for nudge action-button responses
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !user?.uid) return
    const uid = user.uid
    const handler = e => {
      if (e.data?.type !== 'NUDGE_RESPONSE') return
      const { action, data } = e.data
      const habitLabel = data?.habitLabel
      if (!habitLabel) return
      if (action === 'done') {
        markNudgeDone(habitLabel)
        saveNudgeResponse(uid, habitLabel, 'done')
      } else if (action === 'later') {
        snoozeNudge(habitLabel, 60 * 60 * 1000)
        saveNudgeResponse(uid, habitLabel, 'later')
      } else if (action === 'help') {
        saveNudgeResponse(uid, habitLabel, 'help')
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [user])

  useEffect(() => {
    const id = setInterval(() => {
      setHeaderScore(getScore())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onRedeemed() { setHeaderScore(getScore()) }
    window.addEventListener('prime:redeemed', onRedeemed)
    return () => window.removeEventListener('prime:redeemed', onRedeemed)
  }, [])

  // ── Live cardio session polling (for mini-bar + document.title) ──
  useEffect(() => {
    const check = () => {
      try {
        const s = JSON.parse(localStorage.getItem('prime_cardio_live'))
        setLiveCardio(s?.running ? s : null)
        if (s?.running) setLiveTick(t => t + 1)
      } catch { setLiveCardio(null) }
    }
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!liveCardio) { document.title = '1% Better — PRIME'; return }
    const elapsed = Math.round((Date.now() - liveCardio.startTimestamp) / 1000)
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    const d = liveCardio.distance > 0 ? ` · ${liveCardio.distance.toFixed(2)}ק"מ` : ''
    document.title = `🏃‍♂️ ${m}:${s}${d} — PRIME`
  }, [liveCardio, liveTick])

  const streak             = profile?.streak?.count || 0
  const winnerGlow         = streak >= 7
  const isAdvancedUnlocked = streak >= 3

  // Anti-churn: show late-evening reminder when habits incomplete
  useEffect(() => {
    if (loading || !profile) return
    const h = new Date().getHours()
    const dismissKey = `prime_anti_churn_${todayKey()}`
    const trig = profile?.triggers || []
    const done = trig.filter(tr => checkins[tr.id]).length
    if (h >= 19 && trig.length > 0 && done < trig.length && !localStorage.getItem(dismissKey)) {
      setShowAntiChurn(true)
    }
  }, [loading, profile])


  useEffect(() => {
    if (isAdvancedUnlocked && !localStorage.getItem('ft_advanced_seen')) {
      setShowUnlockBanner(true)
      setShowDetails(true)
    }
  }, [isAdvancedUnlocked])

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (proofModal)  setProofModal(null)
      else if (editHabit) setEditHabit(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [proofModal, editHabit])

  // ── XP helpers ────────────────────────────────────────────────

  async function awardXP(amount) {
    if (isGuest) { setXPToast('signin'); return }
    const oldLevel = getLevel(profile?.xp || 0)
    const newXP    = (profile?.xp || 0) + amount
    const newLevel = getLevel(newXP)
    const today    = todayKey()
    const log      = [...new Set([...(profile?.activityLog || []), today])]
    const updated  = { ...profile, xp: newXP, activityLog: log }
    setProfile(updated)
    setXPToast(amount)
    if (newLevel > oldLevel) {
      setLevelUpModal(newLevel)
      setTimeout(() => setLevelUpModal(null), 3800)
    }
    await saveProfile(user.uid, { xp: newXP, activityLog: log })
    await syncLeaderboard(user.uid, profile?.name || 'Anonymous', newXP).catch(() => {})
  }

  async function _deductXP(amount) {
    if (isGuest) return
    const newXP   = Math.max(0, (profile?.xp || 0) - amount)
    setProfile(p => ({ ...p, xp: newXP }))
    await saveProfile(user.uid, { xp: newXP })
    await syncLeaderboard(user.uid, profile?.name || 'Anonymous', newXP).catch(() => {})
  }

  function bumpStreak() {
    if (isGuest || !user) return
    const today      = todayKey()
    const yesterday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    const s          = profile?.streak || {}
    if (s.lastDate === today) return
    const count = (s.lastDate === yesterday || s.lastDate === twoDaysAgo) ? (s.count || 0) + 1 : 1
    setProfile(p => ({ ...p, streak: { count, lastDate: today } }))
    saveProfile(user.uid, { streak: { count, lastDate: today } }).catch(() => {})
  }

  function updateStreak(nextCheckins, triggers) {
    if (!triggers.length || !triggers.every(tr => nextCheckins[tr.id])) return
    const today      = todayKey()
    const yesterday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    const s          = profile?.streak || {}
    if (s.lastDate === today) return
    const count = (s.lastDate === yesterday || s.lastDate === twoDaysAgo)
      ? (s.count || 0) + 1
      : 1
    setProfile(p => ({ ...p, streak: { count, lastDate: today } }))
    saveProfile(user.uid, { streak: { count, lastDate: today } }).catch(() => {})
  }

  // ── Habit actions ─────────────────────────────────────────────

  function confirmHabitComplete() {
    const id   = proofModal.id
    const next = { ...checkins, [id]: true }
    saveCheckins(next)
    setCheckinsS(next)
    setProofModal(null)
    setCompletingId(id)
    setTimeout(() => setCompletingId(null), 850)
    awardXP(XP_PER_TRIGGER)
    updateStreak(next, profile?.triggers || [])
  }


  async function handleAddTrigger(data) {
    if (isGuest) { setShowModal(false); return }
    setSaving(true)
    const existing   = profile?.triggers || []
    const newTrigger = { id: `t${Date.now()}`, ...data }
    const updated    = { ...(profile || {}), triggers: [...existing, newTrigger], onboardingDone: true }
    try { await saveProfile(user.uid, updated); setProfile(updated); setShowModal(false) } catch {}
    setSaving(false)
  }

  async function handleEditHabit(id, newCue, newHabit) {
    const newTriggers = (profile?.triggers || []).map(t => t.id === id ? { ...t, cue: newCue, habit: newHabit } : t)
    const updated = { ...profile, triggers: newTriggers }
    setProfile(updated)
    setEditHabit(null)
    if (!isGuest) await saveProfile(user.uid, { triggers: newTriggers }).catch(() => {})
  }

  async function handleDeleteHabit(id) {
    const newTriggers = (profile?.triggers || []).filter(t => t.id !== id)
    const updated = { ...profile, triggers: newTriggers }
    setProfile(updated)
    setEditHabit(null)
    if (!isGuest) await saveProfile(user.uid, { triggers: newTriggers }).catch(() => {})
  }

  async function handleSaveGoal(title, targetDate) {
    const goal    = { title, targetDate, createdAt: todayKey() }
    const updated = { ...profile, goal }
    setProfile(updated)
    setShowGoalEdit(false)
    if (!isGuest) await saveProfile(user.uid, { goal }).catch(() => {})
  }

  async function handleClearGoal() {
    const updated = { ...profile, goal: null }
    setProfile(updated)
    setShowGoalEdit(false)
    if (!isGuest) await saveProfile(user.uid, { goal: null }).catch(() => {})
  }

  function toggleSection(id) {
    setSectionsOpen(prev => {
      const next = { ...prev, [id]: !(prev[id] !== false) }
      try { localStorage.setItem('prime_sections_open', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // ── Challenge actions ─────────────────────────────────────────

  function openChallengeModal(challenge, dayNum, taskDesc) {
    const moduleIdx  = getModuleIndex(dayNum)
    const dayInMod   = (dayNum - 1) % 5
    const richContent = getDayContent(challenge.id, moduleIdx, dayInMod)
    setProofModal({
      type:     'challenge',
      id:       challenge.id,
      emoji:    challenge.emoji,
      title:    `${challenge.title} — יום ${dayNum}`,
      taskDesc,
      xp:       challenge.xpPerDay,
      color:    challenge.color,
      challenge,
      dayNum,
      richContent,
    })
  }

  async function confirmChallengeComplete() {
    const { challenge, dayNum: _dayNum } = proofModal
    const today          = todayKey()
    const prev           = profile?.challenges?.[challenge.id] || {}
    if (prev.lastCompletedDate === today) { setProofModal(null); return }
    const daysCompleted  = Math.min((prev.daysCompleted || 0) + 1, challenge.days)
    const challengeUpdate = { ...(profile?.challenges || {}), [challenge.id]: { daysCompleted, lastCompletedDate: today } }
    setProfile(p => ({ ...p, challenges: challengeUpdate }))
    setProofModal(null)
    if (!isGuest) await saveProfile(user.uid, { challenges: challengeUpdate })
    awardXP(challenge.xpPerDay)
    bumpStreak()
  }

  // ── Derived ───────────────────────────────────────────────────

  const triggers  = profile?.triggers || []
  const doneCount = triggers.filter(tr => checkins[tr.id]).length
  const allDone   = triggers.length > 0 && doneCount === triggers.length
  const xp        = profile?.xp || 0
  const toNext    = getToNext(xp)
  const hour      = new Date().getHours()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const TAB_H     = 64

  // ── Personalized context ───────────────────────────────────────

  const habitStreaks = useMemo(() => {
    const map = {}
    for (const tr of (profile?.triggers || [])) map[tr.id] = getHabitStreak(tr.id)
    return map
  }, [profile?.triggers, checkins])

  const activeTrack = useMemo(() => {
    const ch = profile?.challenges || {}
    return CHALLENGES
      .filter(c => { const d = ch[c.id]?.daysCompleted || 0; return d > 0 && d < c.days })
      .sort((a, b) => (ch[b.id]?.daysCompleted || 0) - (ch[a.id]?.daysCompleted || 0))[0] || null
  }, [profile?.challenges])

  const activeTrackDone = activeTrack ? (profile?.challenges?.[activeTrack.id]?.daysCompleted || 0) : 0

  const dynamicGreeting = useMemo(() => {
    const name  = profile?.name
    const greet = hour < 12 ? 'בוקר' : hour < 17 ? 'צהריים' : 'ערב'
    const n     = name ? `, ${name}` : ''
    const MILESTONES = [5, 10, 15, 20, 25, 30]
    const nextMilestone   = activeTrack ? MILESTONES.find(m => m > activeTrackDone) : null
    const daysToMilestone = nextMilestone ? nextMilestone - activeTrackDone : null
    if (streak >= 14) return `${greet}${n}. ${streak} ימים ברצף. אתה לא כמו כולם.`
    if (streak >= 7)  return `${greet}${n}. שבוע ברצף. אל תיתן ליום הזה לשבור את הרצף.`
    if (daysToMilestone !== null && daysToMilestone <= 3)
      return `${greet}${n}. ${daysToMilestone === 1 ? 'יום אחד ממשוע הבא ב' : `${daysToMilestone} ימים ממשוע הבא ב`}${activeTrack.title}. בוא נסגור את זה.`
    if (activeTrack)  return `${greet}${n}. יום ${activeTrackDone + 1} ב${activeTrack.title}. ממשיכים לבנות.`
    if (streak >= 1)  return `${greet}${n}. ${streak} ימים ברצף. כל יום מצטבר.`
    return `${greet}${n}. יום חדש, סיבוב חדש. יאללה.`
  }, [profile?.name, hour, streak, activeTrack, activeTrackDone])

  const weeklyCompletedDays = useMemo(() => {
    const log = new Set(profile?.activityLog || [])
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (log.has(d)) count++
    }
    return count
  }, [profile?.activityLog])

  const activitySet     = new Set(profile?.activityLog || [])
  const isFirstTimer    = activitySet.size === 0
  const missedYesterday = !isFirstTimer && !activitySet.has(yesterday)
  // ── Single primary action ──────────────────────────────────────
  const trackDoneToday   = activeTrack ? profile?.challenges?.[activeTrack.id]?.lastCompletedDate === todayKey() : true
  const firstUndoneHabit = triggers.find(tr => !checkins[tr.id]) ?? null

  let primaryAction
  if (activeTrack && !trackDoneToday) {
    const dayNum   = (profile?.challenges?.[activeTrack.id]?.daysCompleted || 0) + 1
    const taskDesc = getDayTask(activeTrack.id, dayNum)
    primaryAction  = { type: 'track', track: activeTrack, dayNum, taskDesc, xp: activeTrack.xpPerDay }
  } else if (firstUndoneHabit) {
    primaryAction = { type: 'habit', trigger: firstUndoneHabit, xp: XP_PER_TRIGGER }
  } else if (triggers.length === 0 && !activeTrack) {
    primaryAction = { type: 'no-tasks' }
  } else {
    primaryAction = { type: 'all-done' }
  }

  // Always show skeleton while profile is loading — prevents false-negative
  // profileHasProgress flash that would show PrimeOnboarding/InitiationFlow
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e16', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0.75rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 90, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
        <div style={{ width: 60, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s 0.1s infinite' }} />
        </div>
      </div>
      <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {[80, 120, 100, 60].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 16, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: `shimmer 1.4s ${i * 0.12}s infinite` }} />
          </div>
        ))}
      </div>
    </div>
  )

  // Profile is loaded — now check if this user has meaningful Firestore progress
  const profileHasProgress = (
    (profile?.xp || 0) > 0
    || Object.keys(profile?.challenges || {}).some(k => (profile.challenges[k]?.daysCompleted || 0) > 0)
    || (profile?.triggers || []).length > 0
  )

  if (!profileHasProgress && !hasSeenOnboarding()) return (
    <PrimeOnboarding onDone={() => setInitiationDone(true)} />
  )

  if (!profileHasProgress && !initiationDone) return (
    <InitiationFlow onComplete={() => {
      localStorage.setItem('onboardingCompleted', 'true')
      setInitiationDone(true)
    }} />
  )

  if (showPathBuilder && !isGuest && !pathLoading) {
    return (
      <PathBuilder
        user={user}
        onDone={record => {
          const nicheRecs = detectNicheRecs(record.vision_profile)
          try {
            localStorage.removeItem('prime_track_quiz')
            localStorage.setItem('prime_track_quiz', JSON.stringify({ v: 1, recommendations: nicheRecs }))
            Object.keys(localStorage)
              .filter(k => k.startsWith('prime_benchmarks_') && !nicheRecs.some(id => k.endsWith(id)))
              .forEach(k => localStorage.removeItem(k))
          } catch {}
          if (!isGuest && user) {
            saveProfile(user.uid, { trackQuizRecs: nicheRecs, challenges: {} }).catch(() => {})
            setProfile(p => p ? { ...p, trackQuizRecs: nicheRecs, challenges: {} } : { trackQuizRecs: nicheRecs, challenges: {} })
          }
          setCustomPath(record); setShowPathBuilder(false); setPathLoading(false)
        }}
      />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: winnerGlow ? 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.05) 0%, #0e0e16 55%)' : '#0e0e16',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Sticky Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: winnerGlow ? 'rgba(14,14,22,0.97)' : '#0e0e16', borderBottom: `1px solid ${winnerGlow ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <img src="/prime-logo.svg" alt="PRIME" style={{ height: 26, width: 'auto', display: 'block' }} />
            <span style={{ color: '#b8966a', fontSize: '0.47rem', fontWeight: 800, letterSpacing: '0.17em', textTransform: 'uppercase' }}>Daily Discipline System</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* אל המסלול — always-visible header shortcut when active path exists */}
            {!isGuest && customPath?.path?.path_name && (
              <button
                onClick={() => {
                  if (activeTab !== 'home') {
                    setActiveTab('home')
                    setTimeout(() => pathCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
                  } else {
                    pathCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                className="btn-tactile"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: '0.3rem 0.7rem', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.72rem' }}>🗺️</span>
                <span style={{ color: '#F5C518', fontSize: '0.68rem', fontWeight: 900 }}>אל המסלול ←</span>
              </button>
            )}
            {(() => {
              const rank = getRank(xp)
              return (
                <div
                  onClick={() => setActiveTab('stats')}
                  className="btn-tactile"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${rank.color}15`, border: `1px solid ${rank.color}40`, borderRadius: 20, padding: '0.22rem 0.6rem', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.72rem' }}>{rank.icon}</span>
                  <span style={{ color: rank.color, fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.05em' }}>{rank.label}</span>
                  <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.58rem' }}>·</span>
                  <span style={{ color: rank.color, fontSize: '0.72rem', fontWeight: 800 }}>{xp}</span>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Guest Banner ── */}
      {isGuest && (
        <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>👁 מצב אורח — ההתקדמות לא תישמר</span>
          <a href="/welcome" className="btn-tactile" style={{ color: '#f59e0b', fontSize: '0.76rem', fontWeight: 800, textDecoration: 'none', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '0.45rem 0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 36 }}>התחבר ←</a>
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: TAB_H + 16 }}>

        {/* ── HOME TAB — Command Center ── */}
        {activeTab === 'home' && (
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.75rem 1.35rem 0', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {/* ── Prime Path — FIRST element, always expanded inline, no clicks required ── */}
            <div ref={pathCardRef} style={{ scrollMarginTop: '4rem' }} />
            {!isGuest && (
              pathLoading
                ? (
                  <div style={{ background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.18)', borderRadius: 20, padding: '1.4rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(245,197,24,0.7)', fontSize: '0.82rem', fontWeight: 700 }}>
                      <span style={{ fontSize: '1.1rem', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⚡</span>
                      בונה את המסלול שלך...
                    </div>
                    <div style={{ height: 10, borderRadius: 6, background: 'rgba(245,197,24,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '60%', borderRadius: 6, background: 'linear-gradient(90deg, rgba(245,197,24,0.3), rgba(245,197,24,0.6))', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: 'rgba(245,197,24,0.07)', width: '75%' }} />
                    <div style={{ height: 8, borderRadius: 6, background: 'rgba(245,197,24,0.05)', width: '50%' }} />
                  </div>
                )
                : (
                  <CustomPathCard
                    key={customPath?.createdAt || 'no-path'}
                    user={user}
                    pathRecord={customPath}
                    onPathUpdate={setCustomPath}
                    onRebuild={() => { setCustomPath(null); setShowPathBuilder(true) }}
                  />
                )
            )}

            {/* ── MIRROR ── */}
            {mirrorData && (
              <MirrorCard
                gapDays={mirrorData.gapDays}
                message={mirrorData.message}
                onRespond={() => {
                  setMirrorData(null)
                  setMirrorTriggered(user.uid)
                }}
              />
            )}

            <ContractLock onRedeemed={() => setContractLocked(false)} />

            {/* ── Personal Goal Tracker — shown whenever goal exists, no gate ── */}
            {profile?.goal && (
              <GoalTracker goal={profile.goal} onEdit={() => setShowGoalEdit(true)} />
            )}

            {/* ── First-timer welcome ── */}
            {isFirstTimer && primaryAction.type !== 'all-done' && (
              <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 16, padding: '1rem 1.1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎯</span>
                <div>
                  <div style={{ color: '#a5b4fc', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.15rem' }}>{td.welcomeFirst}</div>
                  <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.78rem', lineHeight: 1.4 }}>{td.welcomeFirstSub}</div>
                </div>
              </div>
            )}

            {/* ── Missed-day warning ── */}
            {missedYesterday && primaryAction.type !== 'all-done' && (
              <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 16, padding: '1rem 1.1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>💪</span>
                <div>
                  <div style={{ color: '#fbbf24', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.15rem' }}>{td.missedYday}</div>
                  <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.78rem', lineHeight: 1.4 }}>{td.missedYdaySub}</div>
                </div>
              </div>
            )}

            {/* ── Quick Habits Panel ── */}
            {triggers.length > 0 && (
              <div style={{
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div
                  onClick={() => toggleSection('habits')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem 0.6rem',
                    borderBottom: sectionsOpen.habits !== false ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.8rem', fontWeight: 700 }}>
                    ⚡ {td.habitsSection}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setShowModal(true) }}
                      className="btn-tactile"
                      style={{ background: 'rgba(196,121,90,0.1)', border: '1px solid rgba(196,121,90,0.28)', borderRadius: 20, color: '#d4956e', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.65rem', cursor: 'pointer', minHeight: 'unset' }}
                    >
                      + הוסף
                    </button>
                    <span style={{ color: allDone ? '#34d399' : 'rgba(241,245,249,0.35)', fontSize: '0.78rem', fontWeight: 700 }}>
                      {doneCount}/{triggers.length}
                    </span>
                    <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.68rem' }}>
                      {sectionsOpen.habits !== false ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
                {sectionsOpen.habits !== false && triggers.map((tr, i) => {
                  const done = !!checkins[tr.id]
                  const completing = completingId === tr.id
                  const habitStreak = habitStreaks[tr.id] ?? 0
                  const habitSubtitle = done
                    ? (habitStreak >= 2 ? `${habitStreak} ימים ברצף 🔥` : 'הושלם היום ✓')
                    : habitStreak > 0
                      ? `${habitStreak} ימים ברצף`
                      : tr.habit
                  return (
                    <div
                      key={tr.id}
                      onClick={() => !done && setProofModal({ type: 'habit', id: tr.id, emoji: '⚡', title: tr.cue, taskDesc: tr.habit, xp: XP_PER_TRIGGER, color: '#6366f1' })}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '1rem 1.1rem',
                        borderBottom: i < triggers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        cursor: done ? 'default' : 'pointer',
                        minHeight: 58,
                        background: done ? 'rgba(255,255,255,0.015)' : 'transparent',
                      }}
                    >
                      {completing && <ConfettiBurst />}
                      <div
                        className={completing ? 'habit-complete' : ''}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${done ? '#06b6d4' : 'rgba(99,102,241,0.45)'}`,
                          background: done ? 'rgba(6,182,212,0.18)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#06b6d4', fontSize: '0.82rem', fontWeight: 900,
                        }}
                      >
                        {done ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: done ? 'rgba(241,245,249,0.4)' : '#f1f5f9',
                          fontSize: '0.9rem', fontWeight: 700,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          textDecoration: done ? 'line-through' : 'none',
                          lineHeight: 1.35,
                        }}>
                          {tr.cue}
                        </div>
                        <div style={{ color: habitStreak > 0 ? 'rgba(251,191,36,0.65)' : 'rgba(241,245,249,0.38)', fontSize: '0.74rem', marginTop: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', direction: 'rtl' }}>
                          {habitSubtitle}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {!done
                          ? <button
                              aria-label={`התחל: ${tr.cue}`}
                              onClick={e => { e.stopPropagation(); setProofModal({ type: 'habit', id: tr.id, emoji: '⚡', title: tr.cue, taskDesc: tr.habit, xp: XP_PER_TRIGGER, color: '#6366f1' }) }}
                              className="btn-tactile"
                              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.28)', borderRadius: 8, padding: '0.3rem 0.7rem', color: '#f97316', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                            >התחל ←</button>
                          : <span style={{ color: 'rgba(6,182,212,0.7)', fontSize: '1.05rem' }}>✅</span>
                        }
                        <button
                          onClick={e => { e.stopPropagation(); e.preventDefault(); setEditHabit(tr) }}
                          className="btn-tactile"
                          title="ערוך הרגל"
                          aria-label="ערוך הרגל"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(241,245,249,0.45)', fontSize: '0.88rem', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, fontWeight: 700 }}
                        >✎</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Active Course Card (compact — full lesson lives in Tracks tab) ── */}
            {primaryAction.type === 'track' && (() => {
              const col      = primaryAction.track.color
              const trackPrg = profile?.challenges?.[primaryAction.track.id]
              const isLocked = (trackPrg?.daysCompleted || 0) > 0
                && trackPrg?.lastCompletedDate !== yesterday
                && trackPrg?.lastCompletedDate !== todayKey()
              const pct = Math.round(((primaryAction.dayNum - 1) / primaryAction.track.days) * 100)

              return (
                <div
                  style={{ background: `linear-gradient(145deg,${col}10,${col}04)`, border: `1px solid ${col}22`, borderRadius: 18, padding: '1.1rem 1.25rem', marginBottom: '1.25rem', animation: 'slide-up 0.3s ease both' }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.8rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${col}1e`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                      {primaryAction.track.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: col, fontSize: '0.57rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: '0.1rem' }}>
                        {isLocked ? td.missedDay : td.activeTrack}
                      </div>
                      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>{primaryAction.track.title}</div>
                      <div style={{ color: 'rgba(241,245,249,0.33)', fontSize: '0.68rem', marginTop: '0.08rem' }}>
                        {isLocked ? 'ממשיכים מכאן — לחץ להמשך' : `יום ${primaryAction.dayNum} מתוך ${primaryAction.track.days}`}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ color: col, fontSize: '0.7rem', fontWeight: 800 }}>+{primaryAction.xp} XP</div>
                      <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.6rem' }}>/ יום</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', direction: 'ltr', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${col}80,${col})`, width: `${pct}%`, transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.22rem' }}>
                      <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.58rem' }}>{pct}% הושלם</span>
                      <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.58rem' }}>{primaryAction.dayNum - 1}/{primaryAction.track.days} ימים</span>
                    </div>
                  </div>

                  {/* Streak pill */}
                  {streak > 0 && !isLocked && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.16)', borderRadius: 20, padding: '0.28rem 0.8rem' }}>
                        <span style={{ fontSize: '0.82rem' }}>🔥</span>
                        <span style={{ color: '#fbbf24', fontSize: '0.76rem', fontWeight: 800 }}>{streak} ימים ברצף</span>
                      </div>
                    </div>
                  )}

                  {/* CTA → ProofModal directly (or Tracks tab when locked) */}
                  <button
                    className="btn-primary btn-tactile"
                    onClick={() => isLocked
                      ? setActiveTab('tracks')
                      : openChallengeModal(primaryAction.track, primaryAction.dayNum, primaryAction.taskDesc)
                    }
                    style={{ width: '100%', padding: '0.95rem', borderRadius: 14, fontSize: '0.95rem', fontWeight: 900 }}
                  >
                    {isLocked ? 'עבור למסלולים ←' : `✅ השלם יום ${primaryAction.dayNum} ←`}
                  </button>
                </div>
              )
            })()}

            {/* ── Habits-only primary action ── */}
            {primaryAction.type === 'habit' && (
              <div style={{ textAlign: 'center', padding: '0.75rem 0 0.5rem', animation: 'fadeIn 0.3s ease' }}>
                <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem', margin: 0 }}>סמן הרגלים כמושלמים כדי להמשיך</p>
              </div>
            )}

            {/* ── Add Habit CTA when no habits exist ── */}
            {triggers.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-tactile"
                style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px dashed rgba(196,121,90,0.35)', background: 'rgba(196,121,90,0.05)', color: '#d4956e', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                + הוסף הרגל יומי
              </button>
            )}

            {/* ── All done ── */}
            {primaryAction.type === 'all-done' && (
              <div style={{ textAlign: 'center', animation: 'slide-up 0.35s ease both', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>✅</div>
                <h2 style={{ color: '#10b981', fontWeight: 900, fontSize: '1.3rem', marginBottom: '0.4rem' }}>הכל הושלם היום!</h2>
                <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>חזור מחר כדי לשמור על הרצף.</p>
                {streak > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 20, padding: '0.4rem 1rem' }}>
                    <span>🔥</span>
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.88rem' }}>{streak} ימים ברצף — כל הכבוד!</span>
                  </div>
                )}
              </div>
            )}

            {/* ── No tasks ── */}
            {primaryAction.type === 'no-tasks' && (
              <div style={{ textAlign: 'center', animation: 'slide-up 0.35s ease both', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎯</div>
                <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.5rem' }}>בחר מסלול להתחיל</h2>
                <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  לא הגדרת מסלול עדיין.<br/>בחר אחד ותתחיל לצבור XP היום.
                </p>
                <button
                  className="btn-primary btn-tactile"
                  onClick={() => setActiveTab('tracks')}
                  style={{ padding: '1.1rem 2rem', borderRadius: 18, fontSize: '1rem', fontWeight: 900 }}
                >
                  📚 המסלולים שלי ←
                </button>
              </div>
            )}

            {/* ── Daily Energy Log ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.1rem 0' }}>
              <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>אנרגיה:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {ENERGY_TAGS.map(tag => {
                  const selected = todayEnergy === tag.id
                  return (
                    <button
                      key={tag.id}
                      onClick={() => { logEnergy(tag.id); setTodayEnergy(tag.id) }}
                      className="btn-tactile"
                      style={{ padding: '0.3rem 0.65rem', borderRadius: 20, border: `1px solid ${selected ? tag.color + '55' : tag.color + '22'}`, background: selected ? `${tag.color}18` : 'transparent', color: selected ? tag.color : `${tag.color}70`, fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Training buttons ── */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                className="btn-tactile"
                onClick={() => setShowWorkoutLib(true)}
                style={{ flex: 1, padding: '0.85rem 0.75rem', borderRadius: 14, border: '1px solid rgba(196,121,90,0.32)', background: 'linear-gradient(135deg,rgba(196,121,90,0.09),rgba(196,121,90,0.04))', color: '#d4956e', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                💪 אימוני כושר ←
              </button>
              <button
                className="btn-tactile"
                onClick={() => setShowCombatTraining(true)}
                style={{ flex: 1, padding: '0.85rem 0.75rem', borderRadius: 14, border: '1px solid rgba(239,68,68,0.32)', background: 'linear-gradient(135deg,rgba(239,68,68,0.09),rgba(239,68,68,0.04))', color: '#f87171', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                🥊 זירת לחימה ←
              </button>
            </div>

            {/* ── Monthly Roadmap (collapsible) ── */}
            <div style={{ marginBottom: 0 }}>
              <button
                onClick={() => toggleSection('roadmap')}
                className="btn-tactile"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: '0.4rem 0.2rem', cursor: 'pointer', marginBottom: sectionsOpen.roadmap !== false ? '0.4rem' : 0 }}
              >
                <span style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>🗓️ מפת דרכים חודשית</span>
                <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.72rem' }}>{sectionsOpen.roadmap !== false ? '▲' : '▼'}</span>
              </button>
              {sectionsOpen.roadmap !== false && <MonthlyRoadmap currentDay={customPath?.progress?.currentDay} />}
            </div>


            {/* ── Weekly Spark ── */}
            <WeeklySpark completedDays={weeklyCompletedDays} />

            {/* ── Advanced Features (unlocked after 3-day streak) ── */}
            {isAdvancedUnlocked && (
              <>
                {/* Unlock celebration banner */}
                {showUnlockBanner && (
                  <div style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.32)', borderRadius: 18, padding: '1.1rem 1.3rem', animation: 'fadeIn 0.35s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎉</span>
                        <div>
                          <div style={{ color: '#a5b4fc', fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.18rem' }}>כלים מתקדמים נפתחו!</div>
                          <div style={{ color: 'rgba(165,180,252,0.5)', fontSize: '0.71rem', lineHeight: 1.5 }}>3 ימים ברצף — הגעת לרמה הבאה. כל הכבוד.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => { localStorage.setItem('ft_advanced_seen', '1'); setShowUnlockBanner(false) }}
                        style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.25)', fontSize: '0.9rem', cursor: 'pointer', padding: '0.1rem 0.2rem', lineHeight: 1, flexShrink: 0 }}
                      >✕</button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowDetails(v => !v)}
                  className="btn-tactile"
                  style={{ width: '100%', marginTop: '1.5rem', marginBottom: showDetails ? '1rem' : 0, padding: '0.65rem', background: 'none', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, color: 'rgba(165,180,252,0.4)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  {showDetails ? '▲ סגור' : '▼ כלים מתקדמים · AI · אימון'}
                </button>

                {showDetails && (
                  <div style={{ animation: 'fadeIn 0.22s ease' }}>
                    <DailyBrief />
                    {!isGuest && customPath && (
                      <button
                        onClick={() => {
                          if (!window.confirm('שים לב: בנייה מחדש תמחק את המסלול הנוכחי ואת ההתקדמות שלך במסלול זה. להמשיך?')) return
                          setCustomPath(null); setShowPathBuilder(true)
                        }}
                        className="btn-tactile"
                        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.65rem 1rem', borderRadius: 12, border: '1px dashed rgba(245,197,24,0.25)', background: 'rgba(245,197,24,0.04)', color: 'rgba(245,197,24,0.55)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        ♻️ בנה מסלול מחדש
                      </button>
                    )}
                    {!profile?.goal && !isGuest && (
                      <button
                        onClick={() => setShowGoalEdit(true)}
                        className="btn-tactile"
                        style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 14, border: '1px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', color: 'rgba(165,180,252,0.7)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                      >
                        🎯 הגדר מטרה אישית
                      </button>
                    )}
                    <DisciplineGoalCard />
                    <div style={{ marginBottom: '1.1rem', marginTop: '0.75rem' }}>
                      <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.4, letterSpacing: '-0.01em', margin: 0, ...(winnerGlow ? { textShadow: '0 0 32px rgba(251,191,36,0.25)' } : {}) }}>
                        {dynamicGreeting}
                      </h2>
                      <p style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                        {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Mantra ── */}
            <MantraCard idx={mantraIdx} onCycle={() => setMantraIdx(i => (i + 1) % MANTRAS.length)} />

            <div style={{ height: TAB_H + 16 }} />
          </div>
        )}

        {/* ── TRACKS TAB ── */}
        {activeTab === 'tracks' && (
          <TracksPage
            profile={profile}
            onAwardXP={(amount, guestMode) => { if (!guestMode) { awardXP(amount); bumpStreak() } else setXPToast('signin') }}
            onSaveProfile={update => setProfile(p => ({ ...p, ...update }))}
          />
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <AnalyticsTab profile={profile} currentUid={user?.uid} activePathName={customPath?.path?.path_name || null} customPath={customPath} />
        )}

        {/* ── ARENA TAB ── */}
        {activeTab === 'arena' && (
          <ArenaPage
            uid={user?.uid}
            userName={profile?.name || 'PRIME User'}
            isGuest={isGuest}
          />
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ paddingBottom: TAB_H + 16 }}>
            <Settings
              activePathName={customPath?.path_name || null}
              onRebuildPath={() => {
                try {
                  localStorage.removeItem('prime_track_quiz')
                  Object.keys(localStorage)
                    .filter(k => k.startsWith('lessonCache_') || k.startsWith('prime_lesson_') || k.startsWith('prime_benchmarks_'))
                    .forEach(k => localStorage.removeItem(k))
                } catch {}
                if (!isGuest && user) {
                  saveProfile(user.uid, { challenges: {}, trackQuizRecs: [] }).catch(() => {})
                  setProfile(p => p ? { ...p, challenges: {}, trackQuizRecs: [] } : p)
                }
                setCustomPath(null); setShowPathBuilder(true); setActiveTab('home')
              }}
            />
            {!isGuest && (
              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                <button
                  onClick={() => setShowPathHistory(true)}
                  className="btn-tactile"
                  style={{ width: '100%', padding: '0.9rem', borderRadius: 14, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.22)', color: '#06b6d4', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  📂 ארכיון מסלולים
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div className="prime-tab-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: TAB_H, background: 'rgba(14,14,22,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', zIndex: 200 }}>
        {[{ id: 'home', icon: '🏠', label: td.tabHome }, { id: 'tracks', icon: '📚', label: td.tabTracks }, { id: 'arena', icon: '🏟️', label: 'זירה' }, { id: 'stats', icon: '📊', label: td.tabStats }, { id: 'settings', icon: '⚙️', label: td.tabSettings }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '1.2rem', filter: activeTab === tab.id ? 'none' : 'grayscale(0.8) opacity(0.45)' }}>{tab.icon}</span>
            <span style={{ fontSize: '0.61rem', fontWeight: 700, color: activeTab === tab.id ? '#d4956e' : 'rgba(241,245,249,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{tab.label}</span>
            {activeTab === tab.id && <div style={{ width: 18, height: 2, borderRadius: 99, background: '#c4795a' }} />}
          </button>
        ))}
      </div>

      {/* ── Overlays ── */}
      {showCombatTraining && (
        <TrainingMode
          onClose={() => setShowCombatTraining(false)}
          onAwardXP={amount => { setShowCombatTraining(false); awardXP(amount); bumpStreak() }}
        />
      )}
      {showWorkoutLib && (
        <WorkoutLibraryModal
          onSelect={ex => {
            setShowWorkoutLib(false)
            const trackDef = ex.trackId ? TRACK_MAP[ex.trackId] : null
            if (trackDef && (trackDef.useCamera || trackDef.category === 'cardio')) {
              setBoxingSession({ track: trackDef, goal: trackDef.startGoal })
            } else {
              setWorkoutSession(ex)
            }
          }}
          onClose={() => setShowWorkoutLib(false)}
        />
      )}
      {workoutSession && (
        <SetSummaryModal
          exercise={workoutSession}
          onAwardXP={() => { awardXP(20); bumpStreak() }}
          onDone={() => setWorkoutSession(null)}
          onClose={() => setWorkoutSession(null)}
        />
      )}
      {boxingSession && (
        <ActiveWorkout
          track={boxingSession.track}
          goal={boxingSession.goal}
          uid={user?.uid}
          userName={profile?.name || 'PRIME User'}
          visionProfile={customPath?.vision_profile || null}
          onComplete={({ amount = 0 } = {}) => {
              const track = boxingSession?.track
              setBoxingSession(null)
              if (!track || !amount) return
              let xp
              if (track.category === 'cardio') {
                xp = Math.max(10, Math.round(amount * 4))         // minutes × 4
              } else if (track.poseType === 'boxing') {
                xp = Math.max(10, Math.round(amount * 0.5))       // punches × 0.5
              } else {
                xp = Math.max(10, Math.round(amount * 2))         // reps × 2
              }
              awardXP(xp)
              bumpStreak()
            }}
          onClose={() => setBoxingSession(null)}
        />
      )}
      {/* ── Live Cardio Mini-bar — shows when workout active but overlay closed ── */}
      {liveCardio && !boxingSession && (() => {
        const elapsed = Math.round((Date.now() - liveCardio.startTimestamp) / 1000)
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
        const s = String(elapsed % 60).padStart(2, '0')
        const track = TRACK_MAP[liveCardio.trackId]
        return (
          <div
            onClick={() => { if (track) setBoxingSession({ track, goal: liveCardio.goal }) }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
              background: 'rgba(10,12,26,0.92)', backdropFilter: 'blur(14px)',
              borderBottom: '1px solid rgba(245,197,24,0.25)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.55rem 1.1rem', cursor: 'pointer',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <span style={{ fontSize: '1.1rem', animation: 'cam-pulse 1.5s ease infinite' }}>🏃‍♂️</span>
            <span style={{ color: '#F5C518', fontWeight: 900, fontSize: '1rem', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{m}:{s}</span>
            {liveCardio.distance > 0 && (
              <span style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.78rem', fontWeight: 700 }}>{liveCardio.distance.toFixed(2)} ק"מ</span>
            )}
            <span style={{ flex: 1, color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem' }}>{liveCardio.trackName || 'ריצה פעילה'}</span>
            <span style={{ color: 'rgba(196,121,90,0.8)', fontSize: '0.7rem', fontWeight: 700 }}>הרחב ←</span>
          </div>
        )
      })()}
      {showModal && <AddTriggerModal onSave={handleAddTrigger} onClose={() => setShowModal(false)} td={td} to={to} />}
      {showGoalEdit && (
        <GoalEditModal
          goal={profile?.goal || null}
          onSave={handleSaveGoal}
          onClear={handleClearGoal}
          onClose={() => setShowGoalEdit(false)}
        />
      )}
      {editHabit && (
        <EditHabitModal
          trigger={editHabit}
          onSave={(newCue, newHabit) => handleEditHabit(editHabit.id, newCue, newHabit)}
          onDelete={() => handleDeleteHabit(editHabit.id)}
          onClose={() => setEditHabit(null)}
        />
      )}
      {proofModal && (
        <ProofOfActionModal
          title={proofModal.title}
          taskDesc={proofModal.taskDesc}
          emoji={proofModal.emoji || '⚡'}
          accentColor={proofModal.color || '#F5C518'}
          taskId={proofModal.id}
          type={proofModal.type}
          uid={user?.uid}
          onConfirm={proofModal.type === 'habit' ? confirmHabitComplete : confirmChallengeComplete}
          onClose={() => setProofModal(null)}
        />
      )}
      {xpToast && <XPToast xp={xpToast} onDone={() => setXPToast(null)} />}

      {/* ── Anti-Churn Prompt ── */}
      {showAntiChurn && (
        <div
          onClick={() => { localStorage.setItem(`prime_anti_churn_${todayKey()}`, '1'); setShowAntiChurn(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 8500, background: 'rgba(5,5,12,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1.5rem', animation: 'fadeIn 0.25s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, background: 'linear-gradient(160deg,#0f172a,#0a0f1e)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px 20px 0 0', padding: '1.75rem 1.5rem 2.4rem', animation: 'slide-up 0.3s cubic-bezier(.34,1.26,.64,1)' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.6rem' }}>⚔️</div>
              <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.05rem', margin: '0 0 0.5rem' }}>
                העצמי הנוכחי שלך מחליט עכשיו
              </h3>
              <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
                היום עדיין לא הסתיים — ועדיין יש לך הרגלים לא שהושלמו.<br />
                העצמי העתידי שלך נבנה בדיוק בנקודות כאלה.
              </p>
            </div>

            <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '0.9rem 1rem', marginBottom: '1.2rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '0.05rem' }}>💬</span>
              <p style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "הפרש בין מי שאתה היום למי שתהיה בעוד 30 יום נמדד בהחלטות קטנות כמו זו."
              </p>
            </div>

            <button
              onClick={() => { setShowAntiChurn(false); setActiveTab('home') }}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.95rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', marginBottom: '0.6rem', boxShadow: '0 6px 24px rgba(99,102,241,0.35)' }}
            >
              השלם עכשיו ←
            </button>
            <button
              onClick={() => { localStorage.setItem(`prime_anti_churn_${todayKey()}`, '1'); setShowAntiChurn(false) }}
              style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(241,245,249,0.22)', fontSize: '0.78rem', cursor: 'pointer', padding: '0.35rem' }}
            >
              לא היום — ממשיך בלי
            </button>
          </div>
        </div>
      )}

      {/* ── Level Up Modal ── */}
      {levelUpModal && (
        <div
          onClick={() => setLevelUpModal(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(5,5,12,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'center', padding: '2rem 2.5rem' }}>
            <ConfettiBurst />
            <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '1.2rem' }}>⬆ LEVEL UP</div>
            <div style={{ color: '#F5C518', fontSize: '7rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1, textShadow: '0 0 60px rgba(245,197,24,0.55)', animation: 'level-up-burst 0.55s cubic-bezier(.34,1.56,.64,1) both' }}>
              {levelUpModal}
            </div>
            <div style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 900, marginTop: '0.7rem', marginBottom: '1.8rem' }}>
              רמה {levelUpModal}
            </div>
            <div style={{ width: 200, margin: '0 auto 0.6rem', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((getLevelXP(xp) / XP_PER_LEVEL) * 100)}%`, background: 'linear-gradient(90deg,#D4A017,#F5C518)', borderRadius: 99, animation: 'xp-fill 0.9s 0.4s ease both' }} />
            </div>
            <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.74rem' }}>{toNext} XP לרמה הבאה</div>
            <div style={{ marginTop: '2.5rem', color: 'rgba(241,245,249,0.18)', fontSize: '0.65rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>לחץ בכל מקום להמשך</div>
          </div>
        </div>
      )}

      {showPathHistory && user && (
        <PathHistory
          user={user}
          onRestore={restored => { setCustomPath(restored); setShowPathHistory(false) }}
          onClose={() => setShowPathHistory(false)}
        />
      )}

      {saving && <div style={{ position: 'fixed', bottom: TAB_H + 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(196,121,90,0.92)', color: '#fff', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.78rem', fontWeight: 600, zIndex: 300 }}>{td.saving}</div>}
      <AddToHomeScreen />

    </div>
  )
}
