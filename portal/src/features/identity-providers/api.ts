import { api } from '../../shared/api'
import type {
  IdentityProviderPublic,
  IdentityProvider,
  IdentityProviderCreate,
  IdentityProviderUpdate,
} from './types'

/** Public: list enabled providers for login page (no auth required). */
export const identityProvidersPublicApi = {
  listEnabled: async (): Promise<IdentityProviderPublic[]> => {
    const response = await api.get<IdentityProviderPublic[]>('/auth/identity-providers', {
      params: { enabled_only: true },
    })
    return response.data
  },
}

/** Admin: full CRUD. */
export const identityProvidersApi = {
  list: async (params?: {
    skip?: number
    limit?: number
    enabled_only?: boolean
  }): Promise<IdentityProvider[]> => {
    const response = await api.get<IdentityProvider[]>('/auth/admin/identity-providers', {
      params,
    })
    return response.data
  },
  get: async (uuid: string): Promise<IdentityProvider> => {
    const response = await api.get<IdentityProvider>(
      `/auth/admin/identity-providers/${uuid}`
    )
    return response.data
  },
  create: async (data: IdentityProviderCreate): Promise<IdentityProvider> => {
    const response = await api.post<IdentityProvider>(
      '/auth/admin/identity-providers',
      data
    )
    return response.data
  },
  update: async (
    uuid: string,
    data: IdentityProviderUpdate
  ): Promise<IdentityProvider> => {
    const response = await api.patch<IdentityProvider>(
      `/auth/admin/identity-providers/${uuid}`,
      data
    )
    return response.data
  },
  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/auth/admin/identity-providers/${uuid}`)
  },
}
