import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw, X } from 'lucide-react'
import { useWebappComponent } from '../../features/components'
import { useInstance } from '../../features/instances'
import { useWebappDetail } from './hooks/useWebappDetail'
import { PodsTable } from './components/PodsTable'
import { PodLogsModal } from './components/PodLogsModal'
import { PodConsoleModal } from './components/PodConsoleModal'
import { PodDescribeModal } from './components/PodDescribeModal'
import { Breadcrumbs, PageHeader } from '../../shared/components'
import { useOrganization } from '../../contexts/OrganizationContext'

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback
  // Axios / API response: error.response.data.detail (FastAPI style)
  const err = error as { response?: { data?: { detail?: string | Array<{ msg?: string }> }; status?: number }; message?: string }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const msg = detail.map((d) => d?.msg ?? String(d)).filter(Boolean).join(', ')
    if (msg) return msg
  }
  // Error.message (e.g. thrown Error or AxiosError.message)
  if (typeof err.message === 'string' && err.message.trim()) return err.message
  return fallback
}

function WebappDetail() {
  const { uuid: applicationUuid, instanceUuid, componentUuid } = useParams<{
    uuid: string
    instanceUuid: string
    componentUuid: string
  }>()
  const { selectedOrganizationUuid, isLoading: isLoadingOrg } = useOrganization()

  const { data: component, isLoading: isLoadingComponent, isError: isErrorComponent, error: errorComponent, refetch: refetchComponent } = useWebappComponent(selectedOrganizationUuid, componentUuid)
  const { data: instance, isLoading: isLoadingInstance, isError: isErrorInstance, error: errorInstance, refetch: refetchInstance } = useInstance(selectedOrganizationUuid, instanceUuid)

  const [refreshInterval, setRefreshInterval] = useState<number>(5000) // Default: 5 seconds
  const [deletePodNotification, setDeletePodNotification] = useState<{ type: 'error'; message: string } | null>(null)

  const {
    pods,
    isLoadingPods,
    selectedPod,
    isLogsModalOpen,
    isConsoleModalOpen,
    isDescribeModalOpen,
    isLiveTail,
    podLogs,
    isLoadingLogs,
    podDescribe,
    isLoadingDescribe,
    commandOutput,
    currentCommand,
    isExecuting,
    handleViewLogs,
    handleOpenConsole,
    handleOpenDescribe,
    handleCloseLogsModal,
    handleCloseConsoleModal,
    handleCloseDescribeModal,
    handleDeletePod,
    handleCommandSubmit,
    handleCommandChange,
    setIsLiveTail,
    handleKeyDown,
    isDeletePodError,
    deletePodError,
    resetDeletePodError,
  } = useWebappDetail(selectedOrganizationUuid, componentUuid, refreshInterval)

  useEffect(() => {
    if (isDeletePodError && deletePodError) {
      setDeletePodNotification({
        type: 'error',
        message: getErrorMessage(deletePodError, 'Failed to delete pod. Please try again.'),
      })
      const timer = setTimeout(() => setDeletePodNotification(null), 5000)
      resetDeletePodError()
      return () => clearTimeout(timer)
    }
  }, [isDeletePodError, deletePodError, resetDeletePodError])

  const isError = isErrorInstance || isErrorComponent
  const errorMessage = isErrorInstance
    ? getErrorMessage(errorInstance, 'Failed to load instance. Please try again.')
    : getErrorMessage(errorComponent, 'Failed to load webapp. Please try again.')
  const handleRetry = () => {
    refetchInstance()
    refetchComponent()
  }

  if (isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-neutral-600">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!selectedOrganizationUuid) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: 'Applications', path: '/applications' },
          ]}
        />
        <div className="rounded-lg p-4 bg-yellow-50 border border-yellow-200 text-yellow-800">
          <p>No organization selected. Please select an organization first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {deletePodNotification && (
        <div className="rounded-lg p-4 flex items-center justify-between bg-red-50 border border-red-200 text-red-800">
          <span>{deletePodNotification.message}</span>
          <button
            type="button"
            onClick={() => setDeletePodNotification(null)}
            className="p-1 hover:opacity-80"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {isError && (
        <div className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-4">
          <p className="text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}
      <Breadcrumbs
        items={[
          { label: 'Home', path: '/' },
          { label: 'Applications', path: '/applications' },
          { label: instance?.application?.name || 'Application' },
          { label: instance?.environment.name || 'Environment', path: `/applications/${applicationUuid}/instances/${instanceUuid}/components` },
          { label: 'Components', path: `/applications/${applicationUuid}/instances/${instanceUuid}/components` },
          { label: component?.name || 'Webapp' },
        ]}
      />

      {!isError && (
        <>
          <div className="flex items-center justify-between">
            <PageHeader
              title={component?.name || 'Webapp Details'}
              description="Pods running in Kubernetes"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <span>Refresh:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="input pr-10"
                >
                  <option value={0}>Disabled</option>
                  <option value={2000}>2 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                </select>
              </label>
            </div>
          </div>

          {(isLoadingInstance || isLoadingComponent) ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 rounded-full" />
                <p className="mt-3 text-sm text-neutral-600">Loading webapp details...</p>
              </div>
            </div>
          ) : (
            <>
              <PodsTable
                pods={pods}
                isLoading={isLoadingPods}
                onViewLogs={handleViewLogs}
                onOpenConsole={handleOpenConsole}
                onDescribe={handleOpenDescribe}
                onDeletePod={handleDeletePod}
              />

              <PodLogsModal
                isOpen={isLogsModalOpen}
                podName={selectedPod}
                logs={podLogs}
                isLoading={isLoadingLogs}
                isLiveTail={isLiveTail}
                onClose={handleCloseLogsModal}
                onToggleLiveTail={setIsLiveTail}
              />

              <PodConsoleModal
                isOpen={isConsoleModalOpen}
                podName={selectedPod}
                commandOutput={commandOutput}
                currentCommand={currentCommand}
                isExecuting={isExecuting}
                onClose={handleCloseConsoleModal}
                onCommandChange={handleCommandChange}
                onCommandSubmit={handleCommandSubmit}
                onKeyDown={handleKeyDown}
              />

              <PodDescribeModal
                isOpen={isDescribeModalOpen}
                podName={selectedPod}
                describe={podDescribe}
                isLoading={isLoadingDescribe}
                onClose={handleCloseDescribeModal}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default WebappDetail

