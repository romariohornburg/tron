import { api } from '../../shared/api'
import type { SetupStatus, SetupInitialize } from './types'

export const setupApi = {
  getStatus: async (): Promise<SetupStatus> => {
    const response = await api.get<SetupStatus>('/setup/status')
    return response.data
  },
  initialize: async (data: SetupInitialize): Promise<void> => {
    await api.post('/setup/initialize', {
      admin_email: data.admin_email,
      admin_password: data.admin_password,
      admin_name: data.admin_name ?? 'Administrator',
      organization_name: data.organization_name ?? 'Default Organization',
    })
  },
}
