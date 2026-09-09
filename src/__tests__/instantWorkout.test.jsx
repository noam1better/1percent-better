import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CombatActiveWorkout from '../components/combat/CombatActiveWorkout'
import { INSTANT_BOXING_WORKOUT, INSTANT_MT_WORKOUT } from '../data/instantWorkouts'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ── 1. Instant boxing workout renders first round ──────────────────

describe('instant boxing workout', () => {
  it('renders first round title', () => {
    render(
      <CombatActiveWorkout
        workout={INSTANT_BOXING_WORKOUT}
        onComplete={() => {}}
        onExit={() => {}}
      />
    )
    expect(screen.getByText('עמידת מוצא')).toBeTruthy()
  })

  it('has 5 rounds totalling 300 seconds', () => {
    const total = INSTANT_BOXING_WORKOUT.rounds.reduce((s, r) => s + r.durationSeconds, 0)
    expect(INSTANT_BOXING_WORKOUT.rounds).toHaveLength(5)
    expect(total).toBe(300)
  })

  it('has no warmup rounds', () => {
    const warmup = INSTANT_BOXING_WORKOUT.rounds.filter(r => r.type === 'warmup')
    expect(warmup).toHaveLength(0)
  })
})

// ── 2. Instant MT workout renders first round ──────────────────────

describe('instant muay thai workout', () => {
  it('renders first round title', () => {
    render(
      <CombatActiveWorkout
        workout={INSTANT_MT_WORKOUT}
        onComplete={() => {}}
        onExit={() => {}}
      />
    )
    expect(screen.getByText('עמידת מוצא מואי תאי')).toBeTruthy()
  })

  it('has 5 rounds totalling 300 seconds', () => {
    const total = INSTANT_MT_WORKOUT.rounds.reduce((s, r) => s + r.durationSeconds, 0)
    expect(INSTANT_MT_WORKOUT.rounds).toHaveLength(5)
    expect(total).toBe(300)
  })

  it('has no warmup rounds', () => {
    const warmup = INSTANT_MT_WORKOUT.rounds.filter(r => r.type === 'warmup')
    expect(warmup).toHaveLength(0)
  })
})

// ── Shared mini-workout fixture ────────────────────────────────────
// Titles are intentionally distinct from phase-label strings so getByText is unambiguous.

const MINI_WORKOUT = {
  id: '__test__',
  titleHe: 'אימון טסט',
  techniques: [],
  rounds: [
    { id: 'r1', type: 'warmup',    titleHe: 'חימום ראשוני', durationSeconds: 10, coachingCuesHe: [] },
    { id: 'r2', type: 'work',      titleHe: 'מכות ישירות',  durationSeconds: 10, coachingCuesHe: [] },
    { id: 'r3', type: 'cooldown',  titleHe: 'שחרור סופי',   durationSeconds: 10, coachingCuesHe: [] },
  ],
}

async function skip(btn) {
  await act(async () => {
    fireEvent.click(btn)
    vi.advanceTimersByTime(60) // flush advancingRef reset setTimeout(50ms)
  })
}

// ── 3. Skip warmup step ────────────────────────────────────────────

describe('skip warmup step', () => {
  it('advances to next round when skip is clicked on warmup', async () => {
    render(
      <CombatActiveWorkout
        workout={MINI_WORKOUT}
        onComplete={() => {}}
        onExit={() => {}}
      />
    )
    expect(screen.getByText('חימום ראשוני')).toBeTruthy()
    const skipBtn = screen.getByRole('button', { name: /דלג לשלב הבא/i })
    await skip(skipBtn)
    expect(screen.getByText('מכות ישירות')).toBeTruthy()
  })
})

// ── 4. Skip exercise (non-last) step ──────────────────────────────

describe('skip exercise step', () => {
  it('advances to cooldown when skip clicked on work round', async () => {
    render(
      <CombatActiveWorkout
        workout={MINI_WORKOUT}
        onComplete={() => {}}
        onExit={() => {}}
      />
    )
    const skipBtn = screen.getByRole('button', { name: /דלג לשלב הבא/i })
    await skip(skipBtn) // warmup → work
    expect(screen.getByText('מכות ישירות')).toBeTruthy()
    await skip(skipBtn) // work → cooldown
    expect(screen.getByText('שחרור סופי')).toBeTruthy()
  })
})

// ── 5. Skip final step triggers onComplete ─────────────────────────

describe('skip final step', () => {
  it('calls onComplete when skip clicked on last round', async () => {
    const onComplete = vi.fn()
    render(
      <CombatActiveWorkout
        workout={MINI_WORKOUT}
        onComplete={onComplete}
        onExit={() => {}}
      />
    )
    const skipBtn = screen.getByRole('button', { name: /דלג לשלב הבא/i })
    await skip(skipBtn) // warmup → work
    await skip(skipBtn) // work → cooldown
    await skip(skipBtn) // cooldown → complete
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0]).toMatchObject({ roundsCompleted: 1 })
  })
})

// ── 6. Prevent double-click duplicate advance ─────────────────────

describe('prevent duplicate advance', () => {
  it('does not advance twice on rapid double-click', async () => {
    const onComplete = vi.fn()
    const ONE_ROUND = {
      id: '__one__',
      titleHe: 'סיבוב אחד',
      techniques: [],
      rounds: [{ id: 'r1', type: 'work', titleHe: 'מכה אחת', durationSeconds: 10, coachingCuesHe: [] }],
    }
    render(
      <CombatActiveWorkout
        workout={ONE_ROUND}
        onComplete={onComplete}
        onExit={() => {}}
      />
    )
    const skipBtn = screen.getByRole('button', { name: /דלג לשלב הבא/i })
    await act(async () => {
      // two clicks in the same tick — advancingRef blocks the second
      fireEvent.click(skipBtn)
      fireEvent.click(skipBtn)
    })
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
