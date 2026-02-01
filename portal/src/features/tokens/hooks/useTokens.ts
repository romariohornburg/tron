import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tokensApi } from '../api'
import { useAuth } from '../../../contexts/AuthContext'
import type { ApiTokenUpdate } from '../types'

// Hook to get tokens for a specific user
export const useUserTokens = (userUuid: string | undefined, params?: { skip?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ['tokens', userUuid, params],
    queryFn: () => tokensApi.listByUser(userUuid!, params),
    enabled: !!userUuid,
  })
}

// Hook to get tokens for the current logged-in user (for tokens page)
export const useTokens = (params?: { skip?: number; limit?: number; search?: string }) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['tokens', user?.uuid, params],
    queryFn: () => tokensApi.listByUser(user!.uuid, params),
    enabled: !!user?.uuid,
  })
}

export const useToken = (userUuid: string | undefined, tokenUuid: string | undefined) => {
  return useQuery({
    queryKey: ['token', userUuid, tokenUuid],
    queryFn: () => tokensApi.get(userUuid!, tokenUuid!),
    enabled: !!userUuid && !!tokenUuid,
  })
}

export const useCreateToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userUuid, data }: { userUuid: string; data: import('../types').ApiTokenCreate }) =>
      tokensApi.create(userUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      queryClient.invalidateQueries({ queryKey: ['tokens', variables.userUuid] })
    },
  })
}

export const useUpdateToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userUuid, tokenUuid, data }: { userUuid: string; tokenUuid: string; data: ApiTokenUpdate }) =>
      tokensApi.update(userUuid, tokenUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      queryClient.invalidateQueries({ queryKey: ['tokens', variables.userUuid] })
      queryClient.invalidateQueries({ queryKey: ['token', variables.userUuid, variables.tokenUuid] })
    },
  })
}

export const useDeleteToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userUuid, tokenUuid }: { userUuid: string; tokenUuid: string }) =>
      tokensApi.delete(userUuid, tokenUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      queryClient.invalidateQueries({ queryKey: ['tokens', variables.userUuid] })
    },
  })
}
