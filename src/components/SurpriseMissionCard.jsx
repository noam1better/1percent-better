import { useState, useCallback } from 'react'
import { XP } from '../config/xp'
import { pickRandomMission, DEFAULT_ENABLED_CATEGORIES, getMissionMeta, bumpCategoryWeight, getCategoryWeights, getMissionCategory, PILLAR_LABELS } from '../data/surpriseMissions'
import { SURPRISE_CATEGORIES } from '../data/surpriseMissions'

const RECENT_KEY  = 'prime_surprise_recent'
const RECENT_MAX  = 20

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function storageKey() {
  return `prime_surprise_${todayKey()}`
}

function loadTodayState() {
  try { return JSON.parse(localStorage.getItem(storageKey())) || null } catch { return null }
}

function saveTodayState(state) {
  try { localStorage.setItem(storageKey(), JSON.stringify(state)) } catch {}
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] } catch { return [] }
}

function pushRecent(missionId) {
  try {
    const prev = loadRecent()
    const next = [missionId, ...prev.filter(id => id !== missionId)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

// Infer category from mission id prefix (e.g. "fitness_3" → "fitness")
function inferCategory(missionId = '') {
  return SURPRISE_CATEGORIES.find(c => missionId.startsWith(c.id))?.id || null
}

// Derive a short habit title from the full mission text
function derivedHabitTitle(missionText = '') {
  const dash = missionText.indexOf(' — ')
  const colon = missionText.indexOf(': ')
  const cut = [dash, colon].filter(i => i > 5).sort((a, b) => a - b)[0]
  return cut ? missionText.slice(0, cut) : missionText.slice(0, 50)
}

export default function SurpriseMissionCard({ enabledCategories, isGuest, onAwardXP, onConvertToHabit }) {
  const cats = enabledCategories?.length ? enabledCategories : DEFAULT_ENABLED_CATEGORIES

  const [state, setState]     = useState(() => loadTodayState())
  const [collapsed, setCollapsed] = useState(!state)
  const [animating, setAnimating] = useState(false)
  // post-completion
  const [showPostComplete, setShowPostComplete] = useState(false)
  const [convertLoading,   setConvertLoading]   = useState(false)
  const [habitConvertResult, setHabitConvertResult] = useState(null)
  const [moreLikeDone,     setMoreLikeDone]     = useState(false)

  const generateMission = useCallback((excludeExtra = []) => {
    const recent  = loadRecent()
    const weights = getCategoryWeights()
    const mission = pickRandomMission(cats, [...recent, ...excludeExtra], weights)
    if (!mission) return null
    pushRecent(mission.id)
    return mission
  }, [cats])

  function handleReveal() {
    if (isGuest) { onAwardXP?.('signin'); return }
    const mission = generateMission()
    if (!mission) return
    const next = { missionId: mission.id, missionText: mission.text, replacementUsed: false, completed: false, xpAwarded: false }
    saveTodayState(next)
    setState(next)
    setCollapsed(false)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 400)
  }

  function handleReplace() {
    if (!state || state.replacementUsed) return
    const mission = generateMission([state.missionId])
    if (!mission) return
    const next = { ...state, missionId: mission.id, missionText: mission.text, replacementUsed: true }
    saveTodayState(next)
    setState(next)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 400)
  }

  function handleComplete() {
    if (!state || state.completed) return
    const next = { ...state, completed: true, xpAwarded: true }
    saveTodayState(next)
    setState(next)
    if (!isGuest) onAwardXP?.(XP.SURPRISE_MISSION)
    setShowPostComplete(true)
  }

  function handleSkip() {
    setCollapsed(true)
  }

  async function handleConvertToHabit() {
    if (!onConvertToHabit || convertLoading || habitConvertResult?.success) return
    const meta     = getMissionMeta(state?.missionId)
    const category = getMissionCategory(state?.missionId)
    const prefill  = meta
      ? { titleHe: meta.suggestedHabitTitleHe, pillar: meta.pillar }
      : { titleHe: derivedHabitTitle(state?.missionText || ''), pillar: category }
    setConvertLoading(true)
    const result = await onConvertToHabit(prefill)
    setConvertLoading(false)
    setHabitConvertResult(result || { error: 'unknown' })
  }

  function handleMoreLike() {
    if (moreLikeDone) return
    const cat = inferCategory(state?.missionId)
    if (cat) bumpCategoryWeight(cat)
    setMoreLikeDone(true)
  }

  // ── Collapsed prompt ──────────────────────────────────────────────
  if (collapsed) {
    return (
      <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div style={{ color: '#F4F1E8', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.15rem' }}>🎲 בא לך לצאת מהשגרה?</div>
          <div style={{ color: '#71717A', fontSize: '0.7rem' }}>משימת הפתעה — {XP.SURPRISE_MISSION} XP בונוס</div>
        </div>
        <button onClick={handleReveal} className="btn-tactile" style={{ background: '#17191E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#A4A6AD', fontSize: '0.8rem', fontWeight: 800, padding: '0.5rem 0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 40 }}>
          גלה משימה ←
        </button>
      </div>
    )
  }

  // ── Completed ─────────────────────────────────────────────────────
  if (state?.completed) {
    const category      = getMissionCategory(state.missionId)
    const categoryLabel = category ? PILLAR_LABELS[category] : null
    const convertDisabled = convertLoading || !!habitConvertResult?.success
    return (
      <div style={{ background: '#111317', border: '1px solid rgba(63,175,122,0.2)', borderRadius: 14, padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: showPostComplete ? '0.85rem' : 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(63,175,122,0.1)', border: '1px solid rgba(63,175,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎲</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <span style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>משימת הפתעה — הושלמה</span>
              {categoryLabel && (
                <span style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 600, background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '0.05rem 0.35rem' }}>{categoryLabel}</span>
              )}
            </div>
            <div style={{ color: '#A4A6AD', fontSize: '0.82rem', lineHeight: 1.45, textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.15)' }}>{state.missionText}</div>
          </div>
          <div style={{ color: '#3FAF7A', fontWeight: 900, fontSize: '0.88rem', flexShrink: 0 }}>✓</div>
        </div>

        {showPostComplete && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <div style={{ color: '#A4A6AD', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.55rem' }}>אהבת את המשימה?</div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: (habitConvertResult || moreLikeDone) ? '0.55rem' : 0 }}>
              {onConvertToHabit && (
                <button
                  onClick={handleConvertToHabit}
                  disabled={convertDisabled}
                  className={convertDisabled ? '' : 'btn-tactile'}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: 9,
                    border: `1px solid ${habitConvertResult?.success ? 'rgba(63,175,122,0.3)' : 'rgba(217,179,76,0.3)'}`,
                    background: habitConvertResult?.success ? 'rgba(63,175,122,0.08)' : 'rgba(217,179,76,0.08)',
                    color: habitConvertResult?.success ? '#3FAF7A' : '#D9B34C',
                    fontSize: '0.78rem', fontWeight: 800,
                    cursor: convertDisabled ? 'default' : 'pointer',
                    opacity: convertDisabled ? 0.6 : 1,
                  }}
                >
                  {convertLoading ? '...' : habitConvertResult?.success ? '✓ נוסף' : 'הפוך להרגל'}
                </button>
              )}
              <button
                onClick={handleMoreLike}
                disabled={moreLikeDone}
                className={moreLikeDone ? '' : 'btn-tactile'}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 9,
                  border: `1px solid ${moreLikeDone ? 'rgba(63,175,122,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  background: 'transparent',
                  color: moreLikeDone ? '#3FAF7A' : '#71717A',
                  fontSize: '0.78rem', fontWeight: 700,
                  cursor: moreLikeDone ? 'default' : 'pointer',
                  opacity: moreLikeDone ? 0.6 : 1,
                }}
              >
                {moreLikeDone ? '✓ נרשם' : 'גלה עוד בתחום'}
              </button>
            </div>

            {/* Inline result messages */}
            {habitConvertResult?.success && (
              <div style={{ color: '#3FAF7A', fontSize: '0.72rem', fontWeight: 700 }}>
                ✓ הרגל נוסף — נראה אותך מחר!
              </div>
            )}
            {habitConvertResult?.error === 'limit' && (
              <div style={{ color: '#f97316', fontSize: '0.72rem', fontWeight: 600 }}>
                כבר יש לך 3 הרגלים פעילים — הסר אחד לפני הוספה
              </div>
            )}
            {habitConvertResult?.error === 'duplicate' && (
              <div style={{ color: '#71717A', fontSize: '0.72rem', fontWeight: 600 }}>
                ההרגל הזה כבר קיים אצלך
              </div>
            )}
            {habitConvertResult?.error === 'save-failed' && (
              <div style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}>
                שגיאה בשמירה — נסה שוב
              </div>
            )}
            {moreLikeDone && (
              <div style={{ color: '#3FAF7A', fontSize: '0.72rem', fontWeight: 700, marginTop: habitConvertResult ? '0.35rem' : 0 }}>
                הבנתי — נציע לך יותר משימות בתחום הזה.
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Active mission ────────────────────────────────────────────────
  const activeCategory      = state ? getMissionCategory(state.missionId) : null
  const activeCategoryLabel = activeCategory ? PILLAR_LABELS[activeCategory] : null

  return (
    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1rem 1.1rem', animation: animating ? 'slide-up 0.3s ease both' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎲 משימת הפתעה</span>
          {activeCategoryLabel && (
            <span style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '0.05rem 0.35rem' }}>{activeCategoryLabel}</span>
          )}
        </div>
        <span style={{ color: '#D9B34C', fontSize: '0.65rem', fontWeight: 800 }}>+{XP.SURPRISE_MISSION} XP</span>
      </div>

      <div style={{ color: '#F4F1E8', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.5, marginBottom: '1rem' }}>
        {state?.missionText}
      </div>

      <button onClick={handleComplete} className="btn-tactile" style={{ width: '100%', padding: '0.85rem', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#1a5c3a,#237a4c)', color: '#d1fae5', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer', marginBottom: '0.55rem' }}>
        ✓ סיימתי!
      </button>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!state?.replacementUsed && (
          <button onClick={handleReplace} className="btn-tactile" style={{ flex: 1, padding: '0.65rem', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#71717A', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', minHeight: 40 }}>
            🔀 החלף (פעם אחת)
          </button>
        )}
        <button onClick={handleSkip} style={{ flex: 1, padding: '0.65rem', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#71717A', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', minHeight: 40 }}>
          פעם אחרת
        </button>
      </div>
    </div>
  )
}
