import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setError('Missing tokens. Please try signing in again.')
      return
    }

    loginWithTokens(accessToken, refreshToken)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch(() => {
        setError('Failed to complete sign in. Please try again.')
      })
  }, [searchParams, loginWithTokens, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <div className="glass-effect-strong rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <p className="text-neutral-800 font-medium mb-2">Sign in failed</p>
          <p className="text-sm text-neutral-600 mb-6">{error}</p>
          <a href="/login" className="btn-primary inline-block">
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="flex flex-col items-center gap-3 text-neutral-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Completing sign in...</span>
      </div>
    </div>
  )
}
