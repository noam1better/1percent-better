import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/animations.css'
import App from './App.jsx'
import { initHighContrast } from './components/Settings.jsx'

// One-time cache flush for v2 auth flow
if (!localStorage.getItem('_v2_init')) {
  localStorage.clear()
  localStorage.setItem('_v2_init', '1')
}

// Restore high-contrast preference before first render
initHighContrast()

createRoot(document.getElementById('root')).render(<App />)
