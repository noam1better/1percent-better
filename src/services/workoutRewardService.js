/**
 * workoutRewardService.js
 * Atomic daily workout reward claim via Firestore transaction.
 * Protects against duplicate awards across devices, tabs, and cleared localStorage.
 *
 * Claim key: focusTriggers/{uid}.dailyWorkoutClaims.{YYYY-MM-DD}
 * Security: existing focusTriggers/{uid} owner-only rule covers this field.
 *
 * KNOWN SECURITY LIMITATION (Phase 1):
 * The Firestore rule for focusTriggers/{uid} is owner-only — it prevents other
 * users from writing to your document, but it does NOT prevent the authenticated
 * owner from writing arbitrary XP values directly (e.g. via REST API or console).
 * This service enforces the "one award per day" invariant for honest clients,
 * not against a malicious authenticated user.
 *
 * TODO (Phase 2): Move XP increment to a server-side Cloud Function triggered on
 * dailyWorkoutClaims write. The function verifies the claim flag flipped false→true
 * and atomically increments XP server-side, removing the client from the trust chain.
 */

import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

const LS_PREFIX = 'prime_workout_done_'

function profileRef(uid) {
  return doc(db, 'focusTriggers', uid)
}

/**
 * Atomically claims the daily workout reward for `uid` on `date`.
 *
 * @param {string} uid   - Firebase auth uid
 * @param {string} date  - ISO date string YYYY-MM-DD
 * @returns {Promise<{ claimed: boolean }>}
 *   claimed:true  → first claim today; caller should award XP
 *   claimed:false → already claimed or network error; no XP
 */
export async function claimDailyWorkoutReward(uid, date) {
  const lsKey = `${LS_PREFIX}${date}`

  // Fast same-device cache check — if already set, skip network round-trip
  if (localStorage.getItem(lsKey)) {
    return { claimed: false }
  }

  try {
    let awarded = false

    await runTransaction(db, async (txn) => {
      const snap   = await txn.get(profileRef(uid))
      const claims = snap.data()?.dailyWorkoutClaims ?? {}

      if (claims[date]) {
        // Already claimed on another device or in a previous session
        awarded = false
        return
      }

      txn.set(
        profileRef(uid),
        { dailyWorkoutClaims: { ...claims, [date]: true } },
        { merge: true },
      )
      awarded = true
    })

    // Cache result locally (both claimed and already-claimed paths)
    localStorage.setItem(lsKey, '1')
    return { claimed: awarded }
  } catch {
    // Network error or transaction failure — conservative: don't award
    return { claimed: false }
  }
}

/**
 * Read-only same-device check.
 * Returns true if the daily reward was already claimed in this browser.
 * Does NOT consult Firestore — use claimDailyWorkoutReward for authoritative check.
 */
export function isDailyWorkoutClaimedLocally(date) {
  return !!localStorage.getItem(`${LS_PREFIX}${date}`)
}
