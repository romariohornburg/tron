import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

interface OrganizationContextType {
  selectedOrganizationUuid: string | undefined
  setSelectedOrganizationUuid: (uuid: string | undefined) => void
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const STORAGE_KEY = 'selected_organization_uuid'

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const organizationsFromMe = user?.organizations ?? []
  const [selectedOrganizationUuid, setSelectedOrganizationUuidState] = useState<string | undefined>(undefined)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasAutoSelectedRef = useRef(false)

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedUuid = sessionStorage.getItem(STORAGE_KEY)
    if (savedUuid) {
      setSelectedOrganizationUuidState(savedUuid)
    }
    setIsInitialized(true)
  }, [])

  // Validate and sync selection using only /me organizations (never GET /organizations)
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return
    if (organizationsFromMe.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      setSelectedOrganizationUuidState(undefined)
      hasAutoSelectedRef.current = true
      return
    }

    const savedUuid = sessionStorage.getItem(STORAGE_KEY)
    const hasAccessToSaved = savedUuid && organizationsFromMe.some((org) => org.uuid === savedUuid)

    if (hasAccessToSaved) {
      if (selectedOrganizationUuid !== savedUuid) {
        setSelectedOrganizationUuidState(savedUuid)
      }
      hasAutoSelectedRef.current = true
      return
    }

    // No valid saved org (first login or user lost access): select first from /me
    sessionStorage.removeItem(STORAGE_KEY)
    const firstOrgUuid = organizationsFromMe[0].uuid
    setSelectedOrganizationUuidState(firstOrgUuid)
    sessionStorage.setItem(STORAGE_KEY, firstOrgUuid)
    hasAutoSelectedRef.current = true
  }, [isInitialized, isAuthenticated, user?.organizations, selectedOrganizationUuid])

  // Reset auto-select flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasAutoSelectedRef.current = false
    }
  }, [isAuthenticated])

  const setSelectedOrganizationUuid = useCallback((uuid: string | undefined) => {
    setSelectedOrganizationUuidState(uuid)
    if (uuid) {
      sessionStorage.setItem(STORAGE_KEY, uuid)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const isLoading = !isInitialized || (isAuthenticated && user === null)

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganizationUuid,
        setSelectedOrganizationUuid,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
