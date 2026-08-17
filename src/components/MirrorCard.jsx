import { useState } from 'react'

export default function MirrorCard({ gapDays, message, onRespond }) {
  const [leaving, setLeaving] = useState(false)

  function respond(type) {
    setLeaving(true)
    setTimeout(() => onRespond(type), 300)
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg,rgba(251,146,60,0.08),rgba(239,68,68,0.04))',
      border: '1px solid rgba(251,146,60,0.3)',
      borderRadius: 18,
      padding: '1.1rem 1.15rem',
      marginBottom: '1.1rem',
      opacity: leaving ? 0 : 1,
      transform: leaving ? 'translateY(-6px)' : 'none',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      animation: 'slide-up 0.3s ease both',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '1rem' }}>🪞</span>
        <div>
          <div style={{ color: 'rgba(251,146,60,0.7)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            ◈ MIRROR · {gapDays} ימים ללא התקדמות
          </div>
        </div>
      </div>

      {/* Mirror message */}
      <p style={{
        color: '#f1f5f9',
        fontSize: '0.95rem',
        fontWeight: 600,
        lineHeight: 1.7,
        margin: '0 0 1rem',
        borderRight: '2px solid rgba(251,146,60,0.4)',
        paddingRight: '0.85rem',
        direction: 'rtl',
      }}>
        {message}
      </p>

      {/* Response buttons */}
      <div style={{ display: 'flex', gap: '0.55rem' }}>
        <button
          onClick={() => respond('committed')}
          className="btn-primary btn-tactile"
          style={{ flex: 2, padding: '0.85rem', borderRadius: 12, fontSize: '0.85rem', fontWeight: 800 }}
        >
          כן, חוזר לעצמי ←
        </button>
        <button
          onClick={() => respond('not_now')}
          className="btn-tactile"
          style={{ flex: 1, padding: '0.85rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(241,245,249,0.35)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
        >
          לא עכשיו
        </button>
      </div>
    </div>
  )
}
