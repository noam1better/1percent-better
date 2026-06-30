import { useState, useEffect } from 'react'
import { getRank, checkMissedDay } from '../services/disciplineScore'

const TODAY = () => new Date().toISOString().slice(0, 10)

function secsUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(0, Math.floor((midnight - now) / 1000))
}

function fmtCountdown(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function readObjectives() {
  const today = TODAY()
  const objs = []
  try {
    const ds = JSON.parse(localStorage.getItem('prime_discipline_state'))
    if (ds?.goalMinutes) {
      const entry = (ds.history || []).find(h => h.date === today)
      if (!entry?.completed) objs.push(`${ds.goalMinutes} דקות ${ds.activity}`)
    }
  } catch {}
  try {
    const ts = JSON.parse(localStorage.getItem('prime_training_state'))
    const enrolled = ts?.enrolledTrackIds || []
    enrolled.forEach(id => {
      const track = ts?.tracks?.[id]
      const entry = (track?.history || []).find(h => h.date === today)
      if (!entry?.completed && track?.goalAmount) {
        const unit = id.includes('cardio') ? 'דקות' : 'חזרות'
        objs.push(`${track.goalAmount} ${unit} — ${id.replace('cardio-', '').replace('strength-', '')}`)
      }
    })
  } catch {}
  return objs
}

export default function MissionBriefing() {
  const [secs,  setSecs]  = useState(secsUntilMidnight)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(false)
  const [objs, setObjs] = useState([])

  useEffect(() => {
    const { score: s, missedYesterday } = checkMissedDay()
    setScore(s)
    setMissed(missedYesterday)
    setObjs(readObjectives())
    const id = setInterval(() => setSecs(secsUntilMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  const rank = getRank(score)
  const urgency = secs < 3600 ? 'critical' : secs < 14400 ? 'warning' : 'normal'
  const uc = urgency === 'critical' ? '#ef4444' : urgency === 'warning' ? '#f59e0b' : '#F5C518'
  const ubg = urgency === 'critical' ? 'rgba(239,68,68,0.05)' : urgency === 'warning' ? 'rgba(245,158,11,0.05)' : 'rgba(245,197,24,0.04)'
  const uborder = urgency === 'critical' ? 'rgba(239,68,68,0.22)' : urgency === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(245,197,24,0.16)'

  return (
    <div style={{
      background: ubg,
      border: `1px solid ${uborder}`,
      borderRadius: 16,
      padding: '0.85rem 1rem',
      marginBottom: '1rem',
      fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
      animation: 'slide-up 0.3s ease both',
    }}>

      {/* Top row: label + rank */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
        <span style={{ color: uc, fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ◈ MISSION BRIEFING
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.28rem',
          background: rank.bg, border: `1px solid ${rank.color}40`,
          borderRadius: 20, padding: '0.15rem 0.55rem',
        }}>
          <span style={{ fontSize: '0.65rem' }}>{rank.icon}</span>
          <span style={{ color: rank.color, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.07em' }}>{rank.label}</span>
          <span style={{ color: `${rank.color}77`, fontSize: '0.58rem', fontWeight: 600 }}>· {score}</span>
        </div>
      </div>

      {/* Countdown */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', marginBottom: '0.6rem' }}>
        <span style={{
          color: uc,
          fontSize: '1.6rem',
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.03em',
          lineHeight: 1,
          ...(urgency === 'critical' ? { animation: 'danger-pulse 0.9s ease infinite' } : {}),
        }}>
          {fmtCountdown(secs)}
        </span>
        <span style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.63rem', fontWeight: 600 }}>עד סגירת היום</span>
      </div>

      {/* Objectives */}
      {objs.length > 0 ? (
        <div>
          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.54rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            פתוח:
          </div>
          {objs.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.18rem' }}>
              <span style={{ color: uc, fontSize: '0.58rem' }}>▸</span>
              <span style={{ color: 'rgba(241,245,249,0.72)', fontSize: '0.72rem' }}>{o}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}>
          ✓ כל המשימות הושלמו היום — +{score} ציון משמעת
        </div>
      )}

      {/* Missed-day consequence */}
      {missed && (
        <div style={{
          marginTop: '0.55rem',
          padding: '0.38rem 0.65rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8,
          color: '#f87171',
          fontSize: '0.68rem',
          fontWeight: 700,
        }}>
          ⚡ -20 ציון: פספסת אתמול. השלם היום לעצור את הנפילה.
        </div>
      )}
    </div>
  )
}
