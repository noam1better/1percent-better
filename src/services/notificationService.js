import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const todayKey = () => new Date().toISOString().slice(0, 10)

// ── localStorage helpers ───────────────────────────────────────────

const getNotifSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(`ft_notified_${todayKey()}`)) || []) }
  catch { return new Set() }
}

const markNotified = id => {
  try {
    const s = getNotifSet()
    s.add(id)
    localStorage.setItem(`ft_notified_${todayKey()}`, JSON.stringify([...s]))
  } catch {}
}

const getCheckins = () => {
  try { return JSON.parse(localStorage.getItem(`ft_checkins_${todayKey()}`)) || {} }
  catch { return {} }
}

// ── Nudge cooldown / snooze ────────────────────────────────────────

const NUDGE_COOLDOWN_MS = 4 * 60 * 60 * 1000

function nudgeKey(nn) {
  return `nn_${nn.replace(/\s+/g, '_').slice(0, 30)}`
}

function getLastNudgeTime(key) {
  try { return parseInt(localStorage.getItem(`prime_nudge_ts_${key}`)) || 0 }
  catch { return 0 }
}

function setLastNudgeTime(key) {
  try { localStorage.setItem(`prime_nudge_ts_${key}`, String(Date.now())) }
  catch {}
}

function getSnoozedUntil(key) {
  try { return parseInt(localStorage.getItem(`prime_nudge_snooze_${key}`)) || 0 }
  catch { return 0 }
}

export function snoozeNudge(nn, ms = 60 * 60 * 1000) {
  const key = nudgeKey(nn)
  try { localStorage.setItem(`prime_nudge_snooze_${key}`, String(Date.now() + ms)) }
  catch {}
}

export function markNudgeDone(nn) {
  const key = nudgeKey(nn)
  try { localStorage.setItem(`prime_nudge_done_${todayKey()}_${key}`, '1') }
  catch {}
}

function isNudgeDoneToday(key) {
  try { return !!localStorage.getItem(`prime_nudge_done_${todayKey()}_${key}`) }
  catch { return false }
}

function canNudge(key) {
  if (isNudgeDoneToday(key)) return false
  const snoozed = getSnoozedUntil(key)
  if (snoozed > Date.now()) return false
  return Date.now() - getLastNudgeTime(key) >= NUDGE_COOLDOWN_MS
}

// ── Firebase ───────────────────────────────────────────────────────

export async function loadVisionProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'userPaths', uid))
    return snap.exists() ? (snap.data()?.vision_profile || null) : null
  } catch { return null }
}

export async function saveNudgeResponse(uid, habitLabel, response) {
  if (!uid || !habitLabel) return
  try {
    await setDoc(
      doc(db, 'nudgeResponses', `${uid}_${todayKey()}`),
      { uid, date: todayKey(), responses: [{ habitLabel, response, ts: Date.now() }] },
      { merge: true }
    )
  } catch {}
}

// ── Show notification (SW path for action buttons) ─────────────────

async function showNotification(title, options) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
      return
    } catch {}
  }
  // fallback — no action buttons
  new Notification(title, { body: options.body, icon: options.icon, tag: options.tag })
}

// ── Prime Nudge ────────────────────────────────────────────────────

export async function fireNudge(nn, visionProfile, uid) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const key = nudgeKey(nn)
  if (!canNudge(key)) return
  setLastNudgeTime(key)

  const vision = visionProfile?.three_year_vision || ''
  const gap    = visionProfile?.the_gap || ''

  const trim = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s

  let body = nn
  if (vision) body += `\n\n💭 "${trim(vision, 65)}"`
  if (gap)    body += `\nהפער: ${trim(gap, 55)}`

  await showNotification('⚡ Prime Check-in', {
    body,
    icon: '/favicon.svg',
    tag:  `nudge_${key}`,
    data: { habitLabel: nn, uid: uid || '' },
    requireInteraction: true,
    actions: [
      { action: 'done',  title: '✅ עשיתי' },
      { action: 'later', title: '⏰ בעוד שעה' },
      { action: 'help',  title: '🆘 צריך עזרה' },
    ],
  })
}

export function isNudgesEnabled() {
  try { return localStorage.getItem('prime_nudges_enabled') !== 'false' }
  catch { return true }
}

// ── Check nudges (called every 60s from Dashboard) ─────────────────

export async function checkNudges(visionProfile, uid) {
  if (!isNudgesEnabled()) return
  if (!visionProfile) return
  const nns = visionProfile.non_negotiables
  if (!Array.isArray(nns) || nns.length === 0) return

  const hour = new Date().getHours()
  // Nudge windows: 10:00–10:05 and 16:00–16:05
  if (hour !== 10 && hour !== 16) return

  for (const nn of nns) {
    if (typeof nn !== 'string' || !nn.trim()) continue
    await fireNudge(nn.trim(), visionProfile, uid)
  }
}

// ── Existing exports (unchanged) ────────────────────────────────────

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

  new Notification('⚡ זמן לטריגר שלך', { body, icon: '/favicon.svg', tag: trigger.id })
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
  if (total === 0)          body = `לא הגדרת טריגרים להיום. מחר מתחילים מחדש 💪`
  else if (doneCount === total) body = `כל הכבוד${name}! 🎉 השלמת את כל ${total} הטריגרים היום.\nאיך אתה מרגיש?`
  else if (doneCount === 0)     body = `עדיין לא השלמת טריגרים היום${name}. עוד לא מאוחר מדי 🌙\nאיך אתה מרגיש?`
  else                          body = `השלמת ${doneCount} מתוך ${total} טריגרים היום${name}.\nאיך אתה מרגיש?`

  new Notification('🌙 סיכום יומי', { body, icon: '/favicon.svg', tag: 'evening-recap' })
}

export function getDailyNudgeMessage(name, streak) {
  const n = name ? `, ${name}` : ''
  if (streak >= 30) return { title: `🔥 ${streak} ימים${n}`,       body: `אגדה. עוד יום אחד שומר את הלהבה דולקת. אל תשבור את מה שבנית.` }
  if (streak >= 14) return { title: `💪 רצף של ${streak} ימים${n}!`, body: `שבועיים של נוכחות. היום זה עוד צעד אחד. אל תשבור את השרשרת.` }
  if (streak >= 7)  return { title: `⚡ שבוע ברצף${n}!`,            body: `7+ ימים ברצף. אתה כבר בין 10% הטובים. אל תיתן ליום הזה לשבור את הרצף.` }
  if (streak >= 3)  return { title: `🚀 ${streak} ימים ברצף${n}`,   body: `הרצף שלך בונה. הרגל אחד היום שומר על המומנטום. מוכן?` }
  if (streak === 1) return { title: `✅ יום 1 הושלם${n}`,           body: `התחלה טובה. ביום 2 רוב האנשים מוותרים. תגיע שוב היום.` }
  return              { title: `⚡ ההרגלים שלך מחכים${n}`,         body: `כל יום שאתה מגיע הוא הצבעה עבור האדם שאתה הופך להיות. תתחיל היום.` }
}

export function checkNotifications(triggers, profile, recapTime = '20:00', nudgeTime = '08:00') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now  = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const checkins = getCheckins()

  // Morning streak nudge
  if (hhmm === nudgeTime) {
    const nudgeKey = `ft_nudge_${todayKey()}`
    if (!localStorage.getItem(nudgeKey)) {
      localStorage.setItem(nudgeKey, '1')
      const streak  = profile?.streak?.count || 0
      const { title, body } = getDailyNudgeMessage(profile?.name, streak)
      new Notification(title, { body, icon: '/favicon.svg', tag: 'daily-nudge' })
    }
  }

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
