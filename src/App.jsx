import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import LoadingWrapper from './components/LoadingWrapper'
import GoogleAuthGuard from './components/GoogleAuthGuard'
import WelcomeScreen from './pages/WelcomeScreen'
import OnboardingFlow from './pages/OnboardingFlow'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <LangProvider>
    <AuthProvider>
      <BrowserRouter>
        <LoadingWrapper>
          <Routes>
            <Route path="/"          element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome"   element={<WelcomeScreen />} />
            <Route path="/setup"     element={<GoogleAuthGuard><OnboardingFlow /></GoogleAuthGuard>} />
            <Route path="/dashboard" element={<GoogleAuthGuard><Dashboard /></GoogleAuthGuard>} />
            <Route path="*"          element={<Navigate to="/welcome" replace />} />
          </Routes>
        </LoadingWrapper>
      </BrowserRouter>
    </AuthProvider>
    </LangProvider>
  )
}
