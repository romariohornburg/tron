import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  Cloud,
  Globe,
  AppWindow,
  Menu,
  X,
  Shield,
  FileCode,
  LogOut,
  User,
  Settings,
  Users,
  Key,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Building2,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { APP_VERSION } from '../../config/version'

const generalNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Applications', path: '/applications', icon: AppWindow },
]

const orgNavItems = [
  { label: 'Organizations', path: '/organizations', icon: Building2 },
  { label: 'Groups', path: '/groups', icon: Shield },
  { label: 'Clusters', path: '/clusters', icon: Cloud },
  { label: 'Environments', path: '/environments', icon: Globe },
  { label: 'Templates', path: '/templates', icon: FileCode },
]

const administrativeNavItems = [
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Identity Providers', path: '/identity-providers', icon: ShieldCheck },
]

// Palette for organization color badges (project colors + Tailwind)
const ORG_COLOR_PALETTE = [
  { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  { bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
]

function getOrgColor(uuid: string) {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % ORG_COLOR_PALETTE.length
  return ORG_COLOR_PALETTE[index]
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [orgSelectorOpen, setOrgSelectorOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isLoading: isAuthLoading } = useAuth()
  const { selectedOrganizationUuid, setSelectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()
  const organizations = user?.organizations || []
  const hasNoOrganizations = !isAuthLoading && user && (!user.organizations || user.organizations.length === 0)
  const orgSelectorRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close organization selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgSelectorRef.current && !orgSelectorRef.current.contains(event.target as Node)) {
        setOrgSelectorOpen(false)
      }
    }

    if (orgSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [orgSelectorOpen])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])

  const selectedOrganization = organizations.find(org => org.uuid === selectedOrganizationUuid)
  const canManageOrg = Boolean(selectedOrganization?.is_owner || selectedOrganization?.is_admin)

  // Filter menu items based on search query (Org only when user can manage; Administrative only for admins)
  const isAdmin = user?.role === 'admin'
  const allNavItems = [
    ...generalNavItems,
    ...(canManageOrg ? orgNavItems : []),
    ...(isAdmin ? administrativeNavItems : []),
  ]
  const filteredGeneralItems = generalNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredOrgItems = orgNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredAdministrativeItems = administrativeNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const matchedItem = allNavItems.find((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (matchedItem) {
        navigate(matchedItem.path)
        setSearchQuery('')
        setSidebarOpen(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - style from figma: logo | bar | org selector | search | user */}
      <header className="h-16 border-b border-neutral-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Logo />
          {user && (
            <>
              <div className="h-8 w-px bg-neutral-200 hidden sm:block shrink-0" />
              <div className="relative overflow-visible shrink-0" ref={orgSelectorRef}>
                <button
                  onClick={() => setOrgSelectorOpen(!orgSelectorOpen)}
                  className="flex items-center gap-2 w-[140px] sm:w-[160px] h-9 px-3 rounded-lg text-sm bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-colors min-w-0"
                  title={selectedOrganization ? selectedOrganization.name : 'Select Organization'}
                  disabled={isLoadingOrg}
                >
                  <Building2 className="w-4 h-4 text-neutral-500 shrink-0" />
                  {selectedOrganization && !isLoadingOrg ? (
                    <span className="truncate font-medium text-neutral-700">
                      {selectedOrganization.name}
                    </span>
                  ) : (
                    <span className="truncate text-neutral-600">
                      {isLoadingOrg ? 'Loading...' : 'Select org'}
                    </span>
                  )}
                  <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ml-auto ${orgSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {orgSelectorOpen && organizations.length > 0 && (
                  <div className="absolute left-0 mt-2 w-80 min-w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-soft-lg border border-neutral-200 py-2 z-50 animate-zoom-in">
                    <div className="px-4 py-2 border-b border-neutral-200">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Organizations
                      </span>
                    </div>
                    {organizations.map((org) => {
                      const color = getOrgColor(org.uuid)
                      const isSelected = selectedOrganizationUuid === org.uuid
                      return (
                        <button
                          key={org.uuid}
                          onClick={() => {
                            setSelectedOrganizationUuid(org.uuid)
                            setOrgSelectorOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                            isSelected ? `${color.bg} ${color.text} font-medium` : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                          <span className="flex-1 min-w-0 truncate" title={org.name}>{org.name}</span>
                          {isSelected && (
                            <span className="text-xs font-medium opacity-80">Current</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setUserMenuOpen(false)
                }}
                className="relative p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-5 h-5" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-soft-lg border border-neutral-200 py-4 z-50 animate-zoom-in">
                  <div className="px-4 py-2 border-b border-neutral-200">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Notifications
                    </span>
                  </div>
                  <div className="px-4 py-6 text-center text-sm text-neutral-500">
                    No new notifications.
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen)
                    setNotificationsOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors min-w-0 max-w-[180px] md:max-w-[220px]"
                  title={user.full_name || user.email}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0 bg-neutral-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={16} className="shrink-0" />
                  )}
                  <span className="truncate hidden sm:inline">{user.full_name || user.email}</span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-soft-lg border border-neutral-200 py-2 z-50 animate-zoom-in">
                    <div className="px-4 py-2 border-b border-neutral-200">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Account
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/profile')
                        setUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Settings size={16} className="text-neutral-400" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/tokens')
                        setUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Key size={16} className="text-neutral-400" />
                      <span>Tokens</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <LogOut size={16} className="text-neutral-400" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 mt-16">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40
            ${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-neutral-200 bg-neutral-50/50
            transform transition-all duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            pt-16
            overflow-y-auto
            flex flex-col
          `}
        >
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {/* Search bar */}
            {!sidebarCollapsed && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search menu..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-700 placeholder-neutral-400"
                />
              </div>
            )}

            {/* General menu */}
            <div>
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2 px-3 mb-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    General
                  </span>
                </div>
              )}
              <ul className="space-y-1">
                {filteredGeneralItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors
                          ${isActive
                            ? 'bg-primary-50 text-primary-600 font-medium'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}
                        `}
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${sidebarCollapsed ? '' : ''}`} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Org menu (only when user is owner or admin of the selected organization) */}
            {canManageOrg && (
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 px-3 mb-3">
                    <Building2 size={16} className="text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Org
                    </span>
                  </div>
                )}
                <ul className="space-y-1">
                  {filteredOrgItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors
                            ${isActive
                              ? 'bg-primary-50 text-primary-600 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}
                          `}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Administrative menu (admin only) */}
            {isAdmin && (
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 px-3 mb-3">
                    <Shield size={16} className="text-neutral-400" />
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Administrative
                    </span>
                  </div>
                )}
                <ul className="space-y-1">
                  {filteredAdministrativeItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors
                            ${isActive
                              ? 'bg-primary-50 text-primary-600 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}
                          `}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </nav>

          {/* Collapse Button - style from figma */}
          <div className="p-3 border-t border-neutral-200 mt-auto">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
              title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 p-6 md:p-8 lg:p-10 pb-24 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {hasNoOrganizations && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-center gap-3">
                <Building2 size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    No organization associated
                  </p>
                  <p className="text-sm text-amber-700/90 mt-0.5">
                    Your account is not linked to any organization. Contact an administrator to be added to an organization or create a new one.
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className={`glass-effect-strong border-t border-neutral-200/80 mt-auto transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <div className="w-4 h-4 bg-gradient-primary rounded"></div>
              <span>© {new Date().getFullYear()} Tron Platform. All rights reserved.</span>
            </div>
            <div className="text-sm text-neutral-500">
              <span>Version {APP_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
