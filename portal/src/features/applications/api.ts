import { api } from '../../shared/api'
import type { Application, ApplicationCreate, ApplicationUpdate } from './types'

export const applicationsApi = {
  list: async (organizationUuid: string): Promise<Application[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Application[]>(`/organizations/${organizationUuid}/applications/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<Application> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Application>(`/organizations/${organizationUuid}/applications/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: ApplicationCreate): Promise<Application> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post<Application>(`/organizations/${organizationUuid}/applications/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: ApplicationUpdate): Promise<Application> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.put<Application>(`/organizations/${organizationUuid}/applications/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    await api.delete(`/organizations/${organizationUuid}/applications/${uuid}`)
  },
}
