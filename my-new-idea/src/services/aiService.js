const SYSTEM = `אתה עוזר AI מומחה לשיווק עסקים ישראלים.
מייצר תוכן שיווקי מקצועי, אמין ומתאים לקהל הישראלי.
תמיד מגיב בעברית, בטון חמים ומקצועי.
מחזיר JSON תקני בלבד – ללא טקסט נוסף.`

function buildPrompt({ name, city, phone, description }) {
  return `צור תוכן שיווקי מלא לעסק הבא:
שם: ${name}
עיר: ${city}
טלפון: ${phone || 'לא הוזן'}
תיאור: ${description || 'עסק מקצועי ואיכותי'}

החזר JSON עם המפתחות האלה בדיוק:
{
  "tagline": "משפט מכירה קצר וחזק",
  "whatsappOpener": "הודעת פתיחה לוואטסאפ עם אימוג'י, 3-4 שורות",
  "posts": ["פוסט1", "פוסט2", "פוסט3", "פוסט4", "פוסט5"],
  "adTitles": ["כותרת1", "כותרת2", "כותרת3"],
  "emailSubject": "נושא מייל",
  "emailBody": "גוף מייל מלא",
  "services": ["שירות1", "שירות2", "שירות3", "שירות4", "שירות5", "שירות6"],
  "reviews": [
    {"name": "שם לקוח", "text": "ביקורת קצרה", "stars": 5}
  ]
}`
}

export const aiService = {
  isEnabled: !!(import.meta.env.VITE_OPENAI_API_KEY),

  async generate(params) {
    const key = import.meta.env.VITE_OPENAI_API_KEY
    if (!key) return null

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.85,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: buildPrompt(params) },
          ],
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content?.trim()
      if (!raw) return null
      return JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return null
    }
  },
}
