import { callGemini, geminiAvailable } from './geminiClient'
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'
const TODAY   = () => new Date().toISOString().slice(0, 10)

const pathDoc           = uid => doc(db, 'userPaths', uid)
const historyCollection = uid => collection(db, 'userPaths', uid, 'history')

// ── Pillar cycle ──────────────────────────────────────────────────────
const PILLAR_CYCLE = ['builder', 'creator', 'connection', 'reset']

// ── Emoji map from habit text ─────────────────────────────────────────
function emojiForHabit(text) {
  if (!text) return '🎯'
  const t = text.toLowerCase()
  if (/ריצה|כושר|אימון|ספורט|שחייה|בוקסינג|gym|חדר כושר|כוח/.test(t)) return '🏋️'
  if (/קריאה|ספר|למוד|קורס/.test(t))                                     return '📚'
  if (/מדיטציה|נשימה|מיינדפולנס/.test(t))                                return '🧘'
  if (/כתיבה|יומן|רישום/.test(t))                                        return '✍️'
  if (/שינה|מנוחה/.test(t))                                              return '😴'
  if (/תכנון|ארגון|לוח זמנים/.test(t))                                   return '📋'
  if (/סושיאל|מסך|טלפון/.test(t))                                        return '📵'
  if (/מים|תזונה|אכילה/.test(t))                                         return '🥗'
  return '🔒'
}

// ── Hebrew tokenizer — strips stop-words, returns meaningful tokens ───
function tokenizeHebrew(text) {
  const stop = new Set(['של','את','אל','על','עם','כי','זה','לא','הם','אני','אתה','היה','להיות','כדי','יש','אין','גם','כן','אבל','רק','כל','מה','שה','הוא','היא','הן','אנחנו','אתם','כאן','שם','עוד','כבר','פה','כך','אם','אחרי','לפני','בין','תוך','מתוך','עכשיו','היום','מחר','תמיד','ללא','בלי','הכי','ביותר','מאוד','גדול','קטן','חדש','ישן'])
  return text
    .split(/[\s,.:;!?'"()\-–—/]+/)
    .map(w => w.replace(/["""'']/g, '').trim())
    .filter(w => w.length > 2 && !stop.has(w))
}

// ── Dynamic path synthesizer — 100% user-input driven ────────────────
function synthesizeDynamicPath(visionProfile) {
  const vp     = visionProfile || {}
  const vision = (vp.three_year_vision || '').trim()
  const gap    = (vp.the_gap           || '').trim()
  const cvArr  = Array.isArray(vp.core_values)    ? vp.core_values.filter(Boolean) : []
  const nnArr  = Array.isArray(vp.non_negotiables) ? vp.non_negotiables.filter(Boolean) : []

  const vToks = tokenizeHebrew(vision)
  const gToks = tokenizeHebrew(gap)

  const h1  = nnArr[0] || cvArr[0] || gToks[0] || 'הרגל ראשון'
  const h2  = nnArr[1] || cvArr[1] || gToks[1] || 'הרגל שני'
  const cv1 = cvArr[0] || vToks[0] || 'מצוינות'

  const gapCut = gap.slice(0, 42)     || h1
  const visCut = vision.slice(0, 36)  || h2

  // Token pool: user's exact words, deduplicated, ordered by relevance
  const tokenPool = [...new Set([
    ...nnArr,
    ...cvArr,
    gapCut,
    visCut,
    ...gToks.slice(0, 6),
    ...vToks.slice(0, 6),
  ])].filter(Boolean)

  // Phase names derived from user's gap + vision text — not preset strings
  const phases = [
    { name: `יסודות — ${h1.slice(0, 22)}`,       theme: `ביסוס "${h1}" מול "${gapCut.slice(0, 28)}"`,     intensity: '60%' },
    { name: `תאוצה — ${gapCut.slice(0, 20)}`,    theme: `${h1} + ${h2} ← "${gapCut.slice(0, 26)}"`,       intensity: '75%' },
    { name: `לחץ — "${gapCut.slice(0, 18)}"`,    theme: `פריצה: "${gapCut}"`,                              intensity: '90%' },
    { name: `שילוב — ${visCut.slice(0, 20)}`,    theme: `זהות: "${visCut}"`,                               intensity: '80%' },
  ]

  // Verb-frames: pure grammar structure, every content word = user's token
  const verbFrames = [
    (tok, _wk) => `זהה: כיצד "${tok}" מחבר אותך ל"${visCut.slice(0, 24)}" — כתוב 3 תצפיות ספציפיות`,
    (tok, _wk) => `תרגל ${tok} היום — תעד: מה עבד, מה לא, ומה תשנה מחר`,
    (tok, _wk) => `אתגר: בצע ${tok} בעוצמה גבוהה ב-20% מהרגיל — ללא הסברים`,
    (tok, _wk) => `עמת: מה ב-"${tok}" עדיין מחזיק את "${gapCut.slice(0, 22)}" פתוח? פרט ל-3 משפטים`,
    (tok, _wk) => `בחן: האם ${tok} כבר אוטומטי בך? אם לא — מה המחסום המדויק שמונע זאת?`,
    (tok, wk)  => `שלב ${tok} עם ${wk >= 2 ? h2 : h1} ביום אחד מלא — תעד את הסינרגיה`,
    (tok, _wk) => `יישם ${tok} על ההחלטה הקשה ביותר שעומדת לפניך עכשיו — אל תדחה`,
  ]

  const roadmap = Array.from({ length: 30 }, (_, i) => {
    const wk    = Math.floor(i / 7)
    const phase = phases[Math.min(wk, 3)]
    const tok   = tokenPool[i % tokenPool.length] || h1
    const frame = verbFrames[(i + wk * 2) % verbFrames.length]
    return {
      day:             i + 1,
      week:            wk + 1,
      phase:           phase.name,
      weekly_theme:    phase.theme,
      task:            frame(tok, wk),
      habit_1_action:  `${h1} — ${phase.intensity} עוצמה (יום ${i + 1})`,
      habit_2_action:  `${h2} — ביצוע מלא, ללא דחייה`,
      non_negotiable:  nnArr[0] || h1,
      pillar:          PILLAR_CYCLE[i % 4],
      is_milestone:    [7, 14, 21, 30].includes(i + 1),
    }
  })

  const nameHead = vToks.slice(0, 4).join(' ').slice(0, 26) || visCut.slice(0, 26)
  const gapHead  = gToks.slice(0, 3).join(' ').slice(0, 30) || gapCut.slice(0, 30)

  return {
    path_name:    nameHead || `${h1.slice(0, 22)} — 30 יום`,
    tagline:      `${h1} + ${h2} · "${gapHead}" — נסגר עכשיו.`,
    daily_habits: [
      { id: 'h1', emoji: emojiForHabit(h1), title: h1,             description: `${h1} — ספציפי, יומי, ללא יוצא מן הכלל`,               duration_min: 30, pillar: 'builder'    },
      { id: 'h2', emoji: emojiForHabit(h2), title: h2,             description: `${h2} — מחובר ישירות ל"${gapCut.slice(0, 25)}"`,        duration_min: 20, pillar: 'creator'    },
      { id: 'h3', emoji: '💎',              title: `גילום ${cv1}`, description: `פעולה יומית שמגלמת ${cv1} ומקרבת ל"${visCut.slice(0,20)}"`, duration_min: 15, pillar: 'connection' },
    ],
    roadmap,
    coach_note: `"${gapCut}" — זה הפער. "${h1}" ו-"${h2}" — אלה הכלים שהגדרת. "${cv1}" — זה מי שאתה הופך להיות. 30 יום. אין תירוצים.`,
  }
}

// ── Fallback lesson — synthesized from user's own profile data ────────
function buildFallbackLesson(dayEntry, pathRecord) {
  const vp     = pathRecord.vision_profile || {}
  const vision = (vp.three_year_vision || '').trim()
  const gap    = (vp.the_gap           || '').trim()
  const nnArr  = Array.isArray(vp.non_negotiables) ? vp.non_negotiables.filter(Boolean) : []
  const cvArr  = Array.isArray(vp.core_values)     ? vp.core_values.filter(Boolean)     : []
  const h1     = nnArr[0] || cvArr[0] || 'הרגל שלך'
  const _cv1   = cvArr[0] || 'המחויבות שלך'
  const gapCut = gap.slice(0, 50)
  const visCut = vision.slice(0, 40)
  return {
    title:   `יום ${dayEntry.day}: ${dayEntry.task}`,
    deep_dive:
      `• "${dayEntry.task}" מכוונת ישירות לפער שזיהית: "${gapCut}"\n` +
      `• כל ביצוע של ${h1} מחזק את הנתיב שסוגר בדיוק את הפער הזה — לא תיאורטית, אלא נוירולוגית\n` +
      `• 30 יום של עקביות משנים זהות: מ"אני מנסה ${h1}" ל"אני אדם ש${h1} הוא חלק ממנו"`,
    case_study:
      `• מי שסגר פער דומה ל-"${gapCut.slice(0, 30)}" לא עשה זאת ביום גדול — עשה זאת בימים כמו היום\n` +
      `• ההבדל בין מי שמגיע ל"${visCut.slice(0, 25)}" לבין מי שלא: הם לא עצרו ביום הקשה`,
    pro_tip:
      `המחסום האמיתי ב-"${gapCut.slice(0, 35)}" אינו כישרון — הוא עקביות. ${h1} כל יום, בלי לדון בזה מחדש.`,
    challenge:  dayEntry.task,
    direct_message: `"${visCut}" — זה לאן אתה הולך. יום ${dayEntry.day} מוביל לשם.`,
  }
}

// ── Force habit titles to exactly match user's stated non_negotiables ──
function enforceUserHabits(pathData, visionProfile) {
  const vp    = visionProfile || {}
  const nnArr = Array.isArray(vp.non_negotiables) ? vp.non_negotiables.filter(Boolean) : []
  const cvArr = Array.isArray(vp.core_values)     ? vp.core_values.filter(Boolean)     : []
  const h1    = nnArr[0] || cvArr[0]
  const h2    = nnArr[1] || cvArr[1] || cvArr[0]
  const cv1   = cvArr[0]
  if (pathData.daily_habits?.[0] && h1)  pathData.daily_habits[0].title = h1
  if (pathData.daily_habits?.[1] && h2)  pathData.daily_habits[1].title = h2
  if (pathData.daily_habits?.[2] && cv1) pathData.daily_habits[2].title = `גילום ${cv1}`
  return pathData
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
  const gapShort = gap.slice(0, 50)

  // h1, h2 come from user's non_negotiables; h3 from their core_values
  const h1Label = nnArr[0] || cvArr[0] || 'הרגל ראשון'
  const h2Label = nnArr[1] || cvArr[1] || cvArr[0] || 'הרגל שני'
  const cv1     = cvArr[0] || 'מצוינות'

  return [
    `אתה "פריים קואץ'" — מאמן ביצועים אישי. כלל ברזל: אתה בונה תוכנית רק מה שהמשתמש שיתף — לא ממציא הרגלים, לא מוסיף תחומים.`,
    ``,
    `══════════════════════════════════`,
    `פרופיל המשתמש — זה כל מה שיש לך:`,
    `══════════════════════════════════`,
    ``,
    `🔭 חזון 3 שנים: "${vision || 'לא צוין'}"`,
    `⛰️ הפער שחייב להיסגר: "${gap || 'לא צוין'}"`,
    `💎 ערכי ליבה:\n${cv}`,
    `🔒 Non-Negotiables (ההרגלים שהמשתמש הגדיר):\n${nn}`,
    ``,
    `══════════════════════════════════`,
    `3 ההרגלים היומיים — נגזרים מהפרופיל בלבד:`,
    `══════════════════════════════════`,
    ``,
    `h1 = "${h1Label}" ← זה בדיוק מה שהמשתמש כתב. אסור לשנות שם זה.`,
    `• description: ציין מתי, כמה ואיך — ספציפי לפרופיל. מחובר ל"${vision.slice(0, 35)}"`,
    ``,
    `h2 = "${h2Label}" ← זה בדיוק מה שהמשתמש כתב. אסור לשנות שם זה.`,
    `• description: פעולה קונקרטית ומדידה — לא "תהיה ממוקד". ישירות לסגירת הפער: "${gapShort}"`,
    ``,
    `h3 = גילום ערך הליבה "${cv1}":`,
    `• פעולה יומית שמגלמת את הערך — ספציפית וברורה`,
    `• קושרת בין הרגלי היום לחזון ארוך-הטווח`,
    ``,
    `══════════════════════════════════`,
    `ארכיטקטורת 4 שבועות — PHASE ו-THEME נגזרים ממילות הפרופיל עצמו:`,
    `══════════════════════════════════`,
    ``,
    `שבוע 1 | phase: "יסודות — ${h1Label.slice(0, 20)}" | weekly_theme: "ביסוס '${h1Label}' מול '${gapShort.slice(0, 25)}'"`,
    `→ task: שבירת מחסום ספציפי שמשאיר את "${gapShort}" פתוח. עוצמה: 60%.`,
    ``,
    `שבוע 2 | phase: "תאוצה — ${gapShort.slice(0, 20)}" | weekly_theme: "${h1Label} + ${h2Label} ← '${gapShort.slice(0, 22)}'"`,
    `→ task: העמקת שני ה-Non-Negotiables וחיזוק הקשר לחזון. עוצמה: 75%.`,
    ``,
    `שבוע 3 | phase: "לחץ — '${gapShort.slice(0, 18)}'" | weekly_theme: "פריצה: '${gapShort}'"`,
    `→ task: צא מאזור הנוחות לחלוטין — פעולה ספציפית לפרופיל זה. עוצמה: 90%.`,
    ``,
    `שבוע 4 | phase: "שילוב — ${vision.slice(0, 20)}" | weekly_theme: "זהות: '${vision.slice(0, 30)}'"`,
    `→ task: איחוד הכל לכדי זהות חדשה — ספציפית ל"${vision.slice(0, 30)}". עוצמה: 80%.`,
    ``,
    `══════════════════════════════════`,
    `חוקים שאין לעבור עליהם:`,
    `══════════════════════════════════`,
    ``,
    `🚫 אסור: להמציא הרגלים שהמשתמש לא ציין (אם לא אמר "כושר" — אל תכניס אימון; אם לא אמר "תזונה" — אל תכניס דיאטה)`,
    `🚫 אסור: "היה ממוקד", "תן 100%", "חיה את הרגע" — חייב מספרים/זמן/פעולה ספציפית`,
    `🚫 אסור: task שלא קשור ישירות לפער "${gapShort}" או לחזון`,
    ``,
    `✅ task טוב: "זהה 3 מחסומים שמשאירים את '${gapShort}' פתוח — כתוב תוכנית סגירה ל-24 שעות"`,
    `✅ habit_1_action טוב: "${h1Label} — ביצוע ספציפי: מתי, כמה, ואיך בדיוק"`,
    ``,
    `══════════════════════════════════`,
    `פורמט JSON — ללא backticks/markdown/טקסט לפני/אחרי:`,
    `══════════════════════════════════`,
    ``,
    `{`,
    `  "path_name": "3-4 מילים — חזק, אישי, מחובר לחזון הספציפי",`,
    `  "tagline": "משפט אחד — חד, מחויב, ישיר לפער. לא השראה זולה.",`,
    `  "daily_habits": [`,
    `    { "id": "h1", "emoji": "בחר אמוג'י מתאים ל'${h1Label}'", "title": "${h1Label}", "description": "מה בדיוק ואיך — ספציפי לפרופיל", "duration_min": 30, "pillar": "builder" },`,
    `    { "id": "h2", "emoji": "בחר אמוג'י מתאים ל'${h2Label}'", "title": "${h2Label}", "description": "מה בדיוק ואיך — מחובר לחזון", "duration_min": 20, "pillar": "creator" },`,
    `    { "id": "h3", "emoji": "💎", "title": "גילום ${cv1}", "description": "פעולה יומית שמגלמת ${cv1} ומסגרת את הפער", "duration_min": 15, "pillar": "connection" }`,
    `  ],`,
    `  "roadmap": [`,
    `    {`,
    `      "day": 1, "week": 1, "phase": "יסודות — ${h1Label.slice(0, 20)}",`,
    `      "weekly_theme": "ביסוס '${h1Label}' מול '${gapShort.slice(0, 25)}'",`,
    `      "task": "משימת יום 1 הספציפית לפרופיל — ישירות על הפער ועל החזון",`,
    `      "habit_1_action": "מה בדיוק עושים עם '${h1Label}' ביום 1 — ספציפי ומדיד",`,
    `      "habit_2_action": "מה בדיוק עושים עם '${h2Label}' ביום 1 — ספציפי ומדיד",`,
    `      "non_negotiable": "${h1Label} — מתי ואיך ביום הספציפי הזה",`,
    `      "pillar": "builder", "is_milestone": false`,
    `    },`,
    `    ... (29 רשומות נוספות, יום 2–30, כל שדה חייב להיות מלא)`,
    `  ],`,
    `  "coach_note": "2-3 משפטים — ישיר לפער '${gap.slice(0, 60)}' ולחזון '${vision.slice(0,40)}'. לא מחמיא. אמיתי ואישי."`,
    `}`,
    ``,
    `כללים סופיים:`,
    `• daily_habits[0].title חייב להיות בדיוק: "${h1Label}" — העתק-הדבק, ללא שינוי`,
    `• daily_habits[1].title חייב להיות בדיוק: "${h2Label}" — העתק-הדבק, ללא שינוי`,
    `• daily_habits[2].title חייב להיות בדיוק: "גילום ${cv1}" — ללא שינוי`,
    `• daily_habits: בדיוק 3, id: h1/h2/h3`,
    `• roadmap: בדיוק 30 אובייקטים — כל שדה מלא, אישי, לא גנרי`,
    `• ימים 7, 14, 21, 30 → is_milestone: true`,
    `• pillar: "builder" | "creator" | "connection" | "reset" בלבד`,
    `• weekly_theme זהה לכל 7 ימי השבוע`,
    `• הכל בעברית`,
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
    `DEEP_DIVE — 3 bullets בדיוק, כל bullet עד 20 מילה:`,
    `• Bullet 1: המנגנון הפסיכולוגי/התנהגותי שגורם לפער — ישיר, ספציפי`,
    `• Bullet 2: למה משימת היום שוברת בדיוק את המנגנון הזה — קונקרטי`,
    `• Bullet 3: עובדה/מחקר אחד — שם חוקר + מספר + קשר לפער`,
    ``,
    `CASE_STUDY — 2 bullets בדיוק:`,
    `• Bullet 1: שם + מקום + שנה + מה עשה (בדומיין: "${vision.slice(0, 50)}")`,
    `• Bullet 2: תוצאה — מספרים מדויקים, שינוי מוחשי`,
    ``,
    `CHALLENGE — פקודה אחת ישירה (משפט אחד בלבד):`,
    `"${dayEntry.task}" — מה בדיוק לעשות עכשיו. מתי. איך. כמה.`,
    ``,
    `DIRECT_MESSAGE: משפט אחד — ישיר, אמיתי, לא מחמיא. מה שהמאמן באמת חושב על המצב הזה.`,
    ``,
    `החזר JSON תקין בלבד — ללא backticks, ללא markdown, ללא טקסט לפני/אחרי:`,
    `{`,
    `  "title": "כותרת 5-7 מילים — חדה, ישירה, קשורה למשימת היום",`,
    `  "deep_dive": "3 bullets · כל bullet מתחיל ב-• · עד 20 מילה לכל bullet",`,
    `  "case_study": "2 bullets · כל bullet מתחיל ב-• · שם+שנה+תוצאה",`,
    `  "pro_tip": "1-2 משפטים — תובנה שרוב האנשים לא יגלו. ספציפית לפער.",`,
    `  "challenge": "פקודה אחת ישירה — משפט אחד עם מתי/איך/כמה",`,
    `  "direct_message": "משפט אחד — ישיר מהמאמן למשתמש. אמיתי וחד."`,
    `}`,
    ``,
    `דרישות: הכל בעברית. bullets מתחילים ב-• . המאמן פונה בגוף שני ("אתה").`,
    `אין markdown, אין כוכביות, אין שדות ריקים.`,
  ].join('\n')
}

// ── Lesson cache (localStorage) ──────────────────────────────────────
function lessonCacheKey(day, createdAt) { return `prime_lesson_v2_${createdAt}_d${day}` }

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
    day:             num(r?.day  ?? i + 1),
    week:            num(r?.week ?? Math.ceil((i + 1) / 7)),
    phase:           str(r?.phase || ''),
    weekly_theme:    str(r?.weekly_theme || ''),
    task:            str(r?.task  || ''),
    habit_1_action:  str(r?.habit_1_action || r?.physical || ''),
    habit_2_action:  str(r?.habit_2_action || r?.nutrition || ''),
    non_negotiable:  str(r?.non_negotiable || ''),
    is_milestone:    bool(r?.is_milestone),
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

  if (!geminiAvailable()) {
    pathData = synthesizeDynamicPath(visionProfile)
  } else {
    try {
      const raw = (await withTimeout(
        callGemini({ prompt: buildPathPrompt(visionProfile) }),
        35000,
        'GEMINI_TIMEOUT'
      )).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(raw)
      pathData = normalizePathData(parsed)
      pathData = enforceUserHabits(pathData, visionProfile)

      if (
        !pathData.path_name ||
        pathData.daily_habits.length !== 3 ||
        pathData.roadmap.length      !== 30
      ) throw new Error('INVALID_STRUCTURE')
    } catch (err) {
      if (err.code === 'GEMINI_TIMEOUT') throw err
      pathData = synthesizeDynamicPath(visionProfile)
    }
  }

  onStatus?.('saving')

  // Purge all stale lesson caches before writing new path
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('prime_lesson_')) localStorage.removeItem(k)
    })
  } catch {}

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
  if (!geminiAvailable()) {
    lesson = buildFallbackLesson(dayEntry, pathRecord)
  } else {
    try {
      const raw = (await callGemini({ prompt: buildLessonPrompt(dayEntry, pathRecord) }))
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
  const { archivedAt: _archivedAt, ...pathData } = snap.data()
  const restored = { ...pathData, restoredAt: new Date().toISOString(), updatedAt: TODAY() }
  await setDoc(pathDoc(uid), restored)
  return restored
}
