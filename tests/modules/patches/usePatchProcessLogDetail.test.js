import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

const api = vi.hoisted(() => ({
  getAuditDetail: vi.fn(),
  getTask: vi.fn(),
  getTaskAuditHistoryAll: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('element-plus', () => ({ ElMessage: { warning: vi.fn() } }))
import { usePatchProcessLogDetail } from '@/modules/patches/composables/usePatchProcessLogDetail'

const response = (status = 'INSTALLING') => ({ data: {
  task: { id: 'task-1', taskType: 'pkg_update', status },
  steps: [{ step: 'INSTALL', status: status === 'INSTALLING' ? 'RUNNING' : 'SUCCESS' }],
  logs: []
} })

describe('process detail background refresh', () => {
  let scope
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    scope = effectScope()
    api.getAuditDetail.mockResolvedValue(response())
  })
  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  function setup() {
    const source = ref({ id: 'task-1', taskType: 'pkg_update', status: 'INSTALLING' })
    const visible = ref(true)
    let detail
    scope.run(() => {
      detail = usePatchProcessLogDetail(source)
      useActiveTaskListPolling({
        records: () => detail.task.value ? [detail.task.value] : [],
        refresh: detail.refresh,
        enabled: () => visible.value && !detail.loading.value,
        activeStatuses: ['INSTALLING'],
        interval: 1000
      })
    })
    return { detail, visible, source }
  }

  it('keeps the selected step and current data while refreshing, then stops at completion', async () => {
    const { detail } = setup()
    await detail.load()
    detail.currentStep.value = 4
    let resolveRefresh
    api.getAuditDetail.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(detail.currentStepKey.value).toBe('execute')
    expect(detail.loading.value).toBe(false)
    expect(detail.pipelineItems.value[1].state).toBe('running')
    resolveRefresh(response('COMPLETED'))
    await vi.advanceTimersByTimeAsync(0)
    expect(detail.currentStep.value).toBe(4)
    expect(detail.task.value.status).toBe('COMPLETED')
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getAuditDetail).toHaveBeenCalledTimes(2)
  })

  it('stops polling when the dialog closes and discards a late response', async () => {
    const { detail, visible } = setup()
    await detail.load()
    let resolveRefresh
    api.getAuditDetail.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve }))
    await vi.advanceTimersByTimeAsync(1000)
    visible.value = false
    detail.reset()
    await nextTick()
    resolveRefresh(response())
    await vi.advanceTimersByTimeAsync(5000)
    expect(detail.task.value).toBeNull()
    expect(api.getAuditDetail).toHaveBeenCalledTimes(2)
  })

  it('preserves the selected step when falling back to legacy detail APIs', async () => {
    const { detail } = setup()
    await detail.load()
    detail.currentStep.value = 4
    api.getAuditDetail.mockRejectedValueOnce(new Error('audit unavailable'))
    api.getTask.mockResolvedValueOnce({ data: { id: 'task-1', status: 'INSTALL_DONE' } })
    api.getTaskAuditHistoryAll.mockResolvedValueOnce({ data: [] })
    await detail.refresh()
    expect(detail.currentStep.value).toBe(4)
    expect(detail.task.value.status).toBe('INSTALL_DONE')
    expect(detail.pipelineItems.value[1].state).not.toBe('running')
  })

  it('resets navigation when opening another task', async () => {
    const { detail, source } = setup()
    await detail.load()
    detail.currentStep.value = 4
    source.value = { id: 'task-2', status: 'CREATED' }
    api.getAuditDetail.mockResolvedValueOnce({ data: { task: source.value } })
    await detail.load()
    expect(detail.currentStep.value).toBe(0)
    expect(detail.task.value.id).toBe('task-2')
  })
})
