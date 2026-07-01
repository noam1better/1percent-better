import { GoogleGenerativeAI } from '@google/generative-ai'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = new GoogleGenerativeAI(API_KEY)
const TODAY   = () => new Date().toISOString().slice(0, 10)

const pathDoc = uid => doc(db, 'userPaths', uid)

// ── Fallback (no API key or Gemini failure) ─────────────────────────
function buildFallbackPath(answers) {
  const phases = ['בניית יסודות', 'בניית תאוצה', 'לחץ ובחינה', 'שילוב ועוצמה']
  const tasks = [
    'בצע את ההרגל הראשון שלך ותעד אותו',
    'הוסף 5 דקות לפעילות הקודמת',
    'שמור על כל ההרגלים ביום אחד',
    'אתגר את עצמך מעבר לנוחות',
    'חזור על הבסיס — עקביות על פני עוצמה',
    'סיים את השבוע חזק — אל תוותר ביום האחרון',
    'יום אבן-דרך: סקור את השבוע, תכנן את הבא',
  ]
  return {
    path_name: `מסלול ה${answers.goal}`,
    tagline: 'כל יום הוא צעד קדימה. כל צעד בונה את מי שאתה.',
    daily_habits: [
      { id: 'h1', emoji: '🎯', title: 'כוונת בוקר',      description: 'מה המטרה האחת שתבצע היום? כתוב אותה.',    duration_min: 3  },
      { id: 'h2', emoji: '⚡', title: 'בלוק מיקוד',      description: `${answers.timeCommitment} של עשייה ממוקדת ללא הפרעות.`, duration_min: 20 },
      { id: 'h3', emoji: '📓', title: 'סיכום יומי',      description: 'מה עשיתי? מה הייתי עושה אחרת?',            duration_min: 3  },
    ],
    roadmap: Array.from({ length: 30 }, (_, i) => ({
      day:          i + 1,
      week:         Math.ceil((i + 1) / 7),
      phase:        phases[Math.floor(i / 7)],
      task:         tasks[i % tasks.length] + ` (יום ${i + 1})`,
      is_milestone: [7, 14, 21, 30].includes(i + 1),
    })),
    coach_note: 'המסלול שנבנה עבורך הוא בדיוק מה שאתה צריך. אין קיצורי דרך. רק עקביות.',
  }
}

// ── Gemini system prompt ─────────────────────────────────────────────
function buildPrompt(answers) {
  return (
    `אתה מאמן ביצועים אליטה — ישיר, מדויק, ולא מחמיא.\n` +
    `בנה תוכנית משמעת אישית ל-30 יום בעברית בלבד עבור המשתמש הזה:\n\n` +
    `פרופיל:\n` +
    `- מטרה ראשית: ${answers.goal}\n` +
    `- זמן יומי זמין: ${answers.timeCommitment}\n` +
    `- האתגר הגדול ביותר: ${answers.challenge}\n` +
    `- רמת ניסיון: ${answers.experience}\n` +
    `- שיא האנרגיה: ${answers.peakTime}\n\n` +
    `החזר JSON תקין בלבד (ללא markdown, ללא backticks, ללא כל טקסט נוסף):\n` +
    `{\n` +
    `  "path_name": "3-4 מילות כותרת חזקה ואישית בעברית",\n` +
    `  "tagline": "משפט אחד חזק בעברית",\n` +
    `  "daily_habits": [\n` +
    `    { "id": "h1", "emoji": "🎯", "title": "...", "description": "...", "duration_min": 5 },\n` +
    `    { "id": "h2", "emoji": "⚡", "title": "...", "description": "...", "duration_min": 20 },\n` +
    `    { "id": "h3", "emoji": "📓", "title": "...", "description": "...", "duration_min": 5 }\n` +
    `  ],\n` +
    `  "roadmap": [\n` +
    `    { "day": 1, "week": 1, "phase": "בניית יסודות", "task": "פעולה ספציפית ומדידה...", "is_milestone": false }\n` +
    `  ],\n` +
    `  "coach_note": "הודעה אישית ישירה למשתמש הזה בעברית"\n` +
    `}\n\n` +
    `כללים קריטיים:\n` +
    `- daily_habits: בדיוק 3 הרגלים המתאימים לזמן הזמין (${answers.timeCommitment})\n` +
    `- roadmap: בדיוק 30 רשומות — אחת לכל יום\n` +
    `  - ימים 1-7: phase "בניית יסודות"\n` +
    `  - ימים 8-14: phase "בניית תאוצה"\n` +
    `  - ימים 15-21: phase "לחץ ובחינה"\n` +
    `  - ימים 22-30: phase "שילוב ועוצמה"\n` +
    `  - ימים 7, 14, 21, 30 חייבים: is_milestone: true\n` +
    `  - כל task: ספציפי, מדיד, רלוונטי לאתגר ${answers.challenge}\n` +
    `- כל הטקסט בעברית בלבד`
  )
}

// ── Public API ───────────────────────────────────────────────────────

export async function buildCustomPath(uid, answers) {
  let pathData

  if (!API_KEY) {
    pathData = buildFallbackPath(answers)
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(buildPrompt(answers))
      const raw    = result.response.text().trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      pathData     = JSON.parse(raw)

      if (
        !pathData.path_name ||
        !Array.isArray(pathData.daily_habits) || pathData.daily_habits.length !== 3 ||
        !Array.isArray(pathData.roadmap)      || pathData.roadmap.length      !== 30
      ) throw new Error('Invalid structure')
    } catch {
      pathData = buildFallbackPath(answers)
    }
  }

  const record = {
    questionnaire: answers,
    path:          pathData,
    progress:      { currentDay: 1, startedAt: TODAY(), completedDays: [] },
    status:        'active',
    createdAt:     TODAY(),
    updatedAt:     TODAY(),
  }
  await setDoc(pathDoc(uid), record)
  return record
}

export async function loadCustomPath(uid) {
  try {
    const snap = await getDoc(pathDoc(uid))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

export async function completePathDay(uid, pathRecord) {
  const day      = pathRecord.progress?.currentDay || 1
  const prev     = pathRecord.progress?.completedDays || []
  const done     = [...prev.filter(d => d.day !== day), { day, completedAt: TODAY() }]
  const nextDay  = Math.min(day + 1, 30)
  const status   = done.length >= 30 ? 'completed' : 'active'

  const updated = {
    ...pathRecord,
    progress:  { ...pathRecord.progress, currentDay: nextDay, completedDays: done },
    status,
    updatedAt: TODAY(),
  }
  await setDoc(pathDoc(uid), updated)
  return updated
}

export async function rebuildPath(uid) {
  try {
    const snap = await getDoc(pathDoc(uid))
    if (snap.exists()) await setDoc(pathDoc(uid), { ...snap.data(), path: null, status: 'pending', updatedAt: TODAY() })
  } catch {}
}
