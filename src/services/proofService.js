import { db, storage } from './firebase'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const todayKey = () => new Date().toISOString().slice(0, 10)
const localKey = (date) => `prime_proofs_${date}`

export async function saveProof(uid, { taskId, taskTitle, type, text, imageFile }) {
  const date  = todayKey()
  const docId = `${taskId}_${date}`
  let imageUrl = ''

  if (imageFile && storage) {
    try {
      const storageRef = ref(storage, `proofs/${uid || 'guest'}/${docId}`)
      await uploadBytes(storageRef, imageFile)
      imageUrl = await getDownloadURL(storageRef)
    } catch {}
  }

  const entry = { taskId, taskTitle, type, text: text || '', imageUrl, timestamp: Date.now(), date }

  try {
    const cache = JSON.parse(localStorage.getItem(localKey(date))) || {}
    cache[taskId] = entry
    localStorage.setItem(localKey(date), JSON.stringify(cache))
  } catch {}

  if (uid && db) {
    setDoc(doc(db, 'proofs', uid, 'entries', docId), entry).catch(() => {})
  }

  return entry
}

export function getTodayProof(taskId) {
  try {
    const cache = JSON.parse(localStorage.getItem(localKey(todayKey()))) || {}
    return cache[taskId] || null
  } catch { return null }
}
