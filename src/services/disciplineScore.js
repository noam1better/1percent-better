const KEY   = 'prime_score_v1'
const TODAY = () => new Date().toISOString().slice(0, 10)

export const RANKS = [
  { id: 'recruit',  label: 'RECRUIT',  min: 0,   color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: '🪖' },
  { id: 'operator', label: 'OPERATOR', min: 75,  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '⚡' },
  { id: 'elite',    label: 'ELITE',    min: 200, color: '#F5C518', bg: 'rgba(245,197,24,0.12)',  icon: '🔱' },
  { id: 'prime',    label: 'PRIME',    min: 450, color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '💎' },
]

const DELTA = { win: 15, miss: -20, streak: 8 }

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { score: 0, lastMissCheck: null } }
  catch { return { score: 0, lastMissCheck: null } }
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export function getScore() { return load().score }

export function getRank(score) {
  return [...RANKS].reverse().find(r => score >= r.min) || RANKS[0]
}

export function applyWin() {
  const s = load()
  const next = { ...s, score: s.score + DELTA.win }
  persist(next)
  return next.score
}

export function applyStreakBonus() {
  const s = load()
  const next = { ...s, score: s.score + DELTA.streak }
  persist(next)
  return next.score
}

// ── Discipline Contract ───────────────────────────────────────────

function gatherHistoryByDate() {
  const today = TODAY()
  const byDate = {}

  let disc = []
  try { disc = JSON.parse(localStorage.getItem('prime_discipline_state'))?.history || [] } catch {}

  let train = []
  try {
    const ts = JSON.parse(localStorage.getItem('prime_training_state'))
    train = Object.values(ts?.tracks || {}).flatMap(t => t.history || [])
  } catch {}

  ;[...disc, ...train].forEach(h => {
    if (h.date >= today) return  // exclude today — day not over
    if (!byDate[h.date]) byDate[h.date] = { anyCompleted: false }
    if (h.completed) byDate[h.date].anyCompleted = true
  })

  return byDate
}

export function isContractLocked() {
  return load().contractLocked === true
}

// Returns { locked, lockedSince, isNew }
// Call on app open. Will SET the lock if 2 consecutive misses detected.
export function checkContractStatus() {
  const s = load()

  // Already locked — stay locked until explicit redemption
  if (s.contractLocked) return { locked: true, lockedSince: s.lockedSince }

  // Redeemed today — don't re-lock until tomorrow's detection
  if (s.lastRedemption === TODAY()) return { locked: false }

  const byDate = gatherHistoryByDate()
  const sorted = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  if (sorted.length < 2) return { locked: false }

  const [d1, d2] = sorted  // d1 = most recent past day, d2 = day before that

  // Must be consecutive calendar days
  const gap = Math.round((new Date(d1) - new Date(d2)) / 86400000)
  if (gap !== 1) return { locked: false }

  const bothMissed = !byDate[d1].anyCompleted && !byDate[d2].anyCompleted
  if (!bothMissed) return { locked: false }

  const next = { ...s, contractLocked: true, lockedSince: d1 }
  persist(next)
  return { locked: true, lockedSince: d1, isNew: true }
}

// Returns true if the lock was cleared (i.e., was actually locked)
export function completeRedemption() {
  const s = load()
  if (!s.contractLocked) return false
  persist({ ...s, contractLocked: false, lockedSince: null, lastRedemption: TODAY() })
  window.dispatchEvent(new CustomEvent('prime:redeemed'))
  return true
}

// ── Missed-day penalty ────────────────────────────────────────────

export function checkMissedDay() {
  const s = load()
  const today = TODAY()
  if (s.lastMissCheck === today) return { score: s.score, missedYesterday: false }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let discHistory = []
  try { discHistory = JSON.parse(localStorage.getItem('prime_discipline_state'))?.history || [] } catch {}

  let trainHistory = []
  try {
    const ts = JSON.parse(localStorage.getItem('prime_training_state'))
    trainHistory = Object.values(ts?.tracks || {}).flatMap(t => t.history || [])
  } catch {}

  const discYest   = discHistory.find(h => h.date === yesterday)
  const trainYest  = trainHistory.find(h => h.date === yesterday)
  const hadGoal    = !!(discYest || trainYest)
  const didComplete = !!(discYest?.completed || trainYest?.completed)

  const missedYesterday = hadGoal && !didComplete
  const newScore = missedYesterday ? Math.max(0, s.score + DELTA.miss) : s.score
  const next = { ...s, score: newScore, lastMissCheck: today }
  persist(next)
  return { score: newScore, missedYesterday }
}
