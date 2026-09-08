import { useMemo } from 'react'

const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

export default function WeekStrip({ activityLog }) {
  const days = useMemo(() => {
    const log   = new Set(activityLog || [])
    const today = new Date().toISOString().slice(0, 10)
    return Array.from({ length: 7 }, (_, i) => {
      const d   = new Date(Date.now() - (6 - i) * 86400000)
      const key = d.toISOString().slice(0, 10)
      return { key, label: DAY_LABELS[d.getDay()], isToday: key === today, active: log.has(key) }
    })
  }, [activityLog])

  const activeCount = days.filter(d => d.active).length

  return (
    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span style={{ color: '#A4A6AD', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          פעילות שבועית
        </span>
        <span style={{ color: '#71717A', fontSize: '0.68rem', fontWeight: 600 }}>
          {activeCount} מתוך 7 ימים
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.3rem' }}>
        {days.map(d => (
          <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: d.active
                ? 'rgba(63,175,122,0.15)'
                : d.isToday
                  ? 'rgba(217,179,76,0.1)'
                  : 'rgba(255,255,255,0.03)',
              border: d.active
                ? '1.5px solid rgba(63,175,122,0.35)'
                : d.isToday
                  ? '1.5px solid rgba(217,179,76,0.35)'
                  : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem',
              color: d.active ? '#3FAF7A' : d.isToday ? '#D9B34C' : 'transparent',
              fontWeight: 900,
            }}>
              {d.active ? '✓' : d.isToday ? '●' : ''}
            </div>
            <span style={{ fontSize: '0.6rem', color: d.isToday ? '#D9B34C' : '#71717A', fontWeight: d.isToday ? 700 : 500 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
