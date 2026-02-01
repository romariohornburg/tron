export interface OrganizationMember {
  uuid: string
  organization_id: string
  user_id: string
  is_owner: boolean
  status: string
  created_at: string
  email?: string | null
  full_name?: string | null
}

export interface Environment {
  uuid: string
  name: string
}

export interface Organization {
  uuid: string
  name: string
  owner_user_id: string
  owner_email?: string | null
  created_at: string
  members?: OrganizationMember[]
  environments?: Environment[]
  groups?: Array<{
    uuid: string
    name: string
    description?: string
    scope_level: string
    role: string
    organization_id: string
    environment_id?: string
    application_id?: string
    is_default: boolean
    created_at: string
  }>
}

export interface OrganizationCreate {
  name: string
  owner_user_id?: string
}

export interface OrganizationUpdate {
  name?: string
  owner_user_id?: string
}
