import { api } from '../../shared/api'
import type { ApiToken, ApiTokenCreate, ApiTokenUpdate, ApiTokenCreateResponse } from './types'

export const tokensApi = {
  listByUser: async (userUuid: string, params?: { skip?: number; limit?: number; search?: string }): Promise<ApiToken[]> => {
    const response = await api.get<ApiToken[]>(`/users/${userUuid}/tokens`, { params })
    return response.data
  },
  get: async (userUuid: string, tokenUuid: string): Promise<ApiToken> => {
    const response = await api.get<ApiToken>(`/users/${userUuid}/tokens/${tokenUuid}`)
    return response.data
  },
  create: async (userUuid: string, data: ApiTokenCreate): Promise<ApiTokenCreateResponse> => {
    const response = await api.post<ApiTokenCreateResponse>(`/users/${userUuid}/tokens`, data)
    return response.data
  },
  update: async (userUuid: string, tokenUuid: string, data: ApiTokenUpdate): Promise<ApiToken> => {
    const response = await api.put<ApiToken>(`/users/${userUuid}/tokens/${tokenUuid}`, data)
    return response.data
  },
  delete: async (userUuid: string, tokenUuid: string): Promise<void> => {
    await api.delete(`/users/${userUuid}/tokens/${tokenUuid}`)
  },
}
