/**
 * muayThaiProgress.js
 * Muay Thai–specific wrappers around the generic combat progression engine.
 * Keeps profile.training.muayThai completely separate from profile.training.boxing.
 */

import { MT_LEVELS } from '../data/muayThaiPath'
import { createCombatProgressionEngine, isWorkoutUnlocked } from './combatProgress'

const engine = createCombatProgressionEngine(MT_LEVELS)

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_MT_STATE = {
  currentLevel:       1,
  completedWorkoutIds: [],
  lastWorkoutDate:    null,
  totalSessions:      0,
  reflections:        {},
}

// ---------------------------------------------------------------------------
// State accessor
// ---------------------------------------------------------------------------

export function getMuayThaiState(profile) {
  return profile?.training?.muayThai ?? { ...DEFAULT_MT_STATE }
}

// ---------------------------------------------------------------------------
// Re-export engine methods with bound names
// ---------------------------------------------------------------------------

export function getWorkoutById(id)                       { return engine.getWorkoutById(id) }
export function getLevelForWorkout(id)                   { return engine.getLevelForWorkout(id) }
export { isWorkoutUnlocked }
export function isLevelComplete(levelNum, completedIds)  { return engine.isLevelComplete(levelNum, completedIds) }
export function isLevelUnlocked(levelNum, completedIds)  { return engine.isLevelUnlocked(levelNum, completedIds) }
export function getLevelProgress(levelNum, completedIds) { return engine.getLevelProgress(levelNum, completedIds) }
export function getNextWorkout(state)                    { return engine.getNextWorkout(state) }
export function completeWorkout(state, workoutId, today) { return engine.completeWorkout(state, workoutId, today) }
export function getLearnedTechniques(completedIds)       { return engine.getLearnedTechniques(completedIds) }

export { engine as muayThaiEngine }
