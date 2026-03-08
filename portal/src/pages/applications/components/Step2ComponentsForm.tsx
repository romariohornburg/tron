import { Plus, ChevronDown, ChevronUp, Circle } from 'lucide-react'
import { ComponentForm, type ComponentFormData } from '../../../components/applications'
import type { EnvironmentSettingsLimits } from '../../../features/environments'

interface Step2ComponentsFormProps {
  components: ComponentFormData[]
  isComponentTypeDropdownOpen: boolean
  onToggleDropdown: () => void
  onAddComponent: (type: 'webapp' | 'worker' | 'cron') => void
  onRemoveComponent: (index: number) => void
  onUpdateComponent: (index: number, component: ComponentFormData) => void
  organizationUuid: string | undefined
  hasGatewayApi: boolean
  gatewayResources: string[]
  gatewayReference: { namespace: string; name: string }
  isAdmin: boolean
  hasEnvironmentSelected: boolean
  environmentLimits?: EnvironmentSettingsLimits
}

export function Step2ComponentsForm({
  components,
  isComponentTypeDropdownOpen,
  onToggleDropdown,
  onAddComponent,
  onRemoveComponent,
  onUpdateComponent,
  organizationUuid,
  hasGatewayApi,
  gatewayResources,
  gatewayReference,
  isAdmin,
  hasEnvironmentSelected,
  environmentLimits,
}: Step2ComponentsFormProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Add at least one component to your instance.
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleDropdown}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-soft hover:shadow-soft-lg transition-all duration-200 text-sm font-medium"
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
                onClick={onToggleDropdown}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                <button
                  type="button"
                  onClick={() => onAddComponent('webapp')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="text-green-500 fill-green-500" />
                    <span>Webapp</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-4">
                    HTTP/HTTPS service
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onAddComponent('worker')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="text-purple-500 fill-purple-500" />
                    <span>Worker</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-4">
                    Background process
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onAddComponent('cron')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 last:rounded-b-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="text-orange-500 fill-orange-500" />
                    <span>Cron</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-4">Scheduled job</p>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {components.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
          <div className="text-slate-400 mb-2">
            <Plus size={32} className="mx-auto" />
          </div>
          <p className="text-slate-500">No components added yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Click &quot;Add Component&quot; to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {components.map((component, index) => (
            <ComponentForm
              key={index}
              component={component}
              onChange={(updatedComponent) => onUpdateComponent(index, updatedComponent)}
              organizationUuid={organizationUuid}
              onRemove={() => onRemoveComponent(index)}
              hasGatewayApi={hasGatewayApi}
              gatewayResources={gatewayResources}
              gatewayReference={gatewayReference}
              isAdmin={isAdmin}
              title={`Component ${index + 1}: ${component.type.charAt(0).toUpperCase() + component.type.slice(1)}`}
              hasEnvironmentSelected={hasEnvironmentSelected}
              environmentLimits={environmentLimits}
            />
          ))}
        </div>
      )}
    </>
  )
}
