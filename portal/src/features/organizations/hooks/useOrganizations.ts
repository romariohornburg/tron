import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi } from '../api'

export const useOrganizations = (
  params?: { skip?: number; limit?: number },
  options?: { enabled?: boolean; retry?: boolean | number }
) => {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => organizationsApi.list(params),
    enabled: options?.enabled !== false,
    retry: options?.retry ?? 1,
  })
}

export const useOrganization = (uuid: string | undefined) => {
  return useQuery({
    queryKey: ['organization', uuid],
    queryFn: () => organizationsApi.get(uuid!),
    enabled: !!uuid,
  })
}

export const useOrganizationMembers = (
  organizationUuid: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['organization', organizationUuid, 'members'],
    queryFn: () => organizationsApi.getMembers(organizationUuid!),
    enabled: !!organizationUuid && (options?.enabled !== false),
  })
}

export const useCreateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: import('../types').OrganizationUpdate }) =>
      organizationsApi.update(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.uuid] })
    },
  })
}

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: organizationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useAddMemberToOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ organizationUuid, userUuid }: { organizationUuid: string; userUuid: string }) =>
      organizationsApi.addMember(organizationUuid, userUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useUpdateOrganizationMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      organizationUuid,
      memberUuid,
      data,
    }: {
      organizationUuid: string
      memberUuid: string
      data: { status?: string; is_owner?: boolean }
    }) => organizationsApi.updateMember(organizationUuid, memberUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useDeleteOrganizationMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      organizationUuid,
      memberUuid,
    }: {
      organizationUuid: string
      memberUuid: string
    }) => organizationsApi.deleteMember(organizationUuid, memberUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export const useMemberGroups = (organizationUuid: string | undefined, memberUuid: string | undefined) => {
  return useQuery({
    queryKey: ['organization', organizationUuid, 'member', memberUuid, 'groups'],
    queryFn: () => organizationsApi.getMemberGroups(organizationUuid!, memberUuid!),
    enabled: !!organizationUuid && !!memberUuid,
  })
}

export const useAddMemberToGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      organizationUuid,
      memberUuid,
      groupUuid,
    }: {
      organizationUuid: string
      memberUuid: string
      groupUuid: string
    }) => organizationsApi.addMemberToGroup(organizationUuid, memberUuid, groupUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationUuid, 'member', variables.memberUuid, 'groups'],
      })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid, 'members'] })
    },
  })
}

export const useRemoveMemberFromGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      organizationUuid,
      memberUuid,
      groupUuid,
    }: {
      organizationUuid: string
      memberUuid: string
      groupUuid: string
    }) => organizationsApi.removeMemberFromGroup(organizationUuid, memberUuid, groupUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationUuid, 'member', variables.memberUuid, 'groups'],
      })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['organization', variables.organizationUuid, 'members'] })
    },
  })
}
