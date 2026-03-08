import { api } from '../../shared/api'
import type { Environment, EnvironmentCreate, EnvironmentSettingsUpdate } from './types'

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
  updateSettings: async (
    organizationUuid: string,
    environmentUuid: string,
    data: EnvironmentSettingsUpdate
  ): Promise<Environment['settings']> => {
    const response = await api.put<Environment['settings']>(
      `/organizations/${organizationUuid}/environments/${environmentUuid}/settings`,
      data
    )
    return response.data
  },
  resetSettings: async (
    organizationUuid: string,
    environmentUuid: string
  ): Promise<Environment['settings']> => {
    const response = await api.post<Environment['settings']>(
      `/organizations/${organizationUuid}/environments/${environmentUuid}/settings/reset`
    )
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/environments/${uuid}`)
  },
}
