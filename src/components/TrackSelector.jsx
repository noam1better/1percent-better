import { useState, useCallback } from 'react'
import { TRAINING_TRACKS, TRACK_MAP } from '../data/trainingTracks'
import ActiveWorkout from './ActiveWorkout'
import { applyWin, applyStreakBonus, completeRedemption } from '../services/disciplineScore'

const STORAGE_KEY = 'prime_training_state'
const TODAY = () => new Date().toISOString().slice(0, 10)

function defaultState() {
  return {
    activeTrackId: null,
    tracks: {},
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState()
  } catch { return defaultState() }
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function calcStreak(history = []) {
  const done = [...history].filter(h => h.completed).sort((a, b) => b.date.localeCompare(a.date))
  if (!done.length) return 0
  const today = TODAY()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let expected = done[0]?.date === today ? today : yesterday
  let streak = 0
  for (const e of done) {
    if (e.date === expected) {
      streak++
      const d = new Date(expected); d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else break
  }
  return streak
}

function getGoal(trackState, track) {
  return trackState?.goalAmount ?? track.startGoal
}

const MAX_TRACKS = 2

export default function TrackSelector({ uid, userName, visionProfile }) {
  const [state,         setState]  = useState(loadState)
  const [activeWorkout, setWorkout] = useState(null)   // { track, goal }
  const [expanded,      setExpanded] = useState(false)
  const [toast,         setToast]  = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const update = useCallback(patch => {
    setState(prev => {
      const next = { ...prev, ...patch }
      saveState(next)
      return next
    })
  }, [])

  // enrolledTrackIds: up to MAX_TRACKS tracks the user is actively working on
  const enrolled = state.enrolledTrackIds || (state.activeTrackId ? [state.activeTrackId] : [])

  function selectTrack(trackId) {
    if (enrolled.includes(trackId)) {
      // already enrolled — just switch active view
      update({ activeTrackId: trackId, enrolledTrackIds: enrolled })
    } else if (enrolled.length < MAX_TRACKS) {
      const next = [...enrolled, trackId]
      update({ activeTrackId: trackId, enrolledTrackIds: next })
    } else {
      showToast(`מקסימום ${MAX_TRACKS} מסלולים פעילים — הסר אחד קודם`)
    }
  }

  function removeTrack(trackId) {
    const next = enrolled.filter(id => id !== trackId)
    update({
      enrolledTrackIds: next,
      activeTrackId: next.includes(state.activeTrackId) ? state.activeTrackId : (next[0] || null),
    })
  }

  function startWorkout() {
    if (!state.activeTrackId) return
    const track = TRACK_MAP[state.activeTrackId]
    const ts    = state.tracks[state.activeTrackId]
    const goal  = getGoal(ts, track)
    setWorkout({ track, goal })
  }

  function handleWorkoutComplete({ amount, unit: _unit, distance }) {
    const track     = TRACK_MAP[state.activeTrackId]
    const ts        = state.tracks[state.activeTrackId] || { goalAmount: track.startGoal, history: [] }
    const today     = TODAY()
    const completed = amount >= ts.goalAmount

    const entry = { date: today, completed, amount, ...(distance != null ? { distance } : {}) }
    const newHistory = [
      entry,
      ...(ts.history || []).filter(h => h.date !== today),
    ].slice(0, 60)

    const newStreak = calcStreak(newHistory)
    if (completed) {
      applyWin()
      if (newStreak > 0 && newStreak % track.levelUpDays === 0) applyStreakBonus()
      completeRedemption()
    }
    const shouldLevelUp = completed && newStreak > 0 && newStreak % track.levelUpDays === 0

    const newGoal = shouldLevelUp
      ? (ts.goalAmount ?? track.startGoal) + track.increment
      : (ts.goalAmount ?? track.startGoal)

    const newTrackState = {
      goalAmount: newGoal,
      history:    newHistory,
      leveledUpAt: shouldLevelUp ? today : ts.leveledUpAt,
    }

    update({
      tracks: { ...state.tracks, [state.activeTrackId]: newTrackState },
    })
    setWorkout(null)
  }

  const activeTrack  = state.activeTrackId ? TRACK_MAP[state.activeTrackId] : null
  const activeTs     = activeTrack ? state.tracks[state.activeTrackId] : null
  const activeGoal   = activeTrack ? getGoal(activeTs, activeTrack) : null
  const activeStreak = activeTs ? calcStreak(activeTs.history) : 0
  const todayEntry   = activeTs?.history?.find(h => h.date === TODAY())
  const todayDone    = todayEntry?.completed

  const categories = ['cardio', 'strength']
  const catLabel   = { cardio: '❤️ קרדיו', strength: '💪 כוח' }

  return (
    <>
      <div style={{
        background:   'rgba(245,197,24,0.04)',
        border:       `1px solid ${todayDone ? 'rgba(16,185,129,0.28)' : 'rgba(245,197,24,0.18)'}`,
        borderRadius: 18,
        padding:      '1.1rem 1.15rem',
        marginBottom: '1.1rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '1rem' }}>🏋️</span>
            <div>
              <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>מסלול אימון</div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.92rem' }}>
                {activeTrack ? `${activeTrack.emoji} ${activeTrack.name}` : 'בחר מסלול'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {activeStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 20, padding: '0.2rem 0.55rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🔥</span>
                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.75rem' }}>{activeStreak}</span>
              </div>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="btn-tactile"
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(241,245,249,0.35)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Track picker */}
        {expanded && (
          <div style={{ marginBottom: '0.85rem', animation: 'fadeIn 0.2s ease' }}>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: '0.6rem' }}>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {catLabel[cat]}
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {TRAINING_TRACKS.filter(t => t.category === cat).map(track => {
                    const ts         = state.tracks[track.id]
                    const goal       = getGoal(ts, track)
                    const streak     = ts ? calcStreak(ts.history) : 0
                    const isEnrolled = enrolled.includes(track.id)
                    const isActive   = state.activeTrackId === track.id
                    return (
                      <div key={track.id} style={{ position: 'relative' }}>
                        <button
                          onClick={() => { selectTrack(track.id); setExpanded(false) }}
                          className="btn-tactile"
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            padding: '0.55rem 0.75rem', borderRadius: 11, cursor: 'pointer',
                            background: isEnrolled ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? 'rgba(245,197,24,0.55)' : isEnrolled ? 'rgba(245,197,24,0.28)' : 'rgba(255,255,255,0.08)'}`,
                            minWidth: 100,
                            paddingTop: isEnrolled ? '0.75rem' : '0.55rem',
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{track.emoji}</span>
                          <span style={{ color: isActive ? '#F5C518' : isEnrolled ? 'rgba(245,197,24,0.8)' : '#f1f5f9', fontSize: '0.78rem', fontWeight: 800 }}>{track.name}</span>
                          <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.65rem' }}>
                            {goal} {track.unit}{streak > 0 ? ` · 🔥${streak}` : ''}
                          </span>
                        </button>
                        {isEnrolled && (
                          <button
                            onClick={e => { e.stopPropagation(); removeTrack(track.id) }}
                            style={{
                              position: 'absolute', top: 4, right: 4,
                              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 5,
                              color: 'rgba(241,245,249,0.45)', fontSize: '0.6rem', lineHeight: 1,
                              padding: '1px 4px', cursor: 'pointer',
                            }}
                          >✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active track info + CTA */}
        {activeTrack && (
          <div>
            {/* Today's status */}
            {todayEntry && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem',
                borderRadius: 10, marginBottom: '0.75rem',
                background: todayDone ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${todayDone ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.18)'}`,
              }}>
                <span>{todayDone ? '✅' : todayEntry.amount > 0 ? '⚡' : '🎯'}</span>
                <span style={{ color: todayDone ? '#34d399' : todayEntry.amount > 0 ? '#fbbf24' : '#a5b4fc', fontSize: '0.8rem', fontWeight: 700 }}>
                  {todayDone
                    ? `הושלם — ${todayEntry.amount} ${activeTrack.unit}`
                    : todayEntry.amount > 0
                      ? `${todayEntry.amount} ${activeTrack.unit} — קרוב! מחר תשלים`
                      : `יעד: ${activeGoal} ${activeTrack.unit} — בוא נעשה זאת!`
                  }
                </span>
              </div>
            )}

            {/* Goal + progress row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.75rem' }}>
                יעד היום: <strong style={{ color: '#F5C518' }}>{activeGoal} {activeTrack.unit}</strong>
              </div>
              {activeStreak > 0 && (
                <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.68rem' }}>
                  שדרוג בעוד {activeTrack.levelUpDays - (activeStreak % activeTrack.levelUpDays)} ימים
                </div>
              )}
            </div>

            <button
              onClick={startWorkout}
              className="btn-primary btn-tactile"
              style={{ width: '100%', padding: '1.4rem', borderRadius: 16, fontSize: '1.05rem', fontWeight: 900 }}
            >
              {activeTrack.useCamera ? '📸 התחל אימון עם מצלמה ←' : '▶ התחל אימון ←'}
            </button>
          </div>
        )}
      </div>

      {/* Active workout modal */}
      {activeWorkout && (
        <ActiveWorkout
          track={activeWorkout.track}
          goal={activeWorkout.goal}
          uid={uid}
          userName={userName}
          visionProfile={visionProfile}
          onComplete={handleWorkoutComplete}
          onClose={() => setWorkout(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(245,197,24,0.35)',
          borderRadius: 12, padding: '0.65rem 1.1rem', zIndex: 4000,
          color: '#F5C518', fontSize: '0.82rem', fontWeight: 700,
          animation: 'fadeIn 0.2s ease', whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
