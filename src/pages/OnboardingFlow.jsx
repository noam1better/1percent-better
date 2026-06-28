import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { saveProfile } from '../services/focusTriggerService'

const GOAL_IDS = [
  { id: 'trading',  emoji: '📈' },
  { id: 'fitness',  emoji: '💪' },
  { id: 'learning', emoji: '📚' },
  { id: 'mindful',  emoji: '🧘' },
  { id: 'work',     emoji: '💼' },
  { id: 'creative', emoji: '🎨' },
]

const STEPS = ['name', 'goal', 'trigger1', 'trigger2', 'vision', 'done']

const S = {
  page:       { minHeight: '100vh', background: '#0e0e16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
  card:       { width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem 1.75rem' },
  label:      { color: 'rgba(241,245,249,0.45)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' },
  h2:         { color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' },
  sub:        { color: 'rgba(241,245,249,0.45)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  input:      { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'inherit' },
  textarea:   { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: 72, fontFamily: 'inherit' },
  timeInput:  { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'inherit', colorScheme: 'dark' },
  btnPrimary: (on) => ({ flex: 1, padding: '0.85rem', borderRadius: 12, border: 'none', background: on ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)', color: on ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 700, cursor: on ? 'pointer' : 'not-allowed' }),
  btnBack:    { flex: '0 0 auto', padding: '0.85rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', cursor: 'pointer' },
  btnSkip:    { flex: '0 0 auto', padding: '0.85rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', cursor: 'pointer' },
}

function ProgressBar({ step, to }) {
  const idx = STEPS.indexOf(step)
  const pct = (idx / (STEPS.length - 1)) * 100
  const label = to.stepOf.replace('{n}', idx + 1).replace('{total}', STEPS.length)
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function TriggerStep({ num, value, onChange, to }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{num}</div>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem' }}>{to.triggerLabel} {num}</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={S.label}>{to.cue}</p>
        <input style={S.input} placeholder={to.cuePh} value={value.cue} onChange={e => onChange({ ...value, cue: e.target.value })} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={S.label}>{to.habit}</p>
        <input style={S.input} placeholder={to.habitPh} value={value.habit} onChange={e => onChange({ ...value, habit: e.target.value })} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={S.label}>
          {to.time} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>{to.timeOpt}</span>
        </p>
        <input
          type="time"
          style={S.timeInput}
          value={value.time}
          onChange={e => onChange({ ...value, time: e.target.value })}
        />
      </div>

      <div>
        <p style={S.label}>
          {to.note} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>{to.optional}</span>
        </p>
        <textarea style={S.textarea} placeholder={to.notePh} value={value.note} onChange={e => onChange({ ...value, note: e.target.value })} />
      </div>
    </div>
  )
}

export default function OnboardingFlow() {
  const { user }    = useAuth()
  const { t: tAll } = useLang()
  const to          = tAll.onboarding
  const navigate    = useNavigate()

  const PROGRESS_KEY = 'ft_ob_progress'
  const saved = (() => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {} } catch { return {} } })()

  const [step,   setStep]   = useState(saved.step   || 'name')
  const [name,   setName]   = useState(saved.name   || '')
  const [goal,   setGoal]   = useState(saved.goal   || '')
  const [t1,     setT1]     = useState(saved.t1     || { cue: '', habit: '', time: '', note: '' })
  const [t2,     setT2]     = useState(saved.t2     || { cue: '', habit: '', time: '', note: '' })
  const [vision, setVision] = useState(saved.vision || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step, name, goal, t1, t2, vision }))
    } catch { /* storage full — non-fatal */ }
  }, [step, name, goal, t1, t2, vision])

  const idx     = STEPS.indexOf(step)
  const canNext = {
    name:     name.trim().length > 0,
    goal:     !!goal,
    trigger1: t1.cue.trim() && t1.habit.trim(),
    trigger2: t2.cue.trim() && t2.habit.trim(),
    vision:   true,
    done:     false,
  }

  function next() { setStep(STEPS[idx + 1]) }
  function back() { setStep(STEPS[idx - 1]) }

  async function finish() {
    setSaving(true)
    const profile = {
      name: name.trim(),
      focusGoal: goal,
      vision: vision.trim() || null,
      triggers: [
        { id: 't1', cue: t1.cue.trim(), habit: t1.habit.trim(), time: t1.time || null, note: t1.note.trim() },
        { id: 't2', cue: t2.cue.trim(), habit: t2.habit.trim(), time: t2.time || null, note: t2.note.trim() },
      ],
      onboardingDone: true,
      createdAt: new Date().toISOString(),
    }
    try { await saveProfile(user.uid, profile) } catch { /* non-fatal */ }
    localStorage.removeItem(PROGRESS_KEY)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <ProgressBar step={step} to={to} />

        {step === 'name' && (
          <>
            <h2 style={S.h2}>{to.name.title}</h2>
            <p style={S.sub}>{to.name.sub}</p>
            <input
              style={S.input}
              placeholder={to.name.placeholder}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canNext.name && next()}
              autoFocus
            />
          </>
        )}

        {step === 'goal' && (
          <>
            <h2 style={S.h2}>{to.goal.title}</h2>
            <p style={S.sub}>{to.goal.sub}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' }}>
              {GOAL_IDS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  style={{
                    padding: '0.85rem 0.5rem', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: goal === g.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                    background: goal === g.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{g.emoji}</div>
                  <div style={{ color: goal === g.id ? '#a5b4fc' : 'rgba(241,245,249,0.65)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {to.goals[g.id]}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'trigger1' && (
          <>
            <h2 style={S.h2}>{to.trigger1.title}</h2>
            <p style={S.sub}>{to.trigger1.sub}</p>
            <TriggerStep num={1} value={t1} onChange={setT1} to={to} />
          </>
        )}

        {step === 'trigger2' && (
          <>
            <h2 style={S.h2}>{to.trigger2.title}</h2>
            <p style={S.sub}>{to.trigger2.sub}</p>
            <TriggerStep num={2} value={t2} onChange={setT2} to={to} />
          </>
        )}

        {step === 'vision' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>🔭</div>
            <h2 style={{ ...S.h2, textAlign: 'center' }}>{to.vision.title}</h2>
            <p style={{ ...S.sub, textAlign: 'center' }}>{to.vision.sub}</p>
            <textarea
              style={{ ...S.textarea, minHeight: 120, marginBottom: '0' }}
              placeholder={to.vision.placeholder}
              value={vision}
              onChange={e => setVision(e.target.value)}
              autoFocus
            />
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={S.h2}>{to.done.title}</h2>
            <p style={S.sub}>{to.done.sub}</p>
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {[t1, t2].map((tr, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? '0.75rem' : 0 }}>
                  <div style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {to.triggerLabel} {i + 1}{tr.time ? ` · ${tr.time}` : ''}
                  </div>
                  <div style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>{tr.cue}</div>
                  <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.8rem' }}>→ {tr.habit}</div>
                </div>
              ))}
            </div>
            <button
              onClick={finish}
              disabled={saving}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? to.done.saving : to.done.btn}
            </button>
          </div>
        )}

        {step !== 'done' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {idx > 0 && (
              <button onClick={back} style={S.btnBack}>{to.back}</button>
            )}
            {step === 'vision' ? (
              <>
                <button onClick={next} style={S.btnSkip}>{to.vision.skip}</button>
                <button onClick={next} style={S.btnPrimary(true)}>{to.next}</button>
              </>
            ) : (
              <button onClick={next} disabled={!canNext[step]} style={S.btnPrimary(canNext[step])}>
                {to.next}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
