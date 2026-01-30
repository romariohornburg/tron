import { X, Shield, Plus, Trash2 } from 'lucide-react'
import { useMemberGroups } from '../../features/organizations/hooks/useOrganizations'
import type { OrganizationMember } from '../../features/organizations/types'
import type { Group } from '../../features/groups/types'

interface MemberGroupsModalProps {
  organizationUuid: string
  member: OrganizationMember
  groups: Group[]
  onClose: () => void
  onAddToGroup: (groupUuid: string) => void
  onRemoveFromGroup: (groupUuid: string) => void
}

function MemberGroupsModal({
  organizationUuid,
  member,
  groups,
  onClose,
  onAddToGroup,
  onRemoveFromGroup,
}: MemberGroupsModalProps) {
  const { data: memberGroups = [], isLoading } = useMemberGroups(organizationUuid, member.uuid)

  const availableGroups = groups.filter(
    (group) => !memberGroups.some((mg: Group) => mg.uuid === group.uuid)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800">Edit Member Permissions</h3>
            <p className="text-sm text-neutral-500 mt-1">Manage groups and permissions for this member</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Groups */}
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Current Groups</h4>
            {isLoading ? (
              <p className="text-sm text-neutral-400">Loading...</p>
            ) : memberGroups.length > 0 ? (
              <div className="space-y-2">
                {memberGroups.map((group: Group) => (
                  <div
                    key={group.uuid}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-blue-600" />
                        <span className="text-sm font-medium text-neutral-800">{group.name}</span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-neutral-500 mt-1">{group.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500 capitalize">{group.scope_level}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500">{group.role.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFromGroup(group.uuid)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove from group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 py-2">No groups assigned</p>
            )}
          </div>

          {/* Available Groups */}
          {availableGroups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Available Groups</h4>
              <div className="space-y-2">
                {availableGroups.map((group) => (
                  <div
                    key={group.uuid}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-green-600" />
                        <span className="text-sm font-medium text-neutral-800">{group.name}</span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-neutral-500 mt-1">{group.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500 capitalize">{group.scope_level}</span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500">{group.role.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onAddToGroup(group.uuid)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Add to group"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end mt-6 pt-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default MemberGroupsModal
