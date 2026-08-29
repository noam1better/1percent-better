import { PILLARS, DEFAULT_PILLARS } from '../data/pillars'

export default function GrowthPillarSelector({ selected = DEFAULT_PILLARS, onChange }) {
  function toggle(id) {
    const isOn = selected.includes(id)
    if (isOn) {
      if (selected.length <= 1) return // must keep at least one
      onChange(selected.filter(p => p !== id))
    } else {
      if (selected.length >= 3) return // max 3
      onChange([...selected, id])
    }
  }

  return (
    <div>
      <div style={{ color: '#71717A', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
        התחומים שאני רוצה לחזק
      </div>
      <div style={{ color: '#A4A6AD', fontSize: '0.72rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
        בחר עד שלושה תחומים — ישפיעו על המלצות הרגלים ומשימות.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {PILLARS.map(p => {
          const on = selected.includes(p.id)
          const disabled = !on && selected.length >= 3
          return (
            <button
              key={p.id}
              onClick={() => !disabled && toggle(p.id)}
              className={on ? 'btn-tactile' : ''}
              aria-label={`${p.label}${on ? ' — נבחר' : ''}`}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 20,
                border: `1px solid ${on ? p.color + '60' : 'rgba(255,255,255,0.08)'}`,
                background: on ? p.color + '14' : 'transparent',
                color: on ? p.color : disabled ? 'rgba(255,255,255,0.2)' : '#71717A',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
              {on && <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>✓</span>}
            </button>
          )
        })}
      </div>
      <div style={{ color: '#71717A', fontSize: '0.65rem', marginTop: '0.5rem' }}>
        {selected.length}/3 נבחרו
      </div>
    </div>
  )
}
