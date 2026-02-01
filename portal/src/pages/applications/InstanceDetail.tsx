import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { X, Trash2, Plus, Pencil, ChevronDown, ChevronRight, Server, ChevronUp, AlertCircle, MoreVertical, RefreshCw, Globe } from 'lucide-react'
import { instancesApi } from '../../services/api'
import { useClustersByEnvironment } from '../../features/clusters/hooks/useClusters'
import type { ApplicationComponentCreate, InstanceComponent } from '../../types'
import { ComponentForm, type ComponentFormData, getDefaultWebappSettings, getDefaultCronSettings, getDefaultWorkerSettings, type WebappSettings } from '../../components/applications'
import { useUpdateWebappComponent, useDeleteWebappComponent, useCreateWebappComponent, useUpdateCronComponent, useDeleteCronComponent, useCreateCronComponent, useUpdateWorkerComponent, useDeleteWorkerComponent, useCreateWorkerComponent } from '../../features/components'
import { Breadcrumbs, PageHeader, DataTable } from '../../shared/components'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'

// Palette for environment colors
const ENV_COLOR_PALETTE = [
  { bg: 'bg-primary-100', text: 'text-primary-800', border: 'border-primary-200' },
  { bg: 'bg-accent-100', text: 'text-accent-800', border: 'border-accent-200' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
]

function getEnvironmentColor(uuid: string) {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % ENV_COLOR_PALETTE.length
  return ENV_COLOR_PALETTE[index]
}

function InstanceDetail() {
  const { uuid: applicationUuid, instanceUuid } = useParams<{ uuid: string; instanceUuid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { selectedOrganizationUuid } = useOrganization()

  const { data: instance, isLoading: isLoadingInstance } = useQuery({
    queryKey: ['instances', selectedOrganizationUuid, instanceUuid],
    queryFn: () => {
      if (!selectedOrganizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return instancesApi.get(selectedOrganizationUuid, instanceUuid!)
    },
    enabled: !!selectedOrganizationUuid && !!instanceUuid,
  })

  const { data: environmentClusters = [] } = useClustersByEnvironment(
    selectedOrganizationUuid,
    instance?.environment?.uuid
  )

  const hasNoClusters = instance?.environment && environmentClusters.length === 0

  // Check if any cluster in the instance's environment has gateway_api available
  const hasGatewayApi = useMemo(() => {
    return environmentClusters.some((cluster) => cluster.gateway?.api?.enabled === true)
  }, [environmentClusters])

  // Get Gateway API resources available in environment clusters
  const gatewayResources = useMemo(() => {
    if (environmentClusters.length === 0) return []
    // Get resources from all clusters that have Gateway API enabled
    const allResources = new Set<string>()
    environmentClusters.forEach((cluster) => {
      if (cluster.gateway?.api?.enabled && cluster.gateway.api.resources) {
        cluster.gateway.api.resources.forEach((resource) => allResources.add(resource))
      }
    })
    return Array.from(allResources)
  }, [environmentClusters])

  // Get Gateway reference (namespace and name) from environment clusters
  const gatewayReference = useMemo(() => {
    if (environmentClusters.length === 0) return { namespace: '', name: '' }
    // Get the first gateway reference found that has namespace and name filled
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
  }, [environmentClusters])

  const [editingComponentUuid, setEditingComponentUuid] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [modalNotification, setModalNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isAddComponentsModalOpen, setIsAddComponentsModalOpen] = useState(false)
  const modalContentRef = useRef<HTMLDivElement>(null)
  const [isEditInstanceModalOpen, setIsEditInstanceModalOpen] = useState(false)
  const [expandedTypes, setExpandedTypes] = useState<Set<'webapp' | 'worker' | 'cron'>>(new Set(['webapp', 'worker', 'cron']))
  const [isComponentTypeDropdownOpen, setIsComponentTypeDropdownOpen] = useState(false)
  const [isInstanceActionsDropdownOpen, setIsInstanceActionsDropdownOpen] = useState(false)

  const [component, setComponent] = useState<ComponentFormData | null>(null)
  const [instanceFormData, setInstanceFormData] = useState<{
    image: string
    version: string
    enabled: boolean
  }>({
    image: '',
    version: '',
    enabled: true,
  })

  const initializeComponent = (type: 'webapp' | 'worker' | 'cron' = 'webapp') => {
    setEditingComponentUuid(null)
    if (type === 'webapp') {
      setComponent({
        name: '',
        type: 'webapp',
        url: null,
        enabled: true,
        settings: getDefaultWebappSettings(),
      })
    } else if (type === 'cron') {
      setComponent({
        name: '',
        type: 'cron',
        url: null,
        enabled: true,
        settings: getDefaultCronSettings(),
      })
    } else {
      setComponent({
        name: '',
        type: 'worker',
        url: null,
        visibility: 'private',
        enabled: true,
        settings: getDefaultWorkerSettings(),
      })
    }
  }

  const loadComponentForEdit = (componentData: InstanceComponent) => {
    setEditingComponentUuid(componentData.uuid)
    const componentType = componentData.type as 'webapp' | 'worker' | 'cron'

    if (componentType === 'webapp') {
      const defaultSettings = getDefaultWebappSettings()
      const existingSettings = (componentData.settings as ComponentFormData['settings']) || defaultSettings
      // Migrate endpoints to exposure if necessary
      let exposure = defaultSettings.exposure
      if (existingSettings && 'exposure' in existingSettings) {
        exposure = (existingSettings as WebappSettings).exposure
      } else if (existingSettings && 'endpoints' in existingSettings) {
        // Migrate from old endpoints to exposure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldEndpoints = existingSettings.endpoints as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let oldEndpoint: any = null
        if (Array.isArray(oldEndpoints)) {
          oldEndpoint = oldEndpoints[0] || null
        } else if (oldEndpoints && typeof oldEndpoints === 'object') {
          oldEndpoint = oldEndpoints
        }
        if (oldEndpoint) {
          exposure = {
            type: oldEndpoint.source_protocol || 'http',
            port: oldEndpoint.source_port || 80,
            visibility: 'cluster',
          }
        }
      }
      // Ensure autoscaling exists, merging with default values if necessary
      const settings = {
        ...defaultSettings,
        ...existingSettings,
        exposure,
        autoscaling: existingSettings && 'autoscaling' in existingSettings
          ? existingSettings.autoscaling
          : defaultSettings.autoscaling,
      }
      // Get visibility from settings.exposure.visibility or use default
      let visibility: 'public' | 'private' | 'cluster' = 'cluster'
      if (settings && 'exposure' in settings && settings.exposure && 'visibility' in settings.exposure) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visibility = (settings.exposure as any).visibility as 'public' | 'private' | 'cluster'
      }

      setComponent({
        name: componentData.name,
        type: 'webapp',
        url: componentData.url,
        visibility,
        enabled: componentData.enabled,
        settings,
      })
    } else if (componentType === 'cron') {
      setComponent({
        name: componentData.name,
        type: 'cron',
        url: null,
        visibility: 'private',
        enabled: componentData.enabled,
        settings: (componentData.settings as ComponentFormData['settings']) || getDefaultCronSettings(),
      })
    } else {
      const defaultSettings = getDefaultWorkerSettings()
      const existingSettings = (componentData.settings as ComponentFormData['settings']) || defaultSettings
      // Ensure autoscaling exists, merging with default values if necessary
      const settings = {
        ...defaultSettings,
        ...existingSettings,
        autoscaling: existingSettings && 'autoscaling' in existingSettings
          ? existingSettings.autoscaling
          : defaultSettings.autoscaling,
      }
      setComponent({
        name: componentData.name,
        type: 'worker',
        url: null,
        visibility: 'private',
        enabled: componentData.enabled,
        settings,
      })
    }
    setIsAddComponentsModalOpen(true)
  }

  const updateWebappComponentMutation = useUpdateWebappComponent(selectedOrganizationUuid)
  const updateCronComponentMutation = useUpdateCronComponent(selectedOrganizationUuid)
  const updateWorkerComponentMutation = useUpdateWorkerComponent(selectedOrganizationUuid)

  const deleteWebappComponentMutation = useDeleteWebappComponent(selectedOrganizationUuid)
  const deleteCronComponentMutation = useDeleteCronComponent(selectedOrganizationUuid)
  const deleteWorkerComponentMutation = useDeleteWorkerComponent(selectedOrganizationUuid)

  const createWebappComponentMutation = useCreateWebappComponent(selectedOrganizationUuid)
  const createCronComponentMutation = useCreateCronComponent(selectedOrganizationUuid)
  const createWorkerComponentMutation = useCreateWorkerComponent(selectedOrganizationUuid)

  // Helper function to handle component updates
  const handleUpdateComponent = (uuid: string, data: Partial<ApplicationComponentCreate>, componentType: 'webapp' | 'cron' | 'worker') => {
    const onSuccess = () => {
      setNotification({ type: 'success', message: 'Component updated successfully' })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['application-components'] })
      setEditingComponentUuid(null)
      setComponent(null)
      setModalNotification(null)
      setIsAddComponentsModalOpen(false)
      setTimeout(() => setNotification(null), 5000)
    }
    const onError = (error: Error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      setModalNotification({
        type: 'error',
        message: axiosError.response?.data?.detail || 'Error updating component',
      })
      setTimeout(() => {
        modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }

    if (componentType === 'webapp') {
      updateWebappComponentMutation.mutate({ uuid, data }, { onSuccess, onError })
    } else if (componentType === 'cron') {
      updateCronComponentMutation.mutate({ uuid, data }, { onSuccess, onError })
    } else {
      updateWorkerComponentMutation.mutate({ uuid, data }, { onSuccess, onError })
    }
  }

  // Helper function to handle component deletion
  const handleDeleteComponent = (uuid: string, componentType: 'webapp' | 'cron' | 'worker') => {
    const onSuccess = () => {
      setNotification({ type: 'success', message: 'Component deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['application-components'] })
      setTimeout(() => setNotification(null), 5000)
    }
    const onError = (error: Error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      setNotification({
        type: 'error',
        message: axiosError.response?.data?.detail || 'Error deleting component',
      })
      setTimeout(() => setNotification(null), 5000)
    }

    if (componentType === 'webapp') {
      deleteWebappComponentMutation.mutate(uuid, { onSuccess, onError })
    } else if (componentType === 'cron') {
      deleteCronComponentMutation.mutate(uuid, { onSuccess, onError })
    } else {
      deleteWorkerComponentMutation.mutate(uuid, { onSuccess, onError })
    }
  }

  // Legacy mutation wrapper for webapp updates (used in one place)
  const updateComponentMutation = {
    mutate: ({ uuid, data }: { uuid: string; data: Partial<ApplicationComponentCreate> }) => {
      // Determine component type from instance data or default to webapp
      const component = instance?.components?.find((c: InstanceComponent) => c.uuid === uuid)
      const componentType = component?.type || 'webapp'
      handleUpdateComponent(uuid, data, componentType as 'webapp' | 'cron' | 'worker')
    },
  }

  const deleteComponentMutation = {
    mutate: (uuid: string) => {
      // Try to determine component type from instance data
      const component = instance?.components?.find((c: InstanceComponent) => c.uuid === uuid)
      const componentType = component?.type || 'webapp'
      handleDeleteComponent(uuid, componentType as 'webapp' | 'cron' | 'worker')
    },
  }

  const addComponentToInstanceMutation = {
    mutate: (data: ApplicationComponentCreate) => {
      const onSuccess = () => {
        setNotification({ type: 'success', message: 'Component added successfully' })
        queryClient.invalidateQueries({ queryKey: ['instances'] })
        queryClient.invalidateQueries({ queryKey: ['application-components'] })
        setComponent(null)
        setModalNotification(null)
        setIsAddComponentsModalOpen(false)
        setTimeout(() => setNotification(null), 5000)
      }
      const onError = (error: Error) => {
        const axiosError = error as AxiosError<{ detail?: string }>
        setModalNotification({
          type: 'error',
          message: axiosError.response?.data?.detail || 'Error adding component',
        })
        setTimeout(() => {
          modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      }

      if (data.type === 'webapp') {
        createWebappComponentMutation.mutate(data, { onSuccess, onError })
      } else if (data.type === 'cron') {
        createCronComponentMutation.mutate(data, { onSuccess, onError })
      } else {
        createWorkerComponentMutation.mutate(data, { onSuccess, onError })
      }
    },
  };

  const updateInstanceMutation = useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Partial<{ image: string; version: string; enabled: boolean }> }) => {
      if (!selectedOrganizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return instancesApi.update(selectedOrganizationUuid, uuid, data)
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'Instance updated successfully' })
      queryClient.invalidateQueries({ queryKey: ['instances', selectedOrganizationUuid] })
      setIsEditInstanceModalOpen(false)
      setTimeout(() => setNotification(null), 5000)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Error updating instance',
      })
      setTimeout(() => setNotification(null), 5000)
    },
  })

  const deleteInstanceMutation = useMutation({
    mutationFn: (uuid: string) => {
      if (!selectedOrganizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return instancesApi.delete(selectedOrganizationUuid, uuid)
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'Instance deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['instances', selectedOrganizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['application-components'] })
      // Navigate to applications list after deletion
      navigate('/applications')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Error deleting instance',
      })
      setTimeout(() => setNotification(null), 5000)
    },
  })

  const syncInstanceMutation = useMutation({
    mutationFn: (uuid: string) => {
      if (!selectedOrganizationUuid) {
        throw new Error('Organization UUID is required')
      }
      return instancesApi.sync(selectedOrganizationUuid, uuid)
    },
    onSuccess: (data) => {
      const errorCount = data.errors?.length || 0
      if (errorCount > 0) {
        setNotification({
          type: 'error',
          message: `Sync completed with ${errorCount} error(s). ${data.synced_components}/${data.total_components} components synced.`,
        })
      } else {
        setNotification({
          type: 'success',
          message: `Sync completed successfully. ${data.synced_components} component(s) synced.`,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['instances', selectedOrganizationUuid] })
      queryClient.invalidateQueries({ queryKey: ['application-components'] })
      setIsInstanceActionsDropdownOpen(false)
      setTimeout(() => setNotification(null), 5000)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Error syncing instance',
      })
      setIsInstanceActionsDropdownOpen(false)
      setTimeout(() => setNotification(null), 5000)
    },
  })

  // Agrupar componentes por tipo (deve estar antes dos early returns)
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

  // Colunas base para todos os tipos
  const baseColumns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (component: InstanceComponent) => (
        <div>
          <div className="text-sm font-medium text-slate-800">{component.name}</div>
        </div>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      render: (component: InstanceComponent) => (
        <div className="text-sm text-slate-600">{component.url || '-'}</div>
      ),
    },
    {
      key: 'cpu',
      label: 'CPU',
      render: (component: InstanceComponent) => (
        <div className="text-sm text-slate-600">
          {component.settings?.cpu ? `${component.settings.cpu} cores` : 'N/A'}
        </div>
      ),
    },
    {
      key: 'memory',
      label: 'Memory',
      render: (component: InstanceComponent) => (
        <div className="text-sm text-slate-600">
          {component.settings?.memory
            ? `${component.settings.memory >= 1024 ? `${(component.settings.memory / 1024).toFixed(1)} GB` : `${component.settings.memory} MB`}`
            : 'N/A'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (component: InstanceComponent) => (
        <div>
          {component.enabled ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Disabled
            </span>
          )}
        </div>
      ),
    },
  ], [])

  // Columns specific to webapp
  const webappColumns = useMemo(() => [
    {
      key: 'exposure',
      label: 'Exposure',
      render: (component: InstanceComponent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = (component.settings as any) || {}
        let exposure = settings.exposure

        // Migrate from old endpoints to exposure if necessary
        if (!exposure && settings.endpoints) {
          const oldEndpoints = settings.endpoints
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let oldEndpoint: any = null
          if (Array.isArray(oldEndpoints)) {
            oldEndpoint = oldEndpoints.length > 0 ? oldEndpoints[0] : null
          } else if (oldEndpoints && typeof oldEndpoints === 'object') {
            oldEndpoint = oldEndpoints
          }
          if (oldEndpoint) {
            exposure = {
              type: oldEndpoint.source_protocol || 'http',
              port: oldEndpoint.source_port || 80,
              visibility: 'cluster',
            }
          }
        }

        if (!exposure || !exposure.port) {
          return <div className="text-sm text-slate-400">No exposure</div>
        }

        // Display HTTP(S) instead of http for better clarity
        const displayType = exposure.type === 'http' ? 'HTTP(S)' : exposure.type.toUpperCase()

        return (
          <div className="text-sm text-slate-600">
            <div className="text-xs">
              {displayType}:{exposure.port} ({exposure.visibility})
            </div>
          </div>
        )
      },
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (component: InstanceComponent) => {
        // Get visibility from settings.exposure.visibility
        let visibility = 'cluster'
        const settings = component.settings || {}
        if (settings.exposure && settings.exposure.visibility) {
          visibility = settings.exposure.visibility
        }

        return (
          <div>
            {visibility === 'public' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Public
              </span>
            ) : visibility === 'cluster' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Cluster
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                Private
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'autoscaling',
      label: 'Autoscaling',
      render: (component: InstanceComponent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const autoscaling = (component.settings as any)?.autoscaling
        if (!autoscaling || (autoscaling.min === undefined && autoscaling.max === undefined)) {
          return <div className="text-sm text-slate-400">N/A</div>
        }
        return (
          <div className="text-sm text-slate-600">
            {autoscaling.min ?? '-'} - {autoscaling.max ?? '-'}
          </div>
        )
      },
    },
  ], [])

  // Columns specific to cron
  const cronColumns = useMemo(() => [
    {
      key: 'command',
      label: 'Command',
      render: (component: InstanceComponent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (component.settings as any)?.command
        if (!command) {
          return <div className="text-sm text-slate-400">No command</div>
        }
        // If array, join with spaces; if string, display directly
        const commandStr = Array.isArray(command) ? command.join(' ') : command
        return (
          <div className="text-sm text-slate-600 font-mono text-xs">
            {commandStr}
          </div>
        )
      },
    },
    {
      key: 'schedule',
      label: 'Schedule',
      render: (component: InstanceComponent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schedule = (component.settings as any)?.schedule
        if (!schedule) {
          return <div className="text-sm text-slate-400">No schedule</div>
        }
        return (
          <div className="text-sm text-slate-600 font-mono text-xs">
            {schedule}
          </div>
        )
      },
    },
  ], [])

  // Columns specific to worker
  const workerColumns = useMemo(() => [
    {
      key: 'autoscaling',
      label: 'Autoscaling',
      render: (component: InstanceComponent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const autoscaling = (component.settings as any)?.autoscaling
        if (!autoscaling || (autoscaling.min === undefined && autoscaling.max === undefined)) {
          return <div className="text-sm text-slate-400">N/A</div>
        }
        return (
          <div className="text-sm text-slate-600">
            {autoscaling.min ?? '-'} - {autoscaling.max ?? '-'}
          </div>
        )
      },
    },
  ], [])

  // Function to get columns based on type
  const getColumnsForType = (componentType: 'webapp' | 'worker' | 'cron') => {
    if (componentType === 'webapp') {
      return [
        baseColumns[0], // name
        baseColumns[1], // url
        webappColumns[0], // endpoints
        webappColumns[1], // visibility
        baseColumns[2], // cpu
        baseColumns[3], // memory
        webappColumns[2], // autoscaling
        baseColumns[4], // status
      ]
    }
    if (componentType === 'cron') {
      return [
        baseColumns[0], // name
        cronColumns[0], // command
        cronColumns[1], // schedule
        baseColumns[2], // cpu
        baseColumns[3], // memory
        baseColumns[4], // status
      ]
    }
    // Worker: name, cpu, memory, autoscaling, status (sem URL)
    return [
      baseColumns[0], // name
      baseColumns[2], // cpu
      baseColumns[3], // memory
      workerColumns[0], // autoscaling
      baseColumns[4], // status
    ]
  }

  const toggleType = (type: 'webapp' | 'worker' | 'cron') => {
    setExpandedTypes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  const openEditInstanceModal = () => {
    if (instance) {
      setInstanceFormData({
        image: instance.image,
        version: instance.version,
        enabled: instance.enabled,
      })
      setIsEditInstanceModalOpen(true)
    }
  }

  // Early returns devem vir DEPOIS de todos os hooks
  if (isLoadingInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Instance not found</p>
          <button
            onClick={() => navigate('/applications')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Applications', path: '/applications' },
          { label: instance.application?.name || 'Application' },
          { label: instance.environment.name, path: `/applications/${applicationUuid}/instances/${instanceUuid}/components` },
          { label: 'Components' },
        ]}
      />

      {/* Instance Summary Card */}
      {instance.environment && (() => {
        const envColor = getEnvironmentColor(instance.environment.uuid)
        return (
          <div className="glass-effect rounded-lg p-4 border border-neutral-200/50">
            <div className="flex items-center gap-8 flex-wrap">
              {/* Environment - Highlighted */}
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 ${envColor.bg} rounded-md`}>
                  <Globe size={16} className={envColor.text} />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Environment</p>
                  <p className={`text-base font-semibold ${envColor.text}`}>
                    {instance.environment.name}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-neutral-200"></div>

              {/* Application */}
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Application</p>
                <p className="text-sm font-medium text-neutral-900">{instance.application?.name || 'N/A'}</p>
              </div>

              {/* Image:Version */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs text-neutral-500 mb-0.5">Image</p>
                <p className="text-sm text-neutral-700 truncate" title={`${instance.image}:${instance.version}`}>
                  {instance.image}:{instance.version}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-neutral-500 mb-1">Status</p>
                {instance.enabled ? (
                  <span className="badge-success text-xs">
                    Enabled
                  </span>
                ) : (
                  <span className="badge-error text-xs">
                    Disabled
                  </span>
                )}
              </div>

              {/* Components Count */}
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Components</p>
                <p className="text-base font-semibold text-neutral-900">{instance.components?.length || 0}</p>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="flex items-center justify-between">
        <PageHeader
          title="Components"
          description={`Manage components for this instance`}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this instance? This action cannot be undone.')) {
                deleteInstanceMutation.mutate(instanceUuid!)
              }
            }}
            disabled={deleteInstanceMutation.isPending}
            className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={18} />
            <span>{deleteInstanceMutation.isPending ? 'Deleting...' : 'Delete Instance'}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setIsComponentTypeDropdownOpen(!isComponentTypeDropdownOpen)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Add Component</span>
              {isComponentTypeDropdownOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {isComponentTypeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsComponentTypeDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                  <button
                    onClick={() => {
                      initializeComponent('webapp')
                      setIsAddComponentsModalOpen(true)
                      setIsComponentTypeDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Webapp</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      initializeComponent('cron')
                      setIsAddComponentsModalOpen(true)
                      setIsComponentTypeDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Cron</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      initializeComponent('worker')
                      setIsAddComponentsModalOpen(true)
                      setIsComponentTypeDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Worker</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setIsInstanceActionsDropdownOpen(!isInstanceActionsDropdownOpen)}
              className="btn-secondary flex items-center gap-2"
            >
              <MoreVertical size={18} />
              <span>Actions</span>
              {isInstanceActionsDropdownOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {isInstanceActionsDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsInstanceActionsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                  <button
                    onClick={() => {
                      openEditInstanceModal()
                      setIsInstanceActionsDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg transition-colors flex items-center gap-2"
                  >
                    <Pencil size={16} />
                    <span>Edit Instance</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/applications/${applicationUuid}/instances/${instanceUuid}/events`)
                      setIsInstanceActionsDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <AlertCircle size={16} />
                    <span>Events</span>
                  </button>
                  <button
                    onClick={() => {
                      if (instanceUuid) {
                        syncInstanceMutation.mutate(instanceUuid)
                      }
                    }}
                    disabled={syncInstanceMutation.isPending}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed last:rounded-b-lg"
                  >
                    <RefreshCw size={16} className={syncInstanceMutation.isPending ? 'animate-spin' : ''} />
                    <span>{syncInstanceMutation.isPending ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-lg p-4 flex items-center justify-between mb-4 ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

        {/* Components by Type */}
        <div className="space-y-4">
          {(['webapp', 'worker', 'cron'] as const).map((type) => {
            const components = componentsByType[type]
            const isExpanded = expandedTypes.has(type)
            const count = components.length

            if (count === 0) return null

            return (
              <div key={type} className="bg-white rounded-xl shadow-soft border border-slate-200/60 overflow-hidden">
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-slate-600" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-600" />
                    )}
                    <span className="text-lg font-semibold text-slate-800 capitalize">{type}</span>
                    <span className="text-sm text-slate-500">({count} component{count !== 1 ? 's' : ''})</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200">
                    <DataTable<InstanceComponent>
                      columns={getColumnsForType(type)}
                      data={components}
                      isLoading={false}
                      emptyMessage="No components found"
                      loadingColor="blue"
                      getRowKey={(component) => component.uuid}
                      actions={(component) => {
                        const actions = []

                        // Adicionar "PODs" para webapp (página de detalhe) e worker (página de pods)
                        if (type === 'webapp') {
                          actions.push({
                            label: 'PODs',
                            icon: <Server size={14} />,
                            onClick: () => navigate(`/applications/${applicationUuid}/instances/${instanceUuid}/components/${component.uuid}`),
                            variant: 'default' as const,
                          })
                        }
                        if (type === 'worker') {
                          actions.push({
                            label: 'PODs',
                            icon: <Server size={14} />,
                            onClick: () => navigate(`/applications/${applicationUuid}/instances/${instanceUuid}/components/${component.uuid}/pods`),
                            variant: 'default' as const,
                          })
                        }

                        // Adicionar "Executions" apenas para cron
                        if (type === 'cron') {
                          actions.push({
                            label: 'Executions',
                            icon: <Server size={14} />,
                            onClick: () => navigate(`/applications/${applicationUuid}/instances/${instanceUuid}/components/${component.uuid}/executions`),
                            variant: 'default' as const,
                          })
                        }

                        actions.push(
                          {
                            label: 'Edit',
                            icon: <Pencil size={14} />,
                            onClick: () => loadComponentForEdit(component),
                            variant: 'default' as const,
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => {
                              if (confirm('Are you sure you want to delete this component?')) {
                                deleteComponentMutation.mutate(component.uuid)
                              }
                            },
                            variant: 'danger' as const,
                          }
                        )

                        return actions
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {Object.values(componentsByType).every((components) => components.length === 0) && (
            <div className="bg-white rounded-xl shadow-soft border border-slate-200/60 p-12 text-center">
              {hasNoClusters ? (
                <div className="space-y-3">
                  <p className="text-amber-600 text-lg font-medium">⚠️ No clusters in this environment</p>
                  <p className="text-slate-500">
                    You need to add a cluster to the <span className="font-medium">{instance?.environment?.name}</span> environment before you can create components.
                  </p>
                  <p className="text-sm text-slate-400">
                    Go to <span className="font-medium">Settings → Clusters</span> to add one.
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-lg">No components found. Click "Add Component" to get started.</p>
              )}
            </div>
          )}
        </div>

        {/* Add Components Modal */}
        {isAddComponentsModalOpen && instance && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div ref={modalContentRef} className="bg-white rounded-xl shadow-soft-lg max-w-4xl w-full border border-slate-200/60 animate-zoom-in max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-white flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {editingComponentUuid
                      ? `Edit ${component?.type ? component.type.charAt(0).toUpperCase() + component.type.slice(1) : 'Component'}`
                      : `Add ${component?.type ? component.type.charAt(0).toUpperCase() + component.type.slice(1) : 'Component'}`} - {instance.environment.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Image: {instance.image}:{instance.version}</p>
                </div>
                <button
                  onClick={() => {
                    setIsAddComponentsModalOpen(false)
                    setComponent(null)
                    setEditingComponentUuid(null)
                    setModalNotification(null)
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto">
                {modalNotification && (
                  <div
                    className={`mb-4 rounded-lg p-4 flex items-center justify-between ${
                      modalNotification.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    <span className="text-sm">{modalNotification.message}</span>
                    <button
                      onClick={() => setModalNotification(null)}
                      className="ml-4 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {hasNoClusters && !editingComponentUuid && (
                  <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">⚠️</span>
                      <div>
                        <p className="font-medium text-sm">No clusters in this environment</p>
                        <p className="text-sm mt-1">
                          Components cannot be deployed without a cluster. Go to <span className="font-medium">Settings → Clusters</span> to add one.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {component ? (
                  <ComponentForm
                    component={component}
                    onChange={setComponent}
                    showRemoveButton={false}
                    isEditing={!!editingComponentUuid}
                    hasGatewayApi={hasGatewayApi}
                    gatewayResources={gatewayResources}
                    gatewayReference={gatewayReference}
                    isAdmin={isAdmin}
                    organizationUuid={selectedOrganizationUuid}
                    componentUuid={editingComponentUuid || undefined}
                    title={editingComponentUuid
                      ? `Edit ${component.type.charAt(0).toUpperCase() + component.type.slice(1)}`
                      : `Add ${component.type.charAt(0).toUpperCase() + component.type.slice(1)}`}
                  />
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Component form will appear here.</p>
                )}
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 px-5 pb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddComponentsModalOpen(false)
                    setComponent(null)
                    setEditingComponentUuid(null)
                    setModalNotification(null)
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                {component && (
                  <button
                    type="button"
                    onClick={async () => {
                        if (!instance || !component) return

                        // Validate component before submitting
                        if (!editingComponentUuid && !component.name) {
                          setModalNotification({
                            type: 'error',
                            message: 'Component name is required',
                          })
                          setTimeout(() => {
                            modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                          }, 100)
                          return
                        }
                        if (!component.settings) {
                          setModalNotification({
                            type: 'error',
                            message: 'Component settings are required',
                          })
                          setTimeout(() => {
                            modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                          }, 100)
                          return
                        }

                        if (component.type === 'webapp') {
                          const settings = component.settings as WebappSettings | null
                          const exposureType = settings?.exposure?.type || 'http'
                          const exposureVisibility = settings?.exposure?.visibility || 'cluster'
                          // URL is required only if exposure.type is 'http' AND visibility is not 'cluster'
                          if (exposureType === 'http' && exposureVisibility !== 'cluster' && !component.url) {
                            setModalNotification({
                              type: 'error',
                              message: 'Webapp components with HTTP exposure type and visibility \'public\' or \'private\' must have a URL',
                            })
                            setTimeout(() => {
                              modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                            }, 100)
                            return
                          }
                        }

                        if (component.type === 'cron' && 'schedule' in component.settings && !component.settings.schedule) {
                          setModalNotification({
                            type: 'error',
                            message: 'Cron components must have a schedule',
                          })
                          setTimeout(() => {
                            modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                          }, 100)
                          return
                        }

                        if (editingComponentUuid) {
                          // Update existing component
                          if (component.type === 'cron') {
                            const componentData: Partial<ApplicationComponentCreate> = {
                              type: 'cron',
                              settings: component.settings,
                              enabled: component.enabled,
                            }
                            updateCronComponentMutation.mutate(
                              { uuid: editingComponentUuid, data: componentData },
                              {
                                onSuccess: () => {
                                  setNotification({ type: 'success', message: 'Component updated successfully' })
                                  queryClient.invalidateQueries({ queryKey: ['instances'] })
                                  queryClient.invalidateQueries({ queryKey: ['application-components'] })
                                  setEditingComponentUuid(null)
                                  setComponent(null)
                                  setModalNotification(null)
                                  setIsAddComponentsModalOpen(false)
                                  setTimeout(() => setNotification(null), 5000)
                                },
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onError: (error: any) => {
                                  setModalNotification({
                                    type: 'error',
                                    message: error.response?.data?.detail || 'Error updating component',
                                  })
                                  setTimeout(() => {
                                    modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                                  }, 100)
                                },
                              }
                            )
                          } else if (component.type === 'worker') {
                            const componentData: Partial<ApplicationComponentCreate> = {
                              type: 'worker',
                              settings: component.settings,
                              enabled: component.enabled,
                            }
                            updateWorkerComponentMutation.mutate({ uuid: editingComponentUuid, data: componentData }, {
                              onSuccess: () => {
                                setNotification({ type: 'success', message: 'Component updated successfully' })
                                queryClient.invalidateQueries({ queryKey: ['instances'] })
                                queryClient.invalidateQueries({ queryKey: ['application-components'] })
                                setEditingComponentUuid(null)
                                setComponent(null)
                                setModalNotification(null)
                                setIsAddComponentsModalOpen(false)
                                setTimeout(() => setNotification(null), 5000)
                              },
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              onError: (error: any) => {
                                setModalNotification({
                                  type: 'error',
                                  message: error.response?.data?.detail || 'Error updating component',
                                })
                                setTimeout(() => {
                                  modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                                }, 100)
                              },
                            })
                          } else {
                            // exposure.visibility is already in settings.exposure.visibility
                            const settings = component.settings as WebappSettings
                            const finalSettings = {
                              ...settings,
                              exposure: {
                                ...settings.exposure,
                              },
                            }
                            const exposureType = finalSettings.exposure?.type || 'http'
                            const exposureVisibility = finalSettings.exposure?.visibility || 'cluster'
                            const componentData: Partial<ApplicationComponentCreate> = {
                              type: 'webapp',
                              settings: finalSettings,
                              // visibility is no longer sent in webapp payload, only exposure.visibility
                              enabled: component.enabled,
                            }
                            // Include URL only if exposure.type is 'http' AND visibility is not 'cluster'
                            // If not HTTP or visibility is cluster, do not include url field in payload (do not send null)
                            if (exposureType === 'http' && exposureVisibility !== 'cluster') {
                              componentData.url = component.url || null
                            }
                            updateComponentMutation.mutate({ uuid: editingComponentUuid, data: componentData })
                          }
                        } else {
                          // Create new component
                          if (component.type === 'cron') {
                            const componentData: ApplicationComponentCreate = {
                              instance_uuid: instance.uuid,
                              name: component.name,
                              type: 'cron',
                              settings: component.settings,
                              enabled: component.enabled,
                            }
                            createCronComponentMutation.mutate(componentData, {
                              onSuccess: () => {
                                setNotification({ type: 'success', message: 'Component added successfully' })
                                queryClient.invalidateQueries({ queryKey: ['instances'] })
                                queryClient.invalidateQueries({ queryKey: ['application-components'] })
                                setComponent(null)
                                setModalNotification(null)
                                setIsAddComponentsModalOpen(false)
                                setTimeout(() => setNotification(null), 5000)
                              },
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              onError: (error: any) => {
                                setModalNotification({
                                  type: 'error',
                                  message: error.response?.data?.detail || 'Error adding component',
                                })
                                setTimeout(() => {
                                  modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                                }, 100)
                              },
                            })
                          } else if (component.type === 'worker') {
                            const componentData: ApplicationComponentCreate = {
                              instance_uuid: instance.uuid,
                              name: component.name,
                              type: 'worker',
                              settings: component.settings,
                              enabled: component.enabled,
                            }
                            createWorkerComponentMutation.mutate(componentData, {
                              onSuccess: () => {
                                setNotification({ type: 'success', message: 'Component added successfully' })
                                queryClient.invalidateQueries({ queryKey: ['instances'] })
                                queryClient.invalidateQueries({ queryKey: ['application-components'] })
                                setComponent(null)
                                setModalNotification(null)
                                setIsAddComponentsModalOpen(false)
                                setTimeout(() => setNotification(null), 5000)
                              },
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              onError: (error: any) => {
                                setModalNotification({
                                  type: 'error',
                                  message: error.response?.data?.detail || 'Error adding component',
                                })
                                setTimeout(() => {
                                  modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                                }, 100)
                              },
                            })
                          } else {
                            // exposure.visibility is already in settings.exposure.visibility
                            const settings = component.settings as WebappSettings
                            const finalSettings = {
                              ...settings,
                              exposure: {
                                ...settings.exposure,
                              },
                            }
                            const exposureType = finalSettings.exposure?.type || 'http'
                            const exposureVisibility = finalSettings.exposure?.visibility || 'cluster'
                            const componentData: ApplicationComponentCreate = {
                              instance_uuid: instance.uuid,
                              name: component.name,
                              type: 'webapp',
                              settings: finalSettings,
                              // visibility is no longer sent in webapp payload, only exposure.visibility
                              enabled: component.enabled,
                            }
                            // Include URL only if exposure.type is 'http' AND visibility is not 'cluster' and URL is not null
                            // If not HTTP or visibility is cluster, do not include url field in payload
                            if (exposureType === 'http' && exposureVisibility !== 'cluster' && component.url) {
                              componentData.url = component.url
                            }
                            addComponentToInstanceMutation.mutate(componentData)
                          }
                        }
                      }}
                    disabled={createWebappComponentMutation.isPending || createCronComponentMutation.isPending || createWorkerComponentMutation.isPending || updateWebappComponentMutation.isPending || updateCronComponentMutation.isPending || updateWorkerComponentMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-soft text-sm font-medium disabled:opacity-50"
                  >
                    {(createWebappComponentMutation.isPending || createCronComponentMutation.isPending || createWorkerComponentMutation.isPending || updateWebappComponentMutation.isPending || updateCronComponentMutation.isPending || updateWorkerComponentMutation.isPending)
                      ? (editingComponentUuid ? 'Updating...' : 'Adding...')
                      : (editingComponentUuid ? 'Update Component' : 'Add Component')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Edit Instance Modal */}
      {isEditInstanceModalOpen && instance && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-soft-lg max-w-2xl w-full border border-slate-200/60 animate-zoom-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Edit Instance</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Application: {instance.application?.name || 'N/A'} | Environment: {instance.environment.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditInstanceModalOpen(false)
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Image <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instanceFormData.image}
                  onChange={(e) => setInstanceFormData({ ...instanceFormData, image: e.target.value })}
                  placeholder="e.g., myapp"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Version <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instanceFormData.version}
                  onChange={(e) => setInstanceFormData({ ...instanceFormData, version: e.target.value })}
                  placeholder="e.g., 1.0.0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instanceFormData.enabled}
                    onChange={(e) => setInstanceFormData({ ...instanceFormData, enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enabled</span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  When enabled, the instance will be active and can receive traffic.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 px-5 pb-5">
              <button
                type="button"
                onClick={() => {
                  setIsEditInstanceModalOpen(false)
                }}
                className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!instanceFormData.image || !instanceFormData.version) {
                    setNotification({
                      type: 'error',
                      message: 'Image and Version are required fields',
                    })
                    setTimeout(() => setNotification(null), 5000)
                    return
                  }

                  updateInstanceMutation.mutate({
                    uuid: instance.uuid,
                    data: {
                      image: instanceFormData.image,
                      version: instanceFormData.version,
                      enabled: instanceFormData.enabled,
                    },
                  })
                }}
                disabled={updateInstanceMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-soft text-sm font-medium disabled:opacity-50"
              >
                {updateInstanceMutation.isPending ? 'Updating...' : 'Update Instance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstanceDetail

