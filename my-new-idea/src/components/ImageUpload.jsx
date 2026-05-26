import { useState, useRef } from 'react'
import { storage, isFirebaseConfigured } from '../services/firebase'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export default function ImageUpload({ onUpload, label = '📎 העלה תמונה', accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')
  const inputRef = useRef(null)

  const handleFile = async file => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('קובץ חייב להיות תמונה'); return }
    if (file.size > MAX_SIZE) { setError('קובץ גדול מדי (מקסימום 5MB)'); return }
    setError('')
    setUploading(true)
    setProgress(0)

    // Firebase Storage path
    if (isFirebaseConfigured && storage) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `uploads/${Date.now()}_${safeName}`
        const storRef = ref(storage, path)
        const task = uploadBytesResumable(storRef, file)
        task.on(
          'state_changed',
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          () => { setError('שגיאה בהעלאה'); setUploading(false) },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            onUpload({ url, name: file.name })
            setUploading(false); setProgress(0)
          }
        )
        return
      } catch {}
    }

    // Fallback: base64 (local demo)
    const reader = new FileReader()
    reader.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
    reader.onload = e => { onUpload({ url: e.target.result, name: file.name }); setUploading(false); setProgress(0) }
    reader.onerror = () => { setError('שגיאה בקריאת הקובץ'); setUploading(false) }
    reader.readAsDataURL(file)
  }

  return (
    <div className="img-upload-wrap">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
      />
      <button
        type="button"
        className={`img-upload-btn ${uploading ? 'uploading' : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading
          ? <><span className="img-upload-bar-wrap"><span className="img-upload-bar" style={{ width: `${progress}%` }} /></span>{progress}%</>
          : label
        }
      </button>
      {error && <div className="img-upload-error">{error}</div>}
    </div>
  )
}
