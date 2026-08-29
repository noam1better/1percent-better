// Curated habit suggestion library — 15+ habits per pillar
// Shape: { id, pillar, titleHe, triggerSuggestionHe, frequency, difficulty, estimatedMinutes, tags }

export const HABIT_SUGGESTIONS = [
  // ── BODY ─────────────────────────────────────────────────────────
  { id: 'h_body_01', pillar: 'body', titleHe: 'שתה כוס מים', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 1, tags: ['hydration', 'morning'] },
  { id: 'h_body_02', pillar: 'body', titleHe: 'עשה 10 שכיבות סמיכה', triggerSuggestionHe: 'אחרי ארוחת הבוקר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 3, tags: ['strength', 'morning'] },
  { id: 'h_body_03', pillar: 'body', titleHe: 'מתיחות 5 דקות', triggerSuggestionHe: 'אחרי שעה ישיבה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['mobility', 'recovery'] },
  { id: 'h_body_04', pillar: 'body', titleHe: 'ריצה קצרה', triggerSuggestionHe: 'אחרי העבודה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 20, tags: ['cardio', 'energy'] },
  { id: 'h_body_05', pillar: 'body', titleHe: 'פלאנק 30 שניות', triggerSuggestionHe: 'אחרי ארוחת הבוקר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 1, tags: ['core', 'quick'] },
  { id: 'h_body_06', pillar: 'body', titleHe: 'לישון בשעה קבועה', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['sleep', 'recovery'] },
  { id: 'h_body_07', pillar: 'body', titleHe: 'אין אוכל שעתיים לפני שינה', triggerSuggestionHe: 'שעתיים לפני השינה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['nutrition', 'sleep'] },
  { id: 'h_body_08', pillar: 'body', titleHe: '7,000 צעדים ביום', triggerSuggestionHe: 'בדיקה אחרי העבודה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 30, tags: ['walking', 'movement'] },
  { id: 'h_body_09', pillar: 'body', titleHe: 'מקלחת קרה', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'hard', estimatedMinutes: 3, tags: ['discipline', 'energy', 'morning'] },
  { id: 'h_body_10', pillar: 'body', titleHe: 'אכול פרי אחד', triggerSuggestionHe: 'אחרי ארוחת הצהריים', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['nutrition', 'health'] },
  { id: 'h_body_11', pillar: 'body', titleHe: 'אל תיגע בטלפון שעה לפני שינה', triggerSuggestionHe: 'שעה לפני השינה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['sleep', 'digital'] },
  { id: 'h_body_12', pillar: 'body', titleHe: 'shadow boxing 5 דקות', triggerSuggestionHe: 'אחרי ארוחת הבוקר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['combat', 'energy', 'morning'] },
  { id: 'h_body_13', pillar: 'body', titleHe: 'סקוואטים 15 חזרות', triggerSuggestionHe: 'לפני שאני פותח את הטלפון', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['strength', 'morning'] },
  { id: 'h_body_14', pillar: 'body', titleHe: 'לא לשבת יותר מ-45 דקות ברצף', triggerSuggestionHe: 'בזמן עבודה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 2, tags: ['movement', 'posture'] },
  { id: 'h_body_15', pillar: 'body', titleHe: 'אכול ארוחת בוקר', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['nutrition', 'morning'] },

  // ── DISCIPLINE ────────────────────────────────────────────────────
  { id: 'h_dis_01', pillar: 'discipline', titleHe: 'כתוב 3 עדיפויות ליום', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['planning', 'focus'] },
  { id: 'h_dis_02', pillar: 'discipline', titleHe: 'עבוד 25 דקות ללא הסחות', triggerSuggestionHe: 'בתחילת יום העבודה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 25, tags: ['focus', 'deep-work'] },
  { id: 'h_dis_03', pillar: 'discipline', titleHe: 'ללא סושיאל מדיה עד 10:00', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['digital', 'morning'] },
  { id: 'h_dis_04', pillar: 'discipline', titleHe: 'הכן את מה שצריך ללמחרת', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['planning', 'evening'] },
  { id: 'h_dis_05', pillar: 'discipline', titleHe: 'עשה את המשימה הכי קשה ראשונה', triggerSuggestionHe: 'בתחילת יום העבודה', frequency: 'daily', difficulty: 'hard', estimatedMinutes: 30, tags: ['focus', 'procrastination'] },
  { id: 'h_dis_06', pillar: 'discipline', titleHe: 'בצע כוונה ערב לפני', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 3, tags: ['planning', 'evening'] },
  { id: 'h_dis_07', pillar: 'discipline', titleHe: 'אל תיגע בטלפון חצי שעה אחרי קימה', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['digital', 'morning'] },
  { id: 'h_dis_08', pillar: 'discipline', titleHe: 'סגור tabs שלא נחוצים', triggerSuggestionHe: 'בסוף שעת עבודה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['focus', 'organization'] },
  { id: 'h_dis_09', pillar: 'discipline', titleHe: 'כתוב יומן 5 דקות', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['reflection', 'evening'] },
  { id: 'h_dis_10', pillar: 'discipline', titleHe: 'מדיטציה 5 דקות', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 5, tags: ['mindset', 'morning'] },
  { id: 'h_dis_11', pillar: 'discipline', titleHe: 'בדוק ה-inbox פעמיים ביום בלבד', triggerSuggestionHe: 'בצהריים ובסוף יום', frequency: 'daily', difficulty: 'hard', estimatedMinutes: 0, tags: ['digital', 'focus'] },
  { id: 'h_dis_12', pillar: 'discipline', titleHe: 'סקור את ה-to-do list', triggerSuggestionHe: 'בסוף היום', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['planning', 'reflection'] },
  { id: 'h_dis_13', pillar: 'discipline', titleHe: 'קבע שעת עבודה עמוקה', triggerSuggestionHe: 'בתחילת השבוע', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 90, tags: ['deep-work', 'planning'] },
  { id: 'h_dis_14', pillar: 'discipline', titleHe: 'דחה גירוי אחד שרצית להיכנע לו', triggerSuggestionHe: 'בכל פעם שמרגיש', frequency: 'daily', difficulty: 'hard', estimatedMinutes: 0, tags: ['discipline', 'focus'] },
  { id: 'h_dis_15', pillar: 'discipline', titleHe: 'שגרת בוקר של 15 דקות', triggerSuggestionHe: 'כשאני מתעורר', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 15, tags: ['morning', 'routine'] },

  // ── GROWTH ────────────────────────────────────────────────────────
  { id: 'h_gro_01', pillar: 'growth', titleHe: 'קרא 10 עמודים', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 15, tags: ['reading', 'learning'] },
  { id: 'h_gro_02', pillar: 'growth', titleHe: 'שמע podcast ב-1.5x בדרך', triggerSuggestionHe: 'בדרך לעבודה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 20, tags: ['learning', 'commute'] },
  { id: 'h_gro_03', pillar: 'growth', titleHe: 'למד מילה חדשה בשפה זרה', triggerSuggestionHe: 'אחרי ארוחת הבוקר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['language', 'growth'] },
  { id: 'h_gro_04', pillar: 'growth', titleHe: 'כתוב רעיון חדש אחד', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['creativity', 'growth'] },
  { id: 'h_gro_05', pillar: 'growth', titleHe: 'Duolingo 5 דקות', triggerSuggestionHe: 'אחרי ארוחת הבוקר', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['language', 'app'] },
  { id: 'h_gro_06', pillar: 'growth', titleHe: 'שמע שיעור אחד ב-YouTube', triggerSuggestionHe: 'בזמן אכילה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['learning', 'video'] },
  { id: 'h_gro_07', pillar: 'growth', titleHe: 'כתוב מה למדת היום', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['reflection', 'learning'] },
  { id: 'h_gro_08', pillar: 'growth', titleHe: 'קרא מאמר מקצועי אחד', triggerSuggestionHe: 'בצהריים', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 15, tags: ['professional', 'reading'] },
  { id: 'h_gro_09', pillar: 'growth', titleHe: 'פרק Flashcards 10 דקות', triggerSuggestionHe: 'לפני שאני פותח את הטלפון', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['memorization', 'learning'] },
  { id: 'h_gro_10', pillar: 'growth', titleHe: 'שאל שאלה אחת שלא ידעת תשובתה', triggerSuggestionHe: 'בכל מפגש מקצועי', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 0, tags: ['curiosity', 'growth'] },
  { id: 'h_gro_11', pillar: 'growth', titleHe: 'התקדם 15 דקות בcourse שהתחלת', triggerSuggestionHe: 'אחרי העבודה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 15, tags: ['course', 'consistency'] },
  { id: 'h_gro_12', pillar: 'growth', titleHe: 'כתוב סיכום שיחה אחת', triggerSuggestionHe: 'אחרי פגישה חשובה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['professional', 'reflection'] },
  { id: 'h_gro_13', pillar: 'growth', titleHe: 'עיין בספר אחד שלא פתחת', triggerSuggestionHe: 'פעם בשבוע', frequency: 'weekly', difficulty: 'easy', estimatedMinutes: 10, tags: ['books', 'growth'] },
  { id: 'h_gro_14', pillar: 'growth', titleHe: 'בצע שיפור קטן אחד בעבודה שלך', triggerSuggestionHe: 'בסוף יום העבודה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 15, tags: ['professional', 'improvement'] },
  { id: 'h_gro_15', pillar: 'growth', titleHe: 'קרא ביוגרפיה של אדם שאתה מעריץ', triggerSuggestionHe: 'פעם בשבוע', frequency: 'weekly', difficulty: 'easy', estimatedMinutes: 20, tags: ['inspiration', 'learning'] },

  // ── PEOPLE ────────────────────────────────────────────────────────
  { id: 'h_peo_01', pillar: 'people', titleHe: 'שלח הודעה לחבר שלא דיברת איתו', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 3, tags: ['friendship', 'connection'] },
  { id: 'h_peo_02', pillar: 'people', titleHe: 'התקשר להורה', triggerSuggestionHe: 'אחרי העבודה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['family', 'connection'] },
  { id: 'h_peo_03', pillar: 'people', titleHe: 'תן מחמאה אמיתית לאדם אחד', triggerSuggestionHe: 'בכל אינטראקציה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 1, tags: ['social', 'kindness'] },
  { id: 'h_peo_04', pillar: 'people', titleHe: 'הקשב לאחד עד הסוף', triggerSuggestionHe: 'בכל שיחה', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 0, tags: ['listening', 'empathy'] },
  { id: 'h_peo_05', pillar: 'people', titleHe: 'ארגן פגישה חברתית אחת לשבוע', triggerSuggestionHe: 'בתחילת השבוע', frequency: 'weekly', difficulty: 'medium', estimatedMinutes: 0, tags: ['social', 'planning'] },
  { id: 'h_peo_06', pillar: 'people', titleHe: 'פתח שיחה עם אדם חדש', triggerSuggestionHe: 'בכל מפגש חברתי', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 5, tags: ['confidence', 'social'] },
  { id: 'h_peo_07', pillar: 'people', titleHe: 'שתף מידע שימושי עם מישהו', triggerSuggestionHe: 'כשאני לומד משהו', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['sharing', 'connection'] },
  { id: 'h_peo_08', pillar: 'people', titleHe: 'כתוב אחד שאתה מכיר על מי שעזר לך', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 3, tags: ['gratitude', 'people'] },
  { id: 'h_peo_09', pillar: 'people', titleHe: 'אמור "אני לא מסכים" בכבוד', triggerSuggestionHe: 'כשמתאים', frequency: 'daily', difficulty: 'hard', estimatedMinutes: 0, tags: ['confidence', 'assertiveness'] },
  { id: 'h_peo_10', pillar: 'people', titleHe: 'שאל שאלה אחת מעמיקה', triggerSuggestionHe: 'בכל שיחה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 0, tags: ['curiosity', 'connection'] },
  { id: 'h_peo_11', pillar: 'people', titleHe: 'בלה שעה עם אנשים ללא מסכים', triggerSuggestionHe: 'בערב', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 60, tags: ['presence', 'family'] },
  { id: 'h_peo_12', pillar: 'people', titleHe: 'הגב לאחד שחלק תוכן שעזר לך', triggerSuggestionHe: 'כשאני צורך תוכן', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['community', 'gratitude'] },
  { id: 'h_peo_13', pillar: 'people', titleHe: 'הציע עזרה קונקרטית', triggerSuggestionHe: 'כשאני רואה צורך', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 10, tags: ['generosity', 'people'] },
  { id: 'h_peo_14', pillar: 'people', titleHe: 'זכור יום הולדת של מישהו', triggerSuggestionHe: 'בתחילת השבוע', frequency: 'weekly', difficulty: 'easy', estimatedMinutes: 2, tags: ['connection', 'memory'] },
  { id: 'h_peo_15', pillar: 'people', titleHe: 'הצטרף לאירוע חברתי אחד', triggerSuggestionHe: 'פעם בשבוע', frequency: 'weekly', difficulty: 'medium', estimatedMinutes: 60, tags: ['social', 'community'] },

  // ── LIFE & CREATIVITY ────────────────────────────────────────────
  { id: 'h_lif_01', pillar: 'life', titleHe: 'ציירתי משהו 5 דקות', triggerSuggestionHe: 'אחרי ארוחת הצהריים', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['art', 'creativity'] },
  { id: 'h_lif_02', pillar: 'life', titleHe: 'כתוב דבר אחד שהפתיע אותך היום', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 3, tags: ['writing', 'reflection'] },
  { id: 'h_lif_03', pillar: 'life', titleHe: 'בשל ארוחה אחת ביום', triggerSuggestionHe: 'בצהריים', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 30, tags: ['cooking', 'creativity'] },
  { id: 'h_lif_04', pillar: 'life', titleHe: 'צלם תמונה אחת שאהבת', triggerSuggestionHe: 'כשאני בחוץ', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 2, tags: ['photography', 'creativity'] },
  { id: 'h_lif_05', pillar: 'life', titleHe: 'שמע לאלבום שלם ברצף', triggerSuggestionHe: 'בדרך', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 45, tags: ['music', 'mindfulness'] },
  { id: 'h_lif_06', pillar: 'life', titleHe: '10 דקות בחוץ ללא מטרה', triggerSuggestionHe: 'אחרי אכילה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['nature', 'presence'] },
  { id: 'h_lif_07', pillar: 'life', titleHe: 'נסה מתכון חדש', triggerSuggestionHe: 'פעם בשבוע', frequency: 'weekly', difficulty: 'medium', estimatedMinutes: 45, tags: ['cooking', 'adventure'] },
  { id: 'h_lif_08', pillar: 'life', titleHe: 'כתוב ב-journal יצירתי', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['writing', 'reflection'] },
  { id: 'h_lif_09', pillar: 'life', titleHe: 'שחק משחק אסטרטגיה', triggerSuggestionHe: 'בערב', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 20, tags: ['games', 'strategy'] },
  { id: 'h_lif_10', pillar: 'life', titleHe: 'בצע מלאכת יד קטנה', triggerSuggestionHe: 'בסוף השבוע', frequency: 'weekly', difficulty: 'medium', estimatedMinutes: 30, tags: ['crafts', 'creativity'] },
  { id: 'h_lif_11', pillar: 'life', titleHe: 'קרא דף מספר שאינו מקצועי', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 10, tags: ['reading', 'pleasure'] },
  { id: 'h_lif_12', pillar: 'life', titleHe: 'נגן על כלי מוזיקה', triggerSuggestionHe: 'בערב', frequency: 'daily', difficulty: 'medium', estimatedMinutes: 15, tags: ['music', 'creativity'] },
  { id: 'h_lif_13', pillar: 'life', titleHe: 'ביקור בטבע פעם בשבוע', triggerSuggestionHe: 'בסוף השבוע', frequency: 'weekly', difficulty: 'easy', estimatedMinutes: 60, tags: ['nature', 'adventure'] },
  { id: 'h_lif_14', pillar: 'life', titleHe: 'כתוב שתי שורות שיר', triggerSuggestionHe: 'לפני השינה', frequency: 'daily', difficulty: 'easy', estimatedMinutes: 5, tags: ['writing', 'creativity'] },
  { id: 'h_lif_15', pillar: 'life', titleHe: 'נסה פעילות שמעולם לא עשית', triggerSuggestionHe: 'פעם בשבוע', frequency: 'weekly', difficulty: 'hard', estimatedMinutes: 60, tags: ['adventure', 'growth'] },
]

export function getSuggestionsForPillars(pillarIds = []) {
  if (!pillarIds.length) return HABIT_SUGGESTIONS
  return HABIT_SUGGESTIONS.filter(h => pillarIds.includes(h.pillar))
}

export function getTopSuggestionsForPillars(pillarIds = [], count = 5) {
  const all = getSuggestionsForPillars(pillarIds.length ? pillarIds : ['discipline', 'body'])
  // distribute across pillars
  const byPillar = {}
  for (const h of all) {
    if (!byPillar[h.pillar]) byPillar[h.pillar] = []
    byPillar[h.pillar].push(h)
  }
  const result = []
  const perPillar = Math.ceil(count / Math.max(Object.keys(byPillar).length, 1))
  for (const pId of (pillarIds.length ? pillarIds : Object.keys(byPillar))) {
    const items = byPillar[pId] || []
    result.push(...items.slice(0, perPillar))
  }
  return result.slice(0, count)
}
