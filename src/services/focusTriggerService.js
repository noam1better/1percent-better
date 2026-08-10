import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const profileDoc   = uid         => doc(db, 'focusTriggers', uid)
const activityDoc  = (uid, date) => doc(db, 'users', uid, 'activity', date)
const lbDoc        = uid         => doc(db, 'leaderboard', uid)
const waitlistDoc  = uid         => doc(db, 'waitlist', uid)

// Strip HTML tags, control chars, and trim. Used on any user-supplied string before
// it reaches Firestore or an AI API.
function sanitizeText(s, max = 2000) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max)
}

// Allow only alphanumeric + hyphen + underscore for Firestore field keys (triggerId).
// Prevents field-name injection when a user-controlled value is used as a map key.
function sanitizeFieldKey(s) {
  const clean = String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  if (!clean) throw new Error('Invalid field key')
  return clean
}

// Validate YYYY-MM-DD before using it as a Firestore document ID.
function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format')
  return date
}

export async function loadProfile(uid) {
  try {
    const snap = await getDoc(profileDoc(uid))
    if (snap.exists()) return snap.data()
    const defaults = { tier: 'free', createdAt: new Date().toISOString() }
    await setDoc(profileDoc(uid), defaults, { merge: true })
    return defaults
  } catch {
    return null
  }
}

export async function saveProfile(uid, data) {
  try {
    await setDoc(profileDoc(uid), data, { merge: true })
  } catch (err) {
    console.error('[saveProfile]', err?.code || err?.message || err)
  }
}

export async function loadActivity(uid, date) {
  try {
    const snap = await getDoc(activityDoc(uid, validateDate(date)))
    return snap.exists() ? snap.data() : {}
  } catch {
    return {}
  }
}

export async function saveReflection(uid, date, triggerId, text) {
  try {
    const safeKey  = sanitizeFieldKey(triggerId)
    const safeDate = validateDate(date)
    await setDoc(
      activityDoc(uid, safeDate),
      { [safeKey]: { reflection: sanitizeText(text), updatedAt: new Date().toISOString() } },
      { merge: true }
    )
  } catch (err) {
    console.error('[saveReflection]', err?.code || err?.message || err)
  }
}

export async function syncLeaderboard(uid, name, xp) {
  try {
    const safeName = sanitizeText(name, 50) || 'Anonymous'
    const safeXP   = Math.max(0, Math.floor(Number(xp) || 0))
    await setDoc(lbDoc(uid), { name: safeName, xp: safeXP, updatedAt: new Date().toISOString() })
  } catch {
    // non-critical — leaderboard sync failure is silent
  }
}

const BOT_PROFILES = [
  { uid: '__bot_1', name: 'Rotem K.',   xp: 2840 },
  { uid: '__bot_2', name: 'Amit D.',    xp: 2410 },
  { uid: '__bot_3', name: 'Noa S.',     xp: 1975 },
  { uid: '__bot_4', name: 'Yoav M.',    xp: 1620 },
  { uid: '__bot_5', name: 'Shira L.',   xp: 1280 },
  { uid: '__bot_6', name: 'Oren P.',    xp:  990 },
  { uid: '__bot_7', name: 'Maya T.',    xp:  730 },
  { uid: '__bot_8', name: 'Eitan R.',   xp:  510 },
]

export async function loadLeaderboard() {
  try {
    const q       = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(20))
    const snap    = await getDocs(q)
    const real    = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
    const realIds = new Set(real.map(e => e.uid))
    const bots    = BOT_PROFILES.filter(b => !realIds.has(b.uid))
    const merged  = [...real, ...bots].sort((a, b) => (b.xp || 0) - (a.xp || 0))
    // deduplicate by name — keep the highest-XP entry per display name
    const seen = new Map()
    const deduped = []
    for (const e of merged) {
      const key = (e.name || '').trim().toLowerCase()
      if (!seen.has(key)) { seen.set(key, true); deduped.push(e) }
    }
    return deduped.slice(0, 10)
  } catch {
    return BOT_PROFILES.slice(0, 8)
  }
}

export async function joinWaitlist(uid, email) {
  const safeEmail = sanitizeText(email, 254)
  if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    throw new Error('Invalid email')
  }
  await setDoc(waitlistDoc(uid), { email: safeEmail, joinedAt: new Date().toISOString() })
}
