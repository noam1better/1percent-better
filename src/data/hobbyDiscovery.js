// 14-day Hobby Discovery program — help users find activities they love
// Each day = one ~15-30 min experiment in a different area

export const HOBBY_DISCOVERY_ID = 'hobby-discovery'

export const HOBBY_DAYS = [
  {
    day: 1,
    hobby: 'photography',
    hobbyLabel: 'צילום',
    emoji: '📸',
    taskHe: 'צא לחוץ עם הטלפון. צלם 10 תמונות של דברים שמצאו חן בעיניך — ללא תכנון. בחר את ה-3 הטובות ביותר.',
    durationMin: 20,
    pillars: ['life'],
  },
  {
    day: 2,
    hobby: 'drawing',
    hobbyLabel: 'ציור',
    emoji: '✏️',
    taskHe: 'קח עיפרון ונייר (לא אפליקציה). צייר 5 דברים שאתה רואה סביבך — 10 דקות, ללא ביקורת.',
    durationMin: 15,
    pillars: ['life'],
  },
  {
    day: 3,
    hobby: 'writing',
    hobbyLabel: 'כתיבה',
    emoji: '📝',
    taskHe: 'כתוב 200 מילים על חוויה שאתה רוצה לזכור — ללא תיקונים, ללא מחיקות. כתוב כאילו זה רק לך.',
    durationMin: 15,
    pillars: ['life'],
  },
  {
    day: 4,
    hobby: 'cooking',
    hobbyLabel: 'בישול',
    emoji: '🍳',
    taskHe: 'בחר מתכון שמעולם לא ניסית. בשל אותו בדיוק כפי שכתוב — ללא שינויים. תעד עם תמונה.',
    durationMin: 30,
    pillars: ['life'],
  },
  {
    day: 5,
    hobby: 'music',
    hobbyLabel: 'מוזיקה',
    emoji: '🎵',
    taskHe: 'בחר שיר שאתה אוהב ולמד לנגן מנגינה קצרה ממנו — כלי נגינה, אפליקציה, או רק לשיר בקול. 20 דקות.',
    durationMin: 20,
    pillars: ['life'],
  },
  {
    day: 6,
    hobby: 'running',
    hobbyLabel: 'ריצה',
    emoji: '🏃',
    taskHe: 'צא לריצה קלה של 15 דקות באזור ירוק — ללא מוזיקה. שים לב לסביבה: צבעים, ריחות, קולות.',
    durationMin: 20,
    pillars: ['body', 'life'],
  },
  {
    day: 7,
    hobby: 'crafts',
    hobbyLabel: 'מלאכת יד',
    emoji: '🪡',
    taskHe: 'בנה משהו ידני: origami, מגדל מניירות, תיקון קטן בבית, או כל יצירה שאפשר לגעת בה בסוף.',
    durationMin: 25,
    pillars: ['life'],
  },
  {
    day: 8,
    hobby: 'strategy',
    hobbyLabel: 'משחקי חשיבה',
    emoji: '♟️',
    taskHe: 'שחק משחק חשיבה אחד — שח-מט, סודוקו, חידה, או תשבץ — 25 דקות, בקשב מלא.',
    durationMin: 25,
    pillars: ['growth', 'life'],
  },
  {
    day: 9,
    hobby: 'digital',
    hobbyLabel: 'עיצוב ופיתוח',
    emoji: '💻',
    taskHe: 'בנה משהו דיגיטלי פשוט — עמוד HTML, עיצוב ב-Canva, wireframe ב-Figma. 30 דקות, לא חייב להיות מושלם.',
    durationMin: 30,
    pillars: ['growth', 'life'],
  },
  {
    day: 10,
    hobby: 'language',
    hobbyLabel: 'שפה זרה',
    emoji: '🗣️',
    taskHe: 'בחר שפה שתמיד רצית לדעת. למד 10 מילים + 3 משפטים שימושיים. הגד אותם בקול לפחות פעמיים.',
    durationMin: 20,
    pillars: ['growth'],
  },
  {
    day: 11,
    hobby: 'nature',
    hobbyLabel: 'טבע',
    emoji: '🌿',
    taskHe: 'צא לטיול של 30 דקות בטבע — פארק, שביל, חוף. ללא מוזיקה, ללא פודקאסט. רק אתה והסביבה.',
    durationMin: 35,
    pillars: ['body', 'life'],
  },
  {
    day: 12,
    hobby: 'dance',
    hobbyLabel: 'ריקוד',
    emoji: '💃',
    taskHe: 'הפעל פלייליסט שאתה אוהב ורקוד לבד בחדר — 15 דקות. אין שיפוט, אין מצלמה. רק תנועה.',
    durationMin: 15,
    pillars: ['body', 'life'],
  },
  {
    day: 13,
    hobby: 'gardening',
    hobbyLabel: 'גינון',
    emoji: '🌱',
    taskHe: 'קנה צמח קטן אחד ושתול בעציץ, או זרוע תפוח אדמה בצנצנת. טפל בו 20 דקות ותגיד לו שלום.',
    durationMin: 20,
    pillars: ['life'],
  },
  {
    day: 14,
    hobby: 'volunteering',
    hobbyLabel: 'התנדבות',
    emoji: '🤲',
    taskHe: 'עזור למישהו 30 דקות — מקוון או פיזי: Reddit, עמותה, שכן, עמית. עזרה ספציפית, לא "כללית".',
    durationMin: 30,
    pillars: ['people', 'life'],
  },
]

export const HOBBY_CATEGORIES = {
  photography: { label: 'צילום', emoji: '📸' },
  drawing:     { label: 'ציור ואמנות', emoji: '🎨' },
  writing:     { label: 'כתיבה', emoji: '📝' },
  cooking:     { label: 'בישול', emoji: '🍳' },
  music:       { label: 'מוזיקה', emoji: '🎵' },
  running:     { label: 'ריצה וספורט', emoji: '🏃' },
  crafts:      { label: 'מלאכת יד', emoji: '🪡' },
  strategy:    { label: 'משחקי חשיבה', emoji: '♟️' },
  digital:     { label: 'עיצוב ופיתוח', emoji: '💻' },
  language:    { label: 'שפות', emoji: '🗣️' },
  nature:      { label: 'טבע וחוץ', emoji: '🌿' },
  dance:       { label: 'ריקוד', emoji: '💃' },
  gardening:   { label: 'גינון', emoji: '🌱' },
  volunteering:{ label: 'התנדבות', emoji: '🤲' },
}

export function getHobbyDay(dayNum) {
  return HOBBY_DAYS.find(d => d.day === dayNum) || HOBBY_DAYS[0]
}

// Score responses: 'loved'=2, 'ok'=1, 'nope'=0
export function computeHobbyResults(responses = {}) {
  const scores = {}
  for (const dayData of HOBBY_DAYS) {
    const resp = responses[String(dayData.day)]
    const pts  = resp === 'loved' ? 2 : resp === 'ok' ? 1 : 0
    scores[dayData.hobby] = (scores[dayData.hobby] || 0) + pts
  }

  // Sort by score descending
  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, s]) => s > 0)

  const top    = ranked.slice(0, 3).map(([h]) => h)
  const loved  = HOBBY_DAYS.filter(d => responses[String(d.day)] === 'loved').map(d => d.hobbyLabel)
  const noped  = HOBBY_DAYS.filter(d => responses[String(d.day)] === 'nope').map(d => d.hobbyLabel)

  // Recommended next 30-day program based on top hobby
  const nextProgram = {
    photography: { id: 'hobby-discovery', label: 'מסלול צילום יצירתי' },
    drawing:     { id: 'hobby-discovery', label: 'מסלול ציור ואמנות' },
    writing:     { id: 'hobby-discovery', label: 'מסלול כתיבה יצירתית' },
    running:     { id: 'self-discipline', label: 'מסלול משמעת עצמית' },
    music:       { id: 'hobby-discovery', label: 'מסלול מוזיקה' },
    digital:     { id: 'claude-code-mastery', label: 'מסלול Claude Code' },
    language:    { id: 'hobby-discovery', label: 'מסלול שפה זרה' },
    strategy:    { id: 'self-discipline', label: 'מסלול חשיבה וריכוז' },
    nature:      { id: 'self-discipline', label: 'מסלול חוסן וטבע' },
    dance:       { id: 'self-discipline', label: 'מסלול גוף ותנועה' },
    cooking:     { id: 'hobby-discovery', label: 'מסלול בישול יצירתי' },
    crafts:      { id: 'hobby-discovery', label: 'מסלול מלאכת יד' },
    gardening:   { id: 'hobby-discovery', label: 'מסלול גינון ודאגה' },
    volunteering:{ id: 'business-soul',   label: 'מסלול משמעות וקהילה' },
  }

  const recommended = top[0] ? (nextProgram[top[0]] || null) : null

  return { top, loved, noped, recommended }
}

// The challenge object to add to CHALLENGES array
export const HOBBY_DISCOVERY_CHALLENGE = {
  id: HOBBY_DISCOVERY_ID,
  emoji: '🔍',
  title: 'גלה תחביב שמתאים לך',
  subtitle: 'נסה 14 תחומים שונים וגלה מה מדבר אליך',
  days: 14,
  xpPerDay: 50,
  color: '#a78bfa',
  isHobbyDiscovery: true,
}
