/**
 * websiteSchema.js — Website builder data model
 * Pure functions, zero external deps (except contentEngine slug util).
 *
 * Future AI integration:
 *   Replace buildSectionsFromResult() with AI-generated section data.
 *   The schema shape stays identical.
 */

import { getPublishSlug } from '../contentEngine'

// ── Section type keys ──────────────────────────────────────────────
export const ST = {
  HERO:         'hero',
  SERVICES:     'services',
  GALLERY:      'gallery',
  BEFORE_AFTER: 'before_after',
  OFFER:        'offer',
  TESTIMONIALS: 'testimonials',
  FAQ:          'faq',
  CONTACT:      'contact',
  CTA:          'cta',
  FOOTER:       'footer',
}

export const SECTION_META = {
  [ST.HERO]:         { label: 'Hero / כותרת',       icon: '🎯' },
  [ST.SERVICES]:     { label: 'שירותים',              icon: '⚡' },
  [ST.GALLERY]:      { label: 'גלריה',                icon: '🖼️' },
  [ST.BEFORE_AFTER]: { label: 'לפני ואחרי',           icon: '🔄' },
  [ST.OFFER]:        { label: 'הצעה מיוחדת',          icon: '🎁' },
  [ST.TESTIMONIALS]: { label: 'המלצות לקוחות',       icon: '⭐' },
  [ST.FAQ]:          { label: 'שאלות נפוצות',         icon: '❓' },
  [ST.CONTACT]:      { label: 'יצירת קשר',           icon: '📱' },
  [ST.CTA]:          { label: 'קריאה לפעולה',        icon: '🚀' },
  [ST.FOOTER]:       { label: 'כותרת תחתונה',        icon: '🦶' },
}

// ── Color palettes ─────────────────────────────────────────────────
export const PALETTES = {
  dark:     { label: 'כהה מקצועי',  bg: '#07111f', accent: '#d4af37', text: '#e8edf4', sub: '#4a6585', border: '#1b3a5e', card: '#0c1c32' },
  luxury:   { label: 'לוקסוס זהב',  bg: '#12090a', accent: '#d4af37', text: '#fef5e4', sub: '#9a8a7a', border: '#3a2a1a', card: '#1c0f10' },
  navy:     { label: 'כחול נייבי',  bg: '#050e1f', accent: '#3b82f6', text: '#e8f0ff', sub: '#4a6a8a', border: '#1a2e4a', card: '#0a1a2e' },
  forest:   { label: 'ירוק יער',    bg: '#050f09', accent: '#22c55e', text: '#f0fdf4', sub: '#4a7060', border: '#1a3a23', card: '#091505' },
  violet:   { label: 'סגול כהה',   bg: '#090514', accent: '#8b5cf6', text: '#f5f0ff', sub: '#6a5a8a', border: '#2a1a4a', card: '#120922' },
  minimal:  { label: 'מינימל לבן', bg: '#ffffff', accent: '#1a1a2e', text: '#1a1a2e', sub: '#6b7280', border: '#e5e7eb', card: '#f9fafb' },
  charcoal: { label: 'פחם אלגנטי', bg: '#0f0f14', accent: '#c0c8d4', text: '#e4e8f0', sub: '#6a7a8a', border: '#2a2a3a', card: '#171720' },
  blush:    { label: 'ורוד עדין',   bg: '#fdf8fc', accent: '#e879a0', text: '#2d1f2a', sub: '#9a7a8a', border: '#f0d4e8', card: '#fff5fb' },
}

const BIZ_PALETTE_MAP = {
  flooring:   'luxury',
  lawyer:     'charcoal',
  accountant: 'navy',
  gym:        'navy',
  beauty:     'blush',
  restaurant: 'luxury',
}

// ── Font options ───────────────────────────────────────────────────
export const FONTS = {
  heebo:     { label: 'Heebo',     css: "'Heebo', sans-serif",     url: 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap' },
  rubik:     { label: 'Rubik',     css: "'Rubik', sans-serif",     url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap' },
  assistant: { label: 'Assistant', css: "'Assistant', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap' },
}

// ── Default section data factories ────────────────────────────────
const DEFAULTS = {
  [ST.HERO]: () => ({
    badge:      '⭐ השירות המוביל באזור',
    title:      'כותרת ראשית',
    subtitle:   'תת-כותרת מושכת',
    body:       'תיאור מפורט של העסק שלכם. מה אתם מציעים ולמה כדאי לבחור בכם.',
    ctaText:    'צרו קשר עכשיו',
    ctaAction:  'phone',
    trustItems: ['✓ ניסיון מוכח', '✓ מחיר הוגן', '✓ שירות אישי'],
  }),
  [ST.SERVICES]: () => ({
    title:    'השירותים שלנו',
    subtitle: 'כל מה שאתם צריכים במקום אחד',
    layout:   'grid',
    items: [
      { icon: '⚡', title: 'שירות ראשון',  desc: 'תיאור קצר של השירות הראשון שאתם מציעים.' },
      { icon: '🎯', title: 'שירות שני',    desc: 'תיאור קצר של השירות השני שאתם מציעים.' },
      { icon: '💡', title: 'שירות שלישי', desc: 'תיאור קצר של השירות השלישי שאתם מציעים.' },
      { icon: '🔥', title: 'שירות רביעי', desc: 'תיאור קצר של השירות הרביעי שאתם מציעים.' },
    ],
  }),
  [ST.GALLERY]: () => ({
    title:    'הגלריה שלנו',
    subtitle: 'הצצה לעבודות ותוצרים',
    images:   [],
    layout:   'grid',
  }),
  [ST.TESTIMONIALS]: () => ({
    title:    'לקוחות ממליצים',
    subtitle: 'מה אומרים עלינו',
    items: [
      { name: 'יוסי כהן',  text: 'שירות מצוין! ממליץ בחום לכולם.',      stars: 5 },
      { name: 'מרים לוי',  text: 'מקצועי, אמין ומחיר הוגן. תודה רבה!', stars: 5 },
      { name: 'דוד גרין',  text: 'עבודה מעולה, תוצאות מדהימות!',        stars: 5 },
    ],
  }),
  [ST.FAQ]: () => ({
    title: 'שאלות נפוצות',
    items: [
      { q: 'מה שעות הפעילות שלכם?',           a: 'ימים א-ה 9:00-18:00, שישי 9:00-13:00.' },
      { q: 'האם ניתן לקבל ייעוץ חינם?',       a: 'כן! אנחנו מציעים ייעוץ ראשוני חינם לכל לקוח חדש.' },
      { q: 'מה אזורי השירות שלכם?',            a: 'אנחנו משרתים את כל אזור המרכז וסביבתו.' },
    ],
  }),
  [ST.BEFORE_AFTER]: () => ({
    title:    'לפני ואחרי',
    subtitle: 'תוצאות שמדברות בעד עצמן',
    items: [
      { beforeLabel: 'ריצוף ישן',  afterLabel: 'פרקט עץ מלא' },
      { beforeLabel: 'לינוליאום',  afterLabel: 'פרקט מהנדס'  },
      { beforeLabel: 'שיש מיושן',  afterLabel: 'פרסלן יוקרתי'},
      { beforeLabel: 'בטון גלוי',  afterLabel: 'פרקט צף'      },
    ],
  }),
  [ST.OFFER]: () => ({
    icon:      '⏱️',
    badge:     '✓ ללא עלות  ✓ ללא התחייבות',
    title:     'בדיקת התאמה והצעת מחיר תוך 24 שעות',
    subtitle:  'שלחו לנו תמונה של החדר וקבלו הצעה מפורטת — חינם ומהיר',
    ctaText:   '📱 שלח תמונה ב-WhatsApp עכשיו',
    ctaAction: 'whatsapp',
  }),
  [ST.CONTACT]: () => ({
    title:        'יצירת קשר',
    subtitle:     'נשמח לשמוע מכם',
    showForm:     true,
    showPhone:    true,
    showWhatsapp: true,
    showAddress:  false,
  }),
  [ST.CTA]: () => ({
    title:        'מוכנים להתחיל?',
    subtitle:     'צרו קשר עוד היום וקבלו ייעוץ ראשוני חינם',
    buttonText:   '📞 צרו קשר עכשיו',
    buttonAction: 'phone',
    style:        'gradient',
  }),
  [ST.FOOTER]: () => ({
    showLogo:  true,
    showPhone: true,
    showCity:  true,
    copyright: `© ${new Date().getFullYear()} כל הזכויות שמורות`,
    links:     [],
  }),
}

// ── makeSection — create a new section with defaults ──────────────
export function makeSection(type, overrides = {}) {
  return {
    id:      `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    visible: true,
    data:    { ...DEFAULTS[type]?.() ?? {}, ...overrides },
  }
}

// ── createWebsiteSchema — build full schema from form + result ─────
export function createWebsiteSchema(form, result) {
  const slug = getPublishSlug(form.name)
  return {
    id:        null,
    name:      form.name,
    city:      form.city,
    bizType:   result.bizType || 'default',
    slug,
    publicUrl: `https://bizbuilder.app/${slug}`,
    theme: {
      palette: BIZ_PALETTE_MAP[result.bizType] || 'dark',
      font:    'heebo',
    },
    seo: {
      title:       `${form.name} – ${form.city}`,
      description: form.description || result.landing?.body || '',
      keywords:    `${form.name}, ${form.city}, שירות`,
    },
    contact: {
      phone:    form.phone || '',
      whatsapp: form.phone || '',
      email:    '',
      address:  '',
      city:     form.city,
    },
    sections:  buildSectionsFromResult(form, result),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const ICONS = ['⚡', '🎯', '💡', '🔥', '🏆', '✅', '🌟', '⭐']

const FLOORING_SERVICES = [
  { icon: '🪵', title: 'פרקט עץ מלא', desc: 'אלון, אגוז ובוק – יופי טבעי, עמידות לשנים. מוסמך ומותקן בידי מומחים.' },
  { icon: '🏠', title: 'פרקט מהנדס',  desc: 'שכבות עץ אמיתי, יציב לשינויי לחות. מתאים לחימום תת-רצפתי.' },
  { icon: '✨', title: 'ריצוף קרמיקה ופרסלן', desc: 'יבוא ישיר, מגוון עצום, התקנה מקצועית עם אחריות מלאה.' },
]

const FLOORING_REVIEWS = [
  { name: 'משפחת כהן, ירושלים',  text: 'הנחת פרקט בכל הדירה — עבודה נקייה, מדויקת ומרהיבה. לא האמנו שיכול להיות כל כך יפה!', stars: 5 },
  { name: 'שרה ומשה לוי',         text: 'מהראשון ועד האחרון שירות מהמם. המחיר הוגן, הזמן שסוכם נשמר והתוצאה מושלמת.', stars: 5 },
  { name: 'דוד אברמוב, רחביה',   text: 'החלפנו פרקט ישן בפרקט עץ מלא. ההבדל פשוט מדהים — ממליץ ללא היסוס!', stars: 5 },
]

const FLOORING_FAQ = [
  { q: 'כמה זמן לוקחת הנחת פרקט?',               a: 'חדר ממוצע (20 מ"ר) — יום עבודה. דירה שלמה — 2-3 ימים.' },
  { q: 'מה ההבדל בין פרקט עץ מלא למהנדס?',       a: 'פרקט עץ מלא עשוי כולו מעץ אחד, יציב ומתאים לליטוש חוזר. פרקט מהנדס עמיד יותר לשינויי לחות ומתאים לחימום תת-רצפתי.' },
  { q: 'האם אתם נותנים אחריות?',                   a: 'כן! אחריות 10 שנה על כל עבודות ההתקנה.' },
  { q: 'האם אתם עובדים בדירות מאוכלסות?',         a: 'בהחלט. אנחנו מוציאים רהיטים, עובדים ומחזירים — עם ניקוי מלא בסיום.' },
]

function buildSectionsFromResult(form, result) {
  const { landing } = result
  const biz = result.bizType || 'default'
  const isFlooring = biz === 'flooring'

  if (!landing) {
    const base = [ST.HERO, ST.SERVICES, ST.TESTIMONIALS, ST.CONTACT, ST.FOOTER].map(t => makeSection(t))
    if (isFlooring) {
      base.splice(2, 0, makeSection(ST.GALLERY), makeSection(ST.BEFORE_AFTER))
      base.splice(base.length - 2, 0, makeSection(ST.OFFER))
    }
    return base
  }

  const sections = []

  // ── Hero ─────────────────────────────────────────────────────────
  sections.push(makeSection(ST.HERO, {
    badge:      landing.badge || (isFlooring ? '🪵 פרקט ורצפות יוקרה' : '⭐ השירות המוביל'),
    title:      landing.title,
    subtitle:   landing.tagline || '',
    body:       landing.body   || '',
    ctaText:    isFlooring
      ? '📱 קבל הצעת מחיר ב-WhatsApp'
      : (form.phone ? `📞 התקשרו: ${form.phone}` : 'צרו קשר עכשיו'),
    ctaAction:  isFlooring ? 'whatsapp' : 'phone',
    ctaText2:   isFlooring && form.phone ? `📞 ${form.phone}` : undefined,
    ctaAction2: 'phone',
    trustItems: landing.trust?.length
      ? landing.trust
      : isFlooring ? ['אחריות 10 שנה', 'הצעת מחיר תוך 24 שעות', 'ניסיון של 15 שנה'] : [],
  }))

  // ── Services ──────────────────────────────────────────────────────
  sections.push(makeSection(ST.SERVICES, {
    title:    'השירותים שלנו',
    subtitle: isFlooring ? 'פרקט ורצפות יוקרה – הכל תחת קורת גג אחת' : undefined,
    items: isFlooring
      ? FLOORING_SERVICES
      : (landing.services || []).map((s, i) => ({ icon: ICONS[i % ICONS.length], title: s, desc: '' })),
  }))

  // ── Gallery + Before/After (flooring) ────────────────────────────
  if (isFlooring) {
    sections.push(makeSection(ST.GALLERY, {
      title:    'גלריית עבודות',
      subtitle: 'חלק מהפרויקטים שביצענו לאחרונה',
    }))
    sections.push(makeSection(ST.BEFORE_AFTER, {
      title:    'לפני ואחרי',
      subtitle: 'ראו בעצמכם את ההבדל שאנחנו עושים',
      items: [
        { beforeLabel: 'ריצוף ישן',  afterLabel: 'פרקט עץ מלא'   },
        { beforeLabel: 'לינוליאום',  afterLabel: 'פרקט מהנדס'    },
        { beforeLabel: 'שיש מיושן',  afterLabel: 'פרסלן יוקרתי' },
        { beforeLabel: 'בטון גלוי',  afterLabel: 'פרקט צף'       },
      ],
    }))
  }

  // ── Testimonials ──────────────────────────────────────────────────
  sections.push(makeSection(ST.TESTIMONIALS, {
    title: 'לקוחות ממליצים',
    items: landing.reviews?.length
      ? landing.reviews.map(r => ({ name: r.name, text: r.text, stars: r.stars || 5 }))
      : isFlooring ? FLOORING_REVIEWS : DEFAULTS[ST.TESTIMONIALS]().items,
  }))

  // ── FAQ ───────────────────────────────────────────────────────────
  sections.push(makeSection(ST.FAQ, {
    items: isFlooring ? FLOORING_FAQ : DEFAULTS[ST.FAQ]().items,
  }))

  // ── Offer (flooring) ──────────────────────────────────────────────
  if (isFlooring) {
    sections.push(makeSection(ST.OFFER, {
      icon:      '⏱️',
      badge:     '✓ ללא עלות  ✓ ללא התחייבות',
      title:     'בדיקת התאמה והצעת מחיר תוך 24 שעות',
      subtitle:  'שלחו לנו תמונה של החדר וקבלו הצעה מפורטת — חינם ומהיר',
      ctaText:   '📱 שלח תמונה ב-WhatsApp עכשיו',
      ctaAction: 'whatsapp',
    }))
  }

  // ── Contact ───────────────────────────────────────────────────────
  sections.push(makeSection(ST.CONTACT, {
    title:        isFlooring ? 'קבל הצעת מחיר' : 'יצירת קשר',
    subtitle:     isFlooring ? 'ייעוץ חינמי · סקר בית · הצעה תוך 24 שעות' : 'נשמח לשמוע מכם – ייעוץ ראשוני חינם',
    showForm:     true,
    showPhone:    !!form.phone,
    showWhatsapp: !!form.phone,
  }))

  // ── CTA ───────────────────────────────────────────────────────────
  sections.push(makeSection(ST.CTA, {
    title:        isFlooring ? 'מוכנים לשדרג את הבית?' : 'מוכנים להתחיל?',
    subtitle:     isFlooring ? 'הצעת מחיר חינמית · אחריות 10 שנה · עבודה נקייה ומקצועית' : 'צרו קשר עוד היום וקבלו ייעוץ ראשוני חינם',
    buttonText:   form.phone ? `📞 ${form.phone}` : '📞 צרו קשר עכשיו',
    buttonAction: 'phone',
  }))

  // ── Footer ────────────────────────────────────────────────────────
  sections.push(makeSection(ST.FOOTER, {
    copyright: `${form.name} · ${form.city} · © ${new Date().getFullYear()}`,
  }))

  return sections
}
