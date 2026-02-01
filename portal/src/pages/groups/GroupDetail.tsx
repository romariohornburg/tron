import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Trash2, Plus, ArrowLeft, Users, Calendar, Shield, Globe, Box, User as UserIcon } from 'lucide-react'
import {
  useGroup,
  useGroupMembers,
  useAddGroupMember,
  useRemoveGroupMember,
} from '../../features/groups'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useOrganization as useOrgDetail } from '../../features/organizations'
import { useUsers } from '../../features/users'
import { Breadcrumbs, PageHeader } from '../../shared/components'
import type { GroupMemberCreate } from '../../features/groups'

function GroupDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { selectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()
  const { data: organization } = useOrgDetail(selectedOrganizationUuid)
  const { data: group, isLoading: isLoadingGroup } = useGroup(selectedOrganizationUuid, uuid)
  const { data: groupMembers = [], isLoading: isLoadingMembers } = useGroupMembers(selectedOrganizationUuid, uuid)
  const { data: users = [] } = useUsers()
  const addMemberMutation = useAddGroupMember(selectedOrganizationUuid, uuid)
  const removeMemberMutation = useRemoveGroupMember(selectedOrganizationUuid, uuid)

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [selectedOrgMemberId, setSelectedOrgMemberId] = useState<string>('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (addMemberMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Member added to group successfully' })
      setIsAddMemberOpen(false)
      setSelectedOrgMemberId('')
      setTimeout(() => setNotification(null), 5000)
      addMemberMutation.reset()
    }
  }, [addMemberMutation.isSuccess, addMemberMutation])

  useEffect(() => {
    if (addMemberMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (addMemberMutation.error as any)?.response?.data?.detail || 'Error adding member to group',
      })
      setTimeout(() => setNotification(null), 5000)
      addMemberMutation.reset()
    }
  }, [addMemberMutation.isError, addMemberMutation])

  useEffect(() => {
    if (removeMemberMutation.isSuccess) {
      setNotification({ type: 'success', message: 'Member removed from group successfully' })
      setTimeout(() => setNotification(null), 5000)
      removeMemberMutation.reset()
    }
  }, [removeMemberMutation.isSuccess, removeMemberMutation])

  useEffect(() => {
    if (removeMemberMutation.isError) {
      setNotification({
        type: 'error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: (removeMemberMutation.error as any)?.response?.data?.detail || 'Error removing member from group',
      })
      setTimeout(() => setNotification(null), 5000)
      removeMemberMutation.reset()
    }
  }, [removeMemberMutation.isError, removeMemberMutation])

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrgMemberId || !uuid) {
      setNotification({ type: 'error', message: 'Please select a member' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    const data: GroupMemberCreate = {
      group_id: uuid,
      organization_member_id: selectedOrgMemberId,
    }
    addMemberMutation.mutate(data)
  }

  const handleRemoveMember = (memberUuid: string) => {
    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      removeMemberMutation.mutate(memberUuid)
    }
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'org':
        return <Shield size={20} className="text-blue-600" />
      case 'environment':
        return <Globe size={20} className="text-green-600" />
      case 'application':
        return <Box size={20} className="text-purple-600" />
      default:
        return <Shield size={20} className="text-neutral-400" />
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

  // Get organization members that are not already in the group
  const availableMembers = organization?.members?.filter(
    (orgMember) => !groupMembers.some((gm) => gm.organization_member_id === orgMember.uuid)
  ) || []

  if (isLoadingOrg || isLoadingGroup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Group not found</p>
          <button
            onClick={() => navigate('/groups')}
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
          { label: 'Groups', path: '/groups' },
          { label: group.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <PageHeader title={group.name} description="Group details and members" />
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Groups</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Group Information */}
        <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            {getScopeIcon(group.scope_level)}
            <h2 className="text-lg font-semibold text-neutral-800">Group Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
              <div className="text-sm font-medium text-neutral-800">{group.name}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Description</label>
              <div className="text-sm text-neutral-600">{group.description || '-'}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Scope</label>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                {getScopeIcon(group.scope_level)}
                <span>{getScopeLabel(group.scope_level)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Role</label>
              <div className="text-sm text-neutral-700 font-mono">{group.role}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Created At</label>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Calendar size={14} />
                <span>
                  {new Date(group.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group Metadata */}
        <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold text-neutral-800">Metadata</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">UUID</label>
              <div className="text-sm text-neutral-600 font-mono">{group.uuid}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Is Default</label>
              <div className="text-sm text-neutral-700">
                {group.is_default ? (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                    Yes
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">
                    No
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="glass-effect-strong rounded-2xl shadow-soft-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-neutral-800">Members</h2>
            <span className="text-sm text-neutral-500">({groupMembers.length})</span>
          </div>
          {availableMembers.length > 0 && (
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Member</span>
            </button>
          )}
        </div>

        {isLoadingMembers ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-neutral-600">Loading members...</p>
          </div>
        ) : groupMembers.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Users size={48} className="mx-auto mb-2 text-neutral-300" />
            <p>No members in this group</p>
            {availableMembers.length > 0 && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="mt-4 btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus size={16} />
                <span>Add First Member</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groupMembers.map((groupMember) => {
              const orgMember = organization?.members?.find(
                (om) => om.uuid === groupMember.organization_member_id
              )
              const memberUser = users.find((u) => u.uuid === orgMember?.user_id)
              return (
                <div
                  key={groupMember.uuid}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserIcon size={16} className="text-neutral-400" />
                    <div>
                      <div className="text-sm font-medium text-neutral-800">
                        {memberUser ? memberUser.full_name || memberUser.email : 'Unknown User'}
                      </div>
                      <div className="text-xs text-neutral-500">{memberUser?.email || orgMember?.user_id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(groupMember.uuid)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Add Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-effect-strong rounded-2xl shadow-soft-lg w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gradient">Add Member to Group</h2>
              <button
                onClick={() => {
                  setIsAddMemberOpen(false)
                  setSelectedOrgMemberId('')
                }}
                className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label htmlFor="orgMember" className="block text-sm font-medium text-neutral-700 mb-2">
                  Organization Member *
                </label>
                <select
                  id="orgMember"
                  value={selectedOrgMemberId}
                  onChange={(e) => setSelectedOrgMemberId(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Select a member...</option>
                  {availableMembers.map((member) => {
                    const user = users.find((u) => u.uuid === member.user_id)
                    return (
                      <option key={member.uuid} value={member.uuid}>
                        {user ? user.full_name || user.email : member.user_id}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={addMemberMutation.isPending}
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMemberOpen(false)
                    setSelectedOrgMemberId('')
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

export default GroupDetail
