import { db, isFirebaseConfigured } from './firebase'
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc,
  doc, query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'

const COL = 'websites'

export async function saveWebsite(userId, website) {
  if (!isFirebaseConfigured || !db || !userId) return null
  const docRef = await addDoc(collection(db, COL), {
    ...website,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { ...website, id: docRef.id }
}

export async function updateWebsite(website) {
  if (!isFirebaseConfigured || !db || !website.id) return null
  const ref = doc(db, COL, website.id)
  await updateDoc(ref, { ...website, updatedAt: serverTimestamp() })
  return website
}

export async function loadWebsites(userId) {
  if (!isFirebaseConfigured || !db || !userId) return []
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteWebsite(id) {
  if (!isFirebaseConfigured || !db || !id) return
  await deleteDoc(doc(db, COL, id))
}

export async function publishWebsite(website) {
  const publicUrl = `${window.location.origin}/s/${website.slug}`
  const updated = { ...website, published: true, publicUrl, publishedAt: new Date().toISOString() }
  if (isFirebaseConfigured && db && website.id) {
    await updateDoc(doc(db, COL, website.id), { published: true, publicUrl, publishedAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
  return updated
}

export async function getWebsiteBySlug(slug) {
  if (!isFirebaseConfigured || !db) return null
  const q = query(collection(db, COL), where('slug', '==', slug), where('published', '==', true), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}
