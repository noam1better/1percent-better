/**
 * websiteTemplates/index.js
 * Pre-built starter templates per business type.
 * Each template returns a full website schema (no AI needed).
 * Used for "blank template" starts or OpenAI pre-fill.
 */

import { BIZ } from '../../contentEngine'
import { ST, makeSection } from '../websiteSchema'

// ── Restaurant ───────────────────────────────────────────────────
function restaurantTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '🍽️ המסעדה המובילה ב' + city,
      title:      name,
      subtitle:   'חוויה קולינרית בלתי נשכחת',
      body:       'ברוכים הבאים לחוויה קולינרית ייחודית. מטבח מקצועי, מרכיבים טריים, ואווירה חמה.',
      ctaText:    '📞 הזמינו שולחן עכשיו',
      trustItems: ['✓ מרכיבים טריים יומיים', '✓ שף מנוסה', '✓ אווירה ייחודית'],
    }),
    makeSection(ST.SERVICES, {
      title: 'התפריט שלנו',
      items: [
        { icon: '🥗', title: 'מנות ראשונות',  desc: 'מגוון סלטים ומנות פתיחה טריות.' },
        { icon: '🍖', title: 'מנות עיקריות',  desc: 'מנות שף מיוחדות מדי יום.' },
        { icon: '🍰', title: 'קינוחים',       desc: 'עוגות ומתוקים עשויים בבית.' },
        { icon: '🚗', title: 'משלוחים',       desc: 'משלוח מהיר עד הבית.' },
      ],
    }),
    makeSection(ST.TESTIMONIALS, {
      items: [
        { name: 'ספיר כ.', text: 'האוכל הכי טוב שאכלתי! המנות מדהימות.',    stars: 5 },
        { name: 'עמיר ל.', text: 'אווירה מקסימה ושירות מצוין. חוזרים!',     stars: 5 },
        { name: 'רחל מ.', text: 'המסעדה הכי טובה באזור. ממליצה לכולם!',    stars: 5 },
      ],
    }),
    makeSection(ST.CONTACT, {
      title:   'הזמינו שולחן',
      subtitle: 'התקשרו עכשיו או השאירו פרטים',
    }),
    makeSection(ST.CTA, {
      title:      'רעבים? אנחנו מחכים לכם!',
      subtitle:   'הזמינו שולחן היום – גם להפתעות ואירועים קטנים',
      buttonText: '📞 הזמינו עכשיו',
    }),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Law firm ─────────────────────────────────────────────────────
function lawyerTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '⚖️ ייצוג משפטי מקצועי ב' + city,
      title:      name,
      subtitle:   'הגנה על הזכויות שלכם',
      body:       'ניסיון רב שנים בתחומי המשפט. ייעוץ ראשוני חינם, ייצוג מקצועי, תוצאות מוכחות.',
      ctaText:    '📞 לייעוץ ראשוני חינם',
      trustItems: ['✓ ייעוץ ראשוני חינם', '✓ ניסיון מוכח', '✓ דיסקרטיות מלאה'],
    }),
    makeSection(ST.SERVICES, {
      title: 'תחומי התמחות',
      items: [
        { icon: '🏠', title: 'נדל"ן ומקרקעין',   desc: 'עסקאות נדל"ן, ליווי קניה ומכירה.' },
        { icon: '👨‍👩‍👧', title: 'דיני משפחה',       desc: 'גירושין, ירושה, מזונות.' },
        { icon: '💼', title: 'דיני עבודה',       desc: 'פיטורים, הסכמי העסקה, תביעות.' },
        { icon: '🏢', title: 'משפט מסחרי',       desc: 'חוזים, שותפויות, חברות.' },
      ],
    }),
    makeSection(ST.TESTIMONIALS, {
      items: [
        { name: 'לקוח מרוצה', text: 'הטיפול היה מקצועי ויסודי. תוצאה מצוינת!',       stars: 5 },
        { name: 'לקוחה מרוצה', text: 'נגישות גבוהה, מסביר בצורה ברורה. ממליצה!',     stars: 5 },
        { name: 'לקוח מרוצה', text: 'ייעוץ מדויק שחסך לי הרבה כסף וזמן.',           stars: 5 },
      ],
    }),
    makeSection(ST.FAQ, {
      items: [
        { q: 'האם הייעוץ הראשוני חינם?',           a: 'כן, מפגש ייעוץ ראשוני ניתן ללא עלות.' },
        { q: 'כמה זמן לוקח להגיע לתוצאות?',       a: 'זה תלוי בסוג התיק, נעדכן אתכם בכל שלב.' },
        { q: 'האם עובדים על בסיס הצלחה?',         a: 'בתיקים מסוימים כן, נבחן ביחד.' },
      ],
    }),
    makeSection(ST.CONTACT, {
      title:   'צרו קשר לייעוץ',
      subtitle: 'ייעוץ ראשוני חינם – ללא התחייבות',
    }),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Gym / Fitness ────────────────────────────────────────────────
function gymTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '💪 חדר הכושר המוביל ב' + city,
      title:      name,
      subtitle:   'בוא להשיג את הגוף שתמיד רצית',
      body:       'אימונים מקצועיים, ציוד מתקדם, מאמנים מוסמכים. הצטרף אלינו ושנה את חייך.',
      ctaText:    '💪 הצטרפו עכשיו',
      trustItems: ['✓ מאמנים מוסמכים', '✓ ציוד מתקדם', '✓ פתוח 24/7'],
    }),
    makeSection(ST.SERVICES, {
      title: 'האימונים שלנו',
      items: [
        { icon: '🏋️', title: 'כושר כללי',      desc: 'חדר כלי משקל ואימון פונקציונלי.' },
        { icon: '🧘', title: 'יוגה ופילאטיס',  desc: 'שיעורים קבוצתיים יומיים.' },
        { icon: '👤', title: 'מאמן אישי',       desc: 'תוכנית אישית מותאמת לך.' },
        { icon: '🥊', title: 'אגרוף ובריאות', desc: 'שיעורי קיקבוקסינג ואגרוף.' },
      ],
    }),
    makeSection(ST.TESTIMONIALS, {
      items: [
        { name: 'נועה ש.', text: 'ירדתי 15 קילו ב-3 חודשים! המאמנים מדהימים.',   stars: 5 },
        { name: 'רן א.',  text: 'האווירה הכי טובה. כולם חברותיים ומסייעים.',     stars: 5 },
        { name: 'גל מ.',  text: 'הצטרפתי לפני שנה ולא מפסיק. שינה לי את החיים!', stars: 5 },
      ],
    }),
    makeSection(ST.CTA, {
      title:      'שבוע ניסיון חינם!',
      subtitle:   'הצטרפו עכשיו וקבלו שבוע ניסיון ללא עלות',
      buttonText: '💪 התחילו עכשיו',
    }),
    makeSection(ST.CONTACT, {
      title:   'צרו קשר',
      subtitle: 'השאירו פרטים ונחזור אליכם עם מבצע כניסה',
    }),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Beauty salon ─────────────────────────────────────────────────
function beautyTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '💇 הסלון המוביל ב' + city,
      title:      name,
      subtitle:   'יופי שמתחיל בהרגשה טובה',
      body:       'סלון יופי מקצועי עם צוות מנוסה. תספורות, צבע, טיפולי פנים ועוד. בואו להרגיש מיוחדים.',
      ctaText:    '📅 קבעו תור עכשיו',
      trustItems: ['✓ עיצובים מקצועיים', '✓ מוצרים איכותיים', '✓ תורים מהירים'],
    }),
    makeSection(ST.SERVICES, {
      title: 'השירותים שלנו',
      items: [
        { icon: '✂️', title: 'תספורות',        desc: 'עיצוב שיער לנשים, גברים וילדים.' },
        { icon: '🎨', title: 'צבע וגוונים',    desc: 'צבע, גוון, בליאז׳ וטכניקות מתקדמות.' },
        { icon: '💅', title: 'ציפורניים',       desc: 'מניקור, פדיקור וג\'ל.' },
        { icon: '✨', title: 'טיפולי פנים',    desc: 'טיפולי עור מקצועיים ומרגיעים.' },
      ],
    }),
    makeSection(ST.TESTIMONIALS, {
      items: [
        { name: 'שיר ל.', text: 'הכי מקצועיות ביופי! התוצאה מדהימה תמיד.',      stars: 5 },
        { name: 'ליאת ב.', text: 'אווירה מקסימה ושירות אישי. חוזרת כל חודש!',   stars: 5 },
        { name: 'יעל כ.', text: 'הצביעה שלי יצאה בדיוק כמו שרציתי. תודה!',     stars: 5 },
      ],
    }),
    makeSection(ST.CTA, {
      title:      'מוכנות לחוות את השינוי?',
      subtitle:   'קבעו תור היום – מקומות מוגבלים!',
      buttonText: '📅 קבעו תור',
    }),
    makeSection(ST.CONTACT, {
      title:   'קבעו תור',
      subtitle: 'צרו קשר לתיאום תור מהיר',
    }),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Accountant ───────────────────────────────────────────────────
function accountantTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '📊 רואה חשבון מוסמך ב' + city,
      title:      name,
      subtitle:   'ניהול כספי חכם לעסק שלך',
      body:       'שירות מקצועי בהנהלת חשבונות, מיסוי ותכנון פיננסי. אנחנו מטפלים בכספים, אתם מתמקדים בעסק.',
      ctaText:    '📞 לייעוץ חינם',
      trustItems: ['✓ CPA מוסמך', '✓ 20 שנות ניסיון', '✓ חיסכון מובטח'],
    }),
    makeSection(ST.SERVICES, {
      title: 'השירותים שלנו',
      items: [
        { icon: '📒', title: 'הנהלת חשבונות',     desc: 'ניהול ספרים שוטף ומדויק.' },
        { icon: '💰', title: 'תכנון מס',           desc: 'אופטימיזציה מיסויית חוקית.' },
        { icon: '📋', title: 'דו"חות שנתיים',     desc: 'הכנה והגשה לרשויות המס.' },
        { icon: '👥', title: 'שכר ומשאבי אנוש',  desc: 'תלושי שכר וניהול שכר.' },
      ],
    }),
    makeSection(ST.FAQ, {
      items: [
        { q: 'כמה עולה שירות הנהלת חשבונות?',  a: 'המחיר מותאם לגודל העסק. נשמח לתת הצעה.' },
        { q: 'האם עובדים עם עצמאים?',           a: 'כן! אנחנו מטפלים בעצמאים, חברות ועמותות.' },
        { q: 'האם ניתן לקבל ייעוץ מיידי?',     a: 'ייעוץ ראשוני בטלפון ללא עלות ובהקדם.' },
      ],
    }),
    makeSection(ST.CONTACT, {
      title:   'צרו קשר',
      subtitle: 'ייעוץ ראשוני חינם – נשמח לעזור',
    }),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Default (generic business) ───────────────────────────────────
function defaultTemplate(name, city) {
  return [
    makeSection(ST.HERO, {
      badge:      '⭐ שירות מקצועי ב' + city,
      title:      name,
      subtitle:   'פתרונות מקצועיים לכל צורך',
      body:       'אנחנו מציעים שירות מקצועי, אמין ואיכותי. צוות מנוסה עם ניסיון מוכח ומחירים הוגנים.',
      ctaText:    '📞 צרו קשר עכשיו',
      trustItems: ['✓ ניסיון מוכח', '✓ מחיר הוגן', '✓ שירות אישי'],
    }),
    makeSection(ST.SERVICES),
    makeSection(ST.TESTIMONIALS),
    makeSection(ST.FAQ),
    makeSection(ST.CONTACT),
    makeSection(ST.CTA),
    makeSection(ST.FOOTER, {
      copyright: `${name} · ${city} · © ${new Date().getFullYear()}`,
    }),
  ]
}

// ── Template registry ─────────────────────────────────────────────
const TEMPLATE_MAP = {
  [BIZ.RESTAURANT]: restaurantTemplate,
  [BIZ.LAWYER]:     lawyerTemplate,
  [BIZ.GYM]:        gymTemplate,
  [BIZ.BEAUTY]:     beautyTemplate,
  [BIZ.ACCOUNTANT]: accountantTemplate,
  [BIZ.FLOORING]:   defaultTemplate,
  [BIZ.DEFAULT]:    defaultTemplate,
}

/**
 * getTemplate(bizType, name, city) → Section[]
 * Returns a ready-to-use sections array for a blank website.
 */
export function getTemplate(bizType, name = 'העסק שלי', city = '') {
  const fn = TEMPLATE_MAP[bizType] || defaultTemplate
  return fn(name, city)
}

export const TEMPLATE_NAMES = {
  [BIZ.RESTAURANT]: 'מסעדה / קפה',
  [BIZ.LAWYER]:     'עורך/ת דין',
  [BIZ.GYM]:        'חדר כושר',
  [BIZ.BEAUTY]:     'סלון יופי',
  [BIZ.ACCOUNTANT]: 'רואה חשבון',
  [BIZ.FLOORING]:   'ריצוף / שיפוצים',
  [BIZ.DEFAULT]:    'עסק כללי',
}
