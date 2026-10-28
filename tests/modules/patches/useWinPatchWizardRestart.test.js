import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

const apiMocks = vi.hoisted(() => ({
  createInstallTask: vi.fn(),
  createRollbackTask: vi.fn(),
  createScanTask: vi.fn(),
  executeTaskStep: vi.fn(),
  skipTaskStep: vi.fn(),
  getTaskDetail: vi.fn(),
  uploadTaskScript: vi.fn(),
  updateTaskScript: vi.fn()
}))

vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: apiMocks }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))

import { useWinPatchInstallWizard } from '@/modules/patches/windows-patch/composables/useWinPatchInstallWizard'
import { useWinPatchRollbackWizard } from '@/modules/patches/windows-patch/composables/useWinPatchRollbackWizard'

describe.each([
  ['INSTALL', useWinPatchInstallWizard, 'updateInstallOptions'],
  ['ROLLBACK', useWinPatchRollbackWizard, 'updateRollbackOptions']
])('%s wizard restart synchronization', (taskType, useWizard, updateOptions) => {
  let wrapper
  let state
  let onSuccess

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    onSuccess = vi.fn()
    // Begin with the install/rollback operation completed and restart still pending.
    state = {
      status: `${taskType}_DONE`,
      restart: 'PENDING',
      validate: 'PENDING',
      errorMessage: ''
    }
    const task = () => ({
      id: 'task-123',
      taskType,
      status: state.status,
      errorMessage: state.errorMessage
    })
    apiMocks.createInstallTask.mockImplementation(async () => ({ data: task() }))
    apiMocks.createRollbackTask.mockImplementation(async () => ({ data: task() }))
    apiMocks.getTaskDetail.mockImplementation(async () => ({
      data: {
        task: task(),
        steps: [
          { step: 'PRE_CHECK', status: 'SKIPPED' },
          { step: taskType, status: 'SUCCESS' },
          { step: 'RESTART', status: state.restart },
          { step: 'VALIDATE', status: state.validate }
        ]
      }
    }))
    const completeValidate = status => {
      // Model the backend precondition, so premature requests cannot falsely pass.
      if (state.status !== 'RESTART_DONE') {
        throw new Error('重启步骤尚未完成，不能进入校验')
      }
      state.status = 'COMPLETED'
      state.validate = status
    }
    apiMocks.executeTaskStep.mockImplementation(async (_id, _task, { stepKey }) => {
      if (stepKey === 'RESTART') {
        state.status = 'RESTARTING'
        state.restart = 'SUCCESS'
      } else if (stepKey === 'VALIDATE') {
        completeValidate('SUCCESS')
      }
      return { data: task() }
    })
    apiMocks.skipTaskStep.mockImplementation(async (_id, _task, { stepKey }) => {
      if (stepKey === 'RESTART') {
        state.status = 'RESTART_DONE'
        state.restart = 'SKIPPED'
      } else if (stepKey === 'VALIDATE') {
        completeValidate('SKIPPED')
      }
      return { data: task() }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  function createWizard({ reboot = true, validate = false } = {}) {
    let wizard
    wrapper = mount(
      defineComponent({
        setup() {
          wizard = useWizard({
            onSuccess,
            selectedRows: ref([{ patchStatusId: 'ps-1', histUpdateId: 'hist-1', hostId: 'host-1' }])
          })
          return () => null
        }
      })
    )
    wizard[updateOptions]({ reboot, rescanAfter: false })
    wizard.skippedSteps.value['pre-check'] = true
    wizard.skippedSteps.value.validate = !validate
    if (validate) wizard.updateValidateScriptConfig({ content: 'Write-Output ok' })
    return wizard
  }

  function stepCalls(mock, stepKey) {
    return mock.mock.calls.filter(([, , options]) => options.stepKey === stepKey)
  }

  function expectNoValidate() {
    expect(stepCalls(apiMocks.executeTaskStep, 'VALIDATE')).toHaveLength(0)
    expect(stepCalls(apiMocks.skipTaskStep, 'VALIDATE')).toHaveLength(0)
  }

  if (taskType === 'ROLLBACK') {
    it('shows an unfinished restart as running and recovers from a transient query error', async () => {
      const wizard = createWizard()
      const execution = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)
      expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('running')
      apiMocks.getTaskDetail.mockRejectedValueOnce(new Error('network unavailable'))
      await vi.advanceTimersByTimeAsync(3000)
      expect(wizard.pipelineStatus.value).toBe('running')
      expectNoValidate()
      state.status = 'RESTART_DONE'
      await vi.advanceTimersByTimeAsync(3000)
      await execution
      expect(wizard.pipelineStatus.value).toBe('success')
    })

    it('resumes querying the same step after three failures without repeating mutations', async () => {
      const wizard = createWizard()
      const execution = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)
      for (let i = 0; i < 3; i += 1) {
        apiMocks.getTaskDetail.mockRejectedValueOnce(new Error('network unavailable'))
      }
      await vi.advanceTimersByTimeAsync(9000)
      await execution
      expect(wizard.pipelineStatus.value).toBe('paused')
      expect(wizard.dialogBusy.value).toBe(false)
      expectNoValidate()
      state.status = 'RESTART_DONE'
      const resumed = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)
      await resumed
      expect(apiMocks.createRollbackTask).toHaveBeenCalledTimes(1)
      expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(1)
      expect(stepCalls(apiMocks.skipTaskStep, 'VALIDATE')).toHaveLength(1)
      expect(wizard.pipelineStatus.value).toBe('success')
    })

    it.each([false, true])(
      'only submits a rescan after completion when enabled (%s)',
      async rescanAfter => {
        const wizard = createWizard({ reboot: false })
        wizard.updateRollbackOptions({ reboot: false, rescanAfter })
        apiMocks.createScanTask.mockImplementation(async hostIds => {
          expect(state.status).toBe('COMPLETED')
          expect(hostIds).toEqual(['host-1'])
          return { data: { runId: 'scan-1' } }
        })
        const execution = wizard.startExecution()
        await vi.advanceTimersByTimeAsync(0)
        await execution
        expect(apiMocks.createScanTask).toHaveBeenCalledTimes(rescanAfter ? 1 : 0)
        expect(wizard.pipelineStatus.value).toBe('success')
      }
    )

    it('ignores a late query response after the wizard is reset', async () => {
      const wizard = createWizard()
      const execution = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)
      let resolveQuery
      apiMocks.getTaskDetail.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveQuery = resolve
          })
      )
      await vi.advanceTimersByTimeAsync(3000)
      wizard.resetState()
      resolveQuery({ data: { task: { id: 'task-123', status: 'RESTART_DONE' }, steps: [] } })
      await vi.advanceTimersByTimeAsync(0)
      await execution
      expect(wizard.currentTaskId.value).toBe('')
      expect(wizard.pipelineStatus.value).toBe('idle')
      expectNoValidate()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })
  }

  it.each([false, true])(
    'waits for RESTART_DONE before validation (execute=%s)',
    async validate => {
      const wizard = createWizard({ validate })
      const execution = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)

      expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(1)
      expect(state.status).toBe('RESTARTING')
      expectNoValidate()
      await vi.advanceTimersByTimeAsync(6000)
      expectNoValidate()
      expect(wizard.pipelineStatus.value).toBe('running')

      state.status = 'RESTART_DONE'
      await vi.advanceTimersByTimeAsync(3000)
      await execution

      const validateApi = validate ? apiMocks.executeTaskStep : apiMocks.skipTaskStep
      expect(stepCalls(validateApi, 'VALIDATE')).toHaveLength(1)
      expect(wizard.pipelineStatus.value).toBe('success')
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }))
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it.each(['FAILED', 'RESTART_FAILED'])('stops before validation on %s', async status => {
    const wizard = createWizard()
    const execution = wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)
    state.status = status
    state.errorMessage = '重启失败'
    await vi.advanceTimersByTimeAsync(3000)
    await execution

    expectNoValidate()
    expect(wizard.pipelineStatus.value).toBe('failed')
    expect(wizard.taskErrorMessage.value).toBe('重启失败')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('confirms skipping a pending restart and completes validation', async () => {
    const wizard = createWizard({ reboot: false })
    const execution = wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)
    await execution

    expect(stepCalls(apiMocks.skipTaskStep, 'RESTART')).toHaveLength(1)
    expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(0)
    expect(stepCalls(apiMocks.skipTaskStep, 'VALIDATE')).toHaveLength(1)
    expect(wizard.pipelineStatus.value).toBe('success')
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }))
  })

  it('does not use a skipped audit step to bypass the task status precondition', async () => {
    apiMocks.skipTaskStep.mockImplementationOnce(async () => {
      state.restart = 'SKIPPED'
      return { data: { id: 'task-123', status: state.status } }
    })
    const wizard = createWizard({ reboot: false })
    const execution = wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)
    expect(stepCalls(apiMocks.skipTaskStep, 'RESTART')).toHaveLength(1)
    expectNoValidate()
    await vi.advanceTimersByTimeAsync(3000)
    expectNoValidate()

    state.status = 'RESTART_DONE'
    await vi.advanceTimersByTimeAsync(3000)
    await execution
    expect(wizard.pipelineStatus.value).toBe('success')
  })

  it('waits for an existing restart without submitting it again', async () => {
    state.status = 'RESTARTING'
    state.restart = 'SUCCESS'
    const wizard = createWizard()
    const execution = wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)
    expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(0)
    expectNoValidate()

    state.status = 'RESTART_DONE'
    await vi.advanceTimersByTimeAsync(3000)
    await execution
    expect(wizard.pipelineStatus.value).toBe('success')
  })

  it.each([false, true])(
    'does not resubmit an already completed restart (reboot=%s)',
    async reboot => {
      state.status = 'RESTART_DONE'
      state.restart = reboot ? 'SUCCESS' : 'SKIPPED'
      const wizard = createWizard({ reboot })
      const execution = wizard.startExecution()
      await vi.advanceTimersByTimeAsync(0)
      await execution

      expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(0)
      expect(stepCalls(apiMocks.skipTaskStep, 'RESTART')).toHaveLength(0)
      expect(stepCalls(apiMocks.skipTaskStep, 'VALIDATE')).toHaveLength(1)
      expect(wizard.pipelineStatus.value).toBe('success')
    }
  )

  it('keeps restart step as running and waits when one host succeeds while another is still running', async () => {
    state.status = 'RESTARTING'
    let host2Status = 'RUNNING'

    apiMocks.getTaskDetail.mockImplementation(async () => ({
      data: {
        task: {
          id: 'task-123',
          taskType,
          status: state.status,
          errorMessage: state.errorMessage,
          currentStep: 'RESTART'
        },
        steps: [
          { step: 'PRE_CHECK', status: 'SKIPPED' },
          { step: taskType, status: 'SUCCESS' },
          { hostId: 'host-1', step: 'RESTART', status: 'SUCCESS' },
          { hostId: 'host-2', step: 'RESTART', status: host2Status },
          { step: 'VALIDATE', status: state.validate }
        ]
      }
    }))

    const wizard = createWizard({ validate: true })
    const execution = wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)

    expect(stepCalls(apiMocks.executeTaskStep, 'RESTART')).toHaveLength(1)
    expectNoValidate()

    // 即使 host-1 已经是 SUCCESS，因为 host-2 还在 RUNNING，RESTART 步骤 UI 必须为 running
    expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('running')
    expect(wizard.pipelineStatus.value).toBe('running')

    // 推进轮询周期，状态未变时持续保持 running
    await vi.advanceTimersByTimeAsync(3000)
    expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('running')
    expectNoValidate()

    // host-2 也成功，但主任务仍是 RESTARTING，UI 依然不能提前显示成功或进入校验
    host2Status = 'SUCCESS'
    await vi.advanceTimersByTimeAsync(3000)
    expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('running')
    expectNoValidate()

    // 主任务正式完成 RESTART_DONE
    state.status = 'RESTART_DONE'
    await vi.advanceTimersByTimeAsync(3000)
    await execution

    expect(stepCalls(apiMocks.executeTaskStep, 'VALIDATE')).toHaveLength(1)
    expect(wizard.pipelineStatus.value).toBe('success')
  })

  it('does not mark subsequent steps as running when earlier step is running', async () => {
    state.status = 'RUNNING'

    apiMocks.getTaskDetail.mockImplementation(async () => ({
      data: {
        task: {
          id: 'task-123',
          taskType,
          status: 'RUNNING',
          currentStep: 'PRE_CHECK'
        },
        steps: [
          { step: 'PRE_CHECK', status: 'RUNNING', remark: '正在执行中' },
          { step: taskType, status: 'PENDING', remark: '等待执行' },
          { step: 'RESTART', status: 'PENDING', remark: '等待执行' },
          { step: 'VALIDATE', status: 'PENDING', remark: '等待执行' }
        ]
      }
    }))

    const wizard = createWizard({ validate: true })
    wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)

    // 只有 PRE_CHECK 是 running，后续步骤必须稳定处于 pending，绝不能全显示 running
    expect(wizard.pipelineItemMap.value.PRE_CHECK.uiStatus).toBe('running')
    expect(wizard.pipelineItemMap.value[taskType].uiStatus).toBe('pending')
    expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('pending')
    expect(wizard.pipelineItemMap.value.VALIDATE.uiStatus).toBe('pending')
  })

  it('keeps completed steps as success and pending steps as pending when restart step fails', async () => {
    state.status = 'FAILED'

    apiMocks.getTaskDetail.mockImplementation(async () => ({
      data: {
        task: {
          id: 'task-123',
          taskType,
          status: 'FAILED',
          errorMessage: '重启节点超时',
          currentStep: 'RESTART'
        },
        steps: [
          { step: 'PRE_CHECK', status: 'SUCCESS' },
          { step: taskType, status: 'SUCCESS' },
          { step: 'RESTART', status: 'FAILED', remark: '重启失败' },
          { step: 'VALIDATE', status: 'PENDING', remark: '等待执行' }
        ]
      }
    }))

    const wizard = createWizard({ validate: true })
    wizard.startExecution()
    await vi.advanceTimersByTimeAsync(0)

    // 前置步骤应保持 success，只有失败的 RESTART 显示 failed，未执行的 VALIDATE 显示 pending
    expect(wizard.pipelineItemMap.value.PRE_CHECK.uiStatus).toBe('success')
    expect(wizard.pipelineItemMap.value[taskType].uiStatus).toBe('success')
    expect(wizard.pipelineItemMap.value.RESTART.uiStatus).toBe('failed')
    expect(wizard.pipelineItemMap.value.VALIDATE.uiStatus).toBe('pending')
  })
})
