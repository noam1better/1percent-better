// Pure functions for habit-completion reminder logic.
// No side effects — safe to call during render and in tests.

export function getIncompleteCount(triggers, checkins) {
  if (!Array.isArray(triggers)) return 0
  const safe = (checkins && typeof checkins === 'object' && !Array.isArray(checkins)) ? checkins : {}
  return triggers.filter(tr => tr && !safe[tr.id]).length
}

export function shouldShowLateReminder(hour, triggers, checkins) {
  if (!Number.isFinite(hour)) return false
  if (!Array.isArray(triggers) || triggers.length === 0) return false
  if (hour < 19) return false
  return getIncompleteCount(triggers, checkins) > 0
}
