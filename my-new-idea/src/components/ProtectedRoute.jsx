import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth()

  if (authLoading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--navy)',
    }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )

  if (!user) return <Navigate to="/" replace />

  return children
}
