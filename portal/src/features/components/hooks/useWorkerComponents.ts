import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workerComponentsApi } from '../api'

export const useWorkerComponents = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['worker-components', organizationUuid],
    queryFn: () => workerComponentsApi.list(organizationUuid!),
    enabled: !!organizationUuid,
  })
}

export const useWorkerComponent = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['worker', organizationUuid, uuid],
    queryFn: () => workerComponentsApi.get(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateWorkerComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').ApplicationComponentCreate) =>
      workerComponentsApi.create(organizationUuid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-components', organizationUuid] })
    },
  })
}

export const useUpdateWorkerComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<import('../types').ApplicationComponentCreate> }) =>
      workerComponentsApi.update(organizationUuid!, uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worker-components', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['worker', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteWorkerComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => workerComponentsApi.delete(organizationUuid!, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-components', organizationUuid] })
    },
  })
}

export const useWorkerPods = (organizationUuid: string | undefined, uuid: string | undefined, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['worker-pods', organizationUuid, uuid],
    queryFn: () => workerComponentsApi.getPods(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useDeleteWorkerPod = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, podName }: { uuid: string; podName: string }) =>
      workerComponentsApi.deletePod(organizationUuid!, uuid, podName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worker-pods', organizationUuid, variables.uuid] })
    },
  })
}

export const useWorkerPodLogs = (organizationUuid: string | undefined, uuid: string | undefined, podName: string | undefined, containerName?: string, tailLines: number = 100, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['worker-pod-logs', organizationUuid, uuid, podName, containerName, tailLines],
    queryFn: () => workerComponentsApi.getPodLogs(organizationUuid!, uuid!, podName!, containerName, tailLines),
    enabled: !!organizationUuid && !!uuid && !!podName,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useExecWorkerPodCommand = (organizationUuid: string | undefined) => {
  return useMutation({
    mutationFn: ({ uuid, podName, command, containerName }: { uuid: string; podName: string; command: string[]; containerName?: string }) =>
      workerComponentsApi.execPodCommand(organizationUuid!, uuid, podName, command, containerName),
  })
}
