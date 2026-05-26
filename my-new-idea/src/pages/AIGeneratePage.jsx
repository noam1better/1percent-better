import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGrowthPackage, GROWTH_STEPS } from '../ai/growthGenerator'
import { setGrowthStore } from '../ai/growthStore'
import { parsePrompt } from '../ai/promptParser'
import { getCredits, deductCredits, hasCredits, CREDITS_PER_GEN } from '../services/creditsService'
import ImageUpload from '../components/ImageUpload'

const EXAMPLES = [
  { label: '🍽️ מסעדה',    text: 'מסעדה איטלקית "פסטה נוסטרה" בתל אביב – ארוחות עסקיות, קייטרינג ומשלוחים. רוצים לידים ולחצי מגיעים ישירות בווצאפ' },
  { label: '⚖️ עורך דין', text: 'עו"ד שרה לוי, גירושין וירושה בירושלים. ייעוץ ראשוני חינם. רוצה לקוחות שישאירו פרטים ויתקשרו' },
  { label: '💪 חדר כושר', text: 'חדר כושר ופילאטיס "פאוור פיט" בחיפה. מאמנים אישיים. שיעור ניסיון חינם. רוצים מתאמנים חדשים' },
  { label: '💇 סלון יופי', text: 'סלון יופי "גלאם" בהרצליה – תספורות, צביעה, קרטין. קביעת תורים בווצאפ. רוצה להגיע ל-30 לקוחות חדשים בחודש' },
  { label: '🏠 ריצוף',   text: 'פרקט ויוקרה – הנחת פרקט וריצוף ברמת גן. עבודה מקצועית, אחריות 10 שנה. רוצה בקשות הצעת מחיר' },
  { label: '📊 רו"ח',    text: 'רו"ח מנחם בן-דוד בבאר שבע. מתמחה בעצמאיים ועסקים קטנים. ייעוץ מס וחיסכון. רוצה עצמאיים חדשים' },
]

const LS_HISTORY = 'bb_ai_prompt_history'
function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || [] } catch { return [] }
}
function saveHistory(prompt) {
  try {
    const h = [prompt, ...getHistory().filter(p => p !== prompt)].slice(0, 5)
    localStorage.setItem(LS_HISTORY, JSON.stringify(h))
  } catch {}
}

// ── AI Brain — generating only ────────────────────────────────────
function AIBrain({ phase }) {
  return (
    <div className={`ai-brain ${phase}`}>
      <div className="ai-brain-ring ai-ring-1" />
      <div className="ai-brain-ring ai-ring-2" />
      <div className="ai-brain-ring ai-ring-3" />
      <div className="ai-brain-core">🚀</div>
    </div>
  )
}

// ── Generating screen ─────────────────────────────────────────────
function GeneratingScreen({ currentIndex, done }) {
  const pct = done ? 100 : Math.round(((currentIndex + 1) / GROWTH_STEPS.length) * 100)
  return (
    <div className="ai-gen-screen">
      <AIBrain phase={done ? 'done' : 'thinking'} />
      <h2 className="ai-gen-title">
        {done ? 'חבילת הצמיחה שלך מוכנה!' : 'AI בונה את חבילת הצמיחה...'}
      </h2>
      <p className="ai-gen-sub">
        {done ? 'מעביר לחבילת הצמיחה...' : 'כמה שניות בלבד'}
      </p>
      <div className="ai-progress-bar-wrap">
        <div className="ai-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="ai-progress-pct">{pct}%</div>
      <div className="ai-steps-list">
        {GROWTH_STEPS.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'
          return (
            <div key={step.key} className={`ai-step ${state}`}>
              <span className="ai-step-icon">
                {state === 'done'   ? '✅' :
                 state === 'active' ? <span className="ai-step-dot" /> : '⬜'}
              </span>
              <span className="ai-step-label">{step.label}</span>
              {state === 'active' && <span className="ai-step-dots"><span /><span /><span /></span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function AIGeneratePage() {
  const navigate = useNavigate()

  const [prompt,      setPrompt]      = useState('')
  const [state,       setState]       = useState('idle')
  const [currentStep, setCurrentStep] = useState(-1)
  const [history,     setHistory]     = useState(getHistory)
  const [error,       setError]       = useState('')
  const [logoUrl,     setLogoUrl]     = useState('')

  const textareaRef = useRef(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleGenerate = async () => {
    const p = prompt.trim()
    if (!p || state === 'generating') return
    if (!hasCredits(CREDITS_PER_GEN)) {
      setError(`אין מספיק קרדיטים. נדרשים ${CREDITS_PER_GEN} קרדיטים.`)
      return
    }
    setError('')
    setState('generating')
    setCurrentStep(0)
    saveHistory(p)
    setHistory(getHistory())

    try {
      const parsed = parsePrompt(p)
      const pkg = await generateGrowthPackage(
        {
          name:        parsed.name  || p.split(' ').slice(0, 3).join(' '),
          city:        parsed.city  || '',
          phone:       parsed.phone || '',
          description: p,
          logoUrl:     logoUrl || '',
        },
        ({ index }) => setCurrentStep(index),
      )
      setGrowthStore({ ...pkg, logoUrl: logoUrl || '' })
      deductCredits(CREDITS_PER_GEN)
      try { sessionStorage.setItem('bb_growth_package', JSON.stringify(pkg)) } catch {}
      setState('done')
      setTimeout(() => navigate('/growth'), 900)
    } catch {
      setError('שגיאה ביצירת החבילה. נסו שוב.')
      setState('idle')
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
  }

  if (state === 'generating' || state === 'done') {
    return (
      <div className="ai-page" dir="rtl">
        <GeneratingScreen currentIndex={currentStep} done={state === 'done'} />
      </div>
    )
  }

  return (
    <div className="ai-page" dir="rtl">
      <header className="ai-topbar">
        <button className="ai-back-btn" onClick={() => navigate('/')}>← חזרה</button>
        <div className="ai-logo">
          <span className="logo-bb">BusinessBuilder</span>
          <span className="logo-ai"> AI</span>
        </div>
        <div style={{ width: 80 }} />
      </header>

      <main className="ai-main">
        <div className="ai-hero">
          <h1 className="ai-hero-title">תארו את העסק שלכם</h1>
          <p className="ai-hero-sub">AI יבנה עבורכם: דף נחיתה, מודעות, ווצאפ, פוסטים ותסריט מכירה.</p>
        </div>

        <div className="ai-input-wrap">
          <div className="ai-input-box">
            <textarea
              ref={textareaRef}
              className="ai-textarea"
              placeholder={'לדוגמה: "חדר כושר בחיפה, מאמנים מוסמכים, שיעור ניסיון חינם, רוצים לקוחות חדשים"'}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKey}
              rows={5}
              maxLength={500}
            />
            <div className="ai-input-footer">
              <span className="ai-char-count">{prompt.length}/500</span>
              <span className="ai-hint">Ctrl+Enter ליצירה</span>
            </div>
          </div>

          <div className="ai-logo-upload-row">
            <span className="ai-logo-upload-label">לוגו (אופציונלי)</span>
            {logoUrl
              ? <div className="ai-logo-preview">
                  <img src={logoUrl} alt="לוגו" />
                  <button onClick={() => setLogoUrl('')}>✕ הסר</button>
                </div>
              : <ImageUpload label="📎 העלה לוגו" onUpload={({ url }) => setLogoUrl(url)} />
            }
          </div>

          {error && <div className="ai-error">{error}</div>}

          <button
            className={`ai-generate-btn ${!prompt.trim() ? 'disabled' : ''}`}
            onClick={handleGenerate}
            disabled={!prompt.trim()}
          >
            <span className="home-btn-glow" />
            קבל חבילת צמיחה עם AI
          </button>
        </div>

        <div className="ai-section">
          <div className="ai-section-title">דוגמאות — לחץ להעתקה</div>
          <div className="ai-examples-grid">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="ai-example-chip" onClick={() => { setPrompt(ex.text); textareaRef.current?.focus() }}>
                <span className="ai-ex-label">{ex.label}</span>
                <span className="ai-ex-text">{ex.text}</span>
              </button>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="ai-section">
            <div className="ai-section-title">אחרונים</div>
            <div className="ai-history-list">
              {history.map((h, i) => (
                <button key={i} className="ai-history-item" onClick={() => { setPrompt(h); textareaRef.current?.focus() }}>
                  <span className="ai-hist-text">{h.length > 90 ? h.slice(0, 90) + '...' : h}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
