import { BaseProvider } from './base'
import { mockGenerateWebsite, regenSingleSection, GENERATION_STEPS } from '../mockGenerator'

export { GENERATION_STEPS }

export class MockProvider extends BaseProvider {
  constructor() { super({}) }

  async generateWebsite(parsed, onStep) {
    return mockGenerateWebsite(parsed, onStep)
  }

  async regenSection(type, parsed) {
    return regenSingleSection(type, parsed)
  }

  async complete(messages, options = {}) {
    const userMsg = messages.filter(m => m.role === 'user').at(-1)?.content || ''
    await new Promise(r => setTimeout(r, 500 + Math.random() * 700))
    return { content: buildMockResponse(userMsg) }
  }

  async *stream(messages, options = {}) {
    const { content } = await this.complete(messages, options)
    // Simulate word-by-word streaming
    const words = content.split(' ')
    for (const word of words) {
      await new Promise(r => setTimeout(r, 40 + Math.random() * 60))
      yield word + ' '
    }
  }
}

const RESPONSES = {
  hero:         'עדכנתי את ה-Hero section — כותרת ראשית חדשה, תת-כותרת חזקה יותר, ו-CTA ממוקד.',
  cta:          'שיפרתי את ה-CTA — קריאה לפעולה חזקה ומניעה יותר עם דחיפות.',
  faq:          'עדכנתי את ה-FAQ עם 5 שאלות חדשות רלוונטיות לתחום שלך.',
  seo:          'שיפרתי את ה-SEO: כותרת ממוקדת, description עם מילות מפתח, ו-Open Graph.',
  services:     'עדכנתי את השירותים עם תיאורים ברורים יותר ואייקונים מתאימים.',
  testimonials: 'הוספתי 3 המלצות חדשות וספציפיות מלקוחות ישראלים.',
  tone:         'שיניתי את הטון של האתר. בדוק את התצוגה המקדימה ותאשר.',
  default:      'ביצעתי את השינוי המבוקש. בדוק את התצוגה המקדימה.',
}

function buildMockResponse(msg) {
  const m = msg.toLowerCase()
  if (m.includes('hero') || m.includes('כותרת ראשית')) return RESPONSES.hero
  if (m.includes('cta') || m.includes('כפתור'))          return RESPONSES.cta
  if (m.includes('faq') || m.includes('שאלות'))          return RESPONSES.faq
  if (m.includes('seo') || m.includes('גוגל'))           return RESPONSES.seo
  if (m.includes('שירות'))                               return RESPONSES.services
  if (m.includes('המלצ'))                                return RESPONSES.testimonials
  if (m.includes('טון') || m.includes('סגנון'))          return RESPONSES.tone
  return RESPONSES.default
}
