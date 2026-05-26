/**
 * GlobalAIAssistant — floating marketing advisor available on all pages.
 * Knows current business context via businessMemory.
 * Gives advice, answers marketing questions, suggests next actions.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { getBusinessProfile, addAgentMessage } from '../ai/businessMemory'

// ── Mock advisor responses ────────────────────────────────────────
const ADVISOR_TIPS = [
  { trigger: ['לידים','leads','לקוחות חדשים'],   tip: 'לידים מגיעים ממה שלקוחות רואים ב-3 שניות. ווצאפ גלוי + הצעה ברורה + דחיפות = 3x יותר לידים.' },
  { trigger: ['seo','גוגל','חיפוש'],             tip: 'SEO מקומי: שם עיר בכל כותרת, שאלות FAQ עם מילות מפתח, וביקורות Google Business Profile.' },
  { trigger: ['מחיר','תמחור','כמה'],             tip: 'הצג תמיד 3 חבילות מחיר. רוב האנשים בוחרים האמצעי – תיכנן את הרווחיות שם.' },
  { trigger: ['ווצאפ','whatsapp','הודעה'],        tip: 'הודעת ווצאפ ראשונה: שאל שאלה אחת פתוחה. "מה המטרה הכי חשובה לך?" – לא מכור, שוחח.' },
  { trigger: ['פוסט','סושיאל','אינסטגרם'],       tip: 'פוסטים שמקבלים engagement: 80% ערך חינמי + 20% מכירה. לעולם לא להפוך.' },
  { trigger: ['cta','כפתור','קריאה לפעולה'],      tip: 'CTA חזק = פועל ספציפי + ערך ברור + דחיפות. "קבע ייעוץ חינם – עד יום שישי" > "צור קשר".' },
  { trigger: ['המלצות','ביקורות','reviews'],      tip: 'ביקורת טובה: שם + תוצאה מספרית. "ירד 8 קג" > "טוב". צור תבנית ושלח ללקוחות מרוצים.' },
  { trigger: ['מתחרים','תחרות','שוק'],            tip: 'לא להיות הזולים ביותר – היו הברורים ביותר. הסבירו מה מייחד אתכם ב-10 מילים.' },
]

function getMockAdvice(msg, profile) {
  const lower = msg.toLowerCase()
  for (const tip of ADVISOR_TIPS) {
    if (tip.trigger.some(t => lower.includes(t))) return tip.tip
  }
  // Context-aware fallback
  const name = profile?.name || 'העסק שלך'
  const city = profile?.city || 'העיר שלך'
  const biz  = profile?.bizType || 'השירות שלך'

  if (lower.includes('מה') || lower.includes('איך') || lower.includes('?')) {
    return `שאלה טובה! עבור ${name} ב${city} – ${biz} – הדבר הכי חשוב שאני ממליץ: התמקד בערוץ אחד לפני שמפזרים. ווצאפ נותן ROI הכי גבוה לעסקים קטנים בישראל.`
  }
  return `בהתבסס על ${name} ב${city}: ${biz} – המלצה הכי חשובה שלי: שלח הודעת ווצאפ ל-5 לקוחות ישנים עוד היום. לקוח שכבר קנה = הכי זול לשכנע שוב.`
}

const WELCOME_TIPS = [
  '💡 שאל אותי כל שאלה שיווקית',
  '📱 "איך להביא יותר לידים?"',
  '🎯 "מה נכון לכתוב ב-CTA?"',
  '💬 "איך לכתוב הודעת ווצאפ?"',
]

// ── Component ─────────────────────────────────────────────────────
export default function GlobalAIAssistant() {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [pulse,    setPulse]    = useState(false)
  const inputRef  = useRef(null)
  const bottomRef = useRef(null)

  // Pulse notification after 4s idle
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (open) {
      setPulse(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = useCallback(async () => {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    addAgentMessage('user', msg)
    setThinking(true)

    await new Promise(r => setTimeout(r, 500 + Math.random() * 500))

    const profile = getBusinessProfile()
    const reply = getMockAdvice(msg, profile)
    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: reply }
    setMessages(prev => [...prev, assistantMsg])
    addAgentMessage('assistant', reply)
    setThinking(false)
  }, [input, thinking])

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const useQuick = text => { setInput(text); inputRef.current?.focus() }

  const profile = getBusinessProfile()
  const hasProfile = !!profile?.name

  return (
    <>
      {/* Floating button */}
      <button
        className={`gaia-fab ${open ? 'open' : ''} ${pulse ? 'pulse' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="AI יועץ שיווקי"
        aria-label="פתח AI יועץ שיווקי"
      >
        {open ? '✕' : '🤖'}
        {pulse && !open && <span className="gaia-fab-dot" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="gaia-panel" dir="rtl">
          <div className="gaia-panel-header">
            <div className="gaia-panel-title-wrap">
              <span className="gaia-panel-icon">🤖</span>
              <div>
                <div className="gaia-panel-title">AI יועץ שיווקי</div>
                <div className="gaia-panel-sub">
                  {hasProfile ? `${profile.name} · ${profile.city}` : 'עוזר שיווקי חכם'}
                </div>
              </div>
            </div>
            <button className="gaia-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="gaia-messages">
            {messages.length === 0 && (
              <div className="gaia-welcome">
                <div className="gaia-welcome-icon">✨</div>
                <p className="gaia-welcome-title">שלום! אני היועץ השיווקי שלך</p>
                <p className="gaia-welcome-sub">שאל אותי כל שאלה על שיווק, לידים, ווצאפ, SEO ועוד</p>
                <div className="gaia-tips-list">
                  {WELCOME_TIPS.map((t, i) => (
                    <button key={i} className="gaia-tip-btn" onClick={() => useQuick(t.replace(/^[💡📱🎯💬]\s/, '').replace(/"/g, ''))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`gaia-msg gaia-msg-${m.role}`}>
                {m.role === 'assistant' && <span className="gaia-msg-avatar">✨</span>}
                <div className="gaia-msg-bubble">{m.content}</div>
              </div>
            ))}

            {thinking && (
              <div className="gaia-msg gaia-msg-assistant">
                <span className="gaia-msg-avatar">✨</span>
                <div className="gaia-msg-bubble gaia-thinking">
                  <span className="gaia-dots"><span /><span /><span /></span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="gaia-input-wrap">
            <textarea
              ref={inputRef}
              className="gaia-input"
              placeholder="שאל כל שאלה שיווקית..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              disabled={thinking}
            />
            <button
              className={`gaia-send-btn ${(!input.trim() || thinking) ? 'disabled' : ''}`}
              onClick={send}
              disabled={!input.trim() || thinking}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
