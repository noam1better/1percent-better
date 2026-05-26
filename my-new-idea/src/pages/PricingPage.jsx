import { useEffect, useRef, useState } from 'react'
import './PricingPage.css'

function useVisible(threshold = 0.15) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, vis]
}

function Fade({ children, delay = 0, className = '' }) {
  const [ref, vis] = useVisible()
  return (
    <div ref={ref} className={`pp-animate ${vis ? 'visible' : ''} ${className}`}
      style={vis ? { animationDelay: `${delay}s` } : {}}>
      {children}
    </div>
  )
}

const FEATURES = [
  { icon: '🌐', title: 'דף נחיתה מקצועי', desc: 'AI בונה לך אתר מלא תוך 60 שניות — עיצוב, תמונות, טקסטים. הכל.' },
  { icon: '💬', title: 'משפך לידים בוואטסאפ', desc: 'כפתור וואטסאפ צף שמוביל ישירות לשיחה. הלידים מגיעים אליך, לא לטופס שאף אחד לא בודק.' },
  { icon: '📋', title: 'טופס לידים חכם', desc: 'טופס מובנה עם שדות רלוונטיים לעסק שלך. כל פנייה נשמרת ונשלחת אליך מיידית.' },
  { icon: '📲', title: 'פוסטים לרשתות חברתיות', desc: '5 פוסטים מוכנים לאינסטגרם ולפייסבוק — עם טקסט, hashtags, ותיאור שמוכר.' },
  { icon: '🎯', title: 'טקסטים לפרסומות', desc: 'קופי מוכן לפרסום ממומן בגוגל ובפייסבוק. לא צריך סוכנות פרסום.' },
  { icon: '🔄', title: 'הודעות מעקב אוטומטיות', desc: 'רצף הודעות שמחמם לידים שלא ענו. כי 80% מהמכירות קורות אחרי 5 נקודות מגע.' },
  { icon: '🔗', title: 'לינק מוכן לפרסום', desc: 'לינק אחד שאפשר לשלוח בוואטסאפ, לשים בביו, ולשתף בכל מקום. בלי דומיין, בלי הוסטינג.' },
]

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'להתחיל לקבל לידים מחר',
    amount: '199',
    period: 'לחודש',
    setup: null,
    features: [
      { text: 'דף נחיתה מקצועי (AI)', included: true },
      { text: 'טופס לידים מובנה', included: true },
      { text: 'לינק מוכן לפרסום', included: true },
      { text: 'עדכונים ללא הגבלה', included: true },
      { text: 'משפך וואטסאפ', included: false },
      { text: 'פוסטים לרשתות חברתיות', included: false },
      { text: 'טקסטים לפרסומות', included: false },
      { text: 'הודעות מעקב אוטומטיות', included: false },
    ],
    btn: 'outline',
    btnLabel: 'התחל עכשיו',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'לעסקים שרוצים לצמוח',
    amount: '399',
    period: 'לחודש',
    setup: null,
    featured: true,
    badge: 'הכי פופולרי',
    features: [
      { text: 'דף נחיתה מקצועי (AI)', included: true },
      { text: 'טופס לידים מובנה', included: true },
      { text: 'לינק מוכן לפרסום', included: true },
      { text: 'משפך וואטסאפ', included: true },
      { text: 'פוסטים לרשתות חברתיות (5/חודש)', included: true },
      { text: 'טקסטים לפרסומות', included: true },
      { text: 'הודעות מעקב אוטומטיות', included: true },
      { text: 'תמיכה עדיפות', included: true },
    ],
    btn: 'primary',
    btnLabel: 'בחר Pro',
  },
  {
    id: 'dfy',
    name: 'Done For You',
    tagline: 'אנחנו עושים הכל בשבילך',
    amount: '799',
    period: 'לחודש',
    setup: '+ ₪1,500 הקמה חד-פעמית',
    features: [
      { text: 'כל מה שיש ב-Pro', included: true },
      { text: 'הקמה מלאה ע"י צוות מומחים', included: true },
      { text: 'אסטרטגיית לידים מותאמת אישית', included: true },
      { text: 'אופטימיזציה חודשית', included: true },
      { text: 'ניהול פרסום ממומן (₪500 תקציב כלול)', included: true },
      { text: 'שיחת אסטרטגיה חודשית', included: true },
      { text: 'מנהל חשבון ייעודי', included: true },
      { text: 'SLA תגובה תוך 4 שעות', included: true },
    ],
    btn: 'outline',
    btnLabel: 'דבר איתנו',
  },
]

const FAQS = [
  { q: 'כמה זמן לוקח עד שהאתר מוכן?', a: '60 שניות. כן, זה לא טעות. AI יוצר את כל האתר — טקסטים, עיצוב, קריאות לפעולה — ברגע שמכניסים את שם העסק.' },
  { q: 'האם צריך ידע טכני?', a: 'בכלל לא. אם יודעים להקליד שם עסק — הכל מוכן. אין קוד, אין עיצוב, אין Photoshop.' },
  { q: 'מה קורה עם הלידים שמגיעים?', a: 'כל ליד מגיע אליך ישירות לוואטסאפ ולמייל. ב-Pro ומעלה יש גם הודעות מעקב אוטומטיות שמחמות את מי שלא ענה.' },
  { q: 'האם אפשר לבטל בכל שלב?', a: 'כן. ביטול בלחיצה, ללא קנסות, ללא התחייבות. תשאיר בגלל שהתוצאות טובות, לא בגלל שאתה כלוא.' },
  { q: 'מה ההבדל בין Pro ל-Done For You?', a: 'ב-Pro אתה עושה הכל בעצמך (זה פשוט). ב-Done For You — הצוות שלנו מקים, מפרסם, ומנהל בשבילך. מתאים למי שזמנו שווה כסף.' },
]

const TESTIMONIALS = [
  { name: 'יוסי לוי', role: 'פרקט ורצפות, ירושלים', initials: 'יל', stars: 5, quote: 'תוך יומיים קיבלתי 11 פניות מהאתר. לפני כן לא היה לי אתר בכלל. ממש שינה לי את העסק.' },
  { name: 'רחל אורן', role: 'עיצוב פנים, תל אביב', initials: 'רא', stars: 5, quote: 'שילמתי לאיש מקצוע ₪8,000 על אתר שנראה גרוע. פה תוך דקה קיבלתי משהו שנראה פי עשרה יותר טוב.' },
  { name: 'מוחמד עג׳מי', role: 'שיפוצים ובנייה, חיפה', initials: 'מע', stars: 5, quote: 'הוואטסאפ שלי לא מפסיק לצלצל. אני כבר צריך לשכור עוד עובד. לא חשבתי שזה יעבוד כל כך מהר.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`pp-faq-item ${open ? 'open' : ''}`}>
      <button className="pp-faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <span className="pp-faq-arrow">▼</span>
      </button>
      <div className="pp-faq-a">{a}</div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="pp-root">
      {/* Nav */}
      <nav className="pp-nav">
        <span className="pp-nav-logo">BusinessBuilder AI ✦</span>
        <button className="pp-nav-cta" onClick={() => document.getElementById('pp-pricing').scrollIntoView({ behavior: 'smooth' })}>
          ראה מחירים
        </button>
      </nav>

      {/* Hero */}
      <section className="pp-hero">
        <div className="pp-hero-badge">
          <span className="pp-hero-badge-dot" />
          AI מייצר אתר מלא תוך 60 שניות
        </div>
        <h1 className="pp-hero-h1">
          הלקוח הבא שלך<br />
          <span>מחפש אותך עכשיו</span>
        </h1>
        <p className="pp-hero-sub">
          AI בונה לך דף נחיתה, משפך וואטסאפ, פוסטים ופרסומות — הכל מוכן תוך דקה.
          בלי מפתחים. בלי סוכנות. בלי כאב ראש.
        </p>
        <div className="pp-hero-ctas">
          <button className="pp-btn-primary" onClick={() => window.location.href = '/'}>
            ראה את הדמו החי →
          </button>
          <button className="pp-btn-ghost" onClick={() => document.getElementById('pp-pricing').scrollIntoView({ behavior: 'smooth' })}>
            ראה מחירים
          </button>
        </div>
      </section>

      {/* Proof strip */}
      <div className="pp-proof-strip">
        <div className="pp-proof-item"><strong>+500</strong> עסקים פעילים</div>
        <div className="pp-proof-item"><strong>60 שנ׳</strong> זמן הקמה</div>
        <div className="pp-proof-item"><strong>ללא</strong> קוד / עיצוב</div>
        <div className="pp-proof-item"><strong>ביטול</strong> בכל עת</div>
        <div className="pp-proof-item"><strong>⭐ 4.9/5</strong> דירוג ממוצע</div>
      </div>

      {/* What You Get */}
      <section className="pp-what">
        <p className="pp-section-label">מה מקבלים</p>
        <h2 className="pp-section-title">כל מה שצריך כדי לקבל לידים</h2>
        <p className="pp-section-sub">מערכת שלמה שעובדת בשבילך 24/7 — גם כשאתה על הפרויקט</p>
        <div className="pp-features-grid">
          {FEATURES.map((f, i) => (
            <Fade key={f.title} delay={i * 0.06}>
              <div className="pp-feature-card">
                <span className="pp-feature-icon">{f.icon}</span>
                <div className="pp-feature-title">{f.title}</div>
                <div className="pp-feature-desc">{f.desc}</div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="pp-pricing" id="pp-pricing">
        <p className="pp-section-label">מחירים</p>
        <h2 className="pp-section-title">תמחור שקוף. בלי הפתעות.</h2>
        <p className="pp-section-sub">כל התכניות כוללות 14 יום ניסיון חינם. ביטול בכל עת.</p>
        <div className="pp-pricing-cards">
          {PLANS.map(plan => (
            <div key={plan.id} className={`pp-plan ${plan.featured ? 'featured' : ''}`}>
              {plan.badge && <div className="pp-plan-badge">{plan.badge}</div>}
              <div className="pp-plan-name">{plan.name}</div>
              <div className="pp-plan-tagline">{plan.tagline}</div>
              <div className="pp-plan-price">
                <span className="pp-plan-amount">
                  <span className="pp-currency">₪</span>{plan.amount}
                </span>
              </div>
              <div className="pp-plan-period">{plan.period}</div>
              {plan.setup && <div className="pp-plan-setup">{plan.setup}</div>}
              <hr className="pp-plan-divider" />
              <ul className="pp-plan-features">
                {plan.features.map(f => (
                  <li key={f.text} className={f.included ? 'check' : 'muted'}>{f.text}</li>
                ))}
              </ul>
              <button className={`pp-plan-btn ${plan.btn}`}>{plan.btnLabel}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us */}
      <section className="pp-why">
        <p className="pp-section-label">למה אנחנו</p>
        <h2 className="pp-section-title">לא עוד "בניית אתרים"</h2>
        <p className="pp-section-sub">מערכת לידים שלמה — לא רק דף יפה</p>
        <div className="pp-why-grid">
          {[
            { icon: '⚡', title: 'מוכן תוך דקה', desc: 'לא שבועות של עיצוב. לא אינסוף תיקונים. תוך 60 שניות יש לך אתר חי.' },
            { icon: '🇮🇱', title: 'בנוי לשוק הישראלי', desc: 'RTL, עברית, וואטסאפ. לא תרגום גנרי — פלטפורמה שיודעת איך ישראלים קונים.' },
            { icon: '📈', title: 'מותאם להמרות', desc: 'כל רכיב עוצב ע"פ נתונים. כפתורי וואטסאפ, טפסים, CTAs — במיקומים שמביאים לידים.' },
            { icon: '🔒', title: 'בלי נעילת ספק', desc: 'תמיד תוכל להוריד את האתר. הנתונים שלך, תמיד.' },
          ].map(w => (
            <Fade key={w.title}>
              <div className="pp-why-item">
                <div className="pp-why-icon">{w.icon}</div>
                <div className="pp-why-title">{w.title}</div>
                <div className="pp-why-desc">{w.desc}</div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* Social proof strip */}
      <section className="pp-testi">
        <p className="pp-section-label">בעלי עסקים שמצאו פתרון</p>
        <h2 className="pp-section-title" style={{ marginBottom: 16 }}>אתם לא לבד בדרך לגדול</h2>
        <p className="pp-section-sub" style={{ marginBottom: 48 }}>
          מאות בעלי עסקים כבר מקבלים לידים דרך BusinessBuilder AI — ממסעדות ועד משרדי עו&quot;ד, מחדרי כושר ועד בעלי מקצוע.
        </p>
        <div className="pp-testi-grid">
          {[
            { icon: '🪵', biz: 'קבלן שיפוצים', city: 'תל אביב', result: 'פניות חדשות מהאתר תוך יומיים מהשקה' },
            { icon: '💅', biz: 'מכון יופי',     city: 'חיפה',     result: 'תורים מלאים שבועיים קדימה בזכות WhatsApp' },
            { icon: '⚖️', biz: 'עורך דין',       city: 'ירושלים',  result: 'לידים מאורגניים ללא פרסום ממומן' },
          ].map((s, i) => (
            <Fade key={i} delay={i * 0.08}>
              <div className="pp-testi-card pp-testi-card--anon">
                <div className="pp-testi-anon-icon">{s.icon}</div>
                <div className="pp-testi-anon-biz">{s.biz} · {s.city}</div>
                <p className="pp-testi-quote">"{s.result}"</p>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pp-faq">
        <p className="pp-section-label">שאלות ותשובות</p>
        <h2 className="pp-section-title" style={{ marginBottom: 36 }}>שאלות נפוצות</h2>
        <div className="pp-faq-list">
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pp-cta-section">
        <h2 className="pp-cta-h2">מוכן להתחיל לקבל לידים?</h2>
        <p className="pp-cta-sub">
          14 יום ניסיון חינם. ביטול בכל עת. האתר שלך מוכן תוך 60 שניות.
        </p>
        <div className="pp-hero-ctas">
          <button className="pp-btn-primary" style={{ fontSize: '1.1rem', padding: '16px 44px' }}
            onClick={() => window.location.href = '/'}>
            בנה את האתר שלך חינם →
          </button>
        </div>
        <div className="pp-cta-guarantee">
          🔒 &nbsp;אבטחת SSL · ביטול בכל עת · תשלום מאובטח
        </div>
      </section>

      {/* Footer */}
      <footer className="pp-footer">
        <span className="pp-footer-logo">BusinessBuilder AI ✦</span>
        <span className="pp-footer-copy">© 2025 BusinessBuilder AI · כל הזכויות שמורות</span>
      </footer>
    </div>
  )
}
