import { callGemini, geminiAvailable } from './geminiClient'
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
const TODAY   = () => new Date().toISOString().slice(0, 10)
const pathDoc = uid => doc(db, 'userPaths', uid)

// ── Fallback steps ────────────────────────────────────────────────────
function buildFallbackSteps(task) {
  return [
    { order: 1, action: `קרא את המשימה בעיון והגדר את נקודת ההתחלה`, duration_min: 5  },
    { order: 2, action: `בצע את הפעולה המרכזית: ${task.slice(0, 40)}`,  duration_min: 15 },
    { order: 3, action: `תעד מה עשית ומה השלב הבא`,                     duration_min: 5  },
  ]
}

// ── Gemini prompt ─────────────────────────────────────────────────────
function buildMicroPrompt(task, goal) {
  return (
    `פרק את המשימה הבאה ל-2 עד 4 צעדים קטנים. כל צעד 10-20 דקות.\n\n` +
    `משימה: "${task}"\n` +
    `הקשר מטרה: "${goal}"\n\n` +
    `החזר JSON תקין בלבד — ללא markdown, ללא backticks:\n` +
    `[{"order":1,"action":"...","duration_min":15},...]\n\n` +
    `כללים מוחלטים:\n` +
    `- עברית בלבד\n` +
    `- פועל ראשון: פתח/כתוב/בצע/קרא/תכנן/בדוק\n` +
    `- מקסימום 10 מילים לכל פעולה\n` +
    `- ללא שפת מוטיבציה\n` +
    `- כל צעד עצמאי — לא תלוי בצעד קודם`
  )
}

// ── Normalize Gemini output ───────────────────────────────────────────
function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return null
  const steps = raw.slice(0, 4).map((s, i) => ({
    order:        Number(s?.order        ?? i + 1),
    action:       String(s?.action       ?? ''),
    duration_min: Number(s?.duration_min ?? 15),
  })).filter(s => s.action.length > 2)
  return steps.length >= 1 ? steps : null
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Returns micro-steps array for the given day.
 * Cache order: pathRecord.micro_steps[day] → Gemini → fallback.
 * Generated steps are persisted to Firestore micro_steps map.
 */
export async function generateMicroSteps(uid, pathRecord, dayIndex) {
  const dayEntry = pathRecord.path?.roadmap?.[dayIndex - 1]
  if (!dayEntry) throw new Error(`Invalid day: ${dayIndex}`)

  // 1. Firestore cache (already on the document)
  const cached = pathRecord.micro_steps?.[String(dayIndex)]
  if (Array.isArray(cached) && cached.length > 0) return cached

  const task = dayEntry.task
  const goal = pathRecord.questionnaire?.goal || ''

  // 2. Generate via Gemini
  let steps
  if (!geminiAvailable()) {
    steps = buildFallbackSteps(task)
  } else {
    try {
      const raw = (await callGemini({ prompt: buildMicroPrompt(task, goal) }))
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      steps = normalizeSteps(JSON.parse(raw))
      if (!steps) throw new Error('empty')
    } catch {
      steps = buildFallbackSteps(task)
    }
  }

  // 3. Persist to Firestore (non-blocking — fire and forget)
  setDoc(pathDoc(uid), {
    micro_steps: { [String(dayIndex)]: steps },
    updatedAt:   TODAY(),
  }, { merge: true }).catch(() => {})

  return steps
}
