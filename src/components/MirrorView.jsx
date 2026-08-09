import { useEffect, useRef, useState } from 'react'

// stat → color (green / amber / red)
function statColor(val) {
  if (val >= 65) return '#10b981'
  if (val >= 40) return '#f59e0b'
  return '#ef4444'
}

// Animated SVG boxing figure — arms/legs/torso colored by stats
function ShadowFigure({ stats, accentColor }) {
  const { strikes, power, timing, stance, cardio } = stats
  const armCol    = statColor(timing)
  const legCol    = statColor(stance)
  const torsoCol  = statColor(power)
  const fistCol   = statColor(strikes)
  const cardioOp  = 0.55 + (cardio / 99) * 0.4

  return (
    <svg
      viewBox="0 0 64 124"
      width="64" height="124"
      style={{ opacity: cardioOp, transition: 'opacity 1s ease', filter: `drop-shadow(0 0 6px ${accentColor}55)` }}
    >
      <style>{`
        @keyframes sway {
          0%,100% { transform: translateX(0) rotate(0deg); }
          30%      { transform: translateX(-2px) rotate(-1.2deg); }
          70%      { transform: translateX(2px)  rotate(1.2deg); }
        }
        @keyframes guard-bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        .figure-root { animation: sway 1.8s ease-in-out infinite; transform-origin: 32px 60px; }
        .guard       { animation: guard-bounce 0.9s ease-in-out infinite; }
      `}</style>

      <g className="figure-root">
        {/* Head */}
        <circle cx="32" cy="12" r="9" fill="none" stroke={accentColor} strokeWidth="2.2" strokeOpacity="0.85" />

        {/* Torso */}
        <line x1="32" y1="21" x2="32" y2="62" stroke={torsoCol} strokeWidth="2.4" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />

        {/* Shoulders */}
        <line x1="14" y1="34" x2="50" y2="34" stroke={torsoCol} strokeWidth="2" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />

        {/* Left arm — guard up */}
        <g className="guard">
          <line x1="14" y1="34" x2="8"  y2="24" stroke={armCol} strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <circle cx="8"  cy="22" r="4" fill={fistCol} fillOpacity="0.8" style={{ transition: 'fill 0.8s ease' }} />
        </g>

        {/* Right arm — guard up */}
        <g className="guard" style={{ animationDelay: '0.45s' }}>
          <line x1="50" y1="34" x2="56" y2="24" stroke={armCol} strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
          <circle cx="56" cy="22" r="4" fill={fistCol} fillOpacity="0.8" style={{ transition: 'fill 0.8s ease' }} />
        </g>

        {/* Left leg */}
        <line x1="32" y1="62" x2="22" y2="90" stroke={legCol} strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
        <line x1="22" y1="90" x2="16" y2="116" stroke={legCol} strokeWidth="2"   strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />

        {/* Right leg (staggered — boxing stance) */}
        <line x1="32" y1="62" x2="42" y2="90" stroke={legCol} strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />
        <line x1="42" y1="90" x2="48" y2="116" stroke={legCol} strokeWidth="2"   strokeLinecap="round" style={{ transition: 'stroke 0.8s ease' }} />

        {/* Feet */}
        <line x1="10" y1="118" x2="22" y2="118" stroke={legCol} strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="118" x2="54" y2="118" stroke={legCol} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function MirrorView({ stats, accentColor, onClose, initialPos, onVideoReady }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const panelRef  = useRef(null)
  const dragState = useRef(null)

  const [pos,      setPos]      = useState(initialPos || { x: 12, y: 80 })
  const [camError, setCamError] = useState(false)
  const [camReady, setCamReady] = useState(false)

  // Start camera
  useEffect(() => {
    let stream = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
      .then(s => {
        stream = s
        const vid = videoRef.current
        if (!vid) return
        vid.muted    = true   // React muted prop unreliable — set directly
        vid.srcObject = s
        vid.addEventListener('playing', () => {
          setCamReady(true)
          onVideoReady?.(vid, canvasRef.current)
        }, { once: true })
        vid.play().catch(() => setCamError(true))
      })
      .catch(() => setCamError(true))

    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Draggable via pointer events
  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = panelRef.current.getBoundingClientRect()
    dragState.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top }
  }

  function onPointerMove(e) {
    if (!dragState.current) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pw = panelRef.current?.offsetWidth  || 180
    const ph = panelRef.current?.offsetHeight || 220
    const nx = Math.max(0, Math.min(vw - pw, e.clientX - dragState.current.startX))
    const ny = Math.max(0, Math.min(vh - ph, e.clientY - dragState.current.startY))
    setPos({ x: nx, y: ny })
  }

  function onPointerUp() { dragState.current = null }

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        zIndex: 6000,
        width: 180,
        background: 'rgba(6,6,14,0.92)',
        border: `1px solid ${accentColor}30`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}18`,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        animation: 'fadeIn 0.22s ease',
      }}
    >
      {/* Drag handle / header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.55rem 0.3rem', background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}18` }}>
        <span style={{ color: accentColor, fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.1em', fontFamily: "'SF Mono','Fira Code',monospace" }}>◈ MIRROR</span>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.4)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.1rem 0.25rem', lineHeight: 1 }}
        >✕</button>
      </div>

      {/* Camera + Shadow side by side */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '0.35rem' }}>

        {/* Live mirror feed */}
        <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {!camReady && !camError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <div className="anim-spin" style={{ width: 16, height: 16, border: `2px solid ${accentColor}30`, borderTopColor: accentColor, borderRadius: '50%' }} />
            </div>
          )}
          {camError && (
            <div style={{ textAlign: 'center', padding: '0.4rem', zIndex: 2, position: 'relative' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>📷</div>
              <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.55rem', lineHeight: 1.4 }}>אין גישה למצלמה</div>
            </div>
          )}
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: 'block',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              transform: 'scaleX(-1)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        </div>

        {/* Animated shadow figure */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShadowFigure stats={stats} accentColor={accentColor} />
        </div>
      </div>

      {/* Stat legend */}
      <div style={{ padding: '0 0.55rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
        {[
          { label: 'תזמון', val: stats.timing },
          { label: 'יציבה', val: stats.stance },
          { label: 'עוצמה', val: stats.power },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.52rem', width: 28, textAlign: 'right', flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${val}%`, background: statColor(val), borderRadius: 99, transition: 'width 1s ease, background 0.8s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
