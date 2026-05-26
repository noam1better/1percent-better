import { db, isFirebaseConfigured } from './firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'

const COL = 'projects'

export async function saveProject(userId, project) {
  if (!isFirebaseConfigured || !db || !userId) {
    throw new Error('firebase_not_configured')
  }
  const docRef = await addDoc(collection(db, COL), {
    ...project,
    userId,
    createdAt: serverTimestamp(),
  })
  return { ...project, id: docRef.id }
}

export async function loadProjects(userId) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteProject(projectId) {
  if (!isFirebaseConfigured || !db) return
  await deleteDoc(doc(db, COL, projectId))
}
