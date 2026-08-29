const WORKOUT_CATEGORIES = [
  {
    id: 'strength',
    label: 'כוח',
    desc: 'שכיבות, מתח, סקוואטים',
    icon: '💪',
    exercises: [
      { id: 'pushups',  name: 'שכיבות סמיכה', desc: 'כוח פלג גוף עליון', trackId: 'strength-pushups' },
      { id: 'pullups',  name: 'מתח',           desc: 'גב וכתפיים',         trackId: 'strength-pullups' },
      { id: 'squats',   name: 'סקוואטים',      desc: 'כוח פלג גוף תחתון', trackId: 'strength-squats'  },
      { id: 'dips',     name: 'מקבילים',       desc: 'טריצפס וחזה',        trackId: null               },
    ],
  },
  {
    id: 'cardio',
    label: 'קרדיו',
    desc: 'ריצה והליכה',
    icon: '🏃',
    exercises: [
      { id: 'run',  name: 'ריצה',   desc: 'אירובי ומרחק',     trackId: 'cardio-run'  },
      { id: 'walk', name: 'הליכה',  desc: 'סיבולת בסיסית',    trackId: 'cardio-walk' },
    ],
  },
  {
    id: 'combat',
    label: 'לחימה',
    desc: 'בוקסינג ומואי תאי',
    icon: '🥊',
    exercises: [
      { id: 'boxing',   name: 'בוקסינג',   desc: 'מאמן AI בזמן אמת', trackId: 'boxing-muaythai' },
      { id: 'muaythai', name: 'מואי תאי',  desc: 'מאמן AI בזמן אמת', trackId: 'boxing-muaythai' },
    ],
  },
]

export default function WorkoutsScreen({ onStartWorkout, onCombat, onBoxing }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem' }}>
      <h2 style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '1rem', margin: '0 0 1rem' }}>בחר אימון</h2>
      {WORKOUT_CATEGORIES.map(cat => (
        <div key={cat.id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
            <span style={{ color: '#F4F1E8', fontWeight: 800, fontSize: '0.9rem' }}>{cat.label}</span>
            <span style={{ color: '#71717A', fontSize: '0.72rem' }}>— {cat.desc}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {cat.exercises.map(ex => (
              <button
                key={ex.id}
                className="btn-tactile"
                onClick={() => {
                  if (cat.id === 'combat' && ex.id === 'boxing') {
                    onBoxing?.()
                  } else if (cat.id === 'combat') {
                    onCombat?.()
                  } else {
                    onStartWorkout({ id: ex.id, name: ex.name, emoji: cat.icon, desc: ex.desc, trackId: ex.trackId })
                  }
                }}
                style={{
                  background: '#111317', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '0.9rem 0.85rem',
                  textAlign: 'right', cursor: 'pointer',
                }}
                aria-label={`התחל ${ex.name}`}
              >
                <div style={{ color: '#F4F1E8', fontSize: '0.87rem', fontWeight: 800, marginBottom: '0.2rem' }}>{ex.name}</div>
                <div style={{ color: '#71717A', fontSize: '0.7rem' }}>{ex.desc}</div>
                <div style={{ marginTop: '0.5rem', color: 'rgba(232,232,232,0.4)', fontSize: '0.65rem', fontWeight: 700 }}>התחל ←</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
