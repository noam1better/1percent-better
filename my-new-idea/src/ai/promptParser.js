/**
 * promptParser.js
 * Extracts structured website data from free Hebrew text.
 * Zero deps — pure functions only.
 */

import { BIZ, detectBusinessType } from '../contentEngine'

// Israeli cities
const CITIES = [
  'ירושלים', 'תל אביב', 'חיפה', 'באר שבע', 'ראשון לציון',
  'פתח תקווה', 'פתח תקוה', 'אשדוד', 'נתניה', 'בני ברק',
  'חולון', 'בת ים', 'רמת גן', 'אשקלון', 'רחובות', 'הרצליה',
  'כפר סבא', 'רעננה', 'מודיעין', 'לוד', 'רמלה', 'עכו',
  'נהריה', 'טבריה', 'צפת', 'קריות', 'אילת', 'ראש העין',
  'גבעתיים', 'קריית גת', 'יבנה', 'נס ציונה', 'רמת השרון',
  'הוד השרון', 'ראשון', 'קריית אונו', 'אור יהודה', 'גני תקווה',
]

// Palette/style keywords
const PALETTE_KEYWORDS = {
  luxury:  ['יוקרה', 'יוקרתי', 'פרימיום', 'luxury', 'יוקרה', 'פינוק', 'עילית', 'בוטיק', 'עשיר'],
  minimal: ['מינימל', 'מינימליסטי', 'לבן', 'נקי', 'פשוט', 'ביל', 'minimal'],
  navy:    ['כחול', 'ים', 'טכנולוגי', 'היי-טק', 'דיגיטלי', 'חדשני'],
  forest:  ['ירוק', 'טבע', 'אקולוגי', 'טבעי', 'אורגני', 'eco'],
  violet:  ['סגול', 'קריאטיב', 'יצירתי', 'אמנותי'],
  dark:    ['כהה', 'מקצועי', 'רציני', 'עסקי'],
}

// Feature keywords
const FEATURES = {
  whatsapp:     ['וואטסאפ', 'ווצאפ', 'whatsapp', 'wa', 'מסרים', 'chat'],
  gallery:      ['גלריה', 'תמונות', 'עבודות', 'פרויקטים', 'portfolio'],
  faq:          ['שאלות', 'faq', 'q&a', 'שאלה', 'תשובות'],
  testimonials: ['המלצות', 'ביקורות', 'עדויות', 'לקוחות', 'חוות דעת', 'reviews'],
  contact_form: ['טופס', 'פנייה', 'ליד', 'פרטים', 'הרשמה'],
}

// Name extraction patterns
const NAME_PATTERNS = [
  /["״']([א-׿a-zA-Z\s]+)["״']/,         // quoted: "שם"
  /בשם\s+([א-׿a-zA-Z\s]+?)(?:\s+[בלאמ]|$)/,  // "בשם X"
  /לעסק\s+([א-׿a-zA-Z\s]+?)(?:\s+[בלאמ]|$)/,  // "לעסק X"
]

const BIZ_DEFAULT_NAMES = {
  [BIZ.RESTAURANT]: 'המסעדה שלנו',
  [BIZ.LAWYER]:     'משרד עורכי דין',
  [BIZ.GYM]:        'חדר הכושר שלנו',
  [BIZ.BEAUTY]:     'סלון היופי',
  [BIZ.ACCOUNTANT]: 'משרד רואה חשבון',
  [BIZ.FLOORING]:   'פרקט ועיצוב',
  [BIZ.DEFAULT]:    'העסק שלנו',
}

/**
 * parsePrompt(text) → ParsedPrompt
 *
 * @returns {{
 *   bizType: string,
 *   city: string,
 *   palette: string,
 *   features: Record<string, boolean>,
 *   name: string,
 *   phone: string,
 *   originalPrompt: string,
 *   confidence: number
 * }}
 */
export function parsePrompt(text = '') {
  const lower = text.toLowerCase()

  const bizType = detectBusinessType(text)
  const city    = CITIES.find(c => text.includes(c)) || ''
  const palette = detectPalette(text)
  const features = detectFeatures(lower)
  const name    = extractName(text, bizType)
  const phone   = extractPhone(text)

  // Confidence: how much info we extracted
  let confidence = 0.4
  if (bizType !== BIZ.DEFAULT) confidence += 0.25
  if (city)                     confidence += 0.2
  if (palette !== 'dark')       confidence += 0.1
  if (phone)                    confidence += 0.05

  return { bizType, city, palette, features, name, phone, originalPrompt: text, confidence }
}

function detectPalette(text) {
  for (const [palette, keywords] of Object.entries(PALETTE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return palette
  }
  return 'dark'
}

function detectFeatures(lower) {
  const f = {}
  for (const [key, keywords] of Object.entries(FEATURES)) {
    f[key] = keywords.some(kw => lower.includes(kw))
  }
  // Default: always show testimonials and contact
  f.testimonials = f.testimonials !== false ? true : f.testimonials
  f.contact_form = true
  return f
}

function extractName(text, bizType) {
  for (const pat of NAME_PATTERNS) {
    const m = text.match(pat)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return BIZ_DEFAULT_NAMES[bizType] || 'העסק שלנו'
}

function extractPhone(text) {
  const m = text.match(/0\d[-\s]?\d{2,3}[-\s]?\d{3,4}[-\s]?\d{3,4}/)
  return m ? m[0].replace(/[-\s]/g, '') : ''
}
