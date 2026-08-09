import { useState, useEffect, useCallback } from 'react'
import {
  getMySquad, createSquad, joinSquadByCode,
  getSquadLeaderboard, createChallenge,
} from '../services/squadService'
import { notifyChallenge } from '../services/telegramService'

const RANK_MEDAL = n => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : null

// ── Invite code row with clipboard copy ──────────────────────────────
function InviteCodeBox({ inviteCode }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 12 }}>
      <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>קוד הזמנה:</span>
      <span style={{ color: '#F5C518', fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '0.88rem', fontWeight: 900, letterSpacing: '0.15em', flex: 1 }}>{inviteCode}</span>
      <button
        onClick={copy}
        className="btn-tactile"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'rgba(241,245,249,0.35)', fontSize: '0.82rem', padding: '0.1rem 0.25rem', flexShrink: 0, transition: 'color 0.2s ease' }}
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  )
}

// ── Join / Create flow ────────────────────────────────────────────────
function SquadSetup({ uid, userName, onJoined }) {
  const [mode,  setMode]  = useState(null)
  const [input, setInput] = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    if (!input.trim()) return
    setBusy(true); setError(null)
    try {
      await createSquad(uid, userName, input.trim())
      const squad = await getMySquad(uid)
      onJoined(squad)
    } catch { setError('יצירה נכשלה — נסה שוב') }
    finally { setBusy(false) }
  }

  async function handleJoin() {
    if (input.length < 4) return
    setBusy(true); setError(null)
    try {
      await joinSquadByCode(uid, userName, input.trim())
      const squad = await getMySquad(uid)
      onJoined(squad)
    } catch (e) {
      setError(e.message === 'invite_not_found' ? 'קוד לא נמצא' : 'הצטרפות נכשלה')
    }
    finally { setBusy(false) }
  }

  if (!mode) return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button onClick={() => setMode('create')} className="btn-tactile"
        style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
        + צור סקווד
      </button>
      <button onClick={() => setMode('join')} className="btn-tactile"
        style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(241,245,249,0.7)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
        הכנס קוד
      </button>
    </div>
  )

  const isCreate = mode === 'create'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>
          {isCreate ? '+ צור סקווד' : 'הצטרף לסקווד'}
        </span>
        <button onClick={() => { setMode(null); setInput(''); setError(null) }} className="btn-tactile"
          style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.35)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
      </div>
      <input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && (isCreate ? handleCreate() : handleJoin())}
        placeholder={isCreate ? 'שם הסקווד...' : 'קוד הזמנה (6 תווים)'}
        maxLength={isCreate ? 40 : 8}
        className="glow-input"
        style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: 11, border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.09)'}`, background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '0.55rem' }}
      />
      {error && <div style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</div>}
      <button
        onClick={isCreate ? handleCreate : handleJoin}
        disabled={busy || !input.trim()}
        className="btn-primary btn-tactile"
        style={{ width: '100%', padding: '0.8rem', borderRadius: 12, fontSize: '0.88rem', fontWeight: 800, opacity: busy || !input.trim() ? 0.5 : 1 }}
      >
        {busy ? '...' : isCreate ? 'צור ←' : 'הצטרף ←'}
      </button>
    </div>
  )
}

// ── Main leaderboard ──────────────────────────────────────────────────
export default function SquadLeaderboard({ uid, userName }) {
  const [squad,       setSquad]       = useState(undefined)
  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [toastMsg,    setToastMsg]    = useState(null)
  const [challenging, setChallenging] = useState(null)

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2800)
  }

  const loadSquad = useCallback(async () => {
    if (!uid) return
    const s = await getMySquad(uid)
    setSquad(s)
    if (s) {
      setLoading(true)
      try {
        const lb = await getSquadLeaderboard(s)
        setEntries(lb)
      } finally { setLoading(false) }
    }
  }, [uid])

  useEffect(() => { loadSquad() }, [loadSquad])

  async function handleChallenge(target) {
    if (!squad) return
    setChallenging(target.uid)
    try {
      await createChallenge(uid, userName, target.uid, target.name, 'סקוואטים')
      await notifyChallenge({
        challengerName: userName,
        challengedName: target.name,
        exercise:       'סקוואטים',
        chatId:         squad.telegramChatId,
      })
      showToast(`🥊 אתגרת את ${target.name}!`)
    } catch {
      showToast('האתגר נכשל — נסה שוב')
    } finally { setChallenging(null) }
  }

  // ── Still loading ──
  if (squad === undefined) return null

  // ── No squad: arena waiting CTA ──
  if (!squad) return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 18, padding: '1.4rem 1.25rem 1.1rem', marginBottom: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🏟️</div>
        <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.92rem', marginBottom: '0.3rem' }}>הזירה מחכה לך</div>
        <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.75rem', lineHeight: 1.65 }}>
          הזמן חבר למסלול כדי לפתוח את לוח השיאים ולהתחרות.<br/>
          הלוח נפתח ברגע שיצטרף מתחרה נוסף.
        </div>
      </div>
      <div style={{ background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.15)', borderRadius: 16, padding: '1.1rem 1.15rem' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.75rem' }}>◈ צור או הצטרף לסקווד</div>
        <SquadSetup uid={uid} userName={userName} onJoined={loadSquad} />
      </div>
    </div>
  )

  // ── Solo squad: invite friend ──
  if (!loading && entries.length <= 1) return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '1.15rem', marginBottom: '1.1rem' }}>
      <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.85rem' }}>
        ◈ סקווד · {squad.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: '0.1rem' }}>🔒</div>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.25rem' }}>הלוח נעול — אין עדיין מתחרה</div>
          <div style={{ color: 'rgba(241,245,249,0.38)', fontSize: '0.73rem', lineHeight: 1.6 }}>
            שתף את קוד ההזמנה עם חבר כדי לפתוח את לוח השיאים השבועי ולהתחיל להתחרות.
          </div>
        </div>
      </div>
      <InviteCodeBox inviteCode={squad.inviteCode} />
    </div>
  )

  // ── Full leaderboard ──
  const myRank = entries.findIndex(e => e.uid === uid) + 1

  return (
    <>
      <div style={{ background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.16)', borderRadius: 18, padding: '1.1rem 1.15rem', marginBottom: '1.1rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ color: 'rgba(245,197,24,0.55)', fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace" }}>
              ◈ סקווד · {squad.name}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '0.92rem', marginTop: '0.1rem' }}>
              לוח שיאים שבועי
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {myRank > 0 && (
              <div style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 10, padding: '0.3rem 0.6rem', textAlign: 'center' }}>
                <div style={{ color: '#F5C518', fontSize: '0.95rem', fontWeight: 900, lineHeight: 1 }}>#{myRank}</div>
                <div style={{ color: 'rgba(245,197,24,0.45)', fontSize: '0.48rem', fontWeight: 700 }}>דירוג</div>
              </div>
            )}
            <button onClick={loadSquad} className="btn-tactile"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.4, padding: '0.2rem' }}>
              🔄
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '0.85rem' }}>
          <InviteCodeBox inviteCode={squad.inviteCode} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem' }}>טוען...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {entries.map((entry, i) => {
              const rank  = i + 1
              const isMe  = entry.uid === uid
              const medal = RANK_MEDAL(rank)
              return (
                <div key={entry.uid} style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.6rem 0.8rem',
                  background: isMe ? 'rgba(245,197,24,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isMe ? 'rgba(245,197,24,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12,
                }}>
                  <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <span style={{ fontSize: '1rem' }}>{medal}</span>
                      : <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.72rem', fontWeight: 700 }}>#{rank}</span>
                    }
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: isMe ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: isMe ? '#F5C518' : 'rgba(241,245,249,0.5)', fontWeight: 900, fontSize: '0.75rem' }}>
                      {entry.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isMe ? '#F5C518' : '#f1f5f9', fontWeight: isMe ? 800 : 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}{isMe && ' (אתה)'}
                    </div>
                    {Object.keys(entry.byExercise).length > 0 && (
                      <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', marginTop: '0.1rem' }}>
                        {Object.entries(entry.byExercise).map(([k, v]) => `${k} ${v}`).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ color: isMe ? '#F5C518' : '#f1f5f9', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>{entry.reps}</div>
                    <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.5rem', fontWeight: 700 }}>חזרות</div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => handleChallenge(entry)}
                      disabled={challenging === entry.uid}
                      className="btn-tactile"
                      title={`אתגר את ${entry.name}`}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '0.3rem 0.55rem', color: '#f87171', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0, opacity: challenging === entry.uid ? 0.5 : 1 }}
                    >
                      {challenging === entry.uid ? '...' : '🥊'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(245,197,24,0.35)', borderRadius: 12, padding: '0.65rem 1.1rem', zIndex: 4000, color: '#F5C518', fontSize: '0.82rem', fontWeight: 700, animation: 'fadeIn 0.2s ease', whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {toastMsg}
        </div>
      )}
    </>
  )
}
