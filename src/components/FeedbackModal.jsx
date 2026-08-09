// AI coach feedback modal — shown after set completion when Gemini analysis is ready.
// Renders as a fixed overlay on top of the SetSummaryPanel.

const SCORE_COLOR = s =>
  s >= 90 ? '#34d399' : s >= 70 ? '#F5C518' : s >= 50 ? '#f59e0b' : '#ef4444'

export default function FeedbackModal({
  exerciseName,
  reps, goal, score,
  feedback,
  setsToday = 1, setsGoal = 5,
  rivalName = 'Elon', rivalScore = 80,
  distance,
  onClose,
}) {
  const scoreColor = SCORE_COLOR(score)
  const pct        = goal > 0 ? Math.round((reps / goal) * 100) : 0
  const isLoading  = feedback === 'loading'
  const userWins   = score > rivalScore

  // Display scores as one decimal (e.g. 92 → 9.2)
  const myDisplay    = (score / 10).toFixed(1)
  const rivalDisplay = (rivalScore / 10).toFixed(1)

  const winLabel = userWins
    ? `🏆 עברת את ${rivalName}!`
    : `💪 ${rivalName} מוביל — הסט הבא שלך`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(5,5,12,0.82)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0e0e16',
        borderRadius: '20px 20px 0 0',
        borderTop: `2px solid ${userWins ? 'rgba(245,197,24,0.7)' : 'rgba(99,102,241,0.45)'}`,
        boxShadow: userWins ? '0 -6px 48px rgba(245,197,24,0.12)' : 'none',
        padding: '1.5rem 1.4rem 2.6rem',
        animation: 'slide-up 0.28s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isLoading ? '#6366f1' : (userWins ? '#F5C518' : '#34d399'),
              animation: isLoading ? 'cam-pulse 1.2s ease infinite' : 'none',
            }} />
            <span style={{
              color: isLoading ? 'rgba(99,102,241,0.7)' : (userWins ? 'rgba(245,197,24,0.7)' : 'rgba(99,102,241,0.7)'),
              fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace",
            }}>
              ◈ ניתוח AI · {exerciseName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile"
            style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.35)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem 0.5rem' }}
          >✕</button>
        </div>

        {/* Score circle + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${scoreColor}`,
            background: `${scoreColor}14`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: scoreColor, fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{score}</span>
            <span style={{ color: `${scoreColor}88`, fontSize: '0.46rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ניקוד</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
              {[
                { label: 'חזרות', value: reps },
                { label: 'יעד',   value: goal },
                distance != null
                  ? { label: 'ק״מ', value: distance.toFixed(2) }
                  : { label: '%',   value: `${pct}%` },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.4rem 0', textAlign: 'center' }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.95rem' }}>{s.value}</div>
                  <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.48rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sets progress dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {Array.from({ length: setsGoal }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i < setsToday ? 10 : 7,
                    height: i < setsToday ? 10 : 7,
                    borderRadius: '50%',
                    background: i < setsToday
                      ? (userWins ? '#F5C518' : '#6366f1')
                      : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }}
                />
              ))}
              <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', fontWeight: 700, marginLeft: '0.2rem' }}>
                סט {setsToday}/{setsGoal}
              </span>
            </div>
          </div>
        </div>

        {/* VS leaderboard strip */}
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: '0',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${userWins ? 'rgba(245,197,24,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 13,
          overflow: 'hidden',
          marginBottom: '0.85rem',
        }}>
          {/* User side */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '0.6rem 0.5rem',
            background: userWins ? 'rgba(245,197,24,0.07)' : 'transparent',
          }}>
            <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>אתה</span>
            <span style={{ color: userWins ? '#F5C518' : '#f1f5f9', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{myDisplay}</span>
            {userWins && <span style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>🏆</span>}
          </div>

          {/* VS divider */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 0.6rem',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em' }}>VS</span>
            <div style={{ color: userWins ? '#F5C518' : '#ef4444', fontSize: '0.55rem', fontWeight: 700, marginTop: '0.15rem', whiteSpace: 'nowrap' }}>
              {winLabel}
            </div>
          </div>

          {/* Rival side */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '0.6rem 0.5rem',
            background: !userWins ? 'rgba(239,68,68,0.05)' : 'transparent',
          }}>
            <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{rivalName}</span>
            <span style={{ color: !userWins ? '#f87171' : 'rgba(241,245,249,0.45)', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{rivalDisplay}</span>
            {!userWins && <span style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>👑</span>}
          </div>
        </div>

        {/* AI feedback body */}
        <div style={{
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14,
          padding: '0.9rem 1rem',
          minHeight: 68,
          marginBottom: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'cam-pulse 1s ease infinite' }} />
              <span style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.78rem' }}>מנתח את האימון שלך...</span>
            </div>
          ) : (
            <>
              <div style={{ color: 'rgba(99,102,241,0.55)', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
                ◈ משוב מאמן
              </div>
              <p style={{ color: 'rgba(241,245,249,0.82)', fontSize: '0.82rem', lineHeight: 1.65, margin: 0 }}>
                {feedback}
              </p>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-primary btn-tactile"
          style={{
            width: '100%', padding: '1rem', borderRadius: 14,
            fontSize: '0.97rem', fontWeight: 900,
            opacity: isLoading ? 0.45 : 1,
            background: userWins
              ? 'linear-gradient(135deg, #d97706, #F5C518)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          {isLoading ? 'ממתין לניתוח...' : userWins ? '🏆 סגור — ניצחת!' : 'סגור ←'}
        </button>
      </div>
    </div>
  )
}
