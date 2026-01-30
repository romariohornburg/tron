import { InstanceForm } from '../../../components/applications'
import type { InstanceCreate } from '../../../features/instances'

interface Step1InstanceFormProps {
  data: Omit<InstanceCreate, 'application_uuid'>
  onChange: (data: Omit<InstanceCreate, 'application_uuid'>) => void
  hasNoClusters: boolean
}

export function Step1InstanceForm({
  data,
  onChange,
  hasNoClusters,
}: Step1InstanceFormProps) {
  return (
    <div className="space-y-4">
      <InstanceForm data={data} onChange={onChange} showInfoCard={false} />
      {hasNoClusters && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium">No clusters in this environment</p>
              <p className="text-sm mt-1">
                This environment has no clusters configured. You won&apos;t be able to
                deploy components until a cluster is added. Go to{' '}
                <span className="font-medium">Settings → Clusters</span> to add one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
