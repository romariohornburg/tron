import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, Edit, Users, Calendar, Shield, Globe, Box } from 'lucide-react'
import {
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '../../features/groups'
import { useEnvironments } from '../../features/environments'
import { useApplications } from '../../features/applications'
import { useOrganization } from '../../contexts/OrganizationContext'
import type { Group, GroupCreate, GroupUpdate } from '../../features/groups'
import { DataTable, Breadcrumbs, PageHeader } from '../../shared/components'

function Groups() {
  const { selectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: groups = [], isLoading } = useGroups(selectedOrganizationUuid)
  const { data: environments = [] } = useEnvironments(selectedOrganizationUuid)
  const { data: applications = [] } = useApplications(selectedOrganizationUuid)
  const createMutation = useCreateGroup(selectedOrganizationUuid)
  const updateMutation = useUpdateGroup(selectedOrganizationUuid)
  const deleteMutation = useDeleteGroup(selectedOrganizationUuid)

  const [formData, setFormData] = useState<GroupCreate>({
    organization_id: selectedOrganizationUuid || '',
    name: '',
    description: '',
    scope_level: 'org',
    role: 'ORG_MEMBER',
    is_default: false,
  })

  const resetForm = useCallback(() => {
    setFormData({
      organization_id: selectedOrganizationUuid || '',
      name: '',
      description: '',
      scope_level: 'org',
      role: 'ORG_MEMBER',
      is_default: false,
    })
  }, [selectedOrganizationUuid])

  useEffect(() => {
    if (selectedOrganizationUuid) {
      setFormData((prev) => ({ ...prev, organization_id: selectedOrganizationUuid }))
    }
  }, [selectedOrganizationUuid])

  useEffect(() => {
    if (createMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Group created successfully' })
      setIsOpen(false)
      setEditingGroup(null)
      resetForm()
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isSuccess, createMutation, resetForm])

  useEffect(() => {
    if (createMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (createMutation.error as any)?.response?.data?.detail || 'Error creating group',
      })
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isError, createMutation])

  useEffect(() => {
    if (updateMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Group updated successfully' })
      setIsOpen(false)
      setEditingGroup(null)
      resetForm()
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isSuccess, updateMutation, resetForm])

  useEffect(() => {
    if (updateMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (updateMutation.error as any)?.response?.data?.detail || 'Error updating group',
      })
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isError, updateMutation])

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Group deleted successfully' })
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isSuccess, deleteMutation])

  useEffect(() => {
    if (deleteMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (deleteMutation.error as any)?.response?.data?.detail || 'Error deleting group',
      })
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isError, deleteMutation])

  const getDefaultRoleForScope = (scopeLevel: string): string => {
    switch (scopeLevel) {
      case 'org':
        return 'ORG_MEMBER'
      case 'environment':
        return 'ENV_VIEWER'
      case 'application':
        return 'APP_VIEWER'
      default:
        return 'ORG_MEMBER'
    }
  }

  const handleOpenCreate = () => {
    setEditingGroup(null)
    resetForm()
    setIsOpen(true)
  }

  const handleEdit = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      organization_id: group.organization_id,
      name: group.name,
      description: group.description || '',
      scope_level: group.scope_level,
      role: group.role,
      environment_id: group.environment_id,
      application_id: group.application_id,
      is_default: group.is_default,
    })
    setIsOpen(true)
  }

  const handleDelete = (uuid: string) => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      deleteMutation.mutate(uuid)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      setNotification({ type: 'error', message: 'Name is required' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    // Validate required fields based on scope_level
    if (formData.scope_level === 'environment' && !formData.environment_id) {
      setNotification({ type: 'error', message: 'Environment is required for environment scope' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    if (formData.scope_level === 'application') {
      if (!formData.application_id) {
        setNotification({ type: 'error', message: 'Application is required for application scope' })
        setTimeout(() => setNotification(null), 5000)
        return
      }
    }

    if (editingGroup) {
      const updateData: GroupUpdate = {
        name: formData.name,
        description: formData.description || undefined,
        scope_level: formData.scope_level,
        role: formData.role,
        environment_id: formData.environment_id,
        application_id: formData.application_id,
        is_default: formData.is_default,
      }
      updateMutation.mutate({ uuid: editingGroup.uuid, data: updateData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'org':
        return <Shield size={14} className="text-blue-600" />
      case 'environment':
        return <Globe size={14} className="text-green-600" />
      case 'application':
        return <Box size={14} className="text-purple-600" />
      default:
        return <Shield size={14} className="text-neutral-400" />
    }
  }

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'org':
        return 'Organization'
      case 'environment':
        return 'Environment'
      case 'application':
        return 'Application'
      default:
        return scope
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No organization selected. Please select an organization first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Groups', path: '/groups' },
        ]}
      />

      <div className="flex items-center justify-between">
        <PageHeader title="Groups" description="Manage permission groups and their members" />
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>New Group</span>
        </button>
      </div>

      {/* Information Card */}
      <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-neutral-800">Understanding Scopes and Roles</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Organization Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-neutral-800">Organization Scope</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Groups that apply to the entire organization.
            </p>
            <div className="space-y-2">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs font-mono font-semibold text-blue-900">ORG_OWNER</div>
                <div className="text-xs text-blue-700 mt-1">Full administrative access to the entire organization</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs font-mono font-semibold text-blue-900">ORG_ADMIN</div>
                <div className="text-xs text-blue-700 mt-1">Can manage all applications and organization access permissions</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs font-mono font-semibold text-blue-900">ORG_MEMBER</div>
                <div className="text-xs text-blue-700 mt-1">Can create, delete, and edit all applications in the organization</div>
              </div>
            </div>
          </div>

          {/* Environment Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-green-600" />
              <h3 className="text-sm font-semibold text-neutral-800">Environment Scope</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Groups that apply to a specific environment.
            </p>
            <div className="space-y-2">
              <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                <div className="text-xs font-mono font-semibold text-green-900">ENV_MAINTAINER</div>
                <div className="text-xs text-green-700 mt-1">Can manage all components and instances within the environment</div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                <div className="text-xs font-mono font-semibold text-green-900">ENV_OPERATOR</div>
                <div className="text-xs text-green-700 mt-1">Can edit existing components but cannot create or delete instances</div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                <div className="text-xs font-mono font-semibold text-green-900">ENV_VIEWER</div>
                <div className="text-xs text-green-700 mt-1">Read-only access to all resources within the environment scope</div>
              </div>
            </div>
          </div>

          {/* Application Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Box size={16} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-neutral-800">Application Scope</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Groups that apply to a specific application.
            </p>
            <div className="space-y-2">
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs font-mono font-semibold text-purple-900">APP_MAINTAINER</div>
                <div className="text-xs text-purple-700 mt-1">Full access to manage all aspects of a specific application</div>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs font-mono font-semibold text-purple-900">APP_DEVELOPER</div>
                <div className="text-xs text-purple-700 mt-1">Can edit and modify components within a specific application</div>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs font-mono font-semibold text-purple-900">APP_VIEWER</div>
                <div className="text-xs text-purple-700 mt-1">Read-only access to view resources within a specific application</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-lg p-4 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="glass-effect-strong rounded-2xl shadow-soft-lg overflow-hidden">
        <DataTable<Group>
          searchable={false}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (group) => (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-800">{group.name}</span>
                  {group.is_default && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                      Default
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'scope_level',
              label: 'Scope',
              render: (group) => (
                <div className="flex items-center gap-2">
                  {getScopeIcon(group.scope_level)}
                  <span className="text-sm text-neutral-700">{getScopeLabel(group.scope_level)}</span>
                </div>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (group) => (
                <span className="text-sm text-neutral-700 font-mono">{group.role}</span>
              ),
            },
            {
              key: 'description',
              label: 'Description',
              render: (group) => (
                <span className="text-sm text-neutral-600">{group.description || '-'}</span>
              ),
            },
            {
              key: 'created_at',
              label: 'Created at',
              render: (group) => (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-neutral-400" />
                  <span className="text-sm text-neutral-600">
                    {new Date(group.created_at).toLocaleDateString('en-US')}
                  </span>
                </div>
              ),
            },
          ]}
          data={groups}
          isLoading={isLoading}
          emptyMessage="No groups found"
          loadingColor="blue"
          getRowKey={(group) => group.uuid}
          actions={(group) => [
            {
              label: 'Edit',
              icon: <Edit size={14} />,
              onClick: () => handleEdit(group),
              variant: 'default' as const,
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => handleDelete(group.uuid),
              variant: 'danger' as const,
            },
          ]}
        />
      </div>

      {/* Modal Create/Edit */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-effect-strong rounded-2xl shadow-soft-lg w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gradient">
                {editingGroup ? 'Edit Group' : 'New Group'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setEditingGroup(null)
                  resetForm()
                }}
                className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Group name"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  placeholder="Group description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="scope_level" className="block text-sm font-medium text-neutral-700 mb-2">
                    Scope Level *
                  </label>
                  <select
                    id="scope_level"
                    value={formData.scope_level}
                    onChange={(e) => {
                      const newScopeLevel = e.target.value as 'org' | 'environment' | 'application'
                      setFormData({
                        ...formData,
                        scope_level: newScopeLevel,
                        role: getDefaultRoleForScope(newScopeLevel) as Group['role'],
                        environment_id: undefined,
                        application_id: undefined,
                      })
                    }}
                    className="input w-full"
                    required
                  >
                    <option value="org">Organization</option>
                    <option value="environment">Environment</option>
                    <option value="application">Application</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-2">
                    Role *
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Group['role'] })}
                    className="input w-full"
                    required
                  >
                    {formData.scope_level === 'org' && (
                      <>
                        <option value="ORG_OWNER">ORG_OWNER</option>
                        <option value="ORG_ADMIN">ORG_ADMIN</option>
                        <option value="ORG_BILLING">ORG_BILLING</option>
                        <option value="ORG_MEMBER">ORG_MEMBER</option>
                      </>
                    )}
                    {formData.scope_level === 'environment' && (
                      <>
                        <option value="ENV_MAINTAINER">ENV_MAINTAINER</option>
                        <option value="ENV_OPERATOR">ENV_OPERATOR</option>
                        <option value="ENV_VIEWER">ENV_VIEWER</option>
                      </>
                    )}
                    {formData.scope_level === 'application' && (
                      <>
                        <option value="APP_MAINTAINER">APP_MAINTAINER</option>
                        <option value="APP_DEVELOPER">APP_DEVELOPER</option>
                        <option value="APP_VIEWER">APP_VIEWER</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Environment field - required for environment scope only */}
              {formData.scope_level === 'environment' && (
                <div>
                  <label htmlFor="environment_id" className="block text-sm font-medium text-neutral-700 mb-2">
                    Environment *
                  </label>
                  <select
                    id="environment_id"
                    value={formData.environment_id || ''}
                    onChange={(e) => setFormData({ ...formData, environment_id: e.target.value || undefined })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select an environment</option>
                    {environments.map((env) => (
                      <option key={env.uuid} value={env.uuid}>
                        {env.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Application field - required for application scope */}
              {formData.scope_level === 'application' && (
                <div>
                  <label htmlFor="application_id" className="block text-sm font-medium text-neutral-700 mb-2">
                    Application *
                  </label>
                  <select
                    id="application_id"
                    value={formData.application_id || ''}
                    onChange={(e) => setFormData({ ...formData, application_id: e.target.value || undefined })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select an application</option>
                    {applications.map((app) => (
                      <option key={app.uuid} value={app.uuid}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-neutral-700">Is Default Group</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setEditingGroup(null)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Groups
