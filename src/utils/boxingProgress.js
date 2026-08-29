/**
 * boxingProgress.js
 * Pure utility functions for boxing training progression logic.
 * No side effects. No React imports. No Firebase imports.
 * Safe to test in isolation.
 */

import { BOXING_LEVELS, BOXING_LEVEL_MAP } from '../data/boxingPath'

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_BOXING_STATE = {
  currentLevel: 1,
  completedWorkoutIds: [],
  lastWorkoutDate: null,
  totalSessions: 0,
  reflections: {},
}

// ---------------------------------------------------------------------------
// State accessor
// ---------------------------------------------------------------------------

/**
 * Returns the boxing training state from a user profile, or a fresh default
 * state if none exists.
 *
 * @param {object|null|undefined} profile - User profile object
 * @returns {object} Boxing state
 */
export function getBoxingState(profile) {
  return profile?.training?.boxing ?? { ...DEFAULT_BOXING_STATE }
}

// ---------------------------------------------------------------------------
// Workout lookup helpers
// ---------------------------------------------------------------------------

/**
 * Returns a workout object by its ID, searching across all levels.
 * Returns undefined if not found.
 *
 * @param {string} id - Workout ID, e.g. 'L1-W1'
 * @returns {object|undefined}
 */
export function getWorkoutById(id) {
  for (const level of BOXING_LEVELS) {
    const workout = level.workouts.find((w) => w.id === id)
    if (workout !== undefined) return workout
  }
  return null
}

/**
 * Returns the level number (1-7) for a given workout ID.
 * Returns null if the workout is not found.
 *
 * @param {string} id - Workout ID
 * @returns {number|null}
 */
export function getLevelForWorkout(id) {
  for (const level of BOXING_LEVELS) {
    if (level.workouts.some((w) => w.id === id)) return level.level
  }
  return null
}

// ---------------------------------------------------------------------------
// Unlock & completion checks
// ---------------------------------------------------------------------------

/**
 * Returns whether a workout is unlocked.
 * A workout is unlocked when every workout listed in its `prerequisites`
 * array appears in `completedIds`.
 *
 * @param {object} workout - WorkoutRound object from boxingPath
 * @param {string[]} completedIds - Array of completed workout IDs
 * @returns {boolean}
 */
export function isWorkoutUnlocked(workout, completedIds) {
  if (!workout.prerequisites || workout.prerequisites.length === 0) return true
  return workout.prerequisites.every((prereqId) => completedIds.includes(prereqId))
}

/**
 * Returns whether every workout in a given level has been completed.
 *
 * @param {number} levelNum - Level number (1-7)
 * @param {string[]} completedIds - Array of completed workout IDs
 * @returns {boolean}
 */
export function isLevelComplete(levelNum, completedIds) {
  const level = BOXING_LEVEL_MAP[levelNum]
  if (!level) return false
  return level.workouts.every((w) => completedIds.includes(w.id))
}

/**
 * Returns whether a given level is unlocked.
 * Level 1 is always unlocked.
 * All other levels require the previous level to be fully complete.
 *
 * @param {number} levelNum - Level number (1-7)
 * @param {string[]} completedIds - Array of completed workout IDs
 * @returns {boolean}
 */
export function isLevelUnlocked(levelNum, completedIds) {
  if (levelNum <= 1) return true
  return isLevelComplete(levelNum - 1, completedIds)
}

// ---------------------------------------------------------------------------
// Progress calculations
// ---------------------------------------------------------------------------

/**
 * Returns completion statistics for a given level.
 *
 * @param {number} levelNum - Level number (1-7)
 * @param {string[]} completedIds - Array of completed workout IDs
 * @returns {{ completed: number, total: number, isComplete: boolean }}
 */
export function getLevelProgress(levelNum, completedIds) {
  const level = BOXING_LEVEL_MAP[levelNum]
  if (!level) return { completed: 0, total: 0, isComplete: false }

  const total = level.workouts.length
  const completed = level.workouts.filter((w) => completedIds.includes(w.id)).length
  return {
    completed,
    total,
    isComplete: completed === total,
  }
}

// ---------------------------------------------------------------------------
// Next workout recommendation
// ---------------------------------------------------------------------------

/**
 * Returns the next recommended workout: the first workout across all levels
 * (in ascending level and order) that is (a) unlocked and (b) not yet complete.
 * Returns null when every workout in the curriculum has been completed.
 *
 * @param {{ completedWorkoutIds: string[] }} state - Boxing training state
 * @returns {object|null} The next WorkoutRound object, or null
 */
export function getNextWorkout(state) {
  const completedIds = state.completedWorkoutIds ?? []

  for (const level of BOXING_LEVELS) {
    // Skip levels that are not yet unlocked
    if (!isLevelUnlocked(level.level, completedIds)) continue

    // Workouts are already stored in ascending `order` in boxingPath.js
    for (const workout of level.workouts) {
      if (completedIds.includes(workout.id)) continue
      if (isWorkoutUnlocked(workout, completedIds)) return workout
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// State mutation (pure — returns new state, never mutates input)
// ---------------------------------------------------------------------------

/**
 * Returns a new boxing state after marking a workout as completed.
 * Idempotent: calling this function with the same workoutId a second time
 * returns state that is functionally identical to the first call.
 *
 * @param {object} state       - Current boxing training state
 * @param {string} workoutId   - ID of the workout being completed
 * @param {string} today       - ISO date string for today, e.g. '2026-08-29'
 * @returns {object} New boxing state
 */
export function completeWorkout(state, workoutId, today) {
  const alreadyCompleted = (state.completedWorkoutIds ?? []).includes(workoutId)

  // Idempotent: no changes when the workout was already completed
  if (alreadyCompleted) {
    return state
  }

  const newCompletedIds = [...(state.completedWorkoutIds ?? []), workoutId]

  // Determine the highest level for which all workouts are now done
  const topCompletedLevel = BOXING_LEVELS.reduce((highest, level) => {
    const allDone = level.workouts.every((w) => newCompletedIds.includes(w.id))
    return allDone ? level.level : highest
  }, state.currentLevel)

  // currentLevel advances to the next level when the current one is fully done,
  // but never exceeds the total number of levels.
  const maxLevel = BOXING_LEVELS[BOXING_LEVELS.length - 1]?.level ?? 7
  const newCurrentLevel = Math.min(topCompletedLevel + 1, maxLevel)

  return {
    ...state,
    completedWorkoutIds: newCompletedIds,
    lastWorkoutDate: today,
    totalSessions: (state.totalSessions ?? 0) + 1,
    currentLevel: Math.max(state.currentLevel, newCurrentLevel),
  }
}

// ---------------------------------------------------------------------------
// Technique tracking
// ---------------------------------------------------------------------------

/**
 * Returns a deduplicated array of all techniques the user has learned,
 * collected from every completed workout across all levels.
 *
 * @param {string[]} completedIds - Array of completed workout IDs
 * @returns {string[]} Flat, deduplicated list of technique strings
 */
export function getLearnedTechniques(completedIds) {
  const techniqueSet = new Set()

  for (const level of BOXING_LEVELS) {
    for (const workout of level.workouts) {
      if (!completedIds.includes(workout.id)) continue
      for (const technique of workout.techniques ?? []) {
        techniqueSet.add(technique)
      }
    }
  }

  return Array.from(techniqueSet)
}
