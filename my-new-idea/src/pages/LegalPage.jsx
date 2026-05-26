import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGES = {
  privacy: {
    title: 'מדיניות פרטיות',
    updated: 'עודכן לאחרונה: ינואר 2025',
    sections: [
      {
        h: 'מידע שאנו אוספים',
        p: 'אנו אוספים מידע שאתם מספקים לנו ישירות — שם עסק, פרטי קשר, סוג עסק ותיאור שירותים — לשם יצירת האתר שלכם. אנו אוספים גם מידע טכני בסיסי כגון כתובת IP ומידע על הדפדפן.',
      },
      {
        h: 'כיצד אנו משתמשים במידע',
        p: 'המידע משמש אך ורק ליצירת האתר שלכם, לשיפור השירות, ולצורך תמיכה טכנית. לא נמכור את המידע שלכם לצדדים שלישיים.',
      },
      {
        h: 'אחסון מידע',
        p: 'מידע העסק שלכם נשמר מקומית על המכשיר שלכם (localStorage). אנו לא שומרים מידע אישי רגיש על שרתינו ללא הסכמתכם המפורשת.',
      },
      {
        h: 'עוגיות (Cookies)',
        p: 'אנו משתמשים בעוגיות טכניות בלבד לצורך תפקוד השירות. אנו לא משתמשים בעוגיות מעקב לצרכי פרסום.',
      },
      {
        h: 'זכויותיכם',
        p: 'יש לכם הזכות לגשת למידע שלכם, לתקנו, או לבקש את מחיקתו. לפניות בנושא מדיניות פרטיות, צרו קשר דרך הטופס באתר.',
      },
    ],
  },
  terms: {
    title: 'תנאי שימוש',
    updated: 'עודכן לאחרונה: ינואר 2025',
    sections: [
      {
        h: 'קבלת התנאים',
        p: 'שימוש בשירות BusinessBuilder AI מהווה הסכמה לתנאי שימוש אלו. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש בשירות.',
      },
      {
        h: 'השירות',
        p: 'BusinessBuilder AI מספק כלים לבניית דפי נחיתה ואתרים לעסקים קטנים ובינוניים. השירות מסופק "כמות שהוא" (as-is) ואנו שומרים לעצמנו את הזכות לשנות או להפסיק חלקים מהשירות בכל עת.',
      },
      {
        h: 'תוכן המשתמש',
        p: 'אתם אחראים לכל התוכן שמועלה לשירות. אסור להשתמש בשירות לצרכים בלתי חוקיים, להפצת תוכן פוגעני, או להטעיית לקוחות.',
      },
      {
        h: 'תשלום וביטול',
        p: 'תשלומים מתבצעים חודשית. ניתן לבטל את המנוי בכל עת ללא קנסות. ביטול ייכנס לתוקף בתום תקופת החיוב השוטפת.',
      },
      {
        h: 'הגבלת אחריות',
        p: 'אחריותנו מוגבלת לסכום ששולם על ידיכם בשלושת החודשים האחרונים. איננו אחראים לנזקים עקיפים, אובדן הכנסות, או אובדן נתונים.',
      },
      {
        h: 'שינויים בתנאים',
        p: 'אנו עשויים לעדכן תנאים אלו מעת לעת. נודיע על שינויים מהותיים באמצעות הדוא"ל שרשמתם או בהודעה בולטת בממשק השירות.',
      },
    ],
  },
}

export default function LegalPage({ type }) {
  const navigate = useNavigate()
  const page = PAGES[type]

  useEffect(() => {
    if (page) document.title = `${page.title} | BusinessBuilder AI`
    return () => { document.title = 'BusinessBuilder AI — בנה אתר לעסק שלך תוך 60 שניות' }
  }, [page])

  if (!page) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070711',
      color: '#f1f5f9',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <a href="/" style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>
          ✦ BusinessBuilder AI
        </a>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← חזרה
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{page.title}</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 48 }}>{page.updated}</p>

        {page.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#e2e8f0' }}>{s.h}</h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.75, margin: 0 }}>{s.p}</p>
          </div>
        ))}

        <div style={{
          marginTop: 60,
          padding: '24px',
          borderRadius: 12,
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
        }}>
          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
            שאלות? פנו אלינו בכל עת דרך{' '}
            <a href="/onboarding" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              טופס יצירת הקשר
            </a>{' '}
            או דרך WhatsApp.
          </p>
        </div>
      </div>
    </div>
  )
}
