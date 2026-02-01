export interface SetupStatus {
  initialized: boolean
  message: string
}

export interface SetupInitialize {
  admin_email: string
  admin_password: string
  admin_name?: string
  organization_name?: string
}
