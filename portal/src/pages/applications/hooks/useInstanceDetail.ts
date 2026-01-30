import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstance } from '../../../features/instances'
import { useApplication } from '../../../features/applications'
import { useClusters } from '../../../features/clusters'
import { useOrganization } from '../../../contexts/OrganizationContext'
import { useUpdateInstance, useDeleteInstance, useSyncInstance } from '../../../features/instances'
import {
  useUpdateWebappComponent,
  useDeleteWebappComponent,
  useCreateWebappComponent,
  useUpdateCronComponent,
  useDeleteCronComponent,
  useCreateCronComponent,
  useUpdateWorkerComponent,
  useDeleteWorkerComponent,
  useCreateWorkerComponent,
} from '../../../features/components'
import type { InstanceComponent } from '../../../features/instances'

export const useInstanceDetail = (applicationUuid: string | undefined, instanceUuid: string | undefined) => {
  const navigate = useNavigate()
  const { selectedOrganizationUuid } = useOrganization()

  const { data: instance, isLoading: isLoadingInstance } = useInstance(selectedOrganizationUuid, instanceUuid)
  const { data: application } = useApplication(selectedOrganizationUuid, applicationUuid)
  const { data: clusters } = useClusters(selectedOrganizationUuid)

  // Gateway API helpers
  const hasGatewayApi = useMemo(() => {
    if (!instance || !clusters || !instance.environment) return false
    const environmentClusters = clusters.filter(
      (cluster) => cluster.environment?.uuid === instance.environment.uuid
    )
    return environmentClusters.some((cluster) => cluster.gateway?.api?.enabled === true)
  }, [instance, clusters])

  const gatewayResources = useMemo(() => {
    if (!instance || !clusters || !instance.environment) return []
    const environmentClusters = clusters.filter(
      (cluster) => cluster.environment?.uuid === instance.environment.uuid
    )
    const allResources = new Set<string>()
    environmentClusters.forEach((cluster) => {
      if (cluster.gateway?.api?.enabled && cluster.gateway.api.resources) {
        cluster.gateway.api.resources.forEach((resource) => allResources.add(resource))
      }
    })
    return Array.from(allResources)
  }, [instance, clusters])

  const gatewayReference = useMemo(() => {
    if (!instance || !clusters || !instance.environment) return { namespace: '', name: '' }
    const environmentClusters = clusters.filter(
      (cluster) => cluster.environment?.uuid === instance.environment.uuid
    )
    // Use private gateway as default reference (both public and private use same auto-discovery if not configured)
    for (const cluster of environmentClusters) {
      if (cluster.gateway?.reference) {
        const ref = cluster.gateway.reference.private || cluster.gateway.reference.public || { namespace: '', name: '' }
        const namespace = ref.namespace || ''
        const name = ref.name || ''
        if (namespace && name) {
          return { namespace, name }
        }
      }
    }
    return { namespace: '', name: '' }
  }, [instance, clusters])

  // Components grouped by type
  const componentsByType = useMemo(() => {
    const grouped: Record<'webapp' | 'worker' | 'cron', InstanceComponent[]> = {
      webapp: [],
      worker: [],
      cron: [],
    }
    ;(instance?.components || []).forEach((component) => {
      const type = component.type as 'webapp' | 'worker' | 'cron'
      if (grouped[type]) {
        grouped[type].push(component)
      }
    })
    return grouped
  }, [instance?.components])

  // Mutations
  const updateInstanceMutation = useUpdateInstance(selectedOrganizationUuid)
  const deleteInstanceMutation = useDeleteInstance(selectedOrganizationUuid)
  const syncInstanceMutation = useSyncInstance(selectedOrganizationUuid)

  const updateWebappComponentMutation = useUpdateWebappComponent(selectedOrganizationUuid)
  const deleteWebappComponentMutation = useDeleteWebappComponent(selectedOrganizationUuid)
  const createWebappComponentMutation = useCreateWebappComponent(selectedOrganizationUuid)

  const updateCronComponentMutation = useUpdateCronComponent(selectedOrganizationUuid)
  const deleteCronComponentMutation = useDeleteCronComponent(selectedOrganizationUuid)
  const createCronComponentMutation = useCreateCronComponent(selectedOrganizationUuid)

  const updateWorkerComponentMutation = useUpdateWorkerComponent(selectedOrganizationUuid)
  const deleteWorkerComponentMutation = useDeleteWorkerComponent(selectedOrganizationUuid)
  const createWorkerComponentMutation = useCreateWorkerComponent(selectedOrganizationUuid)

  // Handle delete instance
  const handleDeleteInstance = () => {
    if (instanceUuid && selectedOrganizationUuid && confirm('Are you sure you want to delete this instance? This action cannot be undone.')) {
      deleteInstanceMutation.mutate(instanceUuid, {
        onSuccess: () => {
          navigate('/applications')
        },
      })
    }
  }

  // Handle sync instance
  const handleSyncInstance = () => {
    if (instanceUuid && selectedOrganizationUuid) {
      syncInstanceMutation.mutate(instanceUuid)
    }
  }

  // Handle delete component
  const handleDeleteComponent = (componentUuid: string, componentType: 'webapp' | 'worker' | 'cron') => {
    if (confirm('Are you sure you want to delete this component?')) {
      if (componentType === 'webapp') {
        deleteWebappComponentMutation.mutate(componentUuid)
      } else if (componentType === 'cron') {
        deleteCronComponentMutation.mutate(componentUuid)
      } else {
        deleteWorkerComponentMutation.mutate(componentUuid)
      }
    }
  }

  return {
    instance,
    application,
    isLoadingInstance,
    hasGatewayApi,
    gatewayResources,
    gatewayReference,
    componentsByType,
    updateInstanceMutation,
    deleteInstanceMutation,
    syncInstanceMutation,
    updateWebappComponentMutation,
    deleteWebappComponentMutation,
    createWebappComponentMutation,
    updateCronComponentMutation,
    deleteCronComponentMutation,
    createCronComponentMutation,
    updateWorkerComponentMutation,
    deleteWorkerComponentMutation,
    createWorkerComponentMutation,
    handleDeleteInstance,
    handleSyncInstance,
    handleDeleteComponent,
  }
}
