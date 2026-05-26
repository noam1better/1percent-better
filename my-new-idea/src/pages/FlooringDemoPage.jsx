import { useState, useEffect, useRef, useMemo } from 'react'
import './FlooringDemoPage.css'

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:      '#0b0702',
  surface: '#150e05',
  card:    '#1c1208',
  accent:  '#c4974a',
  gold:    '#e0b85a',
  text:    '#f0e8d8',
  sub:     '#98785a',
  muted:   '#5a4030',
  border:  '#382210',
  wa:      '#25d366',
}

// Module-level mutable vars — assigned by the main component before each render
// so every sub-component (closure) always reads the latest values
let _bizName   = 'בית הפרקט'
let _bizPhone  = '02-622-8800'
let _bizWaHref = ''
let _bizLogo   = null
let _bizHeroImg = null

// ── IntersectionObserver hook ─────────────────────────────────────
function useVisible(threshold = 0.1) {
  const ref  = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, vis]
}

// ── Fade-in wrapper ───────────────────────────────────────────────
function Fade({ children, delay = 0, className = '', style = {} }) {
  const [ref, vis] = useVisible()
  return (
    <div
      ref={ref}
      className={`fd-anim${vis ? ' fd-vis' : ''} ${className}`}
      style={{ animationDelay: `${delay}s`, ...style }}
    >{children}</div>
  )
}

// ── Animated button ───────────────────────────────────────────────
function Btn({ href, children, variant = 'gold', size = 'md' }) {
  const [hov, setHov] = useState(false)
  const sizes = { sm: { fontSize: 13, padding: '10px 22px' }, md: { fontSize: 15, padding: '15px 34px' }, lg: { fontSize: 18, padding: '19px 50px' } }
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    textDecoration: 'none', fontFamily: 'inherit',
    fontWeight: 800, borderRadius: 100,
    transition: 'all .22s', cursor: 'pointer', border: 'none',
    ...sizes[size],
  }
  const variants = {
    gold:  { background: `linear-gradient(135deg,${C.accent},${C.gold})`, color: '#1a0e04',
             boxShadow: hov ? '0 10px 36px rgba(196,151,74,.6)' : '0 4px 20px rgba(196,151,74,.35)',
             transform: hov ? 'translateY(-3px)' : 'none' },
    wa:    { background: hov ? '#20b858' : C.wa, color: '#fff',
             boxShadow: hov ? '0 10px 36px rgba(37,211,102,.6)' : '0 4px 20px rgba(37,211,102,.38)',
             transform: hov ? 'translateY(-3px)' : 'none' },
    ghost: { background: hov ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.06)',
             border: '1px solid rgba(255,255,255,.18)', color: C.text },
  }
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >{children}</a>
  )
}

// ── Section label ─────────────────────────────────────────────────
function SecLabel({ children }) {
  return (
    <div className="fd-seclabel">
      <span className="fd-seclabel-line" style={{ background: 'linear-gradient(90deg,transparent,#c4974a)' }} />
      <span className="fd-seclabel-text">{children}</span>
      <span className="fd-seclabel-line" style={{ background: 'linear-gradient(90deg,#c4974a,transparent)' }} />
    </div>
  )
}

// ── Wood-grain art ────────────────────────────────────────────────
function WoodPanel({ style = {}, glowX = '30%', glowY = '40%', children }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(155deg,#0e0601 0%,#2e1408 10%,#5e2e12 22%,#8e4a20 36%,#bc7230 50%,#9e5822 64%,#6a2e10 76%,#3a1808 88%,#150703 100%)',
      ...style,
    }}>
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${((i + 1) / 17) * 100}%`,
          height: `${0.8 + (i % 4) * 0.18}px`,
          background: `rgba(0,0,0,${0.11 + (i % 3) * 0.05})`,
        }} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(i + 1) * 13.8}%`, width: 1,
          background: 'rgba(0,0,0,0.09)',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(173deg,rgba(255,255,255,.016) 0px,rgba(255,255,255,.016) 1px,transparent 1px,transparent 44px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at ${glowX} ${glowY},rgba(200,130,40,.26) 0%,transparent 60%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 130% 130% at 50% 50%,transparent 38%,rgba(0,0,0,.58) 100%)',
      }} />
      {children}
    </div>
  )
}

// ── Old floor art ─────────────────────────────────────────────────
function OldFloorPanel({ style = {} }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(155deg,#242220 0%,#35332e 28%,#474540 55%,#38362f 78%,#22201c 100%)',
      ...style,
    }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${(i + 1) * 7.5}%`,
          height: `${1 + (i % 3) * 0.3}px`,
          background: `rgba(0,0,0,${0.2 + (i % 4) * 0.04})`,
        }} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(i + 1) * 16}%`, width: 1,
          background: 'rgba(0,0,0,0.15)',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 120% 120% at 50% 50%,transparent 40%,rgba(0,0,0,.45) 100%)',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────────

function Nav({ scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <nav className={`fd-nav${scrolled ? ' scrolled' : ''}`}>
      <a href="#top" className="fd-nav-logo">
        {_bizLogo
          ? <img src={_bizLogo} alt={_bizName} style={{ height: 34, maxWidth: 130, objectFit: 'contain', display: 'block' }} />
          : <>
              {_bizName.includes(' ')
                ? <><span>{_bizName.split(' ')[0]}</span><div className="fd-nav-logo-dot" /><span className="fd-nav-logo-accent">{_bizName.split(' ').slice(1).join(' ')}</span></>
                : _bizName
              }
            </>
        }
      </a>
      <div className="fd-nav-center">
        <a href="#services" className="fd-nav-link">שירותים</a>
        <a href="#gallery"  className="fd-nav-link">גלריה</a>
        <a href="#process"  className="fd-nav-link">תהליך</a>
        <a href="#reviews"  className="fd-nav-link">המלצות</a>
        <a href="#contact"  className="fd-nav-link">צרו קשר</a>
      </div>
      <div className="fd-nav-right">
        <a href={`tel:${_bizPhone}`} className="fd-nav-phone">{_bizPhone}</a>
        <Btn href={_bizWaHref} variant="wa" size="sm">📱 קבל הצעת מחיר</Btn>
        <button
          className={`fd-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
          aria-expanded={menuOpen}
        >{menuOpen ? '✕' : '☰'}</button>
      </div>

      {menuOpen && (
        <div className="fd-mobile-menu" role="menu">
          <a href="#services" className="fd-mobile-menu-link" onClick={close}>שירותים</a>
          <a href="#gallery"  className="fd-mobile-menu-link" onClick={close}>גלריה</a>
          <a href="#process"  className="fd-mobile-menu-link" onClick={close}>תהליך</a>
          <a href="#reviews"  className="fd-mobile-menu-link" onClick={close}>המלצות</a>
          <a href="#contact"  className="fd-mobile-menu-link" onClick={close}>צרו קשר</a>
          <a href={_bizWaHref} target="_blank" rel="noreferrer"
            className="fd-mobile-menu-wa" onClick={close}>📱 קבל הצעת מחיר</a>
        </div>
      )}
    </nav>
  )
}

function Hero() {
  return (
    <section className="fd-hero" id="top">
      <div className="fd-hero-text">
        <div className="fd-hero-eyebrow">
          <div className="fd-hero-eyebrow-dot" />
          🏆 פרקט מוביל ירושלים
        </div>
        <h1 className="fd-hero-h1">
          הרצפה שתשנה<br />
          <span className="fd-hero-h1-line2">את הבית שלכם</span>
        </h1>
        <div className="fd-hero-sub">פרקט יוקרה, ריצוף מקצועי, אחריות 10 שנה</div>
        <p className="fd-hero-body">
          15 שנות ניסיון, 500+ פרויקטים בירושלים. הנחת פרקט, ריצוף קרמיקה ופרסלן — הכל ממקום אחד, עם אחריות מלאה ועבודה נקייה.
        </p>
        <div className="fd-hero-btns">
          <Btn href={_bizWaHref} variant="wa" size="md">📱 קבל הצעת מחיר תוך 24 שעות</Btn>
          <Btn href={`tel:${_bizPhone}`} variant="ghost" size="md">📞 {_bizPhone}</Btn>
        </div>
        <div className="fd-hero-trust">
          <div className="fd-trust-pill"><span className="fd-trust-pill-check">✓</span>אחריות 10 שנה</div>
          <div className="fd-trust-pill"><span className="fd-trust-pill-check">✓</span>הצעת מחיר חינם</div>
          <div className="fd-trust-pill"><span className="fd-trust-pill-check">✓</span>ירושלים והסביבה</div>
          <div className="fd-trust-pill"><span className="fd-trust-pill-check">✓</span>עבודה נקייה</div>
        </div>
      </div>

      <div className="fd-hero-visual">
        {_bizHeroImg
          ? <>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${_bizHeroImg})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
              {/* warm brand overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg,rgba(11,7,2,.45) 0%,rgba(196,151,74,.1) 100%)',
              }} />
            </>
          : <WoodPanel glowX="35%" glowY="45%" style={{ position: 'absolute', inset: 0 }} />
        }
        <div className="fd-hero-visual-fade" />
        <div className="fd-hero-visual-bottom-fade" />
        <div className="fd-hero-cards">
          <div className="fd-hero-card">
            <div className="fd-hero-card-num">500+</div>
            <div className="fd-hero-card-lbl">פרויקטים הושלמו</div>
          </div>
          <div className="fd-hero-card">
            <div className="fd-hero-card-num">10 שנה</div>
            <div className="fd-hero-card-lbl">אחריות מלאה</div>
          </div>
        </div>
        <div className="fd-scroll-cue">
          <div className="fd-scroll-cue-line" />
          <div className="fd-scroll-cue-dot" />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { n: '15+',  l: 'שנות ניסיון'         },
    { n: '500+', l: 'פרויקטים מוצלחים'   },
    { n: '10',   l: 'שנות אחריות'          },
    { n: '100%', l: 'שביעות רצון לקוחות' },
  ]
  return (
    <div className="fd-stats">
      {stats.map((s, i) => (
        <Fade key={i} delay={i * 0.07} className="fd-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="fd-stat-n">{s.n}</div>
          <div className="fd-stat-l">{s.l}</div>
        </Fade>
      ))}
    </div>
  )
}

function Services() {
  const cards = [
    { icon: '🪵', num: '01', title: 'פרקט עץ מלא',
      desc: 'אלון, אגוז ובוק — עץ אמיתי, עמיד לשנים. ניתן לליטוש וצביעה חוזרת. האלגנטיות הכי אותנטית לכל בית.' },
    { icon: '🏠', num: '02', title: 'פרקט מהנדס',
      desc: 'שכבות עץ אמיתי משולבות לעמידות מקסימלית. מתאים לחימום תת-רצפתי ולשינויי לחות. היציב ביותר בשוק.' },
    { icon: '✨', num: '03', title: 'ריצוף פרסלן',
      desc: 'יבוא ישיר מאיטליה וספרד. מגוון עצום של מידות, גוונים ומרקמים. התקנה מקצועית עם אחריות מלאה.' },
  ]
  return (
    <section className="fd-services" id="services">
      <div className="fd-services-inner">
        <Fade><SecLabel>מה אנחנו מציעים</SecLabel></Fade>
        <Fade delay={0.08}>
          <div className="fd-sec-head"><h2>שירותים מקצועיים</h2><p>כל מה שהרצפה שלכם צריכה, תחת קורת גג אחת</p></div>
        </Fade>
        <div className="fd-services-grid">
          {cards.map((c, i) => (
            <Fade key={i} delay={i * 0.12} className="fd-service-card">
              <div className="fd-service-num">{c.num}</div>
              <div className="fd-service-icon">{c.icon}</div>
              <div className="fd-service-title">{c.title}</div>
              <div className="fd-service-desc">{c.desc}</div>
              <a href={_bizWaHref} target="_blank" rel="noreferrer" className="fd-service-link">גלה עוד</a>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  )
}

function BeforeAfter() {
  const pairs = [
    { beforeTitle: 'ריצוף ישן',  afterTitle: 'פרקט עץ מלא'   },
    { beforeTitle: 'לינוליאום',  afterTitle: 'פרקט מהנדס'    },
    { beforeTitle: 'שיש מיושן',  afterTitle: 'פרסלן יוקרתי' },
    { beforeTitle: 'בטון גלוי',  afterTitle: 'פרקט צף'       },
  ]
  return (
    <section className="fd-ba" id="gallery">
      <div className="fd-ba-inner">
        <Fade><SecLabel>תוצאות אמיתיות</SecLabel></Fade>
        <Fade delay={0.08}>
          <div className="fd-sec-head"><h2>לפני ואחרי</h2><p>ראו בעצמכם את ההפרש המדהים שפרקט יוקרה עושה לכל חדר</p></div>
        </Fade>
        <div className="fd-ba-grid">
          {pairs.map((p, i) => (
            <Fade key={i} delay={i * 0.08} className="fd-ba-item">
              <span className="fd-ba-item-tag before-tag">{p.beforeTitle}</span>
              <span className="fd-ba-item-tag after-tag">{p.afterTitle}</span>
              <OldFloorPanel style={{ position: 'absolute', inset: 0, right: '50%' }} />
              <WoodPanel glowX={i % 2 === 0 ? '40%' : '60%'} glowY="50%"
                style={{ position: 'absolute', inset: 0, left: '50%' }} />
              <div className="fd-ba-divider"><div className="fd-ba-handle">⟺</div></div>
              <div className="fd-ba-bottom-label">
                <span className="fd-ba-lbl">{p.afterTitle}</span>
                <span className="fd-ba-lbl">{p.beforeTitle}</span>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  )
}

function Process() {
  const steps = [
    { n: '01', title: 'הצעת מחיר חינמית',
      desc: 'מגיעים אליכם הביתה, מודדים ומציעים הצעה מפורטת תוך 24 שעות — ללא עלות.' },
    { n: '02', title: 'בחירת חומרים',
      desc: 'מגוון רחב של פרקטים, ריצוף ואביזרים. מסייעים לכם לבחור את המתאים ביותר לסגנון ולתקציב.' },
    { n: '03', title: 'התקנה מקצועית',
      desc: 'צוות מנוסה, עבודה נקייה ומסודרת. מסיימים בזמן שסוכם עם ניקוי מלא בסיום.' },
  ]
  return (
    <section className="fd-process" id="process">
      <div className="fd-process-inner">
        <Fade><SecLabel>איך זה עובד</SecLabel></Fade>
        <Fade delay={0.08}>
          <div className="fd-sec-head"><h2>3 צעדים פשוטים</h2><p>מהיצירת קשר הראשונה עד לרצפה המושלמת — אנחנו לצדכם בכל שלב</p></div>
        </Fade>
        <div className="fd-process-grid">
          {steps.map((s, i) => (
            <Fade key={i} delay={i * 0.14} className="fd-process-step">
              <div className="fd-process-num-wrap">
                <div className="fd-process-num-ring" />
                <div className="fd-process-num">{s.n}</div>
              </div>
              <div className="fd-process-title">{s.title}</div>
              <div className="fd-process-desc">{s.desc}</div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  )
}

function Reviews() {
  const reviews = [
    { name: 'משפחת כהן',    loc: 'רחביה, ירושלים',  stars: 5,
      text: 'הנחת פרקט בכל הדירה — עבודה נקייה, מדויקת ומרהיבה. הצוות היה מקצועי ונעים, והתוצאה פשוט מדהימה. לא האמנו שיכול להיות כל כך יפה!' },
    { name: 'שרה ומשה לוי', loc: 'קטמון, ירושלים',  stars: 5,
      text: 'מ-יצירת קשר הראשונה ועד לסיום העבודה — שירות מהמם. המחיר הוגן, הזמן שסוכם נשמר בדיוק, והתוצאה מושלמת. ממליצים בחום!' },
    { name: 'דוד אברמוב',   loc: 'גילה, ירושלים',   stars: 5,
      text: 'החלפנו פרקט ישן בפרקט עץ מלא של אלון. ההבדל פשוט מדהים — הדירה נראית אחרת לגמרי. מקצועיים, נקיים ואמינים. ממליץ ללא היסוס!' },
  ]
  return (
    <section className="fd-reviews" id="reviews">
      <div className="fd-reviews-inner">
        <Fade><SecLabel>לקוחות מרוצים</SecLabel></Fade>
        <Fade delay={0.08}>
          <div className="fd-sec-head"><h2>מה אומרים עלינו</h2><p>500+ לקוחות מרוצים בירושלים מדברים בעד עצמם</p></div>
        </Fade>
        <div className="fd-reviews-grid">
          {reviews.map((r, i) => (
            <Fade key={i} delay={i * 0.12} className="fd-review-card">
              <div className="fd-review-avatar">{r.name[0]}</div>
              <div className="fd-review-stars">
                {Array.from({ length: r.stars }, (_, si) => <div key={si} className="fd-review-star" />)}
              </div>
              <p className="fd-review-text">&ldquo;{r.text}&rdquo;</p>
              <div className="fd-review-sep" />
              <div className="fd-review-name">{r.name}</div>
              <div className="fd-review-loc">{r.loc}</div>
              <div className="fd-review-source">Google Reviews ★</div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactForm() {
  const [form,  setForm]  = useState({ name: '', phone: '', msg: '' })
  const [sent,  setSent]  = useState(false)

  const field = (id, placeholder, type = 'text', multiline = false) => {
    const Tag = multiline ? 'textarea' : 'input'
    return (
      <Tag key={id} type={type} placeholder={placeholder} value={form[id]}
        rows={multiline ? 4 : undefined}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="fd-input"
        style={{ resize: multiline ? 'vertical' : undefined }}
      />
    )
  }

  if (sent) return (
    <div className="fd-form-success">
      <div className="fd-form-success-icon">✅</div>
      <div className="fd-form-success-title">קיבלנו את פרטיך!</div>
      <div className="fd-form-success-sub">ניצור איתך קשר תוך 24 שעות עם הצעת מחיר מפורטת.</div>
    </div>
  )

  const handleSubmit = e => {
    e.preventDefault()
    if (form.name && form.phone) setSent(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      {field('name',  'שם מלא *')}
      {field('phone', 'מספר טלפון *', 'tel')}
      {field('msg',   'מה תרצה לשדרג? (לא חובה)', 'text', true)}
      <button type="submit" className="fd-submit-btn"
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(196,151,74,.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(196,151,74,.4)' }}
      >שלח פרטים ←</button>
      <div className="fd-form-note">🔒 פרטיות מלאה — לא מעבירים לצד שלישי</div>
    </form>
  )
}

function ContactSection() {
  const info = [
    { icon: '📞', label: 'טלפון',       val: _bizPhone,          href: `tel:${_bizPhone}` },
    { icon: '💬', label: 'WhatsApp',     val: 'שלח הודעה',        href: _bizWaHref        },
    { icon: '📍', label: 'אזור פעילות', val: 'ירושלים והסביבה',  href: null               },
    { icon: '🕘', label: 'שעות פעילות', val: 'א׳–ה׳ 9–18, ו׳ 9–13', href: null            },
  ]
  return (
    <section className="fd-contact" id="contact">
      <div className="fd-contact-inner">
        <Fade><SecLabel>צרו קשר</SecLabel></Fade>
        <Fade delay={0.08}>
          <div className="fd-sec-head"><h2>נשמח לשמוע מכם</h2><p>השאירו פרטים וניצור איתך קשר תוך 24 שעות עם הצעת מחיר מפורטת</p></div>
        </Fade>
        <div className="fd-contact-grid">
          <Fade>
            <div className="fd-contact-info-cards">
              {info.map((it, i) => (
                <a key={i} href={it.href || undefined}
                  target={it.href?.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className={`fd-contact-card${it.href ? ' clickable' : ''}`}
                >
                  <div className="fd-contact-card-icon">{it.icon}</div>
                  <div>
                    <div className="fd-contact-card-label">{it.label}</div>
                    <div className="fd-contact-card-val">{it.val}</div>
                  </div>
                </a>
              ))}
            </div>
          </Fade>
          <Fade delay={0.12}>
            <div className="fd-form-card">
              <div className="fd-form-title">השאר פרטים — ונחזור תוך 24 שעות</div>
              <div className="fd-form-sub">ללא עלות, ללא התחייבות</div>
              <ContactForm />
            </div>
          </Fade>
        </div>
      </div>
    </section>
  )
}

function CTABanner() {
  return (
    <section className="fd-cta">
      <div className="fd-cta-bg" />
      <div className="fd-cta-glow" />
      <div className="fd-cta-inner">
        <Fade><div className="fd-cta-eyebrow">מוכנים להתחיל?</div></Fade>
        <Fade delay={0.08}><h2>קבלו הצעת מחיר<br />תוך 24 שעות</h2></Fade>
        <Fade delay={0.16}><p>שלחו לנו תמונה של החדר ב-WhatsApp ותקבלו הצעה מפורטת ומהירה — ללא עלות, ללא התחייבות.</p></Fade>
        <Fade delay={0.24}>
          <div className="fd-cta-btns">
            <Btn href={_bizWaHref} variant="wa" size="lg">📱 שלח תמונה ב-WhatsApp</Btn>
            <Btn href={`tel:${_bizPhone}`} variant="ghost" size="lg">📞 {_bizPhone}</Btn>
          </div>
        </Fade>
        <Fade delay={0.32}>
          <div className="fd-cta-bullets">
            {['ללא עלות', 'ללא התחייבות', 'תוך 24 שעות', 'ירושלים והסביבה'].map((t, i) => (
              <span key={i} className="fd-cta-bullet">{t}</span>
            ))}
          </div>
        </Fade>
      </div>
    </section>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="fd-footer">
      <div className="fd-footer-top">
        <div>
          <div className="fd-footer-logo">
            {_bizLogo
              ? <img src={_bizLogo} alt={_bizName} loading="lazy" style={{ height: 36, maxWidth: 160, objectFit: 'contain' }} />
              : <>{_bizName.split(' ')[0]} <span>{_bizName.split(' ').slice(1).join(' ')}</span></>
            }
          </div>
          <p className="fd-footer-tagline">
            פרקט ורצפות יוקרה בירושלים והסביבה. 15 שנות ניסיון, 500+ פרויקטים, אחריות 10 שנה.
          </p>
        </div>
        <div>
          <div className="fd-footer-col-title">שירותים</div>
          {['פרקט עץ מלא', 'פרקט מהנדס', 'ריצוף פרסלן', 'ריצוף קרמיקה', 'ליטוש פרקט'].map((t, i) => (
            <a key={i} href="#services" className="fd-footer-col-item">{t}</a>
          ))}
        </div>
        <div>
          <div className="fd-footer-col-title">צרו קשר</div>
          <a href="#contact" className="fd-footer-col-item">📍 ירושלים והסביבה</a>
          <a href={`tel:${_bizPhone}`} className="fd-footer-col-item">📞 {_bizPhone}</a>
          <a href="#contact" className="fd-footer-col-item">🕘 א׳–ה׳  9:00–18:00</a>
          <a href="#contact" className="fd-footer-col-item">🕗 ו׳  9:00–13:00</a>
          <div style={{ marginTop: 20 }}>
            <Btn href={_bizWaHref} variant="wa" size="sm">💬 WhatsApp</Btn>
          </div>
        </div>
      </div>
      <div className="fd-footer-bottom">
        <span>© {year} {_bizName} · כל הזכויות שמורות</span>
        <span>עוצב עם BusinessBuilder AI ✦</span>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function FlooringDemoPage({ custom: customProp }) {
  const [scrolled, setScrolled] = useState(false)
  const [showTop,  setShowTop]  = useState(false)

  // Resolve custom data: prop takes priority, then localStorage
  const custom = useMemo(() => {
    if (customProp && Object.keys(customProp).length > 0) return customProp
    try { return JSON.parse(localStorage.getItem('demo_custom') || '{}') }
    catch { return {} }
  }, [customProp])

  // Assign module-level vars before render so all sub-components see latest values
  _bizName    = custom.name    || 'בית הפרקט'
  _bizPhone   = custom.phone   || '02-622-8800'
  const _waNum = (custom.waNum || (import.meta.env.VITE_CONTACT_WHATSAPP || '')).replace(/\D/g, '')
  _bizWaHref  = _waNum ? `https://wa.me/${_waNum}?text=${encodeURIComponent('שלום! ראיתי את האתר שלכם ואשמח לקבל הצעת מחיר לפרקט.')}` : '#'
  _bizLogo    = custom.logo    || null
  _bizHeroImg = custom.heroImg || null

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      setShowTop(y > 300)
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="fd-root">
      <Nav scrolled={scrolled} />
      <Hero />
      <Stats />
      <Services />
      <BeforeAfter />
      <Process />
      <Reviews />
      <ContactSection />
      <CTABanner />
      <Footer />

      <div className="fd-wa-wrap">
        <a href={_bizWaHref} target="_blank" rel="noreferrer"
          className="fd-wa-btn" title="שלח הודעה ב-WhatsApp" aria-label="שלח הודעה ב-WhatsApp">💬</a>
        <span className="fd-wa-label">קבל הצעת מחיר</span>
      </div>
      {showTop && (
        <button className="fd-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="חזרה למעלה">↑</button>
      )}
    </div>
  )
}
