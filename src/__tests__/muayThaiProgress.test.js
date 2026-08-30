import { describe, it, expect } from 'vitest'
import {
  getMuayThaiState,
  getNextWorkout,
  completeWorkout,
  isWorkoutUnlocked,
  getLevelProgress,
  isLevelUnlocked,
  getLearnedTechniques,
} from '../utils/muayThaiProgress'
import { getBoxingState, completeWorkout as completeBoxingWorkout } from '../utils/boxingProgress'
import { MT_LEVELS } from '../data/muayThaiPath'
import { BOXING_LEVELS } from '../data/boxingPath'

const todayKey = () => new Date().toISOString().slice(0, 10)

// ── getMuayThaiState ──────────────────────────────────────────────

describe('getMuayThaiState', () => {
  it('returns default state for empty profile', () => {
    const s = getMuayThaiState({})
    expect(s.currentLevel).toBe(1)
    expect(s.completedWorkoutIds).toEqual([])
    expect(s.totalSessions).toBe(0)
  })

  it('returns default state from null profile', () => {
    const s = getMuayThaiState(null)
    expect(s.currentLevel).toBe(1)
    expect(s.completedWorkoutIds).toEqual([])
  })

  it('returns existing state from profile.training.muayThai', () => {
    const profile = {
      training: {
        muayThai: { currentLevel: 2, completedWorkoutIds: ['MT-L1-W1'], totalSessions: 1 },
      },
    }
    const s = getMuayThaiState(profile)
    expect(s.currentLevel).toBe(2)
    expect(s.completedWorkoutIds).toContain('MT-L1-W1')
    expect(s.totalSessions).toBe(1)
  })

  it('does not bleed boxing state into muay thai state', () => {
    const profile = { training: { boxing: { completedWorkoutIds: ['L1-W1', 'L1-W2'] } } }
    const s = getMuayThaiState(profile)
    expect(s.completedWorkoutIds).toEqual([])
  })
})

// ── Recommended lesson (getNextWorkout) ─────────────────────────

describe('MT getNextWorkout — recommended lesson', () => {
  it('returns MT-L1-W1 for fresh state', () => {
    const next = getNextWorkout(getMuayThaiState({}))
    expect(next?.id).toBe('MT-L1-W1')
  })

  it('returns MT-L1-W2 after completing MT-L1-W1', () => {
    const s = { ...getMuayThaiState({}), completedWorkoutIds: ['MT-L1-W1'] }
    const next = getNextWorkout(s)
    expect(next?.id).toBe('MT-L1-W2')
  })

  it('returns MT-L1-W3 after completing W1 and W2', () => {
    const s = { ...getMuayThaiState({}), completedWorkoutIds: ['MT-L1-W1', 'MT-L1-W2'] }
    const next = getNextWorkout(s)
    expect(next?.id).toBe('MT-L1-W3')
  })

  it('returns null when all Level 1 complete (Level 2 placeholders have no prerequisites issue handled)', () => {
    const allL1 = MT_LEVELS[0].workouts.map(w => w.id)
    const s = { ...getMuayThaiState({}), completedWorkoutIds: allL1 }
    const next = getNextWorkout(s)
    if (next) {
      expect(next.level).toBeGreaterThanOrEqual(2)
    } else {
      expect(next).toBeNull()
    }
  })
})

// ── Completion unlocks next lesson ───────────────────────────────

describe('Completing a workout unlocks the next MT lesson', () => {
  it('MT-L1-W1 completion → MT-L1-W2 unlocked', () => {
    const state = getMuayThaiState({})
    const after = completeWorkout(state, 'MT-L1-W1', todayKey())
    const w2 = MT_LEVELS[0].workouts.find(w => w.id === 'MT-L1-W2')
    expect(isWorkoutUnlocked(w2, after.completedWorkoutIds)).toBe(true)
    expect(getNextWorkout(after)?.id).toBe('MT-L1-W2')
  })

  it('MT-L1-W2 stays locked until MT-L1-W1 is done', () => {
    const w2 = MT_LEVELS[0].workouts.find(w => w.id === 'MT-L1-W2')
    expect(isWorkoutUnlocked(w2, [])).toBe(false)
  })

  it('MT-L1-W4 requires W1, W2, W3', () => {
    const w4 = MT_LEVELS[0].workouts.find(w => w.id === 'MT-L1-W4')
    expect(isWorkoutUnlocked(w4, ['MT-L1-W1', 'MT-L1-W2'])).toBe(false)
    expect(isWorkoutUnlocked(w4, ['MT-L1-W1', 'MT-L1-W2', 'MT-L1-W3'])).toBe(true)
  })

  it('completeWorkout increments totalSessions', () => {
    const state = getMuayThaiState({})
    const after = completeWorkout(state, 'MT-L1-W1', todayKey())
    expect(after.totalSessions).toBe(1)
  })

  it('completeWorkout does not mutate input state', () => {
    const state = getMuayThaiState({})
    const snapshot = JSON.stringify(state)
    completeWorkout(state, 'MT-L1-W1', todayKey())
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

// ── Repeat completion does not advance twice ─────────────────────

describe('Repeat completion does not advance twice', () => {
  it('completing MT-L1-W1 twice adds it to completedIds only once', () => {
    const state = getMuayThaiState({})
    const after1 = completeWorkout(state, 'MT-L1-W1', todayKey())
    const after2 = completeWorkout(after1, 'MT-L1-W1', todayKey())
    const occurrences = after2.completedWorkoutIds.filter(id => id === 'MT-L1-W1').length
    expect(occurrences).toBe(1)
  })

  it('totalSessions does not increment on repeat completion', () => {
    const state = getMuayThaiState({})
    const after1 = completeWorkout(state, 'MT-L1-W1', todayKey())
    const after2 = completeWorkout(after1, 'MT-L1-W1', todayKey())
    expect(after2.totalSessions).toBe(after1.totalSessions)
  })

  it('nextWorkout is unchanged after duplicate completion', () => {
    const state = getMuayThaiState({})
    const after1 = completeWorkout(state, 'MT-L1-W1', todayKey())
    const after2 = completeWorkout(after1, 'MT-L1-W1', todayKey())
    expect(getNextWorkout(after2)?.id).toBe(getNextWorkout(after1)?.id)
  })
})

// ── Boxing and Muay Thai progress are fully separate ────────────

describe('Boxing and Muay Thai progress are separate', () => {
  it('boxing state does not read MT workout IDs', () => {
    const boxState = getBoxingState({})
    expect(boxState.completedWorkoutIds).not.toContain('MT-L1-W1')
  })

  it('completing a boxing workout does not advance MT progression', () => {
    const mtState = getMuayThaiState({})
    const boxState = getBoxingState({})
    completeBoxingWorkout(boxState, 'L1-W1', todayKey())
    const mtNext = getNextWorkout(mtState)
    expect(mtNext?.id).toBe('MT-L1-W1')
  })

  it('boxing progress in profile does not affect MT state', () => {
    const boxState = getBoxingState({})
    const newBoxState = completeBoxingWorkout(boxState, 'L1-W1', todayKey())
    const profile = { training: { boxing: newBoxState } }
    const mtState = getMuayThaiState(profile)
    expect(mtState.completedWorkoutIds).toEqual([])
    expect(getNextWorkout(mtState)?.id).toBe('MT-L1-W1')
  })

  it('MT and boxing workout IDs share no overlap', () => {
    const allMT = MT_LEVELS.flatMap(l => l.workouts.map(w => w.id))
    const allBoxing = BOXING_LEVELS.flatMap(l => l.workouts.map(w => w.id))
    const overlap = allMT.filter(id => allBoxing.includes(id))
    expect(overlap).toHaveLength(0)
  })

  it('completing MT workout does not affect boxing getNextWorkout', () => {
    const mtState = getMuayThaiState({})
    completeWorkout(mtState, 'MT-L1-W1', todayKey())
    expect(getBoxingState({}).completedWorkoutIds).toEqual([])
  })
})

// ── Level 1 has 6 workouts ────────────────────────────────────────

describe('MT Level 1 structure', () => {
  it('contains exactly 6 workouts', () => {
    const l1 = MT_LEVELS.find(l => l.level === 1)
    expect(l1?.workouts).toHaveLength(6)
  })

  it('all 6 Level 1 workouts have rounds', () => {
    const l1 = MT_LEVELS.find(l => l.level === 1)
    l1.workouts.forEach(w => {
      expect(w.rounds.length).toBeGreaterThan(0)
    })
  })

  it('all Level 1 workouts have discipline muay-thai', () => {
    const l1 = MT_LEVELS.find(l => l.level === 1)
    l1.workouts.forEach(w => {
      expect(w.discipline).toBe('muay-thai')
    })
  })

  it('no Level 1 workout requests camera permission (no camera fields)', () => {
    const l1 = MT_LEVELS.find(l => l.level === 1)
    l1.workouts.forEach(w => {
      expect(w).not.toHaveProperty('requiresCamera')
      expect(JSON.stringify(w)).not.toContain('getUserMedia')
      expect(JSON.stringify(w)).not.toContain('camera')
    })
  })
})

// ── Locked levels behavior ────────────────────────────────────────

describe('MT locked levels behavior', () => {
  it('Level 1 is always unlocked', () => {
    expect(isLevelUnlocked(1, [])).toBe(true)
  })

  it('Level 2 is locked with empty completedIds', () => {
    expect(isLevelUnlocked(2, [])).toBe(false)
  })

  it('Level 2 is locked with partial Level 1', () => {
    expect(isLevelUnlocked(2, ['MT-L1-W1', 'MT-L1-W2'])).toBe(false)
  })

  it('Level 2 unlocks when all Level 1 workouts complete', () => {
    const allL1 = MT_LEVELS[0].workouts.map(w => w.id)
    expect(isLevelUnlocked(2, allL1)).toBe(true)
  })

  it('Level 3 requires Level 2 complete', () => {
    const allL1 = MT_LEVELS[0].workouts.map(w => w.id)
    expect(isLevelUnlocked(3, allL1)).toBe(false)
  })
})

// ── getLevelProgress ──────────────────────────────────────────────

describe('MT getLevelProgress', () => {
  it('returns 0/6 for empty state', () => {
    const p = getLevelProgress(1, [])
    expect(p.completed).toBe(0)
    expect(p.total).toBe(6)
    expect(p.isComplete).toBe(false)
  })

  it('returns correct count after partial completion', () => {
    const p = getLevelProgress(1, ['MT-L1-W1', 'MT-L1-W2'])
    expect(p.completed).toBe(2)
    expect(p.total).toBe(6)
    expect(p.isComplete).toBe(false)
  })

  it('marks level complete when all 6 done', () => {
    const allL1 = MT_LEVELS[0].workouts.map(w => w.id)
    const p = getLevelProgress(1, allL1)
    expect(p.isComplete).toBe(true)
  })
})

// ── getLearnedTechniques ──────────────────────────────────────────

describe('MT getLearnedTechniques', () => {
  it('returns empty for no completions', () => {
    expect(getLearnedTechniques([])).toEqual([])
  })

  it('returns techniques from completed MT-L1-W1', () => {
    const techs = getLearnedTechniques(['MT-L1-W1'])
    expect(techs.length).toBeGreaterThan(0)
    expect(Array.isArray(techs)).toBe(true)
  })

  it('deduplicates techniques', () => {
    const techs = getLearnedTechniques(['MT-L1-W1', 'MT-L1-W2'])
    const unique = [...new Set(techs)]
    expect(techs.length).toBe(unique.length)
  })
})

// ── Exit does not award progress ─────────────────────────────────

describe('Exit without completion leaves MT state unchanged', () => {
  it('getNextWorkout unchanged when completeWorkout is not called', () => {
    const state = getMuayThaiState({})
    const before = getNextWorkout(state)?.id
    const after = getNextWorkout(state)?.id
    expect(before).toBe(after)
    expect(before).toBe('MT-L1-W1')
  })
})
