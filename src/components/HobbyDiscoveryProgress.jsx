import { useMemo } from 'react'
import {
  HOBBY_DAYS,
  HOBBY_CATEGORIES,
  HOBBY_DISCOVERY_ID,
  computeHobbyResults,
} from '../data/hobbyDiscovery'

const MIN_RESPONSES_FOR_LEADING = 5
const MIN_RESPONSES_FOR_FULL_RESULTS = 3

function responseBadge(r) {
  if (r === 'loved') return { emoji: '🔥', color: '#10b981' }
  if (r === 'ok')    return { emoji: '👍', color: '#D9B34C' }
  if (r === 'nope')  return { emoji: '👋', color: '#71717A' }
  return null
}

// ── In-progress view ───────────────────────────────────────────────

function InProgressView({ daysCompleted, responses, responseCount }) {
  const pct = Math.round((daysCompleted / 14) * 100)

  const recentDays = HOBBY_DAYS
    .filter(d => d.day <= daysCompleted)
    .slice(-3)
    .reverse()

  const leadingTop = useMemo(() => {
    if (responseCount < MIN_RESPONSES_FOR_LEADING) return []
    const { top } = computeHobbyResults(responses)
    return top.slice(0, 2)
  }, [responses, responseCount])

  return (
    <div
      data-testid="hobby-inprogress"
      style={{
        background: '#111317',
        border: '1px solid rgba(167,139,250,0.2)',
        borderRadius: 14,
        padding: '1rem 1.1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🔍</span>
          <div>
            <div style={{ color: '#F4F1E8', fontSize: '0.85rem', fontWeight: 800 }}>לגלות תחביב שמתאים לי</div>
            <div style={{ color: '#71717A', fontSize: '0.63rem' }}>יום {daysCompleted} מתוך 14</div>
          </div>
        </div>
        <div style={{ color: '#a78bfa', fontWeight: 900, fontSize: '0.88rem' }}>{pct}%</div>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: '0.8rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {recentDays.length > 0 && (
        <div style={{ marginBottom: leadingTop.length > 0 ? '0.7rem' : 0 }}>
          <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            ניסויים אחרונים
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
            {recentDays.map(d => {
              const badge = responseBadge(responses[String(d.day)])
              return (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A4A6AD', fontSize: '0.78rem' }}>{d.emoji} {d.hobbyLabel}</span>
                  {badge
                    ? <span style={{ color: badge.color, fontSize: '0.75rem' }}>{badge.emoji}</span>
                    : <span style={{ color: '#3A3A40', fontSize: '0.62rem' }}>ללא דירוג</span>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

      {leadingTop.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            מתחיל להתגבש
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {leadingTop.map(hobby => {
              const cat = HOBBY_CATEGORIES[hobby]
              if (!cat) return null
              return (
                <span key={hobby} style={{ padding: '0.22rem 0.6rem', borderRadius: 20, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700 }}>
                  {cat.emoji} {cat.label}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Completed view ─────────────────────────────────────────────────

function CompletedView({ results, responses }) {
  const responseCount = Object.keys(responses || {}).length

  if (responseCount < MIN_RESPONSES_FOR_FULL_RESULTS || !results || results.top.length === 0) {
    return (
      <div
        data-testid="hobby-completed-insufficient"
        style={{
          background: '#111317',
          border: '1px solid rgba(167,139,250,0.15)',
          borderRadius: 14,
          padding: '1rem 1.1rem',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span>🔍</span>
          <div style={{ flex: 1, color: '#F4F1E8', fontSize: '0.85rem', fontWeight: 800 }}>לגלות תחביב — הושלם</div>
          <div style={{ color: '#3FAF7A', fontWeight: 900 }}>✓</div>
        </div>
        <div style={{ color: '#71717A', fontSize: '0.78rem', lineHeight: 1.5 }}>
          השלמת את 14 הניסויים. לא היו מספיק דירוגים כדי לחשב המלצה — בפעם הבאה כדאי לדרג כל ניסוי.
        </div>
      </div>
    )
  }

  const topHobbies   = results.top.slice(0, 3)
  const topCatLabels = topHobbies.map(h => HOBBY_CATEGORIES[h]?.label).filter(Boolean)
  const summaryText  = topCatLabels.length >= 2
    ? `ל${topCatLabels.slice(0, 2).join(' ול')}`
    : `ל${topCatLabels[0]}`

  const lovedHobbies = results.loved
  const okHobbies    = HOBBY_DAYS
    .filter(d => responses[String(d.day)] === 'ok')
    .map(d => d.hobbyLabel)

  return (
    <div
      data-testid="hobby-completed"
      style={{
        background: '#111317',
        border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: 14,
        padding: '1rem 1.1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
        <span>🔍</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#F4F1E8', fontSize: '0.85rem', fontWeight: 800 }}>תוצאות גילוי התחביב</div>
          <div style={{ color: '#71717A', fontSize: '0.62rem' }}>מבוסס על {responseCount} דירוגים</div>
        </div>
        <div style={{ color: '#3FAF7A', fontWeight: 900 }}>✓</div>
      </div>

      <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, padding: '0.75rem', marginBottom: '0.8rem' }}>
        <div style={{ color: '#c4b5fd', fontSize: '0.82rem', lineHeight: 1.55, fontWeight: 600 }}>
          לפי ההתנסויות והתשובות שלך, נראה שהתחברת במיוחד {summaryText}.
        </div>
      </div>

      {lovedHobbies.length > 0 && (
        <div style={{ marginBottom: '0.6rem' }}>
          <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            🔥 רוצה להמשיך
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {lovedHobbies.map(label => (
              <span key={label} style={{ padding: '0.22rem 0.55rem', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {okHobbies.length > 0 && (
        <div style={{ marginBottom: '0.6rem' }}>
          <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            👍 היה נחמד
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {okHobbies.map(label => (
              <span key={label} style={{ padding: '0.22rem 0.55rem', borderRadius: 20, background: 'rgba(217,179,76,0.1)', border: '1px solid rgba(217,179,76,0.2)', color: '#D9B34C', fontSize: '0.72rem', fontWeight: 700 }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ color: '#3D4150', fontSize: '0.62rem', lineHeight: 1.4, marginBottom: '0.6rem', fontStyle: 'italic' }}>
        ההמלצה מבוססת על הפעילויות שניסית ועל הדירוגים שנתת. זו נקודת פתיחה, לא אבחנה.
      </div>

      {results.recommended && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            צעד הבא מומלץ
          </div>
          <div style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 700 }}>
            → {results.recommended.label}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────

export default function HobbyDiscoveryProgress({ hobbyDiscovery, challenges }) {
  const daysCompleted = challenges?.[HOBBY_DISCOVERY_ID]?.daysCompleted || 0

  // Sanitize responses — must be a plain object, not array or primitive
  const responses = useMemo(() => {
    const raw = hobbyDiscovery?.responses
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return raw
  }, [hobbyDiscovery])

  const responseCount = Object.keys(responses).length

  // Pure calculation — does not mutate stored data; called unconditionally (hooks rules)
  const results = useMemo(
    () => (responseCount > 0 ? computeHobbyResults(responses) : null),
    [responses, responseCount],
  )

  const isCompleted = daysCompleted >= 14

  // Never started → render nothing (after all hooks are called)
  if (daysCompleted === 0 && responseCount === 0) return null

  if (isCompleted) {
    return <CompletedView results={results} responses={responses} />
  }

  return (
    <InProgressView
      daysCompleted={daysCompleted}
      responses={responses}
      responseCount={responseCount}
    />
  )
}
