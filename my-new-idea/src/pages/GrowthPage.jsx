import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGrowthStore } from '../ai/growthStore'
import { BIZ_META } from '../contentEngine'
import { useAuth } from '../context/AuthContext'
import { scoreGrowthPackage, getScoreLabel } from '../ai/scoringEngine'
import { useGrowthAgent, AGENT_COMMANDS } from '../hooks/useGrowthAgent'
import { setBusinessProfile, recordGrowthGeneration } from '../ai/businessMemory'
import { createWebsiteSchema } from '../engine/websiteSchema'
import { publishWebsite } from '../services/websiteService'
import WebsitePreview from '../components/website/WebsitePreview'

// ── useCopy ───────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = useCallback((text, id) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])
  return { copied, copy }
}

function CopyBtn({ text, id, copied, copy, label = '📋 העתק' }) {
  const done = copied === id
  return (
    <button
      className={`growth-copy-btn ${done ? 'copied' : ''}`}
      onClick={() => copy(text, id)}
    >
      {done ? '✓ הועתק!' : label}
    </button>
  )
}

// ── Score arc (mini circular progress) ───────────────────────────
function ScoreRing({ score, label, size = 64 }) {
  const { color } = getScoreLabel(score)
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = ((100 - score) / 100) * circ
  return (
    <div className="score-ring-wrap" title={`${label}: ${score}/100`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1b3a5e" strokeWidth="6" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="score-ring-num" style={{ color }}>{score}</div>
    </div>
  )
}

// ── Score dashboard bar ───────────────────────────────────────────
function ScoreDashboard({ scores }) {
  if (!scores) return null
  const { seo, conversion, trust, whatsapp, content, overall } = scores
  const { label: overallLabel, color: overallColor } = getScoreLabel(overall)

  const subs = [
    { key: 'seo',        label: 'SEO',     score: seo },
    { key: 'conversion', label: 'המרות',   score: conversion },
    { key: 'trust',      label: 'אמינות',  score: trust },
    { key: 'whatsapp',   label: 'ווצאפ',   score: whatsapp },
    { key: 'content',    label: 'תוכן',    score: content },
  ]

  return (
    <div className="score-dashboard">
      <div className="score-overall">
        <ScoreRing score={overall} label="ציון כללי" size={80} />
        <div className="score-overall-info">
          <div className="score-overall-label">ציון צמיחה עסקית</div>
          <div className="score-overall-grade" style={{ color: overallColor }}>{overallLabel}</div>
          <div className="score-overall-hint">
            {overall >= 75 ? 'תוכן שיווקי חזק – המשך לשפר!' : 'יש מקום לשיפור – לחץ "AI Agent" לפעולה'}
          </div>
        </div>
      </div>
      <div className="score-subs">
        {subs.map(s => {
          const { color } = getScoreLabel(s.score)
          return (
            <div key={s.key} className="score-sub-item">
              <div className="score-sub-bar-wrap">
                <div className="score-sub-bar" style={{ width: `${s.score}%`, background: color }} />
              </div>
              <div className="score-sub-label">{s.label}</div>
              <div className="score-sub-num" style={{ color }}>{s.score}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Recommendations panel ─────────────────────────────────────────
function RecommendationsPanel({ recs, onApplyCmd }) {
  if (!recs?.length) return null
  const SEVERITY_COLOR = { high: '#ef4444', medium: '#eab308', low: '#6b88a8' }
  const SEVERITY_LABEL = { high: 'דחוף', medium: 'מומלץ', low: 'אופציונלי' }

  return (
    <div className="recs-panel">
      <div className="recs-title">💡 המלצות AI – {recs.length} שיפורים זמינים</div>
      {recs.map(r => (
        <div key={r.id} className="rec-card">
          <div className="rec-top">
            <span className="rec-icon">{r.icon}</span>
            <div className="rec-content">
              <div className="rec-head">
                <span className="rec-title">{r.title}</span>
                <span className="rec-severity" style={{ color: SEVERITY_COLOR[r.severity] }}>
                  {SEVERITY_LABEL[r.severity]}
                </span>
              </div>
              <div className="rec-text">{r.text}</div>
            </div>
          </div>
          {r.cmd && (
            <button className="rec-action-btn" onClick={() => onApplyCmd(r.cmd)}>
              ✨ תקן אוטומטי
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tasks panel ───────────────────────────────────────────────────
function TasksPanel({ tasks, onTaskAction }) {
  const [done, setDone] = useState({})
  const PRIORITY_COLOR = { high: '#ef4444', medium: '#eab308', low: '#6b88a8' }

  return (
    <div className="tasks-panel">
      <div className="tasks-title">📋 משימות AI – {tasks.filter(t => !done[t.id]).length} פתוחות</div>
      {tasks.map(t => (
        <div key={t.id} className={`task-card ${done[t.id] ? 'done' : ''}`}>
          <button
            className="task-check"
            onClick={() => setDone(d => ({ ...d, [t.id]: !d[t.id] }))}
          >
            {done[t.id] ? '✅' : '⬜'}
          </button>
          <div className="task-body">
            <div className="task-title-row">
              <span className="task-title">{t.title}</span>
              <span className="task-priority" style={{ color: PRIORITY_COLOR[t.priority] }}>
                {t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🔵'}
              </span>
            </div>
            <div className="task-desc">{t.desc}</div>
          </div>
          {t.cmd && !done[t.id] && (
            <button className="task-action-btn" onClick={() => { onTaskAction(t.cmd); setDone(d => ({ ...d, [t.id]: true })) }}>
              עשה ✨
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Agent chat workspace ──────────────────────────────────────────
function AgentTab({ messages, thinking, send, applyDirectCommand, clearChat }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    send(msg)
  }

  return (
    <div className="agent-workspace">
      {/* Command palette */}
      <div className="agent-cmd-palette">
        <div className="agent-cmd-palette-title">⚡ פקודות מהירות</div>
        <div className="agent-cmd-grid">
          {AGENT_COMMANDS.map(c => (
            <button
              key={c.cmd}
              className="agent-cmd-btn"
              onClick={() => applyDirectCommand(c.cmd)}
              title={c.desc}
              disabled={thinking}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="agent-chat-area">
        {messages.length === 0 && (
          <div className="agent-chat-empty">
            <div className="agent-empty-icon">🤖</div>
            <p className="agent-empty-title">AI Agent מוכן לפעולה</p>
            <p className="agent-empty-sub">
              לחץ על פקודה למעלה לשינוי מיידי, או תאר מה תרצה לשפר:
            </p>
            <div className="agent-example-prompts">
              {['תחזק את ה-CTA', 'הוסף דחיפות לווצאפ', 'שפר את המודעה', 'שנה לטון יוקרתי'].map((p, i) => (
                <button key={i} className="agent-example-btn" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`agent-msg agent-msg-${m.role}`}>
            {m.role === 'assistant' && <span className="agent-msg-avatar">✨</span>}
            <div className="agent-msg-bubble">{m.content}</div>
          </div>
        ))}

        {thinking && (
          <div className="agent-msg agent-msg-assistant">
            <span className="agent-msg-avatar">✨</span>
            <div className="agent-msg-bubble agent-thinking">
              <span className="gaia-dots"><span /><span /><span /></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="agent-input-wrap">
        <textarea
          ref={inputRef}
          className="agent-input"
          placeholder='תאר מה לשפר... לדוגמה: "הוסף דחיפות לוואטסאפ" או /luxury'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          disabled={thinking}
        />
        <button
          className={`agent-send-btn ${(!input.trim() || thinking) ? 'disabled' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || thinking}
        >
          {thinking ? '...' : '↑'}
        </button>
      </div>
      {messages.length > 0 && (
        <button className="agent-clear-btn" onClick={clearChat}>נקה שיחה</button>
      )}
    </div>
  )
}

// ── Tool tabs (right panel) ────────────────────────────────────────
const TOOL_TABS = [
  { id: 'whatsapp', icon: '📱', label: 'ווצאפ'   },
  { id: 'ads',      icon: '📢', label: 'מודעות'  },
  { id: 'posts',    icon: '📸', label: 'פוסטים'  },
  { id: 'sales',    icon: '💬', label: 'מכירה'   },
  { id: 'offers',   icon: '💰', label: 'מחירים'  },
  { id: 'agent',    icon: '🤖', label: 'AI'      },
]

// ── Summary Tab ───────────────────────────────────────────────────
function SummaryTab({ pkg, scores, copied, copy, onTabSwitch, onApplyCmd }) {
  const assets = [
    { icon: '📱', label: 'הודעות ווצאפ',  count: pkg.waFunnel.length,   tab: 'whatsapp' },
    { icon: '📢', label: 'מודעות פרסום',  count: 2,                      tab: 'ads' },
    { icon: '📸', label: 'פוסטים',        count: pkg.posts.length,       tab: 'posts' },
    { icon: '💬', label: 'תסריט מכירה',   count: 4,                      tab: 'sales' },
    { icon: '💰', label: 'חבילות מחיר',   count: pkg.packages.length,    tab: 'offers' },
    { icon: '🌐', label: 'אתר עסקי',      count: 1,                      tab: 'website' },
  ]

  return (
    <div className="growth-tab-content">
      {/* Score dashboard */}
      <ScoreDashboard scores={scores} />

      {/* Business badge */}
      <div className="growth-summary-header">
        <div className="growth-biz-badge">
          <span className="growth-biz-icon">{pkg.bizMeta?.icon || '🏪'}</span>
          <div>
            <div className="growth-biz-name">{pkg.name}</div>
            <div className="growth-biz-meta">{pkg.bizMeta?.label} · {pkg.city}</div>
          </div>
        </div>
        <div className="growth-summary-stats">
          <div className="growth-stat"><span className="growth-stat-num">{assets.reduce((a, x) => a + x.count, 0)}</span><span className="growth-stat-label">נכסים</span></div>
          <div className="growth-stat"><span className="growth-stat-num">{pkg.waFunnel.length}</span><span className="growth-stat-label">ווצאפ</span></div>
          <div className="growth-stat"><span className="growth-stat-num">{pkg.posts.length}</span><span className="growth-stat-label">פוסטים</span></div>
        </div>
      </div>

      {/* Recommendations */}
      {scores?.recommendations?.length > 0 && (
        <RecommendationsPanel recs={scores.recommendations.slice(0, 3)} onApplyCmd={cmd => { onApplyCmd(cmd); onTabSwitch('agent') }} />
      )}

      {/* Tasks */}
      {scores?.tasks?.length > 0 && (
        <TasksPanel tasks={scores.tasks} onTaskAction={cmd => { onApplyCmd(cmd); onTabSwitch('agent') }} />
      )}

      {/* Asset grid */}
      <div className="growth-assets-grid">
        {assets.map(a => (
          <button key={a.tab} className="growth-asset-card" onClick={() => onTabSwitch(a.tab)}>
            <span className="growth-asset-icon">{a.icon}</span>
            <span className="growth-asset-label">{a.label}</span>
            <span className="growth-asset-count">{a.count} פריטים</span>
            <span className="growth-asset-arrow">←</span>
          </button>
        ))}
      </div>

      {/* Quick copy */}
      <div className="growth-quick-copy">
        <div className="growth-section-title">🔥 הודעת ווצאפ ראשונה – מוכנה לשליחה</div>
        <div className="growth-msg-box">{pkg.waFunnel[0]}</div>
        <CopyBtn text={pkg.waFunnel[0]} id="summary-wa" copied={copied} copy={copy} label="📋 העתק הודעת ווצאפ" />
      </div>

      <div className="growth-quick-copy">
        <div className="growth-section-title">📢 כותרת מודעה – מוכנה לפרסום</div>
        <div className="growth-msg-box growth-msg-box-sm">{pkg.facebookAd.headline}</div>
        <CopyBtn text={pkg.facebookAd.headline} id="summary-ad" copied={copied} copy={copy} label="📋 העתק כותרת מודעה" />
      </div>
    </div>
  )
}

// ── WhatsApp Tab ──────────────────────────────────────────────────
function WhatsAppTab({ pkg, copied, copy }) {
  return (
    <div className="growth-tab-content">
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">📱 משפך וואטסאפ – {pkg.waFunnel.length} הודעות</h3>
        <p className="growth-tab-sub">שלחו בסדר הזה: הודעה 1 ראשונה, ואחריה 2-3 ימים בין כל הודעה</p>
      </div>
      {pkg.waFunnel.map((msg, i) => (
        <div key={i} className="growth-msg-card">
          <div className="growth-msg-num">הודעה {i + 1}{i === 0 ? ' – פתיחה' : i === pkg.waFunnel.length - 1 ? ' – סגירה' : ` – Follow-up ${i}`}</div>
          <div className="growth-msg-box">{msg}</div>
          <CopyBtn text={msg} id={`wa-${i}`} copied={copied} copy={copy} />
        </div>
      ))}

      <div className="growth-section-divider" />
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">🔄 הודעות follow-up</h3>
        <p className="growth-tab-sub">לאחר פגישה/שיחה ראשונה – שלחו לפי לוח זמנים זה:</p>
      </div>
      {pkg.followUps.map((fu, i) => (
        <div key={i} className="growth-msg-card growth-msg-card-alt">
          <div className="growth-msg-num">⏰ {fu.delay}</div>
          <div className="growth-msg-box">{fu.text}</div>
          <CopyBtn text={fu.text} id={`fu-${i}`} copied={copied} copy={copy} />
        </div>
      ))}
    </div>
  )
}

// ── Ads Tab ───────────────────────────────────────────────────────
function AdsTab({ pkg, copied, copy }) {
  return (
    <div className="growth-tab-content">
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">📘 מודעת פייסבוק / אינסטגרם</h3>
      </div>
      <div className="growth-ad-card">
        <div className="growth-ad-field">
          <div className="growth-ad-label">כותרת</div>
          <div className="growth-msg-box growth-msg-box-sm">{pkg.facebookAd.headline}</div>
          <CopyBtn text={pkg.facebookAd.headline} id="fb-headline" copied={copied} copy={copy} label="📋 העתק כותרת" />
        </div>
        <div className="growth-ad-field">
          <div className="growth-ad-label">טקסט ראשי</div>
          <div className="growth-msg-box">{pkg.facebookAd.primaryText}</div>
          <CopyBtn text={pkg.facebookAd.primaryText} id="fb-body" copied={copied} copy={copy} label="📋 העתק טקסט" />
        </div>
        <div className="growth-ad-field">
          <div className="growth-ad-label">תיאור קצר</div>
          <div className="growth-msg-box growth-msg-box-sm">{pkg.facebookAd.description}</div>
          <CopyBtn text={pkg.facebookAd.description} id="fb-desc" copied={copied} copy={copy} label="📋 העתק תיאור" />
        </div>
        <div className="growth-ad-cta-badge">CTA: {pkg.facebookAd.cta}</div>
      </div>

      <div className="growth-section-divider" />
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">🔍 מודעת גוגל (Search)</h3>
        <p className="growth-tab-sub">העתיקו כל כותרת/תיאור לשדה הנכון ב-Google Ads</p>
      </div>
      <div className="growth-ad-card">
        <div className="growth-ad-label">כותרות (עד 30 תווים)</div>
        {pkg.googleAd.headlines.map((h, i) => (
          <div key={i} className="growth-google-row">
            <span className="growth-google-idx">H{i + 1}</span>
            <span className="growth-google-text">{h}</span>
            <CopyBtn text={h} id={`g-h-${i}`} copied={copied} copy={copy} label="העתק" />
          </div>
        ))}
        <div className="growth-ad-label" style={{ marginTop: 16 }}>תיאורים (עד 90 תווים)</div>
        {pkg.googleAd.descriptions.map((d, i) => (
          <div key={i} className="growth-google-row">
            <span className="growth-google-idx">D{i + 1}</span>
            <span className="growth-google-text">{d}</span>
            <CopyBtn text={d} id={`g-d-${i}`} copied={copied} copy={copy} label="העתק" />
          </div>
        ))}
      </div>

      <div className="growth-section-divider" />
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">📣 כותרות מודעה נוספות</h3>
      </div>
      {pkg.adTitles.map((t, i) => (
        <div key={i} className="growth-msg-card growth-msg-card-alt">
          <div className="growth-msg-box growth-msg-box-sm">{t}</div>
          <CopyBtn text={t} id={`at-${i}`} copied={copied} copy={copy} />
        </div>
      ))}
    </div>
  )
}

// ── Posts Tab ─────────────────────────────────────────────────────
function PostsTab({ pkg, copied, copy }) {
  return (
    <div className="growth-tab-content">
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">📸 {pkg.posts.length} פוסטים לסושיאל מדיה</h3>
        <p className="growth-tab-sub">מוכנים לפייסבוק, אינסטגרם, לינקדאין ווואטסאפ סטטוס</p>
      </div>
      {pkg.posts.map((post, i) => (
        <div key={i} className="growth-msg-card">
          <div className="growth-msg-num">פוסט {i + 1}</div>
          <div className="growth-msg-box">{post}</div>
          <CopyBtn text={post} id={`post-${i}`} copied={copied} copy={copy} />
        </div>
      ))}
    </div>
  )
}

// ── Sales Script Tab ──────────────────────────────────────────────
function SalesScriptTab({ pkg, copied, copy }) {
  const s = pkg.salesScript
  const sections = [
    { id: 'opening',    icon: '👋', title: 'פתיחה', text: s.opening },
    { id: 'discovery',  icon: '🔍', title: 'גילוי צרכים', text: s.discovery },
    { id: 'pitch',      icon: '🎯', title: 'הצגת הפתרון', text: s.pitch },
    { id: 'objections', icon: '🛡️', title: 'התנגדויות', text: s.objections },
    { id: 'close',      icon: '🤝', title: 'סגירה', text: s.close },
  ]
  return (
    <div className="growth-tab-content">
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">💬 תסריט מכירה מותאם לעסק שלך</h3>
        <p className="growth-tab-sub">השתמש בתסריט כמדריך. תן לו להיות הכוונה – לא קריאה מילה במילה</p>
      </div>
      {sections.map(sec => (
        <div key={sec.id} className="growth-script-section">
          <div className="growth-script-header">
            <span className="growth-script-icon">{sec.icon}</span>
            <span className="growth-script-title">{sec.title}</span>
          </div>
          <div className="growth-msg-box growth-msg-box-script">{sec.text}</div>
          <CopyBtn text={sec.text} id={`script-${sec.id}`} copied={copied} copy={copy} />
        </div>
      ))}
    </div>
  )
}

// ── Offers & Packages Tab ─────────────────────────────────────────
function OffersTab({ pkg, copied, copy }) {
  return (
    <div className="growth-tab-content">
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">💰 הצעות לכניסה</h3>
        <p className="growth-tab-sub">הצעות לגרום ללקוח הראשון לצעד הראשון</p>
      </div>
      <div className="growth-offers-grid">
        {pkg.offers.map((o, i) => (
          <div key={i} className="growth-offer-card">
            <div className="growth-offer-price">{o.price}</div>
            <div className="growth-offer-title">{o.title}</div>
            <div className="growth-offer-desc">{o.desc}</div>
          </div>
        ))}
      </div>
      <div className="growth-section-divider" />
      <div className="growth-tab-intro">
        <h3 className="growth-tab-title">📦 חבילות מחיר</h3>
        <p className="growth-tab-sub">הצג ללקוחות 3 אפשרויות – רוב האנשים בוחרים אמצעי</p>
      </div>
      <div className="growth-packages-grid">
        {pkg.packages.map((p, i) => (
          <div key={i} className={`growth-package-card ${i === 1 ? 'featured' : ''}`}>
            {i === 1 && <div className="growth-package-badge">🔥 הכי פופולרי</div>}
            <div className="growth-package-name">{p.name}</div>
            <div className="growth-package-price">
              {p.price}
              {p.period && <span className="growth-package-period"> / {p.period}</span>}
            </div>
            <ul className="growth-package-features">
              {p.features.map((f, j) => <li key={j}>✅ {f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Website Tab ───────────────────────────────────────────────────
function WebsiteTab({ navigate }) {
  return (
    <div className="growth-tab-content">
      <div className="growth-website-promo">
        <div className="growth-website-icon">🌐</div>
        <h3>אתר עסקי מלא עם AI</h3>
        <p>בנה דף נחיתה מקצועי שמחובר לחבילת הצמיחה שלך – עם טופס לידים, כפתור ווצאפ ועיצוב מותאם</p>
        <div className="growth-website-features">
          {['✅ עיצוב מותאם לתחום', '✅ טופס לידים מובנה', '✅ כפתור ווצאפ', '✅ SEO אוטומטי', '✅ מובייל ראשון'].map((f, i) => (
            <div key={i} className="growth-website-feat">{f}</div>
          ))}
        </div>
        <button className="growth-website-btn" onClick={() => navigate('/ai')}>
          🚀 בנה אתר עם AI
        </button>
        <button className="growth-website-btn-secondary" onClick={() => navigate('/')}>
          📝 בנה דף נחיתה מהיר
        </button>
      </div>
    </div>
  )
}

// ── Publish Panel ─────────────────────────────────────────────────
function PublishPanel({ state, url, subdomainInput, onSubdomainChange, onPublish, onClose, urlCopied, onCopyUrl, pkg }) {
  return (
    <>
      <div className="publish-backdrop" onClick={onClose} />
      <div className="publish-panel" dir="rtl">
        <button className="publish-close" onClick={onClose}>✕</button>
        <div className="publish-panel-title">🚀 פרסם את האתר שלך</div>
        <div className="publish-panel-sub">האתר שלך יהיה נגיש לכל דפדפן בעולם</div>

        {state === 'idle' && (
          <>
            <div className="publish-field">
              <label className="publish-label">🔗 כתובת URL מותאמת (אופציונלי)</label>
              <div className="publish-url-preview">
                <span className="publish-url-base">{window.location.origin}/s/</span>
                <input
                  className="publish-subdomain-input"
                  placeholder={pkg?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'שם-העסק'}
                  value={subdomainInput}
                  onChange={e => onSubdomainChange(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <button className="publish-btn" onClick={onPublish}>
              🚀 פרסם עכשיו
            </button>
          </>
        )}

        {state === 'saving' && (
          <div className="publish-loading">
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <p>שומר ומפרסם...</p>
          </div>
        )}

        {state === 'done' && (
          <div className="publish-success">
            <div className="publish-success-icon">🎉</div>
            <div className="publish-success-title">האתר פורסם בהצלחה!</div>
            <div className="publish-url-box">
              <a href={url} target="_blank" rel="noreferrer" className="publish-url-link">{url}</a>
              <button className="publish-copy-btn" onClick={onCopyUrl}>
                {urlCopied ? '✓ הועתק!' : '📋 העתק'}
              </button>
            </div>
            <div className="publish-subdomain-note">
              💡 רוצה כתובת מותאמת? חבר דומיין בהגדרות
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="publish-open-btn">
              פתח אתר ←
            </a>
          </div>
        )}

        {state === 'error' && (
          <div className="publish-error-msg">
            שגיאה בפרסום. נסה שנית.
            <button onClick={onPublish}>נסה שנית</button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main GrowthPage ───────────────────────────────────────────────
export default function GrowthPage() {
  const navigate = useNavigate()
  const { addProject, addWebsite } = useAuth()
  const [pkg,       setPkg]       = useState(null)
  const [scores,    setScores]    = useState(null)
  const [activeTab, setActiveTab] = useState('whatsapp')
  const [saved,     setSaved]     = useState(false)
  const [publishState, setPublishState] = useState('idle')
  const [publishedUrl, setPublishedUrl]  = useState('')
  const [subdomainInput, setSubdomainInput] = useState('')
  const [showPublishPanel, setShowPublishPanel] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [device,    setDevice]    = useState('desktop')

  const { copied, copy } = useCopy()

  const website = useMemo(() => {
    if (!pkg) return null
    const form = { name: pkg.name, city: pkg.city, phone: pkg.phone || '', description: pkg.description || '' }
    return createWebsiteSchema(form, { ...pkg, bizType: pkg.bizType || 'default' })
  }, [pkg])

  const handlePkgUpdate = useCallback(newPkg => {
    setPkg(newPkg)
    setScores(scoreGrowthPackage(newPkg))
    try { sessionStorage.setItem('bb_growth_package', JSON.stringify(newPkg)) } catch {}
  }, [])

  const { messages: agentMessages, thinking: agentThinking, send: agentSend, applyDirectCommand, clearChat } = useGrowthAgent({
    pkg,
    onUpdate: handlePkgUpdate,
  })

  useEffect(() => {
    let p = getGrowthStore()
    if (!p) {
      try {
        const raw = sessionStorage.getItem('bb_growth_package')
        if (raw) p = JSON.parse(raw)
      } catch {}
    }
    if (p) {
      setPkg(p)
      setScores(scoreGrowthPackage(p))
      setBusinessProfile({ name: p.name, city: p.city, phone: p.phone, bizType: p.bizType, description: p.description })
      recordGrowthGeneration(p)
    } else {
      navigate('/ai')
    }
  }, [navigate])

  const handleApplyAgentCmd = useCallback(cmd => {
    applyDirectCommand(cmd)
    setActiveTab('agent')
  }, [applyDirectCommand])

  const handleSave = async () => {
    if (!pkg || saved) return
    try {
      await addProject({
        name: pkg.name,
        city: pkg.city,
        phone: pkg.phone,
        description: pkg.description,
        bizType: pkg.bizType,
        result: { landing: pkg.landing, posts: pkg.posts, adTitles: pkg.adTitles, emailSubject: pkg.emailSubject, emailBody: pkg.emailBody },
        growthPackage: pkg,
        growthScore: scores?.overall,
      })
      setSaved(true)
    } catch {}
  }

  const handlePublish = async () => {
    if (!pkg || publishState === 'saving') return
    setPublishState('saving')
    setShowPublishPanel(true)
    try {
      const form = { name: pkg.name, city: pkg.city, phone: pkg.phone, description: pkg.description }
      const website = createWebsiteSchema(form, { ...pkg, bizType: pkg.bizType })
      const customSlug = subdomainInput.trim()
        ? subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
        : website.slug
      const siteWithSlug = { ...website, slug: customSlug, publicUrl: `${window.location.origin}/s/${customSlug}` }
      const saved = await addWebsite(siteWithSlug)
      const published = await publishWebsite(saved || siteWithSlug)
      setPublishedUrl(published.publicUrl || `${window.location.origin}/s/${customSlug}`)
      setPublishState('done')
    } catch (e) {
      setPublishState('error')
    }
  }

  const copyPublishedUrl = () => {
    navigator.clipboard?.writeText(publishedUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  if (!pkg) {
    return (
      <div className="growth-page" dir="rtl">
        <div className="growth-loading">
          <span className="spinner" style={{ width: 32, height: 32 }} />
          <p>טוען חבילת צמיחה...</p>
        </div>
      </div>
    )
  }

  const bizSlug = pkg.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'my-business'
  const previewUrl = `bizbuilder.app/${bizSlug}`

  return (
    <div className="growth-page" dir="rtl">

      {/* Slim header */}
      <header className="growth-header">
        <button className="growth-back-btn" onClick={() => navigate('/ai')}>←</button>
        <div className="growth-header-center">
          <span className="growth-header-biz-icon">{pkg.bizMeta?.icon}</span>
          <span className="growth-header-name">{pkg.name}</span>
          {pkg.city && <span className="growth-header-city">{pkg.city}</span>}
        </div>
        <div className="growth-header-actions">
          <button className={`growth-save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '✓ נשמר' : 'שמור'}
          </button>
          <button className="growth-publish-btn" onClick={() => setShowPublishPanel(true)}>
            פרסם ←
          </button>
        </div>
      </header>

      {/* Full-screen website preview */}
      <div className="growth-preview-full">
        <div className="growth-browser-wrap">
          {/* Browser chrome bar */}
          <div className="growth-browser-bar">
            <div className="growth-browser-dots">
              <span /><span /><span />
            </div>
            <div className="growth-browser-url" dir="ltr">{previewUrl}</div>
            <div className="growth-browser-device-btns">
              <button
                className={`growth-device-btn ${device === 'desktop' ? 'active' : ''}`}
                onClick={() => setDevice('desktop')}
                title="תצוגת מחשב"
              >🖥</button>
              <button
                className={`growth-device-btn ${device === 'mobile' ? 'active' : ''}`}
                onClick={() => setDevice('mobile')}
                title="תצוגת מובייל"
              >📱</button>
            </div>
            <button className="growth-browser-publish-btn" onClick={() => setShowPublishPanel(true)}>
              פרסם ←
            </button>
          </div>

          {/* Viewport */}
          <div className={`growth-browser-viewport ${device === 'mobile' ? 'growth-viewport-mobile' : ''}`}>
            {device === 'mobile' ? (
              <div className="growth-phone-frame">
                <div className="growth-phone-notch" />
                <div className="growth-phone-screen">
                  {website && <WebsitePreview website={website} editMode={false} />}
                </div>
              </div>
            ) : (
              website && <WebsitePreview website={website} editMode={false} />
            )}
          </div>
        </div>
      </div>

      {/* Floating tools toggle */}
      <button
        className={`growth-tools-toggle${toolsOpen ? ' open' : ''}`}
        onClick={() => setToolsOpen(v => !v)}
      >
        🛠️ כלים שיווקיים
      </button>

      {/* Drawer backdrop */}
      {toolsOpen && (
        <div className="growth-drawer-backdrop" onClick={() => setToolsOpen(false)} />
      )}

      {/* Tools drawer */}
      <div className={`growth-drawer${toolsOpen ? ' open' : ''}`}>
        <div className="growth-drawer-header">
          <div className="growth-drawer-title">כלים שיווקיים</div>
          <button className="growth-drawer-close" onClick={() => setToolsOpen(false)}>✕</button>
        </div>
        <div className="growth-tools-tabs">
          {TOOL_TABS.map(t => (
            <button
              key={t.id}
              className={`growth-tool-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="growth-tool-tab-icon">{t.icon}</span>
              <span className="growth-tool-tab-label">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="growth-tools-content">
          {activeTab === 'whatsapp' && <WhatsAppTab    pkg={pkg} copied={copied} copy={copy} />}
          {activeTab === 'ads'      && <AdsTab         pkg={pkg} copied={copied} copy={copy} />}
          {activeTab === 'posts'    && <PostsTab       pkg={pkg} copied={copied} copy={copy} />}
          {activeTab === 'sales'    && <SalesScriptTab pkg={pkg} copied={copied} copy={copy} />}
          {activeTab === 'offers'   && <OffersTab      pkg={pkg} copied={copied} copy={copy} />}
          {activeTab === 'agent'    && <AgentTab       messages={agentMessages} thinking={agentThinking} send={agentSend} applyDirectCommand={applyDirectCommand} clearChat={clearChat} />}
        </div>
      </div>

      {showPublishPanel && (
        <PublishPanel
          state={publishState}
          url={publishedUrl}
          subdomainInput={subdomainInput}
          onSubdomainChange={setSubdomainInput}
          onPublish={handlePublish}
          onClose={() => { setShowPublishPanel(false); if (publishState !== 'done') setPublishState('idle') }}
          urlCopied={urlCopied}
          onCopyUrl={copyPublishedUrl}
          pkg={pkg}
        />
      )}
    </div>
  )
}
