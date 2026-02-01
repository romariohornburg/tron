import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cronComponentsApi } from '../api'

export const useCronComponents = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['cron-components', organizationUuid],
    queryFn: () => cronComponentsApi.list(organizationUuid!),
    enabled: !!organizationUuid,
  })
}

export const useCronComponent = (organizationUuid: string | undefined, uuid: string | undefined) => {
  return useQuery({
    queryKey: ['cron', organizationUuid, uuid],
    queryFn: () => cronComponentsApi.get(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
  })
}

export const useCreateCronComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: import('../types').ApplicationComponentCreate) =>
      cronComponentsApi.create(organizationUuid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-components', organizationUuid] })
    },
  })
}

export const useUpdateCronComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<import('../types').ApplicationComponentCreate> }) =>
      cronComponentsApi.update(organizationUuid!, uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cron-components', organizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['cron', organizationUuid, variables.uuid] })
    },
  })
}

export const useDeleteCronComponent = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uuid: string) => cronComponentsApi.delete(organizationUuid!, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-components', organizationUuid] })
    },
  })
}

export const useCronJobs = (organizationUuid: string | undefined, uuid: string | undefined, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['cron-jobs', organizationUuid, uuid],
    queryFn: () => cronComponentsApi.getJobs(organizationUuid!, uuid!),
    enabled: !!organizationUuid && !!uuid,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useCronJobLogs = (organizationUuid: string | undefined, uuid: string | undefined, jobName: string | undefined, containerName?: string, tailLines: number = 100, refetchInterval?: number | false) => {
  return useQuery({
    queryKey: ['cron-job-logs', organizationUuid, uuid, jobName, containerName, tailLines],
    queryFn: () => cronComponentsApi.getJobLogs(organizationUuid!, uuid!, jobName!, containerName, tailLines),
    enabled: !!organizationUuid && !!uuid && !!jobName,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : false,
  })
}

export const useDeleteCronJob = (organizationUuid: string | undefined) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uuid, jobName }: { uuid: string; jobName: string }) =>
      cronComponentsApi.deleteJob(organizationUuid!, uuid, jobName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs', organizationUuid, variables.uuid] })
    },
  })
}
