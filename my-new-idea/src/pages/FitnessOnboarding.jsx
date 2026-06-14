import { useState } from 'react'
import './FitnessOnboarding.css'

// ── Goal options ──────────────────────────────────────────────────────
const GOALS = [
  { id: 'fitness',   icon: '🔥', label: 'כושר כללי',   sub: 'להיות בכושר ולהרגיש טוב'   },
  { id: 'strength',  icon: '💪', label: 'חיזוק וכוח',  sub: 'לבנות שרירים וכוח'           },
  { id: 'endurance', icon: '⚡', label: 'קצב וסיבולת', sub: 'לשפר סיבולת לב-ריאה'        },
  { id: 'stress',    icon: '🧘', label: 'שחרור סטרס',  sub: 'להשתחרר ולנשום'             },
  { id: 'sport',     icon: '🏆', label: 'ספורט',        sub: 'להתחרות ולהצטיין'           },
]

// ── Step 0 – Splash ───────────────────────────────────────────────────
function SplashStep({ onNext }) {
  return (
    <div className="fo-step fo-step--splash">
      <div className="fo-splash-glow fo-splash-glow--1" aria-hidden="true" />
      <div className="fo-splash-glow fo-splash-glow--2" aria-hidden="true" />
      <div className="fo-splash-icon">🥊</div>
      <h1 className="fo-splash-title">1% Better</h1>
      <div className="fo-splash-sub">AI Boxing Coach</div>
      <p className="fo-splash-desc">
        האימון שמשפר אותך ב-1% כל יום.<br />
        AI שמנתח את התנועות שלך בזמן אמת — ישירות מהמצלמה.
      </p>
      <div className="fo-splash-badges">
        <span className="fo-badge">🤖 MediaPipe AI</span>
        <span className="fo-badge">🥊 Boxing + Muay Thai</span>
        <span className="fo-badge">📊 דוח ביצועים</span>
      </div>
      <button className="fo-btn-primary" onClick={onNext}>
        בוא נתחיל →
      </button>
    </div>
  )
}

// ── Step 1 – Features ─────────────────────────────────────────────────
function FeaturesStep({ onNext }) {
  return (
    <div className="fo-step fo-step--features">
      <div className="fo-step-eyebrow">איך זה עובד?</div>
      <h2 className="fo-step-title">AI Coach שעוקב,<br />מנתח ומשפר אותך</h2>
      <div className="fo-features-grid">
        <div className="fo-feat-card">
          <span className="fo-feat-icon">🤖</span>
          <div className="fo-feat-name">AI בזמן אמת</div>
          <div className="fo-feat-desc">
            MediaPipe Pose עוקב אחרי האגרופים, ההגנה והמהירות שלך ישירות מהמצלמה
          </div>
        </div>
        <div className="fo-feat-card">
          <span className="fo-feat-icon">🥊</span>
          <div className="fo-feat-name">2 מצבי אימון</div>
          <div className="fo-feat-desc">
            Classic Boxing לאגרופים, Muay Thai לבעיטות, ברכיים ומרפקים — כולם חינמיים
          </div>
        </div>
        <div className="fo-feat-card fo-feat-card--wide">
          <span className="fo-feat-icon">📊</span>
          <div className="fo-feat-name">דוח ביצועים מלא</div>
          <div className="fo-feat-desc">
            ניקוד כולל, מהירות ממוצעת, שיא מהירות, אחוז הגנה וטיפ אישי אחרי כל אימון
          </div>
        </div>
      </div>
      <button className="fo-btn-primary" onClick={onNext}>
        המשך →
      </button>
    </div>
  )
}

// ── Step 2 – Name ─────────────────────────────────────────────────────
function NameStep({ name, onChange, onNext, onSkip }) {
  const submit = () => { if (name.trim()) onNext() }
  return (
    <div className="fo-step fo-step--name">
      <div className="fo-step-eyebrow">שלב 1 / 2</div>
      <h2 className="fo-step-title">מה שמך?</h2>
      <p className="fo-step-sub">
        כדי שנוכל לפנות אליך נכון<br />אחרי כל אימון
      </p>
      <input
        className="fo-input"
        type="text"
        placeholder="השם שלך"
        value={name}
        onChange={e => onChange(e.target.value)}
        autoFocus
        maxLength={30}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        dir="rtl"
      />
      <button
        className="fo-btn-primary"
        disabled={!name.trim()}
        onClick={submit}
      >
        המשך →
      </button>
      <button className="fo-btn-ghost" onClick={onSkip}>
        דלג
      </button>
    </div>
  )
}

// ── Step 3 – Goal ─────────────────────────────────────────────────────
function GoalStep({ goal, onSelect, onComplete }) {
  return (
    <div className="fo-step fo-step--goal">
      <div className="fo-step-eyebrow">שלב 2 / 2</div>
      <h2 className="fo-step-title">מה המטרה שלך?</h2>
      <p className="fo-step-sub">נשתמש בזה כדי להתאים את הטיפים אחרי האימון</p>
      <div className="fo-goals-grid">
        {GOALS.map(g => (
          <button
            key={g.id}
            className={`fo-goal-btn${goal === g.id ? ' fo-goal-btn--active' : ''}`}
            onClick={() => onSelect(g.id)}
          >
            <span className="fo-goal-icon">{g.icon}</span>
            <span className="fo-goal-label">{g.label}</span>
            <span className="fo-goal-sub">{g.sub}</span>
          </button>
        ))}
      </div>
      <button
        className="fo-btn-primary"
        disabled={!goal}
        onClick={onComplete}
      >
        {goal ? 'בוא נתחיל! 🥊' : 'בחר מטרה'}
      </button>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────
function Dots({ total, current }) {
  return (
    <div className="fo-dots" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`fo-dot${i === current ? ' fo-dot--active' : i < current ? ' fo-dot--done' : ''}`}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
const TOTAL_STEPS = 4

export default function FitnessOnboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(null)

  const advance = () => setStep(s => s + 1)

  const finish = () => {
    try {
      if (name.trim()) localStorage.setItem('1pb_fitness_name', name.trim())
      if (goal)        localStorage.setItem('1pb_fitness_goal', goal)
      localStorage.setItem('1pb_fitness_onboarded', '1')
    } catch {}
    onComplete({ name: name.trim(), goal })
  }

  const steps = [
    <SplashStep   key={0} onNext={advance} />,
    <FeaturesStep key={1} onNext={advance} />,
    <NameStep     key={2} name={name} onChange={setName} onNext={advance} onSkip={advance} />,
    <GoalStep     key={3} goal={goal} onSelect={setGoal} onComplete={finish} />,
  ]

  return (
    <div className="fo-root" dir="rtl">
      <div className="fo-slide" key={step}>
        {steps[step]}
      </div>
      <Dots total={TOTAL_STEPS} current={step} />
    </div>
  )
}
