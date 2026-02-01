import { api } from '../../shared/api'
import type { Organization, OrganizationCreate, OrganizationUpdate, OrganizationMember } from './types'
import type { Group } from '../groups/types'

export const organizationsApi = {
  list: async (params?: { skip?: number; limit?: number }): Promise<Organization[]> => {
    const response = await api.get<Organization[]>('/organizations/', { params })
    return response.data
  },
  get: async (uuid: string): Promise<Organization> => {
    const response = await api.get<Organization>(`/organizations/${uuid}`)
    return response.data
  },
  getMembers: async (organizationUuid: string): Promise<OrganizationMember[]> => {
    const response = await api.get<OrganizationMember[]>(`/organizations/${organizationUuid}/members`)
    return response.data
  },
  create: async (data: OrganizationCreate): Promise<Organization> => {
    const response = await api.post<Organization>('/organizations/', data)
    return response.data
  },
  update: async (uuid: string, data: OrganizationUpdate): Promise<Organization> => {
    const response = await api.put<Organization>(`/organizations/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/organizations/${uuid}`)
  },
  addMember: async (organizationUuid: string, userUuid: string): Promise<OrganizationMember> => {
    const response = await api.post<OrganizationMember>(
      `/organizations/${organizationUuid}/members`,
      {
        organization_id: organizationUuid,
        user_id: userUuid,
      }
    )
    return response.data
  },
  updateMember: async (
    organizationUuid: string,
    memberUuid: string,
    data: { status?: string; is_owner?: boolean }
  ): Promise<OrganizationMember> => {
    const response = await api.put<OrganizationMember>(
      `/organizations/${organizationUuid}/members/${memberUuid}`,
      data
    )
    return response.data
  },
  deleteMember: async (organizationUuid: string, memberUuid: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/members/${memberUuid}`)
  },
  getMemberGroups: async (organizationUuid: string, memberUuid: string): Promise<Group[]> => {
    const response = await api.get<Group[]>(`/organizations/${organizationUuid}/members/${memberUuid}/groups`)
    return response.data
  },
  addMemberToGroup: async (
    organizationUuid: string,
    memberUuid: string,
    groupUuid: string
  ): Promise<void> => {
    await api.post(`/organizations/${organizationUuid}/members/${memberUuid}/groups`, {
      group_id: groupUuid,
      organization_member_id: memberUuid,
    })
  },
  removeMemberFromGroup: async (
    organizationUuid: string,
    memberUuid: string,
    groupUuid: string
  ): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/members/${memberUuid}/groups/${groupUuid}`)
  },
}
