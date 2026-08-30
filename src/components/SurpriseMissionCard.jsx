import { useState, useCallback } from 'react'
import { XP } from '../config/xp'
import { pickRandomMission, DEFAULT_ENABLED_CATEGORIES, getMissionMeta, bumpCategoryWeight } from '../data/surpriseMissions'
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

export default function SurpriseMissionCard({ enabledCategories, isGuest, onAwardXP, onConvertToHabit }) {
  const cats = enabledCategories?.length ? enabledCategories : DEFAULT_ENABLED_CATEGORIES

  const [state, setState]     = useState(() => loadTodayState())
  const [collapsed, setCollapsed] = useState(!state)
  const [animating, setAnimating] = useState(false)
  // post-completion prompts
  const [showConvert, setShowConvert]   = useState(false)
  const [showMoreLike, setShowMoreLike] = useState(false)
  const [moreLikeDone, setMoreLikeDone] = useState(false)

  const generateMission = useCallback((excludeExtra = []) => {
    const recent = loadRecent()
    const mission = pickRandomMission(cats, [...recent, ...excludeExtra])
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
    // show post-completion prompts if metadata available
    const meta = getMissionMeta(next.missionId)
    if (meta && onConvertToHabit) setShowConvert(true)
    else setShowMoreLike(true)
  }

  function handleSkip() {
    setCollapsed(true)
  }

  function handleConvertToHabit() {
    const meta = getMissionMeta(state?.missionId)
    if (!meta || !onConvertToHabit) return
    setShowConvert(false)
    onConvertToHabit({ titleHe: meta.suggestedHabitTitleHe, triggerSuggestionHe: meta.suggestedTriggerHe, pillar: meta.pillar })
  }

  function handleMoreLike() {
    const cat = inferCategory(state?.missionId)
    if (cat) bumpCategoryWeight(cat)
    setMoreLikeDone(true)
    setShowMoreLike(false)
    setShowConvert(false)
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
    const meta = getMissionMeta(state.missionId)
    return (
      <div style={{ background: '#111317', border: '1px solid rgba(63,175,122,0.2)', borderRadius: 14, padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: (showConvert || showMoreLike || moreLikeDone) ? '0.85rem' : 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(63,175,122,0.1)', border: '1px solid rgba(63,175,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🎲</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>משימת הפתעה — הושלמה</div>
            <div style={{ color: '#A4A6AD', fontSize: '0.82rem', lineHeight: 1.45, textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.15)' }}>{state.missionText}</div>
          </div>
          <div style={{ color: '#3FAF7A', fontWeight: 900, fontSize: '0.88rem', flexShrink: 0 }}>✓</div>
        </div>

        {/* "Convert to habit" prompt */}
        {showConvert && meta && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <div style={{ color: '#A4A6AD', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>רוצה להפוך את זה להרגל?</div>
            <div style={{ color: '#71717A', fontSize: '0.7rem', marginBottom: '0.6rem' }}>{meta.suggestedHabitTitleHe}</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={handleConvertToHabit} className="btn-tactile" style={{ flex: 1, padding: '0.6rem', borderRadius: 9, border: '1px solid rgba(217,179,76,0.3)', background: 'rgba(217,179,76,0.08)', color: '#D9B34C', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
                הפוך להרגל ✓
              </button>
              <button onClick={() => { setShowConvert(false); setShowMoreLike(true) }} style={{ flex: 1, padding: '0.6rem', borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#71717A', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                לא עכשיו
              </button>
            </div>
          </div>
        )}

        {/* "More like this" prompt */}
        {showMoreLike && !moreLikeDone && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ color: '#71717A', fontSize: '0.75rem' }}>רוצה עוד משימות מהסוג הזה?</span>
            <button onClick={handleMoreLike} className="btn-tactile" style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#A4A6AD', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}>
              כן, בבקשה
            </button>
          </div>
        )}

        {moreLikeDone && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem', color: '#3FAF7A', fontSize: '0.72rem', fontWeight: 700 }}>
            ✓ נרשמה ההעדפה — יהיו יותר כאלה
          </div>
        )}
      </div>
    )
  }

  // ── Active mission ────────────────────────────────────────────────
  return (
    <div style={{ background: '#111317', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1rem 1.1rem', animation: animating ? 'slide-up 0.3s ease both' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
        <span style={{ color: '#71717A', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎲 משימת הפתעה</span>
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
