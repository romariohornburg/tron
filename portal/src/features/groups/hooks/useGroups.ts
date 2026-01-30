import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api'
import type { GroupCreate, GroupUpdate, GroupMemberCreate } from '../types'

export const useGroups = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['groups', organizationUuid],
    queryFn: () => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to fetch groups')
      }
      return groupsApi.list(organizationUuid)
    },
    enabled: !!organizationUuid,
  })
}

export const useGroup = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['group', organizationUuid, uuid],
    queryFn: () => {
      if (!organizationUuid || !uuid) {
        throw new Error('Organization UUID and group UUID are required')
      }
      return groupsApi.get(organizationUuid, uuid)
    },
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateGroup = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GroupCreate) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return groupsApi.create(organizationUuid, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', organizationUuid] })
    },
  })
}

export const useUpdateGroup = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: GroupUpdate }) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return groupsApi.update(organizationUuid, uuid, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['group', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteGroup = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return groupsApi.delete(organizationUuid, uuid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', organizationUuid] })
    },
  })
}

export const useGroupMembers = (organizationUuid: string | undefined, groupUuid: string | undefined) => {
  return useQuery({
    queryKey: ['groupMembers', organizationUuid, groupUuid],
    queryFn: () => {
      if (!organizationUuid || !groupUuid) {
        throw new Error('Organization UUID and group UUID are required')
      }
      return groupsApi.listMembers(organizationUuid, groupUuid)
    },
    enabled: !!organizationUuid && !!groupUuid,
  })
}

export const useAddGroupMember = (organizationUuid: string | undefined, groupUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GroupMemberCreate) => {
      if (!organizationUuid || !groupUuid) {
        throw new Error('Organization UUID and group UUID are required')
      }
      return groupsApi.addMember(organizationUuid, groupUuid, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', organizationUuid, groupUuid] })
      queryClient.invalidateQueries({ queryKey: ['group', organizationUuid, groupUuid] })
    },
  })
}

export const useRemoveGroupMember = (organizationUuid: string | undefined, groupUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => {
      if (!organizationUuid || !groupUuid) {
        throw new Error('Organization UUID and group UUID are required')
      }
      return groupsApi.removeMember(organizationUuid, groupUuid, uuid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', organizationUuid, groupUuid] })
      queryClient.invalidateQueries({ queryKey: ['group', organizationUuid, groupUuid] })
    },
  })
}
