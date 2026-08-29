// Single source of truth for all XP rewards. Do not scatter these values across components.
// Streak rule: streak continues when user completes primary mission OR daily workout.
export const XP = {
  HABIT: 10,            // per small daily task (trigger)
  WORKOUT: 30,          // per workout session
  MISSION: 50,          // base primary mission (challenges use their own xpPerDay, fall back to this)
  SURPRISE_MISSION: 15, // bonus surprise mission — one per day, idempotent
  PERFECT_DAY: 20,      // bonus when all habits + mission + workout done
  PER_LEVEL: 100,       // XP needed per level
}
