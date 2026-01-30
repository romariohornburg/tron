import type { ReactNode } from 'react'
import { Breadcrumbs } from './Breadcrumbs'
import type { BreadcrumbItem } from './Breadcrumbs'
import { PageHeader } from './PageHeader'

export interface CreationPageLayoutProps {
  breadcrumbs: BreadcrumbItem[]
  title: string
  description: string
  notification: { type: 'success' | 'error'; message: string } | null
  onDismissNotification: () => void
  partialSuccess?: { applicationUuid: string; instanceUuid: string } | null
  onNavigatePartialSuccess?: () => void
  isCreating?: boolean
  creatingMessage?: string
  children: ReactNode
  cancelLabel?: string
  onCancel: () => void
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
  submitDisabled?: boolean
  isSubmitting?: boolean
}

export function CreationPageLayout({
  breadcrumbs,
  title,
  description,
  notification,
  onDismissNotification,
  partialSuccess = null,
  onNavigatePartialSuccess,
  isCreating = false,
  creatingMessage = 'Please wait...',
  children,
  cancelLabel = 'Cancel',
  onCancel,
  submitLabel,
  onSubmit,
  submitDisabled = false,
  isSubmitting = false,
}: CreationPageLayoutProps) {
  const canSubmit = !submitDisabled && !isSubmitting

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative">
      {isCreating && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-soft-lg p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-800">{creatingMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mb-8">
          <PageHeader title={title} description={description} />
        </div>

        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <span>{notification.message}</span>
                <button
                  type="button"
                  onClick={onDismissNotification}
                  className="text-slate-400 hover:text-slate-600 ml-2"
                >
                  ✕
                </button>
              </div>
              {partialSuccess && notification.type === 'error' && onNavigatePartialSuccess && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={onNavigatePartialSuccess}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Go to Instance (add components there)
                  </button>
                  <button
                    type="button"
                    onClick={onDismissNotification}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Stay and fix
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit}>
          {children}

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`px-6 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-soft' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Creating...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
