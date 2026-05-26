/**
 * contentEngine.js
 * ─────────────────────────────────────────────────────────────────
 * All business content generation logic lives here.
 * Zero external dependencies – pure functions, pure data.
 *
 * Future AI integration:
 *   Replace `generateBusinessContent()` internals with `aiAdapter.generate()`
 *   The public API (inputs/outputs) stays identical.
 * ─────────────────────────────────────────────────────────────────
 */

// ── 1. Business type registry ─────────────────────────────────────
export const BIZ = {
  RESTAURANT:  'restaurant',
  LAWYER:      'lawyer',
  ACCOUNTANT:  'accountant',
  FLOORING:    'flooring',
  GYM:         'gym',
  BEAUTY:      'beauty',
  DEFAULT:     'default',
}

// ── 2. Keyword detection map ──────────────────────────────────────
const KEYWORDS = {
  [BIZ.RESTAURANT]: [
    'מסעדה', 'אוכל', 'שף', 'תפריט', 'קייטרינג', 'קפה', 'בית קפה',
    'מטבח', 'פיצה', 'בורגר', 'סושי', 'פלאפל', 'אסייתי', 'ים תיכוני',
    'וגן', 'טבעוני', 'קופסאות', 'משלוח',
  ],
  [BIZ.LAWYER]: [
    'עורך דין', 'עו"ד', 'משפטי', 'עורכי דין', 'ייצוג', 'תביעה',
    'חוזה', 'ירושה', 'גירושין', 'נדל"ן', 'עבודה', 'פלילי', 'אזרחי',
    'בית משפט', 'ייעוץ משפטי',
  ],
  [BIZ.ACCOUNTANT]: [
    'רואה חשבון', 'ר"ח', 'הנהלת חשבונות', 'מס', 'דו"ח', 'ביקורת',
    'שכר', 'מאזן', 'מיסוי', 'ניהול ספרים', 'חשבונאות', 'עוסק מורשה',
    'מע"מ', 'מס הכנסה', 'ביטוח לאומי',
  ],
  [BIZ.FLOORING]: [
    'פרקט', 'ריצוף', 'אריחים', 'שיש', 'רצפה', 'קרמיקה', 'גרניט',
    'ויניל', 'למינציה', 'הנחת רצפה', 'שיפוצים', 'התקנה',
  ],
  [BIZ.GYM]: [
    'חדר כושר', 'כושר', 'ספורט', 'אימון', 'מאמן אישי', 'יוגה',
    'פילאטיס', 'קרוספיט', 'ריצה', 'שחייה', 'בריאות', 'הרזיה',
    'תזונה', 'גוף', 'שרירים', 'כדורסל', 'טניס',
  ],
  [BIZ.BEAUTY]: [
    'סלון', 'יופי', 'תספורת', 'שיער', 'צביעה', 'קרטין', 'מניקור',
    'פדיקור', 'גבות', 'ריסים', 'עיצוב', 'קוסמטיקה', 'עיסוי',
    'טיפול פנים', 'מכון יופי', 'ספא', 'הסרת שיער', 'לייזר',
  ],
}

/**
 * Detect business type from description text.
 * Returns a BIZ constant.
 */
export function detectBusinessType(description = '') {
  const lower = description.toLowerCase()
  let best = { type: BIZ.DEFAULT, score: 0 }

  for (const [type, keywords] of Object.entries(KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    if (score > best.score) best = { type, score }
  }

  return best.type
}

// ── 3. Per-type content templates ─────────────────────────────────
// Each template is a function of { name, city, phone, desc }
// so interpolation is explicit and readable.

const TEMPLATES = {

  // ── Restaurant ──────────────────────────────────────────────────
  [BIZ.RESTAURANT]: ({ name, city, phone, desc }) => ({
    tagline: `הטעמים שאתם מחפשים – ב${city}`,
    services: [
      'תפריט עשיר ומגוון לכל העדפה',
      'קייטרינג לאירועים וחברות',
      'משלוחים מהירים לכל האזור',
      'ארוחות עסקיות מתחלפות',
      'אפשרויות לצמחונים וטבעונים',
      'שולחנות פרטיים לאירועים מיוחדים',
    ],
    whatsappOpener: `היי! 👋 שמחים לעדכן שהתפריט של *${name}* עודכן לשבוע הקרוב.\n\n🍽️ אנחנו מגישים אוכל ${desc} בלב ${city}.\n\nזמני פתיחה: א'-ה' 12:00–23:00 | שישי–שבת עד חצות\n\nרוצים להזמין שולחן או לשמוע על הספיישלים?`,
    posts: [
      `🍽️ יש רק דבר אחד טוב ממסעדה טובה – מסעדה טובה שנמצאת ממש ליד הבית.\n\n${name} ב${city} – ${desc}.\n\nתפריט מתחדש כל שבוע, חומרי גלם טריים, ושף שאוהב מה שהוא עושה.\n\n📞 הזמנת מקומות: ${phone || 'ראו ביוגרפיה'} | משלוחים זמינים ✅`,

      `🔥 ספיישל השבוע ב${name}:\n\nמנת ${desc} – במחיר מיוחד לשישי בלבד!\n\nמקומות מוגבלים. לא תגידו שלא אמרנו 😏\n\nהזמינו עכשיו: ${phone || 'DM'}`,

      `💬 מה אומרים עלינו?\n\n"הכי טוב ב${city}, בלי ויכוח" – דני ל.\n"האוכל הזכיר לי את הבית" – רינה מ.\n"קייטרינג שעבד מעל ומעבר" – שלי כ.\n\n${name} – ${desc}. מחכים לכם! 🙏`,

      `🎉 יום הולדת? אירוע? ישיבת חברה?\n\n${name} ב${city} מתמחה בחוויות אוכל לקבוצות.\n\nתפריטים מותאמים אישית | שירות ברמה גבוהה | מחירים גמישים\n\nפרטים: ${phone || 'DM לתיאום'} 📩`,

      `💡 ידעתם?\n\nרוב האנשים ב${city} עדיין לא טעמו את ${name}.\n\nזה אומר שאתם יכולים להיות מהראשונים שיגלו מה כולם ידברו עליו בקרוב 🍴\n\n#${city.replace(/\s/g,'')} #מסעדות #אוכל #שף`,
    ],
    adTitles: [
      `${name} | ${desc} | ${city} – הזמינו שולחן עכשיו`,
      `מסעדה ב${city} – ${name} | ${desc} | מחירים הוגנים`,
      `${name} – ${city} | קייטרינג ומשלוחים | טעמים אמיתיים`,
    ],
    emailSubject: `הזמנת שולחן ל${name} – ${city}`,
    reviews: [
      { name: 'שי כהן', text: `אוכל מדהים! ${name} הפכה להיות המסעדה האהובה שלנו ב${city}.`, stars: 5 },
      { name: 'ליאת לוי', text: `קייטרינג לאירוע שלנו עבד מעל ומעבר. מקצועיים ברמה אחרת.`, stars: 5 },
      { name: 'רון אברהם', text: `המשלוחים תמיד מגיעים חם ובזמן. לא מזמין מאף מקום אחר.`, stars: 5 },
    ],
  }),

  // ── Lawyer ──────────────────────────────────────────────────────
  [BIZ.LAWYER]: ({ name, city, phone, desc }) => ({
    tagline: `ייצוג משפטי מקצועי – ${city} וכל הארץ`,
    services: [
      'ייעוץ משפטי ראשוני ללא עלות',
      'ייצוג בכל ערכאות בית המשפט',
      'עריכת חוזים והסכמים',
      'דיני עבודה ופיטורין',
      'דיני משפחה וגירושין',
      'נדל"ן ומקרקעין',
    ],
    whatsappOpener: `שלום! אני ${name}, עורך/ת דין ב${city}.\n\nאני מתמחה ב${desc} ומציע/ה ייעוץ ראשוני ללא עלות.\n\n⚖️ לפני שאתם מקבלים כל החלטה משפטית – כדאי לדעת מה הזכויות שלכם.\n\nשלחו לי הודעה ואחזור אליכם תוך שעה.`,
    posts: [
      `⚖️ ${name} – עורך/ת דין ב${city}.\n\n${desc} – זה התחום שבו אני עובד/ת כל יום. כשהעניין חשוב, אתם צריכים מישהו שמכיר כל פרט.\n\nייעוץ ראשוני ללא תשלום – כי כולם מגיעים לדעת מה הזכויות שלהם.\n\n📞 ${phone || 'DM לתיאום שיחה'}`,

      `💡 טעות שאנשים עושים לעתים קרובות:\n\nחותמים על חוזה בלי לקרוא את האותיות הקטנות.\n\nבין שזה חוזה עבודה, שכירות, או רכישת נכס – כל מסמך שחותמים עליו הוא מחייב.\n\n${name} | ייעוץ חוזי ב${city} | ${phone || 'לפרטים DM'}`,

      `🏆 כשאתם בוחרים עורך דין, אתם בוחרים מישהו שילחם עבורכם.\n\n${name} | ${desc}\nניסיון מוכח | מענה מהיר | שקיפות מלאה\n\n"הרגשתי שיש מישהו שבאמת אכפת לו מהמקרה שלי" – לקוח מ${city}.\n\n📩 DM לפגישת ייעוץ ראשונה חינם`,

      `❓ מתי כדאי להתייעץ עם עורך דין?\n\n✅ לפני שחותמים על כל חוזה\n✅ כשמקבלים מכתב מעסיק או בית משפט\n✅ כשיש סכסוך עם שכן, שותף, או ספק\n✅ כשרוצים להבין מה הזכויות שלכם\n\n${name} ב${city} – ייעוץ ראשוני חינם. ${phone || 'DM עכשיו'}`,

      `📋 ${desc} – זה לא סתם עבודה עבורי, זו הדרך שלי לעשות שינוי.\n\nבשנים האחרונות סייעתי ללקוחות רבים ב${city} לקבל את מה שמגיע להם.\n\nאם יש לכם שאלה – שאלו. אני כאן.\n\n#עורךדין #${city.replace(/\s/g,'')} #זכויות #ייעוץמשפטי`,
    ],
    adTitles: [
      `${name} עו"ד | ${desc} | ${city} – ייעוץ ראשוני חינם`,
      `עורך דין ב${city} – ${name} | ${desc} | מענה מהיר`,
      `${name} | ייצוג משפטי מקצועי | ${city} – התקשרו עכשיו`,
    ],
    emailSubject: `ייעוץ משפטי עם ${name} – ${city}`,
    reviews: [
      { name: 'מיכאל ג.', text: `${name} ייצג אותי בתביעת עבודה וזכינו. מקצועי, ישיר ואמין לחלוטין.`, stars: 5 },
      { name: 'רחל ש.', text: `קיבלתי ייעוץ מדויק ומהיר. הרגשתי שאני בידיים טובות לאורך כל הדרך.`, stars: 5 },
      { name: 'דוד מ.', text: `עזר לי בחוזה רכישת הדירה. גילה בעיות שלא ראיתי. שווה כל שקל.`, stars: 5 },
    ],
  }),

  // ── Accountant ──────────────────────────────────────────────────
  [BIZ.ACCOUNTANT]: ({ name, city, phone, desc }) => ({
    tagline: `ניהול כספים חכם לעסקים ועצמאיים – ${city}`,
    services: [
      'הגשת דוחות שנתיים ורבעוניים',
      'ניהול ספרים שוטף',
      'ייעוץ מס לעסקים ועצמאיים',
      'תכנון מס חוקי לחיסכון מקסימלי',
      'הכנת תלושי שכר ועובדים',
      'ביקורת חשבונות ואישורים',
    ],
    whatsappOpener: `שלום! אני ${name}, רואה חשבון מוסמך/ת ב${city}.\n\nמתמחה ב${desc} לעסקים קטנים ובינוניים ועצמאיים.\n\n📊 עדיין לא הגשתם דוח שנתי? מתקרב מועד ההגשה.\n\nשלחו לי הודעה ואשמח לסדר לכם הכל – בלי בלאגן ובלי עיכובים.`,
    posts: [
      `📊 ${name} – רואה חשבון ב${city}.\n\nהרבה עסקים משלמים יותר מס ממה שצריך – פשוט כי אף אחד לא הסביר להם את הזכויות שלהם.\n\n${desc} | ייעוץ ראשוני חינם\n\n📞 ${phone || 'DM לפרטים'}`,

      `💡 3 דברים שכל עצמאי צריך לדעת לפני הגשת הדוח:\n\n1️⃣ ניתן לנכות הוצאות עסקיות רבות שאנשים מפספסים\n2️⃣ קיצורי דרך "חסכוניים" עלולים לעלות ביוקר\n3️⃣ תכנון מס לשנה הבאה מתחיל עכשיו\n\n${name} | ${city} | ${phone || 'DM לשיחה'}`,

      `🗓️ תזכורת חשובה:\n\nהמועד להגשת הדוחות מתקרב!\n\n${name} ב${city} מטפל/ת כעת בתיקים חדשים. מקומות מוגבלים לחודש זה.\n\nצרו קשר עכשיו לפני שיהיה מאוחר: ${phone || 'DM'} 📩`,

      `🏆 מה מייחד רואה חשבון טוב?\n\nלא רק הגשת ניירת – אלא להבין את העסק שלכם.\n\n${name} עובד/ת לצד לקוחות ב${city} כשותף/ה עסקי/ת לכל דבר.\n\n"חסך לי עשרות אלפי שקלים בתכנון מס" – לקוח מ${city}.\n\n📩 DM לפגישת היכרות`,

      `💼 עצמאי? בעל עסק קטן? סטארטאפ?\n\n${desc} – בדיוק בשבילכם.\n\n✅ שקיפות מלאה\n✅ מחירים הוגנים\n✅ מענה לכל שאלה תוך 24 שעות\n\n${name} | ${city}\n\n#רואהחשבון #${city.replace(/\s/g,'')} #מיסוי #עצמאי`,
    ],
    adTitles: [
      `${name} רו"ח | ${desc} | ${city} – ייעוץ חינם`,
      `רואה חשבון ב${city} – ${name} | חיסכון במס מוכח`,
      `${name} | הנה"ח וניהול מס | ${city} – מחירים הוגנים`,
    ],
    emailSubject: `שירותי ראיית חשבון עם ${name} – ${city}`,
    reviews: [
      { name: 'עמי ז.', text: `${name} חסך לי עשרות אלפים בתכנון מס. מקצועי, ישיר ונגיש תמיד.`, stars: 5 },
      { name: 'נועה פ.', text: `סוף סוף מצאתי רואה חשבון שמסביר הכל בעברית פשוטה. ממליצה בחום!`, stars: 5 },
      { name: 'גיל ה.', text: `ניהול הספרים שלנו הפך לפשוט ומסודר. שירות מעולה לאורך שנים.`, stars: 5 },
    ],
  }),

  // ── Flooring ────────────────────────────────────────────────────
  [BIZ.FLOORING]: ({ name, city, phone, desc }) => ({
    tagline: `רצפות שמשנות את הבית – ${city} וסביבה`,
    services: [
      'הנחת פרקט עץ ולמינציה',
      'ריצוף קרמיקה וגרניט פורצלן',
      'שיש וחומרים יוקרתיים',
      'ויניל SPC – עמיד ומודרני',
      'הסרת ריצוף ישן ופינוי',
      'ייעוץ וליווי בבחירת חומרים',
    ],
    whatsappOpener: `שלום! אני מ${name} ב${city}.\n\nאנחנו מתמחים ב${desc}.\n\n🏠 חושבים על שינוי הרצפה? שלחו לנו תמונה של החדר ונחזור עם המלצה והצעת מחיר תוך 24 שעות – ללא עלות וללא התחייבות.${phone ? `\n\n📞 ${phone}` : ''}`,
    posts: [
      `🏠 רצפה חדשה = דירה חדשה.\n\nזה אחד השינויים הכי משפיעים שאפשר לעשות בבית – ובלי לשבור את הבנק.\n\n${name} | ${desc} | ב${city} ובסביבה.\n\nשלחו תמונה ונחזור עם הצעת מחיר תוך 24 שעות 📐\n\n📞 ${phone || 'DM לפרטים'}`,

      `💎 פרקט או ריצוף?\n\nשאלה שאנחנו מקבלים כל יום. התשובה תלויה ב-3 דברים:\n\n1️⃣ איפה בבית (קומה, רטיבות, תנועה)\n2️⃣ סגנון עיצוב רצוי\n3️⃣ תקציב ותחזוקה עתידית\n\n${name} ב${city} – ייעוץ חינם לפני כל החלטה 📩`,

      `⭐ לפני ואחרי:\n\nהלקוחות שלנו מוציאים כל פעם מחדש את ה"וואו" כשרואים את הסלון החדש.\n\n${desc} – ב${city} ובסביבה.\n\nפרויקט הבא שלכם יכול להתחיל עוד השבוע ⚡\n\n📞 ${phone || 'DM'}`,

      `🔨 עובדים נקי, מסיימים בזמן, ומשאירים את הבית מסודר.\n\nזה לא מובן מאליו – אבל בשבילנו זה הסטנדרט.\n\n${name} | ${desc} | ${city}.\n\n"הצוות הכי מסודר שעבד בבית שלי" – לקוחה מ${city} ⭐\n\n📩 DM לפרויקט הבא שלכם`,

      `📏 כמה עולה להחליף רצפה?\n\nהרבה פחות ממה שחושבים – ויש מגוון עצום של חומרים לכל תקציב.\n\n${name} ב${city} מציע/ת ייעוץ ראשוני חינם + הצעת מחיר מפורטת.\n\nצרו קשר ונסגור תאריך: ${phone || 'DM'}\n\n#פרקט #ריצוף #${city.replace(/\s/g,'')} #שיפוצים`,
    ],
    adTitles: [
      `${name} | ${desc} | ${city} – הצעת מחיר חינם`,
      `פרקט וריצוף ב${city} – ${name} | מחירים מפתיעים`,
      `${name} | ${desc} | עבודה נקייה, תוצאות מדהימות`,
    ],
    emailSubject: `הצעת מחיר לריצוף מ${name} – ${city}`,
    reviews: [
      { name: 'טל ב.', text: `הצוות של ${name} הנחה לנו פרקט בכל הדירה תוך יומיים. תוצאה מושלמת!`, stars: 5 },
      { name: 'אורי ר.', text: `מקצועיים, נקיים ובמחיר הוגן. לא מחפש עוד. אלה האנשים שלי.`, stars: 5 },
      { name: 'מיה ל.', text: `עזרו לי לבחור גרניט שלא הכרתי ושינה את הדירה לחלוטין. מדהים!`, stars: 5 },
    ],
  }),

  // ── Gym ─────────────────────────────────────────────────────────
  [BIZ.GYM]: ({ name, city, phone, desc }) => ({
    tagline: `תשנו את הגוף שלכם – ${city}`,
    services: [
      'אימון אישי עם מאמן מוסמך',
      'שיעורי קבוצה: יוגה, פילאטיס, ספינינג',
      'ייעוץ תזונה מותאם אישית',
      'תוכנית אימון מותאמת למתחילים',
      'מכשירים מתקדמים ומתוחזקים',
      'מנוי גמיש – יומי, חודשי, שנתי',
    ],
    whatsappOpener: `היי! 💪 אני מ${name} ב${city}.\n\nאנחנו מתמחים ב${desc} ורוצים לעזור לך להגיע ליעדים שלך.\n\n🔥 השבוע אנחנו מציעים שיעור ניסיון חינם לחברים חדשים.\n\nמה היעד שלך? נבנה יחד תוכנית שמתאימה בדיוק לך.${phone ? `\n\n📞 ${phone}` : ''}`,
    posts: [
      `💪 ${name} ב${city} – כי הגוף שלך מגיע ליותר.\n\n${desc} – לא עוד בהצהרות, עכשיו בפעולה.\n\nשיעור ניסיון חינם לכל מצטרף/ת חדש/ה החודש!\n\n📞 ${phone || 'DM לפרטים'}`,

      `🔥 3 סיבות להצטרף ל${name} עכשיו:\n\n1️⃣ מאמנים מוסמכים עם ניסיון אמיתי\n2️⃣ אווירה תומכת לכל רמה – מתחילים ומנוסים\n3️⃣ תוצאות שאפשר לראות תוך שבועות\n\nב${city} כבר יודעים. בואו להכיר 🎯`,

      `🌅 הבוקר מתחיל אחרת כשמתאמנים.\n\nהאנרגיה, הריכוז, הביטחון העצמי – הכל משתנה.\n\n${name} | ${desc} | ${city}\n\nאנחנו כאן בבוקר מוקדם ועד הלילה. מה שנוח לך 🕓\n\n📩 DM לשיעור ניסיון`,

      `❤️ הלקוחות שלנו מספרים:\n\n"ירדתי 12 קילו תוך 3 חודשים עם הצוות של ${name}" – שי מ${city}\n"הצוות כאן הוא ה-best, מרגיש כמו משפחה" – נועה מ${city}\n"כבר שנה חבר וכל אימון מרגיש כמו הראשון" – רן מ${city}\n\n💪 בואו להצטרף`,

      `🏋️ כושר הוא לא עונש – זה מתנה שנותנים לעצמנו.\n\n${desc} ב${city} עם ${name}.\n\nמנוי ניסיון לחודש ראשון במחיר מיוחד – רק השבוע! ⏰\n\n📞 ${phone || 'DM לפרטים'}\n\n#כושר #${city.replace(/\s/g,'')} #בריאות #אימון`,
    ],
    adTitles: [
      `${name} | ${desc} | ${city} – שיעור ניסיון חינם`,
      `חדר כושר ב${city} – ${name} | מאמנים מוסמכים`,
      `${name} | ${desc} | תוצאות מוכחות ב${city}`,
    ],
    emailSubject: `הזמנה לשיעור ניסיון ב${name} – ${city}`,
    reviews: [
      { name: 'שי מ.', text: `ירדתי 12 ק"ג תוך 4 חודשים עם הצוות של ${name}. שינוי חיים ממש!`, stars: 5 },
      { name: 'נועה ר.', text: `האווירה פה שונה מכל חדר כושר שהייתי בו. תומכים, מכירים אותך, אכפת להם.`, stars: 5 },
      { name: 'אלון כ.', text: `המאמן האישי שלי ב${name} הפך את האימון לחוויה שאני מחכה אליה.`, stars: 5 },
    ],
  }),

  // ── Beauty Salon ────────────────────────────────────────────────
  [BIZ.BEAUTY]: ({ name, city, phone, desc }) => ({
    tagline: `יופי שיוצא מבפנים – מוגשם ב${city}`,
    services: [
      'תספורת ועיצוב שיער לגברים ונשים',
      "צביעה, גוונים ובלייאז' מקצועי",
      'טיפולי קרטין וחלקה',
      'עיצוב גבות ופומפדור',
      "מניקור, פדיקור וג'ל",
      'טיפולי פנים ועיסוי',
    ],
    whatsappOpener: `היי! 💇‍♀️ אני מ${name} ב${city}.\n\nאנחנו מתמחים ב${desc}.\n\nיש לנו מקומות פנויים השבוע! 📅\n\nשלחו לי הודעה ונקבע לכם תור בדיוק כשנוח לכם.${phone ? `\n\n📞 ${phone}` : ''}`,
    posts: [
      `✨ ${name} – כי כשאת מרגישה טוב עם עצמך, זה נראה.\n\n${desc} בלב ${city}.\n\nמקומות פנויים השבוע – קדם/י להזמין תור!\n\n📞 ${phone || 'DM לתיאום'} 💇‍♀️`,

      `💄 טרנספורמציה שאנחנו אוהבים:\n\nלקוחה מגיעה עם ספקות – יוצאת עם חיוך.\n\n${name} ב${city} – ${desc}.\n\nכי כל אחת מגיעה לגרסה הכי יפה של עצמה.\n\nDM להזמנת תור 📩`,

      `🌸 טיפ לשמירה על הצבע:\n\n✅ שימוש בשמפו לשיער צבוע\n✅ הגנה מהשמש (כן, גם לשיער)\n✅ טיפול לחות פעם בשבוע\n✅ לא לרחוץ מיד אחרי הצביעה\n\n${name} | ${desc} | ${city}\n\n📞 לקביעת תור: ${phone || 'DM'}`,

      `⭐ לקוחות אומרות:\n\n"${name} היא הסיבה שאני מרגישה מלכה כל פעם" – מיכל מ${city}\n"הכי טובה שהייתי אצלה! לא הולכת לשום מקום אחר" – רוני מ${city}\n"המקצועיות + האווירה = שילוב מושלם" – יעל מ${city}`,

      `🗓️ הכינו את הלוק לשבת!\n\n${name} מקבלת הזמנות לסוף שבוע עד יום ד' בלבד.\n\n${desc} ב${city}.\n\nאל תישארו בלי תור – הזמינו עכשיו! ⏰\n\n📞 ${phone || 'DM'}\n\n#סלוןיופי #${city.replace(/\s/g,'')} #שיער #יופי`,
    ],
    adTitles: [
      `${name} | ${desc} | ${city} – קבעי תור עכשיו`,
      `סלון יופי ב${city} – ${name} | ${desc}`,
      `${name} | שיער, טיפוח ויופי | ${city} – הזמינו תור`,
    ],
    emailSubject: `קביעת תור ב${name} – ${city}`,
    reviews: [
      { name: 'מיכל א.', text: `${name} שינתה לי את השיער וגם את הביטחון העצמי. מדהימה!`, stars: 5 },
      { name: 'רוני ט.', text: `אין מקום אחר ב${city} שאני הולכת אליו. מקצועית, נעימה ותמיד מושלם.`, stars: 5 },
      { name: 'שירה כ.', text: `קרטין ברמה גבוהה במחיר הוגן. שיער חלק ומבריק שבועות!`, stars: 5 },
    ],
  }),

  // ── Default (unknown type) ───────────────────────────────────────
  [BIZ.DEFAULT]: ({ name, city, phone, desc }) => ({
    tagline: `מקצועיות שמדברת בעד עצמה – ${city}`,
    services: [
      'שירות מקצועי ומהיר',
      'ייעוץ ראשוני ללא עלות',
      'אחריות מלאה על כל עבודה',
      'זמינות גבוהה 7 ימים בשבוע',
      'מחירים הוגנים ושקופים',
      'ניסיון מוכח בתחום',
    ],
    whatsappOpener: `שלום! 👋 אני מ${name} ב${city}.\n\nאנחנו מתמחים ב${desc} ושמחים לעמוד לשירותכם!\n\nרוצים לקבל הצעת מחיר? השיבו להודעה ונחזור אליכם תוך דקות ⚡${phone ? `\n\n📞 ${phone}` : ''}`,
    posts: [
      `🌟 ${name} – לא מוכרים חלומות, מספקים תוצאות.\n\n${desc} – זה מה שאנחנו עושים כל יום, וזה מה שאנחנו אוהבים.\n\nמחפשים מקצוענים ב${city}? הגעתם למקום הנכון. 💪\n\n📩 DM לתיאום | ${phone || 'לחצו על הפרופיל'}`,

      `💼 מה ההבדל בין שירות טוב לשירות יוצא דופן?\n\nהתשובה: ${name}.\n\nכשאתם בוחרים בנו, אתם בוחרים:\n✅ מקצועיות אמיתית\n✅ מחירים הוגנים\n✅ מענה מהיר ואמין\n\nב${city} כבר יודעים. עכשיו גם אתם. 🎯`,

      `🔥 מבצע מוגבל לחודש זה!\n\n${name} מציעים ייעוץ ראשוני חינם לכל לקוח חדש ב${city}.\n\n${desc} – ניסיון אמיתי, תוצאות מוכחות.\n\nהזמינו עכשיו: ${phone || 'DM'} ⏰`,

      `❤️ מה הלקוחות שלנו אומרים:\n\n"הכי מקצועיים שעבדתי איתם" – רון מ${city}\n"שירות מעל ומעבר לציפיות" – מיכל מ${city}\n"ממליצה בחום לכולם!" – שרה מ${city}\n\n${name} – כי המוניטין שלנו הוא הפרסומת הטובה ביותר. 🏆`,

      `💡 טיפ חינמי מ${name}:\n\n${desc} – זה לא משהו שאפשר לדחות. ככל שממתינים יותר, כך המחיר עולה.\n\nאנחנו ב${city} זמינים השבוע לפגישת ייעוץ חינמית.\n\nDM עכשיו ונסגור מקום 📅\n\n#${city.replace(/\s/g,'')} #מקצועי #${name.replace(/\s/g,'')}`,
    ],
    adTitles: [
      `${name} | ${desc} | ${city} – התקשרו עכשיו`,
      `מחפשים ${desc.split(' ').slice(0,3).join(' ')} ב${city}? ${name} – מקצועי ומהיר`,
      `${name} | ${city} | מקצועי, מהיר, משתלם`,
    ],
    emailSubject: `הצעת מחיר מ${name} – ${desc}`,
    reviews: [
      { name: 'רון כ.', text: `${name} מקצועיים ברמה הגבוהה ביותר. ממליץ בחום לכולם!`, stars: 5 },
      { name: 'מיכל ל.', text: `שירות מעל ומעבר לציפיות. פנו אליהם ולא תתאכזבו.`, stars: 5 },
      { name: 'דני א.', text: `מהירים, מקצועיים ובמחיר הוגן. עשו עבודה מעולה, אין יותר טוב.`, stars: 5 },
    ],
  }),
}

// ── 4. Email body builder ─────────────────────────────────────────
function buildEmailBody({ name, city, phone, desc, services }) {
  return `שלום,

קיבלתי את פנייתכם ושמחתי לשמוע.

אני מ${name} ב${city}, ומתמחה ב${desc}.

אשמח לתאם שיחה קצרה להבנת הצרכים שלכם ולהציע פתרון מותאם אישית.

השירותים שלנו:
• ${services.slice(0, 4).join('\n• ')}

מה שמייחד אותנו:
✅ ניסיון מוכח בתחום
✅ מחירים הוגנים ושקופים
✅ מענה מהיר תוך 24 שעות
✅ אחריות מלאה על כל עבודה

נשמח לשמוע מכם!

בברכה,
${name}${phone ? `\n📞 ${phone}` : ''}
📍 ${city}`
}

// ── 5. Landing page data builder ──────────────────────────────────
function buildLandingData({ name, city, phone, bizType, tpl }) {
  return {
    badge: `⭐ מדורגים #1 ב${city}`,
    tagline: tpl.tagline,
    title: name,
    subtitle: tpl.tagline,
    body: `משרתים לקוחות ב${city} ובסביבה. מקצועיות, אמינות ותוצאות שמדברות בעד עצמן.`,
    services: tpl.services,
    cta: phone ? `📞 ${phone}` : '📞 צרו קשר עכשיו',
    trust: ['✅ ללא התחייבות', '🏆 מעל 500 לקוחות מרוצים', '⚡ מענה תוך שעה'],
    reviews: tpl.reviews,
  }
}

// ── 6. Main public API ────────────────────────────────────────────
/**
 * generateBusinessContent({ name, city, phone, description })
 *
 * Returns a structured content object ready for the UI.
 * To swap in real AI generation later, replace the body of this
 * function with a call to aiAdapter.generate() and reshape the
 * response into the same schema.
 */
export function generateBusinessContent({ name, city, phone, description }) {
  const desc = description?.trim() || 'שירות מקצועי ואיכותי'
  const bizType = detectBusinessType(desc)
  const vars = { name, city, phone, desc }
  const tpl = TEMPLATES[bizType](vars)

  const landing = buildLandingData({ name, city, phone, bizType, tpl })

  return {
    bizType,                            // so the UI can display an icon/label
    landing,
    whatsapp: tpl.whatsappOpener,
    posts:    tpl.posts,
    adTitles: tpl.adTitles,
    emailSubject: tpl.emailSubject,
    emailBody: buildEmailBody({
      name, city, phone, desc,
      services: tpl.services,
    }),
  }
}

// ── 7. Export HTML landing page (full, with lead form + WA button) ──
export function buildExportHTML(result, form) {
  const { landing } = result
  const waNum = form.phone ? `972${form.phone.replace(/\D/g,'').replace(/^0/,'')}` : ''
  const waHref = waNum ? `https://wa.me/${waNum}` : '#'

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${form.name} – ${form.city}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#07111f;color:#e8edf4;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;line-height:1.65;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  /* NAV */
  .nav{background:rgba(7,17,31,.97);padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1b3a5e;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}
  .nav-logo{font-size:20px;font-weight:800;color:#d4af37}
  .nav-phone{font-size:14px;color:#e8edf4;font-weight:700;background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.28);padding:7px 18px;border-radius:999px;display:inline-flex;align-items:center;gap:6px}
  /* HERO */
  .hero{text-align:center;padding:88px 24px 68px;background:radial-gradient(ellipse 90% 60% at 50% 0%,rgba(212,175,55,.1) 0%,transparent 60%)}
  .badge{display:inline-block;background:rgba(212,175,55,.12);color:#d4af37;border:1px solid rgba(212,175,55,.28);border-radius:999px;font-size:13px;font-weight:700;padding:5px 18px;margin-bottom:22px}
  .hero h1{font-size:clamp(28px,5vw,54px);font-weight:900;color:#fff;margin-bottom:10px;line-height:1.18}
  .hero .tagline{font-size:18px;color:#d4af37;font-weight:600;margin-bottom:16px}
  .hero p{font-size:16px;color:#6b88a8;margin-bottom:32px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.75}
  .trust{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:36px}
  .trust span{font-size:12.5px;color:#6b88a8;background:rgba(255,255,255,.04);border:1px solid #1b3a5e;padding:5px 12px;border-radius:8px}
  .cta-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#d4af37,#f0cc55);color:#07111f;font-size:17px;font-weight:800;padding:16px 40px;border-radius:14px;box-shadow:0 6px 24px rgba(212,175,55,.3);cursor:pointer;border:none;font-family:inherit}
  /* SECTIONS */
  .wrap{max-width:860px;margin:0 auto;padding:0 24px}
  .section{padding:60px 0}
  .sec-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#d4af37;margin-bottom:24px;display:flex;align-items:center;gap:12px}
  .sec-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#1b3a5e,transparent)}
  /* SERVICES */
  .services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px}
  .svc{background:#0c1c32;border:1px solid #1b3a5e;border-radius:12px;padding:16px;display:flex;align-items:center;gap:10px;font-size:14px;color:#e8edf4;font-weight:500}
  .svc-check{color:#d4af37;font-weight:800;font-size:16px;flex-shrink:0}
  /* REVIEWS */
  .reviews{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
  .rev{background:#0c1c32;border:1px solid #1b3a5e;border-radius:12px;padding:20px}
  .stars{color:#d4af37;font-size:14px;margin-bottom:10px}
  .rev-text{font-size:13.5px;color:#6b88a8;line-height:1.65;margin-bottom:12px}
  .rev-name{font-size:13px;font-weight:700;color:#e8edf4}
  /* LEAD FORM */
  .lead-section{background:linear-gradient(145deg,#0c1c32,#0f2444);border:1px solid rgba(212,175,55,.2);border-radius:20px;padding:48px 36px;text-align:center;margin:0 0 16px}
  .lead-section h2{font-size:26px;font-weight:800;color:#fff;margin-bottom:10px}
  .lead-section p{font-size:15px;color:#6b88a8;margin-bottom:32px}
  .lead-form{display:flex;flex-direction:column;gap:12px;max-width:440px;margin:0 auto;text-align:right}
  .lead-form input,.lead-form textarea{width:100%;padding:13px 16px;border-radius:11px;border:1px solid #1b3a5e;background:rgba(7,17,31,.7);color:#e8edf4;font-size:15px;outline:none;font-family:inherit;direction:rtl}
  .lead-form input:focus,.lead-form textarea:focus{border-color:#d4af37;box-shadow:0 0 0 3px rgba(212,175,55,.1)}
  .lead-form textarea{min-height:90px;resize:none}
  .lead-form .submit-btn{background:linear-gradient(135deg,#d4af37,#f0cc55);color:#07111f;padding:14px;border-radius:11px;font-size:16px;font-weight:800;cursor:pointer;border:none;font-family:inherit}
  .lead-success{display:none;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:11px;padding:16px;color:#22c55e;font-weight:600;font-size:15px;text-align:center;margin-top:12px}
  /* CTA BLOCK */
  .cta-block{text-align:center;padding:64px 24px}
  .cta-block h2{font-size:28px;font-weight:800;color:#fff;margin-bottom:12px}
  .cta-block p{font-size:16px;color:#6b88a8;margin-bottom:28px}
  /* FLOATING WA */
  .wa-float{position:fixed;bottom:28px;left:28px;background:#25d366;color:#fff;border-radius:999px;padding:12px 18px 12px 14px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(37,211,102,.45);z-index:200;text-decoration:none;font-family:inherit}
  .wa-float svg{flex-shrink:0}
  /* FOOTER */
  footer{text-align:center;padding:28px 24px;color:#4a6585;font-size:12.5px;border-top:1px solid #1b3a5e}
  @media(max-width:600px){.hero h1{font-size:28px}.services-grid{grid-template-columns:1fr}.reviews{grid-template-columns:1fr}.trust{gap:8px}.lead-section{padding:32px 20px}.nav-phone span:last-child{display:none}.wa-float span:last-child{display:none}.wa-float{padding:13px}}
</style>
</head>
<body>
<nav class="nav">
  <span class="nav-logo">${form.name}</span>
  ${form.phone ? `<a class="nav-phone" href="tel:${form.phone}"><span>📞</span><span>${form.phone}</span></a>` : ''}
</nav>

<div class="hero">
  <div class="badge">${landing.badge}</div>
  <h1>${landing.title}</h1>
  <div class="tagline">${landing.tagline}</div>
  <p>${landing.body}</p>
  <div class="trust">${landing.trust.map(t => `<span>${t}</span>`).join('')}</div>
  <a class="cta-btn" href="${form.phone ? `tel:${form.phone}` : '#'}">📞 ${form.phone || 'צרו קשר עכשיו'}</a>
</div>

<div class="wrap">
  <div class="section">
    <div class="sec-label">השירותים שלנו</div>
    <div class="services-grid">
      ${landing.services.map(s => `<div class="svc"><span class="svc-check">✓</span>${s}</div>`).join('')}
    </div>
  </div>

  <div class="section" style="padding-top:0">
    <div class="sec-label">לקוחות ממליצים</div>
    <div class="reviews">
      ${landing.reviews.map(r => `
      <div class="rev">
        <div class="stars">${'⭐'.repeat(r.stars)}</div>
        <div class="rev-text">"${r.text}"</div>
        <div class="rev-name">${r.name}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section" style="padding-top:0">
    <div class="lead-section">
      <h2>השאירו פרטים ונחזור אליכם</h2>
      <p>ייעוץ ראשוני חינם · מענה תוך שעה · ללא התחייבות</p>
      <form class="lead-form" id="leadForm" onsubmit="submitForm(event)">
        <input type="text" name="name" placeholder="שם מלא" required />
        <input type="tel" name="phone" placeholder="מספר טלפון" required />
        <textarea name="message" placeholder="מה תרצו לשמוע עלינו? (לא חובה)"></textarea>
        <button type="submit" class="submit-btn">שלח פרטים →</button>
      </form>
      <div class="lead-success" id="leadSuccess">✅ קיבלנו את פרטיך! נחזור אליכם בהקדם.</div>
    </div>
  </div>
</div>

<div class="cta-block">
  <h2>מוכנים להתחיל?</h2>
  <p>צרו קשר עוד היום וקבלו ייעוץ ראשוני חינם.</p>
  <a class="cta-btn" href="${form.phone ? `tel:${form.phone}` : '#'}">📞 ${form.phone || 'צרו קשר'}</a>
</div>

<footer>
  ${form.name} · ${form.city} · © ${new Date().getFullYear()}
  <br/><small style="opacity:.3;margin-top:6px;display:block">נוצר עם BusinessBuilder AI</small>
</footer>

${waNum ? `
<a class="wa-float" href="${waHref}" target="_blank" rel="noreferrer">
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  <span>וואטסאפ</span>
</a>` : ''}

<script>
function submitForm(e) {
  e.preventDefault();
  document.getElementById('leadForm').style.display = 'none';
  document.getElementById('leadSuccess').style.display = 'block';
}
</script>
</body>
</html>`
}

// ── 11. Business score calculator ────────────────────────────────
export function calculateBusinessScore(form) {
  const { name, city, phone, description: desc } = form
  const lower = (desc || '').toLowerCase()
  const len = (desc || '').length

  const offerWords = ['מבצע','חינם','מיוחד','מוזל','הנחה','מתנה','ראשון','חינמי','ללא עלות','מוגבל']
  const urgencyWords = ['עכשיו','היום','מהר','מהיר','מיידי','דחוף','שבוע','חודש','בלבד']
  const diffWords = ['מקצועי','ניסיון','מומחה','מוסמך','מוכח','ייחודי','הטוב']

  const hasOffer   = offerWords.some(w => lower.includes(w))
  const hasUrgency = urgencyWords.some(w => lower.includes(w))
  const hasDiff    = diffWords.some(w => lower.includes(w))

  // Clarity score: is the page readable and complete?
  let clarity = 0
  if (name?.trim())  clarity += 25
  if (city?.trim())  clarity += 25
  if (phone?.trim()) clarity += 20
  if (len > 30)      clarity += 10
  if (len > 80)      clarity += 10
  if (len > 160)     clarity += 10
  clarity = Math.min(clarity, 100)

  // Marketing score: does the copy convert?
  let marketing = 20  // base
  if (len > 60)   marketing += 15
  if (hasOffer)   marketing += 20
  if (hasDiff)    marketing += 20
  if (hasUrgency) marketing += 15
  if (phone)      marketing += 10
  marketing = Math.min(marketing, 100)

  // CTA score: can visitors take action?
  let cta = 0
  if (phone?.trim())  cta += 50
  if (hasOffer)       cta += 20
  if (hasUrgency)     cta += 20
  if (len > 50)       cta += 10
  cta = Math.min(cta, 100)

  const overall = Math.round((clarity + marketing + cta) / 3)

  const suggestions = []
  if (!phone)          suggestions.push({ icon: '📱', text: 'הוסף מספר וואטסאפ – מגדיל לידים ב-60%', field: 'phone' })
  if (len < 60)        suggestions.push({ icon: '✍️', text: 'הוסף תיאור מפורט יותר – לפחות 60 תווים', field: 'description' })
  if (!hasOffer)       suggestions.push({ icon: '🎁', text: 'הוסף הצעת ערך ספציפית (מבצע, חינם, ייעוץ חינם)', field: 'description' })
  if (!hasUrgency)     suggestions.push({ icon: '⏰', text: 'הוסף דחיפות ("עד סוף החודש", "מקומות מוגבלים")', field: 'description' })
  if (!hasDiff)        suggestions.push({ icon: '⭐', text: 'הוסף מה מייחד אותך מהמתחרים', field: 'description' })

  return { clarity, marketing, cta, overall, suggestions }
}

// ── 12. Completion checklist ──────────────────────────────────────
export function getCompletionChecklist(form) {
  const { name, city, phone, description: desc } = form
  const lower = (desc || '').toLowerCase()
  const len = (desc || '').length
  const hasOffer = ['מבצע','חינם','מיוחד','מוזל','הנחה','ייעוץ חינם'].some(w => lower.includes(w))
  const hasTestimonial = ['לקוח','ממליץ','ביקורת','חוות דעת','כוכבים'].some(w => lower.includes(w))

  return [
    { id: 'name',         label: 'שם העסק',           done: !!name?.trim(),  icon: '🏪', tip: 'הוסף שם עסק' },
    { id: 'city',         label: 'עיר / מיקום',        done: !!city?.trim(),  icon: '📍', tip: 'הוסף עיר' },
    { id: 'phone',        label: 'טלפון / וואטסאפ',   done: !!phone?.trim(), icon: '📱', tip: 'הוסף מספר לקבלת לידים', highlight: !phone },
    { id: 'desc',         label: 'תיאור מפורט',        done: len > 60,        icon: '✍️', tip: 'הוסף לפחות 60 תווים' },
    { id: 'offer',        label: 'הצעת ערך / מבצע',   done: hasOffer,        icon: '🎁', tip: 'ציין מבצע, ייעוץ חינם, או הנחה', highlight: !hasOffer },
    { id: 'testimonials', label: 'חוות דעת לקוחות',   done: hasTestimonial,  icon: '⭐', tip: 'הזכר ביקורות של לקוחות', pro: true },
    { id: 'images',       label: 'תמונות לעסק',        done: false,           icon: '🖼️', tip: 'הוסף תמונות לדף הנחיתה', pro: true },
  ]
}

// ── 13. Improve content (simulated AI upgrade) ────────────────────
export function improveContent(result, form) {
  const { landing } = result
  const { name, city, phone } = form

  const improvedLanding = {
    ...landing,
    badge: `🏆 המקצוענים המובילים ב${city} – מדורגים 5/5 ⭐`,
    tagline: `${landing.tagline} – מובטח`,
    body: `יותר מ-500 לקוחות מרוצים ב${city} וסביבתה כבר סומכים עלינו. אנחנו לא רק מבטיחים – אנחנו מוכיחים. תוצאות אמיתיות, מחירים שקופים, ואחריות מלאה על כל עבודה.`,
    trust: [
      '🏆 מעל 500 לקוחות מרוצים',
      '✅ אחריות 100% על כל עבודה',
      '⚡ מענה תוך 30 דקות',
      '🎁 ייעוץ ראשוני חינם',
    ],
    cta: phone ? `📞 התקשרו עכשיו: ${phone}` : '📞 צרו קשר – ייעוץ חינם',
  }

  const improvedPosts = result.posts.map((post, i) => {
    const upgrades = [
      `\n\n🔒 אחריות מלאה | 💬 מענה מהיר | ⭐ מעל 500 לקוחות`,
      `\n\n📌 מקומות מוגבלים לחודש ${new Date().toLocaleDateString('he-IL', { month: 'long' })} – הזמינו עכשיו!`,
      `\n\n✅ ייעוץ ראשוני חינם לחלוטין – ללא התחייבות`,
      `\n\n🌟 דירוג ממוצע 4.9/5 מ-${Math.floor(Math.random() * 80) + 120} ביקורות`,
      `\n\n💯 100% שביעות רצון מובטחת או שנחזור ונתקן`,
    ]
    return post + (upgrades[i] || '')
  })

  const improvedAdTitles = [
    `${name} | ${city} | מובטח – התוצאות שאתם מחפשים`,
    `#1 ב${city} – ${name} | ייעוץ חינם | צרו קשר עכשיו`,
    `${name} | 500+ לקוחות מרוצים | ${city} | מחיר הוגן`,
  ]

  return {
    ...result,
    landing: improvedLanding,
    posts: improvedPosts,
    adTitles: improvedAdTitles,
    improved: true,
  }
}

// ── 8. ZIP data builder ───────────────────────────────────────────
export function buildZipData(result, form) {
  const html = buildExportHTML(result, form)
  const readme = [
    `BusinessBuilder AI – אתר לעסק: ${form.name}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'קבצים בחבילה:',
    '  index.html  – דף הנחיתה המוכן לפרסום',
    '',
    'איך לפרסם:',
    '  1. גרור את index.html ל-netlify.com/drop לפרסום מיידי',
    '  2. או: העלה לכל שרת אחסון (GitHub Pages, Vercel, וכו\')',
    '  3. או: שלח את הקובץ ישירות ללקוחות',
    '',
    `נוצר:  ${new Date().toLocaleDateString('he-IL')}`,
    `עסק:   ${form.name}`,
    `עיר:   ${form.city}`,
    `טלפון: ${form.phone || 'לא הוזן'}`,
    '',
    'נוצר עם BusinessBuilder AI',
  ].join('\n')

  return [
    { name: 'index.html', content: html },
    { name: 'README.txt', content: readme },
  ]
}

// ── 10. Copy-all text builder ────────────────────────────────────
export function buildCopyAll(result, form) {
  return [
    `═══ דף נחיתה ═══`,
    result.landing.badge,
    result.landing.title,
    result.landing.tagline,
    result.landing.body,
    `\nשירותים:\n${result.landing.services.map(s => '• ' + s).join('\n')}`,
    result.landing.trust.join(' | '),
    result.landing.cta,
    `\n═══ הודעת וואטסאפ ═══`,
    result.whatsapp,
    `\n═══ פוסטים לסושיאל ═══`,
    ...result.posts.map((p, i) => `--- פוסט ${i + 1} ---\n${p}`),
    `\n═══ כותרות מודעה ═══`,
    ...result.adTitles.map((t, i) => `${i + 1}. ${t}`),
    `\n═══ אימייל שיווקי ═══`,
    `נושא: ${result.emailSubject}`,
    result.emailBody,
  ].join('\n')
}

// ── 9. AI adapter stub (future integration point) ─────────────────
/**
 * Replace the body of `generate()` with a real API call
 * once OpenAI / Claude integration is ready.
 *
 * Expected prompt schema and output schema are documented below
 * so the switch is a one-file change.
 */
export const aiAdapter = {
  isEnabled: false,

  /**
   * @param {{ name, city, phone, description, bizType }} params
   * @returns {Promise<ReturnType<generateBusinessContent>>}
   */
  async generate(params) {
    if (!this.isEnabled) {
      // Fall back to local templates
      return generateBusinessContent(params)
    }

    // TODO: swap in real call, e.g.:
    // const res = await fetch('/api/generate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(params),
    // })
    // return res.json()

    throw new Error('AI adapter not yet configured.')
  },
}

// ── 10. Business type display metadata ───────────────────────────
export const BIZ_META = {
  [BIZ.RESTAURANT]:  { label: 'מסעדה / קפה',       icon: '🍽️' },
  [BIZ.LAWYER]:      { label: 'עורך/ת דין',          icon: '⚖️'  },
  [BIZ.ACCOUNTANT]:  { label: 'רואה חשבון',          icon: '📊'  },
  [BIZ.FLOORING]:    { label: 'ריצוף / פרקט',        icon: '🏠'  },
  [BIZ.GYM]:         { label: 'ספורט / כושר',        icon: '💪'  },
  [BIZ.BEAUTY]:      { label: 'סלון יופי / קוסמטיקה', icon: '💇‍♀️' },
  [BIZ.DEFAULT]:     { label: 'עסק כללי',             icon: '🏪'  },
}

// ── 11. Analytics helpers ────────────────────────────────────────

export function analyzeConversion(score) {
  const rate = Math.round(2 + (score.overall / 100) * 36)
  return Math.min(rate, 38)
}

export function calcSEOScore(form) {
  let s = 40
  if (form.description && form.description.length > 50) s += 20
  if (form.city) s += 15
  if (form.phone) s += 10
  if (form.name && form.name.length > 3) s += 15
  return Math.min(s, 95)
}

export function calcTrustScore(checklist) {
  const done = checklist.filter(i => i.done).length
  return Math.round(45 + (done / checklist.length) * 50)
}

export function getPublishSlug(name = '') {
  const map = {
    'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t',
    'י':'y','כ':'k','ל':'l','מ':'m','נ':'n','ס':'s','ע':'a','פ':'p','צ':'tz',
    'ק':'k','ר':'r','ש':'sh','ת':'t','ך':'k','ם':'m','ן':'n','ף':'p','ץ':'tz',
  }
  return name
    .split('').map(c => map[c] ?? c).join('')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 28) || 'my-business'
}
