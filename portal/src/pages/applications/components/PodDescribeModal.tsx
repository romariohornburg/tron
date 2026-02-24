import { X } from 'lucide-react'

interface PodDescribeModalProps {
  isOpen: boolean
  podName: string | undefined
  describe: string | undefined
  isLoading: boolean
  onClose: () => void
}

export const PodDescribeModal = ({
  isOpen,
  podName,
  describe,
  isLoading,
  onClose,
}: PodDescribeModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-neutral-900">Pod Describe</h2>
            <p className="text-sm text-neutral-600 mt-1">{podName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-neutral-600" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : describe ? (
            <pre
              className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap h-full"
              style={{ maxHeight: 'calc(90vh - 200px)' }}
            >
              {describe}
            </pre>
          ) : (
            <div className="text-center py-12 text-slate-500">No describe output available</div>
          )}
        </div>
      </div>
    </div>
  )
}
