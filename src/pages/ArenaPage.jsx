import { useState, useEffect } from 'react'
import SquadLeaderboard from '../components/SquadLeaderboard'
import { loadLeaderboard } from '../services/focusTriggerService'
import { getMySquad, getSquadsWorldWar } from '../services/squadService'

const TAB_H = 64
const RANK_MEDAL = n => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : null

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ padding: '1.25rem 1.25rem 0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '1.05rem' }}>{icon}</span>
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1rem', margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.7rem', margin: 0, paddingInlineStart: '1.5rem' }}>{subtitle}</p>}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0.25rem 1.25rem' }} />
}

function GlobalLeaderboard({ currentUid }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard().then(data => { setEntries(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem' }}>טוען...</div>
  )

  return (
    <div style={{ padding: '0 1.25rem 1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
        {entries.map((entry, i) => {
          const rank  = i + 1
          const isMe  = entry.uid === currentUid
          const medal = RANK_MEDAL(rank)
          return (
            <div key={entry.uid} style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.6rem 0.8rem',
              background: isMe ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 12,
            }}>
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                {medal
                  ? <span style={{ fontSize: '1rem' }}>{medal}</span>
                  : <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.72rem', fontWeight: 700 }}>#{rank}</span>
                }
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: isMe ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: isMe ? '#a5b4fc' : 'rgba(241,245,249,0.45)', fontWeight: 900, fontSize: '0.75rem' }}>
                  {(entry.name || '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isMe ? '#a5b4fc' : '#f1f5f9', fontWeight: isMe ? 800 : 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}{isMe && ' (אתה)'}
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ color: isMe ? '#a5b4fc' : '#f1f5f9', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>{(entry.xp || 0).toLocaleString()}</div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.5rem', fontWeight: 700 }}>XP</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SquadsWorldWar({ mySquadId }) {
  const [squads,  setSquads]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSquadsWorldWar().then(data => { setSquads(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'rgba(241,245,249,0.3)', fontSize: '0.78rem' }}>טוען...</div>
  )

  if (squads.length === 0) return (
    <div style={{ padding: '0 1.25rem 1rem' }}>
      <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 16 }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>⚔️</div>
        <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.2rem' }}>אין סקווד עדיין</div>
        <div style={{ color: 'rgba(241,245,249,0.35)', fontSize: '0.72rem', lineHeight: 1.65 }}>
          צור סקווד בחלק "הסקווד שלך" כדי להצטרף לקרב.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 1.25rem 1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
        {squads.map((squad, i) => {
          const rank      = i + 1
          const isMySquad = squad.squadId === mySquadId
          const medal     = RANK_MEDAL(rank)
          return (
            <div key={squad.squadId} style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.65rem 0.85rem',
              background: isMySquad ? 'rgba(245,197,24,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isMySquad ? 'rgba(245,197,24,0.22)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 12,
            }}>
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                {medal
                  ? <span style={{ fontSize: '1rem' }}>{medal}</span>
                  : <span style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.72rem', fontWeight: 700 }}>#{rank}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isMySquad ? '#F5C518' : '#f1f5f9', fontWeight: isMySquad ? 800 : 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {squad.name}{isMySquad && ' (הסקווד שלך)'}
                </div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.6rem', marginTop: '0.1rem' }}>
                  {squad.memberCount} {squad.memberCount === 1 ? 'חבר' : 'חברים'}
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ color: isMySquad ? '#F5C518' : '#f1f5f9', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>{squad.totalReps.toLocaleString()}</div>
                <div style={{ color: 'rgba(241,245,249,0.3)', fontSize: '0.5rem', fontWeight: 700 }}>חזרות</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ArenaPage({ uid, userName, isGuest }) {
  const [mySquadId, setMySquadId] = useState(null)

  useEffect(() => {
    if (!uid || isGuest) return
    getMySquad(uid).then(s => { if (s) setMySquadId(s.squadId) })
  }, [uid, isGuest])

  return (
    <div dir="rtl" style={{ minHeight: '100svh', paddingBottom: TAB_H + 16 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.25rem 0.5rem', background: 'linear-gradient(180deg, rgba(245,197,24,0.05) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ color: 'rgba(245,197,24,0.5)', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'SF Mono','Fira Code',monospace", marginBottom: '0.3rem' }}>◈ PRIME ARENA</div>
        <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.55rem', margin: 0, letterSpacing: '-0.02em' }}>הזירה 🏟️</h1>
        <p style={{ color: 'rgba(241,245,249,0.32)', fontSize: '0.73rem', marginTop: '0.3rem' }}>תתחרה. השתפר. נצח.</p>
      </div>

      {/* ── Section 1: Your Squad ── */}
      <SectionHeader icon="⚔️" title="הסקווד שלך" subtitle="צוות חברים · לוח שיאים שבועי" />
      <div style={{ padding: '0 1.25rem 0.25rem' }}>
        {isGuest ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 16 }}>
            <div style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.8rem' }}>התחבר כדי להצטרף לסקווד</div>
          </div>
        ) : (
          <SquadLeaderboard uid={uid} userName={userName} />
        )}
      </div>

      <Divider />

      {/* ── Section 2: Global Leaderboard ── */}
      <SectionHeader icon="🌍" title="טבלה גלובלית" subtitle="דירוג כל המשתמשים לפי XP" />
      <GlobalLeaderboard currentUid={uid} />

      <Divider />

      {/* ── Section 3: Squads World War ── */}
      <SectionHeader icon="🌐" title="מלחמת הסקווד העולמית" subtitle="הסקווד שלך נגד כולם · חזרות שבועיות" />
      <SquadsWorldWar mySquadId={mySquadId} />
    </div>
  )
}
