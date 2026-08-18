import { useState } from 'react'
import { getCachedSpark, generateWeeklySpark, invalidateSpark } from '../services/sparkService'
import { getEnergyLog, ENERGY_TAGS } from '../services/energyLogService'

export default function WeeklySpark({ completedDays = 0 }) {
  const [open,    setOpen]    = useState(false)
  const [spark,   setSpark]   = useState(() => getCachedSpark())
  const [loading, setLoading] = useState(false)

  const log = getEnergyLog(7)
  const tagCounts = ENERGY_TAGS
    .map(t => ({ ...t, count: log.filter(e => e.tag === t.id).length }))
    .filter(t => t.count > 0)

  async function load() {
    if (loading) return
    setLoading(true)
    try {
      const s = await generateWeeklySpark(completedDays)
      setSpark(s)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (!spark) load()
  }

  async function handleRefresh() {
    invalidateSpark()
    setSpark(null)
    setLoading(true)
    try {
      const s = await generateWeeklySpark(completedDays)
      setSpark(s)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(245,197,24,0.2)', overflow: 'hidden', background: open ? 'rgba(245,197,24,0.03)' : 'transparent', transition: 'background 0.2s' }}>

      {/* Toggle header */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="btn-tactile"
        style={{ width: '100%', background: 'none', border: 'none', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', textAlign: 'right' }}
      >
        <span style={{ fontSize: '0.95rem' }}>✨</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: 'rgba(245,197,24,0.8)', fontSize: '0.76rem', fontWeight: 800 }}>Weekly Spark</span>
          <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.68rem' }}> · תובנת שבוע</span>
        </div>
        {tagCounts.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {tagCounts.map(t => (
              <span key={t.id} style={{ fontSize: '0.6rem', background: `${t.color}18`, border: `1px solid ${t.color}28`, borderRadius: 99, padding: '0.1rem 0.4rem', color: t.color, fontWeight: 800 }}>
                {t.count}
              </span>
            ))}
          </div>
        )}
        <span style={{ color: 'rgba(241,245,249,0.18)', fontSize: '0.72rem', flexShrink: 0 }}>{open ? '▲' : '▾'}</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 1rem 1rem', animation: 'fadeIn 0.18s ease' }}>

          {/* Energy breakdown */}
          {tagCounts.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              {tagCounts.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: `${t.color}10`, border: `1px solid ${t.color}28`, borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                  <span style={{ color: t.color, fontSize: '0.72rem', fontWeight: 800 }}>{t.label}</span>
                  <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem' }}>×{t.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Spark text */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <div>
                <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.76rem', display: 'block' }}>מנתח את השבוע שלך…</span>
                <span style={{ color: 'rgba(241,245,249,0.15)', fontSize: '0.63rem' }}>עד 30 שניות</span>
              </div>
            </div>
          ) : spark ? (
            <div style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.18)', borderRadius: 12, padding: '0.85rem 1rem' }}>
              <p style={{ color: '#f1f5f9', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.65, margin: '0 0 0.55rem', direction: 'rtl' }}>
                {spark}
              </p>
              <button
                onClick={handleRefresh}
                style={{ background: 'none', border: 'none', color: 'rgba(245,197,24,0.38)', fontSize: '0.64rem', cursor: 'pointer', padding: 0, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: '0.05em' }}
              >
                ↻ רענן
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.28)', fontSize: '0.76rem', padding: '0.5rem 0' }}>
              לוג אנרגיה אחד לפחות יפעיל את ה-Spark
            </div>
          )}
        </div>
      )}
    </div>
  )
}
