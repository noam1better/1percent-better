// My Tasks — the user's own one-off tasks.
// Signed-in: Firestore users/{uid}/tasks/{taskId}. Guest: localStorage.
// Task: { text, done, createdDate, doneDate } — dates are local keys (getLocalDateKey).
// Visible today = not done (carried over from any earlier day) + done today.
// Tasks done on earlier days stay stored but are no longer shown.

import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { getLocalDateKey } from '../utils/localDate'

export const MAX_TASK_LEN = 200
const GUEST_KEY = 'prime_my_tasks_guest'

const tasksCol = uid       => collection(db, 'users', uid, 'tasks')
const taskDoc  = (uid, id) => doc(db, 'users', uid, 'tasks', id)
const newId    = ()        => `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`

export function cleanTaskText(s) {
  // eslint-disable-next-line no-control-regex
  return String(s || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_LEN)
}

export function visibleTasks(tasks, today = getLocalDateKey()) {
  return tasks
    .filter(t => !t.done || t.doneDate === today)
    .map(t => ({ ...t, carriedOver: !t.done && t.createdDate < today }))
    .sort((a, b) => (a.createdDate + a.id).localeCompare(b.createdDate + b.id))
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

// ── Public API ───────────────────────────────────────────────────

// Calls onChange(list) with today's visible tasks; returns an unsubscribe fn.
// Two equality queries (no composite index needed): open tasks + tasks done today.
export function subscribeTasks(uid, onChange, onError) {
  const today = getLocalDateKey()
  if (!uid) {
    const fn = () => onChange(visibleTasks(loadGuest(), today))
    guestListeners.add(fn)
    fn()
    return () => guestListeners.delete(fn)
  }
  let open = [], doneToday = []
  const emit = () => {
    const byId = new Map([...open, ...doneToday].map(t => [t.id, t]))
    onChange(visibleTasks([...byId.values()], today))
  }
  const toList = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const u1 = onSnapshot(query(tasksCol(uid), where('done', '==', false)),
    snap => { open = toList(snap); emit() }, err => onError?.(err))
  const u2 = onSnapshot(query(tasksCol(uid), where('doneDate', '==', today)),
    snap => { doneToday = toList(snap); emit() }, err => onError?.(err))
  return () => { u1(); u2() }
}

export async function addTask(uid, rawText) {
  const text = cleanTaskText(rawText)
  if (!text) return null
  const id   = newId()
  const task = { text, done: false, createdDate: getLocalDateKey(), doneDate: null }
  if (!uid) {
    saveGuest([...loadGuest(), { id, ...task }])
    return id
  }
  await setDoc(taskDoc(uid, id), { ...task, createdAt: serverTimestamp() })
  return id
}

export async function setTaskDone(uid, id, done) {
  const patch = { done, doneDate: done ? getLocalDateKey() : null }
  if (!uid) {
    saveGuest(loadGuest().map(t => t.id === id ? { ...t, ...patch } : t))
    return
  }
  await updateDoc(taskDoc(uid, id), patch)
}

export async function deleteTask(uid, id) {
  if (!uid) {
    saveGuest(loadGuest().filter(t => t.id !== id))
    return
  }
  await deleteDoc(taskDoc(uid, id))
}
