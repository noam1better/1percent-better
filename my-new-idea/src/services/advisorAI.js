// Advisor AI — streaming business strategist
// Provider cascade: OpenAI → Claude → smart mock

const OPENAI_KEY    = import.meta.env.VITE_OPENAI_API_KEY
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

function buildSystemPrompt(biz) {
  return `אתה "BusinessBuilder AI" — יועץ אסטרטגי בכיר לעסקים קטנים ובינוניים בישראל. אתה חושב כמו מומחה שיווק ביצועים עם 20 שנות ניסיון בשוק הישראלי.

פרטי העסק:
- שם: ${biz.name || 'לא צוין'}
- סוג עסק: ${biz.bizType || 'לא צוין'}
- עיר: ${biz.city || 'לא צוין'}
- טלפון: ${biz.phone || 'לא צוין'}
- WhatsApp: ${biz.waNum || 'לא צוין'}
- שירותים: ${biz.services || 'לא צוין'}

העקרונות שלך:
1. חשוב המרות ראשית — כל עצה מכוונת ללידים ומכירות
2. היה ספציפי — פעולות קונקרטיות, לא עצות כלליות
3. פנה לעסק תמיד בשמו כשרלוונטי
4. השתמש במספרים ואחוזים כשאפשר
5. ענה בעברית בלבד — אפס מילים באנגלית
6. קצר ומדויק — עד 150 מילה
7. היה אנושי ואסטרטגי, לא "בוטי"`
}

async function streamOpenAI({ messages, systemPrompt, onChunk, onDone }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      max_tokens: 400,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') { onDone?.(); return }
      try {
        const chunk = JSON.parse(data).choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch {}
    }
  }
  onDone?.()
}

async function streamClaude({ messages, systemPrompt, onChunk, onDone }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(line.slice(6))
        if (ev.type === 'content_block_delta') {
          const t = ev.delta?.text
          if (t) onChunk(t)
        } else if (ev.type === 'message_stop') {
          onDone?.(); return
        }
      } catch {}
    }
  }
  onDone?.()
}

const MOCK_BANK = [
  'שיווק דרך WhatsApp הוא הערוץ עם שיעור ההמרה הגבוה ביותר לעסקים מקומיים.\n\n70% מהלקוחות מעדיפים לכתוב על פני להתקשר — הם רוצים לחשוב לפני שהם מתחייבים.\n\nהמלצה: הוסיפו הודעת פתיחה מוכנה: "שלום, ראיתי את האתר שלכם ומעוניין/ת לשמוע פרטים" — זה מוריד חיכוך ומגדיל פניות ב-40%.',
  'לתמחור תחרותי: בדקו 3 מתחרים באזורכם, ואז הציעו מחיר שנמוך ב-10% עם יתרון ברור — אחריות כתובה, מהירות תגובה, או ייעוץ חינם.\n\nלקוחות לא קונים את הזול ביותר — הם קונים את מה שמרגיש הכי בטוח ואמין.',
  'לתוכן שיווקי שעובד:\n\n• פוסט מקצועי — טיפ מהתחום שלכם\n• לפני/אחרי — הצגת עבודה אמיתית\n• המלצת לקוח — ציטוט מהחיים\n\nהעקביות שווה יותר מהגאונות — פוסט ממוצע כל שבוע עדיף על פוסט מושלם פעם בחודש.',
  'לקמפיין ממוקד: השוו בין 2 כותרות שונות עם תקציב של 50-100 ש"ח ל-3 ימים.\n\nואז הגדילו פי 5 את מה שעבד. אל תשקיעו הכל מהתחלה — נסו, מדדו, הגדילו.',
  'להגדלת חשיפה מקומית: הירשמו ל-Google Business (חינם) ובקשו מ-3 לקוחות מרוצים לכתוב ביקורת.\n\n5 ביקורות אמיתיות שוות יותר מכל קמפיין ממומן — זה המקום הראשון שלקוחות חדשים יחפשו אתכם.',
  'לסגירת עסקאות מהר יותר: פתחו שיחה עם שאלה, לא עם הצגה.\n\n"מה הדבר הכי חשוב לכם בשירות כזה?" — שאלה זו בונה אמון, מבינה את הצורך, ומאפשרת לכם להציע בדיוק מה שהם רוצים.',
  'לשיפור ה-CTA: הוסיפו דחיפות וספציפיות.\n\n"קבלו הצעת מחיר היום — נותרו 3 מקומות השבוע" ממיר פי 2 מ-"צרו קשר".\n\nדחיפות + מוגבלות = פעולה מיידית.',
]

function getMockReply(question) {
  const q = question.toLowerCase()
  if (q.includes('whatsapp') || q.includes('ווצאפ') || q.includes('הודעה'))             return MOCK_BANK[0]
  if (q.includes('מחיר') || q.includes('תמחור') || q.includes('תחרות'))                 return MOCK_BANK[1]
  if (q.includes('פוסט') || q.includes('תוכן') || q.includes('רשת') || q.includes('כתוב')) return MOCK_BANK[2]
  if (q.includes('קמפיין') || q.includes('פרסום') || q.includes('מודעה'))               return MOCK_BANK[3]
  if (q.includes('גוגל') || q.includes('ביקורת') || q.includes('לקוחות ראשונים'))       return MOCK_BANK[4]
  if (q.includes('סגירה') || q.includes('עסקה') || q.includes('מכירה'))                  return MOCK_BANK[5]
  if (q.includes('cta') || q.includes('כפתור') || q.includes('המרה'))                    return MOCK_BANK[6]
  return MOCK_BANK[Math.floor(Math.random() * MOCK_BANK.length)]
}

async function streamMock({ messages, onChunk, onDone }) {
  const lastMsg = messages[messages.length - 1]?.content || ''
  const reply   = getMockReply(lastMsg)

  for (const token of reply.split(/(\s+)/)) {
    if (token.trim()) {
      await new Promise(r => setTimeout(r, 45 + Math.random() * 45))
    }
    onChunk(token)
  }
  onDone?.()
}

export async function streamAI({ biz, messages, onChunk, onDone, onError }) {
  try {
    if (OPENAI_KEY) {
      try {
        await streamOpenAI({ messages, systemPrompt: buildSystemPrompt(biz), onChunk, onDone })
        return
      } catch (e) { console.warn('OpenAI failed:', e.message) }
    }

    if (ANTHROPIC_KEY) {
      try {
        await streamClaude({ messages, systemPrompt: buildSystemPrompt(biz), onChunk, onDone })
        return
      } catch (e) { console.warn('Claude failed:', e.message) }
    }

    await streamMock({ messages, onChunk, onDone })
  } catch (e) {
    onError?.(e)
  }
}

// ── Local business gap analysis (instant, no API) ─────────────────────
export function analyzeBusinessGaps(biz) {
  const insights = []

  if (!biz.waNum) {
    insights.push({
      id: 'no-whatsapp',
      icon: '💬',
      severity: 'high',
      title: 'WhatsApp לא מוגדר',
      text: 'עסקים עם WhatsApp מקבלים 40% יותר פניות — לקוחות מעדיפים להקליד על פני להתקשר.',
      cta: 'הוסיפו WhatsApp בהגדרות',
      ctaTab: 'settings',
    })
  }

  if (!biz.services || biz.services.trim().length < 10) {
    insights.push({
      id: 'no-services',
      icon: '📋',
      severity: 'medium',
      title: 'שירותים לא מפורטים',
      text: 'תיאור שירותים ספציפי מגדיל חשיפה בגוגל ומסביר ללקוח בדיוק מה הם מקבלים.',
      cta: 'הוסיפו שירותים בהגדרות',
      ctaTab: 'settings',
    })
  }

  if (!biz.city) {
    insights.push({
      id: 'no-city',
      icon: '📍',
      severity: 'medium',
      title: 'עיר לא מוגדרת',
      text: 'עסקים עם עיר מוגדרת מקבלים 60% יותר חשיפה בחיפושים מקומיים בגוגל.',
      cta: 'הגדירו עיר בהגדרות',
      ctaTab: 'settings',
    })
  }

  if (biz.bizType && biz.name && insights.length < 3) {
    insights.push({
      id: 'cta-tip',
      icon: '🎯',
      severity: 'tip',
      title: 'טיפ: הוסיפו דחיפות ל-CTA',
      text: '"קבלו הצעת מחיר היום — נותרו 3 מקומות" ממיר פי 2 מ-"צרו קשר". דחיפות = המרות.',
      cta: null,
      ctaTab: null,
    })
  }

  return insights.slice(0, 3)
}
