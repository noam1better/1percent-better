const LS_CREDITS = 'bb_credits'
const LS_UID     = 'bb_credits_uid'

export const INITIAL_CREDITS   = 30
export const CREDITS_PER_GEN   = 5
export const CREDITS_PER_REGEN = 1

export function getCredits(userId) {
  try {
    if (userId) {
      const storedUid = localStorage.getItem(LS_UID)
      if (storedUid !== userId) {
        localStorage.setItem(LS_UID, userId)
        localStorage.setItem(LS_CREDITS, String(INITIAL_CREDITS))
        return INITIAL_CREDITS
      }
    }
    const val = parseInt(localStorage.getItem(LS_CREDITS) ?? INITIAL_CREDITS)
    return isNaN(val) ? INITIAL_CREDITS : val
  } catch { return INITIAL_CREDITS }
}

export function deductCredits(amount = CREDITS_PER_GEN) {
  try {
    const current = parseInt(localStorage.getItem(LS_CREDITS) ?? INITIAL_CREDITS)
    const next = Math.max(0, current - amount)
    localStorage.setItem(LS_CREDITS, String(next))
    return next
  } catch { return 0 }
}

export function addCredits(amount) {
  try {
    const current = parseInt(localStorage.getItem(LS_CREDITS) ?? 0)
    const next = current + amount
    localStorage.setItem(LS_CREDITS, String(next))
    return next
  } catch { return amount }
}

export function hasCredits(amount = CREDITS_PER_GEN) {
  return getCredits() >= amount
}
