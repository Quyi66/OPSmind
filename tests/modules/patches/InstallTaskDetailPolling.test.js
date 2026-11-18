import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/core/i18n'
import InstallTaskDetailDialog from '@/modules/patches/components/InstallTaskDetailDialog.vue'

const api = vi.hoisted(() => ({
  getTask: vi.fn(),
  skipPreCheck: vi.fn(),
  executePreCheck: vi.fn(),
  executeInstallTask: vi.fn(),
  executeRollbackTask: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', template: '<div />' }
}))

let wrapper
let task

function mountDialog() {
  wrapper = shallowMount(InstallTaskDetailDialog, {
    props: {
      visible: true,
      taskId: task.id,
      'onUpdate:visible': visible => wrapper.setProps({ visible })
    },
    global: {
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: `<section v-if="modelValue">
            <button data-testid="close" @click="$emit('update:modelValue', false)">关闭</button>
            <slot /><slot name="footer" />
          </section>`
        },
        'el-button': { template: '<button><slot /></button>' },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true,
        'el-collapse': true,
        'el-collapse-item': true
      },
      directives: { loading() {} }
    }
  })
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-28T10:00:00+08:00'))
  task = {
    id: 'scheduled-task',
    status: 'CREATED',
    scheduledTime: new Date(Date.now() + 20000).toISOString()
  }
  api.getTask.mockImplementation(async () => ({ data: { ...task } }))
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('任务详情预检查操作的上下文保护', () => {
  const skipLabel = 'patches.linux.acknowledgeAndInstall'
  const retryLabel = 'patches.linux.repeatPrecheck'

  function deferred() {
    let resolve
    const promise = new Promise(done => { resolve = done })
    return { promise, resolve }
  }

  async function openFailedTask(taskType = 'install') {
    task = { id: 'task-a', taskType, status: 'PRE_CHECK_FAILED' }
    mountDialog()
    await flushPromises()
  }

  async function switchTask() {
    task = { id: 'task-b', taskType: 'rollback', status: 'PRE_CHECK_FAILED' }
    await wrapper.setProps({ taskId: task.id })
    await flushPromises()
  }

  function clickAction(label) {
    return wrapper.findAll('button').find(button => button.text() === t(label)).trigger('click')
  }

  it('确认框打开期间切换任务，确认后不跳过任何任务的预检查', async () => {
    const confirmation = deferred()
    vi.spyOn(ElMessageBox, 'confirm').mockReturnValue(confirmation.promise)
    await openFailedTask()

    await clickAction(skipLabel)
    await switchTask()
    confirmation.resolve()
    await flushPromises()

    expect(api.skipPreCheck).not.toHaveBeenCalled()
    expect(api.executeInstallTask).not.toHaveBeenCalled()
    expect(api.executeRollbackTask).not.toHaveBeenCalled()
  })

  it.each(['切换任务', '关闭后重开同一任务'])('跳过请求发出后%s，不再下发执行请求', async change => {
    const skip = deferred()
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue()
    api.skipPreCheck.mockReturnValue(skip.promise)
    await openFailedTask()

    await clickAction(skipLabel)
    await flushPromises()
    expect(api.skipPreCheck).toHaveBeenCalledExactlyOnceWith('task-a')
    if (change === '切换任务') await switchTask()
    else {
      await wrapper.get('[data-testid="close"]').trigger('click')
      await wrapper.setProps({ visible: true })
      await flushPromises()
    }
    skip.resolve()
    await flushPromises()

    expect(api.executeInstallTask).not.toHaveBeenCalled()
    expect(api.executeRollbackTask).not.toHaveBeenCalled()
  })

  it('原执行响应无法覆盖新任务状态或解除它的操作锁', async () => {
    const install = deferred()
    const retry = deferred()
    const success = vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue()
    api.skipPreCheck.mockResolvedValue()
    api.executeInstallTask.mockReturnValue(install.promise)
    api.executePreCheck.mockReturnValue(retry.promise)
    await openFailedTask()

    await clickAction(skipLabel)
    await flushPromises()
    expect(api.executeInstallTask).toHaveBeenCalledExactlyOnceWith('task-a', {
      isCurrent: expect.any(Function)
    })
    const { isCurrent } = api.executeInstallTask.mock.lastCall[1]
    expect(isCurrent()).toBe(true)
    await switchTask()
    expect(isCurrent()).toBe(false)
    await clickAction(retryLabel)
    expect(api.executePreCheck).toHaveBeenCalledExactlyOnceWith('task-b')

    install.resolve({ data: { id: 'task-a', status: 'INSTALLING' } })
    await flushPromises()
    expect(wrapper.vm.$.setupState.taskDetail.id).toBe('task-b')
    expect(wrapper.vm.$.setupState.actionLoading).toBe(true)
    expect(success).not.toHaveBeenCalled()
    retry.resolve({ data: { id: 'task-b', status: 'PRE_CHECKING' } })
    await flushPromises()
    expect(wrapper.vm.$.setupState.actionLoading).toBe(false)
  })

  it('保留当前回滚任务的执行入口和确认保护', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue()
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    api.skipPreCheck.mockResolvedValue()
    api.executeRollbackTask.mockResolvedValue({ data: { id: 'task-a', status: 'ROLLING_BACK' } })
    await openFailedTask('rollback')

    await clickAction(skipLabel)
    await flushPromises()
    expect(api.skipPreCheck).toHaveBeenCalledExactlyOnceWith('task-a')
    expect(api.executeRollbackTask).toHaveBeenCalledExactlyOnceWith('task-a', {
      isCurrent: expect.any(Function)
    })
    expect(api.executeInstallTask).not.toHaveBeenCalled()
    expect(wrapper.vm.$.setupState.taskDetail.status).toBe('ROLLING_BACK')
  })
})

describe('定时安装详情轮询', () => {
  it('首次读取未来计划任务后，计划时间前不重复请求详情', async () => {
    mountDialog()
    await flushPromises()
    expect(api.getTask).toHaveBeenCalledExactlyOnceWith(task.id)
    expect(wrapper.text()).toContain('等待定时执行')
    expect(wrapper.text()).toContain(t('patches.linux.scheduledTimeLabel'))

    await vi.advanceTimersByTimeAsync(19999)
    expect(api.getTask).toHaveBeenCalledTimes(1)
  })

  it('到计划时间自动恢复查询，并持续更新执行状态', async () => {
    mountDialog()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getTask).toHaveBeenCalledTimes(1)

    task.status = 'PRE_CHECKING'
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getTask).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('正在进行前置环境检查')

    task.status = 'INSTALLING'
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getTask).toHaveBeenCalledTimes(3)
    expect(wrapper.text()).toContain('正在分批执行安装')
  })

  it.each(['计划时间前', '恢复轮询后'])('%s关窗后停止请求', async phase => {
    mountDialog()
    await flushPromises()
    if (phase === '恢复轮询后') await vi.advanceTimersByTimeAsync(20000)
    const callsBeforeClose = api.getTask.mock.calls.length

    await wrapper.get('[data-testid="close"]').trigger('click')
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    await vi.advanceTimersByTimeAsync(60000)
    expect(api.getTask).toHaveBeenCalledTimes(callsBeforeClose)
  })

  it('卸载后不在计划时间恢复轮询', async () => {
    mountDialog()
    await flushPromises()
    wrapper.unmount()
    wrapper = null

    await vi.advanceTimersByTimeAsync(60000)
    expect(api.getTask).toHaveBeenCalledTimes(1)
  })
})

describe('获批的普通安装申请', () => {
  it('从待审批轮询至等待实施、预检查完成和正在安装，只读取后端状态', async () => {
    task = {
      id: 'install-application',
      taskType: 'install',
      status: 'PENDING_APPROVAL',
      planStartTime: '2026-10-28 10:00:15',
      planEndTime: '2026-10-28 10:30:00'
    }
    mountDialog()
    await flushPromises()
    expect(wrapper.text()).toContain(t('patches.changeControl.plan'))
    expect(wrapper.text()).not.toContain(t('patches.linux.scheduledTimeLabel'))

    task.status = 'CREATED'
    task.approvedBy = 'admin'
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.text()).toContain(t('patches.changeControl.awaitImplementation'))
    expect(wrapper.text()).not.toContain(t('patches.changeControl.actions.precheck'))
    expect(wrapper.text()).not.toContain(t('patches.changeControl.actions.skipPrecheck'))

    task.status = 'PRE_CHECK_DONE'
    await vi.advanceTimersByTimeAsync(15000)
    expect(wrapper.text()).not.toContain(t('patches.changeControl.actions.install'))

    task.status = 'INSTALLING'
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.text()).toContain(t('patches.linux.batchInstalling'))
    expect(api.getTask).toHaveBeenCalledTimes(6)
    expect(api.executePreCheck).not.toHaveBeenCalled()
    expect(api.skipPreCheck).not.toHaveBeenCalled()
    expect(api.executeInstallTask).not.toHaveBeenCalled()
  })

  it.each(['PRE_CHECK_FAILED', 'RESTART_PENDING', 'RESTART_DONE'])(
    '在 %s 保留状态展示但隐藏手动执行操作',
    async status => {
      task = {
        id: 'approved-install',
        taskType: 'install',
        status,
        approvedTime: '2026-10-28 09:59:00',
        errorMessage: '原始任务说明'
      }
      mountDialog()
      await flushPromises()
      expect(wrapper.text()).toContain('原始任务说明')
      const actions = wrapper.findAll('button').map(button => button.text())
      const executionActions = ['restart', 'skipRestart', 'validate', 'skipValidate']
        .map(action => t(`patches.changeControl.actions.${action}`))
        .concat(t('patches.linux.repeatPrecheck'), t('patches.linux.acknowledgeAndInstall'))
      expect(actions.some(action => executionActions.includes(action))).toBe(false)
    }
  )

  it('保留直接创建的手动安装任务在预检查完成后的执行入口', async () => {
    task = { id: 'direct-install', taskType: 'install', status: 'PRE_CHECK_DONE' }
    mountDialog()
    await flushPromises()
    expect(wrapper.findAll('button').some(button =>
      button.text() === t('patches.changeControl.actions.install'))).toBe(true)
  })
})
