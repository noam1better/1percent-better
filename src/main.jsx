import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/animations.css'
import App from './App.jsx'

// One-time v2 flush (legacy — already ran for most users)
if (!localStorage.getItem('_v2_init')) {
  localStorage.clear()
  localStorage.setItem('_v2_init', '1')
}

// v3 flush: selectively clear stale lesson caches + old checklists, keep onboarding/prefs
if (!localStorage.getItem('_v3_init')) {
  const today = new Date().toISOString().slice(0, 10)
  Object.keys(localStorage).forEach(k => {
    if (
      k.startsWith('prime_lesson_v1_') ||
      k.startsWith('prime_lesson_v2_') ||
      (k.startsWith('prime_checklist_') && !k.endsWith(today))
    ) {
      localStorage.removeItem(k)
    }
  })
  localStorage.setItem('_v3_init', '1')
}

createRoot(document.getElementById('root')).render(<App />)
