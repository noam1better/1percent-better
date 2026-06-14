import { useState, useEffect, useRef, useCallback } from 'react'
import './Toast.css'

// ── Global imperative API ─────────────────────────────────────────
// Allows toast() to be called from anywhere without context.
let _dispatch = null

function _addToast({ type = 'success', title, body = null, duration = 3500 }) {
  if (_dispatch) _dispatch({ type: 'ADD', toast: { id: Date.now() + Math.random(), type, title, body, duration, exiting: false } })
}

// Primary API — backward-compatible with toast(msg, type)
export function toast(titleOrMsg, typeArg = 'success', body = null) {
  _addToast({ type: typeArg, title: titleOrMsg, body })
}

// Typed shortcuts
toast.success = (title, body)  => _addToast({ type: 'success', title, body })
toast.streak  = (title, body)  => _addToast({ type: 'streak',  title, body })
toast.info    = (title, body)  => _addToast({ type: 'info',    title, body })
toast.error   = (title, body)  => _addToast({ type: 'error',   title, body })

// ── Reducer ───────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'ADD':    return [...state.slice(-4), action.toast]
    case 'EXIT':   return state.map(t => t.id === action.id ? { ...t, exiting: true } : t)
    case 'REMOVE': return state.filter(t => t.id !== action.id)
    default:       return state
  }
}

// ── ToastItem ─────────────────────────────────────────────────────
const ICONS = {
  success: '⚡',
  streak:  '🔥',
  info:    '💡',
  error:   '⚠️',
}

function ToastItem({ t, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration)
    return () => clearTimeout(timer)
  }, [t.id, t.duration, onDismiss])

  return (
    <div
      className={`toast toast--${t.type} ${t.exiting ? 'toast--exiting' : ''}`}
      role="alert"
    >
      <span className="toast-icon">{ICONS[t.type] ?? '💬'}</span>
      <div className="toast-text">
        <p className="toast-title">{t.title}</p>
        {t.body && <p className="toast-body">{t.body}</p>}
      </div>
      <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">✕</button>
      <div className="toast-progress" style={{ '--toast-dur': `${t.duration}ms` }} />
    </div>
  )
}

// ── ToastContainer ────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  // Track in-flight EXIT → REMOVE timers so we can cancel on unmount
  const pendingTimers = useRef(new Map())

  useEffect(() => {
    _dispatch = action => setToasts(prev => reducer(prev, action))
    return () => {
      _dispatch = null
      // Cancel all pending REMOVE timers on unmount
      pendingTimers.current.forEach(clearTimeout)
      pendingTimers.current.clear()
    }
  }, [])

  const dismiss = useCallback((id) => {
    // Guard: don't re-trigger if already exiting
    setToasts(prev => {
      const t = prev.find(x => x.id === id)
      if (!t || t.exiting) return prev
      return reducer(prev, { type: 'EXIT', id })
    })

    // Only schedule REMOVE once per id
    if (pendingTimers.current.has(id)) return
    const timer = setTimeout(() => {
      setToasts(prev => reducer(prev, { type: 'REMOVE', id }))
      pendingTimers.current.delete(id)
    }, 350)
    pendingTimers.current.set(id, timer)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <ToastItem key={t.id} t={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}
