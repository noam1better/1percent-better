import { GoogleGenerativeAI } from '@google/generative-ai'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

const API_KEY     = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI       = API_KEY ? new GoogleGenerativeAI(API_KEY) : null
const TODAY       = () => new Date().toISOString().slice(0, 10)
const MIN_GAP     = 2   // days missed before mirror fires

// ── Fallback (no API key or Gemini failure) ───────────────────────────
function buildFallbackMessage(gapDays, motivation) {
  const why      = motivation?.deep_why           ? `"${motivation.deep_why}"`        : null
  const identity = motivation?.identity_statement ? motivation.identity_statement      : null

  let msg = `עברו ${gapDays} ימים מאז שהתקדמת.`
  if (why)      msg += ` אמרת: ${why}.`
  if (identity) msg += ` האם אתה עדיין ${identity}?`
  else          msg += ' האם אתה עדיין מחויב?'

  return msg
}

// ── Mirror prompt — direct, no fluff ─────────────────────────────────
function buildMirrorPrompt(gapDays, motivation) {
  return (
    `אתה מראה, לא מאמן. אל תנחם ואל תציע פתרונות.\n` +
    `המשתמש לא התקדם ${gapDays} ימים במסלול 30 הימים שלו.\n\n` +
    `הסיבה העמוקה שלו (מילותיו שלו): "${motivation.deep_why || '—'}"\n` +
    `הזהות שרצה לבנות (מילותיו שלו): "${motivation.identity_statement || '—'}"\n\n` +
    `כתוב משפט אחד בלבד בעברית. חוקים מוחלטים:\n` +
    `1. ציין את מספר הימים כעובדה קרה\n` +
    `2. צטט את מילותיו מילה במילה — ללא פרפרוז\n` +
    `3. סיים בשאלת כן/לא ישירה על מחויבותו לזהות\n` +
    `4. ללא הקדמה. ללא הזדהות. ללא "אני מבין". ללא הצעות.\n` +
    `5. מקסימום 35 מילה. החזר רק את המשפט — ללא מרכאות חיצוניות.\n\n` +
    `דוגמה לפורמט הנכון:\n` +
    `"עברו 3 ימים. אמרת שאתה 'אדם שמכבד את גופו'. האם אתה עדיין הוא?"`
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
  if (!genAI || !core_motivation?.deep_why) {
    message = buildFallbackMessage(gapDays, core_motivation)
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await Promise.race([
        model.generateContent(buildMirrorPrompt(gapDays, core_motivation)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ])
      message = result.response.text().trim().replace(/^["״]|["״]$/g, '')
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
