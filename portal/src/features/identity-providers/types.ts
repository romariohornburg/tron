export interface IdentityProviderPublic {
  slug: string
  display_name: string
}

export interface IdentityProvider {
  id: number
  uuid: string
  slug: string
  display_name: string
  client_id: string
  client_secret_masked?: string | null
  authorization_url: string
  token_url: string
  userinfo_url?: string | null
  scopes: string
  is_enabled: boolean
  organization_id?: number | null
  created_at: string
  updated_at: string
}

export interface IdentityProviderCreate {
  slug: string
  display_name: string
  client_id: string
  client_secret: string
  authorization_url: string
  token_url: string
  userinfo_url?: string | null
  scopes?: string
  is_enabled?: boolean
  organization_id?: number | null
}

export interface IdentityProviderUpdate {
  display_name?: string
  client_id?: string
  client_secret?: string
  authorization_url?: string
  token_url?: string
  userinfo_url?: string | null
  scopes?: string
  is_enabled?: boolean
  organization_id?: number | null
}
