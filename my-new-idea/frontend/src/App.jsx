import { useState, useRef, useEffect } from 'react'

const API = 'http://localhost:3002'

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }

  /* ── layout ── */
  .app { display: flex; height: 100vh; }

  /* ── chat panel (left) ── */
  .chat-panel {
    display: flex; flex-direction: column;
    flex: 1; border-right: 1px solid #1e2030;
    min-width: 0;
  }

  /* ── router panel (right) ── */
  .router-panel {
    width: 380px; flex-shrink: 0;
    display: flex; flex-direction: column;
    background: #07080f;
  }

  /* ── shared header ── */
  .panel-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid #1e2030;
    display: flex; align-items: center; gap: 10px;
  }
  .dot {
    width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .dot.online  { background: #22d3ee; box-shadow: 0 0 7px #22d3ee; }
  .dot.offline { background: #ef4444; box-shadow: 0 0 7px #ef444488; }
  .dot.checking { background: #f59e0b; }
  .panel-title { font-size: 14px; font-weight: 600; color: #f1f5f9; letter-spacing: 0.04em; }
  .panel-sub   { font-size: 11px; color: #475569; margin-left: 6px; }

  /* ── chat messages ── */
  .messages {
    flex: 1; overflow-y: auto; padding: 20px 20px 10px;
    display: flex; flex-direction: column; gap: 16px;
    scrollbar-width: thin; scrollbar-color: #1e2030 transparent;
  }
  .msg { display: flex; gap: 9px; max-width: 85%; }
  .msg.user { align-self: flex-end; flex-direction: row-reverse; }
  .msg.ai   { align-self: flex-start; }
  .avatar {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }
  .msg.user .avatar { background: #1e40af; }
  .msg.ai   .avatar { background: #0e7490; }
  .bubble {
    padding: 10px 14px; border-radius: 11px;
    font-size: 14px; line-height: 1.65; white-space: pre-wrap;
  }
  .msg.user .bubble { background: #1e3a5f; border: 1px solid #2563eb44; color: #cbd5e1; }
  .msg.ai   .bubble { background: #0f1629; border: 1px solid #22d3ee22; color: #e2e8f0; }

  .typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
  .typing span {
    width: 6px; height: 6px; border-radius: 50%; background: #22d3ee;
    animation: blink 1.2s infinite;
  }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }

  .empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #2d3748; font-size: 13px; gap: 8px;
  }
  .empty-icon { font-size: 32px; opacity: 0.35; }

  /* ── chat input ── */
  .input-area {
    padding: 12px 20px 18px; border-top: 1px solid #1e2030;
    display: flex; gap: 9px; align-items: flex-end;
  }
  textarea {
    flex: 1; background: #0f1629; border: 1px solid #1e2030;
    border-radius: 9px; color: #e2e8f0; font-size: 14px;
    padding: 10px 14px; resize: none; outline: none;
    min-height: 44px; max-height: 120px; line-height: 1.5;
    transition: border-color 0.2s; font-family: inherit;
  }
  textarea:focus { border-color: #22d3ee55; }
  textarea::placeholder { color: #334155; }
  .btn-send {
    background: #0e7490; border: none; border-radius: 9px;
    color: #f0fdfa; font-size: 14px; font-weight: 600;
    padding: 10px 20px; cursor: pointer; height: 44px;
    transition: background 0.15s; white-space: nowrap; font-family: inherit;
  }
  .btn-send:hover:not(:disabled) { background: #0891b2; }
  .btn-send:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── router panel content ── */
  .router-body { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }

  .router-input {
    width: 100%; background: #0f1629; border: 1px solid #1e2030;
    border-radius: 9px; color: #e2e8f0; font-size: 13.5px;
    padding: 10px 14px; resize: vertical; outline: none;
    min-height: 80px; line-height: 1.5; font-family: inherit;
    transition: border-color 0.2s;
  }
  .router-input:focus { border-color: #22d3ee55; }
  .router-input::placeholder { color: #334155; }

  .router-buttons { display: flex; flex-direction: column; gap: 8px; }
  .btn-route {
    width: 100%; padding: 11px 16px; border-radius: 9px; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    text-align: left; display: flex; align-items: center; gap: 10px;
    font-family: inherit; transition: opacity 0.15s, background 0.15s;
  }
  .btn-route:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-route.local   { background: #0e7490; color: #f0fdfa; }
  .btn-route.local:hover:not(:disabled)   { background: #0891b2; }
  .btn-route.claude  { background: #1e3a5f; color: #93c5fd; border: 1px solid #2563eb44; }
  .btn-route.claude:hover:not(:disabled)  { background: #1e3f6e; }
  .btn-route.chatgpt { background: #14261a; color: #86efac; border: 1px solid #16a34a44; }
  .btn-route.chatgpt:hover:not(:disabled) { background: #162d1e; }
  .btn-icon { font-size: 16px; }

  .router-result {
    background: #0f1629; border: 1px solid #1e2030; border-radius: 9px;
    padding: 14px; position: relative;
  }
  .router-result-label {
    font-size: 11px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .router-result-text {
    font-size: 13px; color: #e2e8f0; white-space: pre-wrap;
    line-height: 1.65; max-height: 320px; overflow-y: auto;
  }
  .btn-copy {
    margin-top: 10px; padding: 7px 14px; border-radius: 7px;
    background: #1e2030; border: 1px solid #2d3748;
    color: #94a3b8; font-size: 12px; cursor: pointer; font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .btn-copy:hover { background: #2d3748; color: #e2e8f0; }
  .btn-copy.copied { color: #22d3ee; border-color: #22d3ee44; }

  .offline-banner {
    margin: 10px 20px 0; padding: 9px 14px;
    background: #1a0808; border: 1px solid #ef444433;
    border-radius: 8px; color: #fca5a5; font-size: 12px;
  }
`

function RouterPanel({ backendStatus }) {
  const [task, setTask]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [copied, setCopied]     = useState(false)

  async function route(target) {
    if (!task.trim() || loading) return
    setLoading(true)
    setResult(null)
    setCopied(false)
    try {
      const res = await fetch(`${API}/api/router`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), target }),
      })
      const data = await res.json()
      if (data.error) setResult({ type: target, text: `Error: ${data.error}` })
      else setResult({ type: data.type, text: data.result })
    } catch {
      setResult({ type: target, text: `Cannot reach backend at ${API}` })
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    if (!result) return
    navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const labels = {
    local:    'Local AI response',
    'claude-code': 'Claude Code prompt',
    chatgpt:  'ChatGPT prompt',
  }

  return (
    <div className="router-panel">
      <div className="panel-header">
        <span style={{ fontSize: 16 }}>⬡</span>
        <span className="panel-title">AI Router</span>
      </div>

      <div className="router-body">
        <textarea
          className="router-input"
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="תאר את המשימה..."
        />

        <div className="router-buttons">
          <button className="btn-route local" onClick={() => route('local')} disabled={loading || !task.trim()}>
            <span className="btn-icon">🖥</span> Ask Local AI (Ollama)
          </button>
          <button className="btn-route claude" onClick={() => route('claude-code')} disabled={loading || !task.trim()}>
            <span className="btn-icon">📋</span> Create Claude Code Prompt
          </button>
          <button className="btn-route chatgpt" onClick={() => route('chatgpt')} disabled={loading || !task.trim()}>
            <span className="btn-icon">📋</span> Create ChatGPT Prompt
          </button>
        </div>

        {loading && (
          <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
            <div className="typing" style={{ justifyContent: 'center' }}><span/><span/><span/></div>
          </div>
        )}

        {result && (
          <div className="router-result">
            <div className="router-result-label">{labels[result.type] || result.type}</div>
            <div className="router-result-text">{result.text}</div>
            <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copy}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const bottomRef = useRef(null)

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function checkHealth() {
    try {
      const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      setBackendStatus(data.ok ? 'online' : 'offline')
    } catch {
      setBackendStatus('offline')
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.error ? `Error: ${data.error}` : data.reply
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: `Cannot reach backend at ${API}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">

        {/* ── Chat Panel ── */}
        <div className="chat-panel">
          <div className="panel-header">
            <div className={`dot ${backendStatus}`} title={backendStatus} />
            <span className="panel-title">
              AI Command Center
              <span className="panel-sub">qwen2.5:1.5b · local · {backendStatus}</span>
            </span>
          </div>

          {backendStatus === 'offline' && (
            <div className="offline-banner">
              Backend offline — הרץ: <code>node server.js</code> מתוך תיקיית backend
            </div>
          )}

          <div className="messages">
            {messages.length === 0 && (
              <div className="empty">
                <div className="empty-icon">⬡</div>
                <div>שלח הודעה להתחיל</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="avatar">{m.role === 'user' ? '👤' : '⬡'}</div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="msg ai">
                <div className="avatar">⬡</div>
                <div className="bubble">
                  <div className="typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-area">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="שאל משהו... (Enter לשליחה)"
              rows={1}
            />
            <button className="btn-send" onClick={send} disabled={loading || !input.trim()}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>

        {/* ── Router Panel ── */}
        <RouterPanel backendStatus={backendStatus} />
      </div>
    </>
  )
}
