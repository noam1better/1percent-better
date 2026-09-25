import { useEffect, useState } from 'react'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { subscribeEntries, addEntry, updateEntry, deleteEntry, firstLine, isEmptyEntry, MAX_TEXT_LEN, MAX_ANSWER_LEN } from '../services/journalService'
import { addTask } from '../services/myTasksService'

// Journal — full-screen private writing page. No AI, no XP, no streaks.
// uid null → guest (localStorage). Rendered inside Dashboard's FullScreen.

const C = {
  bg: '#09090b', surface: '#111317', field: '#17191E',
  border: 'rgba(255,255,255,0.08)', text: '#F4F1E8', muted: '#A4A6AD', faint: '#71717A',
  accent: '#D9B34C', accentSoft: 'rgba(217,179,76,0.1)', accentBorder: 'rgba(217,179,76,0.45)',
  ok: '#3FAF7A', danger: '#D85C5C',
}

const Q_IMPORTANT = 'מה הכי חשוב לי מכל זה ולמה?'
const Q_STEP      = 'מה הצעד הכי קטן שאני יכול לעשות היום?'
const EMPTY = { text: '', important: '', step: '' }

function formatDate(key) {
  const [y, m, d] = String(key || '').split('-').map(Number)
  if (!y) return ''
  return new Date(y, m - 1, d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
}

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', display: 'block',
  background: C.field, border: `1px solid ${C.border}`, borderRadius: 12,
  padding: '0.8rem 0.9rem', color: C.text,
  fontSize: '1rem',   // ≥16px so iOS doesn't zoom on focus
  lineHeight: 1.6, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
}
const focusOn  = e => { e.target.style.borderColor = C.accentBorder }
const focusOff = e => { e.target.style.borderColor = C.border }

const labelStyle = { display: 'block', color: C.text, fontSize: '0.9rem', fontWeight: 700, margin: '1.25rem 0 0.5rem' }

function PrimaryButton({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, minHeight: 48, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: disabled ? 'rgba(217,179,76,0.25)' : C.accent, color: '#09090b',
        fontSize: '0.95rem', fontWeight: 800, fontFamily: 'inherit',
      }}
    >{children}</button>
  )
}

// done: disabled but showing a success state (e.g. "נוסף ✓") — keep it green, not greyed out.
function SecondaryButton({ children, disabled, done, onClick, color = C.accent }) {
  const muted = disabled && !done
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, minHeight: 48, borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
        background: 'transparent', border: `1px solid ${done ? 'rgba(63,175,122,0.35)' : muted ? C.border : 'rgba(217,179,76,0.35)'}`,
        color: done ? C.ok : muted ? C.faint : color, fontSize: '0.9rem', fontWeight: 700, fontFamily: 'inherit',
      }}
    >{children}</button>
  )
}

export default function Journal({ uid, onClose }) {
  const [entries,  setEntries]  = useState([])
  const [view,     setView]     = useState('write')   // 'write' | 'list' | 'entry'
  const [openId,   setOpenId]   = useState(null)      // entry shown in 'entry' view
  const [editId,   setEditId]   = useState(null)      // entry being edited in 'write' view
  const [form,     setForm]     = useState(EMPTY)
  const [addedStep, setAddedStep] = useState(null)    // step text already sent to My Tasks
  const [saved,    setSaved]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error,    setError]    = useState(null)      // null | 'load' | 'save' | 'task'

  useEffect(() => {
    return subscribeEntries(uid, list => { setEntries(list); setError(null) }, () => setError('load'))
  }, [uid])

  const openEntry = entries.find(e => e.id === openId)
  const set = key => e => { setForm(f => ({ ...f, [key]: e.target.value })); setSaved(false) }
  const formEmpty = isEmptyEntry({ text: form.text.trim(), important: form.important.trim(), step: form.step.trim() })
  const stepText  = form.step.trim()

  function goBack() {
    setError(null)
    setConfirmDelete(false)
    if (view === 'write' && editId) { setEditId(null); setForm(EMPTY); setView('entry') }
    else if (view === 'entry')      { setOpenId(null); setView('list') }
    else if (view === 'list')       { setView('write') }
    else onClose()
  }

  async function handleSave() {
    if (formEmpty) return
    setError(null)
    try {
      if (editId) {
        await updateEntry(uid, editId, form)
        setOpenId(editId); setEditId(null); setForm(EMPTY); setView('entry')
      } else {
        await addEntry(uid, form)
        setForm(EMPTY); setAddedStep(null); setSaved(true)
      }
    } catch { setError('save') }
  }

  async function handleAddTask() {
    if (!stepText || addedStep === stepText) return
    setError(null)
    try {
      await addTask(uid, stepText)
      setAddedStep(stepText)
    } catch { setError('task') }
  }

  function startEdit(e) {
    setForm({ text: e.text || '', important: e.important || '', step: e.step || '' })
    setEditId(e.id); setAddedStep(null); setSaved(false); setConfirmDelete(false)
    setView('write')
  }

  async function handleDelete(e) {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await deleteEntry(uid, e.id)
      setConfirmDelete(false); setOpenId(null); setView('list')
    } catch { setError('save') }
  }

  const title = view === 'list' ? 'רשומות קודמות' : view === 'entry' ? formatDate(openEntry?.date) : editId ? 'עריכת רשומה' : 'מה בראש שלך?'

  return (
    <div dir="rtl" style={{ minHeight: '100%', background: C.bg, color: C.text, direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1, background: C.bg,
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        padding: 'calc(env(safe-area-inset-top, 0px) + 0.5rem) 0.5rem 0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <button onClick={goBack} aria-label="חזור" style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <ChevronRight size={22} />
        </button>
        <span style={{ flex: 1, minWidth: 0, fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 1rem calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        {error && (
          <div role="alert" style={{ color: C.danger, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            {error === 'load' ? 'לא הצלחנו לטעון את היומן' : error === 'task' ? 'לא הצלחנו להוסיף למשימות — נסה שוב' : 'לא הצלחנו לשמור — נסה שוב'}
          </div>
        )}

        {/* ── Write / edit ── */}
        {view === 'write' && (
          <>
            <textarea
              value={form.text}
              onChange={set('text')}
              placeholder="כתוב כל מה שעובר לך בראש…"
              aria-label="כתיבה חופשית"
              maxLength={MAX_TEXT_LEN}
              rows={9}
              dir="rtl"
              style={{ ...fieldStyle, minHeight: 200 }}
              onFocus={focusOn} onBlur={focusOff}
            />

            <label htmlFor="journal-important" style={labelStyle}>{Q_IMPORTANT}</label>
            <textarea
              id="journal-important"
              value={form.important}
              onChange={set('important')}
              maxLength={MAX_ANSWER_LEN}
              rows={3}
              dir="rtl"
              style={fieldStyle}
              onFocus={focusOn} onBlur={focusOff}
            />

            <label htmlFor="journal-step" style={labelStyle}>{Q_STEP}</label>
            <textarea
              id="journal-step"
              value={form.step}
              onChange={set('step')}
              maxLength={MAX_ANSWER_LEN}
              rows={2}
              dir="rtl"
              style={fieldStyle}
              onFocus={focusOn} onBlur={focusOff}
            />

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
              <SecondaryButton onClick={handleAddTask} disabled={!stepText || addedStep === stepText} done={!!stepText && addedStep === stepText}>
                {stepText && addedStep === stepText ? 'נוסף ✓' : 'הוסף למשימות שלי'}
              </SecondaryButton>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
              <PrimaryButton onClick={handleSave} disabled={formEmpty}>{editId ? 'שמור שינויים' : 'שמור'}</PrimaryButton>
            </div>
            {saved && (
              <div role="status" style={{ color: C.ok, fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', marginTop: '0.6rem' }}>נשמר ✓</div>
            )}

            {!editId && entries.length > 0 && (
              <button
                onClick={() => { setSaved(false); setView('list') }}
                style={{ display: 'block', margin: '1.75rem auto 0', background: 'none', border: 'none', color: C.muted, fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', minHeight: 44, padding: '0 1rem' }}
              >
                רשומות קודמות ({entries.length})
              </button>
            )}
          </>
        )}

        {/* ── Past entries ── */}
        {view === 'list' && (
          entries.length === 0 ? (
            <div style={{ color: C.faint, fontSize: '0.88rem', textAlign: 'center', marginTop: '2rem' }}>עוד אין רשומות</div>
          ) : (
            <div style={{ background: C.surface, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              {entries.map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => { setOpenId(e.id); setConfirmDelete(false); setView('entry') }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'right', cursor: 'pointer',
                    background: 'none', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    padding: '0.8rem 1rem', fontFamily: 'inherit', minHeight: 56,
                  }}
                >
                  <div style={{ color: C.accent, fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem' }}>{formatDate(e.date)}</div>
                  <div style={{ color: C.text, fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstLine(e)}</div>
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Single entry ── */}
        {view === 'entry' && (
          !openEntry ? (
            <div style={{ color: C.faint, fontSize: '0.88rem', textAlign: 'center', marginTop: '2rem' }}>הרשומה לא נמצאה</div>
          ) : (
            <>
              {openEntry.text && (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.98rem', lineHeight: 1.7, color: C.text }}>{openEntry.text}</p>
              )}
              {openEntry.important && (
                <>
                  <div style={{ ...labelStyle, color: C.accent, fontSize: '0.82rem' }}>{Q_IMPORTANT}</div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.95rem', lineHeight: 1.6 }}>{openEntry.important}</p>
                </>
              )}
              {openEntry.step && (
                <>
                  <div style={{ ...labelStyle, color: C.accent, fontSize: '0.82rem' }}>{Q_STEP}</div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.95rem', lineHeight: 1.6 }}>{openEntry.step}</p>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '2rem' }}>
                <SecondaryButton onClick={() => startEdit(openEntry)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Pencil size={15} /> ערוך</span>
                </SecondaryButton>
                <SecondaryButton onClick={() => handleDelete(openEntry)} color={C.danger}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Trash2 size={15} /> {confirmDelete ? 'בטוח? מחק' : 'מחק'}</span>
                </SecondaryButton>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
