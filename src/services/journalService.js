// Journal — private free writing + two fixed answers. No AI, no XP.
// Signed-in: Firestore users/{uid}/journal/{entryId}. Guest: localStorage.
// Entry: { text, important, step, date, createdAt, updatedAt? } — date is a local key (getLocalDateKey).

import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { getLocalDateKey } from '../utils/localDate'

export const MAX_TEXT_LEN   = 5000
export const MAX_ANSWER_LEN = 1000
const GUEST_KEY = 'prime_journal_guest'

const journalCol = uid       => collection(db, 'users', uid, 'journal')
const entryDoc   = (uid, id) => doc(db, 'users', uid, 'journal', id)
const newId      = ()        => `j${Date.now()}${Math.random().toString(36).slice(2, 6)}`

// Keeps line breaks (free writing), drops other control chars.
function clean(s, max) {
  // eslint-disable-next-line no-control-regex
  return String(s || '').replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ').trim().slice(0, max)
}

function cleanEntry({ text, important, step }) {
  return {
    text:      clean(text, MAX_TEXT_LEN),
    important: clean(important, MAX_ANSWER_LEN),
    step:      clean(step, MAX_ANSWER_LEN),
  }
}

export const isEmptyEntry = e => !e.text && !e.important && !e.step

// First non-empty line of the entry, for the list.
export function firstLine(e) {
  const src = e.text || e.important || e.step || ''
  return src.split('\n').map(l => l.trim()).find(Boolean) || ''
}

// ── Guest (localStorage) ─────────────────────────────────────────

function loadGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || [] } catch { return [] }
}
const guestListeners = new Set()
function saveGuest(list) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(list)) } catch {}
  guestListeners.forEach(fn => fn())
}

const byNewest = (a, b) => b.createdMs - a.createdMs

// ── Public API ───────────────────────────────────────────────────

// Calls onChange(list) with all entries, newest first; returns an unsubscribe fn.
export function subscribeEntries(uid, onChange, onError) {
  if (!uid) {
    const fn = () => onChange(loadGuest().map(e => ({ ...e, createdMs: e.createdAt || 0 })).sort(byNewest))
    guestListeners.add(fn)
    fn()
    return () => guestListeners.delete(fn)
  }
  return onSnapshot(journalCol(uid), snap => {
    const list = snap.docs.map(d => {
      const data = d.data({ serverTimestamps: 'estimate' })
      return { id: d.id, ...data, createdMs: data.createdAt?.toMillis?.() ?? Date.now() }
    })
    onChange(list.sort(byNewest))
  }, err => onError?.(err))
}

export async function addEntry(uid, raw) {
  const entry = cleanEntry(raw)
  if (isEmptyEntry(entry)) return null
  const id   = newId()
  const date = getLocalDateKey()
  if (!uid) {
    saveGuest([...loadGuest(), { id, ...entry, date, createdAt: Date.now() }])
    return id
  }
  await setDoc(entryDoc(uid, id), { ...entry, date, createdAt: serverTimestamp() })
  return id
}

// Edits text + answers only; date and createdAt stay as written.
export async function updateEntry(uid, id, raw) {
  const entry = cleanEntry(raw)
  if (isEmptyEntry(entry)) return
  if (!uid) {
    saveGuest(loadGuest().map(e => e.id === id ? { ...e, ...entry, updatedAt: Date.now() } : e))
    return
  }
  await updateDoc(entryDoc(uid, id), { ...entry, updatedAt: serverTimestamp() })
}

export async function deleteEntry(uid, id) {
  if (!uid) {
    saveGuest(loadGuest().filter(e => e.id !== id))
    return
  }
  await deleteDoc(entryDoc(uid, id))
}
