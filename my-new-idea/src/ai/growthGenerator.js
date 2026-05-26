/**
 * growthGenerator.js
 * Generates the full "AI Business Growth Package" for a business.
 * Uses contentEngine templates as a base and adds growth-specific layers.
 */

import {
  generateBusinessContent,
  detectBusinessType,
  BIZ,
  BIZ_META,
} from '../contentEngine'

export const GROWTH_STEPS = [
  { key: 'analyze',   label: 'מנתח את העסק...' },
  { key: 'landing',   label: 'בונה דף נחיתה...' },
  { key: 'whatsapp',  label: 'יוצר משפך וואטסאפ...' },
  { key: 'ads',       label: 'כותב מודעות פרסום...' },
  { key: 'posts',     label: 'מגבש פוסטים לסושיאל...' },
  { key: 'sales',     label: 'מכין תסריט מכירה...' },
  { key: 'offers',    label: 'מעצב חבילות מחיר...' },
]

// ── WA Follow-up drip messages ────────────────────────────────────
function buildWAFunnel(tpl, ctx) {
  const { name, city, phone, desc } = ctx
  return [
    tpl.whatsappOpener,

    `היי שוב! 👋\n\nרצינו לוודא שקיבלת את ההודעה שלנו.\n\n${name} ב${city} מחכה לך – ${desc}.\n\n${phone ? `📞 ${phone}` : 'שלחו הודעה ונחזור אליכם'}`,

    `💡 טיפ מ${name}:\n\nרוב הלקוחות שלנו לא ידעו כמה הם מפסידים עד שניסו אותנו.\n\nקבע/י עכשיו ייעוץ קצר – ללא התחייבות, ללא תשלום.\n\n${phone ? `📞 ${phone}` : 'DM עכשיו'}`,

    `⏰ רגע לפני שמפסידים...\n\nיש לנו מקום פנוי השבוע ב${name}.\n\nלקוחות שנכנסים השבוע מקבלים ${desc.includes('חינם') ? 'עדיפות קדימה' : 'ייעוץ ראשוני חינם'}.\n\nענו להודעה ונשריין לך מקום 📅`,

    `🙏 הודעה אחרונה מ${name}:\n\nאם הזמן עכשיו לא מתאים – אין בעיה.\n\nכשתהיו מוכנים, אנחנו כאן.\n\n${phone ? `📞 ${phone}` : ''}\n📍 ${city}`,
  ]
}

// ── Drip follow-up emails/SMS ─────────────────────────────────────
function buildFollowUps(ctx) {
  const { name, city, phone, desc } = ctx
  return [
    { delay: 'מיד אחרי פגישה', text: `תודה שבחרת ב${name}! שמחים שהכרנו. אם יש שאלות – אנחנו כאן. ${phone || ''}` },
    { delay: '3 ימים אחרי',    text: `היי! בדקנו – יש לנו פתרון מושלם עבורך ב${desc}. נוח לדבר?` },
    { delay: 'שבוע אחרי',      text: `💡 השבוע ב${name}: ${desc}. לקוחות שחזרו השבוע קיבלו הצעה מיוחדת. עניין?` },
    { delay: '2 שבועות אחרי',  text: `"הלקוחות שחיכו חודש – ממש חבל שלא הגיעו קודם." שמור/י מקום עכשיו: ${phone || ''}` },
    { delay: 'חודש אחרי',      text: `${name} ב${city} – אנחנו עדיין כאן בשבילך. ${desc}. מוכן/ה לצעד הבא?` },
  ]
}

// ── Facebook Ad ──────────────────────────────────────────────────
function buildFacebookAd(ctx) {
  const { name, city, phone, desc } = ctx
  return {
    headline:     `${name} – ${city} | לא מחפשים לקוחות, מחפשים את הנכונים`,
    primaryText:  `🎯 ${desc}\n\nב${name} אנחנו עושים דבר אחד – ועושים אותו ממש טוב.\n\n✅ ניסיון מוכח\n✅ ייעוץ ראשוני חינם\n✅ מענה תוך שעה\n\n📍 ${city}${phone ? ` | 📞 ${phone}` : ''}\n\nלחצו "למידע נוסף" →`,
    cta:          'למידע נוסף',
    description:  `${desc} ב${city}. ייעוץ ראשוני חינם ללא התחייבות.`,
  }
}

// ── Google Ad ────────────────────────────────────────────────────
function buildGoogleAd(ctx) {
  const { name, city, desc } = ctx
  const shortDesc = desc.split(' ').slice(0, 5).join(' ')
  return {
    headlines: [
      `${name} | ${city}`,
      `${shortDesc} מקצועי`,
      `ייעוץ ראשוני חינם`,
      `מענה מהיר · ${city}`,
    ],
    descriptions: [
      `${name} מספק ${shortDesc} ב${city}. ניסיון מוכח, מחירים הוגנים. צרו קשר עכשיו!`,
      `מחפשים ${shortDesc}? ${name} ב${city} – ייעוץ חינם, תוצאות מוכחות. לחצו להתקשרות.`,
    ],
  }
}

// ── Sales script ─────────────────────────────────────────────────
function buildSalesScript(ctx, bizType) {
  const { name, city, desc } = ctx
  const opener = {
    [BIZ.RESTAURANT]:  'שלום! ראיתי שאתם מחפשים מקום לאירוע/ארוחה ב' + city + '. נשמח לעזור.',
    [BIZ.LAWYER]:      'שלום, כאן ' + name + '. ראיתי שפניתם בנושא משפטי. אשמח לשמוע.',
    [BIZ.ACCOUNTANT]:  'שלום! כאן ' + name + ' – ראיתי שאתם מחפשים ייעוץ מס. מה השאלה?',
    [BIZ.FLOORING]:    'היי! ראיתי שמתעניינים ברצפה חדשה. כמה חדרים/שטח מדובר?',
    [BIZ.GYM]:         'היי! שמחים לראות שאתם מעוניינים להתחיל להתאמן. מה המטרה שלכם?',
    [BIZ.BEAUTY]:      'היי! ראיתי שרוצים לקבוע תור. מתי נוח לכם – בוקר או אחהצ?',
    [BIZ.DEFAULT]:     'שלום! כאן ' + name + ' מ' + city + '. ראיתי שהתעניינתם בשירותים שלנו.',
  }
  return {
    opening:   opener[bizType] || opener[BIZ.DEFAULT],
    discovery: `שאלות גילוי:\n• "מה חשוב לכם הכי הרבה בשירות כזה?"\n• "מה ניסיתם עד עכשיו ולא עבד?"\n• "מה המסגרת תקציבית שאתם מסתכלים עליה?"\n• "מתי הייתם רוצים להתחיל?"`,
    pitch:     `הצגת הפתרון:\n"בהתבסס על מה שסיפרתם – יש לי פתרון מדויק בשבילכם.\n${desc}.\nמה שמייחד אותנו: [תגידו 2-3 יתרונות ספציפיים]."`,
    objections: `טיפול בהתנגדויות:\n• "יקר לי" → "בואו נסתכל על הערך לאורך זמן..."\n• "צריך לחשוב" → "מה הספק שעדיין קיים?"\n• "יש לי ספק" → "הבנתי. תנו לי לשאול – מה הכי מדאיג?"\n• "כבר יש לי ספק" → "מה שהם לא יכולים לתת לכם שאנחנו כן..."`,
    close:     `סגירה:\n"אז לסכם – [חזור על הצרכים שציינו].\nאני מציע [הפתרון] ב[מחיר].\nמתחילים?"\n\nאם "כן": "מעולה! [השלב הבא]"\nאם "לא": "אין בעיה. מתי כדאי לדבר שוב?"`,
  }
}

// ── Offers ───────────────────────────────────────────────────────
const OFFERS_BY_TYPE = {
  [BIZ.RESTAURANT]:  [
    { title: 'ייעוץ ראשוני חינם', desc: 'שיחת טלפון 15 דקות להכיר ולתכנן', price: 'חינם' },
    { title: 'ארוחה עסקית', desc: 'תפריט קבוע ב₪49 לאדם – כולל שתייה ועוד', price: '₪49/אדם' },
    { title: 'קייטרינג לאירוע', desc: 'ייעוץ + תפריט + הצעת מחיר מלאה', price: 'ממותאם' },
  ],
  [BIZ.LAWYER]:  [
    { title: 'ייעוץ ראשוני חינם', desc: 'שיחת טלפון 20 דקות ללא תשלום', price: 'חינם' },
    { title: 'עריכת חוזה', desc: 'בדיקה + הערות + ניסוח', price: 'מ-₪500' },
    { title: 'ליווי מלא', desc: 'ייצוג בכל ערכאות ושלבי ההליך', price: 'לפי תיק' },
  ],
  [BIZ.ACCOUNTANT]:  [
    { title: 'ייעוץ ראשוני חינם', desc: 'שיחת היכרות 20 דקות ומה נדרש', price: 'חינם' },
    { title: 'דוח שנתי עצמאי', desc: 'הכנה + הגשה + ייעוץ מס', price: 'מ-₪800' },
    { title: 'ניהול שוטף', desc: 'הנה"ח חודשי + שכר + דוחות', price: 'מ-₪400/חודש' },
  ],
  [BIZ.FLOORING]:  [
    { title: 'הצעת מחיר חינם', desc: 'מדידה + המלצת חומר + הצעה תוך 24 שעות', price: 'חינם' },
    { title: 'חדר אחד', desc: 'עד 20 מ"ר – פרקט + עבודה', price: 'מ-₪2,200' },
    { title: 'פרויקט מלא', desc: 'כל הדירה + פינוי ישן + אחריות', price: 'לפי מ"ר' },
  ],
  [BIZ.GYM]:  [
    { title: 'שיעור ניסיון חינם', desc: 'כל שיעור קבוצה או אימון אישי', price: 'חינם' },
    { title: 'מנוי חודשי', desc: 'כניסות בלתי מוגבלות + ייעוץ תזונה', price: '₪199/חודש' },
    { title: 'ליווי אישי', desc: '8 אימונים + תוכנית תזונה + מעקב', price: '₪1,290' },
  ],
  [BIZ.BEAUTY]:  [
    { title: 'תור ניסיון', desc: 'טיפול ראשון בהנחה 20%', price: '-20%' },
    { title: 'טיפול בודד', desc: 'כל טיפול לפי תעריף', price: 'מ-₪80' },
    { title: 'חבילת סטייל', desc: 'תספורת + צביעה + טיפול + גיימיש', price: '₪350' },
  ],
  [BIZ.DEFAULT]:  [
    { title: 'ייעוץ ראשוני חינם', desc: 'שיחה קצרה ללא התחייבות', price: 'חינם' },
    { title: 'שירות בסיסי', desc: 'פתרון מהיר ומדויק לצורך שלכם', price: 'מ-₪300' },
    { title: 'חבילה מלאה', desc: 'ליווי מלא מהתחלה ועד סוף', price: 'לפי הצורך' },
  ],
}

// ── Pricing packages ──────────────────────────────────────────────
const PACKAGES_BY_TYPE = {
  [BIZ.LAWYER]:  [
    { name: 'ייעוץ', price: 'חינם', period: '', features: ['שיחת טלפון 20 דקות', 'הסבר על המצב המשפטי', 'המלצה על המשך'] },
    { name: 'בסיסי', price: '₪500', period: 'לפי עבודה', features: ['עריכת מסמך/חוזה', 'בדיקה וייעוץ', 'תשובה בכתב'] },
    { name: 'ייצוג מלא', price: 'לפי תיק', period: '', features: ['ייצוג בכל ערכאות', 'הכנת טיעונים', 'ליווי לכל אורך ההליך', 'זמינות מלאה'] },
  ],
  [BIZ.ACCOUNTANT]:  [
    { name: 'עצמאי', price: '₪800', period: 'שנה', features: ['דוח שנתי', 'הגשה לרשויות', 'ייעוץ מס בסיסי'] },
    { name: 'חברה', price: '₪400', period: 'חודש', features: ['הנה"ח חודשי', 'תלושי שכר', 'דוחות מע"מ', 'ייעוץ שוטף'] },
    { name: 'פרימיום', price: '₪700', period: 'חודש', features: ['הכל בחבילת חברה', 'תכנון מס מתקדם', 'ייצוג מול רשויות', 'זמינות 24/7'] },
  ],
  [BIZ.GYM]:  [
    { name: 'בסיסי', price: '₪99', period: 'חודש', features: ['כניסות חופשיות', 'ציוד בסיסי', 'שיעורי קבוצה'] },
    { name: 'Pro', price: '₪199', period: 'חודש', features: ['הכל בבסיסי', 'אימון אישי x2', 'ייעוץ תזונה', 'מעקב התקדמות'] },
    { name: 'Elite', price: '₪399', period: 'חודש', features: ['כל שירותי Pro', 'אימון אישי x8', 'תוכנית מותאמת', 'ליווי 24/7'] },
  ],
  default:  [
    { name: 'בסיסי', price: 'חינם', period: '', features: ['ייעוץ ראשוני', 'הצעת מחיר', 'זמינות לשאלות'] },
    { name: 'רגיל', price: '₪299', period: 'פרויקט', features: ['שירות מלא', 'אחריות', 'מענה מהיר'] },
    { name: 'פרימיום', price: '₪699', period: 'פרויקט', features: ['הכל ברגיל', 'ליווי אישי', 'עדיפות מענה', 'תמיכה מורחבת'] },
  ],
}

// ── Main export ───────────────────────────────────────────────────
export async function generateGrowthPackage({ name, city, phone, description }, onStep = () => {}) {
  const desc = (description || '').trim() || 'שירות מקצועי ואיכותי'
  const bizType = detectBusinessType(desc)
  const ctx = { name, city, phone: phone || '', desc }

  onStep({ index: 0, key: 'analyze' })
  await tick(200)

  const contentResult = generateBusinessContent({ name, city, phone, description })

  onStep({ index: 1, key: 'landing' })
  await tick(300)

  onStep({ index: 2, key: 'whatsapp' })
  await tick(350)
  const templateBase = contentResult
  const waFunnel = buildWAFunnel({ whatsappOpener: contentResult.whatsapp }, ctx)
  const followUps = buildFollowUps(ctx)

  onStep({ index: 3, key: 'ads' })
  await tick(350)
  const facebookAd = buildFacebookAd(ctx)
  const googleAd   = buildGoogleAd(ctx)

  onStep({ index: 4, key: 'posts' })
  await tick(300)

  onStep({ index: 5, key: 'sales' })
  await tick(350)
  const salesScript = buildSalesScript(ctx, bizType)

  onStep({ index: 6, key: 'offers' })
  await tick(250)
  const offers   = OFFERS_BY_TYPE[bizType]   || OFFERS_BY_TYPE[BIZ.DEFAULT]
  const packages = PACKAGES_BY_TYPE[bizType] || PACKAGES_BY_TYPE.default

  return {
    bizType,
    bizMeta:     BIZ_META[bizType],
    name,
    city,
    phone:       phone || '',
    description: desc,
    landing:     contentResult.landing,
    adTitles:    contentResult.adTitles,
    emailSubject: contentResult.emailSubject,
    emailBody:   contentResult.emailBody,
    posts:       contentResult.posts,
    waFunnel,
    followUps,
    facebookAd,
    googleAd,
    salesScript,
    offers,
    packages,
    createdAt:   new Date().toISOString(),
  }
}

function tick(ms) { return new Promise(r => setTimeout(r, ms)) }
