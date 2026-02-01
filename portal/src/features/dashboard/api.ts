import { api } from '../../shared/api'
import type { DashboardOverview } from './types'

export const dashboardApi = {
  getOverview: async (organizationUuid: string): Promise<DashboardOverview> => {
    if (!organizationUuid) {
      throw new Error('Organization UUID is required')
    }
    const response = await api.get<DashboardOverview>(`/organizations/${organizationUuid}/dashboard/`)
    return response.data
  },
}
