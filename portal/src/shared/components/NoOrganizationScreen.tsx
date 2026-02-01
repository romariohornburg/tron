import { useNavigate } from 'react-router-dom'
import { Building2, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from './Logo'

/**
 * Shown when the user is authenticated but has no organizations (organizations from /me is empty).
 */
export function NoOrganizationScreen() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="p-8 rounded-2xl bg-white/80 backdrop-blur border border-slate-200/80 shadow-soft-lg">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-amber-100 text-amber-700">
              <Building2 size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            No organization associated
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Your account is not linked to any organization. Contact an administrator to be
            added to an organization or create a new one.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
