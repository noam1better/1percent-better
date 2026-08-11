import { GoogleGenerativeAI } from '@google/generative-ai'
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = new GoogleGenerativeAI(API_KEY)
const TODAY   = () => new Date().toISOString().slice(0, 10)

const pathDoc           = uid => doc(db, 'userPaths', uid)
const historyCollection = uid => collection(db, 'userPaths', uid, 'history')

// ── Goal string helper ────────────────────────────────────────────────
function getGoalStr(visionProfile) {
  if (visionProfile?.three_year_vision?.trim())
    return visionProfile.three_year_vision.trim().slice(0, 120)
  return 'משמעת'
}

// ── Fallback path (no API key or Gemini failure) ─────────────────────
const PILLAR_CYCLE = ['builder', 'creator', 'connection', 'reset']

function buildFallbackPath(visionProfile) {
  const goalStr = getGoalStr(visionProfile)
  const phases  = ['יסודות', 'צמיחה', 'ביצועים', 'שילוב']
  const tasks   = [
    'בצע את ההרגל הראשון שלך ותעד אותו',
    'הוסף 5 דקות לפעילות הקודמת',
    'שמור על כל ההרגלים ביום אחד',
    'אתגר את עצמך מעבר לנוחות',
    'חזור על הבסיס — עקביות על פני עוצמה',
    'סיים את השבוע חזק — אל תוותר ביום האחרון',
    'יום אבן-דרך: סקור את השבוע, תכנן את הבא',
  ]
  const nns = Array.isArray(visionProfile?.non_negotiables)
    ? visionProfile.non_negotiables.filter(Boolean)
    : []
  return {
    path_name:    `מסלול ה${goalStr.slice(0, 20)}`,
    tagline:      'כל יום הוא צעד קדימה. כל צעד בונה את מי שאתה.',
    daily_habits: [
      { id: 'h1', emoji: '🔒', title: nns[0] || 'הרגל אי-פשרה ראשון', description: 'הרגל יסודי שאי אפשר לדלג עליו.', duration_min: 20 },
      { id: 'h2', emoji: '⚡', title: nns[1] || 'בלוק מיקוד',          description: '30 דקות של עשייה ממוקדת ללא הפרעות.',  duration_min: 30 },
      { id: 'h3', emoji: '📓', title: 'סיכום יומי',                    description: 'מה עשיתי? מה הייתי עושה אחרת?',          duration_min: 5  },
    ],
    roadmap: Array.from({ length: 30 }, (_, i) => ({
      day:          i + 1,
      week:         Math.ceil((i + 1) / 7),
      phase:        phases[Math.floor(i / 7)],
      task:         tasks[i % tasks.length] + ` (יום ${i + 1})`,
      pillar:       PILLAR_CYCLE[i % 4],
      is_milestone: [7, 14, 21, 30].includes(i + 1),
    })),
    coach_note: 'המסלול שנבנה עבורך הוא בדיוק מה שאתה צריך. אין קיצורי דרך. רק עקביות.',
  }
}

// ── Fallback lesson (no API key or Gemini failure) ───────────────────
function buildFallbackLesson(dayEntry, pathRecord) {
  const vp      = pathRecord.vision_profile || {}
  const goalStr = vp.three_year_vision?.slice(0, 80) || 'משמעת'
  return {
    title:    `יום ${dayEntry.day}: ${dayEntry.task}`,
    concept:  `היום אנחנו מתמקדים בשלב "${dayEntry.phase}". המשימה שנבנתה עבורך: ${dayEntry.task}. שיעור זה יסביר את הרעיון המרכזי מאחורי המשימה ויתן לך את הכלים להצליח.`,
    deep_dive:
      `עקרון המשמעת האישית מבוסס על הבנה עמוקה של מנגנוני הרגל. המחקר של ד"ר פיליפה לאלי מאוניברסיטת קולג' לונדון הראה שנדרשים בממוצע 66 ימים ליצירת הרגל אמיתי — לא 21 ימים כפי שנהוג לחשוב. ההבדל המשמעותי הוא שב-21 הימים הראשונים הפעולה עדיין מצריכה כוח רצון. אחרי 66 יום היא הופכת אוטומטית.\n\nבשלב "${dayEntry.phase}" שבו אתה נמצא כעת, המוח שלך עובר תהליך של מחזור עצבי (neuroplasticity). כל פעם שאתה מבצע את ההרגל, אתה מחזק את הנתיב העצבי הקשור לפעולה. זה כמו שביל ביער — ככל שעוברים בו יותר, כך הוא הופך ברור ונגיש יותר.\n\nהמפתח להצלחה בשלב זה הוא להבין שהמוח מתנגד לשינוי לא מפני שהוא חלש — אלא מפני שהוא יעיל. כל הרגל קיים מטעמי חיסכון אנרגטי. כדי להחליף הרגל ישן, עליך ליצור "תגמול מיידי" שמגיע מהפעולה החדשה עצמה, לא רק מהתוצאה הסופית.\n\nהמדע אחורי ה"${goalStr}" מראה שהעקביות חשובה פי עשרה מהעוצמה. 10 דקות כל יום עדיפות על 2 שעות פעם בשבוע. הסיבה: השינוי הנוירולוגי מצטבר רק כאשר הגירוי חוזר על עצמו בתדירות גבוהה.`,
    case_study:
      `ג'יימס קליר, מחבר הרב-מכר "Atomic Habits", עבד עם קבוצת הרכיבה הבריטית על אופניים לפני אולימפיאדת 2012. הקבוצה הייתה בינונית — אפס מדליות זהב ב-110 שנות תחרות. המאמן דייב ברייסלספורד החל ליישם את עיקרון ה"1% שיפור" בכל תחום: תנוחת שינה, תזונה, ניקוי ידיים למניעת מחלות, זווית האוכף, חומרי חיכוך על הגלגלים. כל שיפור בפני עצמו היה זניח. הצטברות כל השיפורים הייתה מהפכנית. ב-2012 הם ניצחו 8 מדליות זהב מתוך 10 אפשריות. שיעור אחד: אל תחפש את השינוי הגדול. חפש 100 שינויים קטנים.`,
    pro_tip:
      `רוב האנשים מודדים הצלחה בתוצאה ("ירדתי 5 קילו", "השלמתי פרויקט"). המקצוענים מודדים הצלחה בזהות ("אני אדם שמתאמן כל יום", "אני אדם שמסיים מה שהוא מתחיל"). ההבדל הוא קריטי: כשאתה מתמקד בתוצאה, כל יום שלא רואים תוצאה הוא כישלון. כשאתה מתמקד בזהות, כל יום שביצעת את ההרגל הוא הצלחה — גם אם התוצאה עדיין לא נראית.`,
    challenge:
      `האתגר שלך להיום: ${dayEntry.task}.\n\nצעד 1: לפני שאתה מבצע — כתוב בכתב יד (לא בטלפון) את המחשבה הראשונה שעולה לך כשאתה חושב על המשימה הזו.\n\nצעד 2: בצע את המשימה עצמה ללא הפרעות. טלפון בשקט. לא 'בעוד רגע'.\n\nצעד 3: מיד אחרי הסיום — כתוב 3 משפטים: מה הרגשת, מה הפתיע אותך, ומה תשמור על זה למחר.`,
    duration_min: 15,
  }
}

// ── Path generation prompt ───────────────────────────────────────────
function buildPathPrompt(visionProfile) {
  const vp     = visionProfile || {}
  const vision = (vp.three_year_vision || '').trim()
  const gap    = (vp.the_gap || '').trim()
  const cvArr  = Array.isArray(vp.core_values)    ? vp.core_values.filter(Boolean)    : []
  const nnArr  = Array.isArray(vp.non_negotiables) ? vp.non_negotiables.filter(Boolean) : []
  const cv     = cvArr.map((v, i) => `${i + 1}. ${v}`).join('\n') || '—'
  const nn     = nnArr.map((v, i) => `${i + 1}. ${v}`).join('\n') || '—'
  const nn1    = nnArr[0] || 'הרגל Non-Negotiable ראשון'
  const nn2    = nnArr[1] || 'הרגל Non-Negotiable שני'
  const gapShort = gap.slice(0, 50)

  return [
    `אתה "פריים קואץ'" — מאמן ביצועים אליטה. לא מחמיא. לא גנרי. לא סיסמאות.`,
    `המשימה שלך: לבנות מסלול 30 יום שמוביל ישירות מ"הפער" ל"חזון" של האדם הספציפי שלפניך.`,
    ``,
    `══════════════════════════════════`,
    `פרופיל המשתמש — קרא בעיון לפני שכתבת מילה אחת:`,
    `══════════════════════════════════`,
    ``,
    `🔭 איפה הוא רוצה להיות בעוד 3 שנים:`,
    `"${vision || 'לא צוין'}"`,
    ``,
    `⛰️ מה עוצר אותו עכשיו — הפער שחייב להיסגר:`,
    `"${gap || 'לא צוין'}"`,
    ``,
    `💎 ערכי ליבה שחייב לגלם בכל יום:`,
    cv,
    ``,
    `🔒 הרגלי אי-פשרה — הדברים שלא ניתן לדלג עליהם:`,
    nn,
    ``,
    `══════════════════════════════════`,
    `ארכיטקטורת המסלול — 4 שבועות, 4 שלבים:`,
    `══════════════════════════════════`,
    ``,
    `שבוע 1 | phase: "יסודות" | weekly_theme: "פריצת מחסום — ${gapShort}"`,
    `→ כל משימה שוברת את ההרגל/מחסום שגורם לפער הזה. בסיס אמיתי, לא מנטרות.`,
    ``,
    `שבוע 2 | phase: "צמיחה" | weekly_theme: "בניית שריר — ${gapShort}"`,
    `→ כל משימה מעמיקה את ערכי הליבה ובונה תאוצה על הבסיס של שבוע 1.`,
    ``,
    `שבוע 3 | phase: "ביצועים" | weekly_theme: "פריצת תקרה — ${gapShort}"`,
    `→ משימות שיוצאות מהנוחות. זה השבוע שרוב האנשים נשברים. המשתמש הזה לא.`,
    ``,
    `שבוע 4 | phase: "שילוב" | weekly_theme: "גיבוש זהות — ${gapShort}"`,
    `→ אחד את כל מה שנבנה. עד יום 30 הוא כבר לא מי שהיה.`,
    ``,
    `══════════════════════════════════`,
    `חוקים חמורים — הפרה = פסילה:`,
    `══════════════════════════════════`,
    ``,
    `🚫 אסור בהחלט לכתוב:`,
    `• משימות גנריות: "קרא ספר", "כתוב ביומן", "שתה מים", "צא לטבע"`,
    `• סיסמאות ריקות: "היה ממוקד", "תחשוב חיובי", "תן 100%"`,
    `• משימות שלא מזכירות את הפער או החזון הספציפיים`,
    ``,
    `✅ כך נראית משימה טובה (נוסחה: פעולה + מה בדיוק + קשר לפער):`,
    `→ "כתוב 3 פעולות ספציפיות שיסגרו את '${gapShort}' השבוע — כל אחת עם שעה ומיקום"`,
    `→ "בצע את '${nn1}' בדיוק 7 דקות אחרי קימה — אין טלפון לפני שסיימת"`,
    `→ "זהה את הדבר שגורם לפער '${gapShort}' להישאר פתוח — וכתוב תוכנית לסגור אותו ב-24 שעות"`,
    ``,
    `══════════════════════════════════`,
    `פורמט הפלט — JSON תקין בלבד:`,
    `══════════════════════════════════`,
    `ללא backticks. ללא markdown. ללא טקסט לפני/אחרי. JSON בלבד.`,
    ``,
    `{`,
    `  "path_name": "3-4 מילים — כותרת אישית חזקה הנוגעת ישירות לחזון ולפער",`,
    `  "tagline": "משפט אחד — קצר, חד, מחויב. לא השראה זולה. לא 'אתה יכול!'",`,
    `  "daily_habits": [`,
    `    { "id": "h1", "emoji": "🔒", "title": "${nn1}", "description": "למה הרגל זה סוגר את הפער — קצר ומדויק", "duration_min": 20, "pillar": "reset" },`,
    `    { "id": "h2", "emoji": "⚡", "title": "${nn2}", "description": "תיאור קצר — קשר ישיר לחזון", "duration_min": 30, "pillar": "builder" },`,
    `    { "id": "h3", "emoji": "📓", "title": "מדידה יומית", "description": "מה זז היום לכיוון הסגירת '${gapShort}'?", "duration_min": 5, "pillar": "creator" }`,
    `  ],`,
    `  "roadmap": [`,
    `    { "day": 1, "week": 1, "phase": "יסודות", "weekly_theme": "פריצת מחסום — ${gapShort}", "task": "פעולה ספציפית, מדידה, קשורה ישירות לפרוץ הפער", "pillar": "builder", "is_milestone": false },`,
    `    ... (29 רשומות נוספות — יום 2 עד יום 30)`,
    `  ],`,
    `  "coach_note": "2-3 משפטים — מתייחסים ישירות לפער '${gap.slice(0, 60)}' ולחזון. ישיר. אמיתי. לא מחמיא."`,
    `}`,
    ``,
    `כללים אחרונים:`,
    `• daily_habits: בדיוק 3. h1 = "${nn1}" verbatim`,
    `• roadmap: בדיוק 30 אובייקטים. אחד לכל יום.`,
    `• ימים 7, 14, 21, 30 → is_milestone: true`,
    `• pillar: אחד בלבד מ: "builder" | "creator" | "connection" | "reset"`,
    `• weekly_theme: אותו ערך לכל ימי אותו שבוע`,
    `• הכל בעברית — אפס אנגלית בתוך הטקסטים`,
  ].join('\n')
}

// ── Day lesson prompt ────────────────────────────────────────────────
function buildLessonPrompt(dayEntry, pathRecord) {
  const vp         = pathRecord.vision_profile || {}
  const vision     = (vp.three_year_vision || '').trim()
  const gap        = (vp.the_gap || '').trim()
  const cv         = Array.isArray(vp.core_values)    ? vp.core_values.filter(Boolean).join(' | ')    : '—'
  const nn         = Array.isArray(vp.non_negotiables) ? vp.non_negotiables.filter(Boolean).join(' | ') : '—'
  const weekTheme  = dayEntry.weekly_theme || dayEntry.phase || ''
  const weekNum    = dayEntry.week || Math.ceil(dayEntry.day / 7)

  return [
    `══ PRIME COACH — LESSON BRIEF ══`,
    ``,
    `אתה "פריים קואץ'" — מאמן ביצועים אליטה. אתה כותב שיעורים שמשנים חיים.`,
    `הכלל: כל מילה בשיעור חייבת להיות רלוונטית לאדם הספציפי שלפניך — לא לאדם גנרי.`,
    ``,
    `══ פרופיל המשתמש ══`,
    `חזון 3 שנים: "${vision || '—'}"`,
    `הפער שצריך לסגור: "${gap || '—'}"`,
    `ערכי ליבה: ${cv}`,
    `Non-Negotiables: ${nn}`,
    ``,
    `══ פרטי השיעור ══`,
    `יום ${dayEntry.day} / 30 | שבוע ${weekNum} | שלב: ${dayEntry.phase}`,
    `נושא השבוע: ${weekTheme}`,
    `משימת היום: "${dayEntry.task}"`,
    ``,
    `══ מה נדרש ממך ══`,
    ``,
    `כתוב שיעור שמסביר למה משימת היום הזו עוזרת לסגור את הפער הספציפי הזה.`,
    `לא שיעור על "הרגלים בכלל" — שיעור על הפער "${gap.slice(0, 80)}", המשתמש הזה, הרגע הזה.`,
    ``,
    `DEEP_DIVE (חובה 400+ מילה):`,
    `• הסבר את המנגנון הפסיכולוגי/נוירולוגי/התנהגותי שגורם לפער הזה להיות עיקש`,
    `• הסבר למה משימת היום שוברת בדיוק את המנגנון הזה`,
    `• כלול: מחקרים עם שמות חוקרים, עובדות כמותיות, מנגנוני מוח ספציפיים`,
    `• כתוב צפוף ועשיר. אין ניסוחים כלליים. אין "חשוב לדעת". אין bullet points.`,
    ``,
    `CASE_STUDY (150+ מילה):`,
    `• אדם/חברה/ספורטאי שעמד בפני פער דומה לפרופיל הזה — ופרץ אותו`,
    `• שם מלא + מקום + שנה + תוצאה מדויקת (מספרים, שינוי מוחשי)`,
    `• בחר דוגמה מדומיין רלוונטי לחזון: "${vision.slice(0, 60)}"`,
    ``,
    `CHALLENGE (3 צעדים ביצועיים):`,
    `• צעד 1 — הכנה (5 דק'): פעולה קטנה שמכינה את השטח לצעד 2`,
    `• צעד 2 — ביצוע המשימה: "${dayEntry.task}" — עם פרטים מדויקים (מתי, איך, כמה)`,
    `• צעד 3 — עיגון (2 דק'): פעולה שמחזקת את מה שנעשה ומחברת לחזון`,
    ``,
    `DIRECT_MESSAGE: משפט אחד — ישיר, אמיתי, לא מחמיא. מה שהמאמן באמת חושב על המצב הזה.`,
    ``,
    `החזר JSON תקין בלבד — ללא backticks, ללא markdown, ללא טקסט לפני/אחרי:`,
    `{`,
    `  "title": "כותרת 5-7 מילים — חדה, ישירה, קשורה למשימת היום",`,
    `  "concept": "2-3 משפטים — מה השיעור הזה פותר עבור המשתמש הזה ספציפית",`,
    `  "deep_dive": "400+ מילה — מנגנון ספציפי. שמות חוקרים. עובדות כמותיות. אין bullet. אין markdown.",`,
    `  "case_study": "150+ מילה — שם + מקום + שנה + תוצאה מדויקת. בדומיין רלוונטי לחזון.",`,
    `  "pro_tip": "100+ מילה — תובנה שרוב האנשים לא יגלו. ספציפית לסוג הפער הזה.",`,
    `  "challenge": "3 צעדים: הכנה + ביצוע + עיגון. פרטים מדויקים — מתי, איך, כמה.",`,
    `  "direct_message": "משפט אחד — ישיר מהמאמן למשתמש. אמיתי וחד.",`,
    `  "duration_min": 20`,
    `}`,
    ``,
    `דרישות: הכל בעברית. deep_dive לפחות 400 מילה. המאמן פונה בגוף שני ("אתה").`,
    `אין כוכביות/markdown בתוך שדות הטקסט. אין "•" או "-" בתוך deep_dive.`,
  ].join('\n')
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

// ── Data sanitizers ──────────────────────────────────────────────────
function deepSanitize(val) {
  if (val === undefined || (typeof val === 'number' && !isFinite(val))) return null
  if (val === null || typeof val !== 'object') return val
  if (Array.isArray(val)) {
    return val.map(item => Array.isArray(item) ? JSON.stringify(item) : deepSanitize(item))
  }
  return Object.fromEntries(
    Object.entries(val)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deepSanitize(v)])
  )
}

function normalizePathData(raw) {
  const str  = v => (typeof v === 'string' ? v : String(v ?? ''))
  const num  = v => { const n = Number(v); return isFinite(n) ? n : 0 }
  const bool = v => v === true || v === 'true' || v === 1

  const validPillar = v => ['builder','creator','connection','reset'].includes(v) ? v : null

  const habits = (Array.isArray(raw.daily_habits) ? raw.daily_habits : []).slice(0, 3).map((h, i) => ({
    id:           str(h?.id   || `h${i + 1}`),
    emoji:        str(h?.emoji || '🎯'),
    title:        str(h?.title || ''),
    description:  str(h?.description || ''),
    duration_min: num(h?.duration_min ?? 5),
    ...(validPillar(h?.pillar) ? { pillar: h.pillar } : {}),
  }))

  const roadmap = (Array.isArray(raw.roadmap) ? raw.roadmap : []).slice(0, 30).map((r, i) => ({
    day:          num(r?.day  ?? i + 1),
    week:         num(r?.week ?? Math.ceil((i + 1) / 7)),
    phase:        str(r?.phase || ''),
    weekly_theme: str(r?.weekly_theme || ''),
    task:         str(r?.task  || ''),
    is_milestone: bool(r?.is_milestone),
    ...(validPillar(r?.pillar) ? { pillar: r.pillar } : { pillar: PILLAR_CYCLE[i % 4] }),
  }))

  return {
    path_name:    str(raw.path_name),
    tagline:      str(raw.tagline),
    daily_habits: habits,
    roadmap,
    coach_note:   str(raw.coach_note),
  }
}

// ── Consistency tracker ───────────────────────────────────────────────
function calcConsistency(prev, todayStr) {
  const last  = prev?.last_completed_date
  const diffD = last ? Math.round((new Date(todayStr) - new Date(last)) / 86_400_000) : 0
  const streak = diffD <= 1 ? (prev?.current_streak || 0) + 1 : 1
  return {
    last_completed_date: todayStr,
    current_streak:      streak,
    longest_streak:      Math.max(streak, prev?.longest_streak || 0),
    gap_days:            0,
    mirror_triggered:    false,
  }
}

// ── Public API ─────────────────────────────────────────────────────────
// visionProfile = { three_year_vision, the_gap, core_values: [], non_negotiables: [] }
// onStatus fires with: 'ai' | 'saving'
export async function buildCustomPath(uid, visionProfile, onStatus) {
  let pathData

  onStatus?.('ai')

  if (!API_KEY) {
    pathData = buildFallbackPath(visionProfile)
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await withTimeout(
        model.generateContent(buildPathPrompt(visionProfile)),
        35000,
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
      pathData = buildFallbackPath(visionProfile)
    }
  }

  onStatus?.('saving')

  await archivePath(uid)

  const sanitizedVP = {
    three_year_vision: String(visionProfile?.three_year_vision || '').slice(0, 1000),
    the_gap:           String(visionProfile?.the_gap           || '').slice(0, 500),
    core_values:       (visionProfile?.core_values      || []).map(v => String(v).slice(0, 100)),
    non_negotiables:   (visionProfile?.non_negotiables  || []).map(v => String(v).slice(0, 100)),
    captured_at:       TODAY(),
  }

  const record = deepSanitize({
    questionnaire:  visionProfile,
    vision_profile: sanitizedVP,
    path:           pathData,
    progress:    { currentDay: 1, startedAt: TODAY(), completedDays: [] },
    consistency: {
      last_completed_date: null,
      current_streak:      0,
      longest_streak:      0,
      gap_days:            0,
      mirror_triggered:    false,
    },
    status:    'active',
    createdAt: TODAY(),
    updatedAt: TODAY(),
  })

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

export async function generateDayLesson(uid, pathRecord, dayIndex) {
  const dayEntry  = pathRecord.path?.roadmap?.[dayIndex - 1]
  if (!dayEntry) throw new Error(`Invalid day index: ${dayIndex}`)

  const createdAt = pathRecord.createdAt || TODAY()

  const cached = getCachedLesson(dayIndex, createdAt)
  if (cached) return cached

  const stored = pathRecord.lessons?.[String(dayIndex)]
  if (stored) {
    setCachedLesson(dayIndex, createdAt, stored)
    return stored
  }

  let lesson
  if (!API_KEY) {
    lesson = buildFallbackLesson(dayEntry, pathRecord)
  } else {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(buildLessonPrompt(dayEntry, pathRecord))
      const raw    = result.response.text().trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      lesson = JSON.parse(raw)
      if (!lesson.title || !lesson.deep_dive) throw new Error('Invalid lesson')
    } catch {
      lesson = buildFallbackLesson(dayEntry, pathRecord)
    }
  }

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
    progress:    { ...pathRecord.progress, currentDay: nextDay, completedDays: done },
    consistency: calcConsistency(pathRecord.consistency, TODAY()),
    status,
    updatedAt:   TODAY(),
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

export async function archivePath(uid) {
  try {
    const snap = await getDoc(pathDoc(uid))
    if (!snap.exists()) return null
    const ref = await addDoc(historyCollection(uid), {
      ...snap.data(),
      archivedAt: new Date().toISOString(),
    })
    return ref.id
  } catch (err) {
    console.error('[archivePath]', err?.code || err?.message || err)
    return null
  }
}

export async function loadArchivedPaths(uid) {
  try {
    const q    = query(historyCollection(uid), orderBy('archivedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

export async function restorePath(uid, archiveId) {
  const archDoc = doc(db, 'userPaths', uid, 'history', archiveId)
  const snap    = await getDoc(archDoc)
  if (!snap.exists()) throw new Error('Archive not found')
  const { archivedAt, ...pathData } = snap.data()
  const restored = { ...pathData, restoredAt: new Date().toISOString(), updatedAt: TODAY() }
  await setDoc(pathDoc(uid), restored)
  return restored
}
