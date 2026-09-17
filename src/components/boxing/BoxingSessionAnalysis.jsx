import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { analyzeBoxingVideo, videoAnalysisAvailable } from '../../services/boxingVideoService'

const C = {
  bg:      '#111317',
  surface: '#1C1F26',
  border:  '#2A2D35',
  text:    '#F4F1E8',
  muted:   '#71717A',
  accent:  '#D9B34C',
  blue:    '#60a5fa',
  green:   '#10b981',
  red:     '#ef4444',
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024  // 100 MB

// Categories for findings display
const CATEGORY_LABEL = {
  guard:    'גארד',
  punch:    'מכות',
  footwork: 'רגליים',
  defense:  'הגנה',
}

export default function BoxingSessionAnalysis({ onClose, sessionStats, categoryId }) {
  const { user } = useAuth()
  const isAvailable = videoAnalysisAvailable()

  const [phase,       setPhase]       = useState('idle')   // idle | uploading | analyzing | result | error
  const [uploadPct,   setUploadPct]   = useState(0)
  const [analysis,    setAnalysis]    = useState(null)
  const [errorMsg,    setErrorMsg]    = useState(null)
  const fileInputRef = useRef(null)

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_VIDEO_BYTES) {
      setErrorMsg('הקובץ גדול מדי. עד 100 MB.')
      setPhase('error')
      return
    }

    if (!user) {
      setErrorMsg('יש להתחבר כדי להשתמש בניתוח וידאו.')
      setPhase('error')
      return
    }

    setPhase('uploading')
    setUploadPct(0)
    setErrorMsg(null)

    try {
      setPhase('uploading')
      const result = await analyzeBoxingVideo(user.uid, file, (pct) => {
        setUploadPct(pct)
        if (pct === 100) setPhase('analyzing')
      })
      setAnalysis(result)
      setPhase('result')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('resource-exhausted')) {
        setErrorMsg('הגעת למגבלת ניתוחי ה-AI היומית. נסה מחר.')
      } else if (msg.includes('unauthenticated')) {
        setErrorMsg('יש להתחבר כדי להשתמש בניתוח וידאו.')
      } else {
        setErrorMsg('שגיאה בניתוח. בדוק חיבור ונסה שוב.')
      }
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle')
    setAnalysis(null)
    setErrorMsg(null)
    setUploadPct(0)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '12px 16px', minHeight: 56, gap: 10 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 16, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'right' }}>🎬 ניתוח סשן</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>

        {/* UNAVAILABLE */}
        {!isAvailable && (
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>ניתוח וידאו אינו זמין</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Firebase לא מוגדר. בדוק הגדרות.</div>
          </div>
        )}

        {/* IDLE */}
        {isAvailable && phase === 'idle' && (
          <>
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>ניתוח וידאו של הסשן</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 12, textAlign: 'right' }}>
                העלה קליפ קצר מהאימון (עד 60 שניות) לניתוח טכני של מכות, גארד, תנועה, ושגיאות חוזרות.
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, borderRight: `3px solid ${C.accent}`, paddingRight: 10, textAlign: 'right' }}>
                הוידאו מועלה לעיבוד ונמחק מיד לאחר הניתוח. לא מאוחסן לצמיתות. מומלץ לצלם מזווית צד או אלכסון.
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', minHeight: 72, background: C.accent, color: '#111317', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 800, cursor: 'pointer', marginBottom: 16 }}
            >
              🎬 העלה קליפ לניתוח
            </button>

            <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
              עד 100MB · MP4, MOV, WEBM
            </div>
          </>
        )}

        {/* UPLOADING */}
        {phase === 'uploading' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⬆️</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>מעלה וידאו...</div>
            <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: 'hidden', maxWidth: 280, margin: '0 auto' }}>
              <div style={{ width: `${uploadPct}%`, height: '100%', background: C.accent, borderRadius: 8, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>{uploadPct}%</div>
          </div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>מנתח...</div>
            <div style={{ fontSize: 13, color: C.muted }}>ניתוח וידאו לוקח 20–60 שניות</div>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && analysis && (
          <AnalysisResult analysis={analysis} />
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.red}40`, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 14, color: C.red, marginBottom: 16, lineHeight: 1.6 }}>{errorMsg}</div>
            <button onClick={reset} style={{ background: C.accent, color: '#111317', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>נסה שוב</button>
          </div>
        )}

      </div>

      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileSelected} />
    </div>
  )
}

function AnalysisResult({ analysis }) {
  if (!analysis) return null

  const canAssess = analysis.canAssess !== false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Cannot assess notice */}
      {!canAssess && (
        <div style={{ background: '#2A1A00', borderRadius: 14, border: `1px solid ${C.accent}40`, padding: 16, textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 }}>⚠️ לא ניתן להעריך</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{analysis.limitations}</div>
        </div>
      )}

      {/* Limitations (always show if exists) */}
      {canAssess && analysis.limitations && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>מגבלות הניתוח</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{analysis.limitations}</div>
        </div>
      )}

      {/* Strength */}
      {canAssess && analysis.strength?.he && (
        <div style={{ background: '#0a2a1a', borderRadius: 14, border: `1px solid ${C.green}40`, padding: 16 }}>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>💪 נקודת חוזקה</div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, textAlign: 'right' }}>{analysis.strength.he}</div>
        </div>
      )}

      {/* Priority corrections */}
      {canAssess && analysis.priorityCorrections?.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'right', color: C.text }}>🎯 תיקונים עיקריים</div>
          {analysis.priorityCorrections.map((c, i) => (
            <div key={i} style={{ borderBottom: i < analysis.priorityCorrections.length - 1 ? `1px solid ${C.border}` : 'none', paddingBottom: i < analysis.priorityCorrections.length - 1 ? 10 : 0, marginBottom: i < analysis.priorityCorrections.length - 1 ? 10 : 0, textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                {c.timestamp && <span style={{ fontSize: 11, color: C.accent, background: C.accent + '18', borderRadius: 8, padding: '2px 7px', flexShrink: 0, marginTop: 2 }}>{c.timestamp}</span>}
                {c.category && <span style={{ fontSize: 11, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '2px 7px', flexShrink: 0, marginTop: 2 }}>{CATEGORY_LABEL[c.category] || c.category}</span>}
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 6 }}>{c.he}</div>
            </div>
          ))}
        </div>
      )}

      {/* Repeated mistakes */}
      {canAssess && analysis.repeatedMistakes?.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>🔁 שגיאות חוזרות</div>
          {analysis.repeatedMistakes.map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: '4px 0', borderBottom: i < analysis.repeatedMistakes.length - 1 ? `1px solid ${C.border}` : 'none', textAlign: 'right' }}>• {m}</div>
          ))}
        </div>
      )}

      {/* Timeline observations */}
      {canAssess && analysis.timelineObservations?.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'right' }}>⏱ ציר זמן</div>
          {analysis.timelineObservations.map((obs, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < analysis.timelineObservations.length - 1 ? `1px solid ${C.border}` : 'none', justifyContent: 'flex-end' }}>
              <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.5, textAlign: 'right' }}>{obs.he}</div>
              <span style={{ fontSize: 11, color: C.accent, background: C.accent + '18', borderRadius: 8, padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap' }}>{obs.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Practice action */}
      {canAssess && analysis.practiceAction?.instructionHe && (
        <div style={{ background: '#1a1400', borderRadius: 14, border: `1px solid ${C.accent}40`, padding: 16 }}>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>🥊 תרגיל לתיקון — {analysis.practiceAction.durationMinutes || 3} דקות</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, textAlign: 'right' }}>{analysis.practiceAction.titleHe}</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, textAlign: 'right' }}>{analysis.practiceAction.instructionHe}</div>
        </div>
      )}
    </div>
  )
}
