import { useAuth } from '../context/AuthContext'

export default function LoadingWrapper({ children }) {
  const { authLoading } = useAuth()
  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e16' }}>
      <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
    </div>
  )
  return children
}
