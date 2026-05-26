import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import BuilderPage from './pages/BuilderPage'
import AIGeneratePage from './pages/AIGeneratePage'
import GrowthPage from './pages/GrowthPage'
import PublicSitePage from './pages/PublicSitePage'
import FlooringDemoPage from './pages/FlooringDemoPage'
import ClientPreviewPage from './pages/ClientPreviewPage'
import PricingPage from './pages/PricingPage'
import DynamicWebsitePage from './pages/DynamicWebsitePage'
import LegalPage from './pages/LegalPage'
import GlobalAIAssistant from './components/GlobalAIAssistant'
import { ToastContainer } from './components/Toast'

function AssistantGuard() {
  const { pathname } = useLocation()
  const hide = ['/', '/onboarding', '/demo', '/builder', '/site-preview'].includes(pathname) ||
               pathname.startsWith('/dashboard') ||
               pathname.startsWith('/s/')
  return hide ? null : <GlobalAIAssistant />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <AssistantGuard />
        <Routes>
          <Route path="/"           element={<HomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/demo"       element={<FlooringDemoPage />} />
          <Route path="/pricing"    element={<PricingPage />} />
          <Route path="/preview"    element={<ClientPreviewPage />} />
          <Route path="/builder"      element={<BuilderPage />} />
          <Route path="/site-preview" element={<DynamicWebsitePage />} />
          <Route path="/app"        element={<Navigate to="/dashboard" replace />} />
          <Route path="/privacy"    element={<LegalPage type="privacy" />} />
          <Route path="/terms"      element={<LegalPage type="terms" />} />
          <Route path="/ai"         element={<AIGeneratePage />} />
          <Route path="/growth"     element={<GrowthPage />} />
          <Route path="/s/:slug"    element={<PublicSitePage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
