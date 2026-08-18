import { callGemini, geminiAvailable } from './geminiClient'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
const TODAY       = () => new Date().toISOString().slice(0, 10)
const MIN_GAP     = 2   // days missed before mirror fires

// ── Fallback (no API key or Gemini failure) ───────────────────────────
function buildFallbackMessage(gapDays, motivation) {
  const identity = motivation?.identity_statement || null
  if (identity) {
    return `הפסקה קטנה, לא סוף הדרך. עברו ${gapDays} ימים — ואתה עדיין ${identity}. עכשיו זה הרגע לחזור לעצמך.`
  }
  return `הפסקה קטנה, לא סוף הדרך. ${gapDays} ימים חלפו — עכשיו זה הרגע לאפס ולהמשיך קדימה.`
}

// ── Mirror prompt — empowering, reset-and-forward ────────────────────
function buildMirrorPrompt(gapDays, motivation) {
  return (
    `אתה מאמן שמחזיר משתמשים למסלול בטון מעצים ולא מאשים.\n` +
    `המשתמש לא התקדם ${gapDays} ימים במסלול 30 הימים שלו.\n\n` +
    `הסיבה העמוקה שלו: "${motivation.deep_why || '—'}"\n` +
    `הזהות שרצה לבנות: "${motivation.identity_statement || '—'}"\n\n` +
    `כתוב משפט אחד בלבד בעברית. חוקים מוחלטים:\n` +
    `1. פתח עם "הפסקה קטנה, לא סוף הדרך"\n` +
    `2. ציין את מספר הימים כעובדה ניטרלית — ללא האשמה\n` +
    `3. סיים עם קריאה חיובית לחזרה ("עכשיו זה הרגע לחזור לעצמך")\n` +
    `4. ללא שאלות. ללא "האם". ללא האשמה. ללא פרפרוז.\n` +
    `5. מקסימום 30 מילה. החזר רק את המשפט — ללא מרכאות חיצוניות.\n\n` +
    `דוגמה לפורמט:\n` +
    `"הפסקה קטנה, לא סוף הדרך. ${gapDays} ימים חלפו — עכשיו זה הרגע לחזור לעצמך."`
  )
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Returns { gapDays, message } if mirror should fire, or null if not.
 * Does NOT update Firestore — caller does that after user responds.
 */
export async function checkAndGenerateMirror(pathRecord) {
  const { consistency, core_motivation, progress } = pathRecord

  if (!consistency?.last_completed_date)       return null
  if (consistency.mirror_triggered)            return null
  if (!progress?.currentDay || progress.currentDay <= 1) return null  // never completed a day yet

  const gapDays = Math.round(
    (new Date(TODAY()) - new Date(consistency.last_completed_date)) / 86_400_000
  )
  if (gapDays < MIN_GAP) return null

  // Generate mirror message
  let message
  if (!geminiAvailable() || !core_motivation?.deep_why) {
    message = buildFallbackMessage(gapDays, core_motivation)
  } else {
    try {
      message = (await callGemini({ prompt: buildMirrorPrompt(gapDays, core_motivation) })).replace(/^["״]|["״]$/g, '')
      if (!message || message.length < 10) throw new Error('empty')
    } catch {
      message = buildFallbackMessage(gapDays, core_motivation)
    }
  }

  return { gapDays, message }
}

/**
 * Marks mirror as triggered so it doesn't fire again until next completion resets it.
 */
export async function setMirrorTriggered(uid) {
  try {
    await updateDoc(doc(db, 'userPaths', uid), {
      'consistency.mirror_triggered': true,
      updatedAt: TODAY(),
    })
  } catch {}
}
