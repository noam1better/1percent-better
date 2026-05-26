/**
 * useGrowthAgent.js
 * AI agent hook for editing growth packages.
 * Supports slash commands + natural language in mock mode.
 */

import { useState, useCallback } from 'react'
import { addAgentMessage, setTone, recordCommand } from '../ai/businessMemory'

// ── Slash commands catalog ────────────────────────────────────────
export const AGENT_COMMANDS = [
  { cmd: '/luxury',          icon: '💎', label: 'יוקרתי',         desc: 'טון פרמיום ואלגנטי' },
  { cmd: '/urgency',         icon: '⏰', label: 'דחיפות',          desc: 'הוסף לחץ ומועד אחרון' },
  { cmd: '/shorter',         icon: '✂️', label: 'קצר',             desc: 'קצר את כל ההודעות' },
  { cmd: '/high-conversion', icon: '🎯', label: 'המרות',           desc: 'מקסם שיעורי המרה' },
  { cmd: '/younger',         icon: '🔥', label: 'צעיר',            desc: 'טון צעיר ומודרני' },
  { cmd: '/formal',          icon: '👔', label: 'פורמלי',          desc: 'טון רשמי ומקצועי' },
  { cmd: '/friendly',        icon: '😊', label: 'חברותי',          desc: 'טון חם ונגיש' },
  { cmd: '/aggressive',      icon: '⚡', label: 'אגרסיבי',         desc: 'מכירתי וישיר' },
]

// ── Mock transformations ──────────────────────────────────────────
function applyCommand(pkg, cmd) {
  const urgencyTag   = '\n\n⏰ מקומות מוגבלים – הזמן עכשיו!'
  const luxuryPrefix = '✨ '
  const convertTag   = '\n\n🎁 ייעוץ ראשוני חינם · ללא התחייבות · מענה תוך שעה'

  switch (cmd) {
    case '/urgency':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map((m, i) => i < 3 ? m + urgencyTag : m),
        followUps: pkg.followUps.map(f => ({ ...f, text: f.text + ' ⏰ עד סוף השבוע!' })),
        facebookAd: {
          ...pkg.facebookAd,
          primaryText: pkg.facebookAd.primaryText + '\n\n🔥 ההצעה תקפה עד סוף החודש – הזמן עכשיו!',
        },
      }

    case '/luxury':
      return {
        ...pkg,
        facebookAd: {
          ...pkg.facebookAd,
          headline: luxuryPrefix + pkg.facebookAd.headline + ' | Premium',
          primaryText: pkg.facebookAd.primaryText + '\n\n✨ חוויה יוקרתית ברמה הגבוהה ביותר.',
        },
        waFunnel: pkg.waFunnel.map((m, i) =>
          i === 0 ? m.replace(/היי!?|שלום!?/g, 'ברוכים הבאים 🌟') : m
        ),
      }

    case '/shorter':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map(m => {
          const sentences = m.split(/[.!?\n]+/).filter(Boolean)
          return sentences.slice(0, 3).join('. ').trim() + (sentences.length > 3 ? '.' : '')
        }),
        posts: pkg.posts.map(p => {
          const lines = p.split('\n').filter(Boolean)
          return lines.slice(0, 5).join('\n')
        }),
      }

    case '/high-conversion':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map((m, i) => i < 2 ? m + convertTag : m),
        offers: pkg.offers.map((o, i) =>
          i === 0 ? { ...o, title: '🎁 ' + o.title, price: o.price === 'חינם' ? '✅ חינם לחלוטין' : o.price } : o
        ),
        facebookAd: {
          ...pkg.facebookAd,
          cta: 'התחל עכשיו – חינם',
          description: pkg.facebookAd.description + ' ✅ ללא התחייבות.',
        },
      }

    case '/younger':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map(m =>
          m.replace(/שלום!?/g, 'היי! 👋').replace(/ברוכים הבאים/g, 'יאלה!')
        ),
        posts: pkg.posts.map(p => p + '\n\n💯 תגידו – מי מזה? 👇'),
      }

    case '/formal':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map(m =>
          m.replace(/היי!? 👋?/g, 'שלום רב,').replace(/!+/g, '.')
        ),
        facebookAd: {
          ...pkg.facebookAd,
          headline: pkg.facebookAd.headline.replace(/!+/g, '.'),
        },
      }

    case '/friendly':
      return {
        ...pkg,
        waFunnel: pkg.waFunnel.map(m =>
          m.replace(/שלום,?/g, 'היי! 😊').replace(/\bאנחנו\b/g, 'אנחנו (ורציני – )')
        ),
        posts: pkg.posts.map(p => p + '\n\n❤️ שמחים שאתם כאן!'),
      }

    case '/aggressive':
      return {
        ...pkg,
        waFunnel: [
          pkg.waFunnel[0] + '\n\n⚡ אל תחכה. כל יום שעובר עולה לך כסף.',
          ...pkg.waFunnel.slice(1),
        ],
        facebookAd: {
          ...pkg.facebookAd,
          primaryText: pkg.facebookAd.primaryText + '\n\n💥 המתחרים שלך כבר עושים את זה. האם אתה?',
        },
      }

    default:
      return pkg
  }
}

// ── Natural-language intent detection ────────────────────────────
function detectGrowthIntent(msg) {
  const m = msg.toLowerCase()
  if (m.includes('cta') || m.includes('קריאה לפעולה') || m.includes('כפתור')) return '/high-conversion'
  if (m.includes('יוקרתי') || m.includes('פרמיום') || m.includes('luxury')) return '/luxury'
  if (m.includes('דחיפות') || m.includes('מהר') || m.includes('urgency')) return '/urgency'
  if (m.includes('קצר') || m.includes('shorter') || m.includes('חצי')) return '/shorter'
  if (m.includes('צעיר') || m.includes('young') || m.includes('טיקטוק')) return '/younger'
  if (m.includes('פורמלי') || m.includes('רשמי') || m.includes('formal')) return '/formal'
  if (m.includes('חברותי') || m.includes('נגיש') || m.includes('ידידותי')) return '/friendly'
  if (m.includes('אגרסיבי') || m.includes('ישיר') || m.includes('aggressive')) return '/aggressive'
  if (m.includes('המרות') || m.includes('conversion') || m.includes('מכירות')) return '/high-conversion'
  return null
}

// ── Mock marketing responses ──────────────────────────────────────
function getMockResponse(msg, appliedCmd, pkg) {
  if (appliedCmd) {
    const labels = {
      '/urgency': 'הוספתי דחיפות לשלוש ההודעות הראשונות ולמודעת הפייסבוק. בדוק את טאב הווצאפ.',
      '/luxury': 'שיניתי את הפתיחה ביוקרתית יותר והוספתי טון פרמיום לכותרת המודעה.',
      '/shorter': 'קיצרתי את כל הודעות הווצאפ ל-3 משפטים מקסימום. יותר ישיר ויותר אפקטיבי.',
      '/high-conversion': 'הוספתי "ייעוץ חינם + ללא התחייבות" לשתי ההודעות הראשונות ושיפרתי את ה-CTA.',
      '/younger': 'שיניתי את הפתיחה לסלנג צעיר והוספתי engagement call בכל הפוסטים.',
      '/formal': 'שיניתי את הטון לפורמלי – פנייה בגוף שלישי, ללא קיצורים.',
      '/friendly': 'הפכתי את הטון לחם יותר – ברכה אישית והוספת לב לפוסטים.',
      '/aggressive': 'הוספתי נקודות לחץ על הפסד ומתחרים. טון מכירתי חזק יותר.',
    }
    return labels[appliedCmd] || 'בוצע שינוי בהתאם לבקשתך.'
  }

  const m = msg.toLowerCase()
  if (m.includes('seo')) return `לשיפור SEO מקומי:\n1. הוסף "${pkg?.city || 'שם עיר'}" בכל כותרת\n2. שלב מילות מפתח כמו "${pkg?.bizMeta?.label || 'שירות'} + עיר"\n3. הוסף שאלות FAQ עם מילות מפתח`
  if (m.includes('המלצות') || m.includes('reviews')) return 'המלצות אפקטיביות:\n• כלולות שם + עיר + תוצאה ספציפית\n• "חסכתי 12,000 ש"ח" > "שירות נהדר"\n• הוסף 3-5 המלצות לדף הנחיתה'
  if (m.includes('ווצאפ') || m.includes('whatsapp')) return `הודעה 1 הכי חשובה. כלול:\n• שם הלקוח הפוטנציאלי\n• ערך ספציפי\n• שאלה אחת פתוחה\n• משיח מוגדר להמשך`
  if (m.includes('פוסט') || m.includes('סושיאל')) return 'פוסטים שעובדים:\n• 20% הנחה/מבצע\n• 30% סיפורי לקוחות\n• 30% טיפים מקצועיים\n• 20% מאחורי הקלעים'
  if (m.includes('מחיר') || m.includes('חבילה')) return 'בנה 3 חבילות: \n• כניסה (חינם/זול) → לבנות אמון\n• עיקרית (70% מהלקוחות יבחרו)\n• פרמיום (מגדיל ערך ממוצע לעסקה)'
  if (m.includes('לידים') || m.includes('leads')) return `לשיפור לידים:\n1. ווצאפ גלוי בכל מקום\n2. הצעת ערך ברורה "חינם"\n3. הוסף דחיפות\n4. טופס קצר (שם + טלפון בלבד)\n5. מענה תוך 15 דקות`
  return `שאלה מעניינת! בהתבסס על העסק שלך (${pkg?.bizMeta?.label || 'השירות שלך'} ב${pkg?.city || 'העיר שלך'}) – תוכל לפרט מה בדיוק תרצה לשפר?`
}

// ── Hook ──────────────────────────────────────────────────────────
export function useGrowthAgent({ pkg, onUpdate }) {
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)

  const addMsg = (role, content, meta = {}) => {
    const msg = { id: Date.now() + Math.random(), role, content, ts: Date.now(), ...meta }
    setMessages(prev => [...prev, msg])
    addAgentMessage(role, content)
    return msg
  }

  const send = useCallback(async (rawInput) => {
    const input = rawInput.trim()
    if (!input || thinking) return
    addMsg('user', input)
    setThinking(true)

    await new Promise(r => setTimeout(r, 400 + Math.random() * 400))

    try {
      // Check if it's a command (starts with /) or detected as one
      const directCmd = AGENT_COMMANDS.find(c => input.startsWith(c.cmd))?.cmd
      const detectedCmd = directCmd || detectGrowthIntent(input)

      let updatedPkg = pkg

      if (detectedCmd && pkg) {
        updatedPkg = applyCommand(pkg, detectedCmd)
        const cmdMeta = AGENT_COMMANDS.find(c => c.cmd === detectedCmd)
        if (cmdMeta) {
          recordCommand(detectedCmd, cmdMeta.label)
          setTone(cmdMeta.label)
        }
        onUpdate?.(updatedPkg)
      }

      const response = getMockResponse(input, detectedCmd, updatedPkg)
      addMsg('assistant', response)
    } catch (err) {
      addMsg('assistant', 'שגיאה. נסו שנית.', { error: true })
    } finally {
      setThinking(false)
    }
  }, [pkg, thinking, onUpdate])

  const applyDirectCommand = useCallback(async (cmd) => {
    if (!pkg || thinking) return
    const cmdMeta = AGENT_COMMANDS.find(c => c.cmd === cmd)
    if (!cmdMeta) return
    addMsg('user', `${cmdMeta.icon} ${cmdMeta.cmd} – ${cmdMeta.desc}`)
    setThinking(true)
    await new Promise(r => setTimeout(r, 500))
    const updated = applyCommand(pkg, cmd)
    recordCommand(cmd, cmdMeta.label)
    setTone(cmdMeta.label)
    onUpdate?.(updated)
    addMsg('assistant', getMockResponse('', cmd, updated))
    setThinking(false)
  }, [pkg, thinking, onUpdate])

  const clearChat = useCallback(() => setMessages([]), [])

  return { messages, thinking, send, applyDirectCommand, clearChat, AGENT_COMMANDS }
}
