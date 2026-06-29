import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUserPrefs } from '../context/UserContext'
import { saveProfile } from '../services/focusTriggerService'
import { CHALLENGES, CHALLENGE_WEEKS, LESSON_TYPES, getDayTask, getLessonType, getModuleIndex } from '../data/challenges'

const todayKey = () => new Date().toISOString().slice(0, 10)

const MIN_REFLECTION = 20

// ── Lesson Modal ───────────────────────────────────────────────────

function LessonModal({ challenge, dayNum, onComplete, onClose }) {
  const [reflection, setReflection] = useState('')
  const [done,       setDone]       = useState(false)
  const lessonType = getLessonType(dayNum)
  const moduleTheme = getDayTask(challenge.id, dayNum)
  const canSubmit  = reflection.trim().length >= MIN_REFLECTION

  function handleComplete() {
    if (!canSubmit) return
    setDone(true)
    setTimeout(() => onComplete(reflection), 1200)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }}
      onClick={e => e.target === e.currentTarget && !done && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 480, background: '#13131f', borderRadius: '22px 22px 0 0', padding: '1.5rem 1.5rem 2.5rem', borderTop: `3px solid ${challenge.color}55`, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>{lessonType.icon}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.95rem' }}>{lessonType.label}</div>
              <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {challenge.emoji} {challenge.title} · יום {dayNum}
              </div>
            </div>
          </div>
          {!done && (
            <button onClick={onClose} className="btn-tactile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(241,245,249,0.6)', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, minHeight: 44 }}>✕ סגור</button>
          )}
        </div>

        {/* Lesson content */}
        <div style={{ background: `${challenge.color}10`, border: `1px solid ${challenge.color}25`, borderRadius: 14, padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>שיעור היום</p>
          <p style={{ color: '#f1f5f9', fontSize: '0.92rem', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{moduleTheme}</p>
        </div>

        {/* Key insight */}
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>💡</span>
          <p style={{ color: 'rgba(241,245,249,0.65)', fontSize: '0.8rem', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>{lessonType.insight}</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <p style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem' }}>קיבלת +{challenge.xpPerDay} XP!</p>
            <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.78rem' }}>שיעור {dayNum} הושלם</p>
          </div>
        ) : (
          <>
            <label style={{ display: 'block', color: 'rgba(241,245,249,0.38)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              מה לקחת מהשיעור?
            </label>
            <textarea
              autoFocus
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="מה באמת נשאר אתך? תהיה כן — אפילו משפט אחד אמיתי עדיף על פסקה מלוטשת."
              rows={4}
              className="glow-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 0.95rem', borderRadius: 11, border: `1px solid ${reflection.trim().length >= MIN_REFLECTION ? challenge.color + '55' : 'rgba(255,255,255,0.09)'}`, background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.55, marginBottom: '0.4rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.65rem', color: reflection.trim().length >= MIN_REFLECTION ? '#10b981' : 'rgba(241,245,249,0.2)' }}>
                {reflection.trim().length} / {MIN_REFLECTION} תווים לפחות
              </span>
            </div>
            <button
              onClick={handleComplete}
              disabled={!canSubmit}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none', background: canSubmit ? `linear-gradient(135deg,${challenge.color},${challenge.color}bb)` : 'rgba(255,255,255,0.05)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              סיום שיעור · +{challenge.xpPerDay} XP ←
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Track Detail (Syllabus) ────────────────────────────────────────

function TrackDetail({ challenge, progress, onBack, onLessonComplete, isRecommended }) {
  const [lessonModal, setLessonModal] = useState(null)
  const daysCompleted = progress?.daysCompleted || 0
  const finished      = daysCompleted >= challenge.days
  const doneToday     = progress?.lastCompletedDate === todayKey()
  const pct = Math.round((daysCompleted / challenge.days) * 100)
  const modules = CHALLENGE_WEEKS[challenge.id] || []

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>

      {/* Back button */}
      <button
        onClick={onBack}
        className="btn-tactile"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 22, padding: '0.5rem 1rem 0.5rem 0.75rem', color: 'rgba(241,245,249,0.75)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1.25rem' }}
      >
        ← כל המסלולים
      </button>

      {/* Track hero */}
      <div style={{ background: `linear-gradient(135deg,${challenge.color}18,${challenge.color}08)`, border: `1px solid ${challenge.color}30`, borderRadius: '20px 16px 22px 14px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: `0 4px 24px ${challenge.color}18` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: `${challenge.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>{challenge.emoji}</div>
          <div style={{ flex: 1 }}>
            {isRecommended && (
              <div style={{ marginBottom: '0.3rem' }}>
                <span style={{ background: 'linear-gradient(90deg,#c4795a,#d4956e)', borderRadius: 20, padding: '0.15rem 0.6rem', color: '#fff', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em' }}>✨ מותאם עבורך</span>
              </div>
            )}
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.05rem' }}>{challenge.title}</div>
            <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.75rem', marginTop: '0.1rem' }}>{challenge.subtitle}</div>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${challenge.color}99,${challenge.color})`, width: `${pct}%`, transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {daysCompleted}/{challenge.days} ימים · {pct}%
          </span>
        </div>
      </div>

      {/* Syllabus modules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {modules.map((moduleTheme, moduleIdx) => {
          const startDay   = moduleIdx * 5 + 1
          const moduleNum  = moduleIdx + 1
          const moduleDone = daysCompleted >= startDay + 4
          const moduleStarted = daysCompleted >= startDay
          const moduleLocked  = daysCompleted < startDay - 1

          return (
            <div key={moduleIdx}>
              {/* Module header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem', paddingLeft: '0.1rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: moduleDone ? 'rgba(16,185,129,0.2)' : moduleLocked ? 'rgba(255,255,255,0.06)' : `${challenge.color}22`, border: moduleDone ? '1px solid rgba(16,185,129,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: moduleDone ? '#10b981' : moduleLocked ? 'rgba(255,255,255,0.2)' : challenge.color, flexShrink: 0 }}>
                  {moduleDone ? '✓' : moduleNum}
                </div>
                <span style={{ color: moduleLocked ? 'rgba(241,245,249,0.2)' : moduleDone ? 'rgba(241,245,249,0.5)' : '#f1f5f9', fontSize: '0.8rem', fontWeight: 700 }}>
                  מודול {moduleNum}
                </span>
                <span style={{ color: 'rgba(241,245,249,0.22)', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {moduleTheme.slice(0, 45)}{moduleTheme.length > 45 ? '…' : ''}</span>
              </div>

              {/* Day rows */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
                {LESSON_TYPES.map((lt, dayOffset) => {
                  const dayNum    = startDay + dayOffset
                  const completed = daysCompleted >= dayNum
                  const isCurrent = daysCompleted === dayNum - 1
                  const locked    = !completed && !isCurrent

                  return (
                    <div
                      key={dayNum}
                      onClick={() => !locked && setLessonModal(dayNum)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderBottom: dayOffset < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        cursor: locked ? 'default' : 'pointer',
                        background: isCurrent ? `${challenge.color}0d` : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!locked) e.currentTarget.style.background = `${challenge.color}15` }}
                      onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? `${challenge.color}0d` : 'transparent' }}
                    >
                      {/* Status icon */}
                      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: completed ? '0.85rem' : '1rem', background: completed ? 'rgba(16,185,129,0.15)' : isCurrent ? `${challenge.color}22` : 'rgba(255,255,255,0.04)', border: isCurrent ? `1px solid ${challenge.color}40` : 'none' }}>
                        {completed ? '✓' : locked ? '🔒' : lt.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: locked ? 'rgba(241,245,249,0.2)' : completed ? 'rgba(241,245,249,0.45)' : '#f1f5f9', fontSize: '0.83rem', fontWeight: isCurrent ? 700 : 500 }}>
                            יום {dayNum} · {lt.label}
                          </span>
                          {isCurrent && (
                            <span style={{ background: `${challenge.color}22`, border: `1px solid ${challenge.color}40`, borderRadius: 20, padding: '0.08rem 0.4rem', color: challenge.color, fontSize: '0.58rem', fontWeight: 800 }}>היום</span>
                          )}
                        </div>
                        {!locked && (
                          <div style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.7rem', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {moduleTheme.slice(0, 55)}{moduleTheme.length > 55 ? '…' : ''}
                          </div>
                        )}
                      </div>

                      {/* Action badge */}
                      {!locked && !completed && isCurrent && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                          <span style={{ background: `linear-gradient(135deg,${challenge.color}cc,${challenge.color})`, borderRadius: 20, padding: '0.2rem 0.6rem', color: '#fff', fontSize: '0.62rem', fontWeight: 800 }}>← השלם</span>
                          <span style={{ color: challenge.color, fontSize: '0.6rem', fontWeight: 700 }}>+{challenge.xpPerDay} XP</span>
                        </div>
                      )}
                      {!locked && !completed && !isCurrent && (
                        <span style={{ color: challenge.color, fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>+{challenge.xpPerDay} XP</span>
                      )}
                      {completed && (
                        <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>הושלם</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Sticky bottom CTA ── */}
      {!finished && (
        <div style={{ position: 'sticky', bottom: 64, zIndex: 50, paddingTop: '1.25rem', paddingBottom: '0.5rem', background: 'linear-gradient(to bottom, transparent, #0e0e16 35%)' }}>
          {doneToday ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span>✓</span>
              <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700 }}>יום {daysCompleted} הושלם היום</span>
            </div>
          ) : (
            <button
              className="btn-primary btn-tactile"
              onClick={() => setLessonModal(daysCompleted + 1)}
              style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.97rem', fontWeight: 800, letterSpacing: '0.01em' }}
            >
              התחל אימון — יום {daysCompleted + 1} ←
            </button>
          )}
        </div>
      )}

      {lessonModal && (
        <LessonModal
          challenge={challenge}
          dayNum={lessonModal}
          onComplete={reflection => {
            setLessonModal(null)
            onLessonComplete(challenge, lessonModal, reflection)
          }}
          onClose={() => setLessonModal(null)}
        />
      )}
    </div>
  )
}

// ── Track Library (grid) ───────────────────────────────────────────

function TrackLibrary({ challenges, getProgress, onSelect, recommendedId }) {
  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>מסלולי למידה</h2>
        <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.8rem', marginTop: '0.2rem' }}>תבחר אחד. תלך לעומק. כל השאר רעש.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {challenges.map(ch => {
          const prog  = getProgress(ch.id)
          const days  = prog?.daysCompleted || 0
          const pct   = Math.round((days / ch.days) * 100)
          const isRec = ch.id === recommendedId

          return (
            <div
              key={ch.id}
              className="track-card"
              onClick={() => onSelect(ch)}
              style={{
                background: isRec ? `linear-gradient(135deg,${ch.color}10,rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isRec ? ch.color + '30' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '18px 14px 16px 20px', padding: '1rem 1.1rem',
                boxShadow: isRec ? `0 4px 20px ${ch.color}15` : '0 2px 10px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${ch.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, boxShadow: `0 2px 8px ${ch.color}25` }}>{ch.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>{ch.title}</span>
                    {isRec && <span style={{ background: 'linear-gradient(90deg,#c4795a,#d4956e)', borderRadius: 20, padding: '0.1rem 0.45rem', color: '#fff', fontSize: '0.58rem', fontWeight: 800 }}>✨ בשבילך</span>}
                    {days >= ch.days && <span style={{ color: '#10b981', fontSize: '0.58rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', borderRadius: 20, padding: '0.1rem 0.4rem' }}>✓ הושלם</span>}
                  </div>
                  <div style={{ color: 'rgba(241,245,249,0.28)', fontSize: '0.7rem', marginTop: '0.1rem' }}>{ch.subtitle}</div>
                  {days > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${ch.color}88,${ch.color})`, width: `${pct}%` }} />
                      </div>
                      <span style={{ color: 'rgba(241,245,249,0.25)', fontSize: '0.63rem', fontWeight: 700 }}>{days}d</span>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ color: ch.color, fontSize: '0.7rem', fontWeight: 800 }}>+{ch.xpPerDay} XP</div>
                  <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.6rem' }}>/ יום</div>
                  <div style={{ color: 'rgba(241,245,249,0.2)', fontSize: '0.6rem', marginTop: '0.25rem' }}>{ch.days} שיעורים ←</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TracksPage ─────────────────────────────────────────────────────

export default function TracksPage({ profile, onAwardXP, onSaveProfile }) {
  const { user, isGuest }  = useAuth()
  const { prefs }          = useUserPrefs()
  const [selected, setSelected] = useState(null)

  const recommendedId = prefs.recommendedTrack || profile?.preferences?.recommendedTrack

  function getProgress(id) { return profile?.challenges?.[id] }

  async function handleLessonComplete(challenge, dayNum, reflection) {
    if (isGuest) { onAwardXP(challenge.xpPerDay, true); return }
    const today    = todayKey()
    const prev     = profile?.challenges?.[challenge.id] || {}
    if (prev.lastCompletedDate === today) return
    const daysCompleted   = Math.min((prev.daysCompleted || 0) + 1, challenge.days)
    const challengeUpdate = { ...(profile?.challenges || {}), [challenge.id]: { daysCompleted, lastCompletedDate: today } }
    onSaveProfile({ challenges: challengeUpdate })
    if (!isGuest) await saveProfile(user.uid, { challenges: challengeUpdate }).catch(() => {})
    onAwardXP(challenge.xpPerDay, false)
  }

  const TAB_H = 64

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: `1.25rem 1.25rem ${selected ? TAB_H + 88 : TAB_H + 20}px` }}>
      {selected ? (
        <TrackDetail
          challenge={selected}
          progress={getProgress(selected.id)}
          isRecommended={selected.id === recommendedId}
          onBack={() => setSelected(null)}
          onLessonComplete={handleLessonComplete}
        />
      ) : (
        <TrackLibrary
          challenges={CHALLENGES}
          getProgress={getProgress}
          onSelect={setSelected}
          recommendedId={recommendedId}
        />
      )}
    </div>
  )
}
