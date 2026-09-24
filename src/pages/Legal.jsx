import { useNavigate } from 'react-router-dom'

const SUPPORT_EMAIL = 'support@prime-app.io'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ color: 'rgba(245,197,24,0.6)', fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.6rem' }}>
        {title}
      </div>
      <div style={{ color: 'rgba(241,245,249,0.6)', fontSize: '0.8rem', lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  )
}

export default function Legal() {
  const navigate = useNavigate()

  return (
    <div dir="rtl" style={{ minHeight: '100svh', background: '#0e0e16', padding: '0 1.25rem 3rem' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 0 1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', fontSize: '0.82rem', fontWeight: 700, padding: '0.4rem 0.7rem', cursor: 'pointer' }}
          >
            ← חזרה
          </button>
          <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
            משפטי ותמיכה
          </div>
        </div>

        <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 1.75rem', letterSpacing: '-0.02em' }}>
          פרטיות, תנאים ותמיכה
        </h1>

        {/* Support */}
        <Section title="◈ יצירת קשר ותמיכה">
          לשאלות, בעיות טכניות או בקשות — פנה אלינו ישירות:{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: '#F5C518', fontWeight: 700, textDecoration: 'none' }}
          >
            {SUPPORT_EMAIL}
          </a>
          <br /><br />
          אנחנו עושים מאמץ להגיב תוך 48 שעות בימי עסקים.
        </Section>

        {/* Privacy */}
        <Section title="◈ מדיניות פרטיות">
          <strong style={{ color: '#f1f5f9' }}>מה אנחנו אוספים:</strong> כתובת אימייל, שם תצוגה, ונתוני שימוש (XP, מסלולים, הרגלים) שאתה יוצר באפליקציה.
          <br /><br />
          <strong style={{ color: '#f1f5f9' }}>מה אנחנו לא עושים:</strong> לא מוכרים את המידע שלך. לא משתפים אותו עם צדדים שלישיים לצורכי פרסום. לא שומרים פרטי תשלום — כל החיוב מעובד על ידי Stripe/Apple/Google.
          <br /><br />
          <strong style={{ color: '#f1f5f9' }}>אחסון נתונים:</strong> המידע שלך מאוחסן ב-Google Firebase (Firestore) בשרתים באירופה ובארה"ב. Firebase מציית ל-GDPR.
          <br /><br />
          <strong style={{ color: '#f1f5f9' }}>מחיקת נתונים:</strong> פנה אלינו ב-{SUPPORT_EMAIL} ואנו נמחק את כל הנתונים שלך תוך 30 יום.
        </Section>

        {/* Terms */}
        <Section title="◈ תנאי שימוש">
          השימוש ב-PRIME כפוף לתנאים הבאים:
          <br /><br />
          1. האפליקציה מיועדת לשימוש אישי בלבד.<br />
          2. אסור לנסות לפרוץ, לשכפל, או לפגוע בשירות.<br />
          3. כל התוכן שאתה מעלה (תמונות, טקסט) הוא באחריותך.<br />
          4. אנחנו שומרים לעצמנו את הזכות להשעות חשבונות שמפרים את הכללים.<br />
          5. השירות ניתן "כפי שהוא" (as-is). איננו מתחייבים לזמינות מלאה.
          <br /><br />
          המשך השימוש באפליקציה מהווה הסכמה לתנאים אלה.
        </Section>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: 'rgba(241,245,249,0.15)', fontSize: '0.6rem', fontFamily: "'SF Mono','Fira Code',monospace", marginTop: '2rem' }}>
          PRIME · v1.2 · עודכן אוגוסט 2026
        </div>
      </div>
    </div>
  )
}
