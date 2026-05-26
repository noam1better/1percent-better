import { useState } from 'react'
import { ST } from '../../engine/websiteSchema'
import { saveLead } from '../../services/leadsService'
import { recordWAClick, recordFormSubmit } from '../../services/analyticsService'

// ── Utility ───────────────────────────────────────────────────────
function ctaHref(action, contact) {
  if (action === 'phone'    && contact.phone)    return `tel:${contact.phone}`
  if (action === 'whatsapp' && contact.whatsapp) {
    const n = contact.whatsapp.replace(/\D/g,'').replace(/^0/,'972')
    return `https://wa.me/${n}`
  }
  return '#'
}

// ── Business-type image placeholder configs ───────────────────────
const BIZ_IMG_CFG = {
  flooring: {
    bg:      'linear-gradient(160deg,#2a0e05 0%,#5a2510 18%,#8b4a1a 35%,#c49a4a 52%,#9b7030 67%,#6b3a18 82%,#3a1508 100%)',
    accent:  '#c49a4a',
    icon:    '🪵',
    label:   'פרקט יוקרתי',
    pattern: 'lines',
    isLight: false,
  },
  lawyer: {
    bg:      'linear-gradient(160deg,#0c0c14 0%,#181824 38%,#22223a 68%,#181826 85%,#0c0c14 100%)',
    accent:  '#c0c8d4',
    icon:    '⚖️',
    label:   'ייצוג משפטי',
    pattern: 'ring',
    isLight: false,
  },
  accountant: {
    bg:      'linear-gradient(160deg,#050e1f 0%,#0a1830 38%,#132240 68%,#0a1828 100%)',
    accent:  '#3b82f6',
    icon:    '📊',
    label:   'ייעוץ כלכלי',
    pattern: 'ring',
    isLight: false,
  },
  gym: {
    bg:      'linear-gradient(160deg,#020210 0%,#050520 25%,#090030 50%,#040418 75%,#020210 100%)',
    accent:  '#3b82f6',
    icon:    '💪',
    label:   'כוח ועצמה',
    pattern: 'glow',
    isLight: false,
  },
  beauty: {
    bg:      'linear-gradient(135deg,#fdf0f8 0%,#fce4ef 28%,#f8d0e8 48%,#f0d4f5 68%,#f8ecff 85%,#fff0fb 100%)',
    accent:  '#e879a0',
    icon:    '✨',
    label:   'יופי ואלגנטיות',
    pattern: 'circles',
    isLight: true,
  },
  restaurant: {
    bg:      'linear-gradient(160deg,#1a0505 0%,#3d0f0a 22%,#6b2010 42%,#8b3820 58%,#6b2815 75%,#3a1208 88%,#1a0505 100%)',
    accent:  '#d4641a',
    icon:    '🍽️',
    label:   'חוויה קולינרית',
    pattern: 'warm-glow',
    isLight: false,
  },
  default: {
    bg:      'linear-gradient(160deg,#07111f 0%,#0c1c32 50%,#1b3a5e 100%)',
    accent:  '#d4af37',
    icon:    '🌟',
    label:   'מקצועי ואמין',
    pattern: 'ring',
    isLight: false,
  },
}

function BizImagePlaceholder({ bizType = 'default', style = {}, index = 0 }) {
  const c = BIZ_IMG_CFG[bizType] || BIZ_IMG_CFG.default
  const brightness = index > 0 ? 0.80 + (index % 4) * 0.11 : 1
  const iconOpacity = c.isLight ? 0.45 : 0.55

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', background: c.bg,
      filter: brightness !== 1 ? `brightness(${brightness})` : undefined,
      ...style,
    }}>
      {/* Wood-grain lines for flooring */}
      {c.pattern === 'lines' && Array.from({ length: 9 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${8 + i * 10}%`,
          height: `${1 + (i % 3) * 0.5}px`,
          background: `rgba(0,0,0,${0.07 + i * 0.012})`,
        }} />
      ))}
      {/* Diagonal plank lines overlay for flooring */}
      {c.pattern === 'lines' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(175deg,rgba(0,0,0,.04) 0px,rgba(0,0,0,.04) 1px,transparent 1px,transparent 60px)',
        }} />
      )}
      {/* Neon glow for gym */}
      {c.pattern === 'glow' && (<>
        <div style={{
          position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: '50%',
          background: `radial-gradient(ellipse,${c.accent}45 0%,transparent 70%)`,
          filter: 'blur(36px)',
        }} />
        <div style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
          width: '40%', height: '20%',
          background: `radial-gradient(ellipse,${c.accent}25 0%,transparent 70%)`,
          filter: 'blur(20px)',
        }} />
      </>)}
      {/* Warm glow for restaurant */}
      {c.pattern === 'warm-glow' && (
        <div style={{
          position: 'absolute', top: '15%', right: '20%',
          width: '55%', height: '55%',
          background: `radial-gradient(ellipse,${c.accent}40 0%,transparent 70%)`,
          filter: 'blur(30px)',
        }} />
      )}
      {/* Soft circles for beauty */}
      {c.pattern === 'circles' && (<>
        <div style={{
          position: 'absolute', top: '-25%', right: '-15%',
          width: '75%', height: '75%', borderRadius: '50%',
          background: `radial-gradient(circle,${c.accent}22 0%,transparent 70%)`,
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '55%', height: '55%', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(255,200,230,0.28) 0%,transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '40%',
          width: '30%', height: '30%', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(200,150,255,0.18) 0%,transparent 70%)',
        }} />
      </>)}
      {/* Subtle ring for lawyer/accountant/default */}
      {c.pattern === 'ring' && (
        <div style={{
          position: 'absolute', inset: '12%',
          borderRadius: '50%',
          border: `1px solid ${c.accent}18`,
          pointerEvents: 'none',
        }} />
      )}
      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10,
      }}>
        <span style={{
          fontSize: 'clamp(36px,6vw,68px)', lineHeight: 1,
          opacity: iconOpacity,
          filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.35))',
        }}>{c.icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: c.isLight ? `rgba(0,0,0,0.32)` : `rgba(255,255,255,0.38)`,
        }}>{c.label}</span>
      </div>
    </div>
  )
}

// ── SecLabel ──────────────────────────────────────────────────────
function SecLabel({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      fontSize: 12, fontWeight: 700, letterSpacing: '1.5px',
      textTransform: 'uppercase', color: 'var(--ws-accent)',
      marginBottom: 32, justifyContent: 'center',
    }}>
      <span style={{ flex: '0 0 40px', height: 1, background: 'linear-gradient(90deg,transparent,var(--ws-accent))' }} />
      {children}
      <span style={{ flex: '0 0 40px', height: 1, background: 'linear-gradient(90deg,var(--ws-accent),transparent)' }} />
    </div>
  )
}

// ── Hero layout routing ────────────────────────────────────────────
const BIZ_HERO_LAYOUT = {
  flooring:   'split',
  beauty:     'split',
  lawyer:     'split',
  accountant: 'split',
  gym:        'overlay',
  restaurant: 'overlay',
}

// ── Split hero (flooring, beauty, lawyer, accountant) ─────────────
function HeroSplit({ data, href, bizType }) {
  const cfg = BIZ_IMG_CFG[bizType] || BIZ_IMG_CFG.default
  const isLight = cfg.isLight

  return (
    <section className="ws-hero-split">
      {/* Text column — RTL-first = right side */}
      <div className="ws-hero-split-text">
        <div style={{ width: 40, height: 3, background: 'var(--ws-accent)', borderRadius: 100, marginBottom: 28 }} />
        {data.badge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'color-mix(in srgb,var(--ws-accent) 12%,transparent)',
            border: '1px solid color-mix(in srgb,var(--ws-accent) 28%,transparent)',
            borderRadius: 6, padding: '6px 14px',
            fontSize: 12, fontWeight: 700, color: 'var(--ws-accent)',
            letterSpacing: '.5px', marginBottom: 22, alignSelf: 'flex-start',
          }}>{data.badge}</div>
        )}
        <h1 style={{
          fontSize: 'clamp(26px,3.8vw,54px)', fontWeight: 900,
          lineHeight: 1.08, letterSpacing: '-1.5px',
          color: 'var(--ws-text)', marginBottom: 16,
          fontFamily: 'var(--ws-font)',
        }}>{data.title}</h1>
        {data.subtitle && (
          <div style={{
            fontSize: 'clamp(14px,1.5vw,19px)', color: 'var(--ws-accent)',
            fontWeight: 600, marginBottom: 14, opacity: .9,
          }}>{data.subtitle}</div>
        )}
        {data.body && (
          <p style={{
            fontSize: 'clamp(13px,1.2vw,16px)', color: 'var(--ws-sub)',
            lineHeight: 1.8, marginBottom: 32, maxWidth: 440,
          }}>{data.body}</p>
        )}
        {(data.ctaText || data.ctaText2) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignSelf: 'flex-start' }}>
            {data.ctaText && (
              <a href={href} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'linear-gradient(135deg,var(--ws-accent),color-mix(in srgb,var(--ws-accent) 75%,white))',
                color: isLight ? '#fff' : '#000',
                fontWeight: 800, fontSize: 15,
                padding: '14px 32px', borderRadius: 100, textDecoration: 'none',
                boxShadow: '0 0 28px color-mix(in srgb,var(--ws-accent) 32%,transparent)',
              }}>{data.ctaText}</a>
            )}
            {data.ctaText2 && (
              <a href={ctaHref(data.ctaAction2, contact)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.18)',
                color: 'var(--ws-text)',
                fontWeight: 700, fontSize: 14,
                padding: '14px 24px', borderRadius: 100, textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}>{data.ctaText2}</a>
            )}
          </div>
        )}
        {data.trustItems?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
            {data.trustItems.map((t, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: 'var(--ws-sub)',
              }}>
                <span style={{ color: 'var(--ws-accent)', fontWeight: 900 }}>✓</span>{t}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Image column — RTL-second = left side */}
      <div className="ws-hero-split-img">
        <BizImagePlaceholder bizType={bizType} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
        {/* Fade edge toward text column */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(90deg,transparent 55%,var(--ws-bg) 100%)',
        }} />
      </div>
    </section>
  )
}

// ── Overlay hero (gym, restaurant) ────────────────────────────────
function HeroOverlay({ data, href, bizType }) {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 80px', textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* Full-bleed background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <BizImagePlaceholder bizType={bizType} style={{ height: '100%', borderRadius: 0 }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,rgba(0,0,0,.65) 0%,rgba(0,0,0,.38) 45%,rgba(0,0,0,.72) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 55% at 50% -5%,color-mix(in srgb,var(--ws-accent) 22%,transparent) 0%,transparent 60%)',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 740, margin: '0 auto' }}>
        {data.badge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.20)',
            backdropFilter: 'blur(12px)',
            borderRadius: 100, padding: '7px 20px',
            fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.92)',
            marginBottom: 28, letterSpacing: '.4px',
          }}>{data.badge}</div>
        )}
        <h1 style={{
          fontSize: 'clamp(34px,6.5vw,78px)', fontWeight: 900,
          lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20,
          color: '#fff', fontFamily: 'var(--ws-font)',
          textShadow: '0 4px 40px rgba(0,0,0,.55)',
        }}>{data.title}</h1>
        {data.subtitle && (
          <div style={{
            fontSize: 'clamp(15px,2.2vw,22px)', fontWeight: 600,
            color: 'var(--ws-accent)', marginBottom: 16, opacity: .95,
          }}>{data.subtitle}</div>
        )}
        {data.body && (
          <p style={{
            fontSize: 'clamp(14px,1.7vw,18px)', color: 'rgba(255,255,255,.78)',
            lineHeight: 1.75, marginBottom: 40, maxWidth: 580, margin: '0 auto 40px',
          }}>{data.body}</p>
        )}
        {data.trustItems?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
            {data.trustItems.map((t, i) => (
              <span key={i} style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.16)',
                borderRadius: 100, padding: '5px 14px',
                fontSize: 13, color: 'rgba(255,255,255,.78)',
                backdropFilter: 'blur(8px)',
              }}>{t}</span>
            ))}
          </div>
        )}
        {data.ctaText && (
          <a href={href} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg,var(--ws-accent),color-mix(in srgb,var(--ws-accent) 72%,white))',
            color: '#000', fontWeight: 800, fontSize: 18,
            padding: '18px 50px', borderRadius: 100, textDecoration: 'none',
            boxShadow: '0 0 56px color-mix(in srgb,var(--ws-accent) 42%,transparent)',
            transition: 'transform .2s,box-shadow .2s',
          }}>{data.ctaText}</a>
        )}
      </div>
    </section>
  )
}

// ── Default mesh hero ─────────────────────────────────────────────
function HeroMesh({ data, href }) {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 80px', textAlign: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%,color-mix(in srgb,var(--ws-accent) 18%,transparent) 0%,transparent 60%), radial-gradient(ellipse 60% 50% at 80% 110%,color-mix(in srgb,var(--ws-accent) 8%,transparent) 0%,transparent 50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, opacity: 0.03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundSize: '200px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>
        {data.badge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'color-mix(in srgb,var(--ws-accent) 12%,rgba(255,255,255,.04))',
            border: '1px solid color-mix(in srgb,var(--ws-accent) 28%,transparent)',
            backdropFilter: 'blur(12px)',
            borderRadius: 100, padding: '7px 18px',
            fontSize: 13, fontWeight: 600, color: 'var(--ws-accent)',
            marginBottom: 28, letterSpacing: '.3px',
          }}>{data.badge}</div>
        )}
        <h1 style={{
          fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900,
          lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20,
          color: 'var(--ws-text)', fontFamily: 'var(--ws-font)',
        }}>{data.title}</h1>
        {data.subtitle && (
          <div style={{
            fontSize: 'clamp(16px,2.5vw,22px)', fontWeight: 500,
            color: 'var(--ws-accent)', marginBottom: 16, opacity: 0.9,
          }}>{data.subtitle}</div>
        )}
        {data.body && (
          <p style={{
            fontSize: 'clamp(15px,2vw,18px)', color: 'var(--ws-sub)',
            lineHeight: 1.75, marginBottom: 32, maxWidth: 600,
            margin: '0 auto 32px',
          }}>{data.body}</p>
        )}
        {data.trustItems?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
            {data.trustItems.map((t, i) => (
              <span key={i} style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 100, padding: '5px 14px',
                fontSize: 13, color: 'var(--ws-sub)', backdropFilter: 'blur(8px)',
              }}>{t}</span>
            ))}
          </div>
        )}
        {data.ctaText && (
          <a href={href} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg,var(--ws-accent),color-mix(in srgb,var(--ws-accent) 70%,white))',
            color: '#000', fontWeight: 800, fontSize: 17,
            padding: '16px 40px', borderRadius: 100, textDecoration: 'none',
            boxShadow: '0 0 40px color-mix(in srgb,var(--ws-accent) 30%,transparent)',
            transition: 'transform .2s,box-shadow .2s',
          }}>{data.ctaText}</a>
        )}
      </div>
    </section>
  )
}

// ── Hero dispatcher ───────────────────────────────────────────────
function HeroSection({ data, contact, website }) {
  const bizType = website?.bizType || 'default'
  const layout  = BIZ_HERO_LAYOUT[bizType] || 'mesh'
  const href    = ctaHref(data.ctaAction, contact)
  if (layout === 'split')   return <HeroSplit   data={data} href={href} bizType={bizType} />
  if (layout === 'overlay') return <HeroOverlay data={data} href={href} bizType={bizType} />
  return <HeroMesh data={data} href={href} />
}

// ═══════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════
function ServicesSection({ data }) {
  return (
    <section className="ws-section" style={{ padding: '80px 0' }}>
      <div className="ws-section-inner" style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <SecLabel>{data.title || 'השירותים שלנו'}</SecLabel>
        {data.subtitle && <p className="ws-section-sub" style={{ fontSize: 16, color: 'var(--ws-sub)', marginBottom: 40, textAlign: 'center' }}>{data.subtitle}</p>}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 20,
        }}>
          {(data.items || []).map((item, i) => (
            <div key={i} style={{
              background: 'color-mix(in srgb,var(--ws-card) 80%,rgba(255,255,255,.02))',
              border: '1px solid var(--ws-border)',
              borderRadius: 20, padding: '28px 22px',
              transition: 'transform .2s,border-color .2s,box-shadow .2s',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'color-mix(in srgb,var(--ws-accent) 40%,transparent)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--ws-border)'; e.currentTarget.style.boxShadow = '' }}
            >
              <span style={{ fontSize: 32, display: 'block', marginBottom: 14 }}>{item.icon}</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ws-text)', marginBottom: 6 }}>{item.title}</div>
              {item.desc && <div style={{ fontSize: 13, color: 'var(--ws-sub)', lineHeight: 1.6 }}>{item.desc}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// GALLERY — with business-type image placeholders
// ═══════════════════════════════════════════════════════════════════
function GallerySection({ data, website }) {
  const bizType = website?.bizType || 'default'
  return (
    <section className="ws-section">
      <div className="ws-section-inner">
        <SecLabel>{data.title || 'הגלריה שלנו'}</SecLabel>
        {data.subtitle && <p className="ws-section-sub">{data.subtitle}</p>}
        <div className="ws-gallery-grid">
          {data.images?.length
            ? data.images.map((img, i) => (
                <div key={i} className="ws-gallery-item">
                  <img src={img.url} alt={img.alt || ''} className="ws-gallery-img" />
                </div>
              ))
            : Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="ws-gallery-item" style={{ borderRadius: 12, overflow: 'hidden' }}>
                  <BizImagePlaceholder
                    bizType={bizType}
                    index={i}
                    style={{ width: '100%', height: '100%', borderRadius: 0 }}
                  />
                </div>
              ))
          }
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════════════
function TestimonialsSection({ data }) {
  return (
    <section className="ws-section ws-section-alt" style={{
      padding: '80px 0',
      background: 'linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--ws-card) 40%,transparent) 30%,color-mix(in srgb,var(--ws-card) 40%,transparent) 70%,transparent 100%)',
    }}>
      <div className="ws-section-inner" style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <SecLabel>{data.title || 'לקוחות ממליצים'}</SecLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          gap: 20, marginTop: 16,
        }}>
          {(data.items || []).map((r, i) => (
            <div key={i} style={{
              background: 'color-mix(in srgb,var(--ws-bg) 60%,rgba(255,255,255,.02))',
              border: '1px solid var(--ws-border)',
              borderRadius: 20, padding: '24px 22px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 16, right: 20,
                fontSize: 48, opacity: 0.06, color: 'var(--ws-accent)',
                fontFamily: 'Georgia,serif', lineHeight: 1,
              }}>"</div>
              <div style={{ fontSize: 13, marginBottom: 12, letterSpacing: 2 }}>{'⭐'.repeat(r.stars || 5)}</div>
              <p style={{ fontSize: 14.5, color: 'var(--ws-sub)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{r.text}"</p>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ws-text)' }}>{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════════
function FAQSection({ data }) {
  const [open, setOpen] = useState(null)
  return (
    <section className="ws-section">
      <div className="ws-section-inner">
        <SecLabel>{data.title || 'שאלות נפוצות'}</SecLabel>
        <div className="ws-faq-list">
          {(data.items || []).map((item, i) => (
            <div key={i} className={`ws-faq-item ${open === i ? 'open' : ''}`}>
              <button className="ws-faq-q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{item.q}</span>
                <span className="ws-faq-arrow">{open === i ? '▲' : '▼'}</span>
              </button>
              {open === i && <div className="ws-faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════════════
function ContactSection({ data, contact, website }) {
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('')
  const waNum = contact.whatsapp?.replace(/\D/g,'').replace(/^0/,'972')

  const handleSubmit = async e => {
    e.preventDefault()
    setSending(true)
    await saveLead({ websiteId: website?.id, websiteName: website?.name, name, phone, message })
    if (website?.id) recordFormSubmit(website.id)
    setSent(true)
    setSending(false)
  }

  return (
    <section className="ws-section ws-section-alt">
      <div className="ws-section-inner">
        <SecLabel>{data.title || 'יצירת קשר'}</SecLabel>
        {data.subtitle && <p className="ws-section-sub">{data.subtitle}</p>}
        <div className="ws-contact-wrap">
          {(data.showPhone || data.showWhatsapp) && (
            <div className="ws-contact-links">
              {data.showPhone && contact.phone && (
                <a className="ws-contact-link ws-contact-phone" href={`tel:${contact.phone}`}>
                  📞 {contact.phone}
                </a>
              )}
              {data.showWhatsapp && contact.whatsapp && (
                <a
                  className="ws-contact-link ws-contact-wa"
                  href={`https://wa.me/${waNum}`}
                  target="_blank" rel="noreferrer"
                  onClick={() => website?.id && recordWAClick(website.id)}
                >
                  💬 וואטסאפ
                </a>
              )}
            </div>
          )}
          {data.showForm && (
            <div className="ws-lead-form-wrap">
              {sent ? (
                <div className="ws-form-success">✅ קיבלנו את פרטיך! נחזור אליך בהקדם.</div>
              ) : (
                <form className="ws-lead-form" onSubmit={handleSubmit}>
                  <input type="text"  placeholder="שם מלא"         required className="ws-input" value={name}    onChange={e => setName(e.target.value)} />
                  <input type="tel"   placeholder="מספר טלפון"     required className="ws-input" value={phone}   onChange={e => setPhone(e.target.value)} />
                  <textarea          placeholder="הודעה (לא חובה)"          className="ws-textarea" value={message} onChange={e => setMessage(e.target.value)} rows={3} />
                  <button type="submit" className="ws-submit-btn" disabled={sending}>
                    {sending ? '...' : 'שלח פרטים ←'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════════════════════════
function CTASection({ data, contact }) {
  const href = ctaHref(data.buttonAction || 'phone', contact)
  return (
    <section style={{
      padding: '100px 24px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg,color-mix(in srgb,var(--ws-accent) 8%,transparent) 0%,transparent 50%,color-mix(in srgb,var(--ws-accent) 4%,transparent) 100%)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%,color-mix(in srgb,var(--ws-accent) 12%,transparent),transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900,
          color: 'var(--ws-text)', marginBottom: 14, letterSpacing: '-.5px',
        }}>{data.title}</h2>
        {data.subtitle && (
          <p style={{ fontSize: 17, color: 'var(--ws-sub)', marginBottom: 36 }}>{data.subtitle}</p>
        )}
        {data.buttonText && (
          <a href={href} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg,var(--ws-accent),color-mix(in srgb,var(--ws-accent) 70%,white))',
            color: '#000', fontWeight: 800, fontSize: 18,
            padding: '18px 48px', borderRadius: 100, textDecoration: 'none',
            boxShadow: '0 0 60px color-mix(in srgb,var(--ws-accent) 35%,transparent)',
            transition: 'transform .2s,box-shadow .2s',
          }}>{data.buttonText}</a>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════
function FooterSection({ data, contact, website }) {
  return (
    <footer style={{
      padding: '48px 24px 32px', textAlign: 'center',
      borderTop: '1px solid var(--ws-border)',
      background: 'color-mix(in srgb,var(--ws-bg) 95%,black)',
    }}>
      {data.showLogo && (
        <div style={{
          fontSize: 24, fontWeight: 900,
          color: 'var(--ws-accent)', marginBottom: 12, letterSpacing: '-.3px',
        }}>{website?.name || 'שם העסק'}</div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 20,
        fontSize: 13, color: 'var(--ws-sub)', marginBottom: 16,
      }}>
        {data.showCity  && contact.city  && <span>📍 {contact.city}</span>}
        {data.showPhone && contact.phone && <span>📞 {contact.phone}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ws-sub)', opacity: .5, marginBottom: 6 }}>{data.copyright}</div>
      <div style={{
        fontSize: 11, color: 'var(--ws-sub)', opacity: .3,
        letterSpacing: '.5px', textTransform: 'uppercase',
      }}>נוצר עם BusinessBuilder AI</div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════════════
// BEFORE / AFTER
// ═══════════════════════════════════════════════════════════════════
function BeforeAfterSection({ data, website }) {
  const bizType = website?.bizType || 'default'
  const items   = data.items || []

  const beforeBg = 'linear-gradient(160deg,#2a2a28 0%,#3e3e3a 35%,#565650 60%,#3a3a36 100%)'

  return (
    <section style={{ padding: '80px 0 100px', background: 'color-mix(in srgb,var(--ws-card) 60%,transparent)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <SecLabel>{data.title || 'לפני ואחרי'}</SecLabel>
        {data.subtitle && (
          <p style={{ textAlign: 'center', color: 'var(--ws-sub)', marginBottom: 44, fontSize: 15 }}>{data.subtitle}</p>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          gap: 16,
        }}>
          {items.map((item, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3' }}>
              {/* Before side */}
              <div style={{ position: 'absolute', inset: 0, right: '50%', background: beforeBg }}>
                {Array.from({ length: 7 }, (_, j) => (
                  <div key={j} style={{
                    position: 'absolute', left: 0, right: 0,
                    top: `${6 + j * 13}%`, height: `${1 + (j % 3) * 0.4}px`,
                    background: 'rgba(0,0,0,.2)',
                  }} />
                ))}
                <div style={{
                  position: 'absolute', bottom: 10, left: 0, right: 0,
                  display: 'flex', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 2,
                    textTransform: 'uppercase', color: 'rgba(255,255,255,.5)',
                    background: 'rgba(0,0,0,.4)', padding: '3px 10px', borderRadius: 20,
                  }}>{item.beforeLabel || 'לפני'}</span>
                </div>
              </div>

              {/* Center divider */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '50%',
                width: 3, background: '#fff', zIndex: 3,
                transform: 'translateX(-50%)',
                boxShadow: '0 0 12px rgba(0,0,0,.6)',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,.4)',
                }}>↔</div>
              </div>

              {/* After side */}
              <div style={{ position: 'absolute', inset: 0, left: '50%' }}>
                <BizImagePlaceholder bizType={bizType} index={i} style={{ height: '100%', width: '100%', borderRadius: 0 }} />
                <div style={{
                  position: 'absolute', bottom: 10, left: 0, right: 0,
                  display: 'flex', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 2,
                    textTransform: 'uppercase', color: 'rgba(255,255,255,.7)',
                    background: 'rgba(0,0,0,.5)', padding: '3px 10px', borderRadius: 20,
                    backdropFilter: 'blur(4px)',
                  }}>{item.afterLabel || 'אחרי'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// OFFER BANNER
// ═══════════════════════════════════════════════════════════════════
function OfferSection({ data, contact }) {
  const waNum  = contact.whatsapp?.replace(/\D/g,'').replace(/^0/,'972')
  const href   = data.ctaAction === 'whatsapp' && waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent('שלום, אני מעוניין בהצעת מחיר לפרקט')}`
    : ctaHref(data.ctaAction || 'phone', contact)

  return (
    <section style={{
      padding: '80px 24px',
      background: 'linear-gradient(135deg,color-mix(in srgb,var(--ws-accent) 9%,var(--ws-bg)) 0%,var(--ws-bg) 50%,color-mix(in srgb,var(--ws-accent) 5%,var(--ws-bg)) 100%)',
      borderTop: '1px solid var(--ws-border)',
      borderBottom: '1px solid var(--ws-border)',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 55% at 50% 50%,color-mix(in srgb,var(--ws-accent) 14%,transparent),transparent)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
        {data.icon && (
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{data.icon}</div>
        )}
        {data.badge && (
          <div style={{
            display: 'inline-flex', gap: 16, marginBottom: 24,
            padding: '8px 22px', borderRadius: 100,
            background: 'color-mix(in srgb,var(--ws-accent) 13%,transparent)',
            border: '1px solid color-mix(in srgb,var(--ws-accent) 32%,transparent)',
            fontSize: 13, color: 'var(--ws-accent)', fontWeight: 700, letterSpacing: '.3px',
          }}>{data.badge}</div>
        )}
        <h2 style={{
          fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900,
          color: 'var(--ws-text)', lineHeight: 1.1, marginBottom: 14,
          letterSpacing: '-0.5px',
        }}>{data.title}</h2>
        {data.subtitle && (
          <p style={{ fontSize: 17, color: 'var(--ws-sub)', marginBottom: 40, lineHeight: 1.6 }}>{data.subtitle}</p>
        )}
        {data.ctaText && (
          <a href={href} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#25d366',
            color: '#fff', fontWeight: 800, fontSize: 17,
            padding: '18px 44px', borderRadius: 100, textDecoration: 'none',
            boxShadow: '0 4px 40px rgba(37,211,102,.38)',
            transition: 'transform .2s,box-shadow .2s',
          }}>{data.ctaText}</a>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main dispatcher
// ═══════════════════════════════════════════════════════════════════
const RENDERERS = {
  [ST.HERO]:         HeroSection,
  [ST.SERVICES]:     ServicesSection,
  [ST.GALLERY]:      GallerySection,
  [ST.BEFORE_AFTER]: BeforeAfterSection,
  [ST.OFFER]:        OfferSection,
  [ST.TESTIMONIALS]: TestimonialsSection,
  [ST.FAQ]:          FAQSection,
  [ST.CONTACT]:      ContactSection,
  [ST.CTA]:          CTASection,
  [ST.FOOTER]:       FooterSection,
}

export default function SectionRenderer({ section, website }) {
  const Comp = RENDERERS[section.type]
  if (!Comp) return null
  return <Comp data={section.data} contact={website.contact || {}} website={website} />
}
