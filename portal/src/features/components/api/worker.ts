import { api } from '../../../shared/api'
import type { ApplicationComponent, ApplicationComponentCreate, Pod, PodLogs, PodDescribe, PodCommandResponse } from '../types'

export const workerComponentsApi = {
  list: async (organizationUuid: string): Promise<ApplicationComponent[]> => {
    const response = await api.get<ApplicationComponent[]>(`/organizations/${organizationUuid}/application_components/worker/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<ApplicationComponent> => {
    const response = await api.get<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/worker/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: ApplicationComponentCreate): Promise<ApplicationComponent> => {
    const response = await api.post<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/worker/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: Partial<ApplicationComponentCreate>): Promise<ApplicationComponent> => {
    const response = await api.put<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/worker/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/application_components/worker/${uuid}`)
  },
  getSecrets: async (organizationUuid: string, uuid: string): Promise<{ secrets: Array<{ key: string; value: string }> }> => {
    const response = await api.get<{ secrets: Array<{ key: string; value: string }> }>(
      `/organizations/${organizationUuid}/application_components/worker/${uuid}/secrets`
    )
    return response.data
  },
  getPods: async (organizationUuid: string, uuid: string): Promise<Pod[]> => {
    const response = await api.get<Pod[]>(`/organizations/${organizationUuid}/application_components/worker/${uuid}/pods`)
    return response.data
  },
  deletePod: async (organizationUuid: string, uuid: string, podName: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/application_components/worker/${uuid}/pods/${podName}`)
  },
  getPodLogs: async (organizationUuid: string, uuid: string, podName: string, containerName?: string, tailLines: number = 100): Promise<PodLogs> => {
    const params = new URLSearchParams()
    if (containerName) {
      params.append('container_name', containerName)
    }
    params.append('tail_lines', tailLines.toString())
    const response = await api.get<PodLogs>(`/organizations/${organizationUuid}/application_components/worker/${uuid}/pods/${podName}/logs?${params.toString()}`)
    return response.data
  },
  getPodDescribe: async (organizationUuid: string, uuid: string, podName: string): Promise<PodDescribe> => {
    const response = await api.get<PodDescribe>(`/organizations/${organizationUuid}/application_components/worker/${uuid}/pods/${podName}/describe`)
    return response.data
  },
  execPodCommand: async (organizationUuid: string, uuid: string, podName: string, command: string[], containerName?: string): Promise<PodCommandResponse> => {
    const response = await api.post<PodCommandResponse>(`/organizations/${organizationUuid}/application_components/worker/${uuid}/pods/${podName}/exec`, {
      command,
      container_name: containerName,
    })
    return response.data
  },
}
