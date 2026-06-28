import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// One-time cache flush for v2 auth flow
if (!localStorage.getItem('_v2_init')) {
  localStorage.clear()
  localStorage.setItem('_v2_init', '1')
}

createRoot(document.getElementById('root')).render(<App />)
