import { useState, useEffect } from 'react'
import { checkContractStatus } from '../services/disciplineScore'

function getRedemptionTask() {
  // Return the most specific thing the user needs to do
  try {
    const ts = JSON.parse(localStorage.getItem('prime_training_state'))
    const enrolled = ts?.enrolledTrackIds || []
    if (enrolled.length) {
      const id = enrolled[0]
      const track = ts?.tracks?.[id]
      const goal = track?.goalAmount
      const unit = id.includes('cardio') ? 'דקות' : 'חזרות'
      const name = id.replace('cardio-', '').replace('strength-', '')
      if (goal) return `${goal} ${unit} ${name}`
    }
  } catch {}
  try {
    const ds = JSON.parse(localStorage.getItem('prime_discipline_state'))
    if (ds?.goalMinutes) return `${ds.goalMinutes} דקות ${ds.activity}`
  } catch {}
  return 'המטרה היומית שלך'
}

export default function ContractLock({ onRedeemed }) {
  const [status, setStatus] = useState(null)  // null | { locked, lockedSince }

  useEffect(() => {
    const s = checkContractStatus()
    setStatus(s)

    function handleRedeemed() {
      setStatus({ locked: false })
      onRedeemed?.()
    }
    window.addEventListener('prime:redeemed', handleRedeemed)
    return () => window.removeEventListener('prime:redeemed', handleRedeemed)
  }, [onRedeemed])

  if (!status?.locked) return null

  const task = getRedemptionTask()

  return (
    <div style={{
      background: 'rgba(239,68,68,0.07)',
      border: '1px solid rgba(239,68,68,0.35)',
      borderLeft: '3px solid #ef4444',
      borderRadius: 14,
      padding: '0.9rem 1rem',
      marginBottom: '1rem',
      animation: 'slide-up 0.3s ease both',
      fontFamily: "'SF Mono','Fira Code',monospace",
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem' }}>
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <span style={{ color: '#ef4444', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          DISCIPLINE CONTRACT — BREACHED
        </span>
      </div>

      {/* Explanation */}
      <p style={{ color: 'rgba(241,245,249,0.75)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 0.65rem', fontFamily: 'inherit' }}>
        פספסת שני ימים ברצף. ספריית האימונים נעולה.
      </p>

      {/* Redemption task */}
      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10,
        padding: '0.6rem 0.8rem',
        display: 'flex', alignItems: 'center', gap: '0.55rem',
      }}>
        <span style={{ color: '#f87171', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>▸ גאולה:</span>
        <span style={{ color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700 }}>
          השלם {task} כדי לשחרר
        </span>
      </div>

      {status.lockedSince && (
        <div style={{ marginTop: '0.5rem', color: 'rgba(239,68,68,0.45)', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.06em' }}>
          LOCKED SINCE {status.lockedSince}
        </div>
      )}
    </div>
  )
}
