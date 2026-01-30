import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApplication } from '../../../features/applications'
import { useClusters } from '../../../features/clusters'
import { useOrganization } from '../../../contexts/OrganizationContext'
import { useCreateInstance } from '../../../features/instances'
import {
  useCreateWebappComponent,
  useCreateCronComponent,
  useCreateWorkerComponent,
} from '../../../features/components'
import { instanceFormSchema } from '../../../features/instances/schemas'
import { componentCreateSchema } from '../../../features/components/schemas'
import { validateForm } from '../../../shared/utils/validation'
import type { InstanceCreate } from '../../../features/instances'
import type { ComponentFormData } from '../../../components/applications'
import {
  getDefaultWebappSettings,
  getDefaultCronSettings,
  getDefaultWorkerSettings,
} from '../../../components/applications'

interface ComponentSettings {
  envs?: Array<{ key: string; value: string }>
  secrets?: Array<{ key: string; value: string }>
  [key: string]: unknown
}

export function useCreateInstanceForm() {
  const { uuid: applicationUuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { selectedOrganizationUuid } = useOrganization()
  const { data: application } = useApplication(selectedOrganizationUuid, applicationUuid)
  const { data: clusters } = useClusters(selectedOrganizationUuid)
  const createInstanceMutation = useCreateInstance(selectedOrganizationUuid)
  const createWebappComponentMutation = useCreateWebappComponent(selectedOrganizationUuid)
  const createCronComponentMutation = useCreateCronComponent(selectedOrganizationUuid)
  const createWorkerComponentMutation = useCreateWorkerComponent(selectedOrganizationUuid)

  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [instanceData, setInstanceData] = useState<
    Omit<InstanceCreate, 'application_uuid'>
  >({
    environment_uuid: '',
    image: '',
    version: '',
    enabled: true,
  })

  const [components, setComponents] = useState<ComponentFormData[]>([])
  const [isComponentTypeDropdownOpen, setIsComponentTypeDropdownOpen] = useState(false)

  // Validation
  const step1Validation = useMemo(() => {
    return validateForm(instanceFormSchema, instanceData)
  }, [instanceData])

  const step2Validation = useMemo(() => {
    if (components.length === 0) {
      return { success: false as const }
    }
    for (const component of components) {
      const validation = validateForm(componentCreateSchema, component)
      if (!validation.success) {
        return { success: false as const }
      }
    }
    return { success: true as const }
  }, [components])

  const isStep1Valid = step1Validation.success
  const isStep2Valid = step2Validation.success
  const canSubmit = isStep1Valid && isStep2Valid && components.length > 0

  // Environment clusters logic
  const environmentClusters = useMemo(() => {
    if (!instanceData.environment_uuid || !clusters) return []
    return clusters.filter(
      (cluster) => cluster.environment?.uuid === instanceData.environment_uuid
    )
  }, [instanceData.environment_uuid, clusters])

  const hasNoClusters = instanceData.environment_uuid && environmentClusters.length === 0

  const hasGatewayApi = useMemo(() => {
    if (!instanceData.environment_uuid || !clusters) return false
    return environmentClusters.some((cluster) => cluster.gateway?.api?.enabled === true)
  }, [instanceData.environment_uuid, clusters, environmentClusters])

  const gatewayResources = useMemo(() => {
    if (environmentClusters.length === 0) return []
    const allResources = new Set<string>()
    environmentClusters.forEach((cluster) => {
      if (cluster.gateway?.api?.enabled && cluster.gateway.api.resources) {
        cluster.gateway.api.resources.forEach((resource) => allResources.add(resource))
      }
    })
    return Array.from(allResources)
  }, [environmentClusters])

  const gatewayReference = useMemo(() => {
    if (environmentClusters.length === 0) return { namespace: '', name: '' }
    for (const cluster of environmentClusters) {
      if (cluster.gateway?.reference) {
        const ref =
          cluster.gateway.reference.private ||
          cluster.gateway.reference.public ||
          { namespace: '', name: '' }
        const namespace = ref.namespace || ''
        const name = ref.name || ''
        if (namespace && name) {
          return { namespace, name }
        }
      }
    }
    return { namespace: '', name: '' }
  }, [environmentClusters])

  // Component management
  const addComponent = useCallback(
    (type: 'webapp' | 'worker' | 'cron' = 'webapp') => {
      const defaultSettings =
        type === 'webapp'
          ? getDefaultWebappSettings()
          : type === 'cron'
            ? getDefaultCronSettings()
            : getDefaultWorkerSettings()
      setComponents((prev) => [
        ...prev,
        {
          name: '',
          type,
          url: null,
          visibility: 'private',
          enabled: true,
          settings: defaultSettings,
        },
      ])
      setIsComponentTypeDropdownOpen(false)
    },
    []
  )

  const removeComponent = useCallback((index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateComponent = useCallback(
    (index: number, component: ComponentFormData) => {
      setComponents((prev) => {
        const updated = [...prev]
        updated[index] = component
        return updated
      })
    },
    []
  )

  // Validation functions
  const validateStep1 = useCallback(() => {
    if (!step1Validation.success) {
      setNotification({
        type: 'error',
        message: 'Please fill in all required fields',
      })
      setTimeout(() => setNotification(null), 3000)
      return false
    }
    return true
  }, [step1Validation])

  const validateStep2 = useCallback(() => {
    if (components.length === 0) {
      setNotification({
        type: 'error',
        message: 'At least one component is required',
      })
      setTimeout(() => setNotification(null), 3000)
      return false
    }
    for (let i = 0; i < components.length; i++) {
      const componentValidation = validateForm(componentCreateSchema, components[i])
      if (!componentValidation.success) {
        setNotification({
          type: 'error',
          message: `Component ${i + 1}: Please fill in all required fields`,
        })
        setTimeout(() => setNotification(null), 3000)
        return false
      }
    }
    return true
  }, [components])

  const validateEnvsAndSecrets = useCallback((): string | null => {
    for (const component of components) {
      const settings = component.settings as ComponentSettings | null
      if (!settings) continue

      if (settings.envs && Array.isArray(settings.envs)) {
        for (const env of settings.envs) {
          if (!env.key?.trim() && !env.value?.trim()) continue
          if (!env.key?.trim()) {
            return `Component "${component.name}": Environment variable is missing a key`
          }
          if (!env.value?.trim()) {
            return `Component "${component.name}": Environment variable "${env.key}" is missing a value`
          }
        }
      }

      if (settings.secrets && Array.isArray(settings.secrets)) {
        for (const secret of settings.secrets) {
          if (secret.value === '********') continue
          if (!secret.key?.trim() && !secret.value?.trim()) continue
          if (!secret.key?.trim()) {
            return `Component "${component.name}": Secret is missing a key`
          }
          if (!secret.value?.trim()) {
            return `Component "${component.name}": Secret "${secret.key}" is missing a value`
          }
        }
      }
    }
    return null
  }, [components])

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setNotification(null)

      if (!applicationUuid) {
        setNotification({
          type: 'error',
          message: 'Application UUID is required',
        })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      if (!validateStep1() || !validateStep2()) {
        return
      }

      const envsSecretsError = validateEnvsAndSecrets()
      if (envsSecretsError) {
        setNotification({ type: 'error', message: envsSecretsError })
        return
      }

      if (hasNoClusters) {
        setNotification({
          type: 'error',
          message:
            'The selected environment has no clusters. Please add a cluster in Settings → Clusters before creating components.',
        })
        return
      }

      try {
        const instance = await createInstanceMutation.mutateAsync({
          ...instanceData,
          application_uuid: applicationUuid,
        })

        if (components.length > 0) {
          const componentPromises = components.map((component) => {
            let cleanedSettings = component.settings as ComponentSettings | null
            if (cleanedSettings) {
              if (cleanedSettings.envs && Array.isArray(cleanedSettings.envs)) {
                cleanedSettings = {
                  ...cleanedSettings,
                  envs: cleanedSettings.envs.filter(
                    (env: { key: string; value: string }) =>
                      env.key?.trim() || env.value?.trim()
                  ),
                }
              }
              if (
                cleanedSettings.secrets &&
                Array.isArray(cleanedSettings.secrets)
              ) {
                cleanedSettings = {
                  ...cleanedSettings,
                  secrets: cleanedSettings.secrets.filter(
                    (secret: { key: string; value: string }) =>
                      secret.value === '********' ||
                      secret.key?.trim() ||
                      secret.value?.trim()
                  ),
                }
              }
            }

            const componentData = {
              instance_uuid: instance.uuid,
              name: component.name,
              type: component.type,
              settings: cleanedSettings,
              visibility: component.visibility,
              url: component.url,
              enabled: component.enabled,
            }

            if (component.type === 'cron') {
              return createCronComponentMutation.mutateAsync(componentData)
            } else if (component.type === 'worker') {
              return createWorkerComponentMutation.mutateAsync(componentData)
            } else {
              return createWebappComponentMutation.mutateAsync(componentData)
            }
          })

          await Promise.all(componentPromises)
        }

        setNotification({
          type: 'success',
          message: 'Instance and components created successfully!',
        })

        navigate(
          `/applications/${applicationUuid}/instances/${instance.uuid}/components`
        )
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error && 'response' in error
            ? (error as { response?: { data?: { detail?: string } } }).response?.data
                ?.detail
            : error instanceof Error
              ? error.message
              : 'Error creating instance'

        setNotification({
          type: 'error',
          message: errorMessage || 'Error creating instance',
        })
        setTimeout(() => setNotification(null), 5000)
      }
    },
    [
      applicationUuid,
      instanceData,
      components,
      validateStep1,
      validateStep2,
      validateEnvsAndSecrets,
      hasNoClusters,
      createInstanceMutation,
      createWebappComponentMutation,
      createCronComponentMutation,
      createWorkerComponentMutation,
      navigate,
    ]
  )

  return {
    application,
    instanceData,
    setInstanceData,
    components,
    isComponentTypeDropdownOpen,
    setIsComponentTypeDropdownOpen,
    addComponent,
    removeComponent,
    updateComponent,
    validateStep1,
    validateStep2,
    canSubmit,
    notification,
    setNotification,
    handleSubmit,
    isSubmitting: createInstanceMutation.isPending,
    environmentClusters,
    hasNoClusters,
    hasGatewayApi,
    gatewayResources,
    gatewayReference,
  }
}
