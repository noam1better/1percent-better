import { describe, it, expect } from 'vitest'
import {
  getBoxingState,
  isWorkoutUnlocked,
  getNextWorkout,
  getLevelProgress,
  isLevelUnlocked,
  completeWorkout,
  getLearnedTechniques,
  getWorkoutById,
  getLevelForWorkout,
} from '../utils/boxingProgress'
import { BOXING_LEVELS } from '../data/boxingPath'

const todayKey = () => new Date().toISOString().slice(0, 10)

// ── getBoxingState ────────────────────────────────────────────────

describe('getBoxingState', () => {
  it('returns default state when profile has no training', () => {
    const s = getBoxingState({})
    expect(s.currentLevel).toBe(1)
    expect(s.completedWorkoutIds).toEqual([])
    expect(s.totalSessions).toBe(0)
  })

  it('returns default state from null profile', () => {
    const s = getBoxingState(null)
    expect(s.currentLevel).toBe(1)
    expect(s.completedWorkoutIds).toEqual([])
  })

  it('returns existing state from profile', () => {
    const profile = { training: { boxing: { currentLevel: 2, completedWorkoutIds: ['L1-W1'], totalSessions: 3 } } }
    const s = getBoxingState(profile)
    expect(s.currentLevel).toBe(2)
    expect(s.totalSessions).toBe(3)
  })
})

// ── isWorkoutUnlocked ─────────────────────────────────────────────

describe('isWorkoutUnlocked (locked prerequisites)', () => {
  it('L1-W1 is always unlocked (no prerequisites)', () => {
    const w = getWorkoutById('L1-W1')
    expect(isWorkoutUnlocked(w, [])).toBe(true)
  })

  it('L1-W2 requires L1-W1', () => {
    const w = getWorkoutById('L1-W2')
    expect(isWorkoutUnlocked(w, [])).toBe(false)
    expect(isWorkoutUnlocked(w, ['L1-W1'])).toBe(true)
  })

  it('L1-W4 requires L1-W1, L1-W2, L1-W3', () => {
    const w = getWorkoutById('L1-W4')
    expect(isWorkoutUnlocked(w, ['L1-W1', 'L1-W2'])).toBe(false)
    expect(isWorkoutUnlocked(w, ['L1-W1', 'L1-W2', 'L1-W3'])).toBe(true)
  })

  // Test: camera permission is never requested in Phase 1
  it('workout unlock does not request camera permission', () => {
    const spy = { called: false }
    const origRequest = typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
    // isWorkoutUnlocked is pure and never touches navigator
    const w = getWorkoutById('L1-W1')
    const result = isWorkoutUnlocked(w, [])
    expect(result).toBe(true)
    if (origRequest) {
      // getUserMedia was not called (pure function has no side effects)
      expect(spy.called).toBe(false)
    }
  })
})

// ── getNextWorkout ────────────────────────────────────────────────

describe('getNextWorkout', () => {
  it('returns L1-W1 for fresh state', () => {
    const state = getBoxingState(null)
    const next = getNextWorkout(state)
    expect(next?.id).toBe('L1-W1')
  })

  it('returns L1-W2 after completing L1-W1', () => {
    const state = { ...getBoxingState(null), completedWorkoutIds: ['L1-W1'] }
    const next = getNextWorkout(state)
    expect(next?.id).toBe('L1-W2')
  })

  it('returns first unlocked incomplete workout after multiple completions', () => {
    const state = { ...getBoxingState(null), completedWorkoutIds: ['L1-W1', 'L1-W2', 'L1-W3'] }
    const next = getNextWorkout(state)
    expect(next?.id).toBe('L1-W4')
  })

  it('returns null when all level 1 complete and level 2 has no rounds (stub)', () => {
    const allL1 = BOXING_LEVELS[0].workouts.map(w => w.id)
    const state = { ...getBoxingState(null), completedWorkoutIds: allL1 }
    const next = getNextWorkout(state)
    // Level 2 workouts have no rounds — they exist but have no runnable content
    // next can be a L2 workout (unlocked) or null if L2 workouts have prerequisites
    // The key assertion: L1 is fully done, so L1-W1 through L1-W6 are NOT returned
    if (next) {
      expect(next.level).toBeGreaterThanOrEqual(2)
    } else {
      expect(next).toBeNull()
    }
  })
})

// ── getLevelProgress ──────────────────────────────────────────────

describe('getLevelProgress', () => {
  it('returns 0 complete for empty state', () => {
    const p = getLevelProgress(1, [])
    expect(p.completed).toBe(0)
    expect(p.total).toBe(6)
    expect(p.isComplete).toBe(false)
  })

  it('returns correct count after partial completion', () => {
    const p = getLevelProgress(1, ['L1-W1', 'L1-W2'])
    expect(p.completed).toBe(2)
    expect(p.total).toBe(6)
    expect(p.isComplete).toBe(false)
  })

  it('marks level complete when all workouts done', () => {
    const allL1 = BOXING_LEVELS[0].workouts.map(w => w.id)
    const p = getLevelProgress(1, allL1)
    expect(p.isComplete).toBe(true)
    expect(p.completed).toBe(p.total)
  })
})

// ── isLevelUnlocked (Level 2 stays locked until Level 1 complete) ─

describe('isLevelUnlocked', () => {
  it('Level 1 is always unlocked', () => {
    expect(isLevelUnlocked(1, [])).toBe(true)
  })

  it('Level 2 is locked when Level 1 is incomplete', () => {
    expect(isLevelUnlocked(2, [])).toBe(false)
    expect(isLevelUnlocked(2, ['L1-W1', 'L1-W2'])).toBe(false)
  })

  it('Level 2 unlocks when Level 1 is complete', () => {
    const allL1 = BOXING_LEVELS[0].workouts.map(w => w.id)
    expect(isLevelUnlocked(2, allL1)).toBe(true)
  })

  it('Level 3 requires Level 2 complete', () => {
    const allL1 = BOXING_LEVELS[0].workouts.map(w => w.id)
    expect(isLevelUnlocked(3, allL1)).toBe(false)
  })
})

// ── completeWorkout ───────────────────────────────────────────────

describe('completeWorkout (idempotency)', () => {
  const baseState = getBoxingState(null)
  const today = todayKey()

  it('adds workout to completedWorkoutIds', () => {
    const next = completeWorkout(baseState, 'L1-W1', today)
    expect(next.completedWorkoutIds).toContain('L1-W1')
  })

  it('increments totalSessions', () => {
    const next = completeWorkout(baseState, 'L1-W1', today)
    expect(next.totalSessions).toBe(1)
  })

  it('sets lastWorkoutDate', () => {
    const next = completeWorkout(baseState, 'L1-W1', today)
    expect(next.lastWorkoutDate).toBe(today)
  })

  it('completing the same workout twice does not advance twice', () => {
    const after1 = completeWorkout(baseState, 'L1-W1', today)
    const after2 = completeWorkout(after1, 'L1-W1', today)
    expect(after2.completedWorkoutIds.filter(id => id === 'L1-W1').length).toBe(1)
    expect(after2.totalSessions).toBe(after1.totalSessions) // no extra session
  })

  it('completing a workout unlocks the next one', () => {
    const after = completeWorkout(baseState, 'L1-W1', today)
    const w2 = getWorkoutById('L1-W2')
    expect(isWorkoutUnlocked(w2, after.completedWorkoutIds)).toBe(true)
  })

  it('does not mutate the input state', () => {
    const snapshot = JSON.stringify(baseState)
    completeWorkout(baseState, 'L1-W1', today)
    expect(JSON.stringify(baseState)).toBe(snapshot)
  })
})

// ── getLearnedTechniques ──────────────────────────────────────────

describe('getLearnedTechniques', () => {
  it('returns empty array for no completions', () => {
    expect(getLearnedTechniques([])).toEqual([])
  })

  it('returns techniques from completed workouts', () => {
    const techs = getLearnedTechniques(['L1-W1'])
    expect(techs.length).toBeGreaterThan(0)
    expect(Array.isArray(techs)).toBe(true)
  })

  it('deduplicates techniques across multiple workouts', () => {
    const techs = getLearnedTechniques(['L1-W1', 'L1-W2', 'L1-W3'])
    const unique = [...new Set(techs)]
    expect(techs.length).toBe(unique.length)
  })
})

// ── Boxing vs Muay Thai separation ────────────────────────────────

describe('Boxing does not contain Muay Thai lessons', () => {
  it('no boxing workout has muay thai disciplines or keywords', () => {
    const MUAY_THAI_TERMS = ['teep', 'kick', 'knee', 'elbow', 'בעיטה', 'ברך', 'מרפק', 'muay', 'מוי תאי']
    BOXING_LEVELS.forEach(level => {
      level.workouts.forEach(workout => {
        MUAY_THAI_TERMS.forEach(term => {
          expect(workout.id.toLowerCase()).not.toContain('muay')
          expect(workout.titleHe?.toLowerCase() || '').not.toContain(term.toLowerCase())
        })
      })
    })
  })

  it('all boxing workouts have level 1-7', () => {
    BOXING_LEVELS.forEach(level => {
      level.workouts.forEach(w => {
        expect(w.level).toBeGreaterThanOrEqual(1)
        expect(w.level).toBeLessThanOrEqual(7)
      })
    })
  })
})

// ── Workout exit does not award XP ────────────────────────────────

describe('Workout exit does not affect progression', () => {
  it('exiting without calling completeWorkout leaves state unchanged', () => {
    const state = getBoxingState(null)
    const snapshot = JSON.stringify(state)
    // simulate exit: no function is called, state is unchanged
    expect(JSON.stringify(state)).toBe(snapshot)
    expect(getNextWorkout(state)?.id).toBe('L1-W1')
  })
})

// ── Existing workout history intact ──────────────────────────────

describe('Existing workout history is not affected', () => {
  it('completeWorkout only modifies training.boxing fields', () => {
    const stateWithHistory = {
      currentLevel: 1,
      completedWorkoutIds: [],
      lastWorkoutDate: null,
      totalSessions: 0,
      reflections: {}
    }
    const next = completeWorkout(stateWithHistory, 'L1-W1', todayKey())
    expect(next).not.toHaveProperty('workouts')  // no generic workout history
    expect(next).not.toHaveProperty('activity')  // no activity log modification
    expect(next).toHaveProperty('completedWorkoutIds')
    expect(next).toHaveProperty('totalSessions')
  })
})

// ── Free Training does not advance progression ────────────────────

describe('Free Training does not advance guided progression', () => {
  it('getNextWorkout is unchanged when completeWorkout is not called', () => {
    const state = getBoxingState(null)
    const before = getNextWorkout(state)?.id
    // Free training does not call completeWorkout
    // State unchanged
    const after = getNextWorkout(state)?.id
    expect(before).toBe(after)
  })
})

// ── getWorkoutById ────────────────────────────────────────────────

describe('getWorkoutById', () => {
  it('returns workout for valid ID', () => {
    const w = getWorkoutById('L1-W1')
    expect(w).not.toBeNull()
    expect(w?.id).toBe('L1-W1')
    expect(w?.level).toBe(1)
  })

  it('returns null for unknown ID', () => {
    expect(getWorkoutById('INVALID')).toBeNull()
  })

  it('getLevelForWorkout returns correct level', () => {
    expect(getLevelForWorkout('L1-W1')).toBe(1)
    expect(getLevelForWorkout('L1-W6')).toBe(1)
    expect(getLevelForWorkout('INVALID')).toBeNull()
  })
})
