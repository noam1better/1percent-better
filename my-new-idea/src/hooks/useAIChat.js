import { useState, useCallback } from 'react'
import { getProvider, isMockMode }  from '../ai/providers/index'
import { detectEditIntent, detectTone, intentToSectionType } from '../ai/prompts/editing'
import {
  SECTION_EDIT_PROMPT, SEO_PROMPT, SECTION_REGEN_PROMPT, TONE_CHANGE_PROMPT,
} from '../ai/prompts/system'
import { recoverSectionJSON, recoverSEOJSON, recoverToneJSON } from '../ai/jsonRecovery'
import { addChatMessage, getChatContext } from '../ai/aiMemory'
import { completeWithRetry } from '../ai/retrySystem'
import { regenSingleSection } from '../ai/mockGenerator'
import { parsePrompt } from '../ai/promptParser'

export function useAIChat({ website, onSectionUpdate, onSEOUpdate, onWebsiteUpdate }) {
  const [messages,   setMessages]   = useState([])
  const [thinking,   setThinking]   = useState(false)
  const [streamText, setStreamText] = useState('')

  const addMsg = useCallback((role, content, meta = {}) => {
    const msg = { id: Date.now() + Math.random(), role, content, ts: Date.now(), ...meta }
    setMessages(prev => [...prev, msg])
    addChatMessage(role, content)
    return msg
  }, [])

  const send = useCallback(async (userMessage) => {
    if (!userMessage.trim() || thinking) return
    addMsg('user', userMessage)
    setThinking(true)
    setStreamText('')

    try {
      const intent  = detectEditIntent(userMessage)
      const provider = getProvider()
      const mock    = isMockMode()
      const ctx     = {
        name:    website?.name || '',
        bizType: website?.bizType || 'default',
        city:    website?.contact?.city || website?.city || '',
        palette: website?.theme?.palette || 'dark',
      }

      let responseText = ''
      let applied = false

      // ── Section regen (mock path) ──────────────────────────────────
      if (mock && intentToSectionType(intent)) {
        const sectionType = intentToSectionType(intent)
        const parsed      = parsePrompt(website?._promptUsed || userMessage)
        const newSection  = await regenSingleSection(sectionType, parsed)
        const existing    = website?.sections?.find(s => s.type === sectionType)
        if (newSection && existing) {
          onSectionUpdate?.(existing.id, newSection.data)
        }
        responseText = getMockIntentResponse(intent, sectionType)
        applied = true
      }

      // ── SEO improvement (mock) ─────────────────────────────────────
      if (mock && intent === 'improve_seo' && !applied) {
        const improved = {
          title:       `${ctx.name} — ${ctx.bizType} מקצועי ב${ctx.city} | שירות אמין`,
          description: `${ctx.name} מספק שירות ${ctx.bizType} מקצועי ב${ctx.city}. ניסיון מוכח, מחירים הוגנים. צרו קשר לייעוץ חינם!`,
          keywords:    `${ctx.name}, ${ctx.bizType}, ${ctx.city}, שירות מקצועי, ייעוץ חינם`,
        }
        onSEOUpdate?.(improved)
        responseText = 'שיפרתי את ה-SEO — כותרת ממוקדת, description עם מילות מפתח, ו-keywords רלוונטיים.'
        applied = true
      }

      // ── Tone change (mock) ─────────────────────────────────────────
      if (mock && intent === 'change_tone' && !applied) {
        const tone = detectTone(userMessage)
        // Fake a slight regen of hero + CTA with tone note
        const parsed = parsePrompt(website?._promptUsed || userMessage)
        const hero   = await regenSingleSection('hero', parsed)
        const cta    = await regenSingleSection('cta', parsed)
        const heroSec = website?.sections?.find(s => s.type === 'hero')
        const ctaSec  = website?.sections?.find(s => s.type === 'cta')
        if (hero && heroSec) onSectionUpdate?.(heroSec.id, hero.data)
        if (cta  && ctaSec)  onSectionUpdate?.(ctaSec.id,  cta.data)
        responseText = `שיניתי את הטון ל"${tone}". כותרות ה-Hero ו-CTA עודכנו.`
        applied = true
      }

      // ── General mock response ──────────────────────────────────────
      if (mock && !applied) {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 600))
        responseText = provider.complete
          ? (await provider.complete([{ role: 'user', content: userMessage }])).content
          : 'הבנתי. כרגע במצב הדגמה — בחר ספק AI אמיתי כדי לקבל שינויים מותאמים אישית.'
        applied = true
      }

      // ── Real AI path ───────────────────────────────────────────────
      if (!mock) {
        const history = getChatContext(4)
        let prompt = ''

        if (intent === 'improve_seo') {
          prompt = SEO_PROMPT(website, userMessage)
        } else if (intent === 'change_tone') {
          const tone = detectTone(userMessage)
          prompt = TONE_CHANGE_PROMPT(website, tone)
        } else {
          const sectionType = intentToSectionType(intent)
          if (sectionType) {
            const section = website?.sections?.find(s => s.type === sectionType)
            if (section) {
              prompt = SECTION_EDIT_PROMPT(section, userMessage, ctx)
            } else {
              prompt = SECTION_REGEN_PROMPT(sectionType, ctx)
            }
          } else {
            // General request — use chat context
            const sysMsg = `You are editing a Hebrew business website for ${ctx.name} (${ctx.bizType}) in ${ctx.city}. Answer in Hebrew. Be concise and helpful.`
            const msgs = [
              { role: 'system', content: sysMsg },
              ...history,
              { role: 'user', content: userMessage },
            ]
            // Stream response for chat
            let full = ''
            for await (const chunk of provider.stream(msgs, {})) {
              full += chunk
              setStreamText(full)
            }
            responseText = full
            applied = true
          }
        }

        if (!applied && prompt) {
          const { content } = await completeWithRetry(provider, [
            { role: 'system', content: 'You are a precise JSON generator for Hebrew business websites. Output only valid JSON.' },
            { role: 'user',   content: prompt },
          ], { jsonMode: true, maxTokens: 2048, timeout: 30000 })

          // Apply the result
          if (intent === 'improve_seo') {
            const seo = recoverSEOJSON(content, website?.seo)
            onSEOUpdate?.(seo)
            responseText = 'עדכנתי את ה-SEO בהצלחה.'
          } else if (intent === 'change_tone') {
            const result = recoverToneJSON(content)
            if (result?.hero) {
              const heroSec = website?.sections?.find(s => s.type === 'hero')
              if (heroSec) onSectionUpdate?.(heroSec.id, result.hero)
            }
            if (result?.cta) {
              const ctaSec = website?.sections?.find(s => s.type === 'cta')
              if (ctaSec) onSectionUpdate?.(ctaSec.id, result.cta)
            }
            responseText = 'שיניתי את הטון של ה-Hero ו-CTA.'
          } else {
            const sectionType = intentToSectionType(intent)
            if (sectionType) {
              const existing = website?.sections?.find(s => s.type === sectionType)
              const updated  = recoverSectionJSON(content, sectionType, existing)
              if (existing) onSectionUpdate?.(existing.id, updated.data)
              responseText = `עדכנתי את ה-${sectionType} section.`
            }
          }
        }
      }

      setStreamText('')
      addMsg('assistant', responseText || 'בוצע.')

    } catch (err) {
      console.error('[useAIChat]', err)
      setStreamText('')
      addMsg('assistant', 'מצטערים, הייתה שגיאה. נסו שוב.', { error: true })
    } finally {
      setThinking(false)
    }
  }, [website, thinking, addMsg, onSectionUpdate, onSEOUpdate, onWebsiteUpdate])

  return { messages, thinking, streamText, send }
}

function getMockIntentResponse(intent, sectionType) {
  const map = {
    improve_hero:         'עדכנתי את ה-Hero — כותרת חדשה, תת-כותרת חזקה, CTA ממוקד.',
    rewrite_cta:          'שיפרתי את ה-CTA — קריאה לפעולה חזקה ועם דחיפות.',
    regenerate_faq:       'עדכנתי את ה-FAQ עם 5 שאלות רלוונטיות חדשות.',
    improve_services:     'עדכנתי את השירותים עם תיאורים ברורים ואייקונים.',
    improve_testimonials: 'הוספתי 3 המלצות ספציפיות מלקוחות ישראלים.',
    improve_contact:      'עדכנתי את סקשן יצירת הקשר.',
  }
  return map[intent] || `עדכנתי את ה-${sectionType} section.`
}
