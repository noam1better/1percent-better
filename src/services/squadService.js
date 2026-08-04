import {
  doc, getDoc, setDoc, updateDoc, getDocs,
  collection, query, where, arrayUnion,
} from 'firebase/firestore'
import { db } from './firebase'

const TODAY = () => new Date().toISOString().slice(0, 10)

function getWeekKey() {
  const d = new Date()
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ── Squad CRUD ────────────────────────────────────────────────────────

export async function createSquad(uid, userName, squadName) {
  const inviteCode = randomCode()
  const ref = doc(collection(db, 'squads'))
  await setDoc(ref, {
    name:          squadName.trim().slice(0, 40),
    createdBy:     uid,
    inviteCode,
    memberUids:    [uid],
    members:       { [uid]: { name: userName.trim().slice(0, 30), joinedAt: TODAY() } },
    telegramChatId: null,
    createdAt:     TODAY(),
  })
  return { squadId: ref.id, inviteCode }
}

export async function joinSquadByCode(uid, userName, code) {
  const q    = query(collection(db, 'squads'), where('inviteCode', '==', code.toUpperCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('invite_not_found')
  const squadDoc = snap.docs[0]
  await updateDoc(doc(db, 'squads', squadDoc.id), {
    memberUids:              arrayUnion(uid),
    [`members.${uid}`]:      { name: userName.trim().slice(0, 30), joinedAt: TODAY() },
  })
  return { squadId: squadDoc.id, squadName: squadDoc.data().name }
}

export async function getMySquad(uid) {
  try {
    const q    = query(collection(db, 'squads'), where('memberUids', 'array-contains', uid))
    const snap = await getDocs(q)
    if (snap.empty) return null
    return { squadId: snap.docs[0].id, ...snap.docs[0].data() }
  } catch { return null }
}

export async function setSquadTelegramChat(squadId, telegramChatId) {
  await updateDoc(doc(db, 'squads', squadId), { telegramChatId })
}

// ── Weekly reps (public — like XP leaderboard) ────────────────────────

export async function syncWeeklyReps(uid, name, exerciseId, repsAdded) {
  const wk  = getWeekKey()
  const ref  = doc(db, 'weeklyReps', uid)
  const snap = await getDoc(ref)
  const prev = snap.data() || {}
  const isCurrentWeek = prev.weekKey === wk
  const prevTotal = isCurrentWeek ? (prev.totalReps || 0) : 0
  const prevByEx  = isCurrentWeek ? (prev.byExercise || {}) : {}

  await setDoc(ref, {
    uid,
    name:        name.slice(0, 30),
    weekKey:     wk,
    totalReps:   prevTotal + repsAdded,
    byExercise:  { ...prevByEx, [exerciseId]: (prevByEx[exerciseId] || 0) + repsAdded },
    updatedAt:   TODAY(),
  })
}

export async function getSquadLeaderboard(squad) {
  const wk = getWeekKey()
  const memberUids = squad.memberUids || []
  const entries = await Promise.all(
    memberUids.map(async uid => {
      try {
        const snap = await getDoc(doc(db, 'weeklyReps', uid))
        const d    = snap.data() || {}
        const reps = d.weekKey === wk ? (d.totalReps || 0) : 0
        return {
          uid,
          name:       squad.members?.[uid]?.name || 'Member',
          reps,
          byExercise: d.weekKey === wk ? (d.byExercise || {}) : {},
        }
      } catch {
        return { uid, name: squad.members?.[uid]?.name || 'Member', reps: 0, byExercise: {} }
      }
    })
  )
  return entries.sort((a, b) => b.reps - a.reps)
}

// ── Head-to-Head Challenges ───────────────────────────────────────────

export async function createChallenge(challengerUid, challengerName, challengedUid, challengedName, exercise) {
  const ref = doc(collection(db, 'challenges'))
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await setDoc(ref, {
    challenger:     challengerUid,
    challengerName: challengerName.slice(0, 30),
    challenged:     challengedUid,
    challengedName: challengedName.slice(0, 30),
    exercise,
    createdAt:  new Date().toISOString(),
    expiresAt,
    status:     'active',
    reps:       { [challengerUid]: 0, [challengedUid]: 0 },
  })
  return ref.id
}

export async function getActiveChallenges(uid) {
  try {
    const [asChallenger, asChallenged] = await Promise.all([
      getDocs(query(collection(db, 'challenges'),
        where('challenger', '==', uid), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'challenges'),
        where('challenged', '==', uid), where('status', '==', 'active'))),
    ])
    const all = [...asChallenger.docs, ...asChallenged.docs]
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => new Date(c.expiresAt) > new Date())
    return all
  } catch { return [] }
}
