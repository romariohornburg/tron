import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { webappComponentsApi } from '../api'

export const useWebappComponents = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['webapp-components', organizationUuid],
    queryFn: () => webappComponentsApi.list(organizationUuid!),
    enabled: !!organizationUuid,
  })
}

export const useWebappComponent = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['webapp', organizationUuid, uuid],
    queryFn: () => webappComponentsApi.get(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateWebappComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').ApplicationComponentCreate) =>
      webappComponentsApi.create(organizationUuid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webapp-components', organizationUuid] })
    },
  })
}

export const useUpdateWebappComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<import('../types').ApplicationComponentCreate> }) =>
      webappComponentsApi.update(organizationUuid!, uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webapp-components', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['webapp', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteWebappComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => webappComponentsApi.delete(organizationUuid!, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webapp-components', organizationUuid] })
    },
  })
}

export const useWebappPods = (organizationUuid: string | undefined, uuid: string | undefined, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['webapp-pods', organizationUuid, uuid],
    queryFn: () => webappComponentsApi.getPods(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useDeleteWebappPod = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, podName }: { uuid: string; podName: string }) =>
      webappComponentsApi.deletePod(organizationUuid!, uuid, podName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webapp-pods', organizationUuid, variables.uuid] })
    },
  })
}

export const useWebappPodLogs = (organizationUuid: string | undefined, uuid: string | undefined, podName: string | undefined, containerName?: string, tailLines: number = 100, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['webapp-pod-logs', organizationUuid, uuid, podName, containerName, tailLines],
    queryFn: () => webappComponentsApi.getPodLogs(organizationUuid!, uuid!, podName!, containerName, tailLines),
    enabled: !!organizationUuid && !!uuid && !!podName,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useExecWebappPodCommand = (organizationUuid: string | undefined) => {
  return useMutation({
    mutationFn: ({ uuid, podName, command, containerName }: { uuid: string; podName: string; command: string[]; containerName?: string }) =>
      webappComponentsApi.execPodCommand(organizationUuid!, uuid, podName, command, containerName),
  })
}
