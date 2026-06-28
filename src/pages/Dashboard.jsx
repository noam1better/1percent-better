import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { loadProfile, saveProfile, loadActivity, saveReflection } from '../services/focusTriggerService'
import AICoachModal from '../components/AICoachModal'
import { requestPermission, checkNotifications } from '../services/notificationService'

const todayKey     = () => new Date().toISOString().slice(0, 10)
const getCheckins  = () => { try { return JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`)) || {} } catch { return {} } }
const saveCheckins = v  => { try { localStorage.setItem(`ft_checkins_${todayKey()}`, JSON.stringify(v)) } catch {} }

const inputSx = { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem', fontFamily: 'inherit' }
const labelSx = { display: 'block', color: 'rgba(241,245,249,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }

// ── Confetti Burst ─────────────────────────────────────────────────

const CONF_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#a5b4fc', '#34d399', '#fbbf24', '#f472b6', '#60a5fa']

function ConfettiBurst() {
  const particles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => {
      const angle = ((i / 24) * Math.PI * 2) + (Math.random() - 0.5) * 0.5
      const dist  = 45 + Math.random() * 65
      return {
        id:    i,
        color: CONF_COLORS[i % CONF_COLORS.length],
        size:  Math.round(5 + Math.random() * 7),
        round: Math.random() > 0.35,
        left:  `${20 + Math.random() * 60}%`,
        tx:    `${(Math.cos(angle) * dist).toFixed(1)}px`,
        ty:    `${(-(15 + Math.sin(Math.abs(angle)) * dist * 0.9)).toFixed(1)}px`,
        rot:   `${Math.random() > 0.5 ? '' : '-'}${Math.round(200 + Math.random() * 400)}deg`,
        delay: `${Math.round(Math.random() * 220)}ms`,
      }
    }), [])

  return (
    <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 0, pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: 0,
            width:  p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 3,
            background: p.color,
            '--tx':  p.tx,
            '--ty':  p.ty,
            '--rot': p.rot,
            animation: `confetti-pop 0.9s ${p.delay} cubic-bezier(.25,.46,.45,.94) forwards`,
          }}
        />
      ))}
    </div>
  )
}

// ── Add Trigger Modal ──────────────────────────────────────────────

function AddTriggerModal({ onSave, onClose, td, to }) {
  const [cue,   setCue]   = useState('')
  const [habit, setHabit] = useState('')
  const [time,  setTime]  = useState('')
  const [note,  setNote]  = useState('')
  const canSave = cue.trim() && habit.trim()

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>{td.modalTitle}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.5)', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <label style={labelSx}>{to.cue}</label>
        <input autoFocus style={inputSx} placeholder={to.cuePh} value={cue} onChange={e => setCue(e.target.value)} />

        <label style={labelSx}>{to.habit}</label>
        <input style={inputSx} placeholder={to.habitPh} value={habit} onChange={e => setHabit(e.target.value)} />

        <label style={labelSx}>
          {to.time} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.68rem' }}>{to.timeOpt}</span>
        </label>
        <input
          type="time"
          style={{ ...inputSx, colorScheme: 'dark' }}
          value={time}
          onChange={e => setTime(e.target.value)}
        />

        <label style={labelSx}>
          {to.note} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.68rem' }}>{to.optional}</span>
        </label>
        <textarea
          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', resize: 'none', height: 72, fontFamily: 'inherit', marginBottom: '1.25rem' }}
          placeholder={to.notePh}
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <button
          onClick={() => canSave && onSave({ cue: cue.trim(), habit: habit.trim(), time: time || null, note: note.trim() })}
          disabled={!canSave}
          style={{ width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none', background: canSave ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)', color: canSave ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed' }}
        >
          {td.save}
        </button>
      </div>
    </div>
  )
}

// ── Trigger Card ───────────────────────────────────────────────────

function TriggerCard({ trigger, index, done, onToggle, td, reflection, onReflectionChange }) {
  const [showBurst, setShowBurst] = useState(false)

  function handleToggle() {
    if (!done) {
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 1300)
    }
    onToggle()
  }

  return (
    <div style={{
      position: 'relative',
      background: done ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${done ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 18,
      padding: '1.25rem 1.25rem 1rem',
      transition: 'border-color 0.3s, background 0.3s',
      animation: showBurst ? 'done-glow 0.6s ease-out' : 'none',
      overflow: 'visible',
    }}>
      {showBurst && <ConfettiBurst />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{index + 1}</div>
          <span style={{ color: 'rgba(165,180,252,0.8)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{td.triggerLabel}</span>
          {trigger.time && (
            <span style={{ background: 'rgba(99,102,241,0.15)', borderRadius: 20, padding: '0.15rem 0.5rem', color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700 }}>
              🕐 {trigger.time}
            </span>
          )}
        </div>
        {done && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{td.doneBadge}</span>}
      </div>

      <p style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', lineHeight: 1.4 }}>{trigger.cue}</p>
      <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.85rem', marginBottom: trigger.note ? '0.65rem' : '1rem', lineHeight: 1.5 }}>→ {trigger.habit}</p>

      {trigger.note && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.6rem 0.75rem', marginBottom: '1rem' }}>
          <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.78rem', fontStyle: 'italic', margin: 0 }}>"{trigger.note}"</p>
        </div>
      )}

      <button
        onClick={handleToggle}
        style={{ width: '100%', padding: '0.7rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: done ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(99,102,241,0.35)', background: done ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: done ? '#10b981' : '#a5b4fc' }}
      >
        {done ? td.completed : td.markDone}
      </button>

      {/* Reflection input — visible after done */}
      {done && (
        <div style={{ marginTop: '0.85rem', animation: 'fadeIn 0.3s ease' }}>
          <label style={{ display: 'block', color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            💭 {td.reflection}
          </label>
          <textarea
            value={reflection || ''}
            onChange={e => onReflectionChange(trigger.id, e.target.value)}
            placeholder={td.reflectionPh}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.75rem',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)', color: 'rgba(241,245,249,0.75)',
              fontSize: '0.82rem', fontFamily: 'inherit', resize: 'none',
              outline: 'none', lineHeight: 1.5, transition: 'border-color 0.2s',
            }}
            onFocus={e  => { e.target.style.borderColor = 'rgba(99,102,241,0.4)' }}
            onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout }           = useAuth()
  const { lang, setLang, t: tAll } = useLang()
  const td = tAll.dashboard
  const to = tAll.onboarding

  const [profile,     setProfile]     = useState(null)
  const [checkins,    setCheckinsS]   = useState(getCheckins)
  const [reflections, setReflections] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [showCoach,   setShowCoach]   = useState(false)
  const [saving,      setSaving]      = useState(false)

  const reflTimers = useRef({})

  useEffect(() => {
    if (!user) return
    loadProfile(user.uid)
      .then(p => {
        setProfile(p || {})
        return loadActivity(user.uid, todayKey())
      })
      .then(activity => {
        const texts = {}
        Object.entries(activity).forEach(([id, val]) => {
          if (val?.reflection) texts[id] = val.reflection
        })
        setReflections(texts)
      })
      .catch(() => setProfile({}))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!profile) return
    requestPermission()
    const triggers = profile?.triggers || []
    const run = () => checkNotifications(triggers, profile)
    run()
    const interval = setInterval(run, 60_000)
    return () => clearInterval(interval)
  }, [profile])

  function toggle(id) {
    const next = { ...checkins, [id]: !checkins[id] }
    saveCheckins(next)
    setCheckinsS(next)
  }

  function handleReflectionChange(triggerId, text) {
    setReflections(prev => ({ ...prev, [triggerId]: text }))
    clearTimeout(reflTimers.current[triggerId])
    reflTimers.current[triggerId] = setTimeout(() => {
      saveReflection(user.uid, todayKey(), triggerId, text).catch(() => {})
    }, 1500)
  }

  async function handleAddTrigger(data) {
    setSaving(true)
    const existing   = profile?.triggers || []
    const newTrigger = { id: `t${Date.now()}`, ...data }
    const updated    = { ...(profile || {}), triggers: [...existing, newTrigger], onboardingDone: true }
    try {
      await saveProfile(user.uid, updated)
      setProfile(updated)
      setShowModal(false)
    } catch {
      /* save failed — user can retry by reopening modal */
    }
    setSaving(false)
  }

  const triggers   = profile?.triggers || []
  const doneCount  = triggers.filter(tr => checkins[tr.id]).length
  const allDone    = triggers.length > 0 && doneCount === triggers.length
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? td.morning : hour < 17 ? td.afternoon : td.evening
  const isHe       = lang === 'he'
  const dateLocale = isHe ? 'he-IL' : 'en-US'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e16', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>{tAll.welcome.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowCoach(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 10, color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 700, padding: '0.4rem 0.85rem', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.4))' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))' }}
          >
            🤖 {td.aiCoach}
          </button>
          <button
            onClick={() => setLang(isHe ? 'en' : 'he')}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(241,245,249,0.6)', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.6rem', cursor: 'pointer' }}
          >
            {isHe ? 'EN' : 'עב'}
          </button>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
            {td.signOut}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            {greeting}{profile?.name ? `, ${profile.name}` : ''} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {profile?.focusGoal && (
              <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '0.25rem 0.7rem', color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600 }}>
                {to.goals[profile.focusGoal] || profile.focusGoal}
              </span>
            )}
            <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.8rem' }}>
              {new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* All-done banner */}
        {allDone && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '0.875rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🎉</span>
            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>{td.allDone}</span>
          </div>
        )}

        {/* Empty state */}
        {triggers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{td.emptyTitle}</h2>
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              {td.emptyDesc.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.75rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {td.addFirst}
            </button>
          </div>
        )}

        {/* Trigger cards */}
        {triggers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {triggers.map((tr, i) => (
              <TriggerCard
                key={tr.id}
                trigger={tr}
                index={i}
                done={!!checkins[tr.id]}
                onToggle={() => toggle(tr.id)}
                td={td}
                reflection={reflections[tr.id] || ''}
                onReflectionChange={handleReflectionChange}
              />
            ))}
          </div>
        )}

        {/* Progress */}
        {triggers.length > 0 && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.78rem' }}>{td.progress}</span>
              <span style={{ color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 600 }}>{doneCount} / {triggers.length}</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.4s ease', background: allDone ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${triggers.length ? (doneCount / triggers.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Permanent Add Trigger button */}
        <button
          onClick={() => setShowModal(true)}
          style={{ marginTop: '1.25rem', width: '100%', padding: '0.9rem', borderRadius: 14, border: '2px dashed rgba(99,102,241,0.3)', background: 'transparent', color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'border-color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';  e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span>
          {td.addTrigger}
        </button>
      </div>

      {showModal  && <AddTriggerModal onSave={handleAddTrigger} onClose={() => setShowModal(false)} td={td} to={to} />}
      {showCoach  && <AICoachModal onClose={() => setShowCoach(false)} focusGoal={profile?.focusGoal} />}
      {saving && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(99,102,241,0.9)', color: '#fff', borderRadius: 20, padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
          {td.saving}
        </div>
      )}
    </div>
  )
}
