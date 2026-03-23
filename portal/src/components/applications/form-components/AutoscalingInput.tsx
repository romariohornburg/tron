interface Autoscaling {
  min: number
  max: number
}

interface AutoscalingInputProps {
  autoscaling: Autoscaling | undefined
  onChange: (autoscaling: Autoscaling) => void
  /** Max value for both Min Replicas and Max Replicas (from environment setting max_pods). Default 20. */
  maxReplicas?: number
}

const DEFAULT_MAX_REPLICAS = 20

export function AutoscalingInput({ autoscaling, onChange, maxReplicas = DEFAULT_MAX_REPLICAS }: AutoscalingInputProps) {
  // Default values if autoscaling is not defined
  const safeAutoscaling: Autoscaling = autoscaling || { min: 2, max: Math.min(10, maxReplicas) }

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <h5 className="text-xs font-semibold text-slate-700 mb-3">Autoscaling</h5>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Min Replicas: {safeAutoscaling.min}
          </label>
          <input
            type="range"
            min="1"
            max={String(maxReplicas)}
            step="1"
            value={safeAutoscaling.min}
            onChange={(e) => {
              const min = parseInt(e.target.value) || 1
              const newMax = Math.max(min, safeAutoscaling.max)
              onChange({ min, max: newMax })
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>{maxReplicas}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Max Replicas: {safeAutoscaling.max}
          </label>
          <input
            type="range"
            min="1"
            max={String(maxReplicas)}
            step="1"
            value={safeAutoscaling.max}
            onChange={(e) => {
              const max = parseInt(e.target.value) || 10
              const newMin = Math.min(max, safeAutoscaling.min)
              onChange({ min: newMin, max })
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>{maxReplicas}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

