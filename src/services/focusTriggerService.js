import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const profileDoc  = uid         => doc(db, 'focusTriggers', uid)
const activityDoc = (uid, date) => doc(db, 'users', uid, 'activity', date)
const lbDoc       = uid         => doc(db, 'leaderboard', uid)

export async function loadProfile(uid) {
  const snap = await getDoc(profileDoc(uid))
  return snap.exists() ? snap.data() : null
}

export async function saveProfile(uid, data) {
  await setDoc(profileDoc(uid), data, { merge: true })
}

export async function loadActivity(uid, date) {
  const snap = await getDoc(activityDoc(uid, date))
  return snap.exists() ? snap.data() : {}
}

export async function saveReflection(uid, date, triggerId, text) {
  await setDoc(
    activityDoc(uid, date),
    { [triggerId]: { reflection: text, updatedAt: new Date().toISOString() } },
    { merge: true }
  )
}

export async function syncLeaderboard(uid, name, xp) {
  await setDoc(lbDoc(uid), { name: name || 'Anonymous', xp, updatedAt: new Date().toISOString() })
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
