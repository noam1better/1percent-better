import { useState, useRef, useEffect } from 'react'
import { analyzeVideoForm, coachConfigured } from '../../services/coachService'

const C = {
  bg:      '#111317',
  surface: '#1C1F26',
  border:  '#2A2D35',
  text:    '#F4F1E8',
  muted:   '#71717A',
  accent:  '#D9B34C',
  blue:    '#60a5fa',
  green:   '#10b981',
  gray:    '#71717A',
  red:     '#ef4444',
}

export default function BoxingFormAnalysis({ onClose, categoryHint = '' }) {
  const isAvailable = coachConfigured()

  const [phase,    setPhase]    = useState(isAvailable ? 'idle' : 'unavailable')
  const [preview,  setPreview]  = useState(null)   // base64 data URL for <img>
  const [base64,   setBase64]   = useState(null)   // raw base64 without data-url prefix
  const [result,   setResult]   = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const captureInputRef = useRef(null)
  const uploadInputRef  = useRef(null)

  // If coachConfigured state changes while mounted (unlikely but safe)
  useEffect(() => {
    if (!isAvailable) setPhase('unavailable')
  }, [isAvailable])

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      // dataUrl is like "data:image/jpeg;base64,XXXX"
      const raw = dataUrl.split(',')[1]
      if (!raw) {
        setErrorMsg('שגיאה בקריאת הקובץ.')
        setPhase('error')
        return
      }
      setPreview(dataUrl)
      setBase64(raw)
      setPhase('preview')
    }
    reader.onerror = () => {
      setErrorMsg('שגיאה בקריאת הקובץ. נסה שוב.')
      setPhase('error')
    }
    reader.readAsDataURL(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  async function runAnalysis() {
    if (!base64) return
    setPhase('analyzing')
    setResult(null)
    setErrorMsg(null)
    try {
      const exercise = categoryHint || 'boxing'
      const text = await analyzeVideoForm(base64, exercise)
      if (!text) {
        setErrorMsg('לא התקבלה תשובה מהמנוע. נסה שוב.')
        setPhase('error')
        return
      }
      setResult(text)
      setPhase('result')
    } catch (err) {
      setErrorMsg('שגיאה בשליחה לניתוח. בדוק חיבור לאינטרנט ונסה שוב.')
      setPhase('error')
    }
  }

  function resetToIdle() {
    setPhase('idle')
    setPreview(null)
    setBase64(null)
    setResult(null)
    setErrorMsg(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '12px 16px', minHeight: 56, gap: 10 }}>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 16, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          ←
        </button>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'right', color: C.text }}>
          📸 בדיקת עמידה מתמונה
          {categoryHint ? (
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginRight: 8 }}>{categoryHint}</span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>

        {/* UNAVAILABLE */}
        {phase === 'unavailable' && (
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>ניתוח AI אינו זמין כרגע</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              ניתוח AI אינו זמין כרגע. בדוק את הגדרות האפליקציה.
            </div>
          </div>
        )}

        {/* IDLE */}
        {phase === 'idle' && (
          <>
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, textAlign: 'right', marginBottom: 12 }}>
                צלם תנוחה בודדת וקבל משוב על מה שנראה בתמונה. הניתוח בוחן יציבה ומיקום גוף בתמונה אחת בלבד — לא תנועה, לא תזמון, ולא סדרת פעולות.
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, textAlign: 'right', borderRight: `3px solid ${C.accent}`, paddingRight: 10 }}>
                תוצאות מדויקות יותר — צלם מזווית צד ומלפנים בתנוחת גארד.
              </div>
            </div>

            {/* Camera capture button (primary) */}
            <button
              onClick={() => captureInputRef.current?.click()}
              style={{ width: '100%', minHeight: 72, background: C.accent, color: '#111317', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, cursor: 'pointer', marginBottom: 12, letterSpacing: 0.5 }}
            >
              📸 צלם תנוחה
            </button>

            {/* Upload button (secondary) */}
            <button
              onClick={() => uploadInputRef.current?.click()}
              style={{ width: '100%', minHeight: 52, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              📁 העלה תמונה
            </button>
          </>
        )}

        {/* PREVIEW */}
        {phase === 'preview' && preview && (
          <>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img
                src={preview}
                alt="תצוגה מקדימה"
                style={{ maxWidth: 300, width: '100%', borderRadius: 14, border: `1px solid ${C.border}`, display: 'block', margin: '0 auto' }}
              />
            </div>
            <button
              onClick={runAnalysis}
              style={{ width: '100%', minHeight: 58, background: C.accent, color: '#111317', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}
            >
              נתח תמונה ←
            </button>
            <button
              onClick={resetToIdle}
              style={{ width: '100%', minHeight: 44, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              בחר תמונה אחרת
            </button>
          </>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 15, color: C.muted }}>שולח לניתוח...</div>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && result && (
          <>
            {preview && (
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <img
                  src={preview}
                  alt="תמונה שנותחה"
                  style={{ maxWidth: 220, width: '100%', borderRadius: 12, border: `1px solid ${C.border}`, display: 'block', margin: '0 auto', opacity: 0.85 }}
                />
              </div>
            )}
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>AI — יציבה ומיקום גוף</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, textAlign: 'right', whiteSpace: 'pre-line' }}>
                {result}
              </div>
            </div>
            <button
              onClick={resetToIdle}
              style={{ width: '100%', minHeight: 52, background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              📸 נתח תמונה נוספת
            </button>
          </>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.red}40`, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 14, color: C.red, marginBottom: 16, lineHeight: 1.6 }}>
              {errorMsg || 'אירעה שגיאה.'}
            </div>
            <button
              onClick={resetToIdle}
              style={{ background: C.accent, color: '#111317', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  )
}
