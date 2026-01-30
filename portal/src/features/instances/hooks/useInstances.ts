import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { instancesApi } from '../api'

export const useInstances = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['instances', organizationUuid],
    queryFn: () => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to fetch instances')
      }
      return instancesApi.list(organizationUuid)
    },
    enabled: !!organizationUuid,
  })
}

export const useInstance = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['instances', organizationUuid, uuid],
    queryFn: () => {
      if (!organizationUuid || !uuid) {
        throw new Error('Organization UUID and instance UUID are required')
      }
      return instancesApi.get(organizationUuid, uuid)
    },
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateInstance = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').InstanceCreate) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to create instance')
      }
      return instancesApi.create(organizationUuid, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances', organizationUuid] })
    },
  })
}

export const useUpdateInstance = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<import('../types').InstanceCreate> }) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to update instance')
      }
      return instancesApi.update(organizationUuid, uuid, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instances', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['instances', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteInstance = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to delete instance')
      }
      return instancesApi.delete(organizationUuid, uuid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances', organizationUuid] })
    },
  })
}

export const useInstanceEvents = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['instances', organizationUuid, uuid, 'events'],
    queryFn: () => {
      if (!organizationUuid || !uuid) {
        throw new Error('Organization UUID and instance UUID are required')
      }
      return instancesApi.getEvents(organizationUuid, uuid)
    },
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useSyncInstance = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to sync instance')
      }
      return instancesApi.sync(organizationUuid, uuid)
    },
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['instances', organizationUuid, uuid] })
    },
  })
}
