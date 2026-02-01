import { api } from '../../../shared/api'
import type { ApplicationComponent, ApplicationComponentCreate, CronJob, CronJobLogs } from '../types'

export const cronComponentsApi = {
  list: async (organizationUuid: string): Promise<ApplicationComponent[]> => {
    const response = await api.get<ApplicationComponent[]>(`/organizations/${organizationUuid}/application_components/cron/`)
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<ApplicationComponent> => {
    const response = await api.get<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/cron/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: ApplicationComponentCreate): Promise<ApplicationComponent> => {
    const response = await api.post<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/cron/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: Partial<ApplicationComponentCreate>): Promise<ApplicationComponent> => {
    const response = await api.put<ApplicationComponent>(`/organizations/${organizationUuid}/application_components/cron/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/application_components/cron/${uuid}`)
  },
  getJobs: async (organizationUuid: string, uuid: string): Promise<CronJob[]> => {
    const response = await api.get<CronJob[]>(`/organizations/${organizationUuid}/application_components/cron/${uuid}/jobs`)
    return response.data
  },
  getJobLogs: async (organizationUuid: string, uuid: string, jobName: string, containerName?: string, tailLines: number = 100): Promise<CronJobLogs> => {
    const params = new URLSearchParams()
    if (containerName) {
      params.append('container_name', containerName)
    }
    params.append('tail_lines', tailLines.toString())
    const response = await api.get<CronJobLogs>(`/organizations/${organizationUuid}/application_components/cron/${uuid}/jobs/${jobName}/logs?${params.toString()}`)
    return response.data
  },
  deleteJob: async (organizationUuid: string, uuid: string, jobName: string): Promise<void> => {
    await api.delete(`/organizations/${organizationUuid}/application_components/cron/${uuid}/jobs/${jobName}`)
  },
  getSecrets: async (organizationUuid: string, uuid: string): Promise<{ secrets: Array<{ key: string; value: string }> }> => {
    const response = await api.get<{ secrets: Array<{ key: string; value: string }> }>(
      `/organizations/${organizationUuid}/application_components/cron/${uuid}/secrets`
    )
    return response.data
  },
}
