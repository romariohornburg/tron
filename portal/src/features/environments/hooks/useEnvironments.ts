import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { environmentsApi } from '../api'

export const useEnvironments = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['environments', organizationUuid],
    queryFn: () => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to fetch environments')
      }
      return environmentsApi.list(organizationUuid)
    },
    enabled: !!organizationUuid,
  })
}

export const useEnvironment = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['environment', organizationUuid, uuid],
    queryFn: () => environmentsApi.get(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateEnvironment = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').EnvironmentCreate) =>
      environmentsApi.create(organizationUuid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', organizationUuid] })
    },
  })
}

export const useUpdateEnvironment = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<import('../types').EnvironmentCreate> }) =>
      environmentsApi.update(organizationUuid!, uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['environments', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['environment', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteEnvironment = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => environmentsApi.delete(organizationUuid!, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', organizationUuid] })
    },
  })
}

export const useUpdateEnvironmentSettings = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      environmentUuid,
      settings,
    }: {
      environmentUuid: string
      settings: import('../types').EnvironmentSettingsUpdate
    }) => environmentsApi.updateSettings(organizationUuid!, environmentUuid, settings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['environments', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['environment', organizationUuid, variables.environmentUuid] })
    },
  })
}

export const useResetEnvironmentSettings = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (environmentUuid: string) =>
      environmentsApi.resetSettings(organizationUuid!, environmentUuid),
    onSuccess: (_, environmentUuid) => {
      queryClient.invalidateQueries({ queryKey: ['environments', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['environment', organizationUuid, environmentUuid] })
    },
  })
}
