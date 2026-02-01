import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export const useDashboardOverview = (organizationUuid: string | undefined) => {
  return useQuery({
    queryKey: ['dashboard', 'overview', organizationUuid],
    queryFn: () => {
      if (!organizationUuid) {
        throw new Error('Organization UUID is required to fetch dashboard overview')
      }
      return dashboardApi.getOverview(organizationUuid)
    },
    enabled: !!organizationUuid,
  })
}
