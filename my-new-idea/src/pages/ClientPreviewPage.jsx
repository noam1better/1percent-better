import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DynamicWebsitePage from './DynamicWebsitePage'
import './ClientPreviewPage.css'

const HE_MAP = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'h',
  'ט':'t','י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n',
  'ן':'n','ס':'s','ע':'a','פ':'p','ף':'f','צ':'ts','ץ':'ts','ק':'k',
  'ר':'r','ש':'sh','ת':'t',
}
function romanize(str = '') {
  return (str + '').split('').map(c => HE_MAP[c] ?? (c.match(/[a-z0-9]/i) ? c.toLowerCase() : '')).join('')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
function getBizDomain() {
  try {
    const biz  = JSON.parse(localStorage.getItem('saas_biz') || '{}')
    const slug = romanize(biz.name || '')
    if (slug.length >= 3) return `${slug}.businessbuilder.ai`
    const raw  = (biz.bizType || 'my-business').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'my-business'
    return `${raw}.businessbuilder.ai`
  } catch { return 'your-business.businessbuilder.ai' }
}
const DOMAIN     = getBizDomain()
const FULL_URL   = `https://${DOMAIN}`
const _OUR_WA_NUM = (import.meta.env.VITE_CONTACT_WHATSAPP || '').replace(/\D/g, '')
const OUR_WA     = _OUR_WA_NUM
  ? `https://wa.me/${_OUR_WA_NUM}?text=${encodeURIComponent('שלום! ראיתי את הדמו ואני רוצה אתר כזה לעסק שלי.')}`
  : null
const EMPTY_CUSTOM = { name: '', phone: '', waNum: '', logo: null, heroImg: null }

function getBizLoadSteps() {
  try {
    const biz  = JSON.parse(localStorage.getItem('saas_biz') || '{}')
    const n    = biz.name || ''
    return [
      n ? `מנתח את ${n}...` : 'מנתח את שם העסק...',
      'מייצר תוכן שיווקי מקצועי...',
      n ? `מעצב אתר ייחודי ל${n}...` : 'בונה עיצוב מותאם אישית...',
      'מחבר WhatsApp · לידים · אמון...',
      n ? `✓ האתר של ${n} מוכן!` : '✓ האתר מוכן לשיתוף!',
    ]
  } catch {
    return ['מנתח...','מייצר תוכן...','בונה עיצוב...','מוסיף WhatsApp...','מוכן ✓']
  }
}

const BIZ_TYPES = ['בחר סוג עסק','פרקט ושיפוצים','מסעדה ואוכל','קוסמטיקה וספא','בריאות ורפואה','אופנה וקמעונאות','שירותים מקצועיים','אחר']

// ── helpers ────────────────────────────────────────────────────────
function readFile(file) {
  return new Promise(resolve => {
    const r = new FileReader()
    r.onload = e => resolve(e.target.result)
    r.readAsDataURL(file)
  })
}

// ── Loading screen ─────────────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const LOAD_STEPS = useMemo(getBizLoadSteps, [])
  const [stepIdx,  setStepIdx]  = useState(0)
  const [progress, setProgress] = useState(0)
  const [fading,   setFading]   = useState(false)

  useEffect(() => {
    const TOTAL = 2600
    const iv    = setInterval(() => setStepIdx(i => Math.min(i + 1, LOAD_STEPS.length - 1)), TOTAL / LOAD_STEPS.length)
    let raf
    const start = Date.now()
    const tick  = () => { const p = Math.min(100, ((Date.now() - start) / TOTAL) * 100); setProgress(p); if (p < 100) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    const t1 = setTimeout(() => setFading(true), TOTAL)
    const t2 = setTimeout(() => onDone(), TOTAL + 520)
    return () => { clearInterval(iv); cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`cp-loading${fading ? ' fade-out' : ''}`}>
      <div className="cp-loading-bg" />
      <div className="cp-loading-inner">
        <div className="cp-loading-logo">
          <span className="cp-loading-logo-icon">✦</span>
          <span>BusinessBuilder</span>
          <span className="cp-loading-logo-ai">AI</span>
        </div>
        <div className="cp-loading-steps">
          {LOAD_STEPS.map((label, i) => {
            const s = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
            return (
              <div key={i} className={`cp-loading-step ${s}`}>
                <span className="cp-loading-step-icon">{s === 'done' ? '✓' : s === 'active' ? '⟳' : '○'}</span>
                <span className="cp-loading-step-text">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="cp-loading-bar-wrap"><div className="cp-loading-bar" style={{ width: `${progress}%` }} /></div>
        <div className="cp-loading-pct">{Math.round(progress)}%</div>
      </div>
    </div>
  )
}

// ── Setup panel (salesperson tool) ─────────────────────────────────
function SetupPanel({ open, custom, onChange, onClose }) {
  const logoRef   = useRef()
  const heroRef   = useRef()

  async function handleFile(field, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await readFile(file)
    onChange({ ...custom, [field]: data })
  }

  return (
    <div className={`cp-setup-panel${open ? ' open' : ''}`}>
      <div className="cp-setup-inner">
        <div className="cp-setup-row">
          {/* Text fields */}
          <label className="cp-setup-field">
            <span>שם עסק</span>
            <input className="cp-setup-input" placeholder="שם העסק" value={custom.name}
              onChange={e => onChange({ ...custom, name: e.target.value })} />
          </label>
          <label className="cp-setup-field">
            <span>טלפון</span>
            <input className="cp-setup-input" placeholder="02-622-8800" value={custom.phone}
              onChange={e => onChange({ ...custom, phone: e.target.value })} />
          </label>
          <label className="cp-setup-field">
            <span>וואטסאפ (מספר)</span>
            <input className="cp-setup-input" placeholder="972501234567" value={custom.waNum}
              onChange={e => onChange({ ...custom, waNum: e.target.value })} />
          </label>

          {/* File uploads */}
          <div className="cp-setup-field">
            <span>לוגו</span>
            <div className="cp-setup-upload-row">
              <button className="cp-setup-upload-btn" onClick={() => logoRef.current?.click()}>
                {custom.logo ? '✓ הועלה' : '📁 העלה'}
              </button>
              {custom.logo && (
                <img src={custom.logo} alt="logo preview"
                  className="cp-setup-thumb"
                  onClick={() => onChange({ ...custom, logo: null })}
                  title="לחץ להסרה"
                />
              )}
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile('logo', e)} />
            </div>
          </div>

          <div className="cp-setup-field">
            <span>תמונת רקע</span>
            <div className="cp-setup-upload-row">
              <button className="cp-setup-upload-btn" onClick={() => heroRef.current?.click()}>
                {custom.heroImg ? '✓ הועלה' : '📁 העלה'}
              </button>
              {custom.heroImg && (
                <img src={custom.heroImg} alt="hero preview"
                  className="cp-setup-thumb"
                  onClick={() => onChange({ ...custom, heroImg: null })}
                  title="לחץ להסרה"
                />
              )}
              <input ref={heroRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile('heroImg', e)} />
            </div>
          </div>

          {/* Reset + close */}
          <div className="cp-setup-actions">
            <button className="cp-setup-reset"
              onClick={() => onChange(EMPTY_CUSTOM)}>אפס</button>
            <button className="cp-setup-close-btn" onClick={onClose}>סגור ✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Top browser chrome bar ─────────────────────────────────────────
function TopBar({ device, setDevice, onShare, copyState, editOpen, onEditToggle }) {
  return (
    <div className="cp-topbar">
      <div className="cp-traffic">
        <span className="cp-dot red" /><span className="cp-dot yellow" /><span className="cp-dot green" />
      </div>
      <div className="cp-url-bar">
        <span className="cp-url-lock">🔒</span>
        <span className="cp-url-text">{DOMAIN}</span>
        <span className="cp-url-badge">AI ✦</span>
      </div>
      <a href="/site-preview" target="_blank" rel="noreferrer" className="cp-public-link" title="צפו באתר הציבורי">
        🔗 אתר ציבורי
      </a>
      <div className="cp-topbar-right">
        <div className="cp-device-btns">
          <button className={`cp-device-btn${device === 'desktop' ? ' active' : ''}`}
            onClick={() => setDevice('desktop')} title="תצוגת מחשב">🖥</button>
          <button className={`cp-device-btn${device === 'mobile' ? ' active' : ''}`}
            onClick={() => setDevice('mobile')} title="תצוגת מובייל">📱</button>
        </div>
        <button className={`cp-share-btn${copyState === 'copied' ? ' copied' : ''}`} onClick={onShare}>
          {copyState === 'copied' ? '✓ הועתק!' : '🔗 שתף'}
        </button>
        <button className={`cp-edit-btn${editOpen ? ' active' : ''}`} onClick={onEditToggle} title="הגדרות דמו">
          ⚙
        </button>
      </div>
    </div>
  )
}

// ── Phone frame (iframe) ───────────────────────────────────────────
function MobilePreview({ iframeKey }) {
  return (
    <div className="cp-phone-scene">
      <div className="cp-phone-frame">
        <div className="cp-phone-island" />
        <span className="cp-phone-side-btn vol-up"  />
        <span className="cp-phone-side-btn vol-down" />
        <span className="cp-phone-side-btn power"   />
        <iframe key={iframeKey} src="/site-preview" title="תצוגת מובייל" className="cp-phone-iframe" />
      </div>
      <div className="cp-phone-label">{DOMAIN}</div>
    </div>
  )
}

// ── Offer section (below website, visible after scrolling) ─────────
function OfferSection({ onCTA }) {
  return (
    <section className="cp-offer-section">
      <div className="cp-offer-glow" />
      <div className="cp-offer-inner">
        <div className="cp-offer-brand">✦ BusinessBuilder AI</div>
        <h2 className="cp-offer-h2">
          האתר שראיתם הרגע — נבנה ע&quot;י AI תוך 60 שניות
        </h2>
        <p className="cp-offer-sub">
          רוצים אתר כזה לעסק שלכם? מוכן תוך 24 שעות. ללא קוד. ללא מפתחים.
        </p>
        <div className="cp-offer-pills">
          {['⚡ תוך 24 שעות', '🤖 AI מייצר הכל', '₪199 לחודש', '🔗 לינק מוכן לשיתוף', '💬 WhatsApp מובנה'].map(p => (
            <span key={p} className="cp-offer-pill">{p}</span>
          ))}
        </div>
        <div className="cp-offer-ctas">
          <button className="cp-offer-cta-primary" onClick={onCTA}>
            ✦ רוצה אתר כזה — השאר פרטים
          </button>
          {OUR_WA && (
            <a href={OUR_WA} target="_blank" rel="noreferrer" className="cp-offer-cta-wa">
              💬 דברו איתנו עכשיו
            </a>
          )}
        </div>
        <div className="cp-offer-trust">
          ביטול בכל עת · ללא התחייבות · תוצאות תוך 24 שעות
        </div>
      </div>
    </section>
  )
}

// ── Lead capture modal ─────────────────────────────────────────────
function LeadModal({ open, onClose }) {
  const [form, setForm]  = useState({ name: '', biz: '', phone: '', type: '' })
  const [sent, setSent]  = useState(false)
  const [err,  setErr]   = useState(false)

  function handleSubmit() {
    if (!form.name || !form.phone) { setErr(true); return }
    setErr(false)
    setSent(true)
  }

  function handleClose() {
    onClose()
    setTimeout(() => { setSent(false); setForm({ name: '', biz: '', phone: '', type: '' }); setErr(false) }, 400)
  }

  if (!open) return null

  return (
    <div className="cp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="cp-modal">
        <button className="cp-modal-close" onClick={handleClose}>✕</button>

        {sent ? (
          <div className="cp-modal-success">
            <div className="cp-modal-success-icon">🎉</div>
            <h3>קיבלנו את הפרטים שלך!</h3>
            <p>ניצור איתך קשר תוך שעה עם הדמו המותאם לעסק שלך</p>
            {OUR_WA && (
              <a href={OUR_WA} target="_blank" rel="noreferrer" className="cp-modal-wa-btn">
                💬 שלח לנו הודעה ישירות עכשיו
              </a>
            )}
            <button className="cp-modal-done-btn" onClick={handleClose}>סגור</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="cp-modal-header">
              <div className="cp-modal-badge">✦ BusinessBuilder AI</div>
              <h2 className="cp-modal-h2">האתר שלך מוכן תוך 24 שעות</h2>
              <p className="cp-modal-sub">השאר פרטים ונחזור אליך עם דמו מותאם לעסק שלך — ללא עלות</p>
            </div>

            {/* Pricing pills */}
            <div className="cp-modal-pricing">
              <div className="cp-modal-price-card">
                <div className="cp-modal-price-amount">₪199</div>
                <div className="cp-modal-price-period">לחודש</div>
                <div className="cp-modal-price-label">Basic</div>
              </div>
              <div className="cp-modal-price-divider" />
              <div className="cp-modal-features">
                {['✓ דף נחיתה AI מקצועי','✓ WhatsApp משפך לידים','✓ טופס לידים מובנה','✓ לינק מוכן לשיתוף','✓ עדכונים ללא הגבלה'].map(f => (
                  <div key={f} className="cp-modal-feature">{f}</div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="cp-modal-form">
              {err && <div className="cp-modal-err">נא למלא שם וטלפון</div>}
              <div className="cp-modal-field-row">
                <input className="cp-modal-input" placeholder="שם מלא *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input className="cp-modal-input" placeholder="שם העסק" value={form.biz}
                  onChange={e => setForm(f => ({ ...f, biz: e.target.value }))} />
              </div>
              <div className="cp-modal-field-row">
                <input className="cp-modal-input" placeholder="טלפון *" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <select className="cp-modal-input cp-modal-select" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {BIZ_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button className="cp-modal-submit" onClick={handleSubmit}>
                ✦ בנה לי אתר כזה — חינם →
              </button>
              <div className="cp-modal-fine">🔒 לא מעבירים לצד שלישי · ביטול בכל עת</div>
            </div>

            {/* Direct WA option — only when VITE_CONTACT_WHATSAPP is set */}
            {OUR_WA && (
              <>
                <div className="cp-modal-or"><span>או</span></div>
                <a href={OUR_WA} target="_blank" rel="noreferrer" className="cp-modal-wa-link">
                  💬 דבר איתנו עכשיו בוואטסאפ →
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Floating AI badge ──────────────────────────────────────────────
function AIBadge() {
  return (
    <div className="cp-ai-badge">
      <span className="cp-ai-badge-icon">✦</span>נוצר ע&quot;י AI
    </div>
  )
}

// ── Launch checklist (owner only, first visit) ─────────────────────
function LaunchChecklist({ biz, onShare, onClose }) {
  const [done, setDone] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lc_done') || 'null')
      if (saved) return saved
    } catch {}
    return { site: true, wa: Boolean(biz.waNum), share: false, dashboard: false }
  })

  function mark(id) {
    const next = { ...done, [id]: true }
    setDone(next)
    localStorage.setItem('lc_done', JSON.stringify(next))
  }

  const items = [
    { id: 'site',      icon: '✦',  label: 'האתר שלך נוצר',           sub: 'מוכן לשיתוף',                            action: null,                              link: null },
    { id: 'wa',        icon: '💬', label: 'חיבור WhatsApp',           sub: done.wa ? '✓ מחובר' : 'הוסיפו מספר ב-לוח הבקרה', action: null,                         link: '/dashboard' },
    { id: 'share',     icon: '🔗', label: 'שיתוף עם לקוח ראשון',      sub: 'שלחו את לינק האתר',                      action: () => { onShare(); mark('share') }, link: null },
    { id: 'dashboard', icon: '📊', label: 'עדכון לוח הבקרה',          sub: 'הוסיפו תמונות ושירותים',                  action: null,                              link: '/dashboard' },
  ]

  const allDone = items.every(i => done[i.id])

  return (
    <div className="cp-checklist">
      <div className="cp-checklist-hd">
        <div className="cp-checklist-title">🚀 השיקו את העסק שלכם</div>
        <button className="cp-checklist-x" onClick={onClose} aria-label="סגור">✕</button>
      </div>
      <div className="cp-checklist-body">
        {items.map(item => (
          <div key={item.id} className={`cp-checklist-item${done[item.id] ? ' done' : ''}`}>
            <div className="cp-checklist-check">{done[item.id] ? '✓' : '○'}</div>
            <div className="cp-checklist-info">
              <div className="cp-checklist-label">{item.label}</div>
              <div className="cp-checklist-sub">{item.sub}</div>
            </div>
            {!done[item.id] && item.action && (
              <button className="cp-checklist-btn" onClick={item.action}>שתף ←</button>
            )}
            {!done[item.id] && !item.action && item.link && (
              <a href={item.link} className="cp-checklist-btn">הגדר ←</a>
            )}
          </div>
        ))}
      </div>
      {allDone && <div className="cp-checklist-complete">🎉 מעולה! העסק שלכם מוכן לגמרי.</div>}
    </div>
  )
}

// ── Bottom CTA bar ─────────────────────────────────────────────────
function BottomBar({ onCTA, isOwner }) {
  return (
    <div className="cp-bottom-bar">
      <div className="cp-bottom-powered">
        <span className="cp-bottom-powered-icon">✦</span>
        BusinessBuilder AI
      </div>
      {isOwner ? (
        <>
          <div className="cp-bottom-cta-text"><strong>האתר שלכם מוכן! 🎉</strong></div>
          <a href="/dashboard" className="cp-bottom-cta-btn">לוח הבקרה →</a>
        </>
      ) : (
        <>
          <div className="cp-bottom-cta-text"><strong>רוצים אתר כזה לעסק שלכם?</strong></div>
          <button className="cp-bottom-cta-btn" onClick={onCTA}>דברו איתנו →</button>
        </>
      )}
    </div>
  )
}

// ── Copied toast ───────────────────────────────────────────────────
function CopiedToast({ state }) {
  if (state === 'idle') return null
  return (
    <div className={`cp-copied-toast${state === 'hiding' ? ' hide' : ''}`}>
      ✓ הלינק הועתק — שתף עם הלקוח שלך
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
export default function ClientPreviewPage() {
  const navigate = useNavigate()
  const [loading,    setLoading]    = useState(true)
  const [revealed,   setRevealed]   = useState(false)
  const [device,     setDevice]     = useState('desktop')
  const [copyState,  setCopyState]  = useState('idle')  // 'idle'|'copied'|'hiding'
  const [editOpen,   setEditOpen]   = useState(false)
  const [leadOpen,   setLeadOpen]   = useState(false)
  const [iframeKey,  setIframeKey]  = useState(0)
  const hideTimer = useRef(null)

  const biz = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('saas_biz') || '{}') } catch { return {} }
  }, [])
  const isOwner = Boolean(biz.bizType)

  // Guard: only allow access after explicit onboarding completion
  useEffect(() => {
    const ready = localStorage.getItem('bb_ready')
    const hasBiz = Boolean(biz.bizType)
    if (!ready || !hasBiz) {
      navigate('/', { replace: true })
    }
  }, [biz.bizType, navigate])

  const [checklistOpen, setChecklistOpen] = useState(() => {
    try {
      if (!JSON.parse(localStorage.getItem('saas_biz') || '{}').bizType) return false
      if (localStorage.getItem('lc_shown')) return false
      localStorage.setItem('lc_shown', '1')
      return true
    } catch { return false }
  })

  // Custom data — persisted in localStorage
  const [customData, setCustomData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('demo_custom') || '{}') }
    catch { return {} }
  })

  // Persist to localStorage whenever customData changes
  useEffect(() => {
    localStorage.setItem('demo_custom', JSON.stringify(customData))
    // Refresh iframe if in mobile mode so it re-reads localStorage
    setIframeKey(k => k + 1)
  }, [customData])

  const handleLoadingDone = useCallback(() => {
    setLoading(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)))
  }, [])

  const handleShare = useCallback(() => {
    navigator.clipboard?.writeText(FULL_URL).catch(() => {})
    clearTimeout(hideTimer.current)
    setCopyState('copied')
    hideTimer.current = setTimeout(() => {
      setCopyState('hiding')
      setTimeout(() => setCopyState('idle'), 280)
    }, 2200)
  }, [])

  const handleDeviceChange = useCallback((d) => {
    setDevice(d)
    if (d === 'mobile') setIframeKey(k => k + 1)
  }, [])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  return (
    <div className="cp-root">
      {loading && <LoadingScreen onDone={handleLoadingDone} />}

      <TopBar
        device={device}
        setDevice={handleDeviceChange}
        onShare={handleShare}
        copyState={copyState}
        editOpen={editOpen}
        onEditToggle={() => setEditOpen(o => !o)}
      />

      <SetupPanel
        open={editOpen}
        custom={{ ...EMPTY_CUSTOM, ...customData }}
        onChange={setCustomData}
        onClose={() => setEditOpen(false)}
      />

      <div className={`cp-main${revealed ? ' revealed' : ''}${device === 'mobile' ? ' mobile-mode' : ''}`}>
        {device === 'desktop'
          ? <>
              <div className="cp-demo-wrap">
                <DynamicWebsitePage custom={customData} />
              </div>
              <OfferSection onCTA={() => setLeadOpen(true)} />
            </>
          : <MobilePreview iframeKey={iframeKey} />
        }
      </div>

      <AIBadge />
      {checklistOpen && (
        <LaunchChecklist
          biz={biz}
          onShare={handleShare}
          onClose={() => setChecklistOpen(false)}
        />
      )}
      <BottomBar onCTA={() => setLeadOpen(true)} isOwner={isOwner} />
      <CopiedToast state={copyState} />
      <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)} />
    </div>
  )
}
