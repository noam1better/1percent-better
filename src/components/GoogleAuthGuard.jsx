import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function GoogleAuthGuard({ children }) {
  const { user, authLoading } = useAuth()
  if (authLoading) return null
  if (!user) return <Navigate to="/welcome" replace />
  return children
}
