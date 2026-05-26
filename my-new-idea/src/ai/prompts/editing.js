// Intent detection and prompt building for AI editing commands

export const EDIT_INTENTS = {
  improve_hero:        ['שפר hero', 'שפר כותרת', 'עדכן hero', 'שנה כותרת ראשית', 'שפר הירו', 'כותרת טובה יותר'],
  rewrite_cta:         ['שנה cta', 'שפר cta', 'עדכן cta', 'כפתור', 'קריאה לפעולה'],
  improve_seo:         ['שפר seo', 'seo', 'אופטימיזציה', 'גוגל', 'כותרת seo', 'מילות מפתח'],
  regenerate_faq:      ['שנה faq', 'שפר שאלות', 'עדכן faq', 'שאלות נפוצות', 'שאלות חדשות'],
  improve_services:    ['שפר שירותים', 'עדכן שירותים', 'שירות חדש', 'הוסף שירות'],
  improve_testimonials:['שפר המלצות', 'עדכן ביקורות', 'המלצות חדשות', 'חוות דעת'],
  change_tone:         ['שנה טון', 'שנה סגנון', 'יותר מקצועי', 'יותר חברותי', 'יותר פורמלי', 'טון'],
  add_gallery:         ['הוסף גלריה', 'גלריה', 'תמונות'],
  improve_contact:     ['שפר contact', 'יצירת קשר', 'שנה טופס'],
}

export function detectEditIntent(message) {
  const lower = message.toLowerCase()
  for (const [intent, keywords] of Object.entries(EDIT_INTENTS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return intent
  }
  return 'general'
}

export function detectTone(message) {
  const m = message.toLowerCase()
  if (m.includes('חברותי') || m.includes('ידידותי') || m.includes('קז\'ואל')) return 'friendly and approachable'
  if (m.includes('פורמלי') || m.includes('רשמי'))                              return 'formal and authoritative'
  if (m.includes('מקצועי'))                                                    return 'professional and trustworthy'
  if (m.includes('יצירתי') || m.includes('מהנה'))                             return 'creative and energetic'
  if (m.includes('פשוט')   || m.includes('ישיר'))                             return 'simple and direct'
  return 'professional'
}

export function intentToSectionType(intent) {
  const map = {
    improve_hero:         'hero',
    rewrite_cta:          'cta',
    regenerate_faq:       'faq',
    improve_services:     'services',
    improve_testimonials: 'testimonials',
    improve_contact:      'contact',
  }
  return map[intent] || null
}
