import { useState, useEffect, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, X, RefreshCw, Server, ChevronRight, ChevronDown, Layers, Globe, Clock, Cpu, Search, AppWindow } from 'lucide-react'
import { useInstances } from '../../features/instances'
import { useDeleteApplication } from '../../features/applications'
import { useOrganization } from '../../contexts/OrganizationContext'
import type { Instance } from '../../features/instances'
import { useQueryClient } from '@tanstack/react-query'
import { Breadcrumbs, PageHeader } from '../../shared/components'
import ActionMenu from '../../shared/components/ActionMenu'

/** Application with its instances, for grouping the instances response by application. */
export interface ApplicationWithInstances {
  application: Instance['application']
  instances: Instance[]
}

function groupInstancesByApplication(instances: Instance[]): ApplicationWithInstances[] {
  const byApp = new Map<string, Instance[]>()
  for (const inst of instances) {
    const key = inst.application.uuid
    if (!byApp.has(key)) byApp.set(key, [])
    byApp.get(key)!.push(inst)
  }
  return Array.from(byApp.entries()).map(([, insts]) => ({
    application: insts[0].application,
    instances: insts,
  }))
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response
    const detail = res?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d?.msg ?? String(d)).join(', ') || fallback
  }
  return fallback
}

// Palette for environment color badges
const ENV_COLOR_PALETTE = [
  'badge bg-primary-100 text-primary-800 border-primary-200',
  'badge bg-accent-100 text-accent-800 border-accent-200',
  'badge bg-blue-100 text-blue-800 border-blue-200',
  'badge bg-emerald-100 text-emerald-800 border-emerald-200',
  'badge bg-violet-100 text-violet-800 border-violet-200',
  'badge bg-amber-100 text-amber-800 border-amber-200',
  'badge bg-rose-100 text-rose-800 border-rose-200',
  'badge bg-sky-100 text-sky-800 border-sky-200',
  'badge bg-indigo-100 text-indigo-800 border-indigo-200',
  'badge bg-pink-100 text-pink-800 border-pink-200',
  'badge bg-teal-100 text-teal-800 border-teal-200',
  'badge bg-orange-100 text-orange-800 border-orange-200',
]

function getEnvironmentBadgeColor(uuid: string): string {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % ENV_COLOR_PALETTE.length
  return ENV_COLOR_PALETTE[index]
}

function Applications() {
  const navigate = useNavigate()
  const { selectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expandedApplications, setExpandedApplications] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState<string>('')

  const queryClient = useQueryClient()
  const { data: instances = [], isLoading, isError, error, refetch } = useInstances(selectedOrganizationUuid)
  const deleteApplicationMutation = useDeleteApplication(selectedOrganizationUuid)

  const applicationsWithInstances = useMemo(
    () => groupInstancesByApplication(instances),
    [instances]
  )

  // Filter applications by search term
  const filteredApplications = useMemo(() => {
    if (!searchTerm.trim()) {
      return applicationsWithInstances
    }
    const searchLower = searchTerm.toLowerCase().trim()
    return applicationsWithInstances.filter((app) =>
      app.application.name.toLowerCase().includes(searchLower)
    )
  }, [applicationsWithInstances, searchTerm])

  const toggleExpand = (applicationUuid: string) => {
    setExpandedApplications((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(applicationUuid)) {
        newSet.delete(applicationUuid)
      } else {
        newSet.add(applicationUuid)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (deleteApplicationMutation.isError) {
      setNotification({
        type: 'error',
        message: getErrorMessage(deleteApplicationMutation.error, 'Failed to delete application'),
      })
      setTimeout(() => setNotification(null), 5000)
      deleteApplicationMutation.reset()
    }
  }, [deleteApplicationMutation.isError, deleteApplicationMutation])

  const handleDeleteApplication = (applicationUuid: string) => {
    if (
      confirm(
        'Are you sure you want to delete this application? This will delete the application and all its instances.'
      )
    ) {
      deleteApplicationMutation.mutate(applicationUuid, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['instances', selectedOrganizationUuid] })
        },
      })
    }
  }

  if (isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-neutral-600">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!selectedOrganizationUuid) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: 'Applications', path: '/applications' },
          ]}
        />
        <div className="rounded-lg p-4 bg-yellow-50 border border-yellow-200 text-yellow-800">
          <p>No organization selected. Please select an organization first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Applications', path: '/applications' },
        ]}
      />

      {notification && (
        <div
          className={`rounded-lg p-4 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <PageHeader title="Applications" description="Manage applications" />
        <button
          onClick={() => navigate('/applications/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>New Application</span>
        </button>
      </div>

      {/* Concepts Explanation Card */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border border-blue-100/50 shadow-soft">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Understanding Applications
          </h2>
          <p className="text-slate-700 text-xs leading-relaxed">
            Applications in Tron represent your containerized software projects. Each application can have multiple instances deployed across different environments, and each instance contains one or more components that define how your application runs.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <AppWindow className="text-purple-600" size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">Application</h3>
            </div>
            <p className="text-xs text-slate-600 leading-tight">
              Containerized software project<br />with repository and image
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Server className="text-green-600" size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">Instance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-tight">
              Deployment in a specific<br />environment with components
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Globe className="text-blue-600" size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">Webapp</h3>
            </div>
            <p className="text-xs text-slate-600 leading-tight">
              HTTP/HTTPS service<br />exposed via ingress
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <Clock className="text-orange-600" size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">Cron</h3>
            </div>
            <p className="text-xs text-slate-600 leading-tight">
              Scheduled job running<br />at specified intervals
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Cpu className="text-indigo-600" size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">Worker</h3>
            </div>
            <p className="text-xs text-slate-600 leading-tight">
              Background process for<br />queue processing and tasks
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-effect rounded-lg p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 pr-10 w-full"
            placeholder="Search by application name..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-4">
          <p className="text-sm">
            {getErrorMessage(error, 'Failed to load instances. Please try again.')}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      ) : (
      <div className="glass-effect rounded-xl shadow-soft overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-gradient-subtle">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider w-12"></th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Repository / Image:Version
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Components
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Update Date
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600"></div>
                      <span className="text-sm text-neutral-600">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 text-sm">
                    {searchTerm ? 'No applications found matching your search' : 'No applications found'}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((row) => {
                  const isExpanded = expandedApplications.has(row.application.uuid)
                  return (
                    <Fragment key={row.application.uuid}>
                      <tr
                        className="hover:bg-primary-50/30 transition-colors border-b border-neutral-50 cursor-pointer"
                        onClick={() => toggleExpand(row.application.uuid)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-neutral-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-neutral-500" />
                          )}
                        </td>
                        <td className="pl-0 pr-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                              <AppWindow className="h-5 w-5 text-neutral-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{row.application.name}</div>
                              <small className="text-xs text-slate-500">{row.application.uuid}</small>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{row.application.repository || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">-</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.application.enabled ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">
                            {new Date(row.application.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <ActionMenu
                              items={[
                                {
                                  label: 'New Instance',
                                  icon: <Layers size={14} />,
                                  onClick: () => navigate(`/applications/${row.application.uuid}/instances/new`),
                                  variant: 'default' as const,
                                },
                                {
                                  label: 'Delete',
                                  icon: <Trash2 size={14} />,
                                  onClick: () => handleDeleteApplication(row.application.uuid),
                                  variant: 'danger' as const,
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        row.instances.map((instance) => (
                        <tr
                          key={instance.uuid}
                          className="bg-neutral-50/50 hover:bg-neutral-100/50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(
                              `/applications/${row.application.uuid}/instances/${instance.uuid}/components`
                            )
                          }}
                        >
                          <td className="px-6 py-3"></td>
                          <td className="px-6 py-3">
                            <div className="pl-4 flex items-center gap-2">
                              <Server className="h-4 w-4 text-neutral-500" />
                              <span className={getEnvironmentBadgeColor(instance.environment.uuid)}>
                                Environment: {instance.environment.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-neutral-600 truncate max-w-xs" title={`${instance.image}:${instance.version}`}>
                              {instance.image}:{instance.version}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3 pl-4">
                              {(() => {
                                const webappCount = instance.components.filter(c => c.type === 'webapp').length
                                const cronCount = instance.components.filter(c => c.type === 'cron').length
                                const workerCount = instance.components.filter(c => c.type === 'worker').length
                                return (
                                  <>
                                    {webappCount > 0 && (
                                      <div className="flex items-center gap-1" title={`${webappCount} Webapp${webappCount > 1 ? 's' : ''}`}>
                                        <Globe size={14} className="text-emerald-600" />
                                        <span className="text-xs text-neutral-600">{webappCount}</span>
                                      </div>
                                    )}
                                    {cronCount > 0 && (
                                      <div className="flex items-center gap-1" title={`${cronCount} Cron${cronCount > 1 ? 's' : ''}`}>
                                        <Clock size={14} className="text-orange-600" />
                                        <span className="text-xs text-neutral-600">{cronCount}</span>
                                      </div>
                                    )}
                                    {workerCount > 0 && (
                                      <div className="flex items-center gap-1" title={`${workerCount} Worker${workerCount > 1 ? 's' : ''}`}>
                                        <Cpu size={14} className="text-purple-600" />
                                        <span className="text-xs text-neutral-600">{workerCount}</span>
                                      </div>
                                    )}
                                    {webappCount === 0 && cronCount === 0 && workerCount === 0 && (
                                      <span className="text-xs text-neutral-400">-</span>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-neutral-600">
                              {instance.enabled ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Enabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-600">
                              {new Date(instance.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex justify-end">
                              <ActionMenu
                                items={[
                                  {
                                    label: 'View',
                                    icon: <Server size={14} />,
                                    onClick: () =>
                                      navigate(
                                        `/applications/${row.application.uuid}/instances/${instance.uuid}/components`
                                      ),
                                    variant: 'default' as const,
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}

export default Applications
