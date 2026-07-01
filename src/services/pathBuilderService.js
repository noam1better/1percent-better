import { GoogleGenerativeAI } from '@google/generative-ai'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = new GoogleGenerativeAI(API_KEY)
const TODAY   = () => new Date().toISOString().slice(0, 10)

const pathDoc = uid => doc(db, 'userPaths', uid)

// ── Fallback path (no API key or Gemini failure) ─────────────────────
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
      { id: 'h1', emoji: '🎯', title: 'כוונת בוקר',  description: 'מה המטרה האחת שתבצע היום? כתוב אותה.',                   duration_min: 3  },
      { id: 'h2', emoji: '⚡', title: 'בלוק מיקוד',  description: `${answers.timeCommitment} של עשייה ממוקדת ללא הפרעות.`, duration_min: 20 },
      { id: 'h3', emoji: '📓', title: 'סיכום יומי',  description: 'מה עשיתי? מה הייתי עושה אחרת?',                           duration_min: 3  },
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

// ── Fallback lesson (no API key or Gemini failure) ───────────────────
function buildFallbackLesson(dayEntry, answers) {
  return {
    title:    `יום ${dayEntry.day}: ${dayEntry.task}`,
    concept:  `היום אנחנו מתמקדים בשלב "${dayEntry.phase}". המשימה שנבנתה עבורך: ${dayEntry.task}. שיעור זה יסביר את הרעיון המרכזי מאחורי המשימה ויתן לך את הכלים להצליח.`,
    deep_dive:
      `עקרון המשמעת האישית מבוסס על הבנה עמוקה של מנגנוני הרגל. המחקר של ד"ר פיליפה לאלי מאוניברסיטת קולג' לונדון הראה שנדרשים בממוצע 66 ימים ליצירת הרגל אמיתי — לא 21 ימים כפי שנהוג לחשוב. ההבדל המשמעותי הוא שב-21 הימים הראשונים הפעולה עדיין מצריכה כוח רצון. אחרי 66 יום היא הופכת אוטומטית.\n\nבשלב "${dayEntry.phase}" שבו אתה נמצא כעת, המוח שלך עובר תהליך של מחזור עצבי (neuroplasticity). כל פעם שאתה מבצע את ההרגל, אתה מחזק את הנתיב העצבי הקשור לפעולה. זה כמו שביל ביער — ככל שעוברים בו יותר, כך הוא הופך ברור ונגיש יותר.\n\nהמפתח להצלחה בשלב זה הוא להבין שהמוח מתנגד לשינוי לא מפני שהוא חלש — אלא מפני שהוא יעיל. כל הרגל קיים מטעמי חיסכון אנרגטי. כדי להחליף הרגל ישן, עליך ליצור "תגמול מיידי" שמגיע מהפעולה החדשה עצמה, לא רק מהתוצאה הסופית.\n\nהמדע אחורי ה"${answers.goal}" מראה שהעקביות חשובה פי עשרה מהעוצמה. 10 דקות כל יום עדיפות על 2 שעות פעם בשבוע. הסיבה: השינוי הנוירולוגי מצטבר רק כאשר הגירוי חוזר על עצמו בתדירות גבוהה.`,
    case_study:
      `ג'יימס קליר, מחבר הרב-מכר "Atomic Habits", עבד עם קבוצת הרכיבה הבריטית על אופניים לפני אולימפיאדת 2012. הקבוצה הייתה בינונית — אפס מדליות זהב ב-110 שנות תחרות. המאמן דייב ברייסלספורד החל ליישם את עיקרון ה"1% שיפור" בכל תחום: תנוחת שינה, תזונה, ניקוי ידיים למניעת מחלות, זווית האוכף, חומרי חיכוך על הגלגלים. כל שיפור בפני עצמו היה זניח. הצטברות כל השיפורים הייתה מהפכנית. ב-2012 הם ניצחו 8 מדליות זהב מתוך 10 אפשריות. שיעור אחד: אל תחפש את השינוי הגדול. חפש 100 שינויים קטנים.`,
    pro_tip:
      `רוב האנשים מודדים הצלחה בתוצאה ("ירדתי 5 קילו", "השלמתי פרויקט"). המקצוענים מודדים הצלחה בזהות ("אני אדם שמתאמן כל יום", "אני אדם שמסיים מה שהוא מתחיל"). ההבדל הוא קריטי: כשאתה מתמקד בתוצאה, כל יום שלא רואים תוצאה הוא כישלון. כשאתה מתמקד בזהות, כל יום שביצעת את ההרגל הוא הצלחה — גם אם התוצאה עדיין לא נראית. הזהות מקדימה תמיד את התוצאה.`,
    challenge:
      `האתגר שלך להיום: ${dayEntry.task}.\n\nצעד 1: לפני שאתה מבצע — כתוב בכתב יד (לא בטלפון) את המחשבה הראשונה שעולה לך כשאתה חושב על המשימה הזו. פחד? ספק? התרגשות?\n\nצעד 2: בצע את המשימה עצמה ללא הפרעות. טלפון בשקט. לא 'בעוד רגע'.\n\nצעד 3: מיד אחרי הסיום — כתוב 3 משפטים: מה הרגשת, מה הפתיע אותך, ומה תשמור על זה למחר.`,
    duration_min: 15,
  }
}

// ── Path generation prompt ───────────────────────────────────────────
function buildPathPrompt(answers) {
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

// ── Day lesson prompt ────────────────────────────────────────────────
function buildLessonPrompt(dayEntry, pathRecord) {
  const q = pathRecord.questionnaire || {}
  return (
    `אתה מאמן ביצועים אליטה שכותב שיעור אימון פרמיום ברמת מומחה.\n\n` +
    `פרטי המשתמש:\n` +
    `- תוכנית: ${pathRecord.path?.path_name || ''}\n` +
    `- מטרה: ${q.goal || ''}\n` +
    `- אתגר: ${q.challenge || ''}\n` +
    `- ניסיון: ${q.experience || ''}\n` +
    `- יום: ${dayEntry.day} מתוך 30 | שלב: ${dayEntry.phase}\n` +
    `- משימת היום: ${dayEntry.task}\n\n` +
    `כתוב שיעור מקיף ומעמיק בעברית. החזר JSON תקין בלבד (ללא markdown, ללא backticks):\n` +
    `{\n` +
    `  "title": "כותרת מושכת וחזקה של 5-8 מילים",\n` +
    `  "concept": "פסקת פתיחה — מה השיעור הזה נותן למשתמש (2-3 משפטים)",\n` +
    `  "deep_dive": "הסבר מעמיק ומחקרי של 400+ מילה. כלול: מנגנונים פסיכולוגיים, עובדות מדעיות, עקרונות שלא ניתן למצוא בחיפוש גוגל בסיסי. כתוב צפוף ועשיר — לא שטחי. אין כוכביות או markdown.",\n` +
    `  "case_study": "דוגמה אמיתית מהעולם (150+ מילה). ציין שמות, חברות, תאריכים ספציפיים. הסבר מה קרה ומדוע זה רלוונטי למשתמש.",\n` +
    `  "pro_tip": "תובנה נסתרת אחת שרוב האנשים לא מגלים (100+ מילה). לא עצה בסיסית — משהו שרק מקצוענים יודעים.",\n` +
    `  "challenge": "האתגר הספציפי להיום (100+ מילה). שלבים מדויקים, ניתנים לביצוע ביום זה. כלול: מה לעשות, איך לעשות, ומה לתעד.",\n` +
    `  "duration_min": 20\n` +
    `}\n\n` +
    `דרישות: כל הטקסט בעברית. deep_dive חייב להיות לפחות 400 מילה. ללא markdown בתוך הטקסט.`
  )
}

// ── Lesson cache (localStorage) ──────────────────────────────────────
function lessonCacheKey(day, createdAt) { return `prime_lesson_${createdAt}_d${day}` }

function getCachedLesson(day, createdAt) {
  try { return JSON.parse(localStorage.getItem(lessonCacheKey(day, createdAt))) || null }
  catch { return null }
}

function setCachedLesson(day, createdAt, lesson) {
  try { localStorage.setItem(lessonCacheKey(day, createdAt), JSON.stringify(lesson)) } catch {}
}

// ── Timeout helper ───────────────────────────────────────────────────
function withTimeout(promise, ms, code) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error(code), { code })), ms)
    ),
  ])
}

// ── Data sanitizers ───────────────────────────────────────────────────
// Firestore rejects: undefined values, nested arrays, NaN, Infinity.
function deepSanitize(val) {
  if (val === undefined || (typeof val === 'number' && !isFinite(val))) return null
  if (val === null || typeof val !== 'object') return val
  if (Array.isArray(val)) {
    // flatten any nested arrays into strings to avoid Firestore invalid-argument
    return val.map(item => Array.isArray(item) ? JSON.stringify(item) : deepSanitize(item))
  }
  return Object.fromEntries(
    Object.entries(val)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deepSanitize(v)])
  )
}

// Coerce Gemini output to the exact types Firestore + the UI expect.
function normalizePathData(raw) {
  const str = v => (typeof v === 'string' ? v : String(v ?? ''))
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0 }
  const bool = v => v === true || v === 'true' || v === 1

  const habits = (Array.isArray(raw.daily_habits) ? raw.daily_habits : []).slice(0, 3).map((h, i) => ({
    id:           str(h?.id   || `h${i + 1}`),
    emoji:        str(h?.emoji || '🎯'),
    title:        str(h?.title || ''),
    description:  str(h?.description || ''),
    duration_min: num(h?.duration_min ?? 5),
  }))

  const roadmap = (Array.isArray(raw.roadmap) ? raw.roadmap : []).slice(0, 30).map((r, i) => ({
    day:          num(r?.day  ?? i + 1),
    week:         num(r?.week ?? Math.ceil((i + 1) / 7)),
    phase:        str(r?.phase || ''),
    task:         str(r?.task  || ''),
    is_milestone: bool(r?.is_milestone),
  }))

  return {
    path_name:    str(raw.path_name),
    tagline:      str(raw.tagline),
    daily_habits: habits,
    roadmap,
    coach_note:   str(raw.coach_note),
  }
}

// ── Public API ───────────────────────────────────────────────────────

// onStatus(step) fires with: 'ai' (calling Gemini) | 'saving' (writing Firestore)
export async function buildCustomPath(uid, answers, onStatus) {
  let pathData

  onStatus?.('ai')

  if (!API_KEY) {
    pathData = buildFallbackPath(answers)
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await withTimeout(
        model.generateContent(buildPathPrompt(answers)),
        20000,
        'GEMINI_TIMEOUT'
      )
      const raw = result.response.text().trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(raw)
      pathData = normalizePathData(parsed)

      if (
        !pathData.path_name ||
        pathData.daily_habits.length !== 3 ||
        pathData.roadmap.length      !== 30
      ) throw new Error('INVALID_STRUCTURE')
    } catch (err) {
      if (err.code === 'GEMINI_TIMEOUT') throw err
      pathData = buildFallbackPath(answers)
    }
  }

  onStatus?.('saving')

  const record = deepSanitize({
    questionnaire: answers,
    path:          pathData,
    progress:      { currentDay: 1, startedAt: TODAY(), completedDays: [] },
    status:        'active',
    createdAt:     TODAY(),
    updatedAt:     TODAY(),
  })

  console.log('[pathBuilder] writing record to Firestore:', JSON.stringify(record, null, 2))

  try {
    await withTimeout(setDoc(pathDoc(uid), record), 10000, 'FIRESTORE_TIMEOUT')
  } catch (err) {
    console.error('[pathBuilder] Firestore write failed:', err.code, err.message, record)
    throw err
  }
  return record
}

export async function loadCustomPath(uid) {
  try {
    const snap = await getDoc(pathDoc(uid))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

// On-demand lesson generation. Checks localStorage → Firestore → Gemini.
// Generated lesson is persisted to both caches so subsequent loads are instant.
export async function generateDayLesson(uid, pathRecord, dayIndex) {
  const dayEntry  = pathRecord.path?.roadmap?.[dayIndex - 1]
  if (!dayEntry) throw new Error(`Invalid day index: ${dayIndex}`)

  const createdAt = pathRecord.createdAt || TODAY()

  // 1. localStorage cache (fastest)
  const cached = getCachedLesson(dayIndex, createdAt)
  if (cached) return cached

  // 2. Firestore cache (cross-device)
  const stored = pathRecord.lessons?.[String(dayIndex)]
  if (stored) {
    setCachedLesson(dayIndex, createdAt, stored)
    return stored
  }

  // 3. Generate via Gemini (or fallback)
  let lesson
  if (!API_KEY) {
    lesson = buildFallbackLesson(dayEntry, pathRecord.questionnaire || {})
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(buildLessonPrompt(dayEntry, pathRecord))
      const raw    = result.response.text().trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      lesson = JSON.parse(raw)
      if (!lesson.title || !lesson.deep_dive) throw new Error('Invalid lesson')
    } catch {
      lesson = buildFallbackLesson(dayEntry, pathRecord.questionnaire || {})
    }
  }

  // Persist to localStorage + Firestore (merge so we don't overwrite other lessons)
  setCachedLesson(dayIndex, createdAt, lesson)
  try {
    await setDoc(
      pathDoc(uid),
      { lessons: { [String(dayIndex)]: { ...lesson, generatedAt: TODAY() } } },
      { merge: true }
    )
  } catch {}

  return lesson
}

export async function completePathDay(uid, pathRecord) {
  const day     = pathRecord.progress?.currentDay || 1
  const prev    = pathRecord.progress?.completedDays || []
  const done    = [...prev.filter(d => d.day !== day), { day, completedAt: TODAY() }]
  const nextDay = Math.min(day + 1, 30)
  const status  = done.length >= 30 ? 'completed' : 'active'

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
