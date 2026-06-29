import { useState } from 'react'

const STEPS = ['hook', 'rules', 'activation']

const page = {
  minHeight: '100vh',
  background: '#0e0e16',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  position: 'relative',
  fontFamily: 'inherit',
}

const card = {
  width: '100%',
  maxWidth: 440,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '22px 28px 24px 26px',
  padding: '2.5rem 2rem 2rem',
  direction: 'rtl',
  textAlign: 'right',
}

const emojiBox = {
  width: 56,
  height: 56,
  borderRadius: '16px 18px 14px 20px',
  background: 'rgba(196,121,90,0.12)',
  border: '1px solid rgba(196,121,90,0.22)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.75rem',
  marginBottom: '1.25rem',
}

const titleSt = {
  color: '#f1f5f9',
  fontSize: '1.35rem',
  fontWeight: 800,
  marginBottom: '0.75rem',
  lineHeight: 1.3,
}

const bodySt = {
  color: 'rgba(241,245,249,0.62)',
  fontSize: '0.95rem',
  lineHeight: 1.7,
  marginBottom: '1.5rem',
  whiteSpace: 'pre-line',
}

const detailSt = {
  color: 'rgba(196,121,90,0.85)',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.01em',
  marginBottom: '1.75rem',
}

const ruleSt = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.85rem 1rem',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  marginBottom: '0.6rem',
}

const ruleNumSt = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'linear-gradient(135deg,#c4795a,#d4956e)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.8rem',
  fontWeight: 800,
  color: '#fff',
  flexShrink: 0,
  marginTop: 1,
}

const ruleTextSt = {
  color: 'rgba(241,245,249,0.8)',
  fontSize: '0.88rem',
  fontWeight: 600,
  lineHeight: 1.5,
}

const ctaSt = {
  width: '100%',
  padding: '0.95rem',
  borderRadius: 14,
  fontSize: '0.95rem',
  fontWeight: 800,
  marginTop: '1.5rem',
  letterSpacing: '0.01em',
}

const dotContainer = {
  display: 'flex',
  gap: '0.45rem',
  marginBottom: '1.5rem',
}

function Dot({ active }) {
  return (
    <div style={{
      width: active ? 20 : 6,
      height: 6,
      borderRadius: 99,
      background: active ? '#c4795a' : 'rgba(255,255,255,0.15)',
      transition: 'width 0.3s ease, background 0.3s ease',
    }} />
  )
}

const RULES = [
  { num: '1', text: 'כל יום. גם אם זה 5 דקות בלבד.' },
  { num: '2', text: 'אין "להשלים מחר". יש רק היום.' },
  { num: '3', text: 'מה שלא נרשם — לא קרה.' },
]

export default function InitiationFlow({ onComplete }) {
  const [step, setStep]       = useState(0)
  const [animKey, setAnimKey] = useState(0)

  function advance() {
    if (step < STEPS.length - 1) {
      setAnimKey(k => k + 1)
      setStep(s => s + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div style={page}>
      <div style={dotContainer}>
        {STEPS.map((_, i) => <Dot key={i} active={i === step} />)}
      </div>

      <div key={animKey} style={card} className="anim-ob-slide">

        {/* ── Step 1: The Hook ─────────────────────────── */}
        {step === 0 && (
          <>
            <div style={emojiBox}>⚡</div>
            <h2 style={titleSt}>רגע לפני שמתחילים.</h2>
            <p style={bodySt}>
              {'1% כל יום נשמע קל.\nוזה בדיוק למה רוב האנשים לא מחזיקים מעמד.'}
            </p>
            <p style={detailSt}>לא צריך מוטיבציה. צריך מנגנון.</p>
            <p style={{ ...bodySt, fontSize: '0.875rem', marginBottom: 0, color: 'rgba(241,245,249,0.45)' }}>
              האפליקציה הזאת היא המנגנון שלך. אבל רק אם תשתמש בה כל יום.
            </p>
          </>
        )}

        {/* ── Step 2: The Rules ────────────────────────── */}
        {step === 1 && (
          <>
            <div style={emojiBox}>📋</div>
            <h2 style={titleSt}>שלושה כללים. לא יותר.</h2>
            <p style={{ ...bodySt, marginBottom: '1.25rem' }}>
              פשוטים מספיק לזכור. קשים מספיק לקיים.
            </p>
            <div>
              {RULES.map(r => (
                <div key={r.num} style={ruleSt}>
                  <div style={ruleNumSt}>{r.num}</div>
                  <span style={ruleTextSt}>{r.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Activation ───────────────────────── */}
        {step === 2 && (
          <>
            <div style={emojiBox}>🔥</div>
            <h2 style={titleSt}>מוכן?</h2>
            <p style={bodySt}>
              {'יום אחד היום.\nשבוע עד ביום 7.\nאדם אחר עד סוף החודש.'}
            </p>
            <p style={{ ...bodySt, fontSize: '0.82rem', color: 'rgba(241,245,249,0.38)', marginBottom: 0 }}>
              הרבה אנשים מתחילים. הבדל הוא שאתה תמשיך.
            </p>
          </>
        )}

        <button
          onClick={advance}
          className="btn-primary btn-tactile"
          style={ctaSt}
        >
          {step === 0 ? 'אני בפנים ←' : step === 1 ? 'מקבל את הכללים ←' : 'בואו נתחיל ⚡'}
        </button>

        {step > 0 && (
          <button
            onClick={() => { setAnimKey(k => k + 1); setStep(s => s - 1) }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: '0.78rem', cursor: 'pointer', marginTop: '0.85rem', display: 'block', width: '100%', textAlign: 'center', padding: '0.25rem' }}
          >
            חזרה
          </button>
        )}
      </div>
    </div>
  )
}
