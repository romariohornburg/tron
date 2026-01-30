import { useParams, useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useAuth } from '../../contexts/AuthContext'
import { CreationPageLayout, Stepper, useStepper, type Step } from '../../shared/components'
import { useCreateInstanceForm } from './hooks/useCreateInstanceForm'
import { Step1InstanceForm } from './components/Step1InstanceForm'
import { Step2ComponentsForm } from './components/Step2ComponentsForm'

function CreateInstance() {
  const { uuid: applicationUuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const { selectedOrganizationUuid } = useOrganization()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const {
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
    isSubmitting,
    hasNoClusters,
    hasGatewayApi,
    gatewayResources,
    gatewayReference,
  } = useCreateInstanceForm()

  const { currentStep, completedSteps, goToStep, completeStep } = useStepper(1)

  if (!application) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Loading application...</p>
        </div>
      </div>
    )
  }

  const step1Content = (
    <Step1InstanceForm
      data={instanceData}
      onChange={setInstanceData}
      hasNoClusters={hasNoClusters}
    />
  )

  const step2Content = (
    <Step2ComponentsForm
      components={components}
      isComponentTypeDropdownOpen={isComponentTypeDropdownOpen}
      onToggleDropdown={() => setIsComponentTypeDropdownOpen(!isComponentTypeDropdownOpen)}
      onAddComponent={addComponent}
      onRemoveComponent={removeComponent}
      onUpdateComponent={updateComponent}
      organizationUuid={selectedOrganizationUuid}
      hasGatewayApi={hasGatewayApi}
      gatewayResources={gatewayResources}
      gatewayReference={gatewayReference}
      isAdmin={isAdmin}
      hasEnvironmentSelected={!!instanceData.environment_uuid}
    />
  )

  const steps: Step[] = [
    {
      id: 1,
      title: 'Instance',
      summary: completedSteps.includes(1) ? `${instanceData.image}:${instanceData.version}` : undefined,
      content: step1Content,
      validate: validateStep1,
    },
    {
      id: 2,
      title: 'Components',
      summary: completedSteps.includes(2) ? `${components.length} component${components.length !== 1 ? 's' : ''}` : undefined,
      content: step2Content,
      validate: validateStep2,
    },
  ]

  return (
    <CreationPageLayout
      breadcrumbs={[
        { label: 'Applications', path: '/applications' },
        { label: application.name, path: `/applications/${applicationUuid}` },
        { label: 'New Instance' },
      ]}
      title="Create New Instance"
      description={`Follow the steps below to create a new instance for ${application.name}`}
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      isCreating={isSubmitting}
      creatingMessage="Please wait while we create your instance and components..."
      onCancel={() => navigate('/applications')}
      submitLabel="Create Instance"
      onSubmit={handleSubmit}
      submitDisabled={!canSubmit}
      isSubmitting={isSubmitting}
    >
      <div className="bg-white rounded-xl shadow-soft border border-slate-200/60 overflow-hidden divide-y divide-slate-200">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepChange={goToStep}
          onStepComplete={completeStep}
          showContinueButton={currentStep < 2}
        />
      </div>
    </CreationPageLayout>
  )
}

export default CreateInstance

