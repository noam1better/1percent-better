import { db, isFirebaseConfigured } from './firebase'
import { doc, setDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore'

const COL    = 'analytics'
const LS_PRE = 'bb_analytics_'

async function merge(websiteId, data) {
  if (isFirebaseConfigured && db) {
    try { await setDoc(doc(db, COL, websiteId), { ...data, updatedAt: serverTimestamp() }, { merge: true }); return } catch {}
  }
  const key = LS_PRE + websiteId
  try {
    const cur = JSON.parse(localStorage.getItem(key)) || {}
    const next = { ...cur }
    for (const [k, v] of Object.entries(data)) {
      next[k] = typeof v === 'number' ? (cur[k] || 0) + v : v
    }
    next.updatedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(next))
  } catch {}
}

export async function recordVisit(websiteId) {
  await merge(websiteId, { visits: isFirebaseConfigured ? increment(1) : 1 })
}

export async function recordWAClick(websiteId) {
  await merge(websiteId, { waClicks: isFirebaseConfigured ? increment(1) : 1 })
}

export async function recordFormSubmit(websiteId) {
  await merge(websiteId, { formSubmits: isFirebaseConfigured ? increment(1) : 1 })
}

export async function getAnalytics(websiteId) {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, COL, websiteId))
      if (snap.exists()) return snap.data()
    } catch {}
  }
  try { return JSON.parse(localStorage.getItem(LS_PRE + websiteId)) || {} } catch { return {} }
}

// Deterministic fake data seeded by website ID (demo purposes)
export function getFakeAnalytics(website) {
  const seed = (website?.id || website?.slug || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 7)
  const r = (min, max) => min + ((seed * 17 + 13) % (max - min + 1))
  return {
    visits:         r(14, 312),
    waClicks:       r(2, 48),
    formSubmits:    r(0, 14),
    conversionRate: ((r(2, 18)) / 10).toFixed(1),
  }
}
