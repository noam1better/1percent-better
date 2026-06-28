const todayKey = () => new Date().toISOString().slice(0, 10)

const getNotifSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(`ft_notified_${todayKey()}`)) || []) }
  catch { return new Set() }
}

const markNotified = id => {
  try {
    const s = getNotifSet()
    s.add(id)
    localStorage.setItem(`ft_notified_${todayKey()}`, JSON.stringify([...s]))
  } catch { /* storage full */ }
}

const getCheckins = () => {
  try { return JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`)) || {} }
  catch { return {} }
}

const GOAL_LABELS_HE = {
  trading: 'מסחר', fitness: 'כושר', learning: 'למידה',
  mindful: 'מיינדפולנס', work: 'עבודה עמוקה', creative: 'יצירתיות',
}

export function requestPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') Notification.requestPermission()
}

export function fireTriggerNotif(trigger, profile) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const notified = getNotifSet()
  if (notified.has(trigger.id)) return
  markNotified(trigger.id)

  const vision    = profile?.vision
  const goalLabel = GOAL_LABELS_HE[profile?.focusGoal] || ''

  let body = `${trigger.cue}\n→ ${trigger.habit}`

  if (vision) {
    const snippet = vision.length > 55 ? vision.slice(0, 52) + '…' : vision
    body += `\n\n💭 "${snippet}"`
  } else if (goalLabel) {
    body += `\n\nיעד: ${goalLabel} 💪`
  }

  new Notification('⚡ זמן לטריגר שלך', {
    body,
    icon: '/favicon.svg',
    tag:  trigger.id,
  })
}

export function fireEveningRecap(profile, triggers) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const recapKey = `ft_recap_${todayKey()}`
  if (localStorage.getItem(recapKey)) return
  localStorage.setItem(recapKey, '1')

  const checkins  = getCheckins()
  const doneCount = triggers.filter(t => checkins[t.id]).length
  const total     = triggers.length
  const name      = profile?.name ? `, ${profile.name}` : ''

  let body
  if (total === 0) {
    body = `לא הגדרת טריגרים להיום. מחר מתחילים מחדש 💪`
  } else if (doneCount === total) {
    body = `כל הכבוד${name}! 🎉 השלמת את כל ${total} הטריגרים היום.\nאיך אתה מרגיש?`
  } else if (doneCount === 0) {
    body = `עדיין לא השלמת טריגרים היום${name}. עוד לא מאוחר מדי 🌙\nאיך אתה מרגיש?`
  } else {
    body = `השלמת ${doneCount} מתוך ${total} טריגרים היום${name}.\nאיך אתה מרגיש?`
  }

  new Notification('🌙 סיכום יומי', {
    body,
    icon: '/favicon.svg',
    tag:  'evening-recap',
  })
}

export function checkNotifications(triggers, profile, recapTime = '20:00') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now  = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const checkins = getCheckins()

  // Contextual trigger-time notifications
  triggers.forEach(tr => {
    if (!tr.time || tr.time !== hhmm) return
    if (checkins[tr.id]) return
    fireTriggerNotif(tr, profile)
  })

  // Evening recap
  if (hhmm === recapTime) {
    fireEveningRecap(profile, triggers)
  }
}
