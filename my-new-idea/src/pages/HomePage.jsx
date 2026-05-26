import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'

const BUSINESS_TYPES = [
  { icon: '🪵', label: 'פרקט' },
  { icon: '🍽️', label: 'מסעדה' },
  { icon: '💅', label: 'יופי' },
  { icon: '⚖️', label: 'עו"ד' },
  { icon: '💪', label: 'כושר' },
  { icon: '📊', label: 'ראיית חשבון' },
  { icon: '🛍️', label: 'חנות' },
  { icon: '🚀', label: 'סטארטאפ' },
]

const FEATURES_LARGE = {
  icon: '🌐',
  badge: 'אתרים',
  title: 'אתר עסקי מותאם AI',
  desc: 'אתר פרמיום בעברית, מותאם לסוג העסק, הסגנון וצבעי המותג שלכם. מוכן לפרסום תוך דקות ללא שורת קוד אחת.',
  tags: ['RTL מלא', 'SEO מובנה', 'מהיר x10'],
}

const FEATURES_SMALL = [
  {
    icon: '📣',
    badge: 'שיווק',
    title: 'תוכן שיווקי אוטומטי',
    desc: 'פוסטים, מודעות ממומנות, קמפיין WhatsApp — AI מייצר הכל.',
  },
  {
    icon: '🤖',
    badge: 'AI',
    title: 'עוזר עסקי חכם',
    desc: 'תמחור, קמפיינים, תסריטי מכירה — מותאם לסוג העסק שלכם.',
  },
  {
    icon: '📈',
    badge: 'ניתוח',
    title: 'אנליטיקס בזמן אמת',
    desc: 'לוח בקרה עסקי שמראה כל מה שחשוב — פניות, המרות, מגמות.',
  },
  {
    icon: '💬',
    badge: 'תקשורת',
    title: 'CRM ותזכורות חכמות',
    desc: 'נהלו לקוחות, שלחו תזכורות אוטומטיות, בנו מערכת יחסים.',
  },
]

const TEMPLATES = [
  { icon: '🪵', label: 'פרקט', color: '#c4974a', bg: 'linear-gradient(135deg, #1a0a02, #2d1a05)' },
  { icon: '🍽️', label: 'מסעדה', color: '#ef4444', bg: 'linear-gradient(135deg, #1a0202, #2d0808)' },
  { icon: '💅', label: 'יופי', color: '#ec4899', bg: 'linear-gradient(135deg, #1a0210, #2d0520)' },
  { icon: '⚖️', label: 'עו"ד', color: '#3b82f6', bg: 'linear-gradient(135deg, #020a1a, #051a2d)' },
  { icon: '💪', label: 'כושר', color: '#22c55e', bg: 'linear-gradient(135deg, #021a08, #052d10)' },
  { icon: '📊', label: 'ראיית חשבון', color: '#f59e0b', bg: 'linear-gradient(135deg, #1a1002, #2d1c05)' },
  { icon: '🛍️', label: 'חנות', color: '#8b5cf6', bg: 'linear-gradient(135deg, #0a021a, #15052d)' },
  { icon: '🚀', label: 'סטארטאפ', color: '#06b6d4', bg: 'linear-gradient(135deg, #021318, #042025)' },
]

const STEPS = [
  { n: '01', title: 'ספרו על העסק', desc: 'שם, עיר, סוג עסק, שירותים — פחות מ-2 דקות למלא' },
  { n: '02', title: 'AI בונה הכל', desc: 'אתר, תוכן שיווקי ועוזר עסקי מותאמים לעסקכם' },
  { n: '03', title: 'פרסמו ותצמחו', desc: 'פרסמו, שלחו ללקוחות, קבלו פניות חדשות' },
]

const STATS = [
  { value: '500+', label: 'עסקים' },
  { value: '2 דק\'', label: 'להתחלה' },
  { value: '8+', label: 'תבניות' },
  { value: '24/7', label: 'AI' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const duplicatedTypes = [...BUSINESS_TYPES, ...BUSINESS_TYPES]

  return (
    <div className="lp-root">

      {/* ── Nav ── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <span className="lp-logo-diamond">◆</span>
            {' '}BusinessBuilder{' '}
            <span className="lp-logo-ai">AI</span>
          </a>
          <div className="lp-nav-links">
            <a href="/demo" className="lp-nav-link">דמו</a>
            <a href="/pricing" className="lp-nav-link">תמחיר</a>
          </div>
          <button className="lp-btn-nav" onClick={() => navigate('/onboarding')}>
            התחל חינם →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Background blobs */}
        <div className="lp-hero-blob lp-hero-blob--purple" />
        <div className="lp-hero-blob lp-hero-blob--indigo" />
        <div className="lp-hero-blob lp-hero-blob--pink" />
        <div className="lp-hero-grid-overlay" />

        <div className="lp-hero-inner">
          {/* Text column (right in RTL) */}
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              מנוע הצמיחה ה-AI לעסק שלכם
            </div>

            <h1 className="lp-h1">
              עסק דיגיטלי
              <br />
              <span className="lp-h1-gradient">מלא ומנוהל AI</span>
              <br />
              ב-2 דקות
            </h1>

            <p className="lp-hero-sub">
              AI מייצר לכם אתר פרמיום, תוכן שיווקי, קמפיין WhatsApp ועוזר עסקי חכם —
              הכל מותאם לעסק שלכם, בעברית, בלי קוד.
            </p>

            <div className="lp-hero-btns">
              <button className="lp-btn-hero" onClick={() => navigate('/onboarding')}>
                <span className="lp-btn-shimmer" />
                בנו את העסק שלכם עכשיו
              </button>
              <a href="/demo" className="lp-btn-ghost">▶ ראו דמו</a>
            </div>

            <div className="lp-hero-stats">
              {STATS.map((s, i) => (
                <div key={i} className="lp-hero-stat">
                  <span className="lp-hero-stat-value">{s.value}</span>
                  <span className="lp-hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual column (left in RTL = physically right) */}
          <div className="lp-hero-visual">
            <div className="lp-dashboard-card">
              {/* Card glow ring */}
              <div className="lp-dashboard-glow" />

              {/* Mini sidebar */}
              <div className="lp-dash-sidebar">
                <div className="lp-dash-logo-mark">◆</div>
                {['🏠', '📊', '🌐', '💬', '⚙️'].map((ic, i) => (
                  <div key={i} className={`lp-dash-sicon${i === 1 ? ' lp-dash-sicon--active' : ''}`}>
                    {ic}
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div className="lp-dash-main">
                <div className="lp-dash-topbar">
                  <span className="lp-dash-title">לוח בקרה</span>
                  <span className="lp-dash-badge">● Live</span>
                </div>

                {/* Stats row */}
                <div className="lp-dash-stats">
                  {[
                    { label: 'פניות היום', val: '24', up: true },
                    { label: 'המרה', val: '18%', up: true },
                    { label: 'הכנסה', val: '₪12k', up: false },
                  ].map((st, i) => (
                    <div key={i} className="lp-dash-stat-box">
                      <div className="lp-dash-stat-val">{st.val}</div>
                      <div className="lp-dash-stat-lbl">{st.label}</div>
                      <div className={`lp-dash-stat-trend${st.up ? ' lp-dash-stat-trend--up' : ' lp-dash-stat-trend--down'}`}>
                        {st.up ? '↑' : '→'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="lp-dash-chart-label">גרף פניות שבועי</div>
                <div className="lp-dash-chart">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="lp-dash-bar-wrap">
                      <div
                        className="lp-dash-bar"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>

                {/* Recent items */}
                <div className="lp-dash-recent-label">פניות אחרונות</div>
                {['דוד כהן – שאלה על מחירים', 'רחל לוי – בקשת הצעה'].map((item, i) => (
                  <div key={i} className="lp-dash-recent-row">
                    <span className="lp-dash-recent-dot" />
                    <span className="lp-dash-recent-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Business type ticker ── */}
      <div className="lp-ticker-wrap">
        <div className="lp-ticker-track">
          {duplicatedTypes.map((t, i) => (
            <div key={i} className="lp-ticker-item">
              <span className="lp-ticker-icon">{t.icon}</span>
              <span className="lp-ticker-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features bento ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-label">הכל בפלטפורמה אחת</div>
          <h2 className="lp-h2">מנוע הצמיחה לעסק שלכם</h2>

          <div className="lp-bento">
            {/* Large card */}
            <div className="lp-bento-large">
              <div className="lp-bento-top-line" />
              <div className="lp-bento-icon">{FEATURES_LARGE.icon}</div>
              <div className="lp-bento-badge">{FEATURES_LARGE.badge}</div>
              <h3 className="lp-bento-title">{FEATURES_LARGE.title}</h3>
              <p className="lp-bento-desc">{FEATURES_LARGE.desc}</p>
              <div className="lp-bento-tags">
                {FEATURES_LARGE.tags.map((tag, i) => (
                  <span key={i} className="lp-bento-tag">{tag}</span>
                ))}
              </div>
            </div>

            {/* Small cards grid */}
            <div className="lp-bento-small-grid">
              {FEATURES_SMALL.map((f, i) => (
                <div key={i} className="lp-bento-small">
                  <div className="lp-bento-icon lp-bento-icon--sm">{f.icon}</div>
                  <div className="lp-bento-badge">{f.badge}</div>
                  <h3 className="lp-bento-title lp-bento-title--sm">{f.title}</h3>
                  <p className="lp-bento-desc lp-bento-desc--sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Template gallery ── */}
      <section className="lp-section lp-section--no-pad-x">
        <div className="lp-container">
          <div className="lp-section-label">תבניות</div>
          <h2 className="lp-h2">8+ תבניות לכל סוג עסק</h2>
        </div>

        <div className="lp-templates-scroll">
          <div className="lp-templates-track">
            {TEMPLATES.map((t, i) => (
              <div key={i} className="lp-template-card">
                <div className="lp-template-preview" style={{ background: t.bg }}>
                  <span className="lp-template-icon">{t.icon}</span>
                  <div className="lp-template-lines">
                    <div className="lp-template-line" style={{ background: t.color, width: '60%' }} />
                    <div className="lp-template-line" style={{ width: '80%' }} />
                    <div className="lp-template-line" style={{ width: '50%' }} />
                  </div>
                </div>
                <div className="lp-template-name" style={{ color: t.color }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-container">
          <a href="/demo" className="lp-demo-link">צפו בדמו חי →</a>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-section--dark">
        <div className="lp-container">
          <div className="lp-section-label">איך זה עובד</div>
          <h2 className="lp-h2">3 צעדים. עסק דיגיטלי מלא.</h2>

          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-glow" />
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">מוכנים להתחיל לצמוח?</h2>
          <p className="lp-cta-sub">חינמי להתחלה · ללא כרטיס אשראי · מוכן תוך 2 דקות</p>
          <button className="lp-btn-hero" onClick={() => navigate('/onboarding')}>
            <span className="lp-btn-shimmer" />
            בנו את העסק שלכם עכשיו
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-logo">
            <span className="lp-logo-diamond">◆</span>
            {' '}BusinessBuilder{' '}
            <span className="lp-logo-ai">AI</span>
          </span>
          <div className="lp-footer-links">
            <a href="/pricing">תמחיר</a>
            <a href="/demo">דמו</a>
          </div>
          <span className="lp-footer-copy">© 2026 BusinessBuilder AI</span>
        </div>
      </footer>

    </div>
  )
}
