import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { loadProfile, saveProfile, loadActivity, saveReflection, syncLeaderboard, loadLeaderboard } from '../services/focusTriggerService'
import { checkContractStatus, getRank, getScore } from '../services/disciplineScore'
import { requestPermission, checkNotifications } from '../services/notificationService'
import { verifyDayCompletion, analyzeVideoForm } from '../services/coachService'
import { useUserPrefs } from '../context/UserContext'
import { CHALLENGES, CHALLENGE_WEEKS, getDayTask, getLessonType, LESSON_QUOTES, LESSON_WHY, DAILY_QUOTES } from '../data/challenges'
import TracksPage from './TracksPage'
import AnalyticsTab from './AnalyticsTab'
import InitiationFlow from './InitiationFlow'
import AddToHomeScreen from '../components/AddToHomeScreen'
import DisciplineGoalCard from '../components/DisciplineGoalCard'
import TrackSelector from '../components/TrackSelector'
import MissionBriefing from '../components/MissionBriefing'
import DailyBrief from '../components/DailyBrief'
import ContractLock from '../components/ContractLock'
import PrimeOnboarding, { hasSeenOnboarding } from '../components/PrimeOnboarding'
import PathBuilder from '../components/PathBuilder'
import CustomPathCard from '../components/CustomPathCard'
import MirrorCard from '../components/MirrorCard'
import Settings from '../components/Settings'
import { loadCustomPath } from '../services/pathBuilderService'
import { checkAndGenerateMirror, setMirrorTriggered } from '../services/mirrorService'

// ── Constants ──────────────────────────────────────────────────────

const todayKey     = () => new Date().toISOString().slice(0, 10)
const getCheckins  = () => { try { return JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`)) || {} } catch { return {} } }
const saveCheckins = v  => { try { localStorage.setItem(`ft_checkins_${todayKey()}`, JSON.stringify(v)) } catch {} }

// Strip HTML tags and control chars from user-submitted text before sending to AI
const sanitizeInput = str =>
  str.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 1000)

const XP_PER_TRIGGER = 10
const XP_PER_LEVEL   = 100
const MIN_PROOF_LEN  = 20

const getLevel   = xp => Math.floor((xp || 0) / XP_PER_LEVEL) + 1
const getLevelXP = xp => (xp || 0) % XP_PER_LEVEL
const getToNext  = xp => XP_PER_LEVEL - getLevelXP(xp)

function fmtCountdown(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

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
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t) }, [onDone])
  const isSignin = xp === 'signin'
  return (
    <div style={{ position: 'fixed', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', background: isSignin ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#c4795a,#d4956e)', color: '#fff', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.83rem', fontWeight: 800, zIndex: 9999, animation: 'xp-pop 0.35s cubic-bezier(.34,1.56,.64,1) forwards', boxShadow: isSignin ? '0 4px 20px rgba(245,158,11,0.5)' : '0 4px 20px rgba(196,121,90,0.5)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      {isSignin ? '🔒 התחבר כדי לשמור XP' : `+${xp} XP ✨`}
    </div>
  )
}

// ── Proof Modal (shared for habits + challenges) ───────────────────

function ProofModal({ title, prompt, xpAmount, accentColor = '#6366f1', onConfirm, onClose }) {
  const [text,     setText]     = useState('')
  const [status,   setStatus]   = useState('idle')   // idle | verifying | approved | rejected
  const [feedback, setFeedback] = useState('')
  const canSubmit = text.trim().length >= MIN_PROOF_LEN && status === 'idle'

  async function handleSubmit() {
    setStatus('verifying')
    try {
      const result = await verifyDayCompletion(title, '—', prompt, sanitizeInput(text))
      setFeedback(result.feedback)
      if (result.approved) {
        setStatus('approved')
        setTimeout(onConfirm, 1400)
      } else {
        setStatus('rejected')
      }
    } catch {
      setStatus('approved')
      setTimeout(onConfirm, 1400)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }} onClick={e => e.target === e.currentTarget && status === 'idle' && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.25rem', borderTop: `2px solid ${accentColor}55` }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>בדיקת אחריות</span>
          {status === 'idle' && <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕ סגור</button>}
        </div>

        <div style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}30`, borderRadius: 11, padding: '0.75rem 0.9rem', marginBottom: '1.1rem' }}>
          <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>משימה</p>
          <p style={{ color: '#f1f5f9', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>{title}</p>
        </div>

        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${accentColor}33`, borderTopColor: accentColor, animation: 'spin 0.8s linear infinite', margin: '0 auto 0.6rem' }} />
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.8rem' }}>בודק את תשובתך…</p>
          </div>
        )}

        {status === 'approved' && (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🎉</div>
            <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>קיבלת +{xpAmount} XP!</p>
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem' }}>{feedback}</p>
          </div>
        )}

        {status === 'rejected' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 11, padding: '0.75rem 0.9rem', marginBottom: '0.85rem', animation: 'fadeIn 0.2s ease' }}>
            <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.15rem' }}>לא מספיק ספציפי 👀</p>
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.75rem', margin: 0 }}>{feedback}</p>
          </div>
        )}

        {(status === 'idle' || status === 'rejected') && (
          <>
            <label style={{ display: 'block', color: 'rgba(241,245,249,0.38)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              מה עשית בפועל?
            </label>
            <textarea
              autoFocus
              value={text}
              onChange={e => { setText(e.target.value); if (status === 'rejected') setStatus('idle') }}
              placeholder="היה ספציפי — תאר מה עשית היום בפועל…"
              rows={4}
              className="glow-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 0.95rem', borderRadius: 11, border: `1px solid ${text.trim().length >= MIN_PROOF_LEN ? accentColor + '66' : 'rgba(255,255,255,0.09)'}`, background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.55, marginBottom: '0.45rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.67rem', color: text.trim().length >= MIN_PROOF_LEN ? '#10b981' : 'rgba(241,245,249,0.22)' }}>
                {text.trim().length} / {MIN_PROOF_LEN} תווים לפחות
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', background: canSubmit ? `linear-gradient(135deg,${accentColor},${accentColor}cc)` : 'rgba(255,255,255,0.05)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.18)', fontSize: '0.9rem', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              אמת וקבל {xpAmount} XP ←
            </button>
          </>
        )}
      </div>
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
        <button onClick={() => canSave && onSave({ cue: cue.trim(), habit: habit.trim(), time: time || null, note: note.trim() })} disabled={!canSave} style={{ width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none', background: canSave ? 'linear-gradient(135deg,#c4795a,#d4956e)' : 'rgba(255,255,255,0.06)', color: canSave ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed' }}>{td.save}</button>
      </div>
    </div>
  )
}

// ── Habit Card ─────────────────────────────────────────────────────

function HabitCard({ trigger, index, done, onRequestComplete, onUncomplete, td }) {
  const [showBurst, setShowBurst] = useState(false)

  function handleComplete() {
    setShowBurst(true)
    setTimeout(() => setShowBurst(false), 1300)
    onRequestComplete()
  }

  return (
    <div style={{ position: 'relative', background: done ? 'rgba(196,121,90,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${done ? 'rgba(196,121,90,0.22)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '20px 16px 19px 15px', padding: '1rem 1.1rem', transition: 'all 0.25s', overflow: 'visible', boxShadow: done ? '0 4px 16px rgba(196,121,90,0.15)' : '0 2px 10px rgba(0,0,0,0.18)' }}>
      {showBurst && <ConfettiBurst />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#c4795a,#d4956e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>{index + 1}</div>
          <span style={{ color: 'rgba(212,149,110,0.7)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{td.triggerLabel}</span>
          {trigger.time && <span style={{ background: 'rgba(196,121,90,0.15)', borderRadius: 20, padding: '0.1rem 0.4rem', color: '#d4956e', fontSize: '0.64rem', fontWeight: 700 }}>🕐 {trigger.time}</span>}
        </div>
        <span style={{ background: 'rgba(196,121,90,0.1)', border: '1px solid rgba(196,121,90,0.18)', borderRadius: 20, padding: '0.08rem 0.45rem', color: '#d4956e', fontSize: '0.64rem', fontWeight: 700 }}>+{XP_PER_TRIGGER} XP</span>
      </div>
      <p style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem', lineHeight: 1.4 }}>{trigger.cue}</p>
      <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.8rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>→ {trigger.habit}</p>
      {trigger.note && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.45rem 0.7rem', marginBottom: '0.7rem' }}><p style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.74rem', fontStyle: 'italic', margin: 0 }}>"{trigger.note}"</p></div>}
      <button
        onClick={done ? onUncomplete : handleComplete}
        style={{ width: '100%', padding: '0.6rem', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: done ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(196,121,90,0.3)', background: done ? 'rgba(16,185,129,0.08)' : 'rgba(196,121,90,0.08)', color: done ? '#10b981' : '#d4956e' }}
      >
        {done ? td.completed : td.markDone}
      </button>
    </div>
  )
}

// ── Challenge Card ─────────────────────────────────────────────────

function ChallengeCard({ challenge, progress, onOpenModal, level, isRecommended }) {
  const daysCompleted     = progress?.daysCompleted || 0
  const finished          = daysCompleted >= challenge.days
  const doneToday         = progress?.lastCompletedDate === todayKey()
  const nextDay           = daysCompleted + 1
  const pct               = Math.round((daysCompleted / challenge.days) * 100)
  const taskDesc          = getDayTask(challenge.id, nextDay)
  const hasMilestone      = daysCompleted >= 1
  const fightClubLevel    = 5
  const fightClubUnlocked = level >= fightClubLevel

  return (
    <div style={{
      background: isRecommended
        ? `linear-gradient(145deg, rgba(196,121,90,0.09) 0%, rgba(212,149,110,0.05) 100%)`
        : 'rgba(255,255,255,0.025)',
      border: `1px solid ${isRecommended ? 'rgba(196,121,90,0.28)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '16px 22px 18px 20px',
      padding: '1.1rem 1.15rem',
      boxShadow: isRecommended
        ? '0 4px 24px rgba(196,121,90,0.18), 0 1px 4px rgba(0,0,0,0.3)'
        : '0 2px 12px rgba(0,0,0,0.2)',
      transition: 'box-shadow 0.2s',
    }}>

      {/* Personalized badge */}
      {isRecommended && (
        <div style={{ marginBottom: '0.65rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: 'linear-gradient(90deg,#c4795a,#d4956e)',
            borderRadius: 20, padding: '0.22rem 0.7rem',
            color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.06em',
            boxShadow: '0 2px 10px rgba(196,121,90,0.4)',
          }}>
            ✨ מותאם עבורך
          </span>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg,${challenge.color}30,${challenge.color}18)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
          boxShadow: `0 2px 8px ${challenge.color}30`,
        }}>{challenge.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.3 }}>{challenge.title}</span>
            {finished && <span style={{ color: '#10b981', fontSize: '0.58rem', fontWeight: 700, background: 'rgba(16,185,129,0.14)', borderRadius: 20, padding: '0.1rem 0.45rem' }}>✓ הושלם</span>}
          </div>
          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.7rem', marginTop: '0.15rem', lineHeight: 1.3 }}>{challenge.subtitle}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ color: challenge.color, fontSize: '0.72rem', fontWeight: 800 }}>+{challenge.xpPerDay} XP</div>
          <div style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.62rem' }}>/ יום</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: finished || doneToday ? (hasMilestone ? '0.7rem' : '0.3rem') : '0.7rem' }}>
        <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${challenge.color}aa,${challenge.color})`, width: `${pct}%`, transition: 'width 0.5s cubic-bezier(.4,0,.2,1)' }} />
        </div>
        <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {daysCompleted}/{challenge.days}d
        </span>
      </div>

      {/* Today task preview */}
      {!finished && !doneToday && (
        <div style={{ background: `${challenge.color}0a`, borderRadius: 10, padding: '0.6rem 0.8rem', marginBottom: '0.65rem' }}>
          <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Day {nextDay}</p>
          <p style={{ color: 'rgba(241,245,249,0.58)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{taskDesc}</p>
        </div>
      )}

      {/* Verify button */}
      {!finished && (
        <button
          onClick={() => !doneToday && onOpenModal(challenge, nextDay, taskDesc)}
          style={{
            width: '100%', padding: '0.65rem', borderRadius: 11, border: 'none',
            background: doneToday
              ? 'rgba(16,185,129,0.08)'
              : `linear-gradient(135deg,${challenge.color}22,${challenge.color}10)`,
            color: doneToday ? '#10b981' : challenge.color,
            fontSize: '0.78rem', fontWeight: 700, cursor: doneToday ? 'default' : 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.3rem', marginBottom: hasMilestone ? '0.6rem' : 0,
            outline: doneToday ? 'none' : `1px solid ${challenge.color}35`,
          }}
        >
          {doneToday ? `✓ יום ${daysCompleted} הושלם` : `📝 השלם יום ${nextDay} · +${challenge.xpPerDay} XP`}
        </button>
      )}

      {/* Fight Club */}
      {hasMilestone && challenge.whatsappLink && (
        fightClubUnlocked ? (
          <a
            href={challenge.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%', padding: '0.75rem', borderRadius: 11, border: 'none',
              background: 'linear-gradient(135deg,#25d366,#128c7e)',
              color: '#fff', fontSize: '0.82rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', textDecoration: 'none', letterSpacing: '0.01em', boxSizing: 'border-box',
              boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
              animation: 'fight-club-pulse 2.5s ease-in-out infinite',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            הצטרף לפייט קלאב 💪
          </a>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.8rem', borderRadius: 11, background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '0.82rem' }}>🔒</span>
            <span style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.71rem', fontWeight: 600 }}>
              Reach Level {fightClubLevel} to unlock Fight Club
              <span style={{ marginLeft: '0.3rem', color: 'rgba(241,245,249,0.15)', fontWeight: 400 }}>(lv.{level})</span>
            </span>
          </div>
        )
      )}
    </div>
  )
}

// ── Leaderboard Tab ────────────────────────────────────────────────

function LeaderboardTab({ entries, currentUid, td }) {
  const medals = ['🥇','🥈','🥉']
  return (
    <div style={{ padding: '1.5rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🏆</span>
        <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{td.leaderboardSection}</h2>
        <span style={{ marginInlineStart: 'auto', color: 'rgba(165,180,252,0.55)', fontSize: '0.72rem', fontWeight: 700 }}>{td.topXP}</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🏅</div>
          <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.97rem', marginBottom: '0.35rem' }}>היה הראשון בלוח</div>
          <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.8rem', lineHeight: 1.55, marginBottom: '1.1rem' }}>
            השלם מסלולים ומשימות יומיות<br/>כדי לצבור XP ולעלות בדירוג
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.22)', borderRadius: 20, padding: '0.35rem 0.9rem' }}>
            <span style={{ color: '#F5C518', fontSize: '0.78rem', fontWeight: 700 }}>⚡ השלם משימה ראשונה לפתיחת הדירוג</span>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          {entries.map((e, i) => {
            const isMe = e.uid === currentUid
            return (
              <div key={e.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: isMe ? 'rgba(99,102,241,0.1)' : 'transparent' }}>
                <span style={{ fontSize: i < 3 ? '1.1rem' : '0.82rem', width: 28, textAlign: 'center', color: i >= 3 ? 'rgba(241,245,249,0.3)' : undefined, fontWeight: i >= 3 ? 700 : undefined }}>{medals[i] || `#${i + 1}`}</span>
                <span style={{ flex: 1, color: isMe ? '#a5b4fc' : '#f1f5f9', fontSize: '0.9rem', fontWeight: isMe ? 700 : 500 }}>{e.name}{isMe ? ` (${td.you})` : ''}</span>
                <span style={{ color: isMe ? '#a5b4fc' : 'rgba(241,245,249,0.4)', fontSize: '0.85rem', fontWeight: 700 }}>{e.xp} XP</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Workout Library ────────────────────────────────────────────────

const WORKOUT_EXERCISES = [
  { id: 'pushups',  emoji: '💪', name: 'שכיבות שמיכה', desc: 'כוח פלג גוף עליון',    trackId: 'self-discipline', available: true  },
  { id: 'pullups',  emoji: '🔝', name: 'מתח',           desc: 'גב, כתפיים וזרועות',   trackId: 'self-discipline', available: true  },
  { id: 'dips',     emoji: '⬇️', name: 'מקבילים',       desc: 'טריצפס וחזה',           trackId: 'self-discipline', available: true  },
  { id: 'squats',   emoji: '🦵', name: 'סקווטים',       desc: 'כוח פלג גוף תחתון',    trackId: 'self-discipline', available: true  },
  { id: 'boxing',   emoji: '🥊', name: 'איגרוף',        desc: 'ספורט קרב',             trackId: null,             available: false },
  { id: 'muaythai', emoji: '🥋', name: 'מואי טאי',      desc: 'אמנות לחימה תאילנדית',  trackId: null,             available: false },
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

function SetSummaryModal({ exercise, onDone, onClose }) {
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
                  style={{ background: 'none', border: '1px solid rgba(196,121,90,0.28)', borderRadius: 20, color: '#d4956e', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  📹 הקלט טופס
                </button>
              )}
              {videoBlobUrl && (
                <button
                  onClick={deleteVideo}
                  className="btn-tactile"
                  style={{ background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, color: '#f87171', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', cursor: 'pointer' }}
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
                <span style={{ color: 'rgba(165,180,252,0.8)', fontSize: '0.78rem', fontWeight: 600 }}>Loading Analysis…</span>
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

export default function Dashboard() {
  const { user, logout, isGuest }  = useAuth()
  const { lang, setLang, t: tAll } = useLang()
  const { prefs }                  = useUserPrefs()
  const td  = tAll.dashboard
  const to  = tAll.onboarding

  const [initiationDone, setInitiationDone] = useState(() => !!localStorage.getItem('onboardingCompleted'))

  const [profile,      setProfile]      = useState(null)
  const [checkins,     setCheckinsS]    = useState(getCheckins)
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [xpToast,      setXPToast]      = useState(null)
  const [leaderboard,  setLeaderboard]  = useState([])
  const [activeTab,    setActiveTab]    = useState('home')
  const [isDayStarted, setIsDayStarted] = useState(false)
  const [showWhy,        setShowWhy]        = useState(false)
  const [btnBurst,       setBtnBurst]       = useState(false)
  const [showWorkoutLib, setShowWorkoutLib] = useState(false)
  const [workoutSession, setWorkoutSession] = useState(null)
  const [showDetails,    setShowDetails]    = useState(false)
  const [contractLocked, setContractLocked] = useState(() => checkContractStatus().locked)
  const [secsLeft,       setSecsLeft]       = useState(() => { const n = new Date(); return (23 - n.getHours()) * 3600 + (59 - n.getMinutes()) * 60 + (59 - n.getSeconds()) })
  const [headerScore,    setHeaderScore]    = useState(getScore)
  const [customPath,     setCustomPath]     = useState(null)
  const [showPathBuilder,setShowPathBuilder]= useState(false)
  const [pathLoading,    setPathLoading]    = useState(true)
  const [mirrorData,     setMirrorData]     = useState(null)   // { gapDays, message }

  // proofModal: { type: 'habit'|'challenge', id, title, taskDesc, xp, color }
  const [proofModal,   setProofModal]   = useState(null)

  const reflTimers = useRef({})

  useEffect(() => {
    if (!user || isGuest) { setPathLoading(false); return }
    loadCustomPath(user.uid).then(p => {
      setCustomPath(p)
      if (!p) setShowPathBuilder(true)
      if (p) checkAndGenerateMirror(p).then(data => { if (data) setMirrorData(data) }).catch(() => {})
    }).finally(() => setPathLoading(false))
  }, [user, isGuest])

  useEffect(() => {
    if (isGuest) { setProfile({ name: 'Guest', xp: 0, triggers: [], challenges: {} }); setLoading(false); return }
    if (!user) return
    loadProfile(user.uid).then(p => setProfile(p || {})).catch(() => setProfile({})).finally(() => setLoading(false))
    loadLeaderboard().then(setLeaderboard)
  }, [user, isGuest])

  useEffect(() => {
    if (!profile) return
    requestPermission()
    const triggers = profile?.triggers || []
    const run = () => checkNotifications(triggers, profile)
    run()
    const id = setInterval(run, 60_000)
    return () => clearInterval(id)
  }, [profile])

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setSecsLeft((23 - n.getHours()) * 3600 + (59 - n.getMinutes()) * 60 + (59 - n.getSeconds()))
      setHeaderScore(getScore())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onRedeemed() { setHeaderScore(getScore()) }
    window.addEventListener('prime:redeemed', onRedeemed)
    return () => window.removeEventListener('prime:redeemed', onRedeemed)
  }, [])

  // ── XP helpers ────────────────────────────────────────────────

  async function awardXP(amount) {
    if (isGuest) { setXPToast('signin'); return }
    const newXP  = (profile?.xp || 0) + amount
    const today  = todayKey()
    const log    = [...new Set([...(profile?.activityLog || []), today])]
    const updated = { ...profile, xp: newXP, activityLog: log }
    setProfile(updated)
    setXPToast(amount)
    await saveProfile(user.uid, { xp: newXP, activityLog: log })
    await syncLeaderboard(user.uid, profile?.name || 'Anonymous', newXP).catch(() => {})
    loadLeaderboard().then(setLeaderboard)
  }

  async function deductXP(amount) {
    if (isGuest) return
    const newXP   = Math.max(0, (profile?.xp || 0) - amount)
    setProfile(p => ({ ...p, xp: newXP }))
    await saveProfile(user.uid, { xp: newXP })
    await syncLeaderboard(user.uid, profile?.name || 'Anonymous', newXP).catch(() => {})
    loadLeaderboard().then(setLeaderboard)
  }

  function updateStreak(nextCheckins, triggers) {
    if (!triggers.length || !triggers.every(tr => nextCheckins[tr.id])) return
    const today     = todayKey()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const s         = profile?.streak || {}
    if (s.lastDate === today) return
    const count = s.lastDate === yesterday ? (s.count || 0) + 1 : 1
    setProfile(p => ({ ...p, streak: { count, lastDate: today } }))
    saveProfile(user.uid, { streak: { count, lastDate: today } }).catch(() => {})
  }

  // ── Habit actions ─────────────────────────────────────────────

  function requestHabitComplete(trigger) {
    setProofModal({
      type:     'habit',
      id:       trigger.id,
      title:    `${trigger.cue} → ${trigger.habit}`,
      taskDesc: trigger.habit,
      xp:       XP_PER_TRIGGER,
      color:    '#6366f1',
    })
  }

  function handleHabitUncomplete(id) {
    const next = { ...checkins, [id]: false }
    saveCheckins(next)
    setCheckinsS(next)
    deductXP(XP_PER_TRIGGER)
  }

  function confirmHabitComplete() {
    const id   = proofModal.id
    const next = { ...checkins, [id]: true }
    saveCheckins(next)
    setCheckinsS(next)
    setProofModal(null)
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

  // ── Challenge actions ─────────────────────────────────────────

  function openChallengeModal(challenge, dayNum, taskDesc) {
    setProofModal({
      type:     'challenge',
      id:       challenge.id,
      title:    `${challenge.emoji} ${challenge.title} — Day ${dayNum}`,
      taskDesc,
      xp:       challenge.xpPerDay,
      color:    challenge.color,
      challenge,
      dayNum,
    })
  }

  async function confirmChallengeComplete() {
    const { challenge, dayNum } = proofModal
    const today          = todayKey()
    const prev           = profile?.challenges?.[challenge.id] || {}
    if (prev.lastCompletedDate === today) { setProofModal(null); return }
    const daysCompleted  = Math.min((prev.daysCompleted || 0) + 1, challenge.days)
    const challengeUpdate = { ...(profile?.challenges || {}), [challenge.id]: { daysCompleted, lastCompletedDate: today } }
    setProfile(p => ({ ...p, challenges: challengeUpdate }))
    setProofModal(null)
    if (!isGuest) await saveProfile(user.uid, { challenges: challengeUpdate })
    awardXP(challenge.xpPerDay)
  }

  // ── Derived ───────────────────────────────────────────────────

  const triggers  = profile?.triggers || []
  const doneCount = triggers.filter(tr => checkins[tr.id]).length
  const allDone   = triggers.length > 0 && doneCount === triggers.length
  const xp        = profile?.xp || 0
  const level     = getLevel(xp)
  const levelXP   = getLevelXP(xp)
  const toNext    = getToNext(xp)
  const streak    = profile?.streak?.count || 0
  const isHe      = lang === 'he'
  const hour      = new Date().getHours()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const TAB_H     = 64

  // ── Personalized context ───────────────────────────────────────

  const activeTrack = useMemo(() => {
    const ch = profile?.challenges || {}
    return CHALLENGES
      .filter(c => { const d = ch[c.id]?.daysCompleted || 0; return d > 0 && d < c.days })
      .sort((a, b) => (ch[b.id]?.daysCompleted || 0) - (ch[a.id]?.daysCompleted || 0))[0] || null
  }, [profile?.challenges])

  const activeTrackDone = activeTrack ? (profile?.challenges?.[activeTrack.id]?.daysCompleted || 0) : 0
  const activeTrackPct  = activeTrack ? Math.round((activeTrackDone / activeTrack.days) * 100) : 0

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

  const whyQuote = useMemo(() => {
    const ch = profile?.challenges || {}
    const yesterdayTrack = CHALLENGES.find(c => ch[c.id]?.lastCompletedDate === yesterday)
    if (yesterdayTrack) {
      const done = ch[yesterdayTrack.id]?.daysCompleted || 0
      return `אתמול השלמת יום ${done} ב${yesterdayTrack.title}. היום ממשיכים מאותה נקודה.`
    }
    if (new Set(profile?.activityLog || []).has(yesterday))
      return 'הגעת אתמול. זה כל המשחק — בוא נעשה את זה שוב.'
    if (streak >= 3)  return `${streak} ימים של נוכחות. כל אחד הופך את הבא לקל יותר.`
    if (streak === 1) return 'יום 1 מאחוריך. ביום 2 רוב האנשים מוותרים. לא אתה.'
    return 'כל פעולה היום היא הצבעה עבור האדם שאתה הופך להיות. תצביע.'
  }, [profile?.challenges, profile?.activityLog, streak, yesterday])

  const winnerGlow = streak >= 7

  const activitySet     = new Set(profile?.activityLog || [])
  const missedYesterday = activitySet.size > 0 && !activitySet.has(yesterday)
  const dailyQuote      = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length]

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

  if (!hasSeenOnboarding()) return (
    <PrimeOnboarding onDone={() => setInitiationDone(true)} />
  )

  if (!initiationDone) return (
    <InitiationFlow onComplete={() => {
      localStorage.setItem('onboardingCompleted', 'true')
      setInitiationDone(true)
    }} />
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e16', display: 'flex', flexDirection: 'column' }}>
      {/* Skeleton header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0.75rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 90, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
        <div style={{ width: 60, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s 0.1s infinite' }} />
        </div>
      </div>
      {/* Skeleton cards */}
      <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {[80, 120, 100, 60].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 16, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: `shimmer 1.4s ${i * 0.12}s infinite` }} />
          </div>
        ))}
      </div>
    </div>
  )

  if (showPathBuilder && !isGuest && !pathLoading) {
    return (
      <PathBuilder
        user={user}
        onDone={record => { setCustomPath(record); setShowPathBuilder(false) }}
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
          <img src="/prime-logo.svg" alt="PRIME" style={{ height: 26, width: 'auto', display: 'block' }} />
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {(() => {
              const rank = getRank(headerScore)
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${rank.color}15`, border: `1px solid ${rank.color}40`, borderRadius: 20, padding: '0.22rem 0.6rem' }}>
                  <span style={{ fontSize: '0.72rem' }}>{rank.icon}</span>
                  <span style={{ color: rank.color, fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.05em' }}>{rank.label}</span>
                  <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.58rem' }}>·</span>
                  <span style={{ color: rank.color, fontSize: '0.72rem', fontWeight: 800 }}>{headerScore}</span>
                </div>
              )
            })()}
            <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", color: secsLeft < 3600 ? '#ef4444' : secsLeft < 10800 ? '#f59e0b' : 'rgba(245,197,24,0.65)', fontSize: '0.67rem', fontWeight: 700, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.15)', borderRadius: 8, padding: '0.2rem 0.5rem', letterSpacing: '0.04em' }}>
              {fmtCountdown(secsLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Guest Banner ── */}
      {isGuest && (
        <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>👁 מצב אורח — ההתקדמות לא תישמר</span>
          <a href="/welcome" style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none', background: 'rgba(245,158,11,0.15)', borderRadius: 20, padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>התחבר →</a>
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: TAB_H + 16 }}>

        {/* ── HOME TAB — Command Center ── */}
        {activeTab === 'home' && (
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1.25rem 0', display: 'flex', flexDirection: 'column' }}>

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

            {/* ── ZONE 1 ── */}
            <ContractLock onRedeemed={() => setContractLocked(false)} />
            <DailyBrief />

            {/* ── ZONE 2: PRIMARY ACTION ── */}
            {customPath && !pathLoading && (
              <CustomPathCard
                user={user}
                pathRecord={customPath}
                onPathUpdate={setCustomPath}
                onRebuild={() => { setCustomPath(null); setShowPathBuilder(true) }}
              />
            )}
            {!customPath && !pathLoading && !isGuest && (
              <button
                onClick={() => setShowPathBuilder(true)}
                className="btn-tactile"
                style={{ width: '100%', marginBottom: '1.1rem', padding: '1rem', borderRadius: 16, background: 'linear-gradient(145deg,rgba(245,197,24,0.1),rgba(245,197,24,0.04))', border: '1px solid rgba(245,197,24,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '0.92rem' }}>◈ בנה את המסלול האישי שלך</div>
                  <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.72rem', marginTop: '0.15rem' }}>תוכנית 30 יום מותאמת AI ← 5 שאלות</div>
                </div>
                <span style={{ fontSize: '1.4rem', opacity: 0.7 }}>🚀</span>
              </button>
            )}
            <TrackSelector />

            {/* ── ZONE 3: STATUS (collapsible) ── */}
            <button
              onClick={() => setShowDetails(v => !v)}
              className="btn-tactile"
              style={{
                width: '100%', marginTop: '0.35rem', marginBottom: showDetails ? '0.85rem' : 0,
                padding: '0.6rem', background: 'none',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
                color: 'rgba(241,245,249,0.25)', fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                fontFamily: "'SF Mono','Fira Code',monospace",
              }}
            >
              <span style={{ display: 'inline-block', transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
              {showDetails ? 'סגור' : 'מסלולים · אתגרים · סטטוס'}
            </button>

            {showDetails && (
              <div style={{ animation: 'fadeIn 0.22s ease' }}>

                {/* Discipline goal */}
                <DisciplineGoalCard />

                {/* Missed-day warning */}
                {missedYesterday && primaryAction.type !== 'all-done' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 14, padding: '0.75rem 1rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                    <div>
                      <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.15rem' }}>פספסת אתמול</div>
                      <div style={{ color: 'rgba(241,245,249,0.42)', fontSize: '0.72rem', lineHeight: 1.4 }}>הרצף שלך בסכנה. השלם את המשימה היום כדי לשמור עליו.</div>
                    </div>
                  </div>
                )}

                {/* Greeting */}
                <div style={{ marginBottom: '1.1rem' }}>
                  <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.4, letterSpacing: '-0.01em', margin: 0, ...(winnerGlow ? { textShadow: '0 0 32px rgba(251,191,36,0.25)' } : {}) }}>
                    {dynamicGreeting}
                  </h2>
                  <p style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                    {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                {/* Daily quote */}
                <div style={{ background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.1)', borderRadius: 14, padding: '0.75rem 1rem', marginBottom: '1.1rem' }}>
                  <div style={{ color: 'rgba(245,197,24,0.4)', fontSize: '0.54rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ INTEL</div>
                  <p style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>"{dailyQuote}"</p>
                </div>

            {/* ── All done ── */}
            {primaryAction.type === 'all-done' && (
              <div style={{ textAlign: 'center', animation: 'slide-up 0.35s ease both', paddingTop: '2rem' }}>
                <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ color: '#10b981', fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.5rem' }}>הכל הושלם היום!</h2>
                <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.9rem', lineHeight: 1.6 }}>חזור מחר כדי לשמור על הרצף.</p>
                {streak > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 20, padding: '0.4rem 1rem' }}>
                    <span>🔥</span>
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.88rem' }}>{streak} ימים ברצף — כל הכבוד!</span>
                  </div>
                )}
              </div>
            )}

            {/* ── No tasks ── */}
            {primaryAction.type === 'no-tasks' && (
              <div style={{ textAlign: 'center', animation: 'slide-up 0.35s ease both', paddingTop: '2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎯</div>
                <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.6rem' }}>בחר מסלול להתחיל</h2>
                <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.88rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                  לא הגדרת מסלול עדיין.<br/>בחר אחד ותתחיל לצבור XP היום.
                </p>
                <button
                  className="btn-primary btn-tactile"
                  onClick={() => setActiveTab('tracks')}
                  style={{ padding: '1.3rem 2.5rem', borderRadius: 20, fontSize: '1.05rem', fontWeight: 900 }}
                >
                  📚 המסלולים שלי ←
                </button>
              </div>
            )}

            {/* ── Track course experience ── */}
            {primaryAction.type === 'track' && (() => {
              const lesson   = getLessonType(primaryAction.dayNum)
              const quote    = LESSON_QUOTES[(primaryAction.dayNum - 1) % LESSON_QUOTES.length]
              const trackPrg = profile?.challenges?.[primaryAction.track.id]
              const isLocked = (trackPrg?.daysCompleted || 0) > 0
                && trackPrg?.lastCompletedDate !== yesterday
                && trackPrg?.lastCompletedDate !== todayKey()
              const col = primaryAction.track.color

              return (
                <div style={{ animation: 'slide-up 0.35s ease both' }}>

                  {/* Lesson card */}
                  <div style={{ background: `linear-gradient(145deg,${col}14,${col}05)`, border: `1px solid ${col}30`, borderRadius: '20px 16px 22px 18px', padding: '1.2rem 1.3rem', marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1rem' }}>{lesson.icon}</span>
                      <span style={{ color: col, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{lesson.label} · {primaryAction.track.title} יום {primaryAction.dayNum}</span>
                    </div>
                    <p style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, lineHeight: 1.55, margin: '0 0 0.65rem', letterSpacing: '-0.01em' }}>
                      {quote}
                    </p>
                    <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.76rem', margin: 0, lineHeight: 1.5 }}>
                      {lesson.insight}
                    </p>
                  </div>

                  {/* Commitment card with Why toggle */}
                  {!isLocked ? (
                    <div style={{ background: 'rgba(196,121,90,0.07)', border: '1px solid rgba(196,121,90,0.2)', borderRadius: '14px 18px 16px 20px', padding: '1.1rem 1.3rem', marginBottom: '1rem' }}>
                      <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.55rem' }}>
                        ✍️ ההתחייבות היומית שלי
                      </div>
                      <p style={{ color: 'rgba(241,245,249,0.78)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.7rem' }}>
                        <span style={{ color: '#d4956e', fontWeight: 800 }}>היום אני מתחייב ל: </span>
                        {primaryAction.taskDesc}
                      </p>
                      <button
                        onClick={() => setShowWhy(w => !w)}
                        style={{ background: 'none', border: 'none', color: 'rgba(196,121,90,0.6)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <span style={{ display: 'inline-block', transform: showWhy ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                        למה זה חשוב?
                      </button>
                      {showWhy && (
                        <p style={{ color: 'rgba(241,245,249,0.42)', fontSize: '0.77rem', lineHeight: 1.65, margin: '0.6rem 0 0', animation: 'fadeIn 0.2s ease' }}>
                          {LESSON_WHY[(primaryAction.dayNum - 1) % LESSON_WHY.length]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.1rem 1.3rem', marginBottom: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🔒</span>
                      <div>
                        <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>יום {primaryAction.dayNum} נעול</div>
                        <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.76rem', lineHeight: 1.45 }}>
                          פספסת יום. חזור למסלולים והשלם את היום הנוכחי כדי להמשיך.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {!isLocked && (() => {
                    const pct = Math.round(((primaryAction.dayNum - 1) / primaryAction.track.days) * 100)
                    return (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.65rem', fontWeight: 700 }}>התקדמות במסלול</span>
                          <span style={{ color: col, fontSize: '0.65rem', fontWeight: 800 }}>{pct}% · יום {primaryAction.dayNum} מתוך {primaryAction.track.days}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${col}99, ${col})`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Streak + CTA */}
                  {!isLocked ? (
                    <>
                      {streak > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 20, padding: '0.3rem 0.85rem' }}>
                            <span style={{ fontSize: '0.9rem' }}>🔥</span>
                            <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800 }}>{streak} ימים ברצף</span>
                          </div>
                        </div>
                      )}
                      <button
                        className={`btn-primary btn-tactile${btnBurst ? ' btn-burst' : ''}`}
                        onClick={() => {
                          setBtnBurst(true)
                          setTimeout(() => {
                            setBtnBurst(false)
                            openChallengeModal(primaryAction.track, primaryAction.dayNum, primaryAction.taskDesc)
                          }, 350)
                        }}
                        style={{ width: '100%', padding: '1.6rem', borderRadius: 22, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.01em', marginBottom: '0.75rem' }}
                      >
                        ✅ ביצעתי היום · +{primaryAction.xp} XP
                      </button>
                      <button
                        onClick={() => setActiveTab('tracks')}
                        style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.25)', fontSize: '0.78rem', cursor: 'pointer', width: '100%', textAlign: 'center', padding: '0.4rem' }}
                      >
                        ראה את כל המסלולים →
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-tactile"
                      onClick={() => setActiveTab('tracks')}
                      style={{ width: '100%', padding: '1rem', borderRadius: 16, fontSize: '0.95rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(241,245,249,0.5)', cursor: 'pointer' }}
                    >
                      עבור למסלולים →
                    </button>
                  )}
                </div>
              )
            })()}

            {/* ── Habit course experience ── */}
            {primaryAction.type === 'habit' && (
              <div style={{ animation: 'slide-up 0.35s ease both' }}>
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '14px 18px 16px 20px', padding: '1.25rem', marginBottom: '1.4rem' }}>
                  <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.55rem' }}>
                    ✍️ ההתחייבות היומית שלי
                  </div>
                  <p style={{ color: 'rgba(241,245,249,0.78)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.7rem' }}>
                    <span style={{ color: '#d4956e', fontWeight: 800 }}>היום אני מתחייב ל: </span>
                    {primaryAction.trigger.cue} → {primaryAction.trigger.habit}
                  </p>
                  <button
                    onClick={() => setShowWhy(w => !w)}
                    style={{ background: 'none', border: 'none', color: 'rgba(99,102,241,0.6)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span style={{ display: 'inline-block', transform: showWhy ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                    למה זה חשוב?
                  </button>
                  {showWhy && (
                    <p style={{ color: 'rgba(241,245,249,0.42)', fontSize: '0.77rem', lineHeight: 1.65, margin: '0.6rem 0 0', animation: 'fadeIn 0.2s ease' }}>
                      {LESSON_WHY[0]}
                    </p>
                  )}
                </div>
                {streak > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 20, padding: '0.3rem 0.85rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>🔥</span>
                      <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800 }}>{streak} ימים ברצף</span>
                    </div>
                  </div>
                )}
                <button
                  className={`btn-primary btn-tactile${btnBurst ? ' btn-burst' : ''}`}
                  onClick={() => {
                    setBtnBurst(true)
                    setTimeout(() => {
                      setBtnBurst(false)
                      requestHabitComplete(primaryAction.trigger)
                    }, 350)
                  }}
                  style={{ width: '100%', padding: '1.6rem', borderRadius: 22, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.01em' }}
                >
                  ✅ ביצעתי היום · +{primaryAction.xp} XP
                </button>
              </div>
            )}
                {/* Settings shortcut */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <button onClick={() => setActiveTab('settings')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'rgba(241,245,249,0.3)', fontSize: '0.68rem', fontWeight: 700, padding: '0.3rem 0.8rem', cursor: 'pointer' }}>⚙ הגדרות</button>
                </div>

                {/* Training Library secondary access */}
                <div style={{ paddingTop: '0', paddingBottom: TAB_H - 20 }}>
                  {contractLocked ? (
                    <div style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>🔒</span>
                      <span style={{ color: 'rgba(248,113,113,0.7)', fontSize: '0.82rem', fontWeight: 700 }}>ספריית האימונים נעולה — השלם גאולה</span>
                    </div>
                  ) : (
                    <button
                      className="btn-tactile"
                      onClick={() => setShowWorkoutLib(true)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid rgba(196,121,90,0.25)', background: 'rgba(196,121,90,0.05)', color: '#d4956e', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <span>🏋️</span> לכל האימונים ←
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ height: TAB_H + 16 }} />
          </div>
        )}

        {/* ── TRACKS TAB ── */}
        {activeTab === 'tracks' && (
          <TracksPage
            profile={profile}
            onAwardXP={(amount, guestMode) => { if (!guestMode) awardXP(amount); else setXPToast('signin') }}
            onSaveProfile={update => setProfile(p => ({ ...p, ...update }))}
          />
        )}

        {/* ── STATS TAB (analytics + leaderboard) ── */}
        {activeTab === 'stats' && (
          <>
            <AnalyticsTab profile={profile} currentUid={user?.uid} />
            <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: TAB_H + 16 }}>
              <LeaderboardTab entries={leaderboard} currentUid={user?.uid} td={td} />
            </div>
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ paddingBottom: TAB_H + 16 }}>
            <Settings
              onRebuildPath={() => { setCustomPath(null); setShowPathBuilder(true); setActiveTab('home') }}
            />
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: TAB_H, background: '#111118', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', zIndex: 200 }}>
        {[{ id: 'home', icon: '🏠', label: 'היום שלי' }, { id: 'tracks', icon: '📚', label: 'מסלולים' }, { id: 'stats', icon: '📊', label: 'סטטס' }, { id: 'settings', icon: '⚙️', label: 'הגדרות' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '1.2rem', filter: activeTab === tab.id ? 'none' : 'grayscale(0.8) opacity(0.45)' }}>{tab.icon}</span>
            <span style={{ fontSize: '0.61rem', fontWeight: 700, color: activeTab === tab.id ? '#d4956e' : 'rgba(241,245,249,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{tab.label}</span>
            {activeTab === tab.id && <div style={{ width: 18, height: 2, borderRadius: 99, background: '#c4795a' }} />}
          </button>
        ))}
      </div>

      {/* ── Overlays ── */}
      {showWorkoutLib && (
        <WorkoutLibraryModal
          onSelect={ex => { setShowWorkoutLib(false); setWorkoutSession(ex) }}
          onClose={() => setShowWorkoutLib(false)}
        />
      )}
      {workoutSession && (
        <SetSummaryModal
          exercise={workoutSession}
          onDone={() => setWorkoutSession(null)}
          onClose={() => setWorkoutSession(null)}
        />
      )}
      {showModal && <AddTriggerModal onSave={handleAddTrigger} onClose={() => setShowModal(false)} td={td} to={to} />}
      {proofModal && (
        <ProofModal
          title={proofModal.title}
          prompt={proofModal.taskDesc}
          xpAmount={proofModal.xp}
          accentColor={proofModal.color}
          onConfirm={proofModal.type === 'habit' ? confirmHabitComplete : confirmChallengeComplete}
          onClose={() => setProofModal(null)}
        />
      )}
      {xpToast && <XPToast xp={xpToast} onDone={() => setXPToast(null)} />}
      {saving && <div style={{ position: 'fixed', bottom: TAB_H + 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(196,121,90,0.92)', color: '#fff', borderRadius: 20, padding: '0.45rem 1.1rem', fontSize: '0.78rem', fontWeight: 600, zIndex: 300 }}>{td.saving}</div>}
      <AddToHomeScreen />

    </div>
  )
}
