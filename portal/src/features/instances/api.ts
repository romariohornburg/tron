import { api } from '../../shared/api'
import type { Instance, InstanceCreate, KubernetesEvent } from './types'

export const instancesApi = {
  list: async (organizationUuid: string): Promise<Instance[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Instance[]>(`/organizations/${organizationUuid}/instances/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<Instance> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Instance>(`/organizations/${organizationUuid}/instances/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: InstanceCreate): Promise<Instance> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post<Instance>(`/organizations/${organizationUuid}/instances/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: Partial<InstanceCreate>): Promise<Instance> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.put<Instance>(`/organizations/${organizationUuid}/instances/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    await api.delete(`/organizations/${organizationUuid}/instances/${uuid}`)
  },
  getEvents: async (organizationUuid: string, uuid: string): Promise<KubernetesEvent[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<KubernetesEvent[]>(`/organizations/${organizationUuid}/instances/${uuid}/events`)
    return response.data
  },
  sync: async (organizationUuid: string, uuid: string): Promise<{ detail: string; synced_components: number; total_components: number; errors: Array<{ component: string; error: string }> }> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post(`/organizations/${organizationUuid}/instances/${uuid}/sync`)
    return response.data
  },
}
