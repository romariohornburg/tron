import { api } from '../../shared/api'
import type { Group, GroupCreate, GroupUpdate, GroupMember, GroupMemberCreate } from './types'

export const groupsApi = {
  list: async (organizationUuid: string): Promise<Group[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Group[]>(`/organizations/${organizationUuid}/groups/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<Group> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Group>(`/organizations/${organizationUuid}/groups/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: GroupCreate): Promise<Group> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post<Group>(`/organizations/${organizationUuid}/groups/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: GroupUpdate): Promise<Group> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.put<Group>(`/organizations/${organizationUuid}/groups/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    await api.delete(`/organizations/${organizationUuid}/groups/${uuid}`)
  },
  listMembers: async (organizationUuid: string, groupUuid: string): Promise<GroupMember[]> => {
    if (!organizationUuid || !groupUuid) {
      throw new Error('Organization UUID and Group UUID are required')
    }
    const response = await api.get<GroupMember[]>(
      `/organizations/${organizationUuid}/groups/${groupUuid}/members/`
    )
    return response.data
  },
  addMember: async (
    organizationUuid: string,
    groupUuid: string,
    data: GroupMemberCreate
  ): Promise<GroupMember> => {
    if (!organizationUuid || !groupUuid) {
      throw new Error('Organization UUID and Group UUID are required')
    }
    const response = await api.post<GroupMember>(
      `/organizations/${organizationUuid}/groups/${groupUuid}/members/`,
      data
    )
    return response.data
  },
  removeMember: async (organizationUuid: string, groupUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid || !groupUuid) {
      throw new Error('Organization UUID and Group UUID are required')
    }
    await api.delete(`/organizations/${organizationUuid}/groups/${groupUuid}/members/${uuid}`)
  },
}
