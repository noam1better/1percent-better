// Daily rotating quest pool — 18 tasks across domains
export const QUEST_POOL = [
  { id: 'q_teeps_30',    emoji: '🥊', title: '30 בעיטות טיפ',                    subtitle: 'לחימה',         xp: 20 },
  { id: 'q_pushups_50',  emoji: '💪', title: '50 שכיבות סמיכה',                  subtitle: 'כוח',           xp: 20 },
  { id: 'q_read_20',     emoji: '📖', title: '20 דקות קריאה',                    subtitle: 'ידע',           xp: 15 },
  { id: 'q_cold_shower', emoji: '🧊', title: 'מקלחת קרה',                        subtitle: 'משמעת',         xp: 25 },
  { id: 'q_meditate_10', emoji: '🧘', title: '10 דקות מדיטציה',                  subtitle: 'מיינדפולנס',    xp: 15 },
  { id: 'q_run_20',      emoji: '🏃', title: '20 דקות ריצה',                     subtitle: 'סיבולת',        xp: 25 },
  { id: 'q_write_200',   emoji: '✍️', title: 'כתוב 200 מילים',                   subtitle: 'יצירה',         xp: 20 },
  { id: 'q_stretch_5',   emoji: '🤸', title: '5 דקות מתיחות',                    subtitle: 'גמישות',        xp: 10 },
  { id: 'q_code_30',     emoji: '💻', title: '30 דקות קוד ממוקד',                subtitle: 'פיתוח',         xp: 25 },
  { id: 'q_steps_5k',    emoji: '🚶', title: '5,000 צעדים',                       subtitle: 'תנועה',         xp: 15 },
  { id: 'q_no_sugar',    emoji: '🥗', title: 'ארוחה בריאה ללא עיבוד',            subtitle: 'תזונה',         xp: 20 },
  { id: 'q_jabs_100',    emoji: '👊', title: '100 ג׳אב + קרוס',                  subtitle: 'לחימה',         xp: 25 },
  { id: 'q_journal',     emoji: '📓', title: 'יומן — 3 תובנות',                  subtitle: 'מיינדפולנס',    xp: 20 },
  { id: 'q_no_phone_1h', emoji: '📵', title: 'ללא טלפון שעה שלמה',               subtitle: 'שליטה עצמית',   xp: 20 },
  { id: 'q_plank_2min',  emoji: '🏋️', title: 'פלאנק 2 דקות ברצף',               subtitle: 'כוח',           xp: 30 },
  { id: 'q_shadow_10',   emoji: '🥊', title: '10 דקות איגרוף צל',               subtitle: 'לחימה',         xp: 25 },
  { id: 'q_gratitude',   emoji: '🙏', title: '3 דברים לתודה — כתוב',             subtitle: 'מנטליות',       xp: 10 },
  { id: 'q_breath_5',    emoji: '🌬️', title: 'תרגיל נשימה 5 דקות',              subtitle: 'מיינדפולנס',    xp: 15 },
]

// 30 unique daily challenges — one per day, cycling
export const DAILY_CHALLENGES = [
  { id: 'dc_1',  emoji: '🥊', title: 'השלם 50 בעיטות טיפ בפרוטוקולי הלחימה',       xp: 75 },
  { id: 'dc_2',  emoji: '📵', title: 'אפס מסך שעה לפני שינה',                    xp: 60 },
  { id: 'dc_3',  emoji: '🏋️', title: 'החזק פלאנק דקה שלמה ברצף',                xp: 65 },
  { id: 'dc_4',  emoji: '💧', title: 'שתה 3 ליטר מים היום',                       xp: 50 },
  { id: 'dc_5',  emoji: '📖', title: 'קרא 30 דקות ללא הפסקה',                    xp: 55 },
  { id: 'dc_6',  emoji: '🧊', title: 'סיים מקלחת עם 60 שניות קרות',              xp: 60 },
  { id: 'dc_7',  emoji: '👊', title: 'השלם 200 קומבינציות היום',                   xp: 80 },
  { id: 'dc_8',  emoji: '💻', title: 'כתוב קוד 60 דקות ללא הסחות',               xp: 70 },
  { id: 'dc_9',  emoji: '🌅', title: 'קום 30 דקות מוקדם יותר מהרגיל',            xp: 65 },
  { id: 'dc_10', emoji: '🚶', title: 'הגע ל-10,000 צעדים',                        xp: 60 },
  { id: 'dc_11', emoji: '🤸', title: 'מתיחות מלאות — 15 דקות',                   xp: 50 },
  { id: 'dc_12', emoji: '🧘', title: 'מדיטציה 20 דקות ללא הפרעה',                xp: 65 },
  { id: 'dc_13', emoji: '✍️', title: 'כתוב דף שלם על המטרה הגדולה שלך',          xp: 55 },
  { id: 'dc_14', emoji: '🏃', title: 'ריצה 5 ק"מ היום',                          xp: 75 },
  { id: 'dc_15', emoji: '🥗', title: 'ללא אוכל מעובד — כל היום',                 xp: 55 },
  { id: 'dc_16', emoji: '📓', title: 'כתוב יומן 10 דקות — מה למדת השבוע?',       xp: 50 },
  { id: 'dc_17', emoji: '🥊', title: '3 סיבובי פרוטוקולי לחימה — מלאים',           xp: 80 },
  { id: 'dc_18', emoji: '📵', title: 'ללא סושיאל מדיה כל היום',                  xp: 70 },
  { id: 'dc_19', emoji: '💪', title: 'השלם 100 שכיבות סמיכה במהלך היום',         xp: 75 },
  { id: 'dc_20', emoji: '🧠', title: 'פתור 3 אתגרי חשיבה לוגיים',                xp: 60 },
  { id: 'dc_21', emoji: '🌬️', title: 'תרגיל נשימה Wim Hof — 3 סבבים',           xp: 65 },
  { id: 'dc_22', emoji: '🏋️', title: 'אימון כוח מלא — רגליים + גב + כתפיים',    xp: 80 },
  { id: 'dc_23', emoji: '🙏', title: 'כתוב 10 דברים שאתה אסיר תודה עליהם',       xp: 45 },
  { id: 'dc_24', emoji: '🥊', title: '20 דקות איגרוף צל עם מיקוד',                xp: 70 },
  { id: 'dc_25', emoji: '💬', title: 'שוחח עם מנטור/חבר על המטרות שלך',          xp: 55 },
  { id: 'dc_26', emoji: '🌅', title: 'ללא טכנולוגיה בין 6-8 בבוקר',              xp: 60 },
  { id: 'dc_27', emoji: '🥊', title: 'אימון לחימה מלא: פרוטוקול + שק + תנועה',  xp: 90 },
  { id: 'dc_28', emoji: '💻', title: 'סגור משימת קוד תקועה — עד הסוף',           xp: 80 },
  { id: 'dc_29', emoji: '🤸', title: 'יוגה מלאה — 30 דקות',                      xp: 65 },
  { id: 'dc_30', emoji: '🏆', title: 'השלם את כל משימות היום ללא דחיות',          xp: 100 },
]

function getDayOfYear() {
  const now = new Date()
  return Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000)
}

export function getDailyQuests() {
  const day = getDayOfYear()
  const n   = QUEST_POOL.length
  // Three deterministic indices with prime-step offsets for variety
  const candidates = [
    day % n,
    (day * 3 + 5) % n,
    (day * 7 + 11) % n,
  ]
  const seen = new Set()
  const result = []
  for (const i of candidates) {
    if (!seen.has(i)) { seen.add(i); result.push(i) }
  }
  // Fill to 3 if duplicates occurred
  let extra = (day * 13 + 2) % n
  while (result.length < 3) {
    if (!seen.has(extra)) { seen.add(extra); result.push(extra) }
    extra = (extra + 1) % n
  }
  return result.map(i => QUEST_POOL[i])
}

export function getDailyChallenge() {
  return DAILY_CHALLENGES[getDayOfYear() % DAILY_CHALLENGES.length]
}
