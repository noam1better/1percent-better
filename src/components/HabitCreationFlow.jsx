import { useState } from 'react'
import { getTopSuggestionsForPillars } from '../data/habitSuggestions'
import { getPillar } from '../data/pillars'

const TRIGGERS = [
  { id: 'wake',   label: 'כשאני מתעורר' },
  { id: 'bfast',  label: 'אחרי ארוחת הבוקר' },
  { id: 'phone',  label: 'לפני שאני פותח את הטלפון' },
  { id: 'work',   label: 'אחרי העבודה / הלימודים' },
  { id: 'sleep',  label: 'לפני השינה' },
  { id: 'custom', label: 'בזמן מותאם אישית...' },
]

export default function HabitCreationFlow({ growthPillars, existingCount, onSave, onClose, prefill }) {
  // If prefill (from surprise mission), skip to step 2
  const hasPreFill = !!(prefill?.titleHe)
  const [step, setStep]       = useState(hasPreFill ? 2 : 0)
  const [selected, setSelected] = useState(hasPreFill ? prefill : null) // chosen suggestion or { titleHe, pillar }
  const [customTitle, setCustomTitle] = useState(prefill?.titleHe || '')
  const [trigger, setTrigger] = useState(prefill?.triggerSuggestionHe || '')
  const [customTrigger, setCustomTrigger] = useState('')

  const activePillars = growthPillars?.length ? growthPillars : ['discipline', 'body']
  const suggestions = getTopSuggestionsForPillars(activePillars, 6)
  const atMax = existingCount >= 3

  function handleSuggestionPick(s) {
    setSelected(s)
    setCustomTitle(s.titleHe)
    setTrigger(s.triggerSuggestionHe)
    setStep(2)
  }

  function handleCustom() {
    setSelected(null)
    setCustomTitle('')
    setTrigger('')
    setStep(1)
  }

  function handleTitleNext() {
    if (!customTitle.trim()) return
    setSelected({ titleHe: customTitle.trim(), pillar: null })
    setStep(2)
  }

  function handleSave() {
    const finalTitle   = selected?.titleHe || customTitle.trim()
    const finalTrigger = trigger === 'custom' ? customTrigger.trim() : trigger
    if (!finalTitle) return
    onSave({
      cue:       finalTrigger || finalTitle,
      habit:     finalTitle,
      pillar:    selected?.pillar || prefill?.pillar || null,
      source:    prefill ? 'surprise-mission' : (selected?.id ? 'suggested' : 'manual'),
      createdAt: new Date().toISOString().slice(0, 10),
    })
  }

  const overlay = (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'slide-up 0.22s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1rem' }}>
              {step === 0 ? '+ הוסף הרגל' : step === 1 ? 'מה ההרגל?' : 'מתי תעשה אותו?'}
            </div>
            <div style={{ color: '#71717A', fontSize: '0.68rem', marginTop: '0.1rem' }}>
              {['בחר הרגל', 'הגדר', 'הוסף טריגר'][step]}
            </div>
          </div>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44, minWidth: 44 }}>✕</button>
        </div>

        {/* STEP 0 — Suggestions or custom */}
        {step === 0 && (
          <div>
            {atMax ? (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '1rem', textAlign: 'center', color: '#A4A6AD', fontSize: '0.85rem', lineHeight: 1.6 }}>
                שלושה הרגלים זה המקסימום כרגע.<br />
                <span style={{ color: '#71717A', fontSize: '0.75rem' }}>פוקוס מנצח עומס — ארכב הרגל קיים לפני שמוסיפים.</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleCustom}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#A4A6AD', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem' }}
                >
                  + צור הרגל מותאם אישית
                </button>
                <div style={{ color: '#71717A', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
                  מומלץ בשבילך
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {suggestions.map(s => {
                    const pillar = getPillar(s.pillar)
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestionPick(s)}
                        className="btn-tactile"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 0.9rem',
                          background: '#111317',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 12,
                          cursor: 'pointer', textAlign: 'right',
                          width: '100%',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{pillar?.emoji || '⚡'}</span>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ color: '#F4F1E8', fontSize: '0.88rem', fontWeight: 700 }}>{s.titleHe}</div>
                          <div style={{ color: '#71717A', fontSize: '0.67rem', marginTop: '0.1rem' }}>
                            {s.triggerSuggestionHe} · {s.estimatedMinutes} דק'
                          </div>
                        </div>
                        <span style={{ color: '#71717A', fontSize: '0.8rem' }}>←</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 1 — Custom title */}
        {step === 1 && (
          <div>
            <input
              autoFocus
              className="glow-input"
              placeholder="למשל: קרא 10 עמודים"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTitleNext()}
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleTitleNext}
              disabled={!customTitle.trim()}
              className={customTitle.trim() ? 'btn-tactile' : ''}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', background: customTitle.trim() ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: customTitle.trim() ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: customTitle.trim() ? 'pointer' : 'not-allowed' }}
            >
              המשך ←
            </button>
          </div>
        )}

        {/* STEP 2 — Trigger */}
        {step === 2 && (
          <div>
            <div style={{ color: '#A4A6AD', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.1rem' }}>{selected?.titleHe || customTitle}</div>
            <div style={{ color: '#71717A', fontSize: '0.7rem', marginBottom: '1rem' }}>מתי תעשה אותו?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {TRIGGERS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTrigger(t.id === 'custom' ? 'custom' : t.label)}
                  className="btn-tactile"
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${trigger === (t.id === 'custom' ? 'custom' : t.label) ? 'rgba(217,179,76,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    background: trigger === (t.id === 'custom' ? 'custom' : t.label) ? 'rgba(217,179,76,0.08)' : 'transparent',
                    color: trigger === (t.id === 'custom' ? 'custom' : t.label) ? '#D9B34C' : '#A4A6AD',
                    fontSize: '0.85rem', fontWeight: 600, textAlign: 'right',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {trigger === 'custom' && (
              <input
                autoFocus
                className="glow-input"
                placeholder="מתי בדיוק?"
                value={customTrigger}
                onChange={e => setCustomTrigger(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.88rem', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'inherit' }}
              />
            )}
            <button
              onClick={handleSave}
              disabled={!trigger}
              className={trigger ? 'btn-tactile' : ''}
              style={{ width: '100%', padding: '0.95rem', borderRadius: 12, border: 'none', background: trigger ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: trigger ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: trigger ? 'pointer' : 'not-allowed' }}
            >
              הוסף הרגל ✓
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return overlay
}
