// Local-calendar date key (YYYY-MM-DD) in the user's timezone.
// Used by My Tasks so "today" / "מאתמול" flip at local midnight, not UTC.
// The rest of the app still uses UTC toISOString() keys — don't mix the two.

export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
