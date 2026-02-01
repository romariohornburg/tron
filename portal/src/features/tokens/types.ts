export interface ApiToken {
  uuid: string
  name: string
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  user_id: number | null
  user_uuid: string | null
}

export interface ApiTokenCreate {
  name: string
  expires_at?: string | null
}

export interface ApiTokenUpdate {
  name?: string | null
  is_active?: boolean | null
  expires_at?: string | null
}

export interface ApiTokenCreateResponse {
  uuid: string
  name: string
  token: string
  expires_at: string | null
  created_at: string
}
