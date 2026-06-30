import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const profileDoc  = uid         => doc(db, 'focusTriggers', uid)
const activityDoc = (uid, date) => doc(db, 'users', uid, 'activity', date)
const lbDoc       = uid         => doc(db, 'leaderboard', uid)

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
  const snap = await getDoc(profileDoc(uid))
  return snap.exists() ? snap.data() : null
}

export async function saveProfile(uid, data) {
  await setDoc(profileDoc(uid), data, { merge: true })
}

export async function loadActivity(uid, date) {
  const snap = await getDoc(activityDoc(uid, validateDate(date)))
  return snap.exists() ? snap.data() : {}
}

export async function saveReflection(uid, date, triggerId, text) {
  const safeKey  = sanitizeFieldKey(triggerId)
  const safeDate = validateDate(date)
  await setDoc(
    activityDoc(uid, safeDate),
    { [safeKey]: { reflection: sanitizeText(text), updatedAt: new Date().toISOString() } },
    { merge: true }
  )
}

export async function syncLeaderboard(uid, name, xp) {
  const safeName = sanitizeText(name, 50) || 'Anonymous'
  const safeXP   = Math.max(0, Math.floor(Number(xp) || 0))
  await setDoc(lbDoc(uid), { name: safeName, xp: safeXP, updatedAt: new Date().toISOString() })
}

export async function loadLeaderboard() {
  try {
    const q    = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(5))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }))
  } catch {
    return []
  }
}
