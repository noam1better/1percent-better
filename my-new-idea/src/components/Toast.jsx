import { useState, useEffect } from 'react'

let _add = null

export function toast(message, type = 'success') {
  if (_add) _add({ message, type, id: Date.now() + Math.random() })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _add = (t) => {
      setToasts(prev => [...prev.slice(-3), t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3400)
    }
    return () => { _add = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
