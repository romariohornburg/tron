import { useState, useEffect } from 'react'
import { X, Trash2, Plus, Edit, ShieldCheck, Key } from 'lucide-react'
import {
  useIdentityProviders,
  useCreateIdentityProvider,
  useUpdateIdentityProvider,
  useDeleteIdentityProvider,
} from '../../features/identity-providers'
import type {
  IdentityProvider,
  IdentityProviderCreate,
  IdentityProviderUpdate,
} from '../../features/identity-providers'
import { DataTable, Breadcrumbs, PageHeader } from '../../shared/components'

const GOOGLE_URLS = {
  authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_url: 'https://oauth2.googleapis.com/token',
  userinfo_url: 'https://openidconnect.googleapis.com/v1/userinfo',
}

type ProviderType = 'google' | 'microsoft' | 'other'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'provider'
}

const defaultForm: Omit<IdentityProviderCreate, 'slug'> & { client_secret_optional?: string } = {
  display_name: '',
  client_id: '',
  client_secret: '',
  authorization_url: '',
  token_url: '',
  userinfo_url: '',
  scopes: 'openid email profile',
  is_enabled: true,
}

function IdentityProviders() {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<IdentityProvider | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IdentityProvider | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [providerType, setProviderType] = useState<ProviderType>('google')

  const { data: providers = [], isLoading } = useIdentityProviders()
  const createMutation = useCreateIdentityProvider()
  const updateMutation = useUpdateIdentityProvider()
  const deleteMutation = useDeleteIdentityProvider()

  useEffect(() => {
    if (createMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Identity provider created' })
      setIsOpen(false)
      setEditing(null)
      setProviderType('google')
      setFormData(defaultForm)
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isSuccess, createMutation])

  useEffect(() => {
    if (createMutation.isError) {
      setNotification({
        type: 'error',
        message:
          (createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Error creating identity provider',
      })
      setTimeout(() => setNotification(null), 5000)
      createMutation.reset()
    }
  }, [createMutation.isError, createMutation])

  useEffect(() => {
    if (updateMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Identity provider updated' })
      setIsOpen(false)
      setEditing(null)
      setProviderType('google')
      setFormData(defaultForm)
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isSuccess, updateMutation])

  useEffect(() => {
    if (updateMutation.isError) {
      setNotification({
        type: 'error',
        message:
          (updateMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Error updating identity provider',
      })
      setTimeout(() => setNotification(null), 5000)
      updateMutation.reset()
    }
  }, [updateMutation.isError, updateMutation])

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Identity provider deleted' })
      setDeleteTarget(null)
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isSuccess, deleteMutation])

  useEffect(() => {
    if (deleteMutation.isError) {
      setNotification({
        type: 'error',
        message:
          (deleteMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Error deleting identity provider',
      })
      setTimeout(() => setNotification(null), 5000)
      deleteMutation.reset()
    }
  }, [deleteMutation.isError, deleteMutation])

  const handleOpenCreate = () => {
    setEditing(null)
    setProviderType('google')
    setFormData({
      ...defaultForm,
      display_name: 'Google',
      authorization_url: GOOGLE_URLS.authorization_url,
      token_url: GOOGLE_URLS.token_url,
      userinfo_url: GOOGLE_URLS.userinfo_url,
    })
    setIsOpen(true)
  }

  const handleProviderTypeChange = (type: ProviderType) => {
    setProviderType(type)
    if (type === 'google') {
      setFormData((prev) => ({
        ...prev,
        display_name: 'Google',
        authorization_url: GOOGLE_URLS.authorization_url,
        token_url: GOOGLE_URLS.token_url,
        userinfo_url: GOOGLE_URLS.userinfo_url,
      }))
    } else if (type === 'microsoft') {
      setFormData((prev) => ({
        ...prev,
        display_name: 'Microsoft',
        authorization_url: '',
        token_url: '',
        userinfo_url: '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        display_name: '',
        authorization_url: '',
        token_url: '',
        userinfo_url: '',
      }))
    }
  }

  const handleEdit = (provider: IdentityProvider) => {
    setEditing(provider)
    setProviderType(
      provider.slug === 'google' ? 'google' : provider.slug === 'microsoft' ? 'microsoft' : 'other'
    )
    setFormData({
      display_name: provider.display_name,
      client_id: provider.client_id,
      client_secret: '',
      authorization_url: provider.authorization_url,
      token_url: provider.token_url,
      userinfo_url: provider.userinfo_url || '',
      scopes: provider.scopes,
      is_enabled: provider.is_enabled,
    })
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const data: IdentityProviderUpdate = {
        display_name: formData.display_name,
        client_id: formData.client_id,
        authorization_url: formData.authorization_url,
        token_url: formData.token_url,
        userinfo_url: formData.userinfo_url || null,
        scopes: formData.scopes,
        is_enabled: formData.is_enabled,
      }
      if (formData.client_secret) data.client_secret = formData.client_secret
      await updateMutation.mutateAsync({ uuid: editing.uuid, data })
    } else {
      const slug =
        providerType === 'google'
          ? 'google'
          : providerType === 'microsoft'
            ? 'microsoft'
            : slugify(formData.display_name)
      await createMutation.mutateAsync({
        slug,
        display_name: formData.display_name,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        authorization_url: formData.authorization_url,
        token_url: formData.token_url,
        userinfo_url: formData.userinfo_url || undefined,
        scopes: formData.scopes,
        is_enabled: formData.is_enabled,
      })
    }
  }

  const handleDelete = (provider: IdentityProvider) => {
    setDeleteTarget(provider)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.uuid)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Identity Providers', path: '/identity-providers' },
        ]}
      />

      <div className="flex items-center justify-between">
        <PageHeader
          title="Identity Providers"
          description="Configure OAuth2/OIDC providers for social login (Google, Microsoft, etc.)"
        />
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span>New Provider</span>
        </button>
      </div>

      {notification && (
        <div
          className={`rounded-lg p-4 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-success/10 border border-success/20 text-success'
              : 'bg-error/10 border border-error/20 text-error'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="glass-effect-strong rounded-2xl shadow-soft-lg overflow-hidden">
        <DataTable<IdentityProvider>
          searchable={true}
          searchPlaceholder="Search by slug or name..."
          columns={[
            {
              key: 'slug',
              label: 'Slug',
              render: (p) => (
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-neutral-400" />
                  <span className="font-mono text-sm font-medium">{p.slug}</span>
                </div>
              ),
            },
            {
              key: 'display_name',
              label: 'Display Name',
              render: (p) => (
                <span className="text-sm text-neutral-800">{p.display_name}</span>
              ),
            },
            {
              key: 'client_id',
              label: 'Client ID',
              render: (p) => (
                <span className="text-sm text-neutral-600 font-mono truncate max-w-[200px] block" title={p.client_id}>
                  {p.client_id}
                </span>
              ),
            },
            {
              key: 'is_enabled',
              label: 'Status',
              render: (p) => (
                <div className="flex items-center gap-2">
                  {p.is_enabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-800">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800">
                      <X size={14} className="text-amber-600" />
                      Disabled
                    </span>
                  )}
                </div>
              ),
            },
          ]}
          data={providers}
          isLoading={isLoading}
          emptyMessage="No identity providers configured"
          loadingColor="blue"
          getRowKey={(p) => p.uuid}
          actions={(p) => [
            {
              label: 'Edit',
              icon: <Edit size={14} />,
              onClick: () => handleEdit(p),
              variant: 'default',
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => handleDelete(p),
              variant: 'danger',
            },
          ]}
        />
      </div>

      {/* Modal Create/Edit */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-effect-strong rounded-2xl shadow-soft-lg w-full max-w-lg p-6 space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gradient">
                {editing ? 'Edit Identity Provider' : 'New Identity Provider'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setEditing(null)
                  setProviderType('google')
                  setFormData(defaultForm)
                }}
                className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Provider type</label>
                  <select
                    value={providerType}
                    onChange={(e) => handleProviderTypeChange(e.target.value as ProviderType)}
                    className="input w-full"
                  >
                    <option value="google">Google</option>
                    <option value="microsoft">Microsoft</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Display Name *</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="input w-full"
                  placeholder={providerType === 'other' ? 'e.g. My IdP' : undefined}
                  required
                />
                {!editing && providerType === 'other' && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Slug will be generated from this name (e.g. &quot;My IdP&quot; → my-idp).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Client ID *</label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Client Secret {editing ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                  className="input w-full"
                  placeholder={editing ? '••••••••' : ''}
                  required={!editing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Authorization URL *</label>
                <input
                  type="url"
                  value={formData.authorization_url}
                  onChange={(e) => setFormData({ ...formData, authorization_url: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Token URL *</label>
                <input
                  type="url"
                  value={formData.token_url}
                  onChange={(e) => setFormData({ ...formData, token_url: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Userinfo URL</label>
                <input
                  type="url"
                  value={formData.userinfo_url || ''}
                  onChange={(e) => setFormData({ ...formData, userinfo_url: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Scopes</label>
                <input
                  type="text"
                  value={formData.scopes}
                  onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                  className="input w-full"
                  placeholder="openid email profile"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="is_enabled" className="text-sm text-neutral-700">
                  Enabled (show on login page)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setEditing(null)
                    setProviderType('google')
                    setFormData(defaultForm)
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

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-effect-strong rounded-2xl shadow-soft-lg w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-800">Delete Identity Provider?</h3>
            <p className="text-neutral-600">
              Remove &quot;{deleteTarget.display_name}&quot; ({deleteTarget.slug})? Users who signed in with this
              provider will need to use another method or re-link their account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="btn-primary bg-error hover:bg-error/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IdentityProviders
