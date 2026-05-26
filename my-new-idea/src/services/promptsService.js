import { db, isFirebaseConfigured } from './firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'

const COL = 'prompts'

export async function savePrompt(userId, data) {
  if (!isFirebaseConfigured || !db || !userId) return null
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    userId,
    generatedAt: serverTimestamp(),
  })
  return { ...data, id: docRef.id }
}

export async function loadPrompts(userId) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('generatedAt', 'desc'),
    limit(50),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deletePrompt(promptId) {
  if (!isFirebaseConfigured || !db) return
  await deleteDoc(doc(db, COL, promptId))
}
