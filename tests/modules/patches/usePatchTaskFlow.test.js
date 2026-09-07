import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { usePatchTaskFlow } from '@/modules/patches/components/patch-task/wizard/usePatchTaskFlow'

function createSelectStepFlow(syncAffectedPackages) {
  const installStep = ref(0)
  const confirmedHosts = ref([])
  const selectedHosts = ref([{ hostId: 'host-001' }])

  const flow = usePatchTaskFlow({
    installStep,
    confirmedHosts,
    selectedHosts,
    currentStepKey: ref('select'),
    stepTransitionLoading: ref(false),
    stepStates: reactive(['idle', 'idle']),
    taskDetailData: ref(null),
    taskErrorMessage: ref(''),
    pipelineFinished: ref(false),
    pipelineStatus: ref('idle'),
    createdTaskId: ref(''),
    getStepIndex: key => (key === 'select' ? 0 : 1),
    validateSelectedHosts: vi.fn().mockResolvedValue(true),
    syncAffectedPackages,
    resetSkippedSteps: vi.fn(),
    resetRestartOptions: vi.fn()
  })

  return { ...flow, installStep, confirmedHosts, selectedHosts }
}

describe('usePatchTaskFlow affected package synchronization', () => {
  it('stays on the select step when affected packages fail to synchronize', async () => {
    const syncAffectedPackages = vi.fn().mockResolvedValue(false)
    const { handleNextStep, installStep, confirmedHosts, selectedHosts } =
      createSelectStepFlow(syncAffectedPackages)

    await handleNextStep()

    expect(syncAffectedPackages).toHaveBeenCalledWith(selectedHosts.value)
    expect(installStep.value).toBe(0)
    expect(confirmedHosts.value).toEqual([])
  })

  it('continues after affected packages synchronize successfully', async () => {
    const syncAffectedPackages = vi.fn().mockResolvedValue(true)
    const { handleNextStep, installStep, confirmedHosts, selectedHosts } =
      createSelectStepFlow(syncAffectedPackages)

    await handleNextStep()

    expect(installStep.value).toBe(1)
    expect(confirmedHosts.value).toEqual(selectedHosts.value)
  })

  it('does not continue if the host selection is cleared during synchronization', async () => {
    const syncAffectedPackages = vi.fn()
    const flow = createSelectStepFlow(syncAffectedPackages)
    syncAffectedPackages.mockImplementation(async () => {
      flow.selectedHosts.value = []
      return true
    })

    await flow.handleNextStep()

    expect(flow.installStep.value).toBe(0)
    expect(flow.confirmedHosts.value).toEqual([])
  })
})
