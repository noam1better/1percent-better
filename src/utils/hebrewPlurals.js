// Hebrew pluralization helpers — use these wherever counts appear in UI copy.
// Hebrew has no plural suffix rule; each noun needs its own form.

export function days(n) {
  if (n === 1) return 'יום אחד'
  return `${n} ימים`
}

export function workouts(n) {
  if (n === 1) return 'אימון אחד'
  return `${n} אימונים`
}

export function lessons(n) {
  if (n === 1) return 'שיעור אחד'
  return `${n} שיעורים`
}

export function rounds(n) {
  if (n === 1) return 'סיבוב אחד'
  return `${n} סיבובים`
}

export function habits(n) {
  if (n === 1) return 'הרגל אחד'
  return `${n} הרגלים`
}

export function levels(n) {
  if (n === 1) return 'רמה אחת'
  return `${n} רמות`
}

export function minutes(n) {
  if (n === 1) return 'דקה אחת'
  return `${n} דקות`
}

export function streakDays(n) {
  if (n === 1) return 'יום אחד ברצף'
  return `${n} ימים ברצף`
}

export function outOf(completed, total, unit = 'ימים') {
  return `${completed} מתוך ${total} ${unit}`
}
