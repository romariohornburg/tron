export type ScopeLevel = 'org' | 'environment' | 'application'

export type GroupRole =
  | 'ORG_OWNER'
  | 'ORG_ADMIN'
  | 'ORG_BILLING'
  | 'ORG_MEMBER'
  | 'ENV_MAINTAINER'
  | 'ENV_OPERATOR'
  | 'ENV_VIEWER'
  | 'APP_MAINTAINER'
  | 'APP_DEVELOPER'
  | 'APP_VIEWER'

export interface Group {
  uuid: string
  organization_id: string
  name: string
  description?: string
  scope_level: ScopeLevel
  role: GroupRole
  environment_id?: string
  application_id?: string
  is_default: boolean
  created_at: string
}

export interface GroupCreate {
  organization_id: string
  name: string
  description?: string
  scope_level: ScopeLevel
  role: GroupRole
  environment_id?: string
  application_id?: string
  is_default?: boolean
}

export interface GroupUpdate {
  name?: string
  description?: string
  scope_level?: ScopeLevel
  role?: GroupRole
  environment_id?: string
  application_id?: string
  is_default?: boolean
}

export interface GroupMember {
  uuid: string
  group_id: string
  organization_member_id: string
  created_at: string
}

export interface GroupMemberCreate {
  group_id: string
  organization_member_id: string
}
