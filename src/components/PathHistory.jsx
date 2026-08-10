import { useState, useEffect } from 'react'
import { loadArchivedPaths, restorePath } from '../services/pathBuilderService'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PathHistory({ user, onRestore, onClose }) {
  const [archives,    setArchives]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    loadArchivedPaths(user.uid).then(list => {
      setArchives(list)
      setLoading(false)
    })
  }, [user.uid])

  async function handleRestore(archiveId) {
    setRestoringId(archiveId)
    setError(null)
    try {
      const restored = await restorePath(user.uid, archiveId)
      onRestore(restored)
    } catch {
      setError('שחזור נכשל — נסה שוב.')
      setRestoringId(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,0.97)', zIndex: 5100, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.15rem' }}>
            ◈ PRIME
          </div>
          <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem' }}>ארכיון מסלולים</div>
        </div>
        <button
          onClick={onClose}
          className="btn-tactile"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, cursor: 'pointer' }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="anim-spin" style={{ width: 24, height: 24, border: '2px solid rgba(245,197,24,0.15)', borderTopColor: '#F5C518', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        )}

        {!loading && archives.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>אין מסלולים בארכיון</div>
            <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              כשתבנה מסלול חדש, המסלול הקיים ישמר כאן אוטומטית.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '0.75rem 0.9rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.82rem', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {archives.map(archive => {
            const path         = archive.path
            const daysCompleted = archive.progress?.completedDays?.length || 0
            const streak       = archive.consistency?.longest_streak || 0
            const isExpanded   = expandedId === archive.id
            const isRestoring  = restoringId === archive.id

            return (
              <div
                key={archive.id}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', animation: 'slide-up 0.25s ease both' }}
              >
                {/* Card header — clickable to expand */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : archive.id)}
                  style={{ padding: '1rem 1.1rem', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.25rem' }}>
                        הועבר לארכיון · {fmtDate(archive.archivedAt)}
                      </div>
                      <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {path?.path_name || 'מסלול ללא שם'}
                      </div>
                      {path?.tagline && (
                        <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {path.tagline}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.75rem', flexShrink: 0, marginTop: '0.1rem' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.3rem 0.6rem', textAlign: 'center' }}>
                      <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: 800 }}>{daysCompleted}</span>
                      <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', marginRight: '0.25rem' }}> ימים</span>
                    </div>
                    {streak > 0 && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.3rem 0.6rem', textAlign: 'center' }}>
                        <span style={{ color: '#f97316', fontSize: '0.82rem', fontWeight: 800 }}>🔥{streak}</span>
                        <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', marginRight: '0.25rem' }}> שיא רצף</span>
                      </div>
                    )}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.3rem 0.6rem', textAlign: 'center' }}>
                      <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem' }}>התחיל {fmtDate(archive.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded: roadmap preview + restore */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.9rem 1.1rem' }}>
                    {path?.roadmap && path.roadmap.length > 0 && (
                      <div style={{ marginBottom: '0.9rem' }}>
                        <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>
                          מבט ראשון על המסלול
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {path.roadmap.slice(0, 4).map(r => (
                            <div key={r.day} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', padding: '0.3rem 0' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 900, color: 'rgba(245,197,24,0.6)', fontFamily: 'monospace', flexShrink: 0 }}>
                                {r.day}
                              </div>
                              <span style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.75rem', lineHeight: 1.45 }}>{r.task}</span>
                            </div>
                          ))}
                          {path.roadmap.length > 4 && (
                            <div style={{ color: 'rgba(245,197,24,0.3)', fontSize: '0.65rem', marginTop: '0.15rem', fontFamily: "'SF Mono','Fira Code',monospace'" }}>
                              + עוד {path.roadmap.length - 4} ימים...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleRestore(archive.id)}
                      disabled={!!restoringId}
                      className="btn-primary btn-tactile"
                      style={{ width: '100%', padding: '0.9rem', borderRadius: 14, fontSize: '0.88rem', fontWeight: 800, opacity: restoringId && !isRestoring ? 0.4 : 1 }}
                    >
                      {isRestoring ? '⏳ משחזר...' : '↩ שחזר מסלול זה'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
