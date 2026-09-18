import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  getTask: vi.fn(),
  skipPreCheck: vi.fn(),
  executePreCheck: vi.fn(),
  executeInstallTask: vi.fn(),
  executeRollbackTask: vi.fn(),
  confirmRestart: vi.fn(),
  executeRestart: vi.fn(),
  skipValidate: vi.fn(),
  executeValidate: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
import { usePatchTaskPipeline } from '@/modules/patches/components/patch-task/wizard/usePatchTaskPipeline'

describe.each([false, true])('Linux pipeline (rollback=%s)', rollback => {
  let wrapper, pipeline, args, status
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    status = 'CREATED'
    api.getTask.mockImplementation(async () => ({ data: { id: 'task-1', status } }))
    api.skipPreCheck.mockImplementation(async () => {
      status = 'PRE_CHECK_DONE'
    })
    api.executeInstallTask.mockImplementation(async () => {
      status = 'INSTALL_DONE'
    })
    api.executeRollbackTask.mockImplementation(async () => {
      status = 'ROLLBACK_DONE'
    })
    api.executeRestart.mockImplementation(async () => {
      status = 'RESTARTING'
    })
    api.skipValidate.mockImplementation(async () => {
      status = 'COMPLETED'
    })
    args = {
      createdTaskId: ref('task-1'),
      stepStates: reactive(['idle', 'idle', 'idle', 'idle', 'idle']),
      taskStatus: ref(''),
      taskErrorMessage: ref(''),
      taskDetailData: ref(null),
      pipelineStatus: ref('idle'),
      pipelineFinished: ref(false),
      installConfig: reactive({ restartPolicy: 'system', postScript: '' }),
      isSkipped: reactive({ pre: true, restart: false, validate: true }),
      isRollbackTask: ref(rollback),
      executeStepTitle: ref(rollback ? '回滚' : '安装'),
      restartConfirmSubmitText: '确认重启',
      resolveApiErrorMessage: error => error.message,
      loadRestartOptions: vi.fn(),
      loadRollbackInfo: vi.fn(),
      emitSuccess: vi.fn(),
      pipelineSectionRef: ref(null),
      getStepIndex: key => ({ pre: 1, validate: 2, restart: 3, execute: 4 })[key]
    }
    wrapper = mount(
      defineComponent({
        setup() {
          pipeline = usePatchTaskPipeline(args)
          return () => null
        }
      })
    )
  })
  afterEach(() => {
    wrapper.unmount()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('waits for restart completion and recovers from a transient query error', async () => {
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    expect(status).toBe('RESTARTING')
    expect(api.skipValidate).not.toHaveBeenCalled()
    api.getTask.mockRejectedValueOnce(new Error('temporary network error'))
    await vi.advanceTimersByTimeAsync(3000)
    expect(args.pipelineStatus.value).toBe('running')
    status = 'RESTART_DONE'
    await vi.advanceTimersByTimeAsync(3000)
    await execution
    expect(api.skipValidate).toHaveBeenCalledWith('task-1')
    expect(args.pipelineStatus.value).toBe('success')
  })

  it('pauses after three failures and resumes querying without resubmitting any completed action', async () => {
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    for (let i = 0; i < 3; i += 1) api.getTask.mockRejectedValueOnce(new Error('offline'))
    await vi.advanceTimersByTimeAsync(9000)
    await execution
    expect(args.pipelineStatus.value).toBe('paused')
    expect(api.skipValidate).not.toHaveBeenCalled()
    status = 'RESTART_DONE'
    await pipeline.startPipeline()
    expect(args.pipelineStatus.value).toBe('success')
    expect(api.skipPreCheck).toHaveBeenCalledTimes(1)
    expect(rollback ? api.executeRollbackTask : api.executeInstallTask).toHaveBeenCalledTimes(1)
    expect(api.confirmRestart).toHaveBeenCalledTimes(1)
    expect(api.executeRestart).toHaveBeenCalledTimes(1)
    expect(api.skipValidate).toHaveBeenCalledTimes(1)
  })

  it('does not overlap slow status requests', async () => {
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    let finish
    api.getTask.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    await vi.advanceTimersByTimeAsync(3000)
    const calls = api.getTask.mock.calls.length
    await vi.advanceTimersByTimeAsync(12000)
    expect(api.getTask).toHaveBeenCalledTimes(calls)
    finish({ data: { status: 'RESTART_DONE' } })
    await vi.advanceTimersByTimeAsync(0)
    await execution
    expect(args.pipelineStatus.value).toBe('success')
  })

  it('ignores in-flight queries after closing, and settles the waiting execution', async () => {
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    let finish
    api.getTask.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    await vi.advanceTimersByTimeAsync(3000)
    pipeline.stopPolling()
    args.createdTaskId.value = ''
    args.taskDetailData.value = null
    args.pipelineStatus.value = 'idle'
    await execution
    finish({ data: { id: 'task-1', status: 'RESTART_DONE' } })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.skipValidate).not.toHaveBeenCalled()
    expect(args.taskDetailData.value).toBe(null)
    expect(args.pipelineStatus.value).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not advance after unmounting while restart dispatch is pending', async () => {
    let finish
    api.executeRestart.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    wrapper.unmount()
    const calls = api.getTask.mock.calls.length
    finish()
    await execution
    expect(api.getTask).toHaveBeenCalledTimes(calls)
    expect(api.skipValidate).not.toHaveBeenCalled()
    expect(args.emitSuccess).not.toHaveBeenCalled()
  })

  it('keeps backend task failures distinct from query interruptions', async () => {
    const execution = pipeline.startPipeline()
    await vi.advanceTimersByTimeAsync(0)
    status = 'RESTART_FAILED'
    await vi.advanceTimersByTimeAsync(3000)
    await execution
    expect(args.pipelineStatus.value).toBe('failed')
    expect(args.stepStates[3]).toBe('failed')
    expect(api.skipValidate).not.toHaveBeenCalled()
  })

  it('preserves the existing skip-restart contract', async () => {
    args.installConfig.restartPolicy = 'none'
    await pipeline.startPipeline()
    expect(api.executeRestart).not.toHaveBeenCalled()
    expect(api.confirmRestart.mock.calls[0].slice(0, 2)).toEqual(['task-1', false])
    expect(args.pipelineStatus.value).toBe('success')
  })
})
