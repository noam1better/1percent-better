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

// Level name tiers — each tier covers a range of levels.
// getLevelName(level) → Hebrew title for display.
const LEVEL_TIERS = [
  { from: 1,  name: 'מגויס'  },
  { from: 3,  name: 'לוחם'   },
  { from: 6,  name: 'ממושמע' },
  { from: 10, name: 'מחויב'  },
  { from: 15, name: 'אליטה'  },
  { from: 21, name: 'PRIME'  },
  { from: 30, name: 'אגדה'   },
]

export function getLevelName(level) {
  const tier = [...LEVEL_TIERS].reverse().find(t => level >= t.from)
  return tier?.name || 'מגויס'
}
