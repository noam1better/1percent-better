import { useState, useEffect } from 'react'

const STORAGE_KEY = 'prime_intro_v1'

export function hasSeenOnboarding() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function markOnboardingSeen() {
  localStorage.setItem(STORAGE_KEY, 'true')
  localStorage.setItem('onboardingCompleted', 'true')  // skip InitiationFlow too
}

// ── Slide visuals ──────────────────────────────────────────────────

function Slide1() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Compound math hero */}
      <div style={{
        fontFamily: "'SF Mono','Fira Code',monospace",
        marginBottom: '1.75rem',
        animation: 'fadeIn 0.6s ease both',
      }}>
        <div style={{ color: 'rgba(245,197,24,0.35)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', marginBottom: '0.75rem' }}>THE MATH</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F5C518', fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>1.01</div>
            <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>כל יום</div>
          </div>
          <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '1.5rem', fontWeight: 300 }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F5C518', fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>37×</div>
            <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>בסוף השנה</div>
          </div>
        </div>
        <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.6rem', marginTop: '0.55rem' }}>1.01³⁶⁵ = 37.78</div>
      </div>

      <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1.35, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
        1% טוב יותר. כל יום.
      </h2>
      <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
        לא מוטיבציה. לא השראה.<br/>
        רק ההשפעה המצטברת של עקביות יומיומית.
      </p>
      <div style={{
        marginTop: '1.25rem',
        padding: '0.6rem 1.1rem',
        background: 'rgba(245,197,24,0.08)',
        border: '1px solid rgba(245,197,24,0.2)',
        borderRadius: 20,
        color: 'rgba(245,197,24,0.8)',
        fontSize: '0.78rem',
        fontWeight: 700,
        fontFamily: "'SF Mono','Fira Code',monospace",
      }}>
        כל יום שאתה לא מתקדם — מישהו אחר כן.
      </div>
    </div>
  )
}

function Slide2() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Mock camera frame */}
      <div style={{
        position: 'relative',
        width: 180,
        height: 135,
        borderRadius: 14,
        background: '#050508',
        border: '2px solid rgba(245,197,24,0.3)',
        marginBottom: '1.75rem',
        overflow: 'hidden',
        animation: 'fadeIn 0.5s ease both',
      }}>
        {/* Corner brackets */}
        {[
          { top: 6, left: 6, borderTop: '2px solid #F5C518', borderLeft: '2px solid #F5C518' },
          { top: 6, right: 6, borderTop: '2px solid #F5C518', borderRight: '2px solid #F5C518' },
          { bottom: 6, left: 6, borderBottom: '2px solid #F5C518', borderLeft: '2px solid #F5C518' },
          { bottom: 6, right: 6, borderBottom: '2px solid #F5C518', borderRight: '2px solid #F5C518' },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />
        ))}

        {/* Skeleton dots */}
        {[
          [50, 22], [90, 18], [130, 22],
          [70, 50], [110, 50],
          [80, 78], [100, 78],
          [75, 105], [105, 105],
        ].map(([x, y], i) => (
          <div key={i} style={{
            position: 'absolute',
            left: x, top: y,
            width: 5, height: 5,
            borderRadius: '50%',
            background: '#F5C518',
            opacity: 0.7,
            animation: `fadeIn 0.3s ${i * 0.06}s ease both`,
          }} />
        ))}

        {/* Rep counter overlay */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(5,5,5,0.85)',
          borderRadius: 8, padding: '3px 8px',
        }}>
          <span style={{ color: '#F5C518', fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace' }}>12</span>
          <span style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.55rem', marginRight: '2px' }}>חז'</span>
        </div>

        {/* AI badge */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(16,185,129,0.85)',
          borderRadius: 6, padding: '2px 7px',
          color: '#fff', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.05em',
        }}>
          AI ◈ LIVE
        </div>
      </div>

      <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1.35, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
        המצלמה סופרת במקומך
      </h2>
      <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 1rem' }}>
        AI מזהה את הטופס שלך בזמן אמת — אף חזרה לא תיפול בין הסדקים.
        כשתתחיל אימון כוח, <strong style={{ color: '#f1f5f9' }}>אפשר גישה למצלמה</strong> כשמתבקש.
      </p>
      <div style={{
        padding: '0.5rem 0.9rem',
        background: 'rgba(16,185,129,0.07)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 10,
        color: 'rgba(52,211,153,0.8)',
        fontSize: '0.72rem',
        fontWeight: 600,
      }}>
        🔒 הוידאו לא נשמר ולא עוזב את המכשיר שלך
      </div>
    </div>
  )
}

function Slide3() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Two track cards visual */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', animation: 'fadeIn 0.5s ease both' }}>
        {[
          { emoji: '💪', name: 'שכיבות שמיכה', goal: '10 חז\'', color: '#a78bfa' },
          { emoji: '🏃', name: 'ריצה', goal: '15 דק\'', color: '#F5C518' },
        ].map((t, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '0.85rem 1rem',
            background: `${t.color}0f`,
            border: `1px solid ${t.color}35`,
            borderRadius: 14,
            minWidth: 100,
            animation: `slide-up 0.35s ${i * 0.12}s ease both`,
          }}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{t.emoji}</span>
            <span style={{ color: '#f1f5f9', fontSize: '0.72rem', fontWeight: 800 }}>{t.name}</span>
            <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.6rem', marginTop: '0.15rem' }}>{t.goal}</span>
          </div>
        ))}
        {/* Blocked third slot */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0.85rem 0.9rem',
          background: 'rgba(239,68,68,0.05)',
          border: '1px dashed rgba(239,68,68,0.25)',
          borderRadius: 14,
          minWidth: 80,
          animation: 'fadeIn 0.5s 0.3s ease both',
        }}>
          <span style={{ fontSize: '1.2rem', marginBottom: '0.3rem', opacity: 0.4 }}>🔒</span>
          <span style={{ color: 'rgba(239,68,68,0.4)', fontSize: '0.6rem', fontWeight: 700 }}>נעול</span>
        </div>
      </div>

      <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1.35, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
        פוקוס, לא פיזור
      </h2>
      <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 1rem' }}>
        מקסימום <strong style={{ color: '#F5C518' }}>2 מסלולי אימון פעילים</strong> בו זמנית.
        ספורטאי אליטה לא מפזרים — הם מחויבים לבחירות שלהם.
      </p>
      <div style={{
        padding: '0.5rem 0.9rem',
        background: 'rgba(245,197,24,0.07)',
        border: '1px solid rgba(245,197,24,0.18)',
        borderRadius: 10,
        color: 'rgba(245,197,24,0.75)',
        fontSize: '0.72rem',
        fontWeight: 600,
        fontFamily: "'SF Mono','Fira Code',monospace",
      }}>
        רוצה מסלול שלישי? תסיר אחד קודם.
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

const SLIDES = [
  { component: Slide1, cta: 'הבנתי — אז מה הסוד? ←' },
  { component: Slide2, cta: 'הבנתי — מה לגבי המסלולים? ←' },
  { component: Slide3, cta: 'בואו נתחיל ←' },
]

export default function PrimeOnboarding({ onDone }) {
  const [idx,     setIdx]     = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [leaving, setLeaving] = useState(false)

  function next() {
    if (idx < SLIDES.length - 1) {
      setLeaving(true)
      setTimeout(() => {
        setIdx(i => i + 1)
        setAnimKey(k => k + 1)
        setLeaving(false)
      }, 180)
    } else {
      finish()
    }
  }

  function finish() {
    markOnboardingSeen()
    onDone()
  }

  const Slide = SLIDES[idx].component

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,5,10,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 5000,
      padding: '1.5rem',
    }}>

      {/* Logo */}
      <img src="/prime-logo.svg" alt="PRIME" style={{ height: 24, marginBottom: '2rem', opacity: 0.7 }} />

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '2rem' }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            height: 5, borderRadius: 99,
            width: i === idx ? 22 : 6,
            background: i <= idx ? '#F5C518' : 'rgba(255,255,255,0.12)',
            transition: 'width 0.35s ease, background 0.35s ease',
          }} />
        ))}
      </div>

      {/* Slide content */}
      <div
        key={animKey}
        style={{
          width: '100%', maxWidth: 400,
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          animation: !leaving ? 'slide-up 0.3s ease both' : 'none',
        }}
      >
        <Slide />
      </div>

      {/* CTA */}
      <button
        onClick={next}
        className="btn-primary btn-tactile"
        style={{
          marginTop: '2rem',
          width: '100%', maxWidth: 400,
          padding: '1rem',
          borderRadius: 16,
          fontSize: '0.97rem',
          fontWeight: 900,
          letterSpacing: '0.01em',
        }}
      >
        {SLIDES[idx].cta}
      </button>

      {/* Skip */}
      {idx < SLIDES.length - 1 && (
        <button
          onClick={finish}
          style={{
            marginTop: '1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(241,245,249,0.2)', fontSize: '0.72rem', fontWeight: 600,
          }}
        >
          דלג
        </button>
      )}
    </div>
  )
}
