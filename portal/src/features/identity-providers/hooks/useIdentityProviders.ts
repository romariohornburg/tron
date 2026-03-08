import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { identityProvidersApi, identityProvidersPublicApi } from '../api'
import type { IdentityProviderCreate, IdentityProviderUpdate } from '../types'

export const useEnabledIdentityProviders = () => {
  return useQuery({
    queryKey: ['identity-providers', 'enabled'],
    queryFn: () => identityProvidersPublicApi.listEnabled(),
  })
}

export const useIdentityProviders = (params?: {
  skip?: number
  limit?: number
  enabled_only?: boolean
}) => {
  return useQuery({
    queryKey: ['identity-providers', 'admin', params],
    queryFn: () => identityProvidersApi.list(params),
  })
}

export const useIdentityProvider = (uuid: string | undefined) => {
  return useQuery({
    queryKey: ['identity-provider', uuid],
    queryFn: () => identityProvidersApi.get(uuid!),
    enabled: !!uuid,
  })
}

export const useCreateIdentityProvider = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: IdentityProviderCreate) => identityProvidersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-providers'] })
    },
  })
}

export const useUpdateIdentityProvider = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string
      data: IdentityProviderUpdate
    }) => identityProvidersApi.update(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identity-providers'] })
      queryClient.invalidateQueries({ queryKey: ['identity-provider', variables.uuid] })
    },
  })
}

export const useDeleteIdentityProvider = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => identityProvidersApi.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-providers'] })
    },
  })
}
