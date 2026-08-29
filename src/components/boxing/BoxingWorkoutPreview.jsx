import { useState } from 'react'

// ─── palette ────────────────────────────────────────────────────────────────
const C = {
  bg:      '#111317',
  surface: '#1C1F26',
  border:  '#2A2D35',
  text:    '#F4F1E8',
  muted:   '#71717A',
  accent:  '#D9B34C',
  blue:    '#60a5fa',
  green:   '#10b981',
  orange:  '#f97316',
}

const DIFFICULTY_LABEL = {
  beginner:     'מתחילים',
  intermediate: 'בינוני',
  advanced:     'מתקדם',
}

const ROUND_TYPE_LABEL = {
  warmup:    'חימום',
  technique: 'טכניקה',
  work:      'עבודה',
  rest:      'מנוחה',
  cooldown:  'שחרור',
}

const ROUND_TYPE_COLOR = {
  warmup:    C.green,
  technique: C.blue,
  work:      C.accent,
  rest:      C.muted,
  cooldown:  C.green,
}

function MetaChip({ label }) {
  return (
    <span
      style={{
        background: '#2A2D35',
        color: C.muted,
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}

function TrainingToggle({ value, onChange }) {
  const options = [
    { id: 'shadow', label: 'איגרוף צל', emoji: '👤', desc: 'ללא ציוד' },
    { id: 'bag',    label: 'שק כבד',    emoji: '🥊', desc: 'עם שק אימון' },
  ]
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
      {options.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            className="btn-tactile"
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              background: selected ? C.blue + '22' : C.surface,
              border: `2px solid ${selected ? C.blue : C.border}`,
              borderRadius: 14,
              padding: '14px 10px',
              cursor: 'pointer',
              color: selected ? C.blue : C.muted,
              textAlign: 'center',
              transition: 'all 0.18s ease',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>{opt.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{opt.label}</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

function RoundStructureRow({ round, index: _index }) {
  const color = ROUND_TYPE_COLOR[round.type] ?? C.muted
  const label = ROUND_TYPE_LABEL[round.type] ?? round.type
  const mins  = Math.floor(round.durationSeconds / 60)
  const secs  = round.durationSeconds % 60
  const timeStr = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}″`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderBottom: `1px solid ${C.border}`,
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: 4,
          height: 28,
          borderRadius: 4,
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{round.titleHe}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{label}</div>
      </div>
      <div style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{timeStr}</div>
    </div>
  )
}

export default function BoxingWorkoutPreview({ workout, levelNum, onStart, onBack }) {
  const [trainingType, setTrainingType] = useState(null)

  if (!workout) return null

  const workRounds = (workout.rounds ?? []).filter((r) => r.type === 'work')
  const equipment  = (workout.equipment ?? []).join(' · ')
  const diffLabel  = DIFFICULTY_LABEL[workout.difficulty] ?? workout.difficulty

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        direction: 'rtl',
        fontFamily: 'system-ui, sans-serif',
        paddingBottom: 32,
      }}
    >
      {/* ── Back button ── */}
      <div style={{ padding: '12px 16px 0' }}>
        <button
          className="btn-tactile"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.muted,
            fontSize: 15,
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← חזרה
        </button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* ── Title block ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                background: C.accent + '22',
                color: C.accent,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              רמה {levelNum} · אימון {workout.order}
            </span>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              margin: '0 0 8px',
              lineHeight: 1.2,
              color: C.text,
            }}
          >
            {workout.titleHe}
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            {workout.goalHe}
          </p>
        </div>

        {/* ── Meta chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          <MetaChip label={`${workout.estimatedMinutes} דקות`} />
          <MetaChip label={diffLabel} />
          {equipment && <MetaChip label={equipment} />}
        </div>

        {/* ── Training type selector ── */}
        <div
          style={{
            background: C.surface,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: '16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            עם מה תתאמן?
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 0 }}>
            בחר לפני תחילת האימון
          </div>
          <TrainingToggle value={trainingType} onChange={setTrainingType} />

          {/* Heavy bag warning */}
          {trainingType === 'bag' && (
            <div
              style={{
                marginTop: 12,
                background: C.orange + '1A',
                border: `1px solid ${C.orange}55`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: C.orange,
                fontWeight: 600,
              }}
            >
              🥊 זכור: רצועות וכפפות חובה!
            </div>
          )}
        </div>

        {/* ── Workout structure ── */}
        {workout.rounds && workout.rounds.length > 0 && (
          <div
            style={{
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, color: C.muted }}>
                {workRounds.length} סיבובי עבודה
              </span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>מבנה האימון</span>
            </div>
            {workout.rounds.map((round, idx) => (
              <RoundStructureRow key={round.id ?? idx} round={round} index={idx} />
            ))}
          </div>
        )}

        {/* ── Safety notes ── */}
        {workout.safetyNotesHe && workout.safetyNotesHe.length > 0 && (
          <div
            style={{
              background: C.surface,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              padding: '16px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>בטיחות</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {workout.safetyNotesHe.map((note, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    lineHeight: 1.6,
                    padding: '4px 0',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: 2 }}>•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Start button ── */}
        <button
          className="btn-tactile"
          onClick={() => trainingType && onStart(trainingType)}
          disabled={!trainingType}
          style={{
            width: '100%',
            background: trainingType ? C.accent : C.border,
            color: trainingType ? '#111317' : C.muted,
            border: 'none',
            borderRadius: 14,
            padding: '16px 0',
            fontSize: 17,
            fontWeight: 800,
            cursor: trainingType ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            letterSpacing: 0.3,
          }}
        >
          {trainingType ? 'התחל אימון ←' : 'בחר סוג אימון תחילה'}
        </button>
      </div>
    </div>
  )
}
