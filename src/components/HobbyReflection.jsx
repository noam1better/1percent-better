import { useState } from 'react'
import { getHobbyDay } from '../data/hobbyDiscovery'

const RESPONSES = [
  { id: 'loved', label: 'רוצה להמשיך!', emoji: '🔥', color: '#10b981' },
  { id: 'ok',    label: 'היה נחמד',     emoji: '👍', color: '#D9B34C' },
  { id: 'nope',  label: 'לא בשבילי',   emoji: '👋', color: '#71717A' },
]

export default function HobbyReflection({ dayNum, onSave, onClose }) {
  const hobbyDay = getHobbyDay(dayNum)
  const [picked, setPicked]   = useState(null)
  const [note, setNote]       = useState('')
  const [showNote, setShowNote] = useState(false)

  function handleSave() {
    if (!picked) return
    onSave({ day: dayNum, response: picked, note: note.trim() || null })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#161622', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'slide-up 0.22s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
          <div>
            <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
              {hobbyDay?.emoji} יום {dayNum} — {hobbyDay?.hobbyLabel}
            </div>
            <div style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1rem' }}>איך היה?</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>✕</button>
        </div>

        {/* Response options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {RESPONSES.map(r => (
            <button
              key={r.id}
              onClick={() => setPicked(r.id)}
              className={picked === r.id ? 'btn-tactile' : ''}
              style={{
                padding: '0.9rem 1rem',
                borderRadius: 12,
                border: `1px solid ${picked === r.id ? r.color + '50' : 'rgba(255,255,255,0.07)'}`,
                background: picked === r.id ? r.color + '12' : 'transparent',
                color: picked === r.id ? r.color : '#A4A6AD',
                fontSize: '0.92rem', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.65rem', textAlign: 'right',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Optional note */}
        {!showNote ? (
          <button
            onClick={() => setShowNote(true)}
            style={{ background: 'none', border: 'none', color: '#71717A', fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem 0', marginBottom: '0.75rem' }}
          >
            + הוסף הערה קצרה (לעצמך בלבד)
          </button>
        ) : (
          <textarea
            autoFocus
            placeholder="מה אהבת או לא אהבת?"
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 280))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.85rem', resize: 'none', height: 68, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.75rem' }}
          />
        )}

        <button
          onClick={handleSave}
          disabled={!picked}
          className={picked ? 'btn-tactile' : ''}
          style={{ width: '100%', padding: '0.95rem', borderRadius: 12, border: 'none', background: picked ? 'linear-gradient(135deg,#c49020,#d4a843)' : 'rgba(255,255,255,0.06)', color: picked ? '#111' : 'rgba(255,255,255,0.25)', fontSize: '0.9rem', fontWeight: 900, cursor: picked ? 'pointer' : 'not-allowed' }}
        >
          שמור ←
        </button>
      </div>
    </div>
  )
}
