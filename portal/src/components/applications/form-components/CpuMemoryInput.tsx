interface CpuMemoryInputProps {
  cpu: number
  memory: number
  onCpuChange: (cpu: number) => void
  onMemoryChange: (memory: number) => void
  minCpu?: number
  maxCpu?: number
  minMemory?: number
  maxMemory?: number
}

const DEFAULT_MIN_CPU = 0.1
const DEFAULT_MAX_CPU = 8
const DEFAULT_MIN_MEMORY = 128
const DEFAULT_MAX_MEMORY = 16384

export function CpuMemoryInput({
  cpu,
  memory,
  onCpuChange,
  onMemoryChange,
  minCpu = DEFAULT_MIN_CPU,
  maxCpu = DEFAULT_MAX_CPU,
  minMemory = DEFAULT_MIN_MEMORY,
  maxMemory = DEFAULT_MAX_MEMORY,
}: CpuMemoryInputProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          CPU (cores) *: {cpu}
        </label>
        <input
          type="range"
          min={String(minCpu)}
          max={String(maxCpu)}
          step="0.1"
          value={Math.max(minCpu, Math.min(maxCpu, cpu))}
          onChange={(e) => onCpuChange(parseFloat(e.target.value) || minCpu)}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          required
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{minCpu}</span>
          <span>{maxCpu}</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Memory (MB) *: {memory}
        </label>
        <input
          type="range"
          min={String(minMemory)}
          max={String(maxMemory)}
          step="128"
          value={Math.max(minMemory, Math.min(maxMemory, memory))}
          onChange={(e) => onMemoryChange(parseInt(e.target.value) || minMemory)}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          required
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{minMemory} MB</span>
          <span>{maxMemory >= 1024 ? `${(maxMemory / 1024).toFixed(0)} GB` : `${maxMemory} MB`}</span>
        </div>
      </div>
    </div>
  )
}

