import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { streamAI, analyzeBusinessGaps } from '../services/advisorAI'
import GlobalAIAssistant from '../components/GlobalAIAssistant'
import ChallengeSection from '../../../ChallengeSection'
import WorkoutSection from '../components/WorkoutSection'
import './DashboardPage.css'

// ── Constants ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',   icon: '🏠', label: 'סקירה כללית' },
  { id: 'websites',   icon: '🌐', label: 'האתר שלי'    },
  { id: 'marketing',  icon: '📣', label: 'שיווק'        },
  { id: 'plans',      icon: '🗺️', label: 'מסלולים'     },
  { id: 'assistant',  icon: '🤖', label: 'יועץ AI'     },
  { id: 'leads',      icon: '👥', label: 'לידים'        },
  { id: 'settings',   icon: '⚙️', label: 'הגדרות'      },
]


const MKT_CARDS = [
  { id: 'post',  icon: '📱', title: 'פוסט לרשתות חברתיות', desc: 'תוכן מקצועי לאינסטגרם ופייסבוק'  },
  { id: 'ad',    icon: '📣', title: 'מודעה ממומנת',          desc: 'טקסט מודעה לגוגל ופייסבוק'        },
  { id: 'wa',    icon: '💬', title: 'קמפיין WhatsApp',       desc: 'הודעת שיווק אפקטיבית ללקוחות'    },
  { id: 'seo',   icon: '🔍', title: 'תוכן SEO',              desc: 'כתבה אינפורמטיבית לאתר שלכם'     },
  { id: 'reel',  icon: '📸', title: 'רעיון לריל',            desc: 'סקריפט לוידאו קצר לרשתות'        },
  { id: 'promo', icon: '🎯', title: 'מבצע מיוחד',            desc: 'פרסום קידום מכירות אטרקטיבי'     },
]

const MKT_CONTENT = {
  post: (biz) => `✨ ${biz.name || 'העסק שלנו'} – האיכות מדברת בעד עצמה!

הצוות שלנו מביא ניסיון, מקצועיות וחוויית לקוח יוצאת דופן.

📍 פועלים ב${biz.city || 'אזורכם'}
📞 דברו איתנו עוד היום
✅ הצעת מחיר חינמית תוך 24 שעות

📲 השאירו פרטים בתגובות!`,

  ad: (biz) => `כותרת: איכות מוכחת | ${biz.name || 'העסק שלכם'}
תיאור: שירות מקצועי, מחירים הוגנים, תוצאות מוכחות. קבלו הצעת מחיר חינמית תוך 24 שעות.
CTA: קבלו הצעת מחיר עכשיו`,

  wa: (biz) => `שלום! 👋

אנחנו ${biz.name || 'העסק שלנו'} ורצינו לשתף אתכם במבצע מיוחד:

🎁 [תיאור המבצע]

⏰ המבצע בתוקף עד סוף החודש בלבד!

מעוניינים? ענו להודעה זו ונחזור אליכם תוך שעה 🚀`,

  seo: (biz) => `כותרת: מדריך מקיף: כיצד לבחור ספק שירות מקצועי ב${biz.city || 'אזורכם'}?

בעת בחירת ספק שירות חשוב לבדוק:

1. ניסיון ותיק עבודות — בקשו לראות עבודות קודמות
2. אחריות ושירות — וודאו שיש אחריות כתובה
3. המלצות לקוחות — בדקו חוות דעת אמיתיות
4. שקיפות מחיר — הצעת מחיר מפורטת ללא הפתעות

${biz.name || 'העסק שלנו'} עומד בכל הפרמטרים הללו. צרו קשר עוד היום.`,

  reel: (biz) => `🎬 סקריפט לריל (15–30 שניות):

[0-3 שניות] – פתיחה מושכת:
"האם ידעתם ש-80% מהלקוחות בוחרים ספק לפי הרושם הראשוני?"

[3-12 שניות] – ערך:
הציגו תהליך עבודה קצר, לפני/אחרי, או ציטוט של לקוח מרוצה.

[12-25 שניות] – Call to Action:
"רוצים תוצאות כאלה? קישור בביו / שלחו לנו הודעה!"

🎵 מוזיקה: טרנדי ואנרגטית
📍 תגיות: #${biz.city || 'ישראל'} #${biz.bizType || 'עסק'} #מקצועי`,

  promo: (biz) => `🔥 מבצע מיוחד – ${biz.name || 'העסק שלנו'}!

⏰ לזמן מוגבל בלבד:
✅ [פרטי המבצע/הנחה]

למה לבחור בנו?
⭐ [יתרון 1]
⭐ [יתרון 2]
⭐ [יתרון 3]

📞 התקשרו עכשיו: ${biz.phone || '[מספר טלפון]'}
💬 WhatsApp: wa.me/${biz.waNum || '[מספר]'}

⚡ מספר המקומות מוגבל — אל תפספסו!`,
}

const LEAD_STATUSES = {
  new:       { label: 'ליד חדש',     color: '#22c55e' },
  contacted: { label: 'יצרנו קשר',  color: '#3b82f6' },
  converted: { label: 'לקוח פעיל',  color: '#7c3aed' },
  lost:      { label: 'אבד',         color: '#ef4444' },
}

const LEADS_KEY = 'saas_leads'

function getLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') } catch { return [] }
}
function saveLeads(leads) {
  try { localStorage.setItem(LEADS_KEY, JSON.stringify(leads)) } catch {}
}

// ── Overview Section ───────────────────────────────────────────────
const LAUNCH_STEPS = [
  { id: 'site',      icon: '✦',  label: 'האתר שלך נוצר',             waKey: null },
  { id: 'wa',        icon: '💬', label: 'חיבור WhatsApp',             waKey: 'waNum' },
  { id: 'preview',   icon: '🔗', label: 'שיתוף ראשון עם לקוח',       waKey: null },
  { id: 'post',      icon: '📱', label: 'פוסט ראשון ברשתות',          waKey: null },
  { id: 'campaign',  icon: '📣', label: 'קמפיין ראשון',               waKey: null },
]

function LaunchGuide({ biz, onNavigate }) {
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('db_launch') || 'null') || { site: true, wa: Boolean(biz.waNum) } } catch { return { site: true, wa: Boolean(biz.waNum) } }
  })

  function mark(id, link) {
    const next = { ...done, [id]: true }
    setDone(next)
    localStorage.setItem('db_launch', JSON.stringify(next))
    if (link) onNavigate(link)
  }

  const allDone = LAUNCH_STEPS.every(s => done[s.id])
  const completedCount = LAUNCH_STEPS.filter(s => done[s.id]).length

  if (allDone) return null

  const STEP_ACTIONS = {
    site:     () => window.open('/preview', '_blank'),
    wa:       () => mark('wa', 'settings'),
    preview:  () => { window.open('/preview', '_blank'); mark('preview', null) },
    post:     () => mark('post', 'marketing'),
    campaign: () => mark('campaign', 'marketing'),
  }

  return (
    <div className="db-launch-guide">
      <div className="db-launch-hd">
        <div>
          <div className="db-launch-title">🚀 השיקו את העסק שלכם</div>
          <div className="db-launch-sub">{completedCount}/{LAUNCH_STEPS.length} שלבים הושלמו</div>
        </div>
        <div className="db-launch-progress-wrap">
          <div className="db-launch-progress-bar" style={{ width: `${(completedCount / LAUNCH_STEPS.length) * 100}%` }} />
        </div>
      </div>
      <div className="db-launch-steps">
        {LAUNCH_STEPS.map(step => (
          <div key={step.id} className={`db-launch-step${done[step.id] ? ' done' : ''}`} onClick={() => !done[step.id] && STEP_ACTIONS[step.id]?.()}>
            <div className="db-launch-check">{done[step.id] ? '✓' : step.icon}</div>
            <span className="db-launch-label">{step.label}</span>
            {!done[step.id] && <span className="db-launch-arrow">←</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewSection({ biz, onNavigate }) {
  const [leads, setLeads] = useState([])

  useEffect(() => { setLeads(getLeads()) }, [])

  const newLeads = leads.filter(l => l.status === 'new').length
  const lastThree = leads.slice(-3).reverse()

  const STAT_CARDS = [
    {
      icon: '👥',
      value: leads.length,
      label: 'סך הלידים',
      sub: 'כל הפניות',
      color: 'var(--purple)',
      bg: 'rgba(124,58,237,0.12)',
    },
    {
      icon: '🆕',
      value: newLeads,
      label: 'לידים חדשים',
      sub: 'ממתינים לטיפול',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
    },
    {
      icon: '📝',
      value: 0,
      label: 'פוסטים AI',
      sub: 'נוצרו החודש',
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.12)',
    },
    {
      icon: '🤖',
      value: 0,
      label: 'שאלות AI',
      sub: 'נשאלו החודש',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.12)',
    },
  ]

  const QUICK_ACTIONS = [
    { icon: '📱', label: 'צרו פוסט',   action: () => onNavigate('marketing') },
    { icon: '👥', label: 'הוסף ליד',   action: () => onNavigate('leads')     },
    { icon: '🤖', label: 'שאלו AI',    action: () => onNavigate('assistant') },
    { icon: '🌐', label: 'צפו באתר',   action: () => window.open('/preview', '_blank') },
  ]

  return (
    <div className="db-section db-section-wide">
      {/* Welcome */}
      <div className="db-welcome">
        <h1 className="db-welcome-title">שלום, {biz.name || 'ברוכים הבאים'} 👋</h1>
        <p className="db-welcome-sub">הנה סיכום הפעילות של העסק שלכם</p>
      </div>

      {/* Daily challenge + workout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <ChallengeSection />
        <WorkoutSection />
      </div>

      {/* Launch guide (hides when all done) */}
      <LaunchGuide biz={biz} onNavigate={onNavigate} />

      {/* Stat cards */}
      <div className="db-stats-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="db-stat-card">
            <div className="db-stat-icon" style={{ color: s.color, background: s.bg }}>{s.icon}</div>
            <div className="db-stat-body">
              <div className="db-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="db-stat-label">{s.label}</div>
              <div className="db-stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="db-quick-section">
        <h3 className="db-sub-heading">פעולות מהירות</h3>
        <div className="db-quick-grid">
          {QUICK_ACTIONS.map((q, i) => (
            <button key={i} className="db-quick-btn" onClick={q.action}>
              <span className="db-quick-icon">{q.icon}</span>
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent leads */}
      <div className="db-recent-section">
        <div className="db-recent-hd">
          <h3 className="db-sub-heading">לידים אחרונים</h3>
          <button className="db-link-btn" onClick={() => onNavigate('leads')}>ראו את כל הלידים →</button>
        </div>
        {lastThree.length === 0 ? (
          <div className="db-recent-empty">
            <span className="db-recent-empty-icon">👥</span>
            <span>עדיין אין לידים — <button className="db-link-btn" onClick={() => onNavigate('leads')}>הוסיפו את הראשון</button></span>
          </div>
        ) : (
          <div className="db-recent-list">
            {lastThree.map(lead => {
              const st = LEAD_STATUSES[lead.status] || LEAD_STATUSES.new
              return (
                <div key={lead.id} className="db-recent-row">
                  <div className="db-lead-avatar" style={{ background: 'rgba(124,58,237,0.18)', color: 'var(--purple2)' }}>
                    {(lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="db-recent-info">
                    <span className="db-recent-name">{lead.name}</span>
                    {lead.phone && <span className="db-recent-phone">{lead.phone}</span>}
                  </div>
                  <div className="db-status-pill" style={{ '--st-color': st.color }}>{st.label}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const BIZ_TYPE_META = {
  flooring:   { emoji: '🪵', accent: '#d97706', label: 'פרקט וריצוף' },
  restaurant: { emoji: '🍽️', accent: '#dc2626', label: 'מסעדה' },
  beauty:     { emoji: '💅', accent: '#db2777', label: 'מכון יופי' },
  lawyer:     { emoji: '⚖️', accent: '#1d4ed8', label: 'עורך דין' },
  gym:        { emoji: '💪', accent: '#ea580c', label: 'חדר כושר' },
  accounting: { emoji: '📊', accent: '#0891b2', label: 'ראיית חשבון' },
  shop:       { emoji: '🛍️', accent: '#7c3aed', label: 'חנות' },
  startup:    { emoji: '🚀', accent: '#6366f1', label: 'סטארטאפ' },
}
const STYLE_BG = {
  modern: '#070711', classic: '#fafaf5', bold: '#090909', luxe: '#07060a',
}

// ── Websites Section ───────────────────────────────────────────────
function WebsitesSection({ biz }) {
  const meta   = BIZ_TYPE_META[biz.bizType] || BIZ_TYPE_META.flooring
  const bg     = STYLE_BG[biz.style] || STYLE_BG.modern
  const isDark = biz.style !== 'classic'

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2 className="db-section-title">האתר שלי</h2>
        <p className="db-section-sub">האתר שנוצר לעסקכם — מותאם לסוג העסק וסגנון שבחרתם</p>
      </div>
      <div className="db-templates-grid">
        {/* Active generated website */}
        <div className="db-template-card active-tpl">
          <div className="db-template-preview" style={{ background: bg, position: 'relative', overflow: 'hidden' }}>
            {/* glow blob */}
            <div style={{
              position: 'absolute', width: 140, height: 100, borderRadius: '50%',
              background: `radial-gradient(ellipse, ${meta.accent}44 0%, transparent 70%)`,
              top: -20, right: -20, pointerEvents: 'none',
            }} />
            <div className="db-tmock-bar">
              <span style={{ background: meta.accent, opacity: 0.7 }} />
              <span /><span />
            </div>
            <div style={{
              padding: '8px 10px 4px', textAlign: 'center',
              color: isDark ? '#fff' : '#1a1a2e', fontSize: 11, fontWeight: 800,
            }}>
              {meta.emoji} {biz.name || meta.label}
            </div>
            <div style={{
              width: 44, height: 3, borderRadius: 99, margin: '4px auto 8px',
              background: meta.accent,
            }} />
            <div className="db-tmock-lines">
              <div style={{ width: '85%', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
              <div style={{ width: '70%', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }} />
            </div>
            <div className="db-tmock-btn" style={{ background: meta.accent, opacity: 0.9 }} />
          </div>
          <div className="db-tpl-info">
            <div className="db-tpl-badge">✓ האתר שלכם</div>
            <div className="db-tpl-name">{biz.name || meta.label}</div>
            <div className="db-tpl-type">
              {meta.emoji} {meta.label}{biz.city ? ` · ${biz.city}` : ''}
              {biz.style ? ` · סגנון ${biz.style}` : ''}
            </div>
            <div className="db-tpl-actions">
              <a href="/preview" target="_blank" rel="noreferrer" className="db-btn-view">צפו באתר →</a>
            </div>
          </div>
        </div>

        {/* Locked templates */}
        {[{ name: 'תבנית פרמיום', desc: 'עיצוב יוקרתי מותאם' }, { name: 'תבנית מובייל-ראשית', desc: 'מיועדת לטלפון בלבד' }].map((t, i) => (
          <div key={i} className="db-template-card locked-tpl">
            <div className="db-template-preview db-template-preview-locked">
              <div className="db-lock-label">🔒 בקרוב</div>
            </div>
            <div className="db-tpl-info">
              <div className="db-tpl-name">{t.name}</div>
              <div className="db-tpl-type">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Marketing Section ──────────────────────────────────────────────
function MarketingSection({ biz }) {
  const [active,  setActive]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [copied,  setCopied]  = useState(false)

  const generate = (id) => {
    setActive(id)
    setLoading(true)
    setContent('')
    setCopied(false)
    setTimeout(() => {
      setLoading(false)
      setContent(MKT_CONTENT[id]?.(biz) || '')
    }, 1300)
  }

  const copy = () => {
    navigator.clipboard?.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2 className="db-section-title">שיווק AI</h2>
        <p className="db-section-sub">בחרו סוג תוכן ו-AI יייצר אותו עבורכם תוך שניות</p>
      </div>
      <div className="db-mkt-grid">
        {MKT_CARDS.map(c => (
          <button
            key={c.id}
            className={`db-mkt-card${active === c.id ? ' mkt-active' : ''}`}
            onClick={() => generate(c.id)}
          >
            <div className="db-mkt-icon">{c.icon}</div>
            <div className="db-mkt-title">{c.title}</div>
            <div className="db-mkt-desc">{c.desc}</div>
          </button>
        ))}
      </div>

      {active && (
        <div className="db-mkt-result">
          <div className="db-mkt-result-hd">
            <span>{MKT_CARDS.find(c => c.id === active)?.title}</span>
            {!loading && content && (
              <button className={`db-copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
                {copied ? '✓ הועתק!' : '📋 העתק'}
              </button>
            )}
          </div>
          {loading ? (
            <div className="db-mkt-spinner">
              <div className="db-spinner" />
              מייצר תוכן AI...
            </div>
          ) : (
            <pre className="db-mkt-text">{content}</pre>
          )}
        </div>
      )}
    </div>
  )
}

// ── Assistant Section ──────────────────────────────────────────────
function AssistantSection({ biz, onNavigate }) {
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: `היי${biz.name ? ` צוות ${biz.name}` : ''}! 👋\n\nאני היועץ האסטרטגי ה-AI שלכם — מתמחה בצמיחה עסקית, שיווק, המרות ותמחור.\n\n💡 שאלו אותי כל שאלה עסקית — תקבלו עצה ספציפית לעסק שלכם.\n\nמה מאתגר אתכם כרגע?`,
  }])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setShowInsights(false)

    const apiMessages = [...messages, { role: 'user', text: q }]
      .filter(m => m.text)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))

    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)

    let aiText = ''
    setMessages(m => [...m, { role: 'ai', text: '', streaming: true }])

    streamAI({
      biz,
      messages: apiMessages,
      onChunk: (chunk) => {
        aiText += chunk
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', text: aiText, streaming: true }
          return copy
        })
      },
      onDone: () => {
        setLoading(false)
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'ai', text: aiText, streaming: false }
          return copy
        })
      },
      onError: () => {
        setLoading(false)
        setMessages(m => [
          ...m.slice(0, -1),
          { role: 'ai', text: 'לא הצלחנו להתחבר. נסו שנית.', error: true },
        ])
      },
    })
  }

  const insights    = analyzeBusinessGaps(biz)
  const suggestions = ['איך להביא לקוחות ראשונים?', 'מה המחיר הנכון לשירותים שלי?', 'כתוב לי פוסט שיווקי', 'איך לסגור עסקאות יותר מהר?']

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2 className="db-section-title">יועץ AI</h2>
        <p className="db-section-sub">יועץ אסטרטגי אישי — שיווק, המרות, תמחור ועוד</p>
      </div>

      {showInsights && insights.length > 0 && (
        <div className="db-insights-panel">
          <div className="db-insights-hd">
            <span className="db-insights-label">🧠 ניתוח עסקי אוטומטי</span>
            <button className="db-insights-close" onClick={() => setShowInsights(false)}>✕</button>
          </div>
          {insights.map(ins => (
            <div key={ins.id} className={`db-insight-card db-insight--${ins.severity}`}>
              <span className="db-insight-icon">{ins.icon}</span>
              <div className="db-insight-body">
                <div className="db-insight-title">{ins.title}</div>
                <div className="db-insight-text">{ins.text}</div>
                {ins.cta && ins.ctaTab && (
                  <button className="db-insight-cta" onClick={() => onNavigate?.(ins.ctaTab)}>
                    {ins.cta} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="db-chat-wrap">
        <div className="db-chat-msgs">
          {messages.map((m, i) => (
            <div key={i} className={`db-msg db-msg-${m.role}`}>
              {m.role === 'ai' && <div className="db-avatar">🤖</div>}
              <div className={`db-bubble${m.error ? ' db-bubble--error' : ''}`}>
                {m.text}
                {m.streaming && <span className="db-cursor" />}
              </div>
            </div>
          ))}
          {loading && !messages[messages.length - 1]?.streaming && (
            <div className="db-msg db-msg-ai">
              <div className="db-avatar">🤖</div>
              <div className="db-bubble db-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="db-chat-suggestions">
            {suggestions.map((s, i) => (
              <button key={i} className="db-suggestion" onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form className="db-chat-form" onSubmit={e => { e.preventDefault(); send() }}>
          <input
            className="db-chat-input"
            placeholder="שאלו שאלה עסקית..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="db-chat-send" disabled={!input.trim() || loading}>
            שלח
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Leads Section ──────────────────────────────────────────────────
function LeadsSection() {
  const [leads,       setLeads]       = useState([])
  const [filter,      setFilter]      = useState('all')
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState({ name: '', phone: '', notes: '', status: 'new' })
  const [nameError,   setNameError]   = useState(false)

  useEffect(() => { setLeads(getLeads()) }, [])

  const persist = (next) => { setLeads(next); saveLeads(next) }

  const addLead = () => {
    if (!form.name.trim()) { setNameError(true); return }
    const lead = {
      id: Date.now(),
      name:   form.name.trim(),
      phone:  form.phone.trim(),
      notes:  form.notes.trim(),
      status: form.status,
      date:   new Date().toLocaleDateString('he-IL'),
    }
    persist([...leads, lead])
    setForm({ name: '', phone: '', notes: '', status: 'new' })
    setShowForm(false)
    setNameError(false)
  }

  const deleteLead = (id) => persist(leads.filter(l => l.id !== id))

  const updateStatus = (id, status) => persist(leads.map(l => l.id === id ? { ...l, status } : l))

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const FILTER_TABS = [
    { id: 'all',       label: 'הכל'           },
    { id: 'new',       label: 'ליד חדש'       },
    { id: 'contacted', label: 'יצרנו קשר'     },
    { id: 'converted', label: 'לקוח פעיל'     },
    { id: 'lost',      label: 'אבד'            },
  ]

  return (
    <div className="db-section db-section-wide">
      <div className="db-leads-header">
        <div>
          <h2 className="db-section-title">לידים</h2>
          <p className="db-section-sub">נהלו את כל הפניות ולקוחות הפוטנציאליים שלכם</p>
        </div>
        <button className="db-add-lead-btn" onClick={() => { setShowForm(true); setNameError(false) }}>
          + הוסף ליד
        </button>
      </div>

      {/* Filter tabs */}
      <div className="db-filter-tabs">
        {FILTER_TABS.map(t => (
          <button
            key={t.id}
            className={`db-filter-tab${filter === t.id ? ' active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
            {t.id === 'all'
              ? ` (${leads.length})`
              : leads.filter(l => l.status === t.id).length > 0
                ? ` (${leads.filter(l => l.status === t.id).length})`
                : ''}
          </button>
        ))}
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <div className="db-empty">
          <div className="db-empty-icon">👥</div>
          <div className="db-empty-title">{filter === 'all' ? 'עדיין אין לידים' : 'אין לידים בקטגוריה זו'}</div>
          <div className="db-empty-sub">
            {filter === 'all'
              ? 'לחצו על "הוסף ליד" כדי להוסיף פניה ראשונה'
              : 'שנו את הסינון לצפייה בלידים אחרים'}
          </div>
        </div>
      ) : (
        <div className="db-leads-list">
          {filtered.map(lead => {
            const st = LEAD_STATUSES[lead.status] || LEAD_STATUSES.new
            return (
              <div key={lead.id} className="db-lead-card">
                <div className="db-lead-avatar-wrap">
                  <div className="db-lead-avatar">{(lead.name || '?')[0].toUpperCase()}</div>
                </div>
                <div className="db-lead-body">
                  <div className="db-lead-top">
                    <span className="db-lead-name">{lead.name}</span>
                    {lead.date && <span className="db-lead-date">{lead.date}</span>}
                  </div>
                  {lead.phone && <div className="db-lead-phone">{lead.phone}</div>}
                  {lead.notes && <div className="db-lead-notes">{lead.notes}</div>}
                </div>
                <div className="db-lead-actions">
                  <select
                    className="db-status-select"
                    value={lead.status}
                    style={{ '--st-color': st.color }}
                    onChange={e => updateStatus(lead.id, e.target.value)}
                  >
                    {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <div className="db-lead-btns">
                    {lead.phone && (
                      <a
                        href={`https://wa.me/972${lead.phone.replace(/^0/, '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="db-wa-btn"
                        title="WhatsApp"
                      >
                        💬
                      </a>
                    )}
                    <button className="db-del-btn" onClick={() => deleteLead(lead.id)} title="מחק">✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add lead modal */}
      {showForm && (
        <div className="db-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="db-modal">
            <div className="db-modal-hd">
              <h3 className="db-modal-title">הוסף ליד חדש</h3>
              <button className="db-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="db-modal-body">
              <div className="db-field">
                <label className="db-label">שם מלא <span className="db-required">*</span></label>
                <input
                  className={`db-input${nameError ? ' input-error' : ''}`}
                  placeholder="ישראל ישראלי"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(false) }}
                />
                {nameError && <span className="db-error-msg">שדה זה חובה</span>}
              </div>
              <div className="db-field">
                <label className="db-label">טלפון</label>
                <input
                  className="db-input"
                  type="tel"
                  placeholder="050-0000000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="db-field">
                <label className="db-label">הערות</label>
                <textarea
                  className="db-input db-textarea"
                  placeholder="פרטים נוספים על הליד..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="db-field">
                <label className="db-label">סטטוס</label>
                <select
                  className="db-input db-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(LEAD_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-modal-cancel" onClick={() => setShowForm(false)}>ביטול</button>
              <button className="db-save-btn" onClick={addLead}>הוסף ליד</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settings Section ───────────────────────────────────────────────
function SettingsSection({ biz, onSave }) {
  const navigate = useNavigate()
  const [form,  setForm]  = useState({ ...biz })
  const [saved, setSaved] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    try { localStorage.setItem('saas_biz', JSON.stringify(form)) } catch {}
    onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const resetOnboard = () => {
    if (window.confirm('האם אתם בטוחים? פעולה זו תאפס את פרטי העסק ותחזיר אתכם לתהליך ההגדרה.')) {
      try {
        localStorage.removeItem('saas_biz')
        localStorage.removeItem('bb_ready')
      } catch {}
      navigate('/onboarding')
    }
  }

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2 className="db-section-title">הגדרות עסק</h2>
        <p className="db-section-sub">עדכנו את פרטי העסק שלכם</p>
      </div>
      <div className="db-settings-form">
        {[
          { k: 'name',  label: 'שם העסק',               type: 'text' },
          { k: 'city',  label: 'עיר',                    type: 'text' },
          { k: 'phone', label: 'טלפון',                  type: 'tel'  },
          { k: 'waNum', label: 'WhatsApp (ספרות בלבד)',  type: 'text' },
        ].map(({ k, label, type }) => (
          <div key={k} className="db-field">
            <label className="db-label">{label}</label>
            <input className="db-input" type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="db-field">
          <label className="db-label">שירותים</label>
          <textarea className="db-input db-textarea" value={form.services || ''} onChange={e => set('services', e.target.value)} />
        </div>
        <button className="db-save-btn" onClick={save}>שמור שינויים</button>
        {saved && <div className="db-saved-msg">✓ נשמר בהצלחה</div>}

        {/* Danger zone */}
        <div className="db-danger-zone">
          <div className="db-danger-hd">
            <span className="db-danger-title">⚠️ אזור מסוכן</span>
            <span className="db-danger-sub">פעולות אלו אינן הפיכות</span>
          </div>
          <button className="db-reset-btn" onClick={resetOnboard}>
            🔄 איפוס והגדרה מחדש
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plans Section ─────────────────────────────────────────────────
const PLAN_TRACKS_BASE = [
  {
    id: 'quick-launch',
    icon: '🚀',
    title: 'השקה מהירה',
    desc: 'אתר + ווצאפ + פוסט ראשון — תוך 48 שעות',
    steps: ['צור אתר', 'חבר ווצאפ', 'שתף עם לקוח ראשון'],
  },
  {
    id: 'organic-growth',
    icon: '📈',
    title: 'צמיחה אורגנית',
    desc: 'SEO + תוכן שבועי + ביקורות Google',
    steps: ['כתוב כתבת SEO', 'בקש ביקורת מלקוח', 'העלה פוסט שבועי'],
  },
  {
    id: 'lead-gen',
    icon: '💰',
    title: 'יצירת לידים',
    desc: 'CTA חזק + מסע לקוח + מעקב המרות',
    steps: ['עדכן CTA באתר', 'הגדר טופס ליד', 'הפעל קמפיין ווצאפ'],
  },
  {
    id: 'paid-campaign',
    icon: '🎯',
    title: 'קמפיין ממומן',
    desc: 'מודעת גוגל / פייסבוק + דף נחיתה ממוקד',
    steps: ['כתוב קופי מודעה', 'בנה דף נחיתה', 'הגדר תקציב יומי'],
  },
]

const PLAN_PART2_CONTENT = {
  'quick-launch':    { desc: 'A/B טסטינג, שיפור המרות ו-retargeting ראשון',      steps: ['בצע A/B לכותרת האתר', 'הוסף המלצות לקוחות', 'הפעל קמפיין retargeting'] },
  'organic-growth':  { desc: 'לינק בילדינג, רשימת תפוצה וסדרת תוכן מתקדמת',      steps: ['כתוב פוסט אורח', 'בנה רשימת מיילים', 'צור סדרת 4 תכנים'] },
  'lead-gen':        { desc: 'אוטומציה, lead nurturing ו-retargeting מתקדם',       steps: ['הגדר אוטומציה ווצאפ', 'צור רצף 3 מיילים', 'הפעל retargeting ממוקד'] },
  'paid-campaign':   { desc: 'סקיילינג, קהל lookalike ואופטימיזציה מתקדמת',        steps: ['הרחב לקהל lookalike', 'בצע אופטימיזציה יומית', 'הגדל תקציב לקמפיין מנצח'] },
}

function getPlansForDay(currentDay) {
  const base = PLAN_TRACKS_BASE
  const part2 = PLAN_TRACKS_BASE.map(t => ({
    ...t,
    id: `${t.id}-p2`,
    title: `${t.title} — חלק 2`,
    ...PLAN_PART2_CONTENT[t.id],
  }))
  // All plans unlocked for first 20 days
  if (currentDay <= 20) return [...base, ...part2]
  return base
}

function getDaysSinceJoined() {
  const key = 'saas_joined_at'
  const stored = localStorage.getItem(key)
  if (!stored) { localStorage.setItem(key, Date.now().toString()); return 1 }
  return Math.floor((Date.now() - Number(stored)) / 86_400_000) + 1
}

function PlansSection() {
  const currentDay = getDaysSinceJoined()
  const allPlans   = getPlansForDay(currentDay)

  return (
    <div className="db-section" dir="rtl">
      <div className="db-section-header">
        <h2 className="db-section-title">מסלולים</h2>
        <p className="db-section-sub">בחרו מסלול שיווקי ובנו תוכנית פעולה עם הייעוץ של ה-AI</p>
      </div>

      <div className="db-plans-grid">
        {allPlans.map(track => (
          <div key={track.id} className="db-plan-card">
            <span className="db-plan-icon">{track.icon}</span>
            <div className="db-plan-title">{track.title}</div>
            <div className="db-plan-desc">{track.desc}</div>
            <ol className="db-plan-steps">
              {track.steps.map((s, i) => (
                <li key={i}><span className="db-plan-step-num">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="db-plans-advisor">
        <div className="db-plans-advisor-hd">
          <span className="db-plans-advisor-icon">🤖</span>
          <div>
            <div className="db-plans-advisor-title">יועץ AI שיווקי</div>
            <div className="db-plans-advisor-sub">שאל שאלה על המסלול שבחרת — AI יתאים תוכנית לעסק שלך</div>
          </div>
        </div>
        <GlobalAIAssistant embedded />
      </div>
    </div>
  )
}

// ── Main DashboardPage ─────────────────────────────────────────────
export default function DashboardPage() {
  const navigate   = useNavigate()
  const [active,   setActive]   = useState('overview')
  const [biz,      setBiz]      = useState({})
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('saas_biz') || '{}')
      const ready  = localStorage.getItem('bb_ready')
      if (!ready || (!stored.name && !stored.bizType)) {
        // Stale or incomplete data — clear and restart
        localStorage.removeItem('saas_biz')
        localStorage.removeItem('bb_ready')
        navigate('/onboarding')
      } else {
        setBiz(stored)
      }
    } catch {
      navigate('/onboarding')
    }
  }, [navigate])

  const switchTab = (id) => { setActive(id); setMenuOpen(false) }

  const onNavigate = (tab) => switchTab(tab)

  return (
    <div className="db-root">
      {/* Sidebar */}
      <aside className={`db-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="db-sidebar-logo" onClick={() => navigate('/')}>
          <span className="db-logo-diamond">◆</span>
          BusinessBuilder <span className="db-logo-ai">AI</span>
        </div>

        {biz.name && (
          <div className="db-biz-chip">
            <div className="db-biz-dot" />
            <span className="db-biz-name">{biz.name}</span>
          </div>
        )}

        <div className="db-nav-divider" />

        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`db-nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => switchTab(item.id)}
            >
              <span className="db-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="db-nav-divider" />

        <div className="db-sidebar-footer">
          <a href="/pricing" className="db-upgrade-btn">
            <span>⚡</span>
            <span>שדרגו לPro</span>
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {menuOpen && <div className="db-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Main content */}
      <main className="db-main">
        <div className="db-topbar">
          <button className="db-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="פתח תפריט">☰</button>
          <span className="db-topbar-logo">
            <span className="db-logo-diamond">◆</span>
            BusinessBuilder <span className="db-logo-ai">AI</span>
          </span>
        </div>

        {active === 'overview'  && <OverviewSection   biz={biz} onNavigate={onNavigate} />}
        {active === 'websites'  && <WebsitesSection   biz={biz} />}
        {active === 'marketing' && <MarketingSection   biz={biz} />}
        {active === 'plans'     && <PlansSection />}
        {active === 'assistant' && <AssistantSection   biz={biz} onNavigate={onNavigate} />}
        {active === 'leads'     && <LeadsSection />}
        {active === 'settings'  && <SettingsSection    biz={biz} onSave={setBiz} />}
      </main>
    </div>
  )
}
