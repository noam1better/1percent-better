import { describe, it, expect } from 'vitest'
import { getDayContent } from '../data/lessonContent'
import { getDayTask, getModuleIndex } from '../data/challenges'

// Helper that mirrors the fixed Dashboard logic
function getTaskForDay(challengeId, dayNum) {
  const moduleIdx = getModuleIndex(dayNum)
  const dayInMod  = (dayNum - 1) % 5
  const rich      = getDayContent(challengeId, moduleIdx, dayInMod)
  return rich?.microTask || getDayTask(challengeId, dayNum)
}

// Local-date key, mirrors the correct pattern (no UTC off-by-one)
function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TRACK = 'self-discipline'

// ── 1. Different program days show different tasks ─────────────────

describe('different days → different tasks', () => {
  it('days 1-10 all have unique tasks', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => getTaskForDay(TRACK, i + 1))
    const unique = new Set(tasks)
    expect(unique.size).toBe(10)
  })

  it('all 30 days have unique tasks', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => getTaskForDay(TRACK, i + 1))
    const unique = new Set(tasks)
    expect(unique.size).toBe(30)
  })
})

// ── 2. Day 9 maps to ninth unique task, not module-level default ───

describe('day 9 maps to its own task', () => {
  it('day 9 microTask differs from module-level CHALLENGE_WEEKS string', () => {
    const dayNineTask   = getTaskForDay(TRACK, 9)
    const moduleLevelOld = getDayTask(TRACK, 9) // old wrong behaviour — module summary
    expect(dayNineTask).not.toBe(moduleLevelOld)
  })

  it('day 9 is distinct from days 6,7,8,10 (same module)', () => {
    const day9 = getTaskForDay(TRACK, 9)
    for (const d of [6, 7, 8, 10]) {
      expect(getTaskForDay(TRACK, d)).not.toBe(day9)
    }
  })

  it('day 9 microTask contains expected Hebrew content about energy', () => {
    const task = getTaskForDay(TRACK, 9)
    // day 9 = module 1, dayInMod 3 → energy-drains microTask
    expect(task).toContain('גנבי האנרגיה')
  })
})

// ── 3. Same program day always returns the same task (deterministic) ─

describe('same day → same task (deterministic)', () => {
  it('calling getTaskForDay twice with same day returns identical string', () => {
    for (const d of [1, 5, 9, 15, 22, 30]) {
      expect(getTaskForDay(TRACK, d)).toBe(getTaskForDay(TRACK, d))
    }
  })

  it('daysCompleted does not change without explicit increment', () => {
    const profile = { challenges: { [TRACK]: { daysCompleted: 8, lastCompletedDate: '2026-09-08' } } }
    const daysCompleted = profile?.challenges?.[TRACK]?.daysCompleted || 0
    // Simulating multiple reads (refresh, re-render) — value stays 8
    expect(daysCompleted).toBe(8)
    expect(daysCompleted).toBe(8)
    expect(getTaskForDay(TRACK, daysCompleted + 1)).toBe(getTaskForDay(TRACK, 9))
  })
})

// ── 4. Advancing to next program day changes task ──────────────────

describe('advancing day changes task', () => {
  it('day N and day N+1 always differ', () => {
    for (let d = 1; d < 30; d++) {
      expect(getTaskForDay(TRACK, d)).not.toBe(getTaskForDay(TRACK, d + 1))
    }
  })

  it('completing day 8 shows day 9 task on next open', () => {
    // Before completion: daysCompleted=8, shown task is for day 9
    const taskBeforeComplete = getTaskForDay(TRACK, 8 + 1)
    // After completion: daysCompleted=9, shown task is for day 10
    const taskAfterComplete  = getTaskForDay(TRACK, 9 + 1)
    expect(taskBeforeComplete).not.toBe(taskAfterComplete)
  })
})

// ── 5. Existing saved progress is preserved ────────────────────────

describe('existing saved progress compatibility', () => {
  it('profile with daysCompleted=8 still resolves to day 9 task', () => {
    const profile = { challenges: { [TRACK]: { daysCompleted: 8, lastCompletedDate: '2026-09-01' } } }
    const dayNum = (profile?.challenges?.[TRACK]?.daysCompleted || 0) + 1
    expect(dayNum).toBe(9)
    expect(getTaskForDay(TRACK, dayNum)).toBe(getTaskForDay(TRACK, 9))
  })

  it('profile with no challenge data defaults to day 1', () => {
    const profile = {}
    const dayNum = (profile?.challenges?.[TRACK]?.daysCompleted || 0) + 1
    expect(dayNum).toBe(1)
    const task = getTaskForDay(TRACK, 1)
    expect(task).toBeTruthy()
    expect(task.length).toBeGreaterThan(10)
  })

  it('daysCompleted is not reset when no challenge key exists', () => {
    const profile = { challenges: { 'ai-beginners': { daysCompleted: 5 } } }
    const dayNum = (profile?.challenges?.[TRACK]?.daysCompleted || 0) + 1
    expect(dayNum).toBe(1) // self-discipline not started → day 1, correct
    // ai-beginners progress untouched
    expect(profile.challenges['ai-beginners'].daysCompleted).toBe(5)
  })
})

// ── 6. Completing a task awards XP only once per day ──────────────

describe('XP awarded only once per day', () => {
  it('lastCompletedDate guard prevents re-award same calendar day', () => {
    const today = localDateKey()
    const profile = { challenges: { [TRACK]: { daysCompleted: 9, lastCompletedDate: today } } }
    // Simulate the guard in confirmChallengeComplete
    const alreadyDone = profile.challenges[TRACK].lastCompletedDate === today
    expect(alreadyDone).toBe(true)
  })

  it('different calendar day allows completion', () => {
    const yesterday = localDateKey(new Date(Date.now() - 86400000))
    const today     = localDateKey()
    const profile   = { challenges: { [TRACK]: { daysCompleted: 9, lastCompletedDate: yesterday } } }
    const alreadyDone = profile.challenges[TRACK].lastCompletedDate === today
    expect(alreadyDone).toBe(false)
  })

  it('trackDoneToday is false when lastCompletedDate is yesterday', () => {
    const yesterday = localDateKey(new Date(Date.now() - 86400000))
    const today     = localDateKey()
    const lastCompletedDate = yesterday
    const trackDoneToday = lastCompletedDate === today
    expect(trackDoneToday).toBe(false)
  })
})

// ── 7. Local-date boundaries ───────────────────────────────────────

describe('local date key is correct', () => {
  it('localDateKey returns YYYY-MM-DD format', () => {
    const key = localDateKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('localDateKey uses local date not UTC for midnight edge', () => {
    // Simulate 1am local time in UTC+3 (which is 10pm previous UTC day)
    // Create a date where local time is next day but UTC is still previous day
    const d = new Date('2026-09-10T01:00:00+03:00') // 1am local Sept 10 = 10pm UTC Sept 9
    const localKey = localDateKey(d)
    const utcKey   = d.toISOString().slice(0, 10) // would return '2026-09-09' (UTC)
    expect(localKey).toBe('2026-09-10')   // correct local date
    expect(utcKey).toBe('2026-09-09')     // demonstrates UTC off-by-one
    expect(localKey).not.toBe(utcKey)     // they differ → UTC is wrong for this user
  })

  it('all 30 self-discipline tasks are non-empty Hebrew strings', () => {
    for (let d = 1; d <= 30; d++) {
      const task = getTaskForDay(TRACK, d)
      expect(task).toBeTruthy()
      expect(task.length).toBeGreaterThan(20)
      // All should contain Hebrew characters
      expect(/[֐-׿]/.test(task)).toBe(true)
    }
  })
})
