import { useState, useRef, useEffect } from 'react'
import { useAIChat } from '../hooks/useAIChat'
import { isMockMode, getProviderName } from '../ai/providers/index'

const QUICK_ACTIONS = [
  { label: '🎯 שפר Hero',       cmd: 'שפר את ה-Hero section' },
  { label: '🚀 שפר CTA',        cmd: 'שנה את ה-CTA לגרסה חזקה יותר' },
  { label: '❓ שפר FAQ',         cmd: 'שפר את שאלות ה-FAQ' },
  { label: '🔍 שפר SEO',        cmd: 'שפר את ה-SEO של האתר' },
  { label: '⭐ שפר המלצות',     cmd: 'שפר את המלצות הלקוחות' },
  { label: '⚡ שפר שירותים',    cmd: 'שפר את רשימת השירותים' },
  { label: '🤝 טון חברותי',     cmd: 'שנה את הטון לחברותי ונגיש יותר' },
  { label: '💼 טון מקצועי',     cmd: 'שנה את הטון למקצועי יותר' },
]

// ── Slash command palette ─────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: '/luxury',          icon: '💎', desc: 'טון פרמיום ויוקרתי' },
  { cmd: '/urgency',         icon: '⏰', desc: 'הוסף דחיפות ומועד אחרון' },
  { cmd: '/shorter',         icon: '✂️', desc: 'קצר את כל הטקסטים' },
  { cmd: '/high-conversion', icon: '🎯', desc: 'מקסם המרות וכפתורי CTA' },
  { cmd: '/younger',         icon: '🔥', desc: 'טון צעיר ומודרני' },
  { cmd: '/formal',          icon: '👔', desc: 'טון פורמלי ורשמי' },
  { cmd: '/friendly',        icon: '😊', desc: 'טון חברותי ונגיש' },
  { cmd: '/aggressive',      icon: '⚡', desc: 'טון מכירתי ואגרסיבי' },
]

export default function AIChatSidebar({ website, onSectionUpdate, onSEOUpdate, onClose }) {
  const [input,    setInput]    = useState('')
  const [showCmds, setShowCmds] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const { messages, thinking, streamText, send } = useAIChat({
    website,
    onSectionUpdate,
    onSEOUpdate,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    setShowCmds(false)
    send(msg)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') setShowCmds(false)
  }

  const handleInputChange = e => {
    const v = e.target.value
    setInput(v)
    setShowCmds(v.startsWith('/') && v.length <= 25)
  }

  const useSuggestion = cmd => {
    setInput(cmd)
    setShowCmds(false)
    inputRef.current?.focus()
  }

  const useSlashCommand = cmd => {
    setInput(cmd + ' ')
    setShowCmds(false)
    inputRef.current?.focus()
  }

  const providerLabel = isMockMode()
    ? 'הדגמה'
    : getProviderName().charAt(0).toUpperCase() + getProviderName().slice(1)

  return (
    <div className="ai-chat-sidebar" dir="rtl">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-chat-header-info">
          <span className="ai-chat-title">🤖 AI עוזר</span>
          <span className={`ai-chat-provider ${isMockMode() ? 'mock' : 'live'}`}>
            {isMockMode() ? '⚡ הדגמה' : `✅ ${providerLabel}`}
          </span>
        </div>
        <button className="ai-chat-close" onClick={onClose}>✕</button>
      </div>

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <div className="ai-chat-welcome-icon">✨</div>
            <div className="ai-chat-welcome-title">שלום! אני ה-AI עוזר שלך</div>
            <div className="ai-chat-welcome-sub">
              בקש שינויים או הקלד <code>/</code> לפקודות מהירות.
              {isMockMode() && <span className="ai-chat-mock-note"> (מצב הדגמה)</span>}
            </div>
            <div className="ai-chat-quick-actions">
              {QUICK_ACTIONS.map((a, i) => (
                <button key={i} className="ai-chat-quick-btn" onClick={() => useSuggestion(a.cmd)}>
                  {a.label}
                </button>
              ))}
            </div>
            {/* Command hint */}
            <div className="ai-cmd-hint">
              <span className="ai-cmd-hint-label">פקודות מהירות:</span>
              {SLASH_COMMANDS.slice(0, 4).map(c => (
                <button key={c.cmd} className="ai-cmd-hint-chip" onClick={() => useSlashCommand(c.cmd)}>
                  {c.icon} {c.cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`ai-chat-msg ai-chat-msg-${msg.role} ${msg.error ? 'ai-chat-msg-error' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="ai-chat-msg-avatar">✨</div>
            )}
            <div className="ai-chat-msg-bubble">{msg.content}</div>
          </div>
        ))}

        {thinking && (
          <div className="ai-chat-msg ai-chat-msg-assistant">
            <div className="ai-chat-msg-avatar">✨</div>
            <div className="ai-chat-msg-bubble ai-chat-msg-thinking">
              {streamText
                ? <span>{streamText}<span className="ai-chat-cursor" /></span>
                : <span className="ai-chat-dots"><span /><span /><span /></span>
              }
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Slash command palette */}
      {showCmds && (
        <div className="ai-cmd-palette">
          <div className="ai-cmd-palette-title">פקודות זמינות</div>
          {SLASH_COMMANDS.map(c => (
            <button key={c.cmd} className="ai-cmd-palette-item" onClick={() => useSlashCommand(c.cmd)}>
              <span className="ai-cmd-icon">{c.icon}</span>
              <span className="ai-cmd-name">{c.cmd}</span>
              <span className="ai-cmd-desc">{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="ai-chat-input-wrap">
        {messages.length > 0 && (
          <div className="ai-chat-quick-row">
            {QUICK_ACTIONS.slice(0, 4).map((a, i) => (
              <button key={i} className="ai-chat-quick-mini" onClick={() => useSuggestion(a.cmd)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="ai-chat-input-row">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            placeholder="בקש שינוי... הקלד / לפקודות (Enter לשליחה)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            rows={2}
            disabled={thinking}
          />
          <button
            className={`ai-chat-send-btn ${(!input.trim() || thinking) ? 'disabled' : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || thinking}
          >
            {thinking ? <span className="ai-chat-send-spin" /> : '↑'}
          </button>
        </div>
        <div className="ai-chat-slash-hint">הקלד <kbd>/</kbd> לפקודות טון ועיצוב</div>
      </div>
    </div>
  )
}
