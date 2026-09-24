// Single source of truth for the global streak shown across screens.
// Mirrors the grace rule in Dashboard's bumpStreak(): a streak continues if the
// last active day was today, yesterday, or two days ago. Anything older is broken.
// Uses the same UTC date keys as the rest of the streak logic.

const dateKey = offsetDays => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10)

export function isStreakAlive(streak) {
  const last = streak?.lastDate
  if (!last || !(streak?.count > 0)) return false
  return last === dateKey(0) || last === dateKey(1) || last === dateKey(2)
}

export function getEffectiveStreak(profile) {
  const s = profile?.streak
  return isStreakAlive(s) ? s.count : 0
}
