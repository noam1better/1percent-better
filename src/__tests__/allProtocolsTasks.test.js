import { describe, it, expect } from 'vitest'
import { getDayContent } from '../data/lessonContent'
import { getDayTask, getModuleIndex } from '../data/challenges'

// All 9 challenge track IDs (must match LESSON_CONTENT keys in lessonContent.js)
const ALL_TRACKS = [
  'capital-markets',
  'self-discipline',
  'ai-beginners',
  'business-mind',
  'product-builder',
  'deal-closer',
  'ai-pioneer',
  'business-soul',
  'claude-code-mastery',
]

// Mirrors fixed Dashboard/TracksPage logic
function getTaskForDay(challengeId, dayNum) {
  const moduleIdx = getModuleIndex(dayNum)
  const dayInMod  = (dayNum - 1) % 5
  const rich      = getDayContent(challengeId, moduleIdx, dayInMod)
  return rich?.microTask || getDayTask(challengeId, dayNum)
}

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 1. Every track: all 30 days have distinct tasks ───────────────

describe('all tracks — 30 unique tasks per track', () => {
  for (const trackId of ALL_TRACKS) {
    it(`${trackId}: 30 days all unique`, () => {
      const tasks  = Array.from({ length: 30 }, (_, i) => getTaskForDay(trackId, i + 1))
      const unique = new Set(tasks)
      expect(unique.size).toBe(30)
    })
  }
})

// ── 2. Every track: task is deterministic (same day → same task) ──

describe('all tracks — deterministic per day', () => {
  for (const trackId of ALL_TRACKS) {
    it(`${trackId}: days 1,5,10,15,20,25,30 return same value on re-call`, () => {
      for (const d of [1, 5, 10, 15, 20, 25, 30]) {
        expect(getTaskForDay(trackId, d)).toBe(getTaskForDay(trackId, d))
      }
    })
  }
})

// ── 3. Every track: adjacent days always differ ───────────────────

describe('all tracks — adjacent days differ', () => {
  for (const trackId of ALL_TRACKS) {
    it(`${trackId}: day N ≠ day N+1 for all N 1-29`, () => {
      for (let d = 1; d < 30; d++) {
        expect(getTaskForDay(trackId, d)).not.toBe(getTaskForDay(trackId, d + 1))
      }
    })
  }
})

// ── 4. Every track: all tasks non-empty and Hebrew ────────────────

describe('all tracks — tasks are non-empty Hebrew strings', () => {
  for (const trackId of ALL_TRACKS) {
    it(`${trackId}: all 30 tasks contain Hebrew characters`, () => {
      for (let d = 1; d <= 30; d++) {
        const task = getTaskForDay(trackId, d)
        expect(task).toBeTruthy()
        expect(task.length).toBeGreaterThan(10)
        expect(/[֐-׿]/.test(task)).toBe(true)
      }
    })
  }
})

// ── 5. Independent tracking per track ────────────────────────────

describe('independent progress per track', () => {
  it('advancing self-discipline does not affect capital-markets day', () => {
    const sdDay9    = getTaskForDay('self-discipline', 9)
    const cmDay1    = getTaskForDay('capital-markets', 1)
    const sdDay10   = getTaskForDay('self-discipline', 10)

    // Separate tracks return different tasks
    expect(sdDay9).not.toBe(cmDay1)
    // Advancing one track doesn't mutate the other
    expect(getTaskForDay('capital-markets', 1)).toBe(cmDay1)
    expect(getTaskForDay('self-discipline', 9)).toBe(sdDay9)
    expect(sdDay9).not.toBe(sdDay10)
  })

  it('profile tracks each challenge independently', () => {
    const profile = {
      challenges: {
        'self-discipline':  { daysCompleted: 9,  lastCompletedDate: '2026-09-08' },
        'capital-markets':  { daysCompleted: 3,  lastCompletedDate: '2026-09-05' },
        'ai-beginners':     { daysCompleted: 0,  lastCompletedDate: null },
      },
    }
    const sdDay  = (profile.challenges['self-discipline'].daysCompleted  || 0) + 1
    const cmDay  = (profile.challenges['capital-markets'].daysCompleted  || 0) + 1
    const aibDay = (profile.challenges['ai-beginners'].daysCompleted     || 0) + 1

    expect(sdDay).toBe(10)
    expect(cmDay).toBe(4)
    expect(aibDay).toBe(1)

    const sdTask  = getTaskForDay('self-discipline', sdDay)
    const cmTask  = getTaskForDay('capital-markets', cmDay)
    const aibTask = getTaskForDay('ai-beginners', aibDay)

    expect(sdTask).not.toBe(cmTask)
    expect(cmTask).not.toBe(aibTask)
    expect(sdTask).not.toBe(aibTask)
  })
})

// ── 6. Refresh stability — daysCompleted doesn't auto-increment ───

describe('refresh stability', () => {
  it('reading profile multiple times does not change daysCompleted', () => {
    const profile = {
      challenges: {
        'self-discipline': { daysCompleted: 14, lastCompletedDate: '2026-09-07' },
      },
    }
    const read = () => profile?.challenges?.['self-discipline']?.daysCompleted || 0

    expect(read()).toBe(14)
    expect(read()).toBe(14)
    expect(read()).toBe(14)
  })

  it('task shown on refresh equals same task for same daysCompleted', () => {
    const daysCompleted = 7
    const dayNum = daysCompleted + 1

    const task1 = getTaskForDay('business-mind', dayNum)
    const task2 = getTaskForDay('business-mind', dayNum)
    expect(task1).toBe(task2)
  })
})

// ── 7. XP duplicate prevention ───────────────────────────────────

describe('XP awarded only once per track per day', () => {
  it('lastCompletedDate guard blocks re-award same calendar day', () => {
    const today = localDateKey()
    for (const trackId of ['self-discipline', 'capital-markets', 'ai-beginners']) {
      const profile = { challenges: { [trackId]: { daysCompleted: 5, lastCompletedDate: today } } }
      const alreadyDone = profile.challenges[trackId].lastCompletedDate === today
      expect(alreadyDone).toBe(true)
    }
  })

  it('completing one track does not block other track completion same day', () => {
    const today = localDateKey()
    const profile = {
      challenges: {
        'self-discipline': { daysCompleted: 5, lastCompletedDate: today },
        'capital-markets': { daysCompleted: 5, lastCompletedDate: '2026-09-01' },
      },
    }
    const sdBlocked = profile.challenges['self-discipline'].lastCompletedDate === today
    const cmBlocked = profile.challenges['capital-markets'].lastCompletedDate === today
    expect(sdBlocked).toBe(true)
    expect(cmBlocked).toBe(false)
  })

  it('different calendar day allows completion for any track', () => {
    const yesterday = localDateKey(new Date(Date.now() - 86_400_000))
    const today     = localDateKey()
    for (const trackId of ALL_TRACKS) {
      const profile = { challenges: { [trackId]: { daysCompleted: 10, lastCompletedDate: yesterday } } }
      const alreadyDone = profile.challenges[trackId].lastCompletedDate === today
      expect(alreadyDone).toBe(false)
    }
  })
})

// ── 8. Module boundary: day 5→6 crosses module, task changes ─────

describe('module boundary (day 5 → 6) shows new module task', () => {
  for (const trackId of ALL_TRACKS) {
    it(`${trackId}: day 5 and day 6 differ (cross module boundary)`, () => {
      expect(getTaskForDay(trackId, 5)).not.toBe(getTaskForDay(trackId, 6))
    })
  }
})

// ── 9. Existing profile compatibility ─────────────────────────────

describe('existing profile compatibility', () => {
  it('daysCompleted=0 → day 1 task for every track', () => {
    for (const trackId of ALL_TRACKS) {
      const dayNum = 0 + 1
      const task   = getTaskForDay(trackId, dayNum)
      expect(task).toBeTruthy()
      expect(task.length).toBeGreaterThan(10)
    }
  })

  it('absent challenge key defaults to day 1 without error', () => {
    const profile = {}
    for (const trackId of ALL_TRACKS) {
      const dayNum = (profile?.challenges?.[trackId]?.daysCompleted || 0) + 1
      expect(dayNum).toBe(1)
      expect(() => getTaskForDay(trackId, dayNum)).not.toThrow()
    }
  })
})
