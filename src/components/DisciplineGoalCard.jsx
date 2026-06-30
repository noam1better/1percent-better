import { useState, useCallback } from 'react'
import { getDisciplineCoachMessage } from '../services/coachService'
import { applyWin, applyStreakBonus, completeRedemption } from '../services/disciplineScore'

const STORAGE_KEY = 'prime_discipline_state'
const TODAY = () => new Date().toISOString().slice(0, 10)

function defaultState() {
  return { goalMinutes: 15, activity: 'הליכה', history: [] }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState()
  } catch {
    return defaultState()
  }
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function calcStreak(history) {
  const completed = [...history]
    .filter(h => h.completed)
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!completed.length) return 0

  const today = TODAY()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let expected = completed[0]?.date === today ? today : yesterday
  let streak   = 0

  for (const entry of completed) {
    if (entry.date === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }
  return streak
}

export default function DisciplineGoalCard() {
  const [state,    setState]    = useState(loadState)
  const [input,    setInput]    = useState('')
  const [phase,    setPhase]    = useState('idle') // idle | loading | done
  const [aiMsg,    setAiMsg]    = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editMin,  setEditMin]  = useState('')
  const [editAct,  setEditAct]  = useState('')

  const today      = TODAY()
  const todayEntry = state.history.find(h => h.date === today)
  const streak     = calcStreak(state.history)
  const canLevelUp = streak > 0 && streak % 3 === 0 && !todayEntry?.leveledUp

  const update = useCallback(patch => {
    setState(prev => {
      const next = { ...prev, ...patch }
      saveState(next)
      return next
    })
  }, [])

  async function handleCheckIn() {
    const minutes = parseInt(input)
    if (!minutes || minutes < 0) return
    const completed = minutes >= state.goalMinutes

    const newHistory = [
      { date: today, completed, minutesDone: minutes },
      ...state.history.filter(h => h.date !== today),
    ].slice(0, 30)

    update({ history: newHistory })
    setPhase('loading')

    const newStreak = calcStreak(newHistory)
    if (completed) {
      applyWin()
      if (newStreak > 0 && newStreak % 3 === 0) applyStreakBonus()
      completeRedemption()
    }
    const msg = await getDisciplineCoachMessage({
      goalMinutes:  state.goalMinutes,
      activity:     state.activity,
      streak:       newStreak,
      completed,
      minutesDone:  minutes,
      history:      newHistory,
    })
    setAiMsg(msg)
    setPhase('done')
  }

  function handleLevelUp() {
    const newGoal = state.goalMinutes + 5
    const newHistory = state.history.map(h =>
      h.date === today ? { ...h, leveledUp: true } : h
    )
    update({ goalMinutes: newGoal, history: newHistory })
  }

  function saveEdit() {
    const min = parseInt(editMin)
    if (min > 0) update({ goalMinutes: min })
    if (editAct.trim()) update({ activity: editAct.trim() })
    setShowEdit(false)
    setEditMin('')
    setEditAct('')
  }

  const todayDone    = todayEntry?.completed
  const todayMissed  = todayEntry && !todayEntry.completed

  return (
    <div style={{
      background:    'rgba(99,102,241,0.06)',
      border:        `1px solid ${todayDone ? 'rgba(16,185,129,0.28)' : todayMissed ? 'rgba(239,68,68,0.22)' : 'rgba(99,102,241,0.22)'}`,
      borderRadius:  18,
      padding:       '1.1rem 1.15rem',
      marginBottom:  '1.1rem',
      animation:     'slide-up 0.3s ease both',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '1rem' }}>🎯</span>
          <div>
            <div style={{ color: 'rgba(165,180,252,0.6)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>מטרת משמעת יומית</div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.92rem' }}>
              {state.goalMinutes} דקות {state.activity}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 20, padding: '0.2rem 0.55rem' }}>
              <span style={{ fontSize: '0.85rem' }}>🔥</span>
              <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.75rem' }}>{streak}</span>
            </div>
          )}
          <button
            onClick={() => { setShowEdit(v => !v); setEditMin(String(state.goalMinutes)); setEditAct(state.activity) }}
            className="btn-tactile"
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(241,245,249,0.3)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              value={editMin}
              onChange={e => setEditMin(e.target.value)}
              placeholder="דקות"
              className="glow-input"
              style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.85rem', fontFamily: 'inherit' }}
            />
            <input
              type="text"
              value={editAct}
              onChange={e => setEditAct(e.target.value)}
              placeholder="פעילות (הליכה, ריצה…)"
              className="glow-input"
              style={{ flex: 2, padding: '0.55rem 0.75rem', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.85rem', fontFamily: 'inherit' }}
            />
          </div>
          <button onClick={saveEdit} className="btn-primary btn-tactile" style={{ padding: '0.5rem', borderRadius: 9, fontSize: '0.8rem', fontWeight: 800 }}>
            שמור ←
          </button>
        </div>
      )}

      {/* Already logged */}
      {todayEntry && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.75rem', borderRadius: 10, marginBottom: phase === 'done' || aiMsg ? '0.75rem' : 0,
          background: todayDone ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${todayDone ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.18)'}`,
        }}>
          <span>{todayDone ? '✅' : todayEntry.minutesDone > 0 ? '⚡' : '🎯'}</span>
          <span style={{ color: todayDone ? '#34d399' : todayEntry.minutesDone > 0 ? '#fbbf24' : '#a5b4fc', fontSize: '0.8rem', fontWeight: 700 }}>
            {todayDone
              ? `הושלם — ${todayEntry.minutesDone} דקות`
              : todayEntry.minutesDone > 0
                ? `${todayEntry.minutesDone} דקות — קרוב! מחר תשלים`
                : `יעד: ${state.goalMinutes} דקות — בוא נעשה זאת!`
            }
          </span>
        </div>
      )}

      {/* Check-in input */}
      {!todayEntry && phase === 'idle' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
            placeholder="כמה דקות עשית היום?"
            className="glow-input"
            style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.88rem', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleCheckIn}
            disabled={!input}
            className="btn-primary btn-tactile"
            style={{ padding: '0.65rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 800, opacity: input ? 1 : 0.4 }}
          >
            ✓
          </button>
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10 }}>
          <div className="anim-spin" style={{ width: 14, height: 14, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8', borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ color: 'rgba(165,180,252,0.7)', fontSize: '0.78rem', fontWeight: 600 }}>🤖 המאמן מנתח…</span>
        </div>
      )}

      {/* AI feedback */}
      {aiMsg && phase === 'done' && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 11, padding: '0.75rem 0.9rem', animation: 'fadeIn 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem' }}>🤖</span>
            <span style={{ color: '#a5b4fc', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Coach</span>
          </div>
          <p style={{ color: 'rgba(241,245,249,0.82)', fontSize: '0.83rem', lineHeight: 1.65, margin: 0 }}>{aiMsg}</p>
        </div>
      )}

      {/* Level-up prompt */}
      {canLevelUp && todayEntry && (
        <div style={{ marginTop: '0.75rem', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 11, padding: '0.75rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', animation: 'fadeIn 0.3s ease' }}>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.15rem' }}>🏆 {streak} ימים ברצף!</div>
            <div style={{ color: 'rgba(241,245,249,0.45)', fontSize: '0.73rem' }}>
              שדרג ל-{state.goalMinutes + 5} דקות?
            </div>
          </div>
          <button
            onClick={handleLevelUp}
            className="btn-tactile"
            style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 10, color: '#fbbf24', fontWeight: 800, fontSize: '0.78rem', padding: '0.45rem 0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            שדרג ←
          </button>
        </div>
      )}
    </div>
  )
}
