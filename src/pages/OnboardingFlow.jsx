import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useUserPrefs } from '../context/UserContext'
import { saveProfile } from '../services/focusTriggerService'
import { suggestChallenge } from '../services/coachService'

const GOAL_IDS = [
  { id: 'trading',  emoji: '📈' },
  { id: 'fitness',  emoji: '💪' },
  { id: 'learning', emoji: '📚' },
  { id: 'mindful',  emoji: '🧘' },
  { id: 'work',     emoji: '💼' },
  { id: 'creative', emoji: '🎨' },
]

const ENERGY_OPTS = [
  { id: 'low',    emoji: '🔋', label: 'נמוכה',   sub: 'מרגיש מרוקן — צריך הרגלים עדינים' },
  { id: 'medium', emoji: '⚡', label: 'בינונית', sub: 'יציב, בונה מומנטום' },
  { id: 'high',   emoji: '🔥', label: 'גבוהה',   sub: 'מוכן לדחוף — תן לי אתגר' },
]

const TIME_OPTS = [
  { id: '15',  emoji: '⏱',  label: '15 דקות',    sub: 'לו"ז צפוף — הפוך כל דקה לחשבון' },
  { id: '30',  emoji: '🕐',  label: '30 דקות',    sub: 'גמישות יומית, מספיק לבנות הרגל' },
  { id: '60',  emoji: '🕙',  label: 'שעה ויותר',  sub: 'מצב עבודה עמוקה' },
]

const CHALLENGE_META = {
  'ai-beginners':    { emoji: '🤖', title: 'AI for Beginners',   color: '#6366f1' },
  'business-mind':   { emoji: '💼', title: 'Business Mind',       color: '#8b5cf6' },
  'product-builder': { emoji: '🏗️', title: 'Product Builder',     color: '#10b981' },
  'deal-closer':     { emoji: '🤝', title: 'Deal Closer',         color: '#f59e0b' },
  'ai-pioneer':      { emoji: '🚀', title: 'AI Pioneer',          color: '#ec4899' },
  'business-soul':   { emoji: '🌟', title: 'בניית נשמת העסק',    color: '#f59e0b' },
  'self-discipline': { emoji: '🧠', title: 'בניית משמעת עצמית',  color: '#3b82f6' },
}

const STEPS = ['name', 'energy', 'time', 'focus', 'ai-pick', 'trigger1', 'trigger2', 'vision', 'done']

const S = {
  page:       { minHeight: '100vh', background: '#0e0e16', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
  card:       { width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem 1.75rem' },
  label:      { color: 'rgba(241,245,249,0.45)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' },
  h2:         { color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' },
  sub:        { color: 'rgba(241,245,249,0.45)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  input:      { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'inherit' },
  textarea:   { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: 72, fontFamily: 'inherit' },
  timeInput:  { width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'inherit', colorScheme: 'dark' },
  btnPrimary: (on) => ({ flex: 1, padding: '0.85rem', borderRadius: 12, border: 'none', background: on ? 'linear-gradient(135deg,#e8b800,#facc15)' : 'rgba(255,255,255,0.06)', color: on ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: on ? 'pointer' : 'not-allowed', boxShadow: on ? '0 6px 20px rgba(250,204,21,0.35)' : 'none', transition: 'all 0.15s ease' }),
  btnBack:    { flex: '0 0 auto', padding: '0.85rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' },
  btnSkip:    { flex: '0 0 auto', padding: '0.85rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' },
}

function ProgressBar({ step, to }) {
  const idx = STEPS.indexOf(step)
  const pct = (idx / (STEPS.length - 1)) * 100
  const label = to.stepOf.replace('{n}', idx + 1).replace('{total}', STEPS.length)
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#e8b800,#facc15)', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function OptionGrid({ options, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.5rem' }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          style={{
            padding: '0.9rem 1rem', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            border: selected === opt.id ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
            background: selected === opt.id ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{opt.emoji}</span>
          <div>
            <div style={{ color: selected === opt.id ? '#facc15' : '#f1f5f9', fontSize: '0.9rem', fontWeight: 700 }}>{opt.label}</div>
            <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.75rem', marginTop: '0.1rem' }}>{opt.sub}</div>
          </div>
          {selected === opt.id && <span style={{ marginLeft: 'auto', color: '#facc15', fontSize: '1rem' }}>✓</span>}
        </button>
      ))}
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
        <p style={S.label}>{to.time} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>{to.timeOpt}</span></p>
        <input type="time" style={S.timeInput} value={value.time} onChange={e => onChange({ ...value, time: e.target.value })} />
      </div>
      <div>
        <p style={S.label}>{to.note} <span style={{ color: 'rgba(241,245,249,0.25)', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>{to.optional}</span></p>
        <textarea style={S.textarea} placeholder={to.notePh} value={value.note} onChange={e => onChange({ ...value, note: e.target.value })} />
      </div>
    </div>
  )
}

export default function OnboardingFlow() {
  const { user }         = useAuth()
  const { t: tAll }      = useLang()
  const { setPrefs }     = useUserPrefs()
  const to               = tAll.onboarding
  const navigate         = useNavigate()

  const PROGRESS_KEY = 'ft_ob_progress'
  const saved = (() => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {} } catch { return {} } })()

  const [step,      setStep]      = useState(saved.step   || 'name')
  const [name,      setName]      = useState(saved.name   || '')
  const [energy,    setEnergy]    = useState(saved.energy || '')
  const [timeAvail, setTimeAvail] = useState(saved.timeAvail || '')
  const [goal,      setGoal]      = useState(saved.goal   || '')
  const [aiPick,    setAiPick]    = useState(saved.aiPick || null)   // suggested challenge ID
  const [aiLoading, setAiLoading] = useState(false)
  const [t1,        setT1]        = useState(saved.t1     || { cue: '', habit: '', time: '', note: '' })
  const [t2,        setT2]        = useState(saved.t2     || { cue: '', habit: '', time: '', note: '' })
  const [vision,    setVision]    = useState(saved.vision || '')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step, name, energy, timeAvail, goal, aiPick, t1, t2, vision })) }
    catch { /* storage full */ }
  }, [step, name, energy, timeAvail, goal, aiPick, t1, t2, vision])

  // Trigger AI suggestion when entering ai-pick step
  useEffect(() => {
    if (step !== 'ai-pick' || aiPick || aiLoading) return
    setAiLoading(true)
    suggestChallenge(energy, timeAvail, goal)
      .then(id => { setAiPick(id); setAiLoading(false) })
      .catch(() => { setAiPick('ai-beginners'); setAiLoading(false) })
  }, [step])

  const idx = STEPS.indexOf(step)

  const canNext = {
    name:      name.trim().length > 0,
    energy:    !!energy,
    time:      !!timeAvail,
    focus:     !!goal,
    'ai-pick': !!aiPick && !aiLoading,
    trigger1:  t1.cue.trim() && t1.habit.trim(),
    trigger2:  t2.cue.trim() && t2.habit.trim(),
    vision:    true,
    done:      false,
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
      preferences: { energy, timeAvail, recommendedTrack: aiPick },
      onboardingDone: true,
      createdAt: new Date().toISOString(),
    }
    setPrefs({ energy, timeAvail, focusGoal: goal, recommendedTrack: aiPick })
    try { await saveProfile(user.uid, profile) } catch { /* non-fatal */ }
    localStorage.removeItem(PROGRESS_KEY)
    navigate('/dashboard', { replace: true })
  }

  const pickedMeta = aiPick ? CHALLENGE_META[aiPick] : null

  return (
    <div style={S.page}>
      <div style={S.card}>
        <ProgressBar step={step} to={to} />
        <div key={step} style={{ animation: 'ob-slide 0.28s cubic-bezier(.4,0,.2,1) both' }}>

        {/* NAME */}
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

        {/* ENERGY */}
        {step === 'energy' && (
          <>
            <h2 style={S.h2}>מה רמת האנרגיה שלך כרגע?</h2>
            <p style={S.sub}>נתאים את האתגר הראשון שלך למקום שאתה נמצא בו עכשיו.</p>
            <OptionGrid options={ENERGY_OPTS} selected={energy} onSelect={setEnergy} />
          </>
        )}

        {/* TIME */}
        {step === 'time' && (
          <>
            <h2 style={S.h2}>כמה זמן יש לך ביום?</h2>
            <p style={S.sub}>תהיה ישר — עקביות עולה על שאיפות גדולות.</p>
            <OptionGrid options={TIME_OPTS} selected={timeAvail} onSelect={setTimeAvail} />
          </>
        )}

        {/* FOCUS / GOAL */}
        {step === 'focus' && (
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
                    border: goal === g.id ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
                    background: goal === g.id ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{g.emoji}</div>
                  <div style={{ color: goal === g.id ? '#facc15' : 'rgba(241,245,249,0.75)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {to.goals[g.id]}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* AI PICK */}
        {step === 'ai-pick' && (
          <>
            <h2 style={S.h2}>המסלול המותאם עבורך</h2>
            <p style={S.sub}>על פי האנרגיה, הזמן והמיקוד שלך — הבינה המלאכותית בחרה את זה עבורך.</p>

            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.82rem' }}>מנתח את הפרופיל שלך…</p>
              </div>
            ) : pickedMeta && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <div style={{ background: `${pickedMeta.color}12`, border: `1px solid ${pickedMeta.color}40`, borderRadius: 16, padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${pickedMeta.color}22`, border: `1px solid ${pickedMeta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>{pickedMeta.emoji}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>{pickedMeta.title}</span>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '0.15rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6rem' }}>✨</span>
                      <span style={{ color: '#a5b4fc', fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.04em' }}>מותאם עבורך</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { label: energy === 'low' ? '🔋 אנרגיה נמוכה' : energy === 'medium' ? '⚡ אנרגיה בינונית' : '🔥 אנרגיה גבוהה' },
                    { label: `⏱ ${timeAvail} min/day` },
                    { label: `🎯 ${to.goals[goal] || goal}` },
                  ].map(tag => (
                    <span key={tag.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '0.2rem 0.6rem', color: 'rgba(241,245,249,0.45)', fontSize: '0.7rem', fontWeight: 600 }}>{tag.label}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* TRIGGER 1 */}
        {step === 'trigger1' && (
          <>
            <h2 style={S.h2}>{to.trigger1.title}</h2>
            <p style={S.sub}>{to.trigger1.sub}</p>
            <TriggerStep num={1} value={t1} onChange={setT1} to={to} />
          </>
        )}

        {/* TRIGGER 2 */}
        {step === 'trigger2' && (
          <>
            <h2 style={S.h2}>{to.trigger2.title}</h2>
            <p style={S.sub}>{to.trigger2.sub}</p>
            <TriggerStep num={2} value={t2} onChange={setT2} to={to} />
          </>
        )}

        {/* VISION */}
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

        {/* DONE */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={S.h2}>{to.done.title}</h2>
            <p style={S.sub}>{to.done.sub}</p>
            {pickedMeta && (
              <div style={{ background: `${pickedMeta.color}12`, border: `1px solid ${pickedMeta.color}30`, borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{pickedMeta.emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 700 }}>{pickedMeta.title}</div>
                  <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.7rem' }}>המסלול המומלץ עבורך ✨</div>
                </div>
              </div>
            )}
            <div style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.18)', borderRadius: 14, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {[t1, t2].map((tr, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? '0.75rem' : 0 }}>
                  <div style={{ color: '#facc15', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {to.triggerLabel} {i + 1}{tr.time ? ` · ${tr.time}` : ''}
                  </div>
                  <div style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>{tr.cue}</div>
                  <div style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.8rem' }}>→ {tr.habit}</div>
                </div>
              ))}
            </div>
            <button
              onClick={finish}
              disabled={saving}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.95rem', borderRadius: 12, border: 'none', background: saving ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#e8b800,#facc15)', color: saving ? 'rgba(255,255,255,0.3)' : '#111', fontSize: '0.95rem', fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 6px 20px rgba(250,204,21,0.38)' }}
            >
              {saving ? to.done.saving : to.done.btn}
            </button>
          </div>
        )}

        </div>{/* end animated step wrapper */}

        {step !== 'done' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {idx > 0 && <button onClick={back} style={S.btnBack}>{to.back}</button>}
            {step === 'vision' ? (
              <>
                <button onClick={next} style={S.btnSkip}>{to.vision.skip}</button>
                <button onClick={next} style={S.btnPrimary(true)}>{to.next}</button>
              </>
            ) : step === 'ai-pick' ? (
              <button onClick={next} disabled={!canNext['ai-pick']} style={S.btnPrimary(canNext['ai-pick'])}>
                {aiLoading ? 'מנתח…' : 'מתחילים עם המסלול הזה ←'}
              </button>
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
