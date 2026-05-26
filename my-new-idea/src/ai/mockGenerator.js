/**
 * mockGenerator.js
 * Simulates AI website generation with realistic step-by-step progress.
 * Uses the existing content engine to produce high-quality output.
 */

import { generateBusinessContent } from '../contentEngine'
import { createWebsiteSchema, makeSection, ST } from '../engine/websiteSchema'

// ── Generation steps (shown in UI) ────────────────────────────────
export const GENERATION_STEPS = [
  { key: 'parse',       label: '🔍 מנתח פרומפט...',                 ms: 320 },
  { key: 'biz',         label: '🏪 מזהה סוג עסק ומיקום...',        ms: 280 },
  { key: 'style',       label: '🎨 בוחר ערכת עיצוב ופלטת צבעים...', ms: 360 },
  { key: 'hero',        label: '🎯 יוצר Hero section ו-CTA...',     ms: 440 },
  { key: 'services',    label: '⚡ מייצר רשימת שירותים מותאמת...',  ms: 380 },
  { key: 'reviews',     label: '⭐ מוסיף המלצות לקוחות אמיתיות...', ms: 320 },
  { key: 'faq',         label: '❓ יוצר שאלות נפוצות לתחום...',     ms: 300 },
  { key: 'contact',     label: '📱 מגדיר WhatsApp ו-Contact...',    ms: 240 },
  { key: 'seo',         label: '🔍 מייצר תגי SEO ומילות מפתח...',   ms: 280 },
  { key: 'theme',       label: '✨ מגמר עיצוב ופלטה...',            ms: 220 },
  { key: 'done',        label: '🚀 האתר מוכן!',                     ms: 100 },
]

// ── Style modifiers per palette ────────────────────────────────────
const STYLE_MODIFIERS = {
  luxury: {
    badge: (b) => b.replace('⭐', '👑').replace('מדורגים', 'הפרמיום'),
    titleSuffix: ' – ברמה שלא תשכחו',
    trustOverride: ['👑 פרמיום בלבד', '🏆 מעל 1,000 פרויקטים', '✅ אחריות 10 שנה', '⚡ ייעוץ אישי חינם'],
    ctaPrefix: '👑 ',
  },
  navy: {
    badge: (b) => '💼 ' + b.replace('⭐', '').trim(),
    titleSuffix: ' – טכנולוגיה מתקדמת',
    trustOverride: ['💻 פתרון דיגיטלי מלא', '🔒 אבטחה מקסימלית', '📊 דוחות בזמן אמת', '⚡ מענה 24/7'],
    ctaPrefix: '💼 ',
  },
  forest: {
    badge: (b) => '🌿 ' + b.replace('⭐', '').trim(),
    titleSuffix: ' – טבעי ובריא',
    trustOverride: ['🌿 100% טבעי', '♻️ ידידותי לסביבה', '🌱 חומרים אורגניים', '💚 בריאות קודמת'],
    ctaPrefix: '🌿 ',
  },
  minimal: {
    badge: (b) => b.replace('⭐ ', ''),
    titleSuffix: '',
    trustOverride: ['✓ עיצוב נקי', '✓ מינימל ויעיל', '✓ ממוקד בפרטים', '✓ מחיר שקוף'],
    ctaPrefix: '',
  },
  violet: {
    badge: (b) => '✨ ' + b.replace('⭐', '').trim(),
    titleSuffix: ' – יצירתי וייחודי',
    trustOverride: ['✨ עיצוב ייחודי', '🎨 גישה יצירתית', '🌟 כל פרויקט מיוחד', '💜 אוהבים מה שעושים'],
    ctaPrefix: '✨ ',
  },
}

// ── FAQ content per biz type ───────────────────────────────────────
const FAQ_BY_BIZ = {
  restaurant: [
    { q: 'האם אתם מציעים קייטרינג לאירועים?',      a: 'כן! אנחנו מציעים קייטרינג מלא לאירועים פרטיים ועסקיים. פנו אלינו לתיאום ומחיר.' },
    { q: 'האם יש אפשרות הזמנת שולחן מראש?',        a: 'בהחלט. מומלץ לשריין מקום מראש, במיוחד לסוף שבוע. ניתן להזמין בטלפון או בוואטסאפ.' },
    { q: 'האם יש אפשרות למנות ללא גלוטן / טבעוני?', a: 'כן, יש לנו מגוון מנות מותאמות לצרכים תזונתיים שונים. עדכנו אותנו בעת ההזמנה.' },
  ],
  lawyer: [
    { q: 'מה עלות הייעוץ הראשוני?',               a: 'פגישת ייעוץ ראשונה ניתנת ללא עלות. לאחר מכן נקבע שכ"ט בהתאם לתיק.' },
    { q: 'כמה זמן לוקח טיפול בתיק?',              a: 'משך הטיפול תלוי בסוג התיק והמורכבות. נעדכן אתכם בכל שלב לאורך הדרך.' },
    { q: 'האם עובדים על בסיס הצלחה?',             a: 'בתיקים מסוימים כן, תלוי בנסיבות. נבחן ביחד מה הכי מתאים לתיק שלכם.' },
  ],
  gym: [
    { q: 'האם יש שיעור ניסיון חינם?',              a: 'כן! אנחנו מציעים שיעור ניסיון ללא תשלום לכל מצטרף חדש. פנו אלינו לתיאום.' },
    { q: 'מה שעות הפעילות?',                       a: 'ימים א-ה 6:00-22:00, שישי 6:00-14:00, שבת 8:00-13:00.' },
    { q: 'האם יש חניה זמינה?',                     a: 'כן, יש חניה חינמית זמינה לחברי המועדון בצמוד למתקן.' },
  ],
  beauty: [
    { q: 'איך קובעים תור?',                        a: 'ניתן לתאם תור בטלפון, וואטסאפ או דרך הטופס באתר. לרוב יש זמינות תוך 48 שעות.' },
    { q: 'כמה זמן לוקח טיפול צביעה?',              a: 'תהליך צביעה מלא לוקח בין שעה וחצי לשלוש שעות, תלוי בסוג הצבע ואורך השיער.' },
    { q: 'האם צריך להגיע עם שיער נקי?',            a: 'לא בהכרח – אנחנו נסביר בעת התיאום. לרוב עדיף להגיע עם שיער נקי לטיפולי צבע.' },
  ],
  accountant: [
    { q: 'כמה עולה שירות הנהלת חשבונות חודשי?',   a: 'המחיר מותאם לגודל ומורכבות העסק. פנו אלינו לקבלת הצעת מחיר מפורטת.' },
    { q: 'האם עובדים עם עצמאים?',                 a: 'בהחלט! אנחנו עובדים עם עוסקים מורשים, חברות בע"מ ועמותות.' },
    { q: 'מה המועד האחרון להגשת הדוח השנתי?',     a: 'תלוי בסוג הדיווח. נוודא שתגישו בזמן וניצור תזכורות לפני כל מועד.' },
  ],
  flooring: [
    { q: 'כמה זמן לוקח להניח פרקט בדירה?',        a: 'דירה ממוצעת (90 מ"ר) לוקחת בין יום לשלושה ימי עבודה, תלוי בסוג החומר.' },
    { q: 'האם צריך לפנות את הבית לפני ההנחה?',    a: 'מומלץ לפנות ריהוט מהחדרים. אנחנו מסייעים בהזזה ומשאירים הכל מסודר.' },
    { q: 'מה ההבדל בין פרקט מלא ללמינציה?',       a: 'פרקט מלא עמיד יותר ואפשר לשייפו מחדש. למינציה זולה יותר ומתאימה לתקציב מוגבל.' },
  ],
  default: [
    { q: 'מה שעות הפעילות שלכם?',                  a: 'ימים א-ה 9:00-18:00, שישי 9:00-13:00. לפי תיאום ניתן גם בשעות אחרות.' },
    { q: 'האם ניתן לקבל ייעוץ ראשוני חינם?',       a: 'כן! אנחנו מציעים ייעוץ ראשוני ללא עלות לכל לקוח חדש.' },
    { q: 'מה אזורי השירות שלכם?',                  a: 'אנחנו משרתים את כל אזור המרכז ועובדים גם בפריפריה בתיאום מראש.' },
  ],
}

// ── Mock CTA content per biz type ─────────────────────────────────
const CTA_BY_BIZ = {
  restaurant: { title: 'מוכנים לחוויה קולינרית?', sub: 'הזמינו שולחן עכשיו – מקומות מוגבלים!', btn: '🍽️ הזמינו שולחן' },
  lawyer:     { title: 'יש לכם שאלה משפטית?',      sub: 'ייעוץ ראשוני חינם – ללא התחייבות',      btn: '⚖️ לייעוץ חינם' },
  gym:        { title: 'מוכנים להתחיל?',            sub: 'שיעור ניסיון חינם לכל מצטרף חדש!',     btn: '💪 שיעור ניסיון חינם' },
  beauty:     { title: 'מוכנות לשינוי?',            sub: 'קבעו תור עכשיו – מקומות מוגבלים!',     btn: '💇 קבעו תור' },
  accountant: { title: 'מחפשים רואה חשבון אמין?',  sub: 'ייעוץ מס ראשוני חינם לחלוטין',          btn: '📊 לייעוץ חינם' },
  flooring:   { title: 'הגיע הזמן לרצפה חדשה?',    sub: 'הצעת מחיר חינם – ללא התחייבות',         btn: '🏠 הצעת מחיר חינם' },
  default:    { title: 'מוכנים להתחיל?',            sub: 'צרו קשר עוד היום – ייעוץ חינם',        btn: '📞 צרו קשר עכשיו' },
}

// ── Main mock generator ────────────────────────────────────────────
export async function mockGenerateWebsite(parsed, onStep) {
  for (let i = 0; i < GENERATION_STEPS.length; i++) {
    const step = GENERATION_STEPS[i]
    onStep({ ...step, index: i, total: GENERATION_STEPS.length, done: false })
    await delay(step.ms + (Math.random() * 160 - 80))
  }

  const schema = buildSchema(parsed)

  // Final step marked done
  onStep({ ...GENERATION_STEPS.at(-1), index: GENERATION_STEPS.length - 1, total: GENERATION_STEPS.length, done: true })

  return schema
}

function buildSchema(parsed) {
  const { bizType, city, palette, features, name, phone, originalPrompt } = parsed

  // Use existing content engine for rich text
  const result = generateBusinessContent({
    name,
    city,
    phone,
    description: originalPrompt,
  })

  const schema = createWebsiteSchema({ name, city, phone, description: originalPrompt }, result)

  // Override theme
  schema.theme.palette = palette

  // Apply style modifiers
  applyStyleModifiers(schema, palette, result, parsed)

  // Add/enhance sections based on features
  enhanceSections(schema, features, bizType, phone, parsed)

  // Set SEO
  schema.seo = {
    title:       `${name}${city ? ' – ' + city : ''} | ${bizLabel(bizType)}`,
    description: result.landing.body?.slice(0, 155) || `${bizLabel(bizType)} מקצועי ב${city}. ניסיון מוכח, מחירים הוגנים.`,
    keywords:    `${name}, ${bizLabel(bizType)}, ${city}, שירות מקצועי`,
  }

  // Tag as AI-generated
  schema._aiGenerated = true
  schema._promptUsed  = originalPrompt

  return schema
}

function applyStyleModifiers(schema, palette, result, parsed) {
  const mod = STYLE_MODIFIERS[palette]
  if (!mod) return

  const hero = schema.sections.find(s => s.type === ST.HERO)
  if (hero) {
    if (mod.badge)        hero.data.badge    = mod.badge(hero.data.badge || '')
    if (mod.titleSuffix)  hero.data.subtitle = (hero.data.subtitle || '') + mod.titleSuffix
    if (mod.trustOverride) hero.data.trustItems = mod.trustOverride
    if (mod.ctaPrefix && hero.data.ctaText && !hero.data.ctaText.startsWith(mod.ctaPrefix)) {
      hero.data.ctaText = mod.ctaPrefix + hero.data.ctaText
    }
  }
}

function enhanceSections(schema, features, bizType, phone, parsed) {
  // Ensure FAQ exists with biz-specific questions
  let faq = schema.sections.find(s => s.type === ST.FAQ)
  if (!faq) {
    faq = makeSection(ST.FAQ)
    const ctaIdx = schema.sections.findIndex(s => s.type === ST.CTA)
    schema.sections.splice(ctaIdx > -1 ? ctaIdx : schema.sections.length - 1, 0, faq)
  }
  faq.data.items = FAQ_BY_BIZ[bizType] || FAQ_BY_BIZ.default

  // Gallery section if requested
  if (features.gallery) {
    const hasGallery = schema.sections.some(s => s.type === ST.GALLERY)
    if (!hasGallery) {
      const svcIdx = schema.sections.findIndex(s => s.type === ST.SERVICES)
      schema.sections.splice(svcIdx > -1 ? svcIdx + 1 : 2, 0, makeSection(ST.GALLERY))
    }
  }

  // WhatsApp in contact + CTA
  if (features.whatsapp) {
    const contact = schema.sections.find(s => s.type === ST.CONTACT)
    if (contact) contact.data.showWhatsapp = true

    const cta = schema.sections.find(s => s.type === ST.CTA)
    if (cta && phone) {
      cta.data.buttonAction = 'whatsapp'
      cta.data.buttonText   = '💬 שלחו הודעה בוואטסאפ'
    }
  }

  // Enhance CTA with biz-specific copy
  const ctaContent = CTA_BY_BIZ[bizType] || CTA_BY_BIZ.default
  const cta = schema.sections.find(s => s.type === ST.CTA)
  if (cta) {
    cta.data.title    = ctaContent.title
    cta.data.subtitle = ctaContent.sub
    if (!features.whatsapp || !phone) {
      cta.data.buttonText   = phone ? `📞 ${phone}` : ctaContent.btn
      cta.data.buttonAction = 'phone'
    }
  }
}

function bizLabel(type) {
  const m = { restaurant:'מסעדה', lawyer:'עורך דין', gym:'כושר ובריאות', beauty:'סלון יופי', accountant:'רואה חשבון', flooring:'ריצוף ופרקט', default:'שירות מקצועי' }
  return m[type] || 'שירות מקצועי'
}

// Regenerate a single section without the full step animation
export async function regenSingleSection(type, parsed) {
  await delay(700 + Math.random() * 400)
  const schema = buildSchema(parsed)
  return schema.sections.find(s => s.type === type) || null
}

function delay(ms) {
  return new Promise(r => setTimeout(r, Math.max(ms, 0)))
}
