import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  User as UserIcon,
  Calendar,
  ArrowLeft,
  Users,
  FolderTree,
  Globe,
  Shield,
  Plus,
  X,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useOrganization, organizationsApi } from '../../features/organizations'
import {
  useAddMemberToOrganization,
  useUpdateOrganizationMember,
  useDeleteOrganizationMember,
  useUpdateOrganization,
  useDeleteOrganization,
  useOrganizationMembers,
  useAddMemberToGroup,
  useRemoveMemberFromGroup,
} from '../../features/organizations/hooks/useOrganizations'
import { useGroups } from '../../features/groups'
import { useUsers } from '../../features/users'
import { Breadcrumbs, PageHeader } from '../../shared/components'
import { useAuth } from '../../contexts/AuthContext'
import MemberGroupsModal from './MemberGroupsModal'
import type { OrganizationMember } from '../../features/organizations/types'

function OrganizationDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { data: organization, isLoading } = useOrganization(uuid)
  const { data: users = [] } = useUsers()
  const { data: groups = [] } = useGroups(uuid || undefined)
  const isOwner = !!organization && !!currentUser && organization.owner_user_id === currentUser.uuid
  const { data: membersFromEndpoint } = useOrganizationMembers(uuid, { enabled: !!uuid && !!organization && isOwner })
  const members = useMemo(() => {
    return isOwner ? (membersFromEndpoint ?? organization?.members ?? []) : (organization?.members ?? [])
  }, [isOwner, membersFromEndpoint, organization?.members])
  const ownerMember = members.find((m) => m.is_owner)
  const addMemberMutation = useAddMemberToOrganization()
  const updateMemberMutation = useUpdateOrganizationMember()
  const deleteMemberMutation = useDeleteOrganizationMember()
  const updateOrganizationMutation = useUpdateOrganization()
  const deleteOrganizationMutation = useDeleteOrganization()
  const addMemberToGroupMutation = useAddMemberToGroup()
  const removeMemberFromGroupMutation = useRemoveMemberFromGroup()
  const canEditOrg = currentUser?.role === 'admin'
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editingOwner, setEditingOwner] = useState(false)
  const [editOwnerUserId, setEditOwnerUserId] = useState('')
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedGroupUuidsForNewMember, setSelectedGroupUuidsForNewMember] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [relatedResourcesCollapsed, setRelatedResourcesCollapsed] = useState(true)
  const [membersSearchQuery, setMembersSearchQuery] = useState('')
  const [membersStatusFilter, setMembersStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [membersGroupFilter, setMembersGroupFilter] = useState('')
  const [membersPage, setMembersPage] = useState(0)
  const [memberGroupsMap, setMemberGroupsMap] = useState<Record<string, string[]>>({})

  const MEMBERS_PAGE_SIZE = 10

  // Fetch member groups for display on cards and for group filter
  useEffect(() => {
    if (!uuid || !members.length) {
      setMemberGroupsMap({})
      return
    }
    let cancelled = false
    const fetchGroups = async () => {
      const entries = await Promise.all(
        members.map(async (m) => {
          try {
            const list = await organizationsApi.getMemberGroups(uuid, m.uuid)
            const uuids = Array.isArray(list) ? list.map((g: { uuid?: string }) => g.uuid).filter(Boolean) as string[] : []
            return [m.uuid, uuids] as const
          } catch {
            return [m.uuid, []] as const
          }
        })
      )
      if (!cancelled) {
        setMemberGroupsMap(Object.fromEntries(entries))
      }
    }
    fetchGroups()
    return () => { cancelled = true }
  }, [uuid, members])

  const filteredMembers = useMemo(() => {
    if (!members.length) return []
    let list = [...members]
    const q = membersSearchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((m) => {
        const u = users.find((u) => u.uuid === m.user_id)
        const name = (m.full_name ?? u?.full_name ?? u?.email ?? m.email ?? '').toLowerCase()
        const email = (u?.email ?? m.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q) || m.user_id.toLowerCase().includes(q)
      })
    }
    if (membersStatusFilter !== 'all') {
      list = list.filter((m) => m.status === membersStatusFilter)
    }
    if (membersGroupFilter && Object.keys(memberGroupsMap).length > 0) {
      list = list.filter((m) => memberGroupsMap[m.uuid]?.includes(membersGroupFilter))
    }
    return list
  }, [members, users, membersSearchQuery, membersStatusFilter, membersGroupFilter, memberGroupsMap])

  const totalFilteredPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PAGE_SIZE))
  const paginatedMembers = useMemo(() => {
    const start = membersPage * MEMBERS_PAGE_SIZE
    return filteredMembers.slice(start, start + MEMBERS_PAGE_SIZE)
  }, [filteredMembers, membersPage])

  useEffect(() => {
    setMembersPage(0)
  }, [membersSearchQuery, membersStatusFilter, membersGroupFilter])

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const res = (error as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response
      const detail = res?.data?.detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d?.msg ?? String(d)).join(', ') || fallback
    }
    return fallback
  }

  const toggleGroupForNewMember = (groupUuid: string) => {
    setSelectedGroupUuidsForNewMember((prev) =>
      prev.includes(groupUuid) ? prev.filter((u) => u !== groupUuid) : [...prev, groupUuid]
    )
  }

  const getOwnerName = (ownerUserId: string) => {
    const owner = users.find((u) => u.uuid === ownerUserId)
    return owner ? owner.full_name || owner.email : 'Unknown'
  }

  const getOwnerEmail = (ownerUserId: string) => {
    const owner = users.find((u) => u.uuid === ownerUserId)
    return owner ? owner.email : 'Unknown'
  }

  const getMemberGroupNames = (memberUuid: string): string => {
    const groupUuids = memberGroupsMap[memberUuid] ?? []
    if (groupUuids.length === 0) return '—'
    const names = groupUuids
      .map((gUuid) => organization?.groups?.find((g) => g.uuid === gUuid)?.name)
      .filter(Boolean) as string[]
    return names.length > 0 ? names.join(', ') : '—'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Organization not found</p>
          <button
            onClick={() => navigate('/organizations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Organizations', path: '/organizations' },
          { label: organization.name },
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
        <PageHeader
          title={organization.name}
          description="Organization details and information"
        />
        <button
          onClick={() => navigate('/organizations')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Organizations</span>
        </button>
      </div>

      {/* Danger zone */}
      {canEditOrg && (
        <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 border border-red-200 bg-red-50/30">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Danger zone</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Deleting this organization is permanent and cannot be undone. All members, groups, and related data will be removed.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to delete this organization? This action cannot be undone.'
                )
              ) {
                deleteOrganizationMutation.mutate(organization.uuid, {
                  onSuccess: () => navigate('/organizations'),
                  onError: (error) => {
                    setNotification({
                      type: 'error',
                      message: getErrorMessage(error, 'Failed to delete organization'),
                    })
                  },
                })
              }
            }}
            disabled={deleteOrganizationMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            <span>{deleteOrganizationMutation.isPending ? 'Deleting...' : 'Delete organization'}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Information */}
        <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-neutral-800">Organization Information</h2>
            </div>
            {canEditOrg && !editingName && (
              <button
                onClick={() => {
                  setEditName(organization.name)
                  setEditingName(true)
                }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
              {editingName ? (
                <div className="space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Organization name"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!uuid) return
                        updateOrganizationMutation.mutate(
                          { uuid, data: { name: editName } },
                          {
                            onSuccess: () => {
                              setEditingName(false)
                              setNotification({ type: 'success', message: 'Organization name updated' })
                              setTimeout(() => setNotification(null), 5000)
                            },
                            onError: (error) => {
                              setNotification({
                                type: 'error',
                                message: getErrorMessage(error, 'Failed to update organization name'),
                              })
                            },
                          }
                        )
                      }}
                      disabled={!editName.trim() || updateOrganizationMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateOrganizationMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false)
                        setEditName(organization.name)
                      }}
                      disabled={updateOrganizationMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium text-neutral-800">{organization.name}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">UUID</label>
              <div className="text-sm text-neutral-600 font-mono">{organization.uuid}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Created At</label>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Calendar size={14} />
                <span>{new Date(organization.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <UserIcon size={20} className="text-green-600" />
              <h2 className="text-lg font-semibold text-neutral-800">Owner</h2>
            </div>
            {canEditOrg && !editingOwner && (
              <button
                onClick={() => {
                  setEditOwnerUserId(ownerMember?.user_id ?? organization.owner_user_id)
                  setEditingOwner(true)
                }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {editingOwner ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Select owner</label>
                  <select
                    value={editOwnerUserId}
                    onChange={(e) => setEditOwnerUserId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {users.map((user) => (
                      <option key={user.uuid} value={user.uuid}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!uuid) return
                      updateOrganizationMutation.mutate(
                        { uuid, data: { owner_user_id: editOwnerUserId } },
                        {
                          onSuccess: () => {
                            setEditingOwner(false)
                            setNotification({ type: 'success', message: 'Owner updated' })
                            setTimeout(() => setNotification(null), 5000)
                          },
                          onError: (error) => {
                            setNotification({
                              type: 'error',
                              message: getErrorMessage(error, 'Failed to update owner'),
                            })
                          },
                        }
                      )
                    }}
                    disabled={updateOrganizationMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateOrganizationMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingOwner(false)
                      setEditOwnerUserId(ownerMember?.user_id ?? organization.owner_user_id)
                    }}
                    disabled={updateOrganizationMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                  <div className="flex items-center gap-2 text-sm text-neutral-800">
                    <UserIcon size={14} className="text-neutral-400" />
                    <span>
                      {ownerMember
                        ? (ownerMember.full_name ||
                          users.find((u) => u.uuid === ownerMember.user_id)?.full_name ||
                          users.find((u) => u.uuid === ownerMember.user_id)?.email ||
                          ownerMember.email ||
                          'Unknown')
                        : getOwnerName(organization.owner_user_id)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Email</label>
                  <div className="text-sm text-neutral-600">
                    {ownerMember
                      ? (ownerMember.email ?? users.find((u) => u.uuid === ownerMember.user_id)?.email ?? ownerMember.user_id)
                      : getOwnerEmail(organization.owner_user_id)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">User UUID</label>
                  <div className="text-sm text-neutral-600 font-mono">
                    {ownerMember ? ownerMember.user_id : organization.owner_user_id}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Member Modal */}
      {showEditMemberModal && selectedMember && (
        <MemberGroupsModal
          organizationUuid={uuid!}
          member={selectedMember}
          groups={groups}
          onClose={() => {
            setShowEditMemberModal(false)
            setSelectedMember(null)
          }}
          onAddToGroup={(groupUuid) => {
            if (uuid && selectedMember) {
              addMemberToGroupMutation.mutate(
                {
                  organizationUuid: uuid,
                  memberUuid: selectedMember.uuid,
                  groupUuid,
                },
                {
                  onSuccess: async () => {
                    try {
                      const list = await organizationsApi.getMemberGroups(uuid, selectedMember.uuid)
                      const uuids = Array.isArray(list) ? list.map((g: { uuid?: string }) => g.uuid).filter(Boolean) as string[] : []
                      setMemberGroupsMap((prev) => ({ ...prev, [selectedMember.uuid]: uuids }))
                    } catch {
                      // Keep previous state on refetch error
                    }
                  },
                  onError: (error) => {
                    setNotification({
                      type: 'error',
                      message: getErrorMessage(error, 'Failed to add member to group'),
                    })
                  },
                }
              )
            }
          }}
          onRemoveFromGroup={(groupUuid) => {
            if (uuid && selectedMember) {
              removeMemberFromGroupMutation.mutate(
                {
                  organizationUuid: uuid,
                  memberUuid: selectedMember.uuid,
                  groupUuid,
                },
                {
                  onSuccess: async () => {
                    try {
                      const list = await organizationsApi.getMemberGroups(uuid, selectedMember.uuid)
                      const uuids = Array.isArray(list) ? list.map((g: { uuid?: string }) => g.uuid).filter(Boolean) as string[] : []
                      setMemberGroupsMap((prev) => ({ ...prev, [selectedMember.uuid]: uuids }))
                    } catch {
                      // Keep previous state on refetch error
                    }
                  },
                  onError: (error) => {
                    setNotification({
                      type: 'error',
                      message: getErrorMessage(error, 'Failed to remove member from group'),
                    })
                  },
                }
              )
            }
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">Add Member</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false)
                  setSelectedUserId('')
                  setSelectedGroupUuidsForNewMember([])
                }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter(
                      (user) =>
                        !members.some((member) => member.user_id === user.uuid)
                    )
                    .map((user) => (
                      <option key={user.uuid} value={user.uuid}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Assign to groups (optional)
                  </label>
                  <div className="border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {groups.map((group) => (
                      <label
                        key={group.uuid}
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 rounded px-2 py-1.5 -mx-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupUuidsForNewMember.includes(group.uuid)}
                          onChange={() => toggleGroupForNewMember(group.uuid)}
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-800">{group.name}</span>
                        <span className="text-xs text-neutral-500">
                          ({group.role.replace(/_/g, ' ')})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {addMemberMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {addMemberMutation.error instanceof Error
                      ? addMemberMutation.error.message
                      : 'Failed to add member'}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedUserId('')
                    setSelectedGroupUuidsForNewMember([])
                  }}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedUserId || !uuid) return
                    addMemberMutation.mutate(
                      { organizationUuid: uuid, userUuid: selectedUserId },
                      {
                        onSuccess: async (newMember) => {
                          for (const groupUuid of selectedGroupUuidsForNewMember) {
                            try {
                              await addMemberToGroupMutation.mutateAsync({
                                organizationUuid: uuid,
                                memberUuid: newMember.uuid,
                                groupUuid,
                              })
                            } catch (error) {
                              setNotification({
                                type: 'error',
                                message: getErrorMessage(error, 'Member added but failed to assign to some groups'),
                              })
                            }
                          }
                          setShowAddMemberModal(false)
                          setSelectedUserId('')
                          setSelectedGroupUuidsForNewMember([])
                        },
                        onError: (error) => {
                          setNotification({
                            type: 'error',
                            message: getErrorMessage(error, 'Failed to add member to organization'),
                          })
                        },
                      }
                    )
                  }}
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related Resources (collapsible) */}
      <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6">
        <button
          type="button"
          onClick={() => setRelatedResourcesCollapsed((prev) => !prev)}
          className="flex items-center justify-between w-full gap-3 text-left group"
        >
          <div className="flex items-center gap-3">
            <FolderTree size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-neutral-800">Related Resources</h2>
            <span className="text-sm text-neutral-500">
              ({organization.groups?.length ?? 0} groups, {organization.environments?.length ?? 0} environments)
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`shrink-0 text-neutral-400 transition-transform duration-200 group-hover:text-neutral-600 ${relatedResourcesCollapsed ? '' : 'rotate-180'}`}
          />
        </button>

        {!relatedResourcesCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-green-600" />
              <span className="text-sm font-medium text-neutral-700">Groups</span>
              {organization.groups && organization.groups.length > 0 && (
                <span className="text-xs text-neutral-500">({organization.groups.length})</span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mb-3">Permission groups</p>
            {organization.groups && organization.groups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 px-2 font-medium text-neutral-600">Name</th>
                      <th className="text-left py-2 px-2 font-medium text-neutral-600">Scope</th>
                      <th className="text-left py-2 px-2 font-medium text-neutral-600">Role</th>
                      <th className="text-center py-2 px-2 font-medium text-neutral-600">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organization.groups.map((group) => (
                      <tr key={group.uuid} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="py-2 px-2">
                          <div className="font-medium text-neutral-700">{group.name}</div>
                          {group.description && (
                            <div className="text-neutral-400 mt-0.5">{group.description}</div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-neutral-600 capitalize">{group.scope_level}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-neutral-600">{group.role.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {group.is_default ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Yes
                            </span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 mt-1">No groups</p>
            )}
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-neutral-700">Environments</span>
              {organization.environments && organization.environments.length > 0 && (
                <span className="text-xs text-neutral-500">({organization.environments.length})</span>
              )}
            </div>
            <p className="text-xs text-neutral-500">Organization environments</p>
            {organization.environments && organization.environments.length > 0 ? (
              <div className="mt-2 space-y-1">
                {organization.environments.map((env) => (
                  <div key={env.uuid} className="text-xs text-neutral-600 font-mono">
                    {env.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 mt-1">No environments</p>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Members */}
      <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-neutral-800">Members</h2>
            {members.length > 0 && (
              <span className="text-sm text-neutral-500">({members.length})</span>
            )}
          </div>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        </div>

        {members.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={membersSearchQuery}
                  onChange={(e) => setMembersSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={membersStatusFilter}
                onChange={(e) => setMembersStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
                className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="disabled">Inactive</option>
              </select>
              <select
                value={membersGroupFilter}
                onChange={(e) => setMembersGroupFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
              >
                <option value="">All groups</option>
                {organization.groups?.map((g) => (
                  <option key={g.uuid} value={g.uuid}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
            {paginatedMembers.map((member) => {
              const memberUser = users.find((u) => u.uuid === member.user_id)
              return (
                <div
                  key={member.uuid}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserIcon size={16} className="text-neutral-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-800">
                        {member.full_name ?? memberUser?.full_name ?? memberUser?.email ?? member.email ?? 'Unknown User'}
                      </div>
                      <div className="text-xs text-neutral-500">{member.email ?? memberUser?.email ?? member.user_id}</div>
                      <div
                        className="text-xs text-neutral-500 mt-0.5 truncate"
                        title={getMemberGroupNames(member.uuid)}
                      >
                        Groups: {getMemberGroupNames(member.uuid)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.is_owner && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md">
                        Owner
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-md ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {member.status}
                    </span>
                    {!member.is_owner && (
                      <button
                        onClick={() => {
                          if (
                            uuid &&
                            window.confirm(
                              `Are you sure you want to remove ${member.full_name ?? memberUser?.full_name ?? memberUser?.email ?? 'this member'} from the organization?`
                            )
                          ) {
                            deleteMemberMutation.mutate(
                              {
                                organizationUuid: uuid,
                                memberUuid: member.uuid,
                              },
                              {
                                onError: (error) => {
                                  setNotification({
                                    type: 'error',
                                    message: getErrorMessage(error, 'Failed to remove member from organization'),
                                  })
                                },
                              }
                            )
                          }
                        }}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove member from organization"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMemberMenuOpen(memberMenuOpen === member.uuid ? null : member.uuid)
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {memberMenuOpen === member.uuid && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMemberMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-20 min-w-[160px]">
                          <button
                            onClick={() => {
                              setSelectedMember(member)
                              setShowEditMemberModal(true)
                              setMemberMenuOpen(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                          >
                            <Edit size={14} />
                            <span>Edit Permissions</span>
                          </button>
                          {member.status === 'active' && (
                            <button
                              onClick={() => {
                                if (uuid) {
                                  updateMemberMutation.mutate(
                                    {
                                      organizationUuid: uuid,
                                      memberUuid: member.uuid,
                                      data: { status: 'disabled' },
                                    },
                                    {
                                      onSuccess: () => setMemberMenuOpen(null),
                                      onError: (error) => {
                                        setMemberMenuOpen(null)
                                        setNotification({
                                          type: 'error',
                                          message: getErrorMessage(error, 'Failed to disable member'),
                                        })
                                      },
                                    }
                                  )
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Shield size={14} />
                              <span>Disable</span>
                            </button>
                          )}
                          {member.status === 'disabled' && (
                            <button
                              onClick={() => {
                                if (uuid) {
                                  updateMemberMutation.mutate(
                                    {
                                      organizationUuid: uuid,
                                      memberUuid: member.uuid,
                                      data: { status: 'active' },
                                    },
                                    {
                                      onSuccess: () => setMemberMenuOpen(null),
                                      onError: (error) => {
                                        setMemberMenuOpen(null)
                                        setNotification({
                                          type: 'error',
                                          message: getErrorMessage(error, 'Failed to activate member'),
                                        })
                                      },
                                    }
                                  )
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Shield size={14} />
                              <span>Activate</span>
                            </button>
                          )}
                          {!member.is_owner && (
                            <button
                              onClick={() => {
                                if (
                                  uuid &&
                                  window.confirm(
                                    `Are you sure you want to remove ${member.full_name ?? memberUser?.full_name ?? memberUser?.email ?? 'this member'} from the organization?`
                                  )
                                ) {
                                  deleteMemberMutation.mutate(
                                    {
                                      organizationUuid: uuid,
                                      memberUuid: member.uuid,
                                    },
                                    {
                                      onSuccess: () => setMemberMenuOpen(null),
                                      onError: (error) => {
                                        setMemberMenuOpen(null)
                                        setNotification({
                                          type: 'error',
                                          message: getErrorMessage(error, 'Failed to remove member from organization'),
                                        })
                                      },
                                    }
                                  )
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              <span>Remove</span>
                            </button>
                          )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            </div>

            {filteredMembers.length > MEMBERS_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                  Showing {membersPage * MEMBERS_PAGE_SIZE + 1}-{Math.min((membersPage + 1) * MEMBERS_PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMembersPage((p) => Math.max(0, p - 1))}
                    disabled={membersPage === 0}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <span className="text-sm text-neutral-600 px-2">
                    Page {membersPage + 1} of {totalFilteredPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMembersPage((p) => Math.min(totalFilteredPages - 1, p + 1))}
                    disabled={membersPage >= totalFilteredPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && (
              <p className="text-sm text-neutral-400 py-4">No members match the current filters</p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-400 py-4">No members yet</p>
        )}
      </div>
    </div>
  )
}

export default OrganizationDetail
