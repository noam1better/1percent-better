// Single source of truth for "יום X/N" on a 30-day track.
// The current day is the one the user is on: if today's task is already done,
// that's daysCompleted; otherwise it's the next day (daysCompleted + 1).
// Uses the same UTC date keys as lastCompletedDate.

const todayKey = () => new Date().toISOString().slice(0, 10)

export function getTrackDay(challenge, record) {
  const days          = challenge?.days || 30
  const daysCompleted = Math.min(record?.daysCompleted || 0, days)
  const doneToday     = record?.lastCompletedDate === todayKey()
  const currentDay    = doneToday ? Math.max(daysCompleted, 1) : Math.min(daysCompleted + 1, days)
  return { currentDay, daysCompleted, days, doneToday, finished: daysCompleted >= days }
}
