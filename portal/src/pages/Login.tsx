import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Mail, Lock, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import { loginSchema } from '../features/auth/schemas'
import { validateForm } from '../shared/utils/validation'
import { useEnabledIdentityProviders } from '../features/identity-providers'
import { API_BASE_URL } from '../config/api'

function ProviderIcon({ slug }: { slug: string }) {
  const s = slug.toLowerCase()
  if (s.includes('google')) {
    return (
      <span className="flex shrink-0 w-5 h-5" aria-hidden>
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </span>
    )
  }
  if (s.includes('microsoft')) {
    return (
      <span className="flex shrink-0 w-5 h-5" aria-hidden>
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#F25022" d="M1 1h10v10H1z" />
          <path fill="#00A4EF" d="M1 13h10v10H1z" />
          <path fill="#7FBA00" d="M13 1h10v10H13z" />
          <path fill="#FFB900" d="M13 13h10v10H13z" />
        </svg>
      </span>
    )
  }
  return <KeyRound className="w-5 h-5 shrink-0 text-neutral-500" aria-hidden />
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const { data: socialProviders = [] } = useEnabledIdentityProviders()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-neutral-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrors({})

    // Validate form
    const validation = validateForm(loginSchema, { email, password })
    if (!validation.success) {
      const validationErrors = validation.errors || {}
      // If there are no specific errors but validation failed, show generic error
      if (Object.keys(validationErrors).length === 0) {
        setError('Please fill in all required fields')
      } else {
        setErrors(validationErrors)
      }
      return
    }

    try {
      await login(email, password)
      navigate('/')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Incorrect email or password. Please check your credentials and try again.'
      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl opacity-20 blur-md"></div>
                <div className="relative p-3 bg-gradient-primary rounded-xl shadow-soft">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M12 2L22 7L12 12L2 7L12 2Z"
                      fill="currentColor"
                      className="text-white/90"
                    />
                    <path
                      d="M2 7L12 12V22L2 17V7Z"
                      fill="currentColor"
                      className="text-white/70"
                    />
                    <path
                      d="M12 12L22 7V17L12 22V12Z"
                      fill="currentColor"
                      className="text-white/80"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gradient mb-2">Tron Platform</h1>
          <p className="text-neutral-600">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <div className="glass-effect-strong rounded-2xl p-8 shadow-soft-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                  className={`input pl-10 w-full ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: '' })
                  }}
                  className={`input pl-10 w-full ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Sign In</span>
            </button>

            {socialProviders.length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-neutral-500">or continue with</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-sm text-neutral-600">Sign in with</span>
                  {socialProviders.map((provider) => (
                    <a
                      key={provider.slug}
                      href={`${API_BASE_URL}/auth/${provider.slug}/login`}
                      className="btn-secondary inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm shrink-0"
                    >
                      <ProviderIcon slug={provider.slug} />
                      {provider.display_name}
                    </a>
                  ))}
                </div>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} Tron Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

