/**
 * combatProgress.js
 * Generic combat training progression engine.
 * Call createCombatProgressionEngine(LEVELS) to get a bound engine.
 * No React, no Firebase, no discipline-specific imports.
 */

// ---------------------------------------------------------------------------
// Generic unlock logic (shared, stateless)
// ---------------------------------------------------------------------------

export function isWorkoutUnlocked(workout, completedIds) {
  if (!workout.prerequisites || workout.prerequisites.length === 0) return true
  return workout.prerequisites.every((id) => completedIds.includes(id))
}

// ---------------------------------------------------------------------------
// Engine factory
// ---------------------------------------------------------------------------

/**
 * Creates a progression engine bound to a specific discipline's LEVELS array.
 *
 * @param {Array} LEVELS - Array of level objects (each with .level, .workouts[])
 * @returns {object} Progression engine with all standard methods
 */
export function createCombatProgressionEngine(LEVELS) {
  const LEVEL_MAP = Object.fromEntries(LEVELS.map((lv) => [lv.level, lv]))

  function getWorkoutById(id) {
    for (const level of LEVELS) {
      const workout = level.workouts.find((w) => w.id === id)
      if (workout !== undefined) return workout
    }
    return null
  }

  function getLevelForWorkout(id) {
    for (const level of LEVELS) {
      if (level.workouts.some((w) => w.id === id)) return level.level
    }
    return null
  }

  function isLevelComplete(levelNum, completedIds) {
    const level = LEVEL_MAP[levelNum]
    if (!level) return false
    return level.workouts.every((w) => completedIds.includes(w.id))
  }

  function isLevelUnlocked(levelNum, completedIds) {
    if (levelNum <= 1) return true
    return isLevelComplete(levelNum - 1, completedIds)
  }

  function getLevelProgress(levelNum, completedIds) {
    const level = LEVEL_MAP[levelNum]
    if (!level) return { completed: 0, total: 0, isComplete: false }
    const total     = level.workouts.length
    const completed = level.workouts.filter((w) => completedIds.includes(w.id)).length
    return { completed, total, isComplete: completed === total }
  }

  function getNextWorkout(state) {
    const completedIds = state.completedWorkoutIds ?? []
    for (const level of LEVELS) {
      if (!isLevelUnlocked(level.level, completedIds)) continue
      for (const workout of level.workouts) {
        if (completedIds.includes(workout.id)) continue
        if (isWorkoutUnlocked(workout, completedIds)) return workout
      }
    }
    return null
  }

  function completeWorkout(state, workoutId, today) {
    const alreadyCompleted = (state.completedWorkoutIds ?? []).includes(workoutId)
    if (alreadyCompleted) return state

    const newCompletedIds = [...(state.completedWorkoutIds ?? []), workoutId]

    const topCompletedLevel = LEVELS.reduce((highest, level) => {
      const allDone = level.workouts.every((w) => newCompletedIds.includes(w.id))
      return allDone ? level.level : highest
    }, state.currentLevel)

    const maxLevel       = LEVELS[LEVELS.length - 1]?.level ?? 7
    const newCurrentLevel = Math.min(topCompletedLevel + 1, maxLevel)

    return {
      ...state,
      completedWorkoutIds: newCompletedIds,
      lastWorkoutDate:     today,
      totalSessions:       (state.totalSessions ?? 0) + 1,
      currentLevel:        Math.max(state.currentLevel, newCurrentLevel),
    }
  }

  function getLearnedTechniques(completedIds) {
    const set = new Set()
    for (const level of LEVELS) {
      for (const workout of level.workouts) {
        if (!completedIds.includes(workout.id)) continue
        for (const t of workout.techniques ?? []) set.add(t)
      }
    }
    return Array.from(set)
  }

  return {
    getWorkoutById,
    getLevelForWorkout,
    isLevelComplete,
    isLevelUnlocked,
    getLevelProgress,
    getNextWorkout,
    completeWorkout,
    getLearnedTechniques,
  }
}
