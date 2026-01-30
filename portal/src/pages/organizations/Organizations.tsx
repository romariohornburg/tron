import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Building2, Calendar, Users, FolderTree, User } from 'lucide-react'
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from '../../features/organizations'
import { useUsers } from '../../features/users'
import type { Organization, OrganizationCreate } from '../../features/organizations'
import { DataTable, Breadcrumbs, PageHeader } from '../../shared/components'
import { useAuth } from '../../contexts/AuthContext'

function Organizations() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: organizations = [], isLoading } = useOrganizations()
  const { data: users = [] } = useUsers()
  const createMutation = useCreateOrganization()
  const updateMutation = useUpdateOrganization()
  const deleteMutation = useDeleteOrganization()

  const [formData, setFormData] = useState<OrganizationCreate & { owner_user_id?: string }>({
    name: '',
    owner_user_id: currentUser?.uuid || '',
  })

  useEffect(() => {
    if (createMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Organization created successfully' })
      setIsOpen(false)
      setEditingOrganization(null)
      resetForm()
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isSuccess, createMutation])

  useEffect(() => {
    if (createMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (createMutation.error as any)?.response?.data?.detail || 'Error creating organization',
      })
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isError, createMutation])

  useEffect(() => {
    if (updateMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Organization updated successfully' })
      setIsOpen(false)
      setEditingOrganization(null)
      resetForm()
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isSuccess, updateMutation])

  useEffect(() => {
    if (updateMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (updateMutation.error as any)?.response?.data?.detail || 'Error updating organization',
      })
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isError, updateMutation])

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Organization deleted successfully' })
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isSuccess, deleteMutation])

  useEffect(() => {
    if (deleteMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (deleteMutation.error as any)?.response?.data?.detail || 'Error deleting organization',
      })
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isError, deleteMutation])

  const resetForm = () => {
    setFormData({
      name: '',
      owner_user_id: currentUser?.uuid || '',
    })
  }

  const handleOpenCreate = () => {
    setEditingOrganization(null)
    resetForm()
    setIsOpen(true)
  }

  const handleEdit = (organization: Organization) => {
    setEditingOrganization(organization)
    setFormData({
      name: organization.name,
      owner_user_id: organization.owner_user_id,
    })
    setIsOpen(true)
  }

  const handleDelete = (uuid: string) => {
    if (window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
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

    if (editingOrganization) {
      updateMutation.mutate({
        uuid: editingOrganization.uuid,
        data: {
          name: formData.name,
          ...(formData.owner_user_id ? { owner_user_id: formData.owner_user_id } : {}),
        },
      })
    } else {
      createMutation.mutate({
        name: formData.name,
        ...(formData.owner_user_id ? { owner_user_id: formData.owner_user_id } : {}),
      })
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Organizations', path: '/organizations' },
        ]}
      />

      <div className="flex items-center justify-between">
        <PageHeader title="Organizations" description="Manage organizations and their members" />
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>New Organization</span>
        </button>
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
        <DataTable<Organization>
          searchable={false}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (org) => (
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-neutral-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-neutral-800">{org.name}</span>
                    <span className="text-xs text-neutral-500 font-mono truncate">{org.uuid}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'members_count',
              label: 'Members',
              render: (org) => (
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-neutral-400" />
                  <span className="text-sm text-neutral-700">{org.members?.length ?? 0}</span>
                </div>
              ),
            },
            {
              key: 'groups_count',
              label: 'Groups',
              render: (org) => (
                <div className="flex items-center gap-2">
                  <FolderTree size={14} className="text-neutral-400" />
                  <span className="text-sm text-neutral-700">{org.groups?.length ?? 0}</span>
                </div>
              ),
            },
            {
              key: 'owner',
              label: 'Owner',
              // owner_email comes from GET /organizations response
              render: (org) => (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-neutral-400" />
                  <span className="text-sm text-neutral-700">{org.owner_email ?? '—'}</span>
                </div>
              ),
            },
            {
              key: 'created_at',
              label: 'Created at',
              render: (org) => (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-neutral-400" />
                  <span className="text-sm text-neutral-600">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ),
            },
          ]}
          data={organizations}
          isLoading={isLoading}
          emptyMessage="No organizations found"
          loadingColor="blue"
          getRowKey={(org) => org.uuid}
          actions={(org) => [
            {
              label: 'View Details',
              icon: <Building2 size={14} />,
              onClick: () => navigate(`/organizations/${org.uuid}`),
              variant: 'default' as const,
            },
          ]}
        />
      </div>

      {/* Modal Create/Edit */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-effect-strong rounded-2xl shadow-soft-lg w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gradient">
                {editingOrganization ? 'Edit Organization' : 'New Organization'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setEditingOrganization(null)
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
                  placeholder="Organization name"
                  required
                />
              </div>

              <div>
                <label htmlFor="owner_user_id" className="block text-sm font-medium text-neutral-700 mb-2">
                  Owner *
                </label>
                <select
                  id="owner_user_id"
                  value={formData.owner_user_id || ''}
                  onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">Select owner...</option>
                  {users.map((user) => (
                    <option key={user.uuid} value={user.uuid}>
                      {user.full_name || user.email} {user.email !== user.full_name ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
                {editingOrganization && (
                  <p className="text-xs text-neutral-500 mt-1">Changing owner updates permissions; new owner is added to org groups.</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setEditingOrganization(null)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <span>{editingOrganization ? 'Save' : 'Create'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Organizations
