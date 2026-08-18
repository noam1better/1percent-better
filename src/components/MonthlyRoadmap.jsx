import { useState } from 'react'

const MONTH_KEY = m => `prime_roadmap_${m}`
const CURRENT_MONTH = () => new Date().toISOString().slice(0, 7)

const PILLARS = [
  {
    id: 'builder',
    icon: '🛠️',
    labelHe: 'הבונה',
    label: 'The Builder',
    color: '#6366f1',
    phases: ['הגדרת מטרות ותכנון', 'בנייה ראשונה', 'איטרציה ושיפור', 'השקה ונעילה'],
    placeholder: 'מה אתה בונה החודש? (AI, עסק, כלי...)',
  },
  {
    id: 'creator',
    icon: '🎨',
    labelHe: 'היוצר',
    label: 'The Creator',
    color: '#ec4899',
    phases: ['קונספט ואיסוף השראה', 'יצירת תוכן', 'עריכה ושיפור', 'פרסום ושיתוף'],
    placeholder: 'מה אתה יוצר החודש? (תוכן, מוצר, אמנות...)',
  },
  {
    id: 'connection',
    icon: '💛',
    labelHe: 'הקשר',
    label: 'The Connection',
    color: '#f59e0b',
    phases: ['מיפוי הזדמנויות', 'יצירת קשר פעיל', 'מעקב וקידום', 'סגירה ותוצאות'],
    placeholder: 'מה אתה בונה בקשרים החודש? (עסקים, שותפויות...)',
  },
  {
    id: 'reset',
    icon: '🧘',
    labelHe: 'האיפוס',
    label: 'The Reset',
    color: '#10b981',
    phases: ['הקמת שגרה בסיסית', 'חיזוק הרגלים', 'העמקת פרקטיקה', 'שילוב ונעילה'],
    placeholder: 'מה אתה מאפס החודש? (בריאות, מיינד, גוף...)',
  },
]

const WEEK_LABELS = ['שבוע 1', 'שבוע 2', 'שבוע 3', 'שבוע 4']
const WEEK_THEMES = ['בסיס', 'בנייה', 'ביצוע', 'נעילה']

function getMonthLabel(m) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

function getCurrentWeekIndex(currentDay) {
  if (currentDay && currentDay > 0) {
    return Math.min(Math.ceil(currentDay / 7) - 1, 3)
  }
  return Math.min(Math.floor((new Date().getDate() - 1) / 7), 3)
}

function loadRoadmap(month) {
  try { return JSON.parse(localStorage.getItem(MONTH_KEY(month))) } catch { return null }
}

function saveRoadmap(month, data) {
  try { localStorage.setItem(MONTH_KEY(month), JSON.stringify(data)) } catch {}
}

// ── Setup / Edit Modal ────────────────────────────────────────────────

function SetupModal({ month, existing, onSave, onClose }) {
  const [goals, setGoals] = useState(
    existing || { builder: '', creator: '', connection: '', reset: '' }
  )

  const hasAny = Object.values(goals).some(g => g.trim().length > 0)

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: 'rgba(5,5,12,0.9)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: '#0f0f1c',
          borderRadius: '22px 22px 0 0',
          borderTop: '2.5px solid rgba(99,102,241,0.45)',
          padding: '1.5rem 1.4rem 2.8rem',
          animation: 'slide-up 0.28s ease',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div>
            <div style={{ color: 'rgba(99,102,241,0.65)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.25rem' }}>
              📅 לוח חודשי
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.05rem' }}>
              יעדי {getMonthLabel(month)}
            </div>
            <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.73rem', marginTop: '0.2rem', lineHeight: 1.5 }}>
              הגדר מיקוד לכל עמודה — הלוח 4 השבועות נוצר אוטומטית
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'rgba(241,245,249,0.55)', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 44, minHeight: 44, flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Pillar inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.4rem' }}>
          {PILLARS.map(p => (
            <div key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: `${p.color}1e`, border: `1px solid ${p.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', flexShrink: 0,
                }}>
                  {p.icon}
                </div>
                <div>
                  <span style={{ color: p.color, fontSize: '0.8rem', fontWeight: 800 }}>{p.labelHe}</span>
                  <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.65rem', marginInlineStart: '0.4rem' }}>— {p.label}</span>
                </div>
                {goals[p.id].trim() && (
                  <span style={{ marginInlineStart: 'auto', color: '#10b981', fontSize: '0.72rem' }}>✓</span>
                )}
              </div>
              <textarea
                value={goals[p.id]}
                onChange={e => setGoals(g => ({ ...g, [p.id]: e.target.value }))}
                placeholder={p.placeholder}
                rows={2}
                className="glow-input"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.72rem 0.9rem', borderRadius: 11,
                  border: `1px solid ${goals[p.id].trim() ? p.color + '45' : 'rgba(255,255,255,0.08)'}`,
                  background: goals[p.id].trim() ? `${p.color}09` : 'rgba(255,255,255,0.03)',
                  color: '#f1f5f9', fontSize: '0.85rem', fontFamily: 'inherit',
                  resize: 'none', lineHeight: 1.5, outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => hasAny && onSave(goals)}
          disabled={!hasAny}
          className="btn-primary btn-tactile"
          style={{
            width: '100%', padding: '1rem', borderRadius: 14,
            fontSize: '0.95rem', fontWeight: 900,
            cursor: hasAny ? 'pointer' : 'not-allowed',
            opacity: hasAny ? 1 : 0.35,
          }}
        >
          שמור לוח חודשי ←
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

export default function MonthlyRoadmap({ currentDay } = {}) {
  const month      = CURRENT_MONTH()
  const [roadmap,   setRoadmap]   = useState(() => loadRoadmap(month))
  const [showSetup, setShowSetup] = useState(false)
  const [expanded,  setExpanded]  = useState(false)

  const weekIdx       = getCurrentWeekIndex(currentDay)
  const activePillars = roadmap
    ? PILLARS.filter(p => roadmap.goals?.[p.id]?.trim())
    : []

  function handleSave(goals) {
    const data = { month, goals, createdAt: new Date().toISOString() }
    saveRoadmap(month, data)
    setRoadmap(data)
    setShowSetup(false)
  }

  return (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '1.25rem 1.35rem',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: roadmap ? '0.8rem' : '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>📅</span>
            <div>
              <div style={{ color: 'rgba(99,102,241,0.6)', fontSize: '0.54rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                לוח חודשי
              </div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>
                {getMonthLabel(month)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {roadmap && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="btn-tactile"
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, color: 'rgba(241,245,249,0.35)',
                  fontSize: '0.7rem', padding: '0 0.5rem', cursor: 'pointer',
                  minHeight: 44, minWidth: 44,
                }}
              >
                {expanded ? '▲' : '▼'}
              </button>
            )}
            <button
              onClick={() => setShowSetup(true)}
              className="btn-tactile"
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(241,245,249,0.45)', fontSize: '0.72rem', fontWeight: 700,
                padding: '0 0.75rem', cursor: 'pointer', minHeight: 44,
              }}
            >
              {roadmap ? 'ערוך' : '+ הגדר'}
            </button>
          </div>
        </div>

        {/* ─── Empty state ─── */}
        {!roadmap ? (
          <div style={{ textAlign: 'center', padding: '0.6rem 0 0.2rem' }}>
            <div style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.75rem', lineHeight: 1.55, marginBottom: '0.85rem' }}>
              הגדר יעד לכל עמודה — הלוח 4-שבועות נוצר אוטומטית
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="btn-primary btn-tactile"
              style={{
                borderRadius: 14, fontSize: '0.9rem', fontWeight: 800,
                padding: '0.8rem 1.5rem', cursor: 'pointer',
              }}
            >
              הגדר לוח {getMonthLabel(month)} ←
            </button>
          </div>
        ) : (
          <>
            {/* ── Active pillar chips ── */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              {activePillars.length === 0 ? (
                <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.72rem' }}>אין עמודות פעילות — לחץ ערוך</span>
              ) : activePillars.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.28rem',
                    background: `${p.color}14`, border: `1px solid ${p.color}30`,
                    borderRadius: 20, padding: '0.22rem 0.65rem',
                  }}
                >
                  <span style={{ fontSize: '0.72rem' }}>{p.icon}</span>
                  <span style={{ color: p.color, fontSize: '0.63rem', fontWeight: 800 }}>{p.labelHe}</span>
                </div>
              ))}
            </div>

            {/* ── 4-week progress bar ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '0.35rem' }}>
              {WEEK_LABELS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 4, borderRadius: 99,
                    background: i < weekIdx
                      ? 'rgba(99,102,241,0.55)'
                      : i === weekIdx
                        ? '#6366f1'
                        : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s',
                    position: 'relative',
                  }}
                />
              ))}
            </div>
            <div style={{ color: 'rgba(99,102,241,0.65)', fontSize: '0.6rem', fontWeight: 700 }}>
              {WEEK_LABELS[weekIdx]} · {WEEK_THEMES[weekIdx]}
            </div>

            {/* ── Expanded: full 4-week grid ── */}
            {expanded && (
              <div style={{ marginTop: '1rem', animation: 'fadeIn 0.22s ease' }}>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem' }}>

                  {/* Week header columns */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: activePillars.length > 0 ? '84px repeat(4, 1fr)' : '1fr',
                    gap: '0.3rem',
                    marginBottom: '0.4rem',
                  }}>
                    <div />
                    {WEEK_LABELS.map((wl, i) => (
                      <div
                        key={i}
                        style={{
                          textAlign: 'center', padding: '0.28rem 0.15rem',
                          borderRadius: 7,
                          background: i === weekIdx ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.025)',
                          border: `1px solid ${i === weekIdx ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div style={{ color: i === weekIdx ? '#a5b4fc' : 'rgba(241,245,249,0.32)', fontSize: '0.56rem', fontWeight: 800 }}>{wl}</div>
                        <div style={{ color: i === weekIdx ? 'rgba(165,180,252,0.55)' : 'rgba(241,245,249,0.16)', fontSize: '0.5rem' }}>{WEEK_THEMES[i]}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pillar rows */}
                  {activePillars.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '84px repeat(4, 1fr)',
                        gap: '0.3rem',
                        marginBottom: '0.3rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.32rem' }}>
                        <span style={{ fontSize: '0.7rem' }}>{p.icon}</span>
                        <span style={{ color: p.color, fontSize: '0.6rem', fontWeight: 800, lineHeight: 1.2 }}>{p.labelHe}</span>
                      </div>
                      {p.phases.map((phase, wi) => (
                        <div
                          key={wi}
                          style={{
                            padding: '0.38rem 0.28rem',
                            borderRadius: 7,
                            background: wi === weekIdx ? `${p.color}14` : wi < weekIdx ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.018)',
                            border: `1px solid ${wi === weekIdx ? p.color + '35' : wi < weekIdx ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'}`,
                            textAlign: 'center',
                            position: 'relative',
                          }}
                        >
                          {wi < weekIdx && (
                            <div style={{ position: 'absolute', top: 3, right: 4, color: '#10b981', fontSize: '0.5rem' }}>✓</div>
                          )}
                          <div style={{
                            color: wi === weekIdx ? p.color : wi < weekIdx ? 'rgba(241,245,249,0.2)' : 'rgba(241,245,249,0.22)',
                            fontSize: '0.54rem',
                            fontWeight: wi === weekIdx ? 700 : 400,
                            lineHeight: 1.4,
                          }}>
                            {phase}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* This week's focus */}
                  {activePillars.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.9rem' }}>
                      <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                        פוקוס השבוע
                      </div>
                      {activePillars.map(p => (
                        <div key={p.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', flexShrink: 0, marginTop: '0.1rem' }}>{p.icon}</span>
                          <div>
                            <span style={{ color: p.color, fontWeight: 800, fontSize: '0.75rem' }}>{p.labelHe} </span>
                            <span style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.73rem' }}>— {p.phases[weekIdx]}</span>
                            {roadmap.goals[p.id] && (
                              <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.68rem', marginTop: '0.1rem', lineHeight: 1.4 }}>{roadmap.goals[p.id]}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSetup && (
        <SetupModal
          month={month}
          existing={roadmap?.goals}
          onSave={handleSave}
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  )
}
