import axios from 'axios'
import { API_BASE_URL } from '../config/api'
import type {
  Environment,
  EnvironmentCreate,
  Namespace,
  NamespaceCreate,
  Workload,
  WorkloadCreate,
  WebappDeploy,
  WebappDeployCreate,
  Template,
  TemplateCreate,
  TemplateUpdate,
  ComponentTemplateConfig,
  ComponentTemplateConfigCreate,
  ComponentTemplateConfigUpdate,
  ApplicationComponent,
  ApplicationComponentCreate,
  Instance,
  InstanceCreate,
  User,
  UserCreate,
  LoginRequest,
  Token,
  RefreshTokenRequest,
  UpdateProfileRequest,
  ApiToken,
  ApiTokenCreate,
  ApiTokenUpdate,
  ApiTokenCreateResponse,
  CronJob,
  CronJobLogs,
  Pod,
  PodLogs,
  PodCommandResponse,
  KubernetesEvent,
} from '../types'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Do not attempt refresh on authentication endpoints (login, register, refresh)
    // A 401 on these endpoints means invalid credentials, not expired token
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                          originalRequest?.url?.includes('/auth/register') ||
                          originalRequest?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await axios.post<Token>(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        const { access_token } = response.data
        localStorage.setItem('access_token', access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`

        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Clusters - Re-export from features/clusters for compatibility
export { clustersApi } from '../features/clusters'

// Environments
export const environmentsApi = {
  list: async (organizationUuid: string): Promise<Environment[]> => {
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

// Namespaces
export const namespacesApi = {
  list: async (): Promise<Namespace[]> => {
    const response = await api.get<Namespace[]>('/namespaces/')
    return response.data
  },
  get: async (uuid: string): Promise<Namespace> => {
    const response = await api.get<Namespace>(`/namespaces/${uuid}`)
    return response.data
  },
  create: async (data: NamespaceCreate): Promise<Namespace> => {
    const response = await api.post<Namespace>('/namespaces/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<NamespaceCreate>): Promise<Namespace> => {
    const response = await api.put<Namespace>(`/namespaces/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/namespaces/${uuid}`)
  },
}

// Workloads
export const workloadsApi = {
  list: async (): Promise<Workload[]> => {
    const response = await api.get<Workload[]>('/workloads/')
    return response.data
  },
  get: async (uuid: string): Promise<Workload> => {
    const response = await api.get<Workload>(`/workloads/${uuid}`)
    return response.data
  },
  create: async (data: WorkloadCreate): Promise<Workload> => {
    const response = await api.post<Workload>('/workloads/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<WorkloadCreate>): Promise<Workload> => {
    const response = await api.put<Workload>(`/workloads/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/workloads/${uuid}`)
  },
}

// Applications - Re-export from features/applications for compatibility
export { applicationsApi } from '../features/applications'

// Webapp Deploys
export const webappDeploysApi = {
  list: async (): Promise<WebappDeploy[]> => {
    const response = await api.get<WebappDeploy[]>('/webapps/deploys/')
    return response.data
  },
  get: async (uuid: string): Promise<WebappDeploy> => {
    const response = await api.get<WebappDeploy>(`/webapps/deploys/${uuid}`)
    return response.data
  },
  create: async (data: WebappDeployCreate): Promise<WebappDeploy> => {
    const response = await api.post<WebappDeploy>('/webapps/deploys/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<WebappDeployCreate>): Promise<WebappDeploy> => {
    const response = await api.put<WebappDeploy>(`/webapps/deploys/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/webapps/deploys/${uuid}`)
  },
}

// Templates - DEPRECATED: Use templatesApi from '../features/templates' instead
// These are kept for backward compatibility but require organizationUuid
export const templatesApi = {
  list: async (organizationUuid: string, category?: string): Promise<Template[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const params = category ? { category } : {}
    const response = await api.get<Template[]>(`/organizations/${organizationUuid}/templates/`, { params })
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<Template> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<Template>(`/organizations/${organizationUuid}/templates/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: TemplateCreate): Promise<Template> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post<Template>(`/organizations/${organizationUuid}/templates/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: TemplateUpdate): Promise<Template> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.put<Template>(`/organizations/${organizationUuid}/templates/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    await api.delete(`/organizations/${organizationUuid}/templates/${uuid}`)
  },
}

// Component Template Configs - DEPRECATED: Use componentTemplateConfigsApi from '../features/templates' instead
// These are kept for backward compatibility but require organizationUuid
export const componentTemplateConfigsApi = {
  list: async (organizationUuid: string, component_type?: string): Promise<ComponentTemplateConfig[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const params = component_type ? { component_type } : {}
    const response = await api.get<ComponentTemplateConfig[]>(`/organizations/${organizationUuid}/component-template-configs/`, { params })
    return response.data
  },
  get: async (organizationUuid: string, uuid: string): Promise<ComponentTemplateConfig> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<ComponentTemplateConfig>(`/organizations/${organizationUuid}/component-template-configs/${uuid}`)
    return response.data
  },
  create: async (organizationUuid: string, data: ComponentTemplateConfigCreate): Promise<ComponentTemplateConfig> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.post<ComponentTemplateConfig>(`/organizations/${organizationUuid}/component-template-configs/`, data)
    return response.data
  },
  update: async (organizationUuid: string, uuid: string, data: ComponentTemplateConfigUpdate): Promise<ComponentTemplateConfig> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.put<ComponentTemplateConfig>(`/organizations/${organizationUuid}/component-template-configs/${uuid}`, data)
    return response.data
  },
  delete: async (organizationUuid: string, uuid: string): Promise<void> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    await api.delete(`/organizations/${organizationUuid}/component-template-configs/${uuid}`)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTemplatesForComponent: async (organizationUuid: string, component_type: string): Promise<any[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get(`/organizations/${organizationUuid}/component-template-configs/component/${component_type}/templates`)
    return response.data
  },
}

// Application Components - Webapp specific
export const applicationComponentsApi = {
  list: async (): Promise<ApplicationComponent[]> => {
    const response = await api.get<ApplicationComponent[]>('/application_components/webapp/')
    return response.data
  },
  get: async (uuid: string): Promise<ApplicationComponent> => {
    const response = await api.get<ApplicationComponent>(`/application_components/webapp/${uuid}`)
    return response.data
  },
  create: async (data: ApplicationComponentCreate): Promise<ApplicationComponent> => {
    // Only webapp type is supported for now
    if (data.type && data.type !== 'webapp') {
      throw new Error(`Component type ${data.type} is not yet supported. Only 'webapp' is available.`)
    }
    const response = await api.post<ApplicationComponent>('/application_components/webapp/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<ApplicationComponentCreate>): Promise<ApplicationComponent> => {
    const response = await api.put<ApplicationComponent>(`/application_components/webapp/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/application_components/webapp/${uuid}`)
  },
  getPods: async (uuid: string): Promise<Pod[]> => {
    const response = await api.get<Pod[]>(`/application_components/webapp/${uuid}/pods`)
    return response.data
  },
  deletePod: async (uuid: string, podName: string): Promise<void> => {
    await api.delete(`/application_components/webapp/${uuid}/pods/${podName}`)
  },
  getPodLogs: async (uuid: string, podName: string, containerName?: string, tailLines: number = 100): Promise<PodLogs> => {
    const params = new URLSearchParams()
    if (containerName) {
      params.append('container_name', containerName)
    }
    params.append('tail_lines', tailLines.toString())
    const response = await api.get<PodLogs>(`/application_components/webapp/${uuid}/pods/${podName}/logs?${params.toString()}`)
    return response.data
  },
  execPodCommand: async (uuid: string, podName: string, command: string[], containerName?: string): Promise<PodCommandResponse> => {
    const response = await api.post<PodCommandResponse>(`/application_components/webapp/${uuid}/pods/${podName}/exec`, {
      command,
      container_name: containerName,
    })
    return response.data
  },
}

// Application Components - Cron specific
export const cronsApi = {
  list: async (): Promise<ApplicationComponent[]> => {
    const response = await api.get<ApplicationComponent[]>('/application_components/cron/')
    return response.data
  },
  get: async (uuid: string): Promise<ApplicationComponent> => {
    const response = await api.get<ApplicationComponent>(`/application_components/cron/${uuid}`)
    return response.data
  },
  create: async (data: ApplicationComponentCreate): Promise<ApplicationComponent> => {
    const response = await api.post<ApplicationComponent>('/application_components/cron/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<ApplicationComponentCreate>): Promise<ApplicationComponent> => {
    const response = await api.put<ApplicationComponent>(`/application_components/cron/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/application_components/cron/${uuid}`)
  },
  getJobs: async (uuid: string): Promise<CronJob[]> => {
    const response = await api.get<CronJob[]>(`/application_components/cron/${uuid}/jobs`)
    return response.data
  },
  getJobLogs: async (uuid: string, jobName: string, containerName?: string, tailLines: number = 100): Promise<CronJobLogs> => {
    const params = new URLSearchParams()
    if (containerName) {
      params.append('container_name', containerName)
    }
    params.append('tail_lines', tailLines.toString())
    const response = await api.get<CronJobLogs>(`/application_components/cron/${uuid}/jobs/${jobName}/logs?${params.toString()}`)
    return response.data
  },
  deleteJob: async (uuid: string, jobName: string): Promise<void> => {
    await api.delete(`/application_components/cron/${uuid}/jobs/${jobName}`)
  },
}

// Application Components - Worker specific
export const workersApi = {
  list: async (): Promise<ApplicationComponent[]> => {
    const response = await api.get<ApplicationComponent[]>('/application_components/worker/')
    return response.data
  },
  get: async (uuid: string): Promise<ApplicationComponent> => {
    const response = await api.get<ApplicationComponent>(`/application_components/worker/${uuid}`)
    return response.data
  },
  create: async (data: ApplicationComponentCreate): Promise<ApplicationComponent> => {
    const response = await api.post<ApplicationComponent>('/application_components/worker/', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<ApplicationComponentCreate>): Promise<ApplicationComponent> => {
    const response = await api.put<ApplicationComponent>(`/application_components/worker/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/application_components/worker/${uuid}`)
  },
}

// Instances
export const instancesApi = {
  list: async (
    organizationUuid: string,
    applicationUuid?: string
  ): Promise<Instance[]> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const params =
      applicationUuid != null ? { application_uuid: applicationUuid } : {}
    const response = await api.get<Instance[]>(
      `/organizations/${organizationUuid}/instances/`,
      { params }
    )
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

// Auth
export const authApi = {
  login: async (data: LoginRequest): Promise<Token> => {
    const response = await api.post<Token>('/auth/login', data)
    return response.data
  },
  register: async (data: UserCreate): Promise<User> => {
    const response = await api.post<User>('/auth/register', data)
    return response.data
  },
  refresh: async (data: RefreshTokenRequest): Promise<Token> => {
    const response = await api.post<Token>('/auth/refresh', data)
    return response.data
  },
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await api.put<User>('/auth/me', data)
    return response.data
  },
}

// Users API (Admin only)
export const usersApi = {
  list: async (params?: { skip?: number; limit?: number; search?: string }): Promise<User[]> => {
    const response = await api.get<User[]>('/users', { params })
    return response.data
  },
  get: async (uuid: string): Promise<User> => {
    const response = await api.get<User>(`/users/${uuid}`)
    return response.data
  },
  create: async (data: UserCreate): Promise<User> => {
    const response = await api.post<User>('/users', data)
    return response.data
  },
  update: async (uuid: string, data: Partial<UserCreate & { is_active?: boolean; role?: string }>): Promise<User> => {
    const response = await api.put<User>(`/users/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/users/${uuid}`)
  },
}

// Tokens API (Admin only)
export const tokensApi = {
  list: async (params?: { skip?: number; limit?: number; search?: string }): Promise<ApiToken[]> => {
    const response = await api.get<ApiToken[]>('/tokens', { params })
    return response.data
  },
  get: async (uuid: string): Promise<ApiToken> => {
    const response = await api.get<ApiToken>(`/tokens/${uuid}`)
    return response.data
  },
  create: async (data: ApiTokenCreate): Promise<ApiTokenCreateResponse> => {
    const response = await api.post<ApiTokenCreateResponse>('/tokens', data)
    return response.data
  },
  update: async (uuid: string, data: ApiTokenUpdate): Promise<ApiToken> => {
    const response = await api.put<ApiToken>(`/tokens/${uuid}`, data)
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/tokens/${uuid}`)
  },
}

// Dashboard
// Dashboard - Re-export from features/dashboard for compatibility
export { dashboardApi } from '../features/dashboard'

export default api

