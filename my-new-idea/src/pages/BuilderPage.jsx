import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import WebsitePreview from '../components/website/WebsitePreview'
import { PALETTES, FONTS, SECTION_META, ST, makeSection } from '../engine/websiteSchema'
import { toast } from '../components/Toast'
import { BIZ_META } from '../contentEngine'
import { getWebsiteStore } from '../ai/websiteStore'
import { publishWebsite } from '../services/websiteService'
import { loadLeads, deleteLead, leadsToCSV } from '../services/leadsService'
import { getAnalytics, getFakeAnalytics } from '../services/analyticsService'
import { regenSingleSection } from '../ai/mockGenerator'
import { parsePrompt } from '../ai/promptParser'
import ImageUpload from '../components/ImageUpload'
import AIChatSidebar from '../components/AIChatSidebar'
import { setCurrentWebsite } from '../ai/aiMemory'

// ── Section editor — renders per-type fields ──────────────────────
function SectionEditor({ section, onSave, onClose }) {
  const [data, setData] = useState({ ...section.data })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  const setItem = (arr, i, k, v) => {
    const next = [...(data[arr] || [])]
    next[i] = { ...next[i], [k]: v }
    setData(d => ({ ...d, [arr]: next }))
  }
  const addItem = (arr, blank) => setData(d => ({ ...d, [arr]: [...(d[arr] || []), blank] }))
  const delItem = (arr, i) => setData(d => ({ ...d, [arr]: d[arr].filter((_, j) => j !== i) }))

  const save = () => { onSave(data); onClose() }

  return (
    <div className="se-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="se-panel">
        <div className="se-header">
          <h2 className="se-title">
            {SECTION_META[section.type]?.icon} עריכת {SECTION_META[section.type]?.label}
          </h2>
          <button className="se-close" onClick={onClose}>✕</button>
        </div>

        <div className="se-body">
          {/* ── HERO ── */}
          {section.type === ST.HERO && <>
            <Field label="בדג' / תגית"    value={data.badge}    onChange={v => set('badge', v)} />
            <Field label="כותרת ראשית"    value={data.title}    onChange={v => set('title', v)} />
            <Field label="כותרת משנית"    value={data.subtitle} onChange={v => set('subtitle', v)} />
            <Field label="פסקת תיאור"     value={data.body}     onChange={v => set('body', v)}     type="textarea" />
            <Field label="טקסט כפתור CTA" value={data.ctaText}  onChange={v => set('ctaText', v)} />
            <label className="se-label">אלמנטי אמון</label>
            {(data.trustItems || []).map((t, i) => (
              <div key={i} className="se-list-row">
                <input className="se-input" value={t} onChange={e => {
                  const arr = [...data.trustItems]; arr[i] = e.target.value
                  set('trustItems', arr)
                }} />
                <button className="se-del-row" onClick={() => set('trustItems', data.trustItems.filter((_,j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="se-add-row" onClick={() => set('trustItems', [...(data.trustItems||[]), '✓ '])}>+ הוסף</button>
          </>}

          {/* ── SERVICES ── */}
          {section.type === ST.SERVICES && <>
            <Field label="כותרת" value={data.title}    onChange={v => set('title', v)} />
            <Field label="תת-כותרת" value={data.subtitle} onChange={v => set('subtitle', v)} />
            <label className="se-label">שירותים</label>
            {(data.items || []).map((item, i) => (
              <div key={i} className="se-item-block">
                <div className="se-item-row">
                  <input className="se-input se-icon-input" value={item.icon}  onChange={e => setItem('items', i, 'icon', e.target.value)}  placeholder="אייקון" />
                  <input className="se-input"               value={item.title} onChange={e => setItem('items', i, 'title', e.target.value)} placeholder="שם השירות" style={{flex:1}} />
                  <button className="se-del-row" onClick={() => delItem('items', i)}>✕</button>
                </div>
                <input className="se-input" value={item.desc || ''} onChange={e => setItem('items', i, 'desc', e.target.value)} placeholder="תיאור קצר (לא חובה)" />
              </div>
            ))}
            <button className="se-add-row" onClick={() => addItem('items', { icon: '⚡', title: '', desc: '' })}>+ הוסף שירות</button>
          </>}

          {/* ── TESTIMONIALS ── */}
          {section.type === ST.TESTIMONIALS && <>
            <Field label="כותרת" value={data.title} onChange={v => set('title', v)} />
            <label className="se-label">המלצות</label>
            {(data.items || []).map((item, i) => (
              <div key={i} className="se-item-block">
                <div className="se-item-row">
                  <input className="se-input" value={item.name}  onChange={e => setItem('items', i, 'name', e.target.value)}  placeholder="שם" style={{flex:1}} />
                  <select className="se-select" value={item.stars} onChange={e => setItem('items', i, 'stars', Number(e.target.value))}>
                    {[5,4,3].map(n => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
                  </select>
                  <button className="se-del-row" onClick={() => delItem('items', i)}>✕</button>
                </div>
                <textarea className="se-textarea" value={item.text} onChange={e => setItem('items', i, 'text', e.target.value)} placeholder="טקסט ההמלצה" rows={2} />
              </div>
            ))}
            <button className="se-add-row" onClick={() => addItem('items', { name: '', text: '', stars: 5 })}>+ הוסף המלצה</button>
          </>}

          {/* ── FAQ ── */}
          {section.type === ST.FAQ && <>
            <Field label="כותרת" value={data.title} onChange={v => set('title', v)} />
            <label className="se-label">שאלות ותשובות</label>
            {(data.items || []).map((item, i) => (
              <div key={i} className="se-item-block">
                <div className="se-item-row">
                  <input className="se-input" value={item.q} onChange={e => setItem('items', i, 'q', e.target.value)} placeholder="שאלה" style={{flex:1}} />
                  <button className="se-del-row" onClick={() => delItem('items', i)}>✕</button>
                </div>
                <textarea className="se-textarea" value={item.a} onChange={e => setItem('items', i, 'a', e.target.value)} placeholder="תשובה" rows={2} />
              </div>
            ))}
            <button className="se-add-row" onClick={() => addItem('items', { q: '', a: '' })}>+ הוסף שאלה</button>
          </>}

          {/* ── CONTACT ── */}
          {section.type === ST.CONTACT && <>
            <Field label="כותרת"     value={data.title}    onChange={v => set('title', v)} />
            <Field label="תת-כותרת" value={data.subtitle} onChange={v => set('subtitle', v)} />
            <div className="se-toggles">
              <Toggle label="הצג טופס פנייה" checked={data.showForm}     onChange={v => set('showForm', v)} />
              <Toggle label="הצג טלפון"      checked={data.showPhone}    onChange={v => set('showPhone', v)} />
              <Toggle label="הצג וואטסאפ"   checked={data.showWhatsapp} onChange={v => set('showWhatsapp', v)} />
            </div>
          </>}

          {/* ── CTA ── */}
          {section.type === ST.CTA && <>
            <Field label="כותרת"        value={data.title}      onChange={v => set('title', v)} />
            <Field label="תת-כותרת"    value={data.subtitle}   onChange={v => set('subtitle', v)} />
            <Field label="טקסט כפתור"  value={data.buttonText} onChange={v => set('buttonText', v)} />
          </>}

          {/* ── FOOTER ── */}
          {section.type === ST.FOOTER && <>
            <Field label="טקסט קופירייט" value={data.copyright} onChange={v => set('copyright', v)} />
            <div className="se-toggles">
              <Toggle label="הצג לוגו"       checked={data.showLogo}  onChange={v => set('showLogo', v)} />
              <Toggle label="הצג טלפון"      checked={data.showPhone} onChange={v => set('showPhone', v)} />
              <Toggle label="הצג עיר"        checked={data.showCity}  onChange={v => set('showCity', v)} />
            </div>
          </>}

          {/* ── GALLERY ── */}
          {section.type === ST.GALLERY && <>
            <Field label="כותרת"    value={data.title}    onChange={v => set('title', v)} />
            <Field label="תת-כותרת" value={data.subtitle} onChange={v => set('subtitle', v)} />
            <label className="se-label">תמונות ({(data.images||[]).length}/6)</label>
            <div className="se-gallery-grid">
              {(data.images || []).map((img, i) => (
                <div key={i} className="se-gallery-thumb">
                  <img src={img.url} alt={img.name || ''} />
                  <button className="se-gallery-del" onClick={() => setData(d => ({ ...d, images: d.images.filter((_,j) => j !== i) }))}>✕</button>
                </div>
              ))}
              {(data.images||[]).length < 6 && (
                <ImageUpload
                  label="+ הוסף"
                  onUpload={img => setData(d => ({ ...d, images: [...(d.images||[]), img] }))}
                />
              )}
            </div>
          </>}
        </div>

        <div className="se-footer">
          <button className="se-save-btn" onClick={save}>💾 שמור שינויים</button>
          <button className="se-cancel-btn" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'input' }) {
  return (
    <div className="se-field">
      <label className="se-label">{label}</label>
      {type === 'textarea'
        ? <textarea className="se-textarea" value={value || ''} onChange={e => onChange(e.target.value)} rows={3} />
        : <input    className="se-input"    value={value || ''} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="se-toggle-row" onClick={() => onChange(!checked)}>
      <span className="se-toggle-label">{label}</span>
      <div className={`se-toggle-dot ${checked ? 'on' : ''}`}><div className="se-toggle-knob" /></div>
    </div>
  )
}

// ── SEO editor modal ──────────────────────────────────────────────
function SEOModal({ seo, onSave, onClose }) {
  const [data, setData] = useState({ ...seo })
  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  return (
    <div className="se-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="se-panel">
        <div className="se-header">
          <h2 className="se-title">🔍 הגדרות SEO</h2>
          <button className="se-close" onClick={onClose}>✕</button>
        </div>
        <div className="se-body">
          <Field label="כותרת הדף (title)"          value={data.title}       onChange={v => set('title', v)} />
          <Field label="תיאור מטא (description)"     value={data.description} onChange={v => set('description', v)} type="textarea" />
          <Field label="מילות מפתח (keywords)"       value={data.keywords}    onChange={v => set('keywords', v)} />
        </div>
        <div className="se-footer">
          <button className="se-save-btn" onClick={() => { onSave(data); onClose() }}>💾 שמור</button>
          <button className="se-cancel-btn" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  )
}

// ── Analytics stat row ────────────────────────────────────────────
function AnalyticsStat({ icon, label, value }) {
  return (
    <div className="builder-analytics-stat">
      <span className="builder-analytics-icon">{icon}</span>
      <span className="builder-analytics-label">{label}</span>
      <span className="builder-analytics-value">{value}</span>
    </div>
  )
}

// ── Publish modal ─────────────────────────────────────────────────
function PublishModal({ website, onPublish, onClose }) {
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const alreadyPublished = !!website.published
  const url = website.publicUrl || `${window.location.origin}/s/${website.slug}`

  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePublish = async () => {
    setPublishing(true)
    await onPublish()
    setPublishing(false)
  }

  return (
    <div className="se-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="se-panel" style={{ maxWidth: 420 }}>
        <div className="se-header">
          <h2 className="se-title">🚀 פרסום האתר</h2>
          <button className="se-close" onClick={onClose}>✕</button>
        </div>
        <div className="se-body" style={{ textAlign: 'center' }}>
          <div className="publish-header-icon" style={{ margin: '0 auto 16px' }}>🌐</div>
          {!alreadyPublished ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
                לחץ "פרסם" כדי שהאתר יהיה נגיש לכל דרך קישור ציבורי.
              </p>
              <button
                className="se-save-btn"
                style={{ width: '100%', fontSize: 16, padding: '14px', marginBottom: 12 }}
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? '...' : '🚀 פרסם עכשיו!'}
              </button>
            </>
          ) : (
            <>
              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>✅ האתר פורסם בהצלחה!</div>
              <div className="publish-url-box" style={{ marginBottom: 20 }}>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div className="publish-url-label">כתובת ציבורית</div>
                  <div className="publish-url-text">{url}</div>
                </div>
                <button className="publish-copy-btn" onClick={copy}>{copied ? '✅' : '📋 העתק'}</button>
              </div>
              <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 16, color: 'var(--gold)', fontSize: 13 }}>
                פתח באתר חדש ←
              </a>
            </>
          )}
          <div className="publish-stats" style={{ marginBottom: 16 }}>
            <div className="publish-stat"><div className="publish-stat-n">∞</div><div className="publish-stat-l">כניסות</div></div>
            <div className="publish-stat"><div className="publish-stat-n">SSL</div><div className="publish-stat-l">מאובטח</div></div>
            <div className="publish-stat"><div className="publish-stat-n">RTL</div><div className="publish-stat-l">עברית</div></div>
          </div>
          <p className="publish-note">Pro: דומיין מותאם + הסרת credit</p>
        </div>
      </div>
    </div>
  )
}

// ── Main BuilderPage ──────────────────────────────────────────────
export default function BuilderPage() {
  const navigate  = useNavigate()
  const { user, addWebsite, updateWebsiteCtx } = useAuth()

  const [website,       setWebsite]       = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [showSEO,       setShowSEO]       = useState(false)
  const [showPublish,   setShowPublish]   = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [mobileTab,     setMobileTab]     = useState('preview')
  const [sidebarTab,    setSidebarTab]    = useState('sections')
  const [regenningId,   setRegenningId]   = useState(null)
  const [leads,         setLeads]         = useState([])
  const [leadsLoading,  setLeadsLoading]  = useState(false)
  const [analytics,     setAnalytics]     = useState(null)
  const [showAIChat,    setShowAIChat]    = useState(false)

  // Load website: in-memory store (primary) → sessionStorage (fallback)
  useEffect(() => {
    const stored = getWebsiteStore()
    if (stored && typeof stored === 'object' && stored.sections) {
      setWebsite(stored)
      return
    }

    try {
      const raw = sessionStorage.getItem('bb_builder_website')
      if (raw && raw !== 'undefined' && raw !== 'null') {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
          sessionStorage.removeItem('bb_builder_website')
          setWebsite(parsed)
          return
        }
      }
    } catch {}

    try {
      const rawExisting = sessionStorage.getItem('bb_open_website')
      if (rawExisting && rawExisting !== 'undefined') {
        const parsed = JSON.parse(rawExisting)
        if (parsed && typeof parsed === 'object') {
          sessionStorage.removeItem('bb_open_website')
          setWebsite(parsed)
          return
        }
      }
    } catch {}

    setWebsite('empty')
  }, [])

  // Sync current website into AI memory for chat context
  useEffect(() => {
    if (website && website !== 'empty') setCurrentWebsite(website)
  }, [website])

  // Load leads when website.id becomes available
  useEffect(() => {
    if (!website || website === 'empty' || !website.id) return
    setLeadsLoading(true)
    loadLeads(website.id).then(data => { setLeads(data); setLeadsLoading(false) }).catch(() => setLeadsLoading(false))
  }, [website?.id])

  // Load analytics
  useEffect(() => {
    if (!website || website === 'empty' || !website.id) return
    getAnalytics(website.id).then(real => {
      const fake = getFakeAnalytics(website)
      setAnalytics({ ...fake, ...real })
    }).catch(() => setAnalytics(getFakeAnalytics(website)))
  }, [website?.id])

  // ── Website mutation helpers ────────────────────────────────────
  const updateSection = useCallback((id, newData) => {
    setWebsite(w => ({
      ...w,
      sections: w.sections.map(s => s.id === id ? { ...s, data: newData } : s),
    }))
  }, [])

  const moveSection = useCallback((id, dir) => {
    setWebsite(w => {
      const arr  = [...w.sections]
      const idx  = arr.findIndex(s => s.id === id)
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= arr.length) return w
      ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return { ...w, sections: arr }
    })
  }, [])

  const deleteSection = useCallback(id => {
    if (!window.confirm('למחוק את הסקשן?')) return
    setWebsite(w => ({ ...w, sections: w.sections.filter(s => s.id !== id) }))
  }, [])

  const toggleSection = useCallback(id => {
    setWebsite(w => ({
      ...w,
      sections: w.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s),
    }))
  }, [])

  const addNewSection = type => {
    const section = makeSection(type)
    setWebsite(w => ({ ...w, sections: [...w.sections, section] }))
  }

  const setTheme = (key, value) => {
    setWebsite(w => ({ ...w, theme: { ...w.theme, [key]: value } }))
  }

  const setSEO = seoData => {
    setWebsite(w => ({ ...w, seo: { ...w.seo, ...seoData } }))
  }

  const regenSection = useCallback(async section => {
    if (regenningId) return
    setRegenningId(section.id)
    try {
      const prompt = website._promptUsed || website.name || ''
      const parsed = parsePrompt(prompt)
      const newSec = await regenSingleSection(section.type, parsed)
      if (newSec) {
        updateSection(section.id, newSec.data)
        toast('הסקשן עודכן עם AI ✨')
      }
    } catch {}
    setRegenningId(null)
  }, [regenningId, website, updateSection])

  const handlePublish = useCallback(async () => {
    if (!website || website === 'empty') return
    try {
      const updated = await publishWebsite(website)
      if (website.id) await updateWebsiteCtx?.(updated)
      setWebsite(updated)
      toast('האתר פורסם! 🚀')
    } catch {
      toast('שגיאה בפרסום', 'error')
    }
  }, [website, updateWebsiteCtx])

  const saveWebsite = async () => {
    if (!website || website === 'empty') return
    setSaving(true)
    try {
      if (website.id) {
        await updateWebsiteCtx?.({ ...website, updatedAt: new Date().toISOString() })
      } else {
        const result = await addWebsite?.(website)
        if (result?.id) setWebsite(w => ({ ...w, id: result.id }))
      }
      setSaved(true)
      toast('האתר נשמר בהצלחה')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      toast('שגיאה בשמירת האתר', 'error')
    }
    setSaving(false)
  }

  if (website === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  if (website === 'empty') {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, background: 'var(--navy)', color: 'var(--gold)', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 64 }}>🏗️</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>אין אתר לעריכה</h2>
        <p style={{ color: 'var(--muted)', margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
          צור אתר חדש עם AI או חזור לדף הבית כדי לבנות אתר ידנית.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/ai')}
            style={{ background: 'var(--gold)', color: '#07111f', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            ✨ צור עם AI
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'transparent', color: 'var(--gold)', border: '1.5px solid var(--gold)', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            ← חזרה לדף הבית
          </button>
        </div>
      </div>
    )
  }

  const existingTypes = new Set(website.sections.map(s => s.type))
  const publicUrl = website.publicUrl || `${window.location.origin}/s/${website.slug}`

  return (
    <div className="builder-root" dir="rtl">
      {/* ── Top bar ── */}
      <header className="builder-bar">
        <div className="builder-bar-left">
          <button className="builder-back" onClick={() => navigate('/')}>← חזרה</button>
          <div className="builder-biz-name">
            <span className="builder-biz-icon">{BIZ_META[website.bizType]?.icon || '🏪'}</span>
            {website.name}
          </div>
          {website.published && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="builder-published-badge">🌐 פורסם</a>
          )}
        </div>
        <div className="builder-bar-right">
          <button className="builder-btn-ai" onClick={() => setShowAIChat(v => !v)} title="AI עוזר">🤖 AI</button>
          <button className="builder-btn-seo"     onClick={() => setShowSEO(true)}>🔍 SEO</button>
          <button className="builder-btn-publish"  onClick={() => setShowPublish(true)}>
            {website.published ? '✅ פורסם' : '🚀 פרסם'}
          </button>
          <button className={`builder-btn-save ${saving ? 'loading' : ''} ${saved ? 'saved' : ''}`} onClick={saveWebsite}>
            {saving ? '...' : saved ? '✅ נשמר' : '💾 שמור'}
          </button>
        </div>
      </header>

      {/* ── Mobile tabs ── */}
      <div className="builder-mobile-tabs">
        <button className={`builder-mtab ${mobileTab === 'manage'  ? 'active' : ''}`} onClick={() => setMobileTab('manage')}>⚙️ ניהול</button>
        <button className={`builder-mtab ${mobileTab === 'preview' ? 'active' : ''}`} onClick={() => setMobileTab('preview')}>👁️ תצוגה</button>
      </div>

      <div className="builder-body">
        {/* ── Left sidebar ── */}
        <aside className={`builder-sidebar ${mobileTab === 'manage' ? 'mobile-show' : 'mobile-hide'}`}>

          {/* Sidebar navigation tabs */}
          <div className="builder-sidebar-tabs">
            {[
              { key: 'sections',   label: '📋', title: 'סקשנים' },
              { key: 'design',     label: '🎨', title: 'עיצוב' },
              { key: 'leads',      label: '📊', title: `לידים${leads.length ? ` (${leads.length})` : ''}` },
              { key: 'analytics',  label: '📈', title: 'ניתוח' },
            ].map(t => (
              <button
                key={t.key}
                className={`builder-stab ${sidebarTab === t.key ? 'active' : ''}`}
                onClick={() => setSidebarTab(t.key)}
                title={t.title}
              >
                {t.label} <span className="builder-stab-label">{t.title}</span>
              </button>
            ))}
          </div>

          {/* ── Tab: Sections ── */}
          {sidebarTab === 'sections' && (
            <div className="builder-panel">
              <div className="builder-panel-title">📋 סקשנים</div>
              <div className="builder-sections-list">
                {website.sections.map((s, idx) => {
                  const meta = SECTION_META[s.type] || {}
                  return (
                    <div key={s.id} className={`builder-sec-item ${!s.visible ? 'builder-sec-hidden' : ''} ${regenningId === s.id ? 'builder-sec-regen' : ''}`}>
                      <span className="builder-sec-icon">{meta.icon}</span>
                      <span className="builder-sec-name">{meta.label}</span>
                      <div className="builder-sec-btns">
                        <button onClick={() => moveSection(s.id, 'up')}   disabled={idx === 0}                           title="העלה">↑</button>
                        <button onClick={() => moveSection(s.id, 'down')} disabled={idx >= website.sections.length - 1} title="הורד">↓</button>
                        <button onClick={() => toggleSection(s.id)}  title={s.visible ? 'הסתר' : 'הצג'}>{s.visible ? '🙈' : '👁️'}</button>
                        <button onClick={() => regenSection(s)} title="שפר עם AI" className="builder-regen-btn" disabled={!!regenningId}>✨</button>
                        <button onClick={() => setEditingSection(s)} title="ערוך" className="builder-edit-btn">✏️</button>
                        <button onClick={() => deleteSection(s.id)}  title="מחק"  className="builder-del-btn">🗑️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="builder-panel-title" style={{ marginTop: 16 }}>+ הוסף סקשן</div>
              <div className="builder-add-grid">
                {Object.entries(SECTION_META).map(([type, meta]) => (
                  <button key={type} className={`builder-add-btn ${existingTypes.has(type) ? 'exists' : ''}`} onClick={() => addNewSection(type)}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Design + SEO ── */}
          {sidebarTab === 'design' && <>
            <div className="builder-panel">
              <div className="builder-panel-title">🎨 ערכת נושא</div>
              <label className="builder-field-label">פלטת צבעים</label>
              <div className="builder-palette-grid">
                {Object.entries(PALETTES).map(([key, p]) => (
                  <button key={key} className={`builder-palette-btn ${website.theme?.palette === key ? 'active' : ''}`}
                    style={{ background: p.bg, borderColor: p.accent }} onClick={() => setTheme('palette', key)} title={p.label}>
                    <span style={{ color: p.accent, fontSize: 8, fontWeight: 800 }}>{p.label}</span>
                  </button>
                ))}
              </div>
              <label className="builder-field-label">פונט</label>
              <div className="builder-font-row">
                {Object.entries(FONTS).map(([key, f]) => (
                  <button key={key} className={`builder-font-btn ${website.theme?.font === key ? 'active' : ''}`} onClick={() => setTheme('font', key)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="builder-panel">
              <div className="builder-panel-title">🔍 SEO</div>
              <div className="builder-seo-summary">
                <div className="builder-seo-row"><span>כותרת:</span> <span>{website.seo?.title?.slice(0,28) || '—'}</span></div>
                <div className="builder-seo-row"><span>תיאור:</span> <span>{website.seo?.description?.slice(0,36) || '—'}</span></div>
              </div>
              <button className="builder-seo-btn" onClick={() => setShowSEO(true)}>✏️ ערוך SEO</button>
            </div>
          </>}

          {/* ── Tab: Leads ── */}
          {sidebarTab === 'leads' && (
            <div className="builder-panel builder-leads-panel">
              <div className="builder-leads-header">
                <div className="builder-panel-title">📊 לידים ({leads.length})</div>
                {leads.length > 0 && (
                  <button className="builder-leads-export" onClick={() => {
                    const csv = leadsToCSV(leads)
                    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}>⬇️ ייצא CSV</button>
                )}
              </div>
              {leadsLoading ? (
                <div className="builder-leads-loading">
                  <div className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 52, borderRadius: 8 }} />
                </div>
              ) : leads.length === 0 ? (
                <div className="builder-leads-empty">
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: .35 }}>📭</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>עדיין אין לידים.</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>לידים יופיעו כשמישהו ישלח טופס באתר.</div>
                </div>
              ) : (
                <div className="builder-leads-list">
                  {leads.map(lead => (
                    <div key={lead.id} className="builder-lead-row">
                      <div className="builder-lead-info">
                        <div className="builder-lead-name">{lead.name || '—'}</div>
                        <div className="builder-lead-meta">{lead.phone} {lead.message ? `· ${lead.message.slice(0,30)}` : ''}</div>
                        <div className="builder-lead-date">{lead.createdAt ? new Date(lead.createdAt?.seconds ? lead.createdAt.seconds*1000 : lead.createdAt).toLocaleDateString('he-IL') : ''}</div>
                      </div>
                      <button className="builder-lead-del" title="מחק" onClick={async () => {
                        await deleteLead(lead.id)
                        setLeads(prev => prev.filter(l => l.id !== lead.id))
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Analytics ── */}
          {sidebarTab === 'analytics' && (
            <div className="builder-panel">
              <div className="builder-panel-title">📈 אנליטיקה</div>
              {!analytics ? (
                <div>
                  {[80, 60, 70, 50].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10, marginBottom: 8, width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <div className="builder-analytics">
                  <AnalyticsStat icon="👁️" label="צפיות"       value={analytics.visits || 0} />
                  <AnalyticsStat icon="💬" label="WhatsApp"     value={analytics.waClicks || 0} />
                  <AnalyticsStat icon="📝" label="פניות"        value={leads.length || analytics.formSubmits || 0} />
                  <AnalyticsStat icon="🎯" label="המרה"         value={`${analytics.conversionRate || 0}%`} />
                  {website.published && (
                    <div className="builder-analytics-url">
                      <span>🔗</span>
                      <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl.replace('https://','')}</a>
                    </div>
                  )}
                  <div className="builder-analytics-note">* נתוני הדגמה – יתעדכנו לאחר פרסום</div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Preview pane ── */}
        <main className={`builder-preview-pane ${mobileTab === 'preview' ? 'mobile-show' : 'mobile-hide'}`}>
          <div className="builder-preview-scroll">
            <WebsitePreview
              website={website}
              editMode={true}
              regenningId={regenningId}
              onSectionEdit={setEditingSection}
              onSectionMove={moveSection}
              onSectionDelete={deleteSection}
              onSectionToggle={toggleSection}
              onSectionRegen={regenSection}
            />
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {editingSection && (
        <SectionEditor
          section={editingSection}
          onSave={data => updateSection(editingSection.id, data)}
          onClose={() => setEditingSection(null)}
        />
      )}
      {showSEO     && <SEOModal     seo={website.seo || {}} onSave={setSEO} onClose={() => setShowSEO(false)} />}
      {showPublish && <PublishModal website={website} onPublish={handlePublish} onClose={() => setShowPublish(false)} />}

      {/* ── AI Chat Sidebar ── */}
      {showAIChat && (
        <>
          <div className="ai-chat-backdrop" onClick={() => setShowAIChat(false)} />
          <AIChatSidebar
            website={website}
            onSectionUpdate={(id, data) => {
              updateSection(id, data)
              toast('AI עדכן סקשן ✨')
            }}
            onSEOUpdate={seoData => {
              setSEO(seoData)
              toast('SEO עודכן ✨')
            }}
            onClose={() => setShowAIChat(false)}
          />
        </>
      )}
    </div>
  )
}
