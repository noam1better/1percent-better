import { useState, useEffect } from 'react'
import { getTodaysEntry, shouldGenerate, generateDailyMessage, getRecentLog } from '../services/dailyCoachService'

const RANK_COLOR = { RECRUIT: '#64748b', OPERATOR: '#a78bfa', ELITE: '#F5C518', PRIME: '#10b981' }

export default function DailyBrief() {
  const [entry,       setEntry]       = useState(null)
  const [phase,       setPhase]       = useState('init')  // init | generating | done | early | empty
  const [showHistory, setShowHistory] = useState(false)
  const [history,     setHistory]     = useState([])

  useEffect(() => {
    const existing = getTodaysEntry()
    if (existing) {
      setEntry(existing)
      setPhase('done')
      return
    }
    if (!shouldGenerate()) {
      // before 08:00 — show yesterday's or nothing
      const log = getRecentLog(1)
      if (log.length && log[0].date !== new Date().toISOString().slice(0, 10)) {
        setEntry(log[0])
        setPhase('early')
      } else {
        setPhase('empty')
      }
      return
    }
    // After 08:00, no entry yet — generate
    setPhase('generating')
    generateDailyMessage().then(e => {
      setEntry(e)
      setPhase('done')
    }).catch(() => setPhase('empty'))
  }, [])

  useEffect(() => {
    if (showHistory) setHistory(getRecentLog(5))
  }, [showHistory])

  if (phase === 'init' || phase === 'empty') return null

  const borderColor = entry?.rankLabel ? RANK_COLOR[entry.rankLabel] || '#F5C518' : '#F5C518'

  return (
    <div style={{
      background: 'rgba(5,5,10,0.6)',
      border: `1px solid ${borderColor}28`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 14,
      padding: '0.85rem 1rem',
      marginBottom: '1rem',
      fontFamily: "'SF Mono','Fira Code','Courier New',monospace",
      animation: 'slide-up 0.3s ease both',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: borderColor, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            ◈ DAILY BRIEF
          </span>
          {phase === 'early' && (
            <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.52rem', fontWeight: 600 }}>
              (אתמול · ב-08:00 תיווצר הודעה חדשה)
            </span>
          )}
        </div>
        {entry?.generatedAt && (
          <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.55rem' }}>{entry.generatedAt}</span>
        )}
      </div>

      {/* Generating state */}
      {phase === 'generating' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.3rem 0' }}>
          <div className="anim-spin" style={{ width: 12, height: 12, border: `2px solid ${borderColor}30`, borderTopColor: borderColor, borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>GENERATING BRIEF…</span>
        </div>
      )}

      {/* Message */}
      {entry?.message && phase !== 'generating' && (
        <p style={{
          color: 'rgba(241,245,249,0.88)',
          fontSize: '0.85rem',
          lineHeight: 1.65,
          margin: 0,
          fontFamily: 'inherit',
          borderTop: `1px solid ${borderColor}18`,
          paddingTop: '0.5rem',
        }}>
          {entry.message}
        </p>
      )}

      {/* Context chips */}
      {entry && phase !== 'generating' && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
          {entry.rankLabel && (
            <span style={{ background: `${RANK_COLOR[entry.rankLabel] || '#F5C518'}14`, border: `1px solid ${RANK_COLOR[entry.rankLabel] || '#F5C518'}30`, borderRadius: 20, padding: '0.12rem 0.5rem', color: RANK_COLOR[entry.rankLabel] || '#F5C518', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.07em' }}>
              {entry.rankLabel} · {entry.score}
            </span>
          )}
          {entry.streak > 0 && (
            <span style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '0.12rem 0.5rem', color: '#fbbf24', fontSize: '0.56rem', fontWeight: 700 }}>
              🔥 {entry.streak} ימים
            </span>
          )}
          {entry.missedDays > 0 && (
            <span style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '0.12rem 0.5rem', color: '#f87171', fontSize: '0.56rem', fontWeight: 700 }}>
              ✗ {entry.missedDays} פוספסו
            </span>
          )}
        </div>
      )}

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(241,245,249,0.2)', fontSize: '0.55rem', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'inline-block', transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
        {showHistory ? 'הסתר' : 'הצג לוג קודם'}
      </button>

      {/* History log */}
      {showHistory && history.length > 0 && (
        <div style={{ marginTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', animation: 'fadeIn 0.2s ease' }}>
          {history.filter(e => e.date !== entry?.date).slice(0, 4).map(e => (
            <div key={e.date} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.55rem', fontWeight: 700 }}>{e.date}</span>
                <span style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.52rem' }}>{e.generatedAt}</span>
              </div>
              <p style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.73rem', lineHeight: 1.55, margin: 0 }}>{e.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
