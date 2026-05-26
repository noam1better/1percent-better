import { makeSection, ST } from '../engine/websiteSchema'

// Strip markdown code fences
function stripMarkdown(text) {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

// Attempt to extract JSON from text that may contain surrounding content
function extractJSON(text) {
  if (!text) return null
  const s = stripMarkdown(text)

  // Direct parse
  try { return JSON.parse(s) } catch {}

  // Find outermost object
  const start = s.indexOf('{')
  const end   = s.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }

  // Fix common AI JSON mistakes
  const fixed = s
    .replace(/,(\s*[}\]])/g, '$1')  // trailing commas
    .replace(/([{,]\s*)(\w+)(\s*):/g, '$1"$2"$3:')  // unquoted keys
  try { return JSON.parse(fixed) } catch {}

  return null
}

const SECTION_ORDER = [ST.HERO, ST.SERVICES, ST.GALLERY, ST.TESTIMONIALS, ST.FAQ, ST.CONTACT, ST.CTA, ST.FOOTER]
const REQUIRED      = [ST.HERO, ST.SERVICES, ST.TESTIMONIALS, ST.FAQ, ST.CONTACT, ST.CTA, ST.FOOTER]

function normalizeSection(raw) {
  if (!raw?.type) return null
  return {
    id:      raw.id      || `${raw.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type:    raw.type,
    visible: raw.visible ?? true,
    data:    raw.data    || {},
  }
}

function fillAndOrderSections(sections) {
  const byType = Object.fromEntries(sections.map(s => [s.type, s]))
  for (const type of REQUIRED) {
    if (!byType[type]) byType[type] = makeSection(type)
  }
  return SECTION_ORDER
    .filter(t => byType[t])
    .map(t => byType[t])
}

function hebrewSlug(name = '') {
  const map = {
    'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'y',
    'כ':'k','ל':'l','מ':'m','נ':'n','ס':'s','ע':'a','פ':'p','צ':'ts','ק':'k','ר':'r',
    'ש':'sh','ת':'t','ך':'k','ם':'m','ן':'n','ף':'p','ץ':'ts',
  }
  return name.split('').map(c => map[c] || c).join('')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'business'
}

// Parse full website schema from AI text response
export function recoverWebsiteJSON(rawText, parsed) {
  const obj = extractJSON(rawText)

  if (!obj || typeof obj !== 'object') {
    console.warn('[jsonRecovery] Could not parse AI response — using defaults')
    return null  // caller falls back to mock
  }

  const rawSections = Array.isArray(obj.sections) ? obj.sections : []
  const sections = fillAndOrderSections(
    rawSections.map(normalizeSection).filter(Boolean)
  )

  return {
    name:    obj.name    || parsed.name    || 'העסק שלנו',
    city:    obj.city    || parsed.city    || '',
    bizType: obj.bizType || parsed.bizType || 'default',
    slug:    obj.slug    || hebrewSlug(obj.name || parsed.name),
    publicUrl: `${window.location.origin}/s/${obj.slug || hebrewSlug(obj.name || parsed.name)}`,
    theme: {
      palette: obj.theme?.palette || parsed.palette || 'dark',
      font:    obj.theme?.font    || 'heebo',
    },
    seo: {
      title:       obj.seo?.title       || `${obj.name || 'העסק'} | שירות מקצועי`,
      description: obj.seo?.description || '',
      keywords:    obj.seo?.keywords    || '',
    },
    contact: {
      phone:    obj.contact?.phone    || parsed.phone || '',
      whatsapp: obj.contact?.whatsapp || parsed.phone || '',
      email:    obj.contact?.email    || '',
      city:     obj.contact?.city     || obj.city     || parsed.city || '',
    },
    sections,
    _aiGenerated: true,
    _promptUsed:  parsed.originalPrompt,
  }
}

// Parse a single section data object from AI text
export function recoverSectionJSON(rawText, sectionType, fallback) {
  const obj = extractJSON(rawText)
  if (obj && typeof obj === 'object') {
    const data = obj.data || obj
    const base = fallback || makeSection(sectionType)
    return { ...base, data: { ...base.data, ...data } }
  }
  return fallback || makeSection(sectionType)
}

// Parse SEO object from AI text
export function recoverSEOJSON(rawText, fallback = {}) {
  const obj = extractJSON(rawText)
  return (obj?.title || obj?.description || obj?.keywords) ? obj : fallback
}

// Parse { hero, cta } object from tone-change response
export function recoverToneJSON(rawText) {
  const obj = extractJSON(rawText)
  if (!obj) return null
  return {
    hero: obj.hero || null,
    cta:  obj.cta  || null,
  }
}
