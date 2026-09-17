import { ref, uploadBytesResumable, deleteObject } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { storage, functions } from './firebase'

const ANALYSIS_BUCKET_PATH = 'workout-analysis'

/**
 * Upload a video file to Firebase Storage, call analyzeBoxingSession Cloud Function,
 * delete the uploaded file, and return structured analysis.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {File} videoFile - Video File object from file input
 * @param {function(number):void} [onProgress] - Upload progress callback (0-100)
 * @returns {Promise<object>} - Parsed analysis JSON
 */
export async function analyzeBoxingVideo(uid, videoFile, onProgress) {
  if (!storage || !functions) throw new Error('Firebase not configured')

  const ext = videoFile.name.split('.').pop() || 'mp4'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storagePath = `${ANALYSIS_BUCKET_PATH}/${uid}/${filename}`
  const storageRef = ref(storage, storagePath)

  // Upload with progress
  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, videoFile, {
      contentType: videoFile.type || 'video/mp4',
    })
    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      resolve
    )
  })

  // Call Cloud Function
  let analysisResult
  try {
    const fn = httpsCallable(functions, 'analyzeBoxingSession', { timeout: 120000 })
    const result = await fn({ storagePath })
    analysisResult = result.data.analysis
  } finally {
    // Always delete from Storage (function also deletes, this is a safety net)
    deleteObject(storageRef).catch(() => {})
  }

  return analysisResult
}

export function videoAnalysisAvailable() {
  return !!(storage && functions)
}
