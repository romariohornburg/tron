import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Layers, X, RefreshCw, Server } from 'lucide-react'
import { useInstances } from '../../features/instances'
import { useDeleteApplication } from '../../features/applications'
import { useOrganization } from '../../contexts/OrganizationContext'
import type { Instance } from '../../features/instances'
import { useQueryClient } from '@tanstack/react-query'
import { DataTable, Breadcrumbs, PageHeader, type ActionMenuItem } from '../../shared/components'

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
    const res = (error as { response?: { data?: { detail?: string } } }).response
    const detail = res?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join(', ') || fallback
  }
  return fallback
}

function Applications() {
  const navigate = useNavigate()
  const { selectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const queryClient = useQueryClient()
  const { data: instances = [], isLoading, isError, error, refetch } = useInstances(selectedOrganizationUuid)
  const deleteApplicationMutation = useDeleteApplication(selectedOrganizationUuid)

  const applicationsWithInstances = useMemo(
    () => groupInstancesByApplication(instances),
    [instances]
  )

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
      <DataTable<ApplicationWithInstances>
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (row) => (
              <div>
                <div className="text-sm font-medium text-slate-800">{row.application.name}</div>
                <small className="text-xs text-slate-500">{row.application.uuid}</small>
              </div>
            ),
          },
          {
            key: 'environments',
            label: 'Environments',
            render: (row) => (
              <div className="text-sm text-slate-600">
                {row.instances.length === 1
                  ? row.instances[0].environment.name
                  : `${row.instances.length} environments`}
              </div>
            ),
          },
          {
            key: 'repository',
            label: 'Repository',
            render: (row) => (
              <div className="text-sm text-slate-600">{row.application.repository || '-'}</div>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <div>
                {row.application.enabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Disabled
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'created_at',
            label: 'Creation Date',
            render: (row) => (
              <div className="text-sm text-slate-600">
                {new Date(row.application.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ),
          },
          {
            key: 'updated_at',
            label: 'Update Date',
            render: (row) => (
              <div className="text-sm text-slate-600">
                {new Date(row.application.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ),
          },
        ]}
        data={applicationsWithInstances}
        isLoading={isLoading}
        emptyMessage="No applications found"
        loadingColor="blue"
        getRowKey={(row) => row.application.uuid}
        actions={(row): ActionMenuItem[] => [
          ...row.instances.map((instance) => ({
            label: `View (${instance.environment.name})`,
            icon: <Server size={14} />,
            onClick: () =>
              navigate(
                `/applications/${row.application.uuid}/instances/${instance.uuid}/components`
              ),
            variant: 'default' as const,
          })),
          {
            label: 'New Instance',
            icon: <Layers size={14} />,
            onClick: () =>
              navigate(`/applications/${row.application.uuid}/instances/new`),
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
      )}
    </div>
  )
}

export default Applications
