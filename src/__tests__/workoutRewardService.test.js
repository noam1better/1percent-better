import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock firebase before importing the service under test
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  runTransaction: vi.fn(),
}))

vi.mock('../services/firebase', () => ({
  db: {},
}))

import { runTransaction } from 'firebase/firestore'
import { claimDailyWorkoutReward, isDailyWorkoutClaimedLocally } from '../services/workoutRewardService'

const TODAY = '2026-08-30'

function mockTxnUnclaimed() {
  runTransaction.mockImplementationOnce(async (_db, fn) => {
    const txn = {
      get: async () => ({ data: () => ({ dailyWorkoutClaims: {} }) }),
      set: vi.fn(),
    }
    await fn(txn)
  })
}

function mockTxnAlreadyClaimed() {
  runTransaction.mockImplementationOnce(async (_db, fn) => {
    const txn = {
      get: async () => ({ data: () => ({ dailyWorkoutClaims: { [TODAY]: true } }) }),
      set: vi.fn(),
    }
    await fn(txn)
  })
}

describe('claimDailyWorkoutReward', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('claims reward on first call when Firestore shows no prior claim', async () => {
    mockTxnUnclaimed()
    const { claimed } = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(claimed).toBe(true)
  })

  it('does not claim when Firestore already has claim for today', async () => {
    mockTxnAlreadyClaimed()
    const { claimed } = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(claimed).toBe(false)
  })

  it('caches result in localStorage after first successful claim', async () => {
    mockTxnUnclaimed()
    await claimDailyWorkoutReward('uid-test', TODAY)
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(true)
  })

  it('fast-path: returns claimed:false immediately if localStorage already set', async () => {
    // Manually set cache as if a prior claim occurred this session
    localStorage.setItem(`prime_workout_done_${TODAY}`, '1')
    const { claimed } = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(claimed).toBe(false)
    // Firestore was never called
    expect(runTransaction).not.toHaveBeenCalled()
  })

  // ── Boxing then Muay Thai awards only one daily reward ───────────

  it('boxing followed by muay thai on same day — second claim returns false', async () => {
    // First workout (boxing): Firestore unclaimed → claim it
    mockTxnUnclaimed()
    const boxing = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(boxing.claimed).toBe(true)
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(true)

    // Second workout (muay thai) same day: localStorage already set → fast-path false
    const mt = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(mt.claimed).toBe(false)
    // runTransaction called only once (for boxing), not for MT
    expect(runTransaction).toHaveBeenCalledTimes(1)
  })

  it('muay thai followed by boxing on same day — second claim returns false', async () => {
    // First (muay thai): unclaimed
    mockTxnUnclaimed()
    const mt = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(mt.claimed).toBe(true)

    // Second (boxing): localStorage already set
    const boxing = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(boxing.claimed).toBe(false)
    expect(runTransaction).toHaveBeenCalledTimes(1)
  })

  // ── Failed Firestore transaction does not award XP ───────────────

  it('failed Firestore transaction returns claimed:false', async () => {
    runTransaction.mockRejectedValueOnce(new Error('network error'))
    const { claimed } = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(claimed).toBe(false)
  })

  it('failed Firestore transaction does not set localStorage', async () => {
    runTransaction.mockRejectedValueOnce(new Error('offline'))
    await claimDailyWorkoutReward('uid-test', TODAY)
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(false)
  })

  it('failed Firestore transaction means subsequent call can still try Firestore', async () => {
    // First call fails
    runTransaction.mockRejectedValueOnce(new Error('timeout'))
    const first = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(first.claimed).toBe(false)
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(false)

    // Second call: Firestore now succeeds
    mockTxnUnclaimed()
    const second = await claimDailyWorkoutReward('uid-test', TODAY)
    expect(second.claimed).toBe(true)
  })
})

// ── isDailyWorkoutClaimedLocally ─────────────────────────────────

describe('isDailyWorkoutClaimedLocally', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false before any claim', () => {
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(false)
  })

  it('returns true after localStorage is set', () => {
    localStorage.setItem(`prime_workout_done_${TODAY}`, '1')
    expect(isDailyWorkoutClaimedLocally(TODAY)).toBe(true)
  })

  it('is date-specific: different date returns false', () => {
    localStorage.setItem(`prime_workout_done_${TODAY}`, '1')
    expect(isDailyWorkoutClaimedLocally('2026-08-31')).toBe(false)
  })
})
