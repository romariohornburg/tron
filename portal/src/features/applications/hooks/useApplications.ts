import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '../api'

export const useApplications = (
  organizationUuid: string | undefined,
  name?: string
) => {
  return useQuery({
    queryKey: ['applications', organizationUuid, name],
    queryFn: () => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to fetch applications')
      }
      return applicationsApi.list(organizationUuid, name)
    },
    enabled: !!organizationUuid,
  })
}

export const useApplication = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['application', organizationUuid, uuid],
    queryFn: () => {
      if (!organizationUuid || !uuid) {
        throw new Error('Organization UUID and application UUID are required')
      }
      return applicationsApi.get(organizationUuid, uuid)
    },
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateApplication = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').ApplicationCreate) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return applicationsApi.create(organizationUuid, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', organizationUuid] })
    },
  })
}

export const useUpdateApplication = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: import('../types').ApplicationUpdate }) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return applicationsApi.update(organizationUuid, uuid, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['application', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteApplication = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return applicationsApi.delete(organizationUuid, uuid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', organizationUuid] })
    },
  })
}
