import { useState, useEffect } from 'react'

const storageKey = id => `prime_benchmarks_${id}`

function loadBenchmarks(id) {
  try { return JSON.parse(localStorage.getItem(storageKey(id))) || [] } catch { return [] }
}
function saveBenchmarks(id, list) {
  try { localStorage.setItem(storageKey(id), JSON.stringify(list)) } catch {}
}

// ── Add / Edit modal ────────────────────────────────────────────────

function BenchmarkModal({ existing, color, onSave, onDelete, onClose }) {
  const isEdit = !!existing
  const [label,   setLabel]   = useState(existing?.label   || '')
  const [unit,    setUnit]    = useState(existing?.unit     || 'חזרות')
  const [current, setCurrent] = useState(existing?.current != null ? String(existing.current) : '')
  const [target,  setTarget]  = useState(existing?.target  != null ? String(existing.target)  : '')

  const canSave = label.trim() && current.trim() && target.trim()
    && !isNaN(Number(current)) && !isNaN(Number(target))
    && Number(target) > 0

  const UNIT_PRESETS = ['חזרות', 'ק"מ', 'ק"ג', 'שניות', 'דקות', 'שניות/ק"מ']

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.9rem',
    borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
    fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    display: 'block', color: 'rgba(241,245,249,0.38)', fontSize: '0.62rem',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em',
    marginBottom: '0.4rem',
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,12,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 6000, animation: 'fadeIn 0.18s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 540, background: '#0e0e16', borderRadius: '22px 22px 0 0', borderTop: `2px solid ${color}44`, padding: '1.5rem 1.4rem 2.6rem', animation: 'slide-up 0.26s ease', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <div>
            <div style={{ color: `${color}99`, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.2rem' }}>
              📊 {isEdit ? 'עריכת מדד' : 'מדד חדש'}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem' }}>
              {isEdit ? existing.label : 'הגדר מדד ביצועים'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(241,245,249,0.5)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, fontSize: '0.88rem', fontWeight: 700 }}
          >✕</button>
        </div>

        {/* Label */}
        <label style={labelStyle}>שם המדד</label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="לדוגמה: שכיבות סמיכה, ריצת 1 ק״מ..."
          className="glow-input"
          style={{ ...inputStyle, marginBottom: '1.1rem', direction: 'rtl' }}
        />

        {/* Unit */}
        <label style={labelStyle}>יחידה</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          {UNIT_PRESETS.map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className="btn-tactile"
              style={{ background: unit === u ? `${color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${unit === u ? color + '55' : 'rgba(255,255,255,0.09)'}`, borderRadius: 20, color: unit === u ? color : 'rgba(241,245,249,0.45)', fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.75rem', cursor: 'pointer', minHeight: 36 }}
            >{u}</button>
          ))}
          <input
            value={UNIT_PRESETS.includes(unit) ? '' : unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="אחר..."
            className="glow-input"
            style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 80, fontSize: '0.8rem', padding: '0.35rem 0.7rem', marginBottom: 0 }}
          />
        </div>

        {/* Current + Target side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.4rem', marginTop: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{isEdit ? 'ביצוע נוכחי' : 'בסיס — עכשיו'}</label>
            <input
              type="number"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="5"
              className="glow-input"
              style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, padding: '0.65rem' }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, color: `${color}99` }}>יעד — בעוד 30 יום</label>
            <input
              type="number"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="10"
              className="glow-input"
              style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, padding: '0.65rem', border: `1px solid ${color}30`, background: `${color}08` }}
            />
          </div>
        </div>

        <button
          onClick={() => canSave && onSave({ label: label.trim(), unit: unit.trim() || 'חזרות', current: Number(current), target: Number(target) })}
          disabled={!canSave}
          className="btn-primary btn-tactile"
          style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.95rem', fontWeight: 900, opacity: canSave ? 1 : 0.35, cursor: canSave ? 'pointer' : 'not-allowed', marginBottom: isEdit ? '0.6rem' : 0 }}
        >
          {isEdit ? 'עדכן מדד ←' : 'הוסף מדד ←'}
        </button>

        {isEdit && (
          <button
            onClick={onDelete}
            className="btn-tactile"
            style={{ width: '100%', padding: '0.75rem', borderRadius: 12, background: 'none', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(248,113,113,0.55)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            מחק מדד
          </button>
        )}
      </div>
    </div>
  )
}

// ── Update-current inline panel ─────────────────────────────────────

function UpdatePanel({ benchmark, color, onSave, onClose }) {
  const [val, setVal] = useState(String(benchmark.current))
  const num = Number(val)
  const canSave = val.trim() && !isNaN(num) && num > 0

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: 14, padding: '0.85rem 1rem', marginTop: '0.5rem', animation: 'fadeIn 0.18s ease' }}>
      <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.55rem' }}>
        מה הביצוע שלך היום?
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="glow-input"
          style={{ flex: 1, padding: '0.65rem 0.9rem', borderRadius: 10, border: `1px solid ${color}40`, background: `${color}08`, color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
        />
        <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem' }}>{benchmark.unit}</span>
        <button
          onClick={() => canSave && onSave(num)}
          disabled={!canSave}
          className="btn-tactile"
          style={{ background: canSave ? `linear-gradient(135deg,${color}cc,${color})` : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: canSave ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '0.88rem', fontWeight: 800, padding: '0.65rem 1.1rem', cursor: canSave ? 'pointer' : 'not-allowed' }}
        >שמור</button>
        <button
          onClick={onClose}
          className="btn-tactile"
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem', fontWeight: 600, padding: '0.65rem 0.75rem', cursor: 'pointer' }}
        >ביטול</button>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────

export default function BenchmarkTracker({ challengeId, color }) {
  const [benchmarks, setBenchmarks] = useState(() => loadBenchmarks(challengeId))
  const [showAdd,    setShowAdd]    = useState(false)
  const [editing,    setEditing]    = useState(null)  // benchmark object
  const [updating,   setUpdating]   = useState(null)  // benchmark id
  const [collapsed,  setCollapsed]  = useState(benchmarks.length === 0)

  useEffect(() => {
    saveBenchmarks(challengeId, benchmarks)
  }, [benchmarks, challengeId])

  function handleAdd(data) {
    setBenchmarks(prev => [...prev, { id: `b${Date.now()}`, ...data, baseline: data.current, createdAt: new Date().toISOString() }])
    setShowAdd(false)
    setCollapsed(false)
  }

  function handleEdit(data) {
    setBenchmarks(prev => prev.map(b => b.id === editing.id
      ? { ...b, label: data.label, unit: data.unit, current: data.current, target: data.target, updatedAt: new Date().toISOString() }
      : b
    ))
    setEditing(null)
  }

  function handleUpdateCurrent(id, value) {
    setBenchmarks(prev => prev.map(b => b.id === id
      ? { ...b, current: value, updatedAt: new Date().toISOString() }
      : b
    ))
    setUpdating(null)
  }

  function handleDelete() {
    setBenchmarks(prev => prev.filter(b => b.id !== editing.id))
    setEditing(null)
  }

  return (
    <>
      {/* ── Section header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.5rem 0', marginBottom: collapsed ? 0 : '0.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            📊 ביצועים אישיים
          </span>
          {benchmarks.length > 0 && (
            <span style={{ background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 20, padding: '0.08rem 0.45rem', color: color, fontSize: '0.58rem', fontWeight: 800 }}>
              {benchmarks.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!collapsed && (
            <button
              onClick={e => { e.stopPropagation(); setShowAdd(true) }}
              className="btn-tactile"
              style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, color: color, fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', cursor: 'pointer', minHeight: 28 }}
            >+ הוסף</button>
          )}
          <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.65rem' }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ── Empty state ── */}
          {benchmarks.length === 0 ? (
            <div
              onClick={() => setShowAdd(true)}
              style={{ border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.35rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem' }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>📊</div>
              <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>עקוב אחרי הקפיצות שלך</div>
              <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.75rem', lineHeight: 1.55, marginBottom: '0.85rem' }}>
                הגדר מדד ביצועים — כמה שכיבות עכשיו, כמה ביעד.
              </div>
              <span style={{ background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 20, color: color, fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem 1rem' }}>
                + הגדר מדד ראשון ←
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {benchmarks.map(b => {
                const pct  = Math.min(100, b.target > b.baseline ? Math.round(((b.current - b.baseline) / (b.target - b.baseline)) * 100) : (b.current >= b.target ? 100 : 0))
                const gain = b.current - b.baseline
                const isUpdating = updating === b.id

                return (
                  <div key={b.id}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '0.85rem 1rem' }}>
                      {/* Row: label + edit */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 800 }}>{b.label}</span>
                          <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.7rem' }}>{b.unit}</span>
                        </div>
                        <button
                          onClick={() => setEditing(b)}
                          className="btn-tactile"
                          style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.25)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.15rem 0.35rem', minHeight: 32, minWidth: 32 }}
                        >✎</button>
                      </div>

                      {/* Numbers: baseline ── current ── target */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '0.3rem', marginBottom: '0.6rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.18rem' }}>בסיס</div>
                          <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{b.baseline}</div>
                        </div>

                        <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.7rem' }}>→</div>

                        <div
                          style={{ textAlign: 'center', cursor: 'pointer' }}
                          onClick={() => setUpdating(isUpdating ? null : b.id)}
                        >
                          <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.18rem' }}>עכשיו</div>
                          <div style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{b.current}</div>
                          {gain > 0 && (
                            <div style={{ color: '#10b981', fontSize: '0.6rem', fontWeight: 700, marginTop: '0.1rem' }}>+{gain}</div>
                          )}
                        </div>

                        <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.7rem' }}>→</div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: `${color}88`, fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.18rem' }}>יעד</div>
                          <div style={{ color: color, fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{b.target}</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ direction: 'ltr' }}>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(pct, 3)}%`, background: pct >= 100 ? '#10b981' : `linear-gradient(90deg,${color}80,${color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.58rem' }}>
                            {pct >= 100 ? '🏆 יעד הושג' : `${pct}% מהיעד`}
                          </span>
                          <span
                            onClick={() => setUpdating(isUpdating ? null : b.id)}
                            style={{ color: `${color}88`, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            עדכן ←
                          </span>
                        </div>
                      </div>
                    </div>

                    {isUpdating && (
                      <UpdatePanel
                        benchmark={b}
                        color={color}
                        onSave={val => handleUpdateCurrent(b.id, val)}
                        onClose={() => setUpdating(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <BenchmarkModal
          color={color}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <BenchmarkModal
          existing={editing}
          color={color}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
