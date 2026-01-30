import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { setupApi } from '../features/setup'

interface SetupGuardProps {
  children: ReactNode
}

export default function SetupGuard({ children }: SetupGuardProps) {
  const [checking, setChecking] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const checkSetupStatus = useCallback(async () => {
    try {
      const status = await setupApi.getStatus()
      setInitialized(status.initialized)

      if (!status.initialized && location.pathname !== '/setup') {
        navigate('/setup')
      }
    } catch (err) {
      // If we can't check status, assume initialized to avoid blocking
      console.error('Failed to check setup status:', err)
      setInitialized(true)
    } finally {
      setChecking(false)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    checkSetupStatus()
  }, [checkSetupStatus])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-neutral-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // If not initialized, the useEffect will redirect to /setup
  // Only render children if initialized
  if (!initialized) {
    return null
  }

  return <>{children}</>
}
