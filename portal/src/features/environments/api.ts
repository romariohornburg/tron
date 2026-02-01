import { api } from '../../shared/api'
import type { Environment, EnvironmentCreate } from './types'

export const environmentsApi = {
  list: async (organizationUuid: string): Promise<Environment[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Environment[]>(`/organizations/${organizationUuid}/environments/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<Environment> => {
    const response = await api.get<Environment>(`/organizations/${organizationUuid}/environments/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: EnvironmentCreate): Promise<Environment> => {
    const response = await api.post<Environment>(`/organizations/${organizationUuid}/environments/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: Partial<EnvironmentCreate>): Promise<Environment> => {
    const response = await api.put<Environment>(`/organizations/${organizationUuid}/environments/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/environments/${uuid}`)
  },
}
