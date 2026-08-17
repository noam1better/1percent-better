import { useState, useEffect, useRef, useCallback } from 'react'
import { loadPoseLandmarker, analyzeFrame, drawSkeleton } from '../services/poseService'
import { hapticRep, hapticMilestone, hapticGoal } from '../services/hapticService'
import { syncWeeklyReps } from '../services/squadService'
import { analyzeSession, coachConfigured } from '../services/coachService'
import FeedbackModal from './FeedbackModal'
import BoxingWorkout from './BoxingWorkout'

// ── Haversine — great-circle distance between two GPS coords (km) ────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Cardio (timer + GPS distance) ───────────────────────────────────

const CARDIO_KEY = 'prime_cardio_live'

function CardioWorkout({ track, goal, onComplete, onClose: _onClose }) {
  const [elapsed,   setElapsed]   = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CARDIO_KEY))
      if (s?.trackId === track.id && s?.running && s?.startTimestamp) {
        return Math.round((Date.now() - s.startTimestamp) / 1000)
      }
    } catch {}
    return 0
  })
  const [running,   setRunning]   = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CARDIO_KEY))
      return !!(s?.trackId === track.id && s?.running)
    } catch { return false }
  })
  const [finished,  setFinished]  = useState(false)
  const [distance,  setDistance]  = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CARDIO_KEY))
      if (s?.trackId === track.id) { return s?.distance || 0 }
    } catch {}
    return 0
  })
  const [geoStatus, setGeoStatus] = useState('idle')     // idle|requesting|tracking|denied|unavailable
  const [distInput, setDistInput] = useState('')         // manual fallback

  const timerRef     = useRef(null)
  const watchIdRef   = useRef(null)
  const lastPosRef   = useRef(null)
  const distRef      = useRef(distance)
  const startTsRef   = useRef(null)  // timestamp when current run-segment started

  // ── Restore GPS distance ref from initial state ──
  useEffect(() => { distRef.current = distance }, []) // eslint-disable-line

  // ── Persist to localStorage while running ──
  useEffect(() => {
    if (!running || finished) {
      localStorage.removeItem(CARDIO_KEY)
      return
    }
    const ts = Date.now() - elapsed * 1000
    startTsRef.current = ts
    const save = () => {
      try {
        localStorage.setItem(CARDIO_KEY, JSON.stringify({
          trackId: track.id,
          trackName: track.name,
          goal,
          startTimestamp: startTsRef.current,
          distance: distRef.current,
          running: true,
        }))
      } catch {}
    }
    save()
    const id = setInterval(save, 5000)
    return () => clearInterval(id)
  }, [running, finished]) // eslint-disable-line

  // ── Timer ──
  useEffect(() => {
    if (running && !finished) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [running, finished])

  // ── GPS watch — start when running, stop on pause/finish ──
  useEffect(() => {
    if (!running || finished) {
      // Pause: stop watch + clear lastPos so we don't get a phantom distance spike on resume
      if (watchIdRef.current != null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      lastPosRef.current = null
      return
    }

    if (!navigator.geolocation) { setGeoStatus('unavailable'); return }

    setGeoStatus('requesting')
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGeoStatus('tracking')
        const { latitude: lat, longitude: lng } = pos.coords
        if (lastPosRef.current) {
          const delta = haversine(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng)
          // Ignore GPS jitter < 2 m
          if (delta > 0.002) {
            distRef.current += delta
            setDistance(distRef.current)
          }
        }
        lastPosRef.current = { lat, lng }
      },
      err => {
        setGeoStatus(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [running, finished])

  // ── Dynamic tab title while running ──
  useEffect(() => {
    if (!running || finished) { document.title = '1% Better — PRIME'; return }
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    const d = distRef.current > 0 ? ` · ${distRef.current.toFixed(2)}ק"מ` : ''
    document.title = `🏃‍♂️ ${m}:${s}${d} — PRIME`
    return () => { document.title = '1% Better — PRIME' }
  }, [running, finished, elapsed])

  function handleDone() {
    clearInterval(timerRef.current)
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    localStorage.removeItem(CARDIO_KEY)
    setRunning(false)
    setFinished(true)
  }

  const gpsTracked = geoStatus === 'tracking' || (finished && distRef.current > 0)

  function handleSave(skipDistance = false) {
    let dist
    if (!skipDistance) {
      dist = gpsTracked
        ? parseFloat(distRef.current.toFixed(2))
        : distInput !== '' ? parseFloat(distInput) : undefined
    }
    onComplete({ amount: Math.round(elapsed / 60), unit: track.unit, distance: dist })
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  const pct  = Math.min(100, (elapsed / 60 / goal) * 100)

  const ringColor  = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#F5C518'
  const timerColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#F5C518'
  const isSprint   = running && pct >= 80 && pct < 100
  const doneMinutes = Math.round(elapsed / 60)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
      {/* Timer ring — always visible */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(245,197,24,0.1)" strokeWidth="8" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={ringColor} strokeWidth={pct >= 90 ? 10 : 8}
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            color: finished ? '#10b981' : timerColor,
            fontSize: pct >= 90 ? '2.2rem' : '2rem', fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            animation: pct >= 90 && running ? 'danger-pulse 0.8s ease infinite' : 'none',
            transition: 'font-size 0.3s ease, color 0.4s ease',
          }}>{mins}:{secs}</span>
          <span style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.7rem', fontWeight: 700 }}>
            {finished ? 'נרשם' : `יעד: ${goal} דק'`}
          </span>
        </div>
        {isSprint && (
          <div style={{
            position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 20, padding: '0.18rem 0.75rem',
            color: '#f87171', fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.1em', whiteSpace: 'nowrap',
            animation: 'danger-pulse 1s ease infinite',
          }}>FINAL PUSH</div>
        )}
      </div>

      {/* Live distance chip — shown while running or when GPS active */}
      {(running || geoStatus === 'tracking') && !finished && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: geoStatus === 'tracking' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${geoStatus === 'tracking' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20, padding: '0.35rem 0.85rem',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: geoStatus === 'tracking' ? '#10b981' : geoStatus === 'requesting' ? '#f59e0b' : 'rgba(255,255,255,0.3)',
            animation: geoStatus === 'tracking' ? 'cam-pulse 2s ease infinite' : geoStatus === 'requesting' ? 'cam-pulse 1s ease infinite' : 'none',
          }} />
          <span style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
            {distance.toFixed(2)}
          </span>
          <span style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.7rem', fontWeight: 700 }}>ק״מ</span>
          {geoStatus === 'denied' && (
            <span style={{ color: 'rgba(239,68,68,0.6)', fontSize: '0.6rem' }}>GPS חסום</span>
          )}
        </div>
      )}

      {!finished ? (
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={() => setRunning(r => !r)}
            className="btn-tactile"
            style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '1rem', fontWeight: 800, background: running ? 'rgba(239,68,68,0.12)' : 'rgba(245,197,24,0.12)', border: `1px solid ${running ? 'rgba(239,68,68,0.3)' : 'rgba(245,197,24,0.3)'}`, color: running ? '#f87171' : '#F5C518', cursor: 'pointer' }}
          >
            {running ? '⏸ עצור' : '▶ התחל'}
          </button>
          {elapsed > 0 && (
            <button onClick={handleDone} className="btn-primary btn-tactile" style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '0.95rem', fontWeight: 800 }}>
              סיימתי ←
            </button>
          )}
        </div>
      ) : (
        <div style={{ width: '100%', animation: 'fadeIn 0.3s ease' }}>
          {/* Done banner */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>✅</div>
            <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1rem' }}>
              {doneMinutes >= goal ? 'יעד הושג!' : `${doneMinutes} דקות`}
            </div>
          </div>

          {/* Distance summary: auto if GPS worked, manual fallback otherwise */}
          {gpsTracked ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)',
              borderRadius: 14, padding: '0.85rem', marginBottom: '0.85rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <div>
                <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {distRef.current.toFixed(2)} ק״מ
                </div>
                <div style={{ color: 'rgba(16,185,129,0.55)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  נוצר אוטומטי · GPS
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                {geoStatus === 'denied' ? 'GPS חסום — הכנס מרחק ידנית (ק״מ)' : 'מרחק (ק״מ) — אופציונלי'}
              </div>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={distInput}
                onChange={e => setDistInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="0.00"
                className="glow-input"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.85rem', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 900,
                  fontFamily: 'inherit', textAlign: 'center',
                }}
              />
            </div>
          )}

          <button
            onClick={() => handleSave()}
            className="btn-primary btn-tactile"
            style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 900, marginBottom: '0.45rem' }}
          >
            שמור ←
          </button>
          {!gpsTracked && (
            <button
              onClick={() => handleSave(true)}
              className="btn-tactile"
              style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', color: 'rgba(241,245,249,0.22)', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              דלג על מרחק
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Me vs. Future Self widget ─────────────────────────────────────────

const FUTURE_GOAL_KEY = id => `prime_future_goal_${id}`

function FutureVsNowWidget({ reps, sessionGoal, trackId, visionProfile, repFlash }) {
  const defaultFuture = sessionGoal * 3
  const [futureGoal, setFutureGoal] = useState(() => {
    try { return parseInt(localStorage.getItem(FUTURE_GOAL_KEY(trackId))) || defaultFuture }
    catch { return defaultFuture }
  })
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [editVal,  setEditVal]  = useState(String(defaultFuture))

  function commitGoal(val) {
    const n = Math.max(1, parseInt(val) || defaultFuture)
    setFutureGoal(n)
    try { localStorage.setItem(FUTURE_GOAL_KEY(trackId), String(n)) } catch {}
    setEditing(false)
    setEditVal(String(n))
  }

  const pct     = Math.min(100, Math.round((reps / futureGoal) * 100))
  const delta   = Math.max(0, futureGoal - reps)
  const reached = reps >= futureGoal

  // ── Collapsed ──
  if (!expanded) return (
    <button
      onClick={() => setExpanded(true)}
      style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(4,4,10,0.84)',
        borderRadius: 14, padding: '0.5rem 0.8rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(245,197,24,0.22)',
        cursor: 'pointer', textAlign: 'left',
        minWidth: 90,
      }}
    >
      <div key={reps} style={{
        fontSize: '2rem', fontWeight: 900, lineHeight: 1,
        color: repFlash ? '#34d399' : '#F5C518',
        transform: repFlash ? 'scale(1.35)' : 'scale(1)',
        transition: 'transform 0.15s ease, color 0.15s ease',
        animation: reps > 0 && !repFlash ? 'rep-flash 0.28s ease-out' : 'none',
      }}>{reps}</div>
      <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.58rem', fontWeight: 700, marginBottom: '0.3rem' }}>
        / {sessionGoal} · יעד: {futureGoal}
      </div>
      <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: reached ? '#34d399' : '#F5C518', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </button>
  )

  // ── Expanded ──
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, right: 10,
      background: 'rgba(4,4,10,0.93)',
      borderRadius: 16, padding: '0.85rem 1rem',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(245,197,24,0.3)',
      animation: 'fadeIn 0.18s ease',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
          ◈ אני עכשיו vs אני עתידי
        </span>
        <button onClick={() => { setExpanded(false); setEditing(false) }}
          style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.35)', fontSize: '0.82rem', cursor: 'pointer', padding: '0.1rem 0.2rem', lineHeight: 1 }}>
          ✕
        </button>
      </div>

      {/* Two-column comparison */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
        {/* Now */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div key={reps} style={{ color: '#F5C518', fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{reps}</div>
          <div style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.56rem', fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>עכשיו</div>
        </div>

        {/* Arrow + delta */}
        <div style={{ textAlign: 'center', flexShrink: 0, padding: '0 0.2rem' }}>
          <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '1rem', lineHeight: 1 }}>→</div>
          <div style={{
            color: reached ? '#34d399' : '#f87171',
            fontSize: '0.58rem', fontWeight: 900, marginTop: '0.12rem',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {reached ? '✓ הגעת!' : `−${delta}`}
          </div>
        </div>

        {/* Future goal (editable) */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {editing ? (
            <input
              autoFocus
              type="number" inputMode="numeric"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={() => commitGoal(editVal)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitGoal(editVal)
                if (e.key === 'Escape') { setEditing(false); setEditVal(String(futureGoal)) }
              }}
              style={{
                width: '100%', background: 'rgba(245,197,24,0.12)',
                border: '1px solid rgba(245,197,24,0.45)', borderRadius: 8,
                color: '#F5C518', fontSize: '1.7rem', fontWeight: 900,
                textAlign: 'center', fontFamily: 'inherit', padding: '0.1rem 0',
              }}
            />
          ) : (
            <button onClick={() => { setEditing(true); setEditVal(String(futureGoal)) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
              <div style={{ color: reached ? '#34d399' : 'rgba(241,245,249,0.8)', fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{futureGoal}</div>
            </button>
          )}
          <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.56rem', fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            יעד 60 יום
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.22rem' }}>
          <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.48rem', fontWeight: 700 }}>0</span>
          <span style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.5rem', fontWeight: 800 }}>{pct}% מהיעד</span>
          <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.48rem', fontWeight: 700 }}>{futureGoal}</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: reached ? '#34d399' : 'linear-gradient(90deg, rgba(245,197,24,0.7), #F5C518)',
            borderRadius: 99, transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Vision snippet */}
      {visionProfile?.three_year_vision && (
        <div style={{ marginTop: '0.55rem', padding: '0.38rem 0.6rem', background: 'rgba(245,197,24,0.04)', borderRadius: 9, border: '1px solid rgba(245,197,24,0.1)' }}>
          <div style={{ color: 'rgba(245,197,24,0.4)', fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.12rem' }}>◈ החזון שלך</div>
          <div style={{ color: 'rgba(241,245,249,0.42)', fontSize: '0.58rem', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {visionProfile.three_year_vision}
          </div>
        </div>
      )}

      {/* Edit hint */}
      {!editing && (
        <button onClick={() => { setEditing(true); setEditVal(String(futureGoal)) }}
          style={{ display: 'block', margin: '0.4rem auto 0', background: 'none', border: 'none', color: 'rgba(241,245,249,0.18)', fontSize: '0.52rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          ✏ הקש על {futureGoal} לעריכת יעד
        </button>
      )}
    </div>
  )
}

// ── Strength (camera + pose) ────────────────────────────────────────

const HOLD_MS = 120

const SET_LOG_KEY = 'prime_set_log'
function saveSetLog(entry) {
  try {
    const prev = JSON.parse(localStorage.getItem(SET_LOG_KEY) || '[]')
    localStorage.setItem(SET_LOG_KEY, JSON.stringify([entry, ...prev].slice(0, 200)))
  } catch {}
}

function calcSummary(reps, goal, caveInCount) {
  let score = 100
  if (reps > 0) score -= Math.round(Math.min(60, (caveInCount / reps) * 100))
  score = Math.max(0, Math.round(score / 10) * 10)

  const tips = []
  if (caveInCount > 0) tips.push('שמור על ברכיים מעוגנות מעל אצבעות הרגל')
  if (reps < goal)     tips.push(`השלמת ${reps} מתוך ${goal} — נסה שוב בסט הבא`)
  if (caveInCount > 2) tips.push('הורד את הקצב — איכות עדיפה על כמות')

  const headline = score >= 90 ? 'סט מצוין! 🔥'
                 : score >= 70 ? 'עבודה טובה — שים לב לטכניקה'
                 : score >= 50 ? 'בוא נשפר את הטכניקה'
                 :               'האט — אכפת לנו מהצורה'

  return { score, headline, tips }
}

// ── Post-set summary panel ────────────────────────────────────────────
function SetSummaryPanel({ track: _track, reps, goal, score, headline, tips, onSave }) {
  const scoreColor = score >= 90 ? '#34d399' : score >= 70 ? '#F5C518' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      {/* Score circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem 0 1rem' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${scoreColor}12`, marginBottom: '0.75rem' }}>
          <span style={{ color: scoreColor, fontSize: '1.7rem', fontWeight: 900, lineHeight: 1 }}>{score}</span>
          <span style={{ color: `${scoreColor}99`, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ניקוד</span>
        </div>
        <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem', textAlign: 'center' }}>{headline}</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        {[
          { label: 'חזרות', value: reps },
          { label: 'יעד', value: goal },
          { label: '%', value: `${Math.round((reps / goal) * 100)}%` },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.1rem' }}>{s.value}</div>
            <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div style={{ background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.15)', borderRadius: 12, padding: '0.75rem 0.9rem', marginBottom: '1rem' }}>
          <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.5rem' }}>◈ טיפים לסט הבא</div>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: i < tips.length - 1 ? '0.35rem' : 0 }}>
              <span style={{ color: '#F5C518', fontSize: '0.7rem', flexShrink: 0, marginTop: '0.05rem' }}>›</span>
              <span style={{ color: 'rgba(241,245,249,0.7)', fontSize: '0.78rem', lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={onSave} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 900 }}>
        שמור וסגור ←
      </button>
    </div>
  )
}

function StrengthWorkout({ track, goal, uid, userName, visionProfile, onComplete, onClose }) {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const landmarkerRef = useRef(null)
  const streamRef     = useRef(null)
  const rafRef        = useRef(null)
  const poseStateRef  = useRef('up')
  const repsRef       = useRef(0)
  const lastTsRef     = useRef(-1)
  const downSinceRef  = useRef(null)
  const goalHaptedRef = useRef(false)
  const halfHaptedRef = useRef(false)
  const caveInCountRef   = useRef(0)
  const caveInActiveRef  = useRef(false)   // debounce: one event per 2s
  const sessionStartRef  = useRef(null)    // set when camera goes live
  const lastConfRef      = useRef(1)       // latest confidence for AI formScore

  const [phase,       setPhase]       = useState('loading')
  const [reps,        setReps]        = useState(0)
  const [repFlash,    setRepFlash]    = useState(false)
  const [angle,       setAngle]       = useState(null)
  const [poseState,   setPoseState]   = useState('up')
  const [squatDepth,  setSquatDepth]  = useState(0)
  const [confidence,  setConfidence]  = useState(1)
  const [formWarning, setFormWarning] = useState(false)
  const [manualRep,   setManualRep]   = useState('')
  const [summary,     setSummary]     = useState(null)   // { score, headline, tips }
  const [aiFeedback,  setAiFeedback]  = useState(null)   // null | 'loading' | string
  const formWarnTimer = useRef(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    clearTimeout(formWarnTimer.current)
  }, [])

  // Effect 1: acquire camera stream + load landmarker → set phase to 'running'
  // Does NOT touch videoRef — video element doesn't exist yet during 'loading'
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        console.log('Camera Stream Status: Attempting...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        const tracks = stream.getVideoTracks()
        console.log('Camera Stream Status: Success —', tracks.length, 'track(s):', tracks.map(t => `${t.label} [${t.readyState}]`))
        streamRef.current = stream

        const lm = await loadPoseLandmarker()
        if (cancelled) return
        if (!lm) { console.error('[camera] landmarker returned null'); setPhase('manual'); return }
        console.log('[camera] pose landmarker loaded — setting phase to running')
        landmarkerRef.current = lm
        setPhase('running')
      } catch (err) {
        if (cancelled) return
        console.error('Camera Stream Status: Error —', err.name, '—', err.message, err)
        setPhase(err.name === 'NotAllowedError' ? 'error' : 'manual')
      }
    }
    init()
    return () => { cancelled = true; cleanup() }
  }, [cleanup])

  // Effect 2: attach stream to <video> once it's in the DOM (phase === 'running')
  useEffect(() => {
    if (phase !== 'running') return

    const video = videoRef.current
    console.log('[camera] Effect 2 fired — videoRef.current:', video)
    console.log('[camera] streamRef.current:', streamRef.current)

    if (!video) { console.error('[camera] videoRef.current is null — video not in DOM yet'); return }
    if (!streamRef.current) { console.error('[camera] streamRef.current is null — stream was lost'); return }

    // React muted prop is a known bug — set attributes imperatively
    video.muted      = true
    video.playsInline = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('autoplay', '')

    console.log('[camera] video attributes — muted:', video.muted, 'playsInline:', video.playsInline, 'autoplay:', video.hasAttribute('autoplay'))

    video.srcObject = streamRef.current
    sessionStartRef.current = Date.now()
    console.log('[camera] srcObject set, readyState before play():', video.readyState)

    video.load()   // required after setting srcObject in some browsers
    video.play()
      .then(() => console.log('[camera] play() resolved — readyState:', video.readyState, 'videoWidth:', video.videoWidth))
      .catch(err  => console.error('[camera] play() FAILED:', err.name, '—', err.message))
  }, [phase])

  // Pose detection loop
  useEffect(() => {
    if (phase !== 'running') return

    function loop(ts) {
      const video  = videoRef.current
      const canvas = canvasRef.current
      const lm     = landmarkerRef.current
      if (!video || !canvas || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (ts === lastTsRef.current) { rafRef.current = requestAnimationFrame(loop); return }
      lastTsRef.current = ts

      const results = lm.detectForVideo(video, ts)
      const ctx = canvas.getContext('2d')
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (results.landmarks?.length) {
        const landmarks = results.landmarks[0]
        const result    = analyzeFrame(track.poseType, landmarks, poseStateRef.current)

        if (result.angle !== null) {
          const prevState = poseStateRef.current
          const newState  = result.state

          // ── Rep logic ──────────────────────────────────────────────
          let repCompleted = result.repCompleted   // pushups / pullups / dips: from service

          // Always show depth bar + confidence for any camera exercise
          setSquatDepth(result.depth)
          setConfidence(result.confidence)
          lastConfRef.current = result.confidence

          // Squat-specific: hold-timer + knee cave-in
          if (track.poseType === 'squats') {
            if (prevState === 'up' && newState === 'down') {
              downSinceRef.current = ts
            }
            if (prevState === 'down' && newState === 'up') {
              const held = ts - (downSinceRef.current ?? ts)
              repCompleted = held >= HOLD_MS
              downSinceRef.current = null
            }
            if (result.kneeCaveIn && !caveInActiveRef.current) {
              caveInActiveRef.current = true
              caveInCountRef.current += 1
              setFormWarning(true)
              clearTimeout(formWarnTimer.current)
              formWarnTimer.current = setTimeout(() => {
                setFormWarning(false)
                caveInActiveRef.current = false
              }, 2000)
            }
          }

          poseStateRef.current = newState
          setPoseState(newState)
          setAngle(result.angle)

          if (repCompleted) {
            repsRef.current += 1
            const n = repsRef.current
            setReps(n)
            setRepFlash(true)
            setTimeout(() => setRepFlash(false), 380)
            hapticRep()
            const half = Math.floor(goal / 2)
            if (n === half && !halfHaptedRef.current) { halfHaptedRef.current = true; hapticMilestone() }
            if (n >= goal  && !goalHaptedRef.current) { goalHaptedRef.current = true; hapticGoal() }
          }

          drawSkeleton(ctx, landmarks, track.poseType, canvas.width, canvas.height, result.confidence)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, track.poseType, goal])

  function finishSet(finalReps) {
    cleanup()
    const s = calcSummary(finalReps, goal, caveInCountRef.current)
    const today = new Date().toISOString().slice(0, 10)
    saveSetLog({
      id: Date.now(), date: today, timestamp: Date.now(),
      exerciseId: track.id, exerciseName: track.name, exerciseEmoji: track.emoji,
      reps: finalReps, goal, techniqueScore: s.score, caveInCount: caveInCountRef.current,
    })
    if (uid && finalReps > 0) {
      syncWeeklyReps(uid, userName || 'PRIME User', track.id, finalReps).catch(() => {})
    }

    // Sets completed today (including this one)
    let setsToday = 1
    try {
      const log = JSON.parse(localStorage.getItem(SET_LOG_KEY) || '[]')
      setsToday = log.filter(e => e.date === today).length + 1
    } catch {}

    // Persistent rival score — drifts slightly each session for realism
    let rivalScore
    try {
      const stored = parseInt(localStorage.getItem('prime_rival_score') || '0')
      rivalScore = stored || Math.min(97, s.score + 5 + Math.round(Math.random() * 10))
      const next = Math.max(40, Math.min(97, rivalScore + Math.round((Math.random() - 0.38) * 10)))
      localStorage.setItem('prime_rival_score', next)
    } catch { rivalScore = Math.min(97, s.score + 7) }

    setSummary({ ...s, reps: finalReps, setsToday, rivalScore })
    setPhase('summary')

    // Fire AI analysis in background — show FeedbackModal when ready
    if (coachConfigured() && finalReps > 0) {
      setAiFeedback('loading')
      const duration  = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000)
      const formScore = Math.round(lastConfRef.current * 100)
      analyzeSession(track.poseType, { reps: finalReps, duration, formScore })
        .then(msg => setAiFeedback(msg))
        .catch(() => setAiFeedback(null))
    }
  }

  function handleDone() { finishSet(repsRef.current) }
  function handleManualSave() {
    const n = parseInt(manualRep)
    if (!n || n < 0) return
    finishSet(n)
  }

  function retryCamera() {
    cleanup()
    poseStateRef.current   = 'up'
    repsRef.current        = 0
    lastTsRef.current      = -1
    downSinceRef.current   = null
    goalHaptedRef.current  = false
    halfHaptedRef.current  = false
    caveInCountRef.current = 0
    caveInActiveRef.current = false
    setReps(0); setAngle(null); setPoseState('up')
    setSquatDepth(0); setConfidence(1); setFormWarning(false); setSummary(null)
    setPhase('loading')
  }

  // ── Loading ──
  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
      <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.85rem' }}>טוען מצלמה ו-AI…</p>
    </div>
  )

  // ── Error / manual fallback ──
  if (phase === 'error' || phase === 'manual') return (
    <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <FutureVsNowWidget
        reps={0}
        sessionGoal={goal}
        trackId={track.id}
        visionProfile={visionProfile}
        repFlash={false}
      />
      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <p style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          {phase === 'error' ? '⚠️ הרשאת מצלמה נדחתה' : '⚠️ לא ניתן לטעון את המצלמה'}
        </p>
        <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>
          {phase === 'error'
            ? 'אפשר גישה למצלמה בהגדרות הדפדפן ולאחר מכן נסה שוב.'
            : 'ייתכן שהמודל לא נטען. בדוק חיבור לאינטרנט.'}
        </p>
        <button
          onClick={retryCamera}
          className="btn-tactile"
          style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 10, padding: '0.5rem 1rem', color: '#F5C518', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
        >
          🔄 נסה שוב
        </button>
      </div>

      <label style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
        או הכנס ידנית
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number" inputMode="numeric" value={manualRep}
          onChange={e => setManualRep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleManualSave()}
          placeholder={`יעד: ${goal} חזרות`} className="glow-input"
          style={{ flex: 1, padding: '0.75rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit' }}
        />
        <button onClick={handleManualSave} disabled={!manualRep} className="btn-primary btn-tactile"
          style={{ padding: '0.75rem 1.1rem', borderRadius: 11, fontSize: '0.9rem', fontWeight: 800, opacity: manualRep ? 1 : 0.4 }}>
          שמור ←
        </button>
      </div>
    </div>
  )

  // ── Summary ──
  if (phase === 'summary' && summary) return (
    <>
      <SetSummaryPanel
        track={track}
        reps={summary.reps}
        goal={goal}
        score={summary.score}
        headline={summary.headline}
        tips={summary.tips}
        onSave={() => onComplete({ amount: summary.reps, unit: track.unit })}
      />
      {aiFeedback && (
        <FeedbackModal
          exerciseName={track.name}
          reps={summary.reps}
          goal={goal}
          score={summary.score}
          feedback={aiFeedback}
          setsToday={summary.setsToday ?? 1}
          setsGoal={5}
          rivalName="Elon"
          rivalScore={summary.rivalScore ?? 80}
          onClose={() => setAiFeedback(null)}
        />
      )}
    </>
  )

  // ── Live camera ──
  const goalReached   = reps >= goal
  const isSquat       = track.poseType === 'squats'
  const confidenceLow = confidence < 0.7

  const corner = (top, right, bottom, left) => ({
    position: 'absolute', width: 22, height: 22,
    borderColor: confidenceLow ? 'rgba(239,68,68,0.6)' : 'rgba(245,197,24,0.7)',
    borderStyle: 'solid', borderWidth: 0,
    ...(top    != null ? { top:    top    + '%' } : {}),
    ...(right  != null ? { right:  right  + '%' } : {}),
    ...(bottom != null ? { bottom: bottom + '%' } : {}),
    ...(left   != null ? { left:   left   + '%' } : {}),
    borderTopWidth:    top    != null ? 2 : 0,
    borderRightWidth:  right  != null ? 2 : 0,
    borderBottomWidth: bottom != null ? 2 : 0,
    borderLeftWidth:   left   != null ? 2 : 0,
  })

  // Squat depth bar color
  const depthColor = squatDepth >= 0.70 ? '#34d399'
                   : squatDepth >= 0.40 ? '#F5C518'
                   : 'rgba(255,255,255,0.25)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Outer wrapper — position:relative so widget can overlay camera without being clipped */}
      <div style={{ position: 'relative' }}>
        {/* Camera clip div — overflow:hidden only for video corner rounding */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} muted playsInline autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

          {/* Corner brackets — red when confidence low */}
          {!goalReached && (<>
            <div style={corner(8,  null, null, 8)}  />
            <div style={corner(8,  8,    null, null)} />
            <div style={corner(null, null, 8,   8)}  />
            <div style={corner(null, 8,   8,   null)} />
          </>)}

          {/* Squat depth bar — right edge */}
          {isSquat && !goalReached && (
            <div style={{ position: 'absolute', right: 8, top: '12%', bottom: '12%', width: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', bottom: 0, width: '100%',
                height: `${squatDepth * 100}%`,
                background: depthColor,
                borderRadius: 99,
                transition: 'height 0.05s linear, background 0.2s ease',
              }} />
            </div>
          )}

        {/* State / angle badge — top right */}
        {angle !== null && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: poseState === 'down' ? 'rgba(16,185,129,0.82)' : 'rgba(99,102,241,0.82)',
            borderRadius: 10, padding: '0.3rem 0.65rem', backdropFilter: 'blur(6px)',
          }}>
            <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>
              {isSquat
                ? (poseState === 'down' ? '⬇ שוקע' : '⬆ עומד')
                : `${angle}° ${poseState === 'down' ? '▼' : '▲'}`
              }
            </span>
          </div>
        )}

        {/* Form warning — knee cave-in */}
        {formWarning && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'rgba(239,68,68,0.88)', borderRadius: 12, padding: '0.5rem 1rem',
            backdropFilter: 'blur(6px)', animation: 'fadeIn 0.15s ease',
            color: '#fff', fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap',
          }}>
            ⚠️ שים לב לברכיים!
          </div>
        )}

        {/* Low confidence hint */}
        {confidenceLow && !goalReached && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'rgba(239,68,68,0.75)', borderRadius: 10, padding: '0.4rem 0.85rem',
            color: '#fff', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
            animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(4px)',
          }}>
            🔍 זוז לתוך הפריים
          </div>
        )}

        {/* AI pulse — bottom left */}
        {!goalReached && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(5,5,5,0.72)', borderRadius: 20, padding: '0.25rem 0.6rem', backdropFilter: 'blur(6px)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: confidenceLow ? '#ef4444' : '#34d399', animation: 'cam-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ color: confidenceLow ? '#fca5a5' : 'rgba(52,211,153,0.9)', fontSize: '0.6rem', fontWeight: 800, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: '0.06em' }}>
              {confidenceLow ? 'זיהוי חלש' : 'AI פעיל'}
            </span>
          </div>
        )}

        {/* Close camera — bottom right */}
        {!goalReached && (
          <button onClick={() => { cleanup(); onClose() }} className="btn-tactile"
            style={{ position: 'absolute', bottom: 10, right: isSquat ? 22 : 10, background: 'rgba(5,5,5,0.72)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.25rem 0.7rem', backdropFilter: 'blur(6px)', color: 'rgba(241,245,249,0.55)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
            ✕ סגור מצלמה
          </button>
        )}

        {/* Goal banner */}
        {goalReached && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(5,5,5,0.9)', borderRadius: 18, padding: '1.25rem 2rem', textAlign: 'center', border: '2px solid rgba(245,197,24,0.5)' }}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div style={{ color: '#F5C518', fontWeight: 900, fontSize: '1.1rem', marginTop: '0.25rem' }}>יעד הושג!</div>
            </div>
          </div>
        )}
        </div>{/* ← closes inner clip div (overflow:hidden) */}

        {/* Me vs. Future Self widget — outside overflow:hidden, so expanded state never clips */}
        <FutureVsNowWidget
          reps={reps}
          sessionGoal={goal}
          trackId={track.id}
          visionProfile={visionProfile}
          repFlash={repFlash}
        />
      </div>{/* ← closes outer position:relative wrapper */}

      <button onClick={handleDone} className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800 }}>
        {goalReached ? 'סיום אימון ←' : `סיימתי (${reps} חזרות) ←`}
      </button>
    </div>
  )
}

// ── Shell modal ─────────────────────────────────────────────────────

export default function ActiveWorkout({ track, goal, uid, userName, visionProfile, onComplete, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3100 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0e0e16', borderRadius: '20px 20px 0 0', padding: '1.4rem 1.4rem 2.5rem', borderTop: '2px solid rgba(245,197,24,0.3)', animation: 'slide-up 0.28s ease' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>{track.emoji}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.97rem' }}>{track.name}</div>
              <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.7rem', fontWeight: 700 }}>יעד: {goal} {track.unit}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.5)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕</button>
        </div>

        {!track.useCamera
          ? <CardioWorkout   track={track} goal={goal} onComplete={onComplete} onClose={onClose} />
          : track.poseType === 'boxing'
            ? <BoxingWorkout track={track} goal={goal} uid={uid} userName={userName} visionProfile={visionProfile} onComplete={onComplete} onClose={onClose} />
            : <StrengthWorkout track={track} goal={goal} uid={uid} userName={userName} visionProfile={visionProfile} onComplete={onComplete} onClose={onClose} />
        }
      </div>
    </div>
  )
}
