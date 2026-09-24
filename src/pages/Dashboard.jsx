import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { subscribeProfile, saveProfile, syncLeaderboard, syncCompletionStatus } from '../services/focusTriggerService'
import { checkContractStatus, getRank, getScore } from '../services/disciplineScore'
import { requestPermission, checkNotifications, checkNudges, saveNudgeResponse, snoozeNudge, markNudgeDone, __devQueueTestNudge } from '../services/notificationService'
import { analyzeVideoForm } from '../services/coachService'
import { CHALLENGES, getDayTask, getModuleIndex } from '../data/challenges'
import { getDayContent } from '../data/lessonContent'
import { MANTRAS } from '../data/mantras'
import TracksPage from './TracksPage'
import AnalyticsTab from './AnalyticsTab'
import InitiationFlow from './InitiationFlow'
import AddToHomeScreen from '../components/AddToHomeScreen'
import ContractLock from '../components/ContractLock'
import PrimeOnboarding, { hasSeenOnboarding } from '../components/PrimeOnboarding'
import PathBuilder from '../components/PathBuilder'
import Settings from '../components/Settings'
import ArenaPage from './ArenaPage'
import TrainingMode from '../components/TrainingMode'
import CombatProtocols from '../components/CombatProtocols'
import { buildCustomPath } from '../services/pathBuilderService'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { checkAndGenerateMirror } from '../services/mirrorService'
import { getTodayEnergy } from '../services/energyLogService'
import ProofOfActionModal from '../components/ProofOfActionModal'
import PathHistory from '../components/PathHistory'
import ActiveWorkout from '../components/ActiveWorkout'
import { TRACK_MAP } from '../data/trainingTracks'
import { getDailyChallenge } from '../data/dailyQuests'
import { Home, Dumbbell, TrendingUp, User, PencilLine } from 'lucide-react'
import { XP, getLevelName } from '../config/xp'
import WeekStrip from '../components/dashboard/WeekStrip'
import WorkoutsScreen from './WorkoutsScreen'
import SurpriseMissionCard from '../components/SurpriseMissionCard'
import { SURPRISE_CATEGORIES, DEFAULT_ENABLED_CATEGORIES } from '../data/surpriseMissions'
import HabitCreationFlow from '../components/HabitCreationFlow'
import GrowthPillarSelector from '../components/GrowthPillarSelector'
import HobbyReflection from '../components/HobbyReflection'
import HobbyDiscoveryProgress from '../components/HobbyDiscoveryProgress'
import { HOBBY_DISCOVERY_ID, getHobbyDay } from '../data/hobbyDiscovery'
import { DEFAULT_PILLARS } from '../data/pillars'
import { shouldShowLateReminder, getIncompleteCount } from '../utils/habitReminder'
import { getEffectiveStreak } from '../utils/streak'
import BoxingPathScreen from '../components/boxing/BoxingPathScreen'
import BoxingWorkoutPreview from '../components/boxing/BoxingWorkoutPreview'
import BoxingActiveWorkout from '../components/boxing/BoxingActiveWorkout'
import BoxingCompletion from '../components/boxing/BoxingCompletion'
import { getBoxingState, getNextWorkout, completeWorkout } from '../utils/boxingProgress'
import CombatWorkoutPreview from '../components/combat/CombatWorkoutPreview'
import CombatCompletion from '../components/combat/CombatCompletion'
import MuayThaiPathScreen from '../components/muaythai/MuayThaiPathScreen'
import { getMuayThaiState, getNextWorkout as getMTNextWorkout, completeWorkout as completeMTWorkout } from '../utils/muayThaiProgress'
import { MT_LEVELS } from '../data/muayThaiPath'
import BoxingDrillTimer from '../components/boxing/BoxingDrillTimer'
import { buildDrill, getLastDuration } from '../data/boxingDrills'
import { claimDailyWorkoutReward } from '../services/workoutRewardService'
import { INSTANT_BOXING_WORKOUT, INSTANT_MT_WORKOUT } from '../data/instantWorkouts'
import DailyLessonCard from '../components/DailyLessonCard'

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

const getLevel   = xp => Math.floor((xp || 0) / XP.PER_LEVEL) + 1

const MT_TRAINING_OPTIONS = [
  { id: 'shadow', label: 'צל', emoji: '👤', desc: 'ללא ציוד' },
  { id: 'bag',    label: 'שק', emoji: '🥊', desc: 'עם שק אימון' },
]
const MT_REFLECTION_OPTIONS = [
  { id: 'stance',    label: 'עמידה' },
  { id: 'guard',     label: 'שמירה' },
  { id: 'movement',  label: 'תנועה' },
  { id: 'balance',   label: 'שיווי משקל' },
  { id: 'timing',    label: 'תזמון' },
  { id: 'felt-good', label: 'הרגיש טוב' },
]
const getLevelXP = xp => (xp || 0) % XP.PER_LEVEL
const getToNext  = xp => XP.PER_LEVEL - getLevelXP(xp)

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
    <div style={{ position: 'fixed', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', border: '1px solid rgba(245,197,24,0.3)', color: '#d4a843', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.83rem', fontWeight: 800, zIndex: 9999, animation: 'xp-pop 0.35s cubic-bezier(.34,1.56,.64,1) forwards', boxShadow: '0 1px 3px rgba(0,0,0,0.4)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
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
        <button onClick={() => canSave && onSave({ cue: cue.trim(), habit: habit.trim(), time: time || null, note: note.trim() })} disabled={!canSave} className={canSave ? 'btn-tactile' : ''} style={{ width: '100%', padding: '0.95rem', borderRadius: 12, border: 'none', background: canSave ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: canSave ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: canSave ? 'pointer' : 'not-allowed', boxShadow: canSave ? '0 2px 8px rgba(0,0,0,0.4)' : 'none', transition: 'all 0.15s' }}>{td.save}</button>
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
  { id: 'boxing',   emoji: '🥊', name: 'איגרוף',           desc: 'מסלול מודרך · 7 רמות',     trackId: 'boxing-muaythai',  available: true },
  { id: 'muaythai', emoji: '🥋', name: 'מואי תאי',       desc: 'AI מאמן טכניקה בזמן אמת',  trackId: 'boxing-muaythai',  available: true },
]

function WorkoutLibraryModal({ onSelect, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#18181b', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

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
                background: ex.available ? '#111114' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${ex.available ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 16,
                padding: '1rem 0.9rem',
                textAlign: 'right',
                cursor: ex.available ? 'pointer' : 'default',
                opacity: ex.available ? 1 : 0.42,
              }}
            >
              {!ex.available && (
                <span style={{ position: 'absolute', top: 8, left: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.1rem 0.45rem', fontSize: '0.56rem', fontWeight: 800, color: 'rgba(232,232,232,0.45)', letterSpacing: '0.04em' }}>
                  בקרוב
                </span>
              )}
              <div style={{ fontSize: '1.8rem', marginBottom: '0.45rem' }}>{ex.emoji}</div>
              <div style={{ color: ex.available ? '#f1f5f9' : 'rgba(241,245,249,0.45)', fontSize: '0.87rem', fontWeight: 800, marginBottom: '0.18rem' }}>{ex.name}</div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.7rem' }}>{ex.desc}</div>
              {ex.available && (
                <div style={{ marginTop: '0.55rem', color: 'rgba(232,232,232,0.5)', fontSize: '0.65rem', fontWeight: 700 }}>התחל ←</div>
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
      <div style={{ width: '100%', maxWidth: 480, background: '#18181b', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'slide-up 0.25s ease' }}>

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
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: 'rgba(232,232,232,0.6)', fontSize: '0.72rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', minHeight: 44 }}
                >
                  📹 הקלט טופס
                </button>
              )}
              {videoBlobUrl && (
                <button
                  onClick={deleteVideo}
                  className="btn-tactile"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: 'rgba(232,232,232,0.6)', fontSize: '0.72rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', minHeight: 44 }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.7rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, marginBottom: '1rem' }}>
                <div className="anim-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: 'rgba(232,232,232,0.55)', fontSize: '0.78rem', fontWeight: 600 }}>מנתח טופס...</span>
              </div>
            )}

            {aiState === 'done' && aiFeedback && (
              <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🤖</span>
                  <span style={{ color: 'rgba(232,232,232,0.6)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>ניתוח טופס</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {aiFeedback.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10, padding: '0.6rem 0.85rem',
                    }}>
                      <p style={{ color: 'rgba(241,245,249,0.85)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiState === 'error' && (
              <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, marginBottom: '1rem', color: '#ef4444', fontSize: '0.75rem' }}>
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

// eslint-disable-next-line no-unused-vars
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
    <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '1.15rem 1.25rem 1.05rem', marginBottom: 0, position: 'relative' }}>
      <button
        onClick={onEdit}
        className="btn-tactile"
        style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'none', border: 'none', color: 'rgba(241,245,249,0.28)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, fontWeight: 700 }}
      >✎</button>
      <div style={{ color: '#d4a843', fontSize: '0.53rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.3rem' }}>🎯 מטרה אישית</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.7rem', paddingLeft: '0.5rem' }}>{goal.title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.55rem' }}>
        <span style={{ color: done ? '#34d399' : '#d4a843', fontSize: '2.2rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1 }}>
          {done ? '✓' : remaining}
        </span>
        <span style={{ color: done ? 'rgba(52,211,153,0.7)' : 'rgba(212,168,67,0.65)', fontSize: '0.95rem', fontWeight: 700 }}>
          {done ? 'הגעת ליעד!' : 'ימים נותרו'}
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#d4a843', opacity: 0.7, borderRadius: 99, transition: 'width 0.7s ease' }} />
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
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#18181b', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem 1.4rem 2.6rem', animation: 'slide-up 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <span style={{ color: '#d4a843', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>🎯 מטרה אישית</span>
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
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: 'rgba(232,232,232,0.6)', fontSize: '0.75rem', fontWeight: 700, padding: '0 0.85rem', cursor: 'pointer', minHeight: 44, minWidth: 0 }}
            >{q.l}</button>
          ))}
        </div>
        <input
          type="date"
          className="glow-input"
          value={targetDate}
          min={minDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.95rem', borderRadius: 11, border: `1px solid ${targetDate ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '1.4rem', outline: 'none', colorScheme: 'dark' }}
        />
        <button
          onClick={() => canSave && onSave(title.trim(), targetDate)}
          disabled={!canSave}
          className="btn-tactile"
          style={{ width: '100%', padding: '0.95rem', borderRadius: 14, border: 'none', background: canSave ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: canSave ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: canSave ? 'pointer' : 'not-allowed', marginBottom: '0.6rem', boxShadow: canSave ? '0 2px 8px rgba(0,0,0,0.4)' : 'none', transition: 'all 0.15s' }}
        >שמור מטרה</button>
        {goal && (
          <button
            onClick={onClear}
            className="btn-tactile"
            style={{ width: '100%', padding: '0.7rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(232,232,232,0.3)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
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
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#18181b', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 1.4rem 2.6rem', animation: 'slide-up 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <span style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>✎ עריכת הרגל</span>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(241,245,249,0.55)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
        </div>

        {confirmDel ? (
          <div style={{ animation: 'fadeIn 0.18s ease' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.1rem 1.2rem', marginBottom: '1.1rem', textAlign: 'center' }}>
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
                style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
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
              style={{ width: '100%', padding: '0.95rem', borderRadius: 14, border: 'none', background: canSave ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: canSave ? '#0d0d0d' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', marginBottom: '0.6rem', boxShadow: canSave ? '0 2px 8px rgba(0,0,0,0.4)' : 'none' }}
            >
              שמור שינויים
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,232,232,0.3)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🗑 מחק הרגל
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
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
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: 'rgba(232,232,232,0.4)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.3rem 0.9rem', minHeight: 36, letterSpacing: '0.06em', fontFamily: "'SF Mono','Fira Code',monospace" }}
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
  const [showHabitFlow,    setShowHabitFlow]    = useState(false)
  const [habitFlowPrefill, setHabitFlowPrefill] = useState(null)
  const [showHobbyReflection, setShowHobbyReflection] = useState(false)
  const [pendingHobbyDay,    setPendingHobbyDay]    = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [xpToast,      setXPToast]      = useState(null)
  const [activeTab,    setActiveTab]    = useState('home')
  const [showWorkoutLib,    setShowWorkoutLib]    = useState(false)
  const [workoutSession,    setWorkoutSession]    = useState(null)
  const [boxingSession,     setBoxingSession]     = useState(null)  // { track, goal } | null
  const [showCombatTraining,setShowCombatTraining]= useState(false)
  const [showCombatProtocols, setShowCombatProtocols] = useState(false)
  const [showBoxingPath,      setShowBoxingPath]      = useState(false)
  const [boxingPreview,       setBoxingPreview]       = useState(null)   // workout object
  const [boxingActive,        setBoxingActive]        = useState(null)   // { workout, trainingType }
  const [boxingCompletion,    setBoxingCompletion]    = useState(null)   // completion data
  const [showMuayThaiPath,   setShowMuayThaiPath]   = useState(false)
  const [mtPreview,           setMtPreview]           = useState(null)
  const [mtActive,            setMtActive]            = useState(null)
  const [mtCompletion,        setMtCompletion]        = useState(null)
  const [mtDrillActive,       setMtDrillActive]       = useState(null)  // quick-start drill for MT
  const [_showDetails,      setShowDetails]       = useState(false)
  const [_contractLocked, setContractLocked] = useState(() => checkContractStatus().locked)
  const [_headerScore,    setHeaderScore]    = useState(getScore)
  const [customPath,     setCustomPath]     = useState(null)
  const [showPathBuilder,setShowPathBuilder]= useState(false)
  const [pathLoading,    setPathLoading]    = useState(true)
  const [_mirrorData,    setMirrorData]     = useState(null)   // { gapDays, message }
  const [liveCardio,    setLiveCardio]    = useState(null)    // active cardio session from localStorage
  const [liveTick,      setLiveTick]      = useState(0)       // increments every second for mini-bar

  // proofModal: { type: 'habit'|'challenge', id, title, taskDesc, xp, color }
  const [proofModal,   setProofModal]   = useState(null)
  // quickTask merged into proofModal
  const [editHabit,    setEditHabit]    = useState(null)
  const [showGoalEdit, setShowGoalEdit] = useState(false)
  const [levelUpModal, setLevelUpModal] = useState(null)
  const [_mantraIdx,      _setMantraIdx]        = useState(() => new Date().getDate() % MANTRAS.length)
  const [_showUnlockBanner,setShowUnlockBanner] = useState(false)
  const [showMyRoutine,  setShowMyRoutine]   = useState(false)
  const [completingId,     setCompletingId]     = useState(null)
  const [showPathHistory,  setShowPathHistory]  = useState(false)
  const [_todayEnergy,    _setTodayEnergy]      = useState(() => getTodayEnergy())
  const [dailyQuestsDone,  setDailyQuestsDone]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(`prime_quests_${todayKey()}`) || '{}') } catch { return {} }
  })
  const [challengeDone,    setChallengeDone]    = useState(() => {
    try { return localStorage.getItem(`prime_challenge_${todayKey()}`) === 'true' } catch { return false }
  })
  const dailyChallenge = useMemo(() => getDailyChallenge(), [])
  const [_sectionsOpen,    setSectionsOpen]     = useState(() => {
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

  // Dev console hook — window.__primeFire() queues a nudge for the next interval tick
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__primeFire = __devQueueTestNudge
      return () => { delete window.__primeFire }
    }
  }, [])

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

  const streak             = getEffectiveStreak(profile)
  const _winnerGlow        = streak >= 7
  const isAdvancedUnlocked = streak >= 3



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
    syncCompletionStatus(user.uid, today).catch(() => {})
  }

  // eslint-disable-next-line no-unused-vars
  function completeQuest(questId, xp) {
    if (dailyQuestsDone[questId] || isGuest) return
    const next = { ...dailyQuestsDone, [questId]: true }
    localStorage.setItem(`prime_quests_${todayKey()}`, JSON.stringify(next))
    setDailyQuestsDone(next)
    awardXP(xp)
    bumpStreak()
  }

  // eslint-disable-next-line no-unused-vars
  function completeChallenge() {
    if (challengeDone || isGuest) return
    localStorage.setItem(`prime_challenge_${todayKey()}`, 'true')
    setChallengeDone(true)
    awardXP(dailyChallenge.xp)
    bumpStreak()
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
    syncCompletionStatus(user.uid, today).catch(() => {})
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
    awardXP(XP.HABIT)
    updateStreak(next, profile?.triggers || [])
  }


  function normalizeHabitTitle(s) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
  }

  function hasDuplicateHabit(existing, title) {
    const n = normalizeHabitTitle(title)
    return existing.some(t => normalizeHabitTitle(t.cue) === n || normalizeHabitTitle(t.habit) === n)
  }

  async function handleAddTrigger(data) {
    if (isGuest) { setShowModal(false); return }
    const existing = profile?.triggers || []
    const activeCount = existing.filter(t => !t.archived).length
    if (activeCount >= 3) { setShowModal(false); return }
    if (hasDuplicateHabit(existing, data.habit || data.cue)) { setShowModal(false); setShowHabitFlow(false); return }
    setSaving(true)
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

  // eslint-disable-next-line no-unused-vars
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
    awardXP(XP.MISSION)
    bumpStreak()
    // Hobby Discovery: show per-day reflection after completion
    if (challenge.id === HOBBY_DISCOVERY_ID) {
      setPendingHobbyDay(daysCompleted)
      setShowHobbyReflection(true)
    }
  }

  async function handleConvertToHabit(prefill) {
    if (isGuest) return { error: 'guest' }
    const existing   = profile?.triggers || []
    const activeCount = existing.filter(t => !t.archived).length
    if (activeCount >= 3) return { error: 'limit' }
    if (hasDuplicateHabit(existing, prefill.titleHe)) return { error: 'duplicate' }
    const newTrigger = {
      id:        `t${Date.now()}`,
      cue:       prefill.titleHe,
      habit:     prefill.titleHe,
      pillar:    prefill.pillar || null,
      source:    'surprise-mission',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    const updated = { ...(profile || {}), triggers: [...existing, newTrigger], onboardingDone: true }
    try {
      await saveProfile(user.uid, updated)
      setProfile(updated)
      return { success: true }
    } catch {
      return { error: 'save-failed' }
    }
  }

  async function handleHobbyReflectionSave({ day, response, note: _note }) {
    setShowHobbyReflection(false)
    const existing = profile?.hobbyDiscovery?.responses || {}
    const updatedHD = { ...(profile?.hobbyDiscovery || {}), responses: { ...existing, [String(day)]: response } }
    setProfile(p => ({ ...p, hobbyDiscovery: updatedHD }))
    if (!isGuest && user) saveProfile(user.uid, { hobbyDiscovery: updatedHD }).catch(() => {})
  }

  // ── Derived ───────────────────────────────────────────────────

  const triggers  = profile?.triggers || []
  const doneCount = triggers.filter(tr => checkins[tr.id]).length
  const allDone   = triggers.length > 0 && doneCount === triggers.length
  const xp        = profile?.xp || 0
  const toNext    = getToNext(xp)
  const hour      = new Date().getHours()
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
    const greet = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
    const n     = name ? `, ${name}` : ''
    if (streak >= 14) return `${greet}${n}. ${streak} ימים ברצף — אתה לא כמו כולם.`
    if (streak >= 7)  return `${greet}${n}. שבוע ברצף — אל תשבור את הרצף.`
    if (activeTrack)  return `${greet}${n}. יום ${activeTrackDone + 1} ב${activeTrack.title}.`
    if (streak >= 1)  return `${greet}${n}. ${streak} ימים ברצף.`
    return `${greet}${n}. יום חדש, צעד חדש.`
  }, [profile?.name, hour, streak, activeTrack, activeTrackDone])

  const _weeklyCompletedDays = useMemo(() => {
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
  const missedYesterday = !isFirstTimer && streak === 0
  // ── Single primary action ──────────────────────────────────────
  const trackDoneToday   = activeTrack ? profile?.challenges?.[activeTrack.id]?.lastCompletedDate === todayKey() : true
  const firstUndoneHabit = triggers.find(tr => !checkins[tr.id]) ?? null

  // ── New visual-layer derived values ────────────────────────────────
  const currentLevel     = getLevel(xp)
  const currentLevelName = getLevelName(currentLevel)
  const levelXP          = (xp || 0) % XP.PER_LEVEL
  const workoutDoneToday = !!localStorage.getItem(`prime_workout_done_${todayKey()}`)
  const missionDoneToday = !!(activeTrack && profile?.challenges?.[activeTrack.id]?.lastCompletedDate === todayKey())
  const todayTotalTasks  = Math.min(triggers.length, 3) + (activeTrack ? 1 : 0) + 1
  const todayDoneTasks   = doneCount + (missionDoneToday ? 1 : 0) + (workoutDoneToday ? 1 : 0)
  const todayEarnedXP    = (doneCount * XP.HABIT) + (missionDoneToday ? (activeTrack?.xpPerDay || XP.MISSION) : 0) + (workoutDoneToday ? XP.WORKOUT : 0)
  const weeklyWorkoutCount = useMemo(() => {
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      if (localStorage.getItem(`prime_workout_done_${d}`)) count++
    }
    return count
  }, [])

  let primaryAction
  if (activeTrack && !trackDoneToday) {
    const dayNum    = (profile?.challenges?.[activeTrack.id]?.daysCompleted || 0) + 1
    const moduleIdx = getModuleIndex(dayNum)
    const dayInMod  = (dayNum - 1) % 5
    const richDay   = getDayContent(activeTrack.id, moduleIdx, dayInMod)
    const taskDesc  = activeTrack.id === HOBBY_DISCOVERY_ID
      ? (getHobbyDay(dayNum)?.taskHe || getDayTask(activeTrack.id, dayNum))
      : (richDay?.microTask || getDayTask(activeTrack.id, dayNum))
    primaryAction  = { type: 'track', track: activeTrack, dayNum, taskDesc, xp: XP.MISSION }
  } else if (firstUndoneHabit) {
    primaryAction = { type: 'habit', trigger: firstUndoneHabit, xp: XP.HABIT }
  } else if (triggers.length === 0 && !activeTrack) {
    primaryAction = { type: 'no-tasks' }
  } else {
    primaryAction = { type: 'all-done' }
  }

  // Always show skeleton while profile is loading — prevents false-negative
  // profileHasProgress flash that would show PrimeOnboarding/InitiationFlow
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', flexDirection: 'column' }}>
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
      background: '#09090b',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Sticky Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#111317',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.7rem 1.25rem',
        }}>
          {/* Left: Logo + tagline */}
          <div>
            <img src="/prime-logo.svg" alt="PRIME" style={{ height: 24, display: 'block' }} />
          </div>
          {/* Right: Streak + XP compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {streak > 0 && (
              <span style={{ color: '#A4A6AD', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ color: '#D9B34C' }}>●</span>
                {streak}
              </span>
            )}
            {(() => {
              const rank = getRank(xp)
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: '#17191E',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '0.28rem 0.65rem',
                }}>
                  <span style={{ color: '#D9B34C', fontSize: '0.72rem', fontWeight: 800 }}>{rank.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>·</span>
                  <span style={{ color: '#A4A6AD', fontSize: '0.72rem', fontWeight: 600 }}>{xp.toLocaleString()} XP</span>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Guest Banner ── */}
      {isGuest && (
        <div style={{ background: '#111114', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>👁 מצב אורח — ההתקדמות לא תישמר</span>
          <a href="/welcome" className="btn-tactile" style={{ color: '#f59e0b', fontSize: '0.76rem', fontWeight: 800, textDecoration: 'none', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '0.45rem 0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', minHeight: 36 }}>התחבר ←</a>
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: `calc(${TAB_H + 16}px + env(safe-area-inset-bottom, 0px))` }}>

        {/* ── HOME TAB — Command Center ── */}
        {activeTab === 'home' && (
          <div className="prime-home-outer">
            <div ref={pathCardRef} style={{ scrollMarginTop: '4rem' }} />
            <div className="prime-home-grid">

              {/* ── Side Column: Hero, XP bar, Week Strip ── */}
              <aside className="prime-side-col">

                {/* TodayHero — circular arc progress ring */}
                {(() => {
                  const R = 32, C = 2 * Math.PI * R
                  const pct = todayTotalTasks > 0 ? todayDoneTasks / todayTotalTasks : 0
                  const offset = C * (1 - pct)
                  const dayNum = activeTrack ? (activeTrackDone + 1) : null
                  return (
                    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                        <svg width="72" height="72" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                          <circle cx="40" cy="40" r={R} fill="none" stroke={pct >= 1 ? '#3FAF7A' : '#D9B34C'} strokeWidth="5"
                            strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: pct >= 1 ? '#3FAF7A' : '#F4F1E8', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>
                            {todayDoneTasks}/{todayTotalTasks}
                          </span>
                          <span style={{ color: '#71717A', fontSize: '0.48rem', fontWeight: 600, marginTop: 1 }}>משימות</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {dayNum && (
                          <div style={{ color: '#D9B34C', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                            יום {dayNum} מתוך {activeTrack.days}
                          </div>
                        )}
                        {streak > 0 && (
                          <div style={{ color: '#F4F1E8', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.15rem' }}>
                            🔥 {streak === 1 ? 'יום אחד ברצף' : streak === 2 ? 'יומיים ברצף' : `${streak} ימים ברצף`}
                          </div>
                        )}
                        {todayEarnedXP > 0 ? (
                          <div style={{ color: '#A4A6AD', fontSize: '0.7rem', fontWeight: 600 }}>+{todayEarnedXP} XP היום</div>
                        ) : (
                          <div style={{ color: '#71717A', fontSize: '0.7rem' }}>+{XP.HABIT + (activeTrack ? XP.MISSION : 0) + XP.WORKOUT} XP זמין</div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* XP Level progression bar */}
                {(() => {
                  const lvlPct = (levelXP / XP.PER_LEVEL) * 100
                  return (
                    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
                        <span style={{ color: '#D9B34C', fontSize: '0.78rem', fontWeight: 800 }}>דרגה {currentLevel} · {currentLevelName}</span>
                        <span style={{ color: '#71717A', fontSize: '0.63rem', fontWeight: 600 }}>עוד {toNext} XP</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#c49020,#D9B34C)', width: `${lvlPct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ textAlign: 'left', marginTop: '0.3rem', color: '#71717A', fontSize: '0.6rem' }}>
                        {levelXP}/{XP.PER_LEVEL} XP
                      </div>
                    </div>
                  )
                })()}

                {/* 7-day activity strip */}
                <WeekStrip activityLog={profile?.activityLog} />

              </aside>

              {/* ── Main Column ── */}
              <main className="prime-main-col">

                {/* Greeting */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <h1 style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1.05rem', margin: 0, lineHeight: 1.35 }}>
                    {dynamicGreeting}
                  </h1>
                  <ContractLock onRedeemed={() => setContractLocked(false)} />
                </div>

                {/* Program progress bar */}
                {!isGuest && !pathLoading && activeTrack && (() => {
                  const pct = Math.round(((activeTrackDone) / activeTrack.days) * 100)
                  return (
                    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#A4A6AD', fontSize: '0.72rem', fontWeight: 600 }}>{activeTrack.emoji} {activeTrack.title}</span>
                        <span style={{ color: '#D9B34C', fontSize: '0.72rem', fontWeight: 800 }}>יום {activeTrackDone + 1}/{activeTrack.days}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#D9B34C', width: `${pct}%`, borderRadius: 99, opacity: 0.85, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })()}

                {/* Path loading skeleton */}
                {!isGuest && pathLoading && (
                  <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                    <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '60%', marginBottom: '0.4rem', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s 0.1s infinite' }} />
                    </div>
                  </div>
                )}

                {/* Primary Mission Card — gold accent */}
                {primaryAction.type === 'track' && (() => {
                  const mDoneToday = profile?.challenges?.[primaryAction.track.id]?.lastCompletedDate === todayKey()
                  return (
                    <div style={{
                      background: '#111317',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRight: '3px solid rgba(217,179,76,0.55)',
                      borderRadius: 14, padding: '1rem',
                      animation: 'slide-up 0.3s ease both',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(217,179,76,0.1)', border: '1px solid rgba(217,179,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                            {primaryAction.track.emoji}
                          </div>
                          <span style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {mDoneToday ? 'הושלמה' : activeTrackDone > 0 ? 'ממשיכים' : 'מתחילים'} · משימה יומית
                          </span>
                        </div>
                        <span style={{ background: 'rgba(217,179,76,0.12)', color: '#D9B34C', fontSize: '0.62rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                          +{primaryAction.xp} XP
                        </span>
                      </div>
                      <div style={{ color: mDoneToday ? '#71717A' : '#F4F1E8', fontWeight: 700, fontSize: '0.93rem', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                        {primaryAction.taskDesc}
                      </div>
                      <div style={{ color: '#71717A', fontSize: '0.68rem', marginBottom: '0.75rem' }}>
                        יום {primaryAction.dayNum} · {primaryAction.track.title}
                      </div>
                      <button
                        onClick={() => openChallengeModal(primaryAction.track, primaryAction.dayNum, primaryAction.taskDesc)}
                        disabled={mDoneToday}
                        className={mDoneToday ? '' : 'btn-primary btn-tactile btn-wide'}
                        style={{
                          width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none',
                          cursor: mDoneToday ? 'default' : 'pointer',
                          background: mDoneToday ? 'rgba(63,175,122,0.08)' : undefined,
                          color: mDoneToday ? '#3FAF7A' : undefined,
                          fontSize: '0.9rem', fontWeight: 900,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                      >
                        {mDoneToday ? '✓ המשימה הושלמה' : activeTrackDone > 0 ? 'ממשיכים את המשימה ←' : 'מתחילים את המשימה ←'}
                      </button>
                    </div>
                  )
                })()}

                {/* No active track: pick a program */}
                {(primaryAction.type === 'no-tasks' || (!activeTrack && !pathLoading)) && !isGuest && (
                  <div style={{ background: '#111317', border: '1px dashed rgba(255,255,255,0.1)', borderRight: '3px solid rgba(217,179,76,0.35)', borderRadius: 14, padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ color: '#A4A6AD', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.6rem' }}>בחר תוכנית 30 יום להתחיל</div>
                    <button className="btn-primary btn-tactile" onClick={() => setActiveTab('progress')} style={{ padding: '0.8rem 1.5rem', borderRadius: 10, fontSize: '0.9rem', fontWeight: 800 }}>
                      המסלולים שלי ←
                    </button>
                  </div>
                )}

                {/* All done state */}
                {primaryAction.type === 'all-done' && (
                  <div style={{ background: '#111317', border: '1px solid rgba(63,175,122,0.2)', borderRight: '3px solid rgba(63,175,122,0.4)', borderRadius: 14, padding: '1rem', textAlign: 'center', animation: 'slide-up 0.35s ease both' }}>
                    <div style={{ color: '#3FAF7A', fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem' }}>✓ הכל הושלם היום</div>
                    {streak > 0 && <div style={{ color: '#71717A', fontSize: '0.8rem' }}>{streak} ימים ברצף</div>}
                  </div>
                )}

                {/* Daily Learning Card — directly below main task */}
                {!isGuest && (
                  <DailyLessonCard prefTopics={profile?.learnTopics || []} />
                )}

                {/* Daily Workout Card — red accent */}
                {(() => {
                  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
                  const DAILY_WORKOUTS = [
                    { name: 'שכיבות סמיכה', category: 'כוח',    intensity: 'בינוני', duration: '15 דקות', sets: '4 סטים × 10',  icon: '💪', trackId: 'strength-pushups', isCombat: false },
                    { name: 'ריצה',          category: 'סיבולת', intensity: 'גבוה',   duration: '20 דקות', sets: '1 ריצה רציפה', icon: '🏃', trackId: 'cardio-run',       isCombat: false },
                    { name: 'סקוואטים',     category: 'כוח',    intensity: 'בינוני', duration: '15 דקות', sets: '4 סטים × 12',  icon: '🦵', trackId: 'strength-squats',  isCombat: false },
                    { name: 'איגרוף',       category: 'לחימה',  intensity: 'גבוה',   duration: '15 דקות', sets: 'סשן מלא',      icon: '🥊', trackId: 'boxing-muaythai',  isCombat: true  },
                    { name: 'מתח',          category: 'כוח',    intensity: 'גבוה',   duration: '15 דקות', sets: '3 סטים × 5',   icon: '🏋️', trackId: 'strength-pullups', isCombat: false },
                    { name: 'הליכה',        category: 'סיבולת', intensity: 'נמוך',   duration: '30 דקות', sets: 'הליכה פעילה',  icon: '🚶', trackId: 'cardio-walk',      isCombat: false },
                    { name: 'מואי תאי',     category: 'לחימה',  intensity: 'גבוה',   duration: '15 דקות', sets: 'סשן מלא',      icon: '🥊', trackId: 'boxing-muaythai',  isCombat: true  },
                  ]
                  const w = DAILY_WORKOUTS[doy % DAILY_WORKOUTS.length]
                  function startWorkout() {
                    const trackDef = w.trackId ? TRACK_MAP[w.trackId] : null
                    if (w.isCombat) {
                      setShowCombatProtocols(true)
                    } else if (trackDef && (trackDef.useCamera || trackDef.category === 'cardio')) {
                      setBoxingSession({ track: trackDef, goal: trackDef.startGoal })
                    } else {
                      setWorkoutSession({ id: w.trackId, name: w.name, emoji: w.icon, desc: w.sets, trackId: w.trackId })
                    }
                  }
                  const intensityColor = w.intensity === 'גבוה' ? '#D85C5C' : w.intensity === 'נמוך' ? '#3FAF7A' : '#D9B34C'
                  return (
                    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRight: '3px solid rgba(180,50,50,0.45)', borderRadius: 14, padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(180,50,50,0.12)', border: '1px solid rgba(180,50,50,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                            {w.icon}
                          </div>
                          <span style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>אימון יומי</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', color: '#A4A6AD', fontSize: '0.58rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 5 }}>{w.category}</span>
                          <span style={{ background: `${intensityColor}22`, color: intensityColor, fontSize: '0.58rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 5 }}>{w.intensity}</span>
                          {workoutDoneToday
                            ? <span style={{ color: '#3FAF7A', fontSize: '0.65rem', fontWeight: 800 }}>✓</span>
                            : <span style={{ color: '#D9B34C', fontSize: '0.65rem', fontWeight: 800 }}>+{XP.WORKOUT} XP</span>
                          }
                        </div>
                      </div>
                      <div style={{ color: workoutDoneToday ? '#71717A' : '#F4F1E8', fontWeight: 700, fontSize: '0.93rem', marginBottom: '0.2rem' }}>{w.name}</div>
                      <div style={{ color: '#71717A', fontSize: '0.68rem', marginBottom: '0.05rem' }}>{w.duration} · {w.sets}</div>
                      <div style={{ color: '#71717A', fontSize: '0.65rem', marginBottom: '0.75rem' }}>השבוע: {weeklyWorkoutCount}/7 אימונים</div>
                      <button
                        onClick={workoutDoneToday ? undefined : startWorkout}
                        disabled={workoutDoneToday}
                        className={workoutDoneToday ? '' : 'btn-tactile'}
                        style={{
                          width: '100%', padding: '0.8rem', borderRadius: 10,
                          border: `1px solid ${workoutDoneToday ? 'rgba(63,175,122,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          background: workoutDoneToday ? 'rgba(63,175,122,0.07)' : '#17191E',
                          color: workoutDoneToday ? '#3FAF7A' : '#A4A6AD',
                          fontSize: '0.85rem', fontWeight: 800, cursor: workoutDoneToday ? 'default' : 'pointer', minHeight: 44,
                        }}
                        aria-label={workoutDoneToday ? 'אימון הושלם' : `התחל ${w.name}`}
                      >
                        {workoutDoneToday ? '✓ אימון הושלם' : 'התחל אימון ←'}
                      </button>
                    </div>
                  )
                })()}

                {/* השגרה שלי — collapsible section for habits + surprise mission */}
                <div>
                  <button
                    onClick={() => setShowMyRoutine(v => !v)}
                    style={{
                      width: '100%', background: 'none', border: 'none', padding: '0.55rem 0',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer', color: 'rgba(241,245,249,0.4)', fontSize: '0.72rem', fontWeight: 700,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}
                    aria-expanded={showMyRoutine}
                  >
                    <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: showMyRoutine ? 'rotate(90deg)' : 'rotate(0deg)', fontSize: '0.6rem' }}>▶</span>
                    השגרה שלי
                    {triggers.length > 0 && (
                      <span style={{ marginRight: 'auto', color: allDone ? '#3FAF7A' : 'rgba(241,245,249,0.25)', fontSize: '0.68rem', fontWeight: 700 }}>
                        {doneCount}/{Math.min(triggers.length, 3)} הרגלים
                      </span>
                    )}
                  </button>

                  {showMyRoutine && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'slide-up 0.2s ease both' }}>

                {/* Habits section — teal accent */}
                {(triggers.length > 0 || !activeTrack) && (
                  <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRight: '3px solid rgba(52,140,122,0.45)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem 0' }}>
                      <span style={{ color: '#F4F1E8', fontSize: '0.88rem', fontWeight: 800 }}>ההרגלים שלי</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {triggers.length > 0 && (
                          <span style={{ color: allDone ? '#3FAF7A' : '#A4A6AD', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${allDone ? 'rgba(63,175,122,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, padding: '0.1rem 0.4rem' }}>
                            {doneCount}/{Math.min(triggers.length, 3)}
                          </span>
                        )}
                        {triggers.filter(t => !t.archived).length < 3 && (
                          <button onClick={() => setShowHabitFlow(true)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#A4A6AD', fontSize: '0.7rem', fontWeight: 700, padding: '0.18rem 0.55rem', cursor: 'pointer' }} aria-label="הוסף הרגל יומי">+ הוסף</button>
                        )}
                      </div>
                    </div>
                    {triggers.length > 0 && (
                      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', margin: '0.6rem 1rem 0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: allDone ? '#3FAF7A' : '#D9B34C', width: `${triggers.length > 0 ? Math.round((doneCount / Math.min(triggers.length, 3)) * 100) : 0}%`, transition: 'width 0.5s ease, background 0.4s ease' }} />
                      </div>
                    )}
                    <div style={{ padding: '0.5rem 0 0' }}>
                      {triggers.slice(0, 3).map((tr, i) => {
                        const done = !!checkins[tr.id]
                        const completing = completingId === tr.id
                        const habitStreak = habitStreaks[tr.id] ?? 0
                        const streakLabel = habitStreak === 1 ? 'יום אחד ברצף' : habitStreak === 2 ? 'יומיים ברצף' : habitStreak > 2 ? `${habitStreak} ימים ברצף` : ''
                        const habitSubtitle = done ? (streakLabel || 'הושלם') : (streakLabel || tr.habit)
                        return (
                          <div
                            key={tr.id}
                            onClick={() => !done && setProofModal({ type: 'habit', id: tr.id, emoji: '⚡', title: tr.cue, taskDesc: tr.habit, xp: XP.HABIT, color: '#D9B34C' })}
                            style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.85rem 1rem',
                              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                              cursor: done ? 'default' : 'pointer',
                              background: done ? 'rgba(255,255,255,0.01)' : 'transparent',
                              minHeight: 56,
                            }}
                          >
                            {completing && <ConfettiBurst />}
                            <div
                              className={completing ? 'habit-complete' : ''}
                              style={{
                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                border: `1.5px solid ${done ? 'rgba(63,175,122,0.5)' : 'rgba(255,255,255,0.14)'}`,
                                background: done ? 'rgba(63,175,122,0.1)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#3FAF7A', fontSize: '0.85rem', fontWeight: 900,
                              }}
                            >{done && '✓'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: done ? '#71717A' : '#F4F1E8', fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.18)', lineHeight: 1.35 }}>
                                {tr.cue}
                              </div>
                              <div style={{ color: done ? 'rgba(63,175,122,0.6)' : '#71717A', fontSize: '0.68rem', marginTop: '0.15rem' }}>
                                {habitSubtitle}
                              </div>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setEditHabit(tr) }}
                              style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: '0.3rem', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                              aria-label="ערוך הרגל"
                            >
                              <PencilLine size={15} />
                            </button>
                          </div>
                        )
                      })}
                      {triggers.length === 0 && (
                        <button onClick={() => setShowHabitFlow(true)} style={{ width: '100%', padding: '1.1rem', background: 'transparent', border: 'none', color: '#71717A', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} aria-label="הוסף הרגל יומי ראשון">
                          + הוסף הרגל יומי ראשון
                        </button>
                      )}
                    </div>
                    {triggers.length > 3 && (
                      <div style={{ textAlign: 'center', padding: '0.5rem 0.5rem 0.75rem', color: '#71717A', fontSize: '0.68rem' }}>
                        +{triggers.length - 3} הרגלים נוספים — ניהול בפרופיל
                      </div>
                    )}
                  </div>
                )}

                {/* Late-evening passive reminder */}
                {shouldShowLateReminder(new Date().getHours(), triggers, checkins) && (
                  <div style={{ padding: '0.7rem 1rem', background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <div style={{ color: '#A4A6AD', fontSize: '0.8rem', fontWeight: 700 }}>
                        {getIncompleteCount(triggers, checkins) === 1 ? 'נשאר לך הרגל אחד להיום' : `נשארו לך ${getIncompleteCount(triggers, checkins)} הרגלים להיום`}
                      </div>
                      <div style={{ color: '#71717A', fontSize: '0.68rem', marginTop: '0.15rem' }}>אפשר להשלים אותו כשמתאים לך.</div>
                    </div>
                    <span style={{ color: '#71717A', fontSize: '0.75rem' }}>💙</span>
                  </div>
                )}

                {/* Surprise Mission — purple accent wrapper */}
                {!isGuest && (
                  <div style={{ borderRight: '3px solid rgba(139,92,246,0.4)', borderRadius: 14, overflow: 'hidden' }}>
                    <SurpriseMissionCard
                      enabledCategories={profile?.surpriseCategoryPrefs || DEFAULT_ENABLED_CATEGORIES}
                      isGuest={isGuest}
                      onAwardXP={amount => {
                        if (amount === 'signin') { setXPToast('signin'); return }
                        awardXP(amount)
                        bumpStreak()
                      }}
                      onConvertToHabit={async prefill => {
                        if (isGuest) return { error: 'guest' }
                        return handleConvertToHabit(prefill)
                      }}
                    />
                  </div>
                )}

                    </div>
                  )}
                </div>

                {/* Today XP Summary */}
                {(doneCount > 0 || challengeDone) && (
                  <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#A4A6AD', fontSize: '0.78rem', fontWeight: 600 }}>XP היום</span>
                    <span style={{ color: '#D9B34C', fontWeight: 800, fontSize: '0.88rem' }}>
                      +{(doneCount * XP.HABIT) + (challengeDone ? dailyChallenge.xp : 0)} XP
                    </span>
                  </div>
                )}

                {/* Contextual messages */}
                {isFirstTimer && primaryAction.type !== 'all-done' && (
                  <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.9rem 1rem', fontSize: '0.83rem', color: '#A4A6AD', lineHeight: 1.5 }}>
                    {td.welcomeFirst} — {td.welcomeFirstSub}
                  </div>
                )}
                {missedYesterday && primaryAction.type !== 'all-done' && (
                  <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.9rem 1rem', fontSize: '0.83rem', color: '#A4A6AD', lineHeight: 1.5 }}>
                    {td.missedYday} — {td.missedYdaySub}
                  </div>
                )}

                <div style={{ height: 24 }} />
              </main>
            </div>
          </div>
        )}

        {/* ── WORKOUTS TAB ── */}
        {activeTab === 'workouts' && (
          <div style={{ paddingBottom: TAB_H + 16 }}>
            <WorkoutsScreen
              onStartWorkout={ex => {
                const trackDef = ex.trackId ? TRACK_MAP[ex.trackId] : null
                if (trackDef && (trackDef.useCamera || trackDef.category === 'cardio')) {
                  setBoxingSession({ track: trackDef, goal: trackDef.startGoal })
                } else {
                  setWorkoutSession(ex)
                }
              }}
              onCombat={() => setShowCombatProtocols(true)}
              onBoxing={() => setShowBoxingPath(true)}
              onMuayThai={() => setShowMuayThaiPath(true)}
            />
          </div>
        )}

        {/* ── PROGRESS TAB (merged tracks + analytics) ── */}
        {activeTab === 'progress' && (
          <div style={{ paddingBottom: TAB_H + 16 }}>
            <TracksPage
              profile={profile}
              onAwardXP={(amount, guestMode) => { if (!guestMode) { awardXP(amount); bumpStreak() } else setXPToast('signin') }}
              onSaveProfile={update => setProfile(p => ({ ...p, ...update }))}
            />
            {/* ── Hobby Discovery results (only shown when user has started the program) ── */}
            {!isGuest && (profile?.challenges?.['hobby-discovery']?.daysCompleted > 0 || Object.keys(profile?.hobbyDiscovery?.responses || {}).length > 0) && (
              <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 1.25rem' }}>
                <HobbyDiscoveryProgress
                  hobbyDiscovery={profile?.hobbyDiscovery}
                  challenges={profile?.challenges}
                />
              </div>
            )}
            <AnalyticsTab profile={profile} currentUid={user?.uid} activePathName={customPath?.path?.path_name || null} customPath={customPath} />
          </div>
        )}

        {/* ── ARENA (hidden from nav, data preserved) ── */}
        {activeTab === 'arena' && (
          <ArenaPage
            uid={user?.uid}
            userName={profile?.name || 'PRIME User'}
            isGuest={isGuest}
          />
        )}

        {/* ── PROFILE TAB (was settings) ── */}
        {activeTab === 'profile' && (
          <div style={{ paddingBottom: TAB_H + 16 }}>
            {/* User info header */}
            <div style={{ padding: '1.5rem 1.25rem 0.75rem', maxWidth: 480, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#17191E', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {user?.photoURL
                    ? <img src={user.photoURL} alt="פרופיל" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : '👤'}
                </div>
                <div>
                  <div style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1rem' }}>{profile?.name || user?.displayName || 'PRIME User'}</div>
                  <div style={{ color: '#71717A', fontSize: '0.75rem', marginTop: '0.15rem' }}>{user?.email || ''}</div>
                </div>
              </div>
              {/* XP + level summary */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                  <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>רמה</div>
                  <div style={{ color: '#D9B34C', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>{getLevel(xp)}</div>
                </div>
                <div style={{ flex: 1, background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                  <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>XP</div>
                  <div style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>{xp.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                  <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>רצף</div>
                  <div style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>{streak}</div>
                </div>
              </div>
            </div>
            {/* ── Surprise Mission Category Prefs ── */}
            {!isGuest && (
              <div style={{ padding: '0 1.25rem 1.25rem', maxWidth: 480, margin: '0 auto' }}>
                <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  🎲 קטגוריות משימת הפתעה
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {SURPRISE_CATEGORIES.map(cat => {
                    const prefs = profile?.surpriseCategoryPrefs || DEFAULT_ENABLED_CATEGORIES
                    const enabled = prefs.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        className={enabled ? 'btn-tactile' : ''}
                        onClick={async () => {
                          const current = profile?.surpriseCategoryPrefs || DEFAULT_ENABLED_CATEGORIES
                          let next
                          if (enabled) {
                            next = current.filter(id => id !== cat.id)
                            if (next.length === 0) return
                          } else {
                            next = [...current, cat.id]
                          }
                          const updated = { ...profile, surpriseCategoryPrefs: next }
                          setProfile(updated)
                          if (user) saveProfile(user.uid, { surpriseCategoryPrefs: next }).catch(() => {})
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 20,
                          border: `1px solid ${enabled ? 'rgba(217,179,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          background: enabled ? 'rgba(217,179,76,0.08)' : 'transparent',
                          color: enabled ? '#D9B34C' : '#71717A',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {cat.emoji} {cat.label}
                        {cat.id === 'dating' && !enabled && (
                          <span style={{ fontSize: '0.6rem', color: '#71717A', marginRight: '0.3rem' }}> (לבחירתך)</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Growth Pillar Preferences ── */}
            {!isGuest && (
              <div style={{ padding: '0 1.25rem 1.25rem', maxWidth: 480, margin: '0 auto' }}>
                <GrowthPillarSelector
                  selected={profile?.growthPillars || DEFAULT_PILLARS}
                  onChange={pillars => {
                    const updated = { ...profile, growthPillars: pillars }
                    setProfile(updated)
                    if (user) saveProfile(user.uid, { growthPillars: pillars }).catch(() => {})
                  }}
                />
              </div>
            )}

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
                  style={{ width: '100%', padding: '0.9rem', borderRadius: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,232,232,0.55)', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  📂 ארכיון מסלולים
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div
        className="prime-tab-bar"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: `calc(${TAB_H}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 200,
          background: '#111317',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'flex-start',
          boxSizing: 'border-box',
        }}
      >
        {[
          { id: 'home',     Icon: Home,       label: 'היום'      },
          { id: 'workouts', Icon: Dumbbell,   label: 'אימונים'   },
          { id: 'progress', Icon: TrendingUp, label: 'התקדמות'   },
          { id: 'profile',  Icon: User,       label: 'פרופיל'    },
        ].map(({ id, Icon, label }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '0.22rem',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.4rem 0',
                color: active ? '#D9B34C' : '#71717A',
                transition: 'color 0.15s ease',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{
                fontSize: '0.58rem', fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                color: active ? '#D9B34C' : '#71717A',
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Overlays ── */}
      {showCombatTraining && (
        <TrainingMode
          onClose={() => setShowCombatTraining(false)}
          onAwardXP={amount => { setShowCombatTraining(false); awardXP(amount); bumpStreak() }}
        />
      )}
      {showCombatProtocols && (
        <CombatProtocols
          onClose={() => setShowCombatProtocols(false)}
          onAwardXP={amount => { setShowCombatProtocols(false); awardXP(amount); bumpStreak() }}
          onOpenFreeSession={() => { setShowCombatProtocols(false); setShowCombatTraining(true) }}
        />
      )}
      {showBoxingPath && (
        <BoxingPathScreen
          profile={profile}
          onStartWorkout={workout => { setShowBoxingPath(false); setBoxingPreview(workout) }}
          onFreeTraining={() => { setShowBoxingPath(false); setShowCombatTraining(true) }}
          onClose={() => setShowBoxingPath(false)}
          onDrillComplete={async stats => {
            let xpAwarded = 0
            if (isGuest) {
              const lsKey = `prime_workout_done_${todayKey()}`
              if (!localStorage.getItem(lsKey)) {
                localStorage.setItem(lsKey, '1')
                xpAwarded = XP.WORKOUT
                awardXP(xpAwarded)
                bumpStreak()
              }
            } else if (user) {
              const { claimed } = await claimDailyWorkoutReward(user.uid, todayKey())
              if (claimed) { xpAwarded = XP.WORKOUT; awardXP(xpAwarded); bumpStreak() }
            }
            return xpAwarded
          }}
        />
      )}
      {boxingPreview && (
        <BoxingWorkoutPreview
          workout={boxingPreview}
          levelNum={boxingPreview.level}
          onStart={(trainingType, workoutMode = 'regular') => { setBoxingActive({ workout: boxingPreview, trainingType, workoutMode }); setBoxingPreview(null) }}
          onInstant={() => { setBoxingActive({ workout: INSTANT_BOXING_WORKOUT, trainingType: 'shadow', workoutMode: 'instant' }); setBoxingPreview(null) }}
          onBack={() => { setBoxingPreview(null); setShowBoxingPath(true) }}
        />
      )}
      {boxingActive && (
        <BoxingActiveWorkout
          workout={boxingActive.workout}
          trainingType={boxingActive.trainingType}
          skipWarmup={boxingActive.workoutMode === 'quick'}
          onComplete={async stats => {
            const workout = boxingActive.workout
            const isInstant = boxingActive.workoutMode === 'instant'
            setBoxingActive(null)
            let xpAwarded = 0
            if (isGuest) {
              const lsKey = `prime_workout_done_${todayKey()}`
              if (!localStorage.getItem(lsKey)) {
                localStorage.setItem(lsKey, '1')
                xpAwarded = XP.WORKOUT
                awardXP(xpAwarded)
                bumpStreak()
              }
            } else if (user) {
              const { claimed } = await claimDailyWorkoutReward(user.uid, todayKey())
              if (claimed) { xpAwarded = XP.WORKOUT; awardXP(xpAwarded); bumpStreak() }
            }
            let nextWorkout = null
            let levelJustCompleted = null
            if (!isInstant) {
              const boxState = getBoxingState(profile)
              const newBoxState = completeWorkout(boxState, workout.id, todayKey())
              if (!isGuest && user) {
                saveProfile(user.uid, { training: { boxing: newBoxState } })
                  .catch(() => {})
                setProfile(p => ({ ...p, training: { ...(p?.training || {}), boxing: newBoxState } }))
              }
              nextWorkout = getNextWorkout(newBoxState)
              levelJustCompleted = newBoxState.currentLevel > boxState.currentLevel ? boxState.currentLevel : null
            }
            setBoxingCompletion({ workout, stats, xpAwarded, nextWorkout, levelJustCompleted, isInstant })
          }}
          onExit={() => setBoxingActive(null)}
        />
      )}
      {boxingCompletion && (
        <BoxingCompletion
          workout={boxingCompletion.workout}
          stats={boxingCompletion.stats}
          xpAwarded={boxingCompletion.xpAwarded}
          nextWorkout={boxingCompletion.nextWorkout}
          levelJustCompleted={boxingCompletion.levelJustCompleted}
          onDone={() => { const wasInstant = boxingCompletion?.isInstant; setBoxingCompletion(null); if (!wasInstant) setShowBoxingPath(true) }}
        />
      )}
      {showMuayThaiPath && (
        <MuayThaiPathScreen
          profile={profile}
          onStartWorkout={workout => { setShowMuayThaiPath(false); setMtPreview(workout) }}
          onFreeTraining={() => { setShowMuayThaiPath(false); setShowCombatTraining(true) }}
          onClose={() => setShowMuayThaiPath(false)}
          onQuickLegWork={() => {
            const dur = getLastDuration()
            setShowMuayThaiPath(false)
            setMtDrillActive(buildDrill('footwork', dur))
          }}
          onQuickHandsElbows={() => {
            const dur = getLastDuration()
            setShowMuayThaiPath(false)
            setMtDrillActive(buildDrill('mt-elbows', dur))
          }}
          quickDuration={getLastDuration()}
        />
      )}
      {mtPreview && (
        <CombatWorkoutPreview
          workout={mtPreview}
          levelNum={mtPreview.level}
          trainingOptions={MT_TRAINING_OPTIONS.filter(opt => (mtPreview.supportedModes ?? ['shadow', 'bag']).includes(opt.id))}
          bagWarningLabel="🦵 לשק כבד: רצועות וכפפות חובה. אין מרפקים על שק רגיל."
          onStart={trainingType => { setMtActive({ workout: mtPreview, trainingType, workoutMode: 'regular' }); setMtPreview(null) }}
          onInstant={() => { setMtActive({ workout: INSTANT_MT_WORKOUT, trainingType: 'shadow', workoutMode: 'instant' }); setMtPreview(null) }}
          onBack={() => { setMtPreview(null); setShowMuayThaiPath(true) }}
        />
      )}
      {mtActive && (
        <BoxingActiveWorkout
          workout={mtActive.workout}
          trainingType={mtActive.trainingType}
          onComplete={async stats => {
            const workout = mtActive.workout
            const isInstant = mtActive.workoutMode === 'instant'
            setMtActive(null)
            let xpAwarded = 0
            if (isGuest) {
              const lsKey = `prime_workout_done_${todayKey()}`
              if (!localStorage.getItem(lsKey)) {
                localStorage.setItem(lsKey, '1')
                xpAwarded = XP.WORKOUT
                awardXP(xpAwarded)
                bumpStreak()
              }
            } else if (user) {
              const { claimed } = await claimDailyWorkoutReward(user.uid, todayKey())
              if (claimed) { xpAwarded = XP.WORKOUT; awardXP(xpAwarded); bumpStreak() }
            }
            let nextWorkout = null
            let levelJustCompleted = null
            if (!isInstant) {
              const mtState = getMuayThaiState(profile)
              const newMtState = completeMTWorkout(mtState, workout.id, todayKey())
              if (!isGuest && user) {
                saveProfile(user.uid, { training: { muayThai: newMtState } }).catch(() => {})
                setProfile(p => ({ ...p, training: { ...(p?.training || {}), muayThai: newMtState } }))
              }
              nextWorkout = getMTNextWorkout(newMtState)
              levelJustCompleted = newMtState.currentLevel > mtState.currentLevel ? mtState.currentLevel : null
            }
            setMtCompletion({ workout, stats, xpAwarded, nextWorkout, levelJustCompleted, isInstant })
          }}
          onExit={() => setMtActive(null)}
        />
      )}
      {mtCompletion && (
        <CombatCompletion
          disciplineEmoji="🦵"
          completionTitle="האימון הושלם!"
          levels={MT_LEVELS}
          reflectionOptions={MT_REFLECTION_OPTIONS}
          workout={mtCompletion.workout}
          stats={mtCompletion.stats}
          xpAwarded={mtCompletion.xpAwarded}
          nextWorkout={mtCompletion.nextWorkout}
          levelJustCompleted={mtCompletion.levelJustCompleted}
          onDone={() => { const wasInstant = mtCompletion?.isInstant; setMtCompletion(null); if (!wasInstant) setShowMuayThaiPath(true) }}
        />
      )}
      {mtDrillActive && (
        <BoxingDrillTimer
          workout={mtDrillActive}
          skipWarmup={false}
          onComplete={async stats => {
            setMtDrillActive(null)
            const earnedXP = stats.durationSeconds >= 60 || stats.roundsCompleted >= 1
            if (!earnedXP) return
            if (isGuest) {
              const lsKey = `prime_workout_done_${todayKey()}`
              if (!localStorage.getItem(lsKey)) {
                localStorage.setItem(lsKey, '1')
                awardXP(XP.WORKOUT)
                bumpStreak()
              }
            } else if (user) {
              const { claimed } = await claimDailyWorkoutReward(user.uid, todayKey())
              if (claimed) { awardXP(XP.WORKOUT); bumpStreak() }
            }
          }}
          onExit={() => { setMtDrillActive(null); setShowMuayThaiPath(true) }}
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
              background: '#111111',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
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
            <span style={{ color: 'rgba(232,232,232,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>הרחב ←</span>
          </div>
        )
      })()}
      {showModal && <AddTriggerModal onSave={handleAddTrigger} onClose={() => setShowModal(false)} td={td} to={to} />}
      {showHabitFlow && (
        <HabitCreationFlow
          growthPillars={profile?.growthPillars || DEFAULT_PILLARS}
          existingCount={triggers.filter(t => !t.archived).length}
          onSave={async data => { await handleAddTrigger(data); setShowHabitFlow(false); setHabitFlowPrefill(null) }}
          onClose={() => { setShowHabitFlow(false); setHabitFlowPrefill(null) }}
          prefill={habitFlowPrefill}
        />
      )}
      {showHobbyReflection && pendingHobbyDay && (
        <HobbyReflection
          dayNum={pendingHobbyDay}
          onSave={handleHobbyReflectionSave}
          onClose={() => { setShowHobbyReflection(false); setPendingHobbyDay(null) }}
        />
      )}
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


      {/* ── Level Up Modal ── */}
      {levelUpModal && (
        <div
          onClick={() => setLevelUpModal(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(5,5,12,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'center', padding: '2rem 2.5rem' }}>
            <ConfettiBurst />
            <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '1.2rem' }}>⬆ LEVEL UP</div>
            <div style={{ color: '#d4a843', fontSize: '7rem', fontWeight: 900, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1, animation: 'level-up-burst 0.55s cubic-bezier(.34,1.56,.64,1) both' }}>
              {levelUpModal}
            </div>
            <div style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 900, marginTop: '0.7rem', marginBottom: '1.8rem' }}>
              רמה {levelUpModal}
            </div>
            <div style={{ width: 200, margin: '0 auto 0.6rem', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((getLevelXP(xp) / XP.PER_LEVEL) * 100)}%`, background: 'linear-gradient(90deg,#D4A017,#F5C518)', borderRadius: 99, animation: 'xp-fill 0.9s 0.4s ease both' }} />
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

      {saving && <div style={{ position: 'fixed', bottom: TAB_H + 12, left: '50%', transform: 'translateX(-50%)', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(232,232,232,0.7)', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.78rem', fontWeight: 600, zIndex: 300 }}>{td.saving}</div>}
      <AddToHomeScreen />

    </div>
  )
}
