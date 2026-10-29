import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PatchTaskRunControls from '@/modules/patches/components/patch-task/PatchTaskRunControls.vue'
import {
  autoRunTaskIds,
  canRunPatchTask,
  isAutoRunTask,
  rememberAutoRunTask,
  needsAutoRunRestartConfirmation
} from '@/modules/patches/utils/patchTaskAutoRun'
import { patchInstallApi } from '@/modules/patches/api'

vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: {
    runTask: vi.fn(),
    getTask: vi.fn(),
    getRestartOptions: vi.fn(),
    confirmRestart: vi.fn(),
    executeRestart: vi.fn()
  }
}))

const button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
const container = { template: '<div><slot /><slot name="footer" /></div>' }
const dialog = {
  props: ['modelValue'],
  template: '<div v-if="modelValue" data-dialog><slot /><slot name="footer" /></div>'
}
let wrapper
function findButton(text) {
  return wrapper.findAll('button').find(item => item.text() === text)
}
function create(task) {
  wrapper = mount(PatchTaskRunControls, {
    props: { task, enabled: true },
    global: {
      stubs: {
        'el-button': button,
        'el-dialog': dialog,
        'el-descriptions': container,
        'el-descriptions-item': container,
        'el-alert': true,
        'el-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        }
      }
    }
  })
  return wrapper
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  autoRunTaskIds.clear()
  sessionStorage.clear()
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('one-click patch execution', () => {
  it('enables documented resumable states and leaves running/completed tasks disabled', () => {
    for (const status of [
      'CREATED',
      'PRE_CHECK_DONE',
      'INSTALL_FAILED',
      'ROLLBACK_FAILED',
      'RESTART_DONE'
    ])
      expect(canRunPatchTask({ status })).toBe(true)
    for (const status of ['INSTALLING', 'COMPLETED', 'INSTALL_DONE'])
      expect(canRunPatchTask({ status })).toBe(false)
    expect(needsAutoRunRestartConfirmation({ status: 'INSTALL_DONE', restartType: 'none' })).toBe(
      false
    )
    expect(
      needsAutoRunRestartConfirmation({
        status: 'INSTALL_DONE',
        restartType: 'system',
        restartConfirmed: true
      })
    ).toBe(false)
  })
  it('polls a running task, prompts once, and confirms without executing restart twice', async () => {
    const installed = {
      id: 't1',
      status: 'INSTALL_DONE',
      restartType: 'system',
      restartConfirmed: false
    }
    patchInstallApi.runTask.mockResolvedValue({ data: { id: 't1', status: 'INSTALLING' } })
    patchInstallApi.getTask.mockResolvedValue({ data: installed })
    patchInstallApi.getRestartOptions.mockResolvedValue({
      data: { restartType: 'system', restartReason: '内核更新', affectedPackages: ['kernel'] }
    })
    patchInstallApi.confirmRestart.mockResolvedValue({
      data: { id: 't1', status: 'RESTARTING', restartConfirmed: true }
    })
    create({ id: 't1', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.text()).toContain('内核更新')
    expect(wrapper.text()).toContain('kernel')
    await wrapper.setProps({ task: { ...installed } })
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    expect(patchInstallApi.getRestartOptions).toHaveBeenCalledTimes(1)
    await wrapper.find('input').setValue('确认重启')
    await findButton('确认重启').trigger('click')
    await flushPromises()
    expect(patchInstallApi.confirmRestart).toHaveBeenCalledWith('t1', true, '确认重启')
    expect(patchInstallApi.executeRestart).not.toHaveBeenCalled()
    await wrapper.setProps({ enabled: false })
    const calls = patchInstallApi.getTask.mock.calls.length
    await vi.advanceTimersByTimeAsync(9000)
    expect(patchInstallApi.getTask).toHaveBeenCalledTimes(calls)
  })
  it.each(['INSTALL_DONE', 'ROLLBACK_DONE'])(
    'leaves manual %s tasks in wizard mode',
    async status => {
      create({ id: 'manual', status, restartType: 'system' })
      await vi.advanceTimersByTimeAsync(9000)
      expect(patchInstallApi.getTask).not.toHaveBeenCalled()
      expect(patchInstallApi.getRestartOptions).not.toHaveBeenCalled()
      expect(findButton('确认重启策略')).toBeUndefined()
      expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
    }
  )
  it('restores a running task after reload and prompts at its later restart stop', async () => {
    const running = { id: 'reload', status: 'INSTALLING' }
    patchInstallApi.runTask.mockResolvedValue({ data: running })
    patchInstallApi.getTask.mockResolvedValue({ data: running })
    patchInstallApi.getRestartOptions.mockResolvedValue({ data: { restartType: 'system' } })
    create({ id: 'reload', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await flushPromises()
    wrapper.unmount()
    // 模拟页面刷新：内存丢失，同一标签页的会话存储仍保留。
    autoRunTaskIds.clear()
    create(running)
    await flushPromises()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([true])
    const installed = { ...running, status: 'INSTALL_DONE', restartType: 'system' }
    patchInstallApi.getTask.mockResolvedValue({ data: installed })
    await wrapper.setProps({ task: installed })
    await vi.advanceTimersByTimeAsync(3000)
    expect(findButton('确认重启策略')).toBeDefined()
    expect(wrapper.find('[data-dialog]').exists()).toBe(true)
    expect(patchInstallApi.runTask).toHaveBeenCalledTimes(1)
  })
  it.each(['COMPLETED', 'CANCELLED'])(
    'clears persisted mode when a task becomes %s',
    async status => {
      const running = { id: 'finished', status: 'INSTALLING' }
      rememberAutoRunTask(running.id)
      patchInstallApi.getTask.mockResolvedValue({ data: running })
      create(running)
      await flushPromises()
      await wrapper.setProps({ task: { ...running, status } })
      autoRunTaskIds.clear()
      expect(isAutoRunTask(running)).toBe(false)
      const calls = patchInstallApi.getTask.mock.calls.length
      await vi.advanceTimersByTimeAsync(9000)
      expect(patchInstallApi.getTask).toHaveBeenCalledTimes(calls)
      expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
    }
  )
  it('does not remember a task when starting one-click execution fails', async () => {
    const task = { id: 'rejected', status: 'CREATED' }
    patchInstallApi.runTask.mockRejectedValue(new Error('下发失败'))
    create(task)
    await findButton('一键执行').trigger('click')
    await flushPromises()
    expect(isAutoRunTask(task)).toBe(false)
  })
  it('allows declining restart and resumes automatic validation', async () => {
    autoRunTaskIds.add('t2')
    patchInstallApi.getTask.mockResolvedValue({
      data: { id: 't2', status: 'ROLLBACK_DONE', restartType: 'system' }
    })
    patchInstallApi.getRestartOptions.mockResolvedValue({ data: { restartType: 'system' } })
    patchInstallApi.confirmRestart.mockResolvedValue({ data: { id: 't2', status: 'VALIDATING' } })
    create({ id: 't2', status: 'ROLLBACK_DONE', restartType: 'system' })
    await flushPromises()
    await findButton('不重启，继续校验').trigger('click')
    await flushPromises()
    expect(patchInstallApi.confirmRestart).toHaveBeenCalledWith('t2', false, undefined)
    expect(patchInstallApi.executeRestart).not.toHaveBeenCalled()
  })

  it('blocks duplicate starts and manual step actions while the start request is pending', async () => {
    let finish
    patchInstallApi.runTask.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    create({ id: 'pending', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    expect(wrapper.emitted('active-change').at(-1)).toEqual([true])
    await findButton('一键执行').trigger('click')
    expect(patchInstallApi.runTask).toHaveBeenCalledTimes(1)
    finish({ data: { id: 'pending', status: 'PRE_CHECK_DONE' } })
    await flushPromises()
    expect(findButton('一键执行')).toBeUndefined()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([true])
  })

  it('stops on execution failure and allows a deliberate retry', async () => {
    patchInstallApi.runTask.mockResolvedValue({ data: { id: 'retry', status: 'INSTALLING' } })
    patchInstallApi.getTask.mockResolvedValue({
      data: { id: 'retry', status: 'INSTALL_FAILED', errorMessage: '执行失败' }
    })
    create({ id: 'retry', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(12000)
    expect(patchInstallApi.getTask).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
    expect(findButton('一键执行')).toBeDefined()
    await findButton('一键执行').trigger('click')
    await flushPromises()
    expect(patchInstallApi.runTask).toHaveBeenCalledTimes(2)
  })

  it('pauses after a query error and continues with GET rather than another start', async () => {
    rememberAutoRunTask('query-error')
    patchInstallApi.getTask.mockRejectedValueOnce(new Error('network unavailable'))
    create({ id: 'query-error', status: 'INSTALLING' })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(9000)
    expect(patchInstallApi.getTask).toHaveBeenCalledTimes(1)
    patchInstallApi.getTask.mockResolvedValue({ data: { id: 'query-error', status: 'COMPLETED' } })
    await findButton('继续查询').trigger('click')
    await flushPromises()
    expect(patchInstallApi.runTask).not.toHaveBeenCalled()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
  })

  it('does not prompt or execute restart when the task needs none', async () => {
    rememberAutoRunTask('no-restart')
    patchInstallApi.getTask.mockResolvedValue({
      data: { id: 'no-restart', status: 'INSTALL_DONE', restartType: 'none' }
    })
    create({ id: 'no-restart', status: 'INSTALLING' })
    await flushPromises()
    expect(patchInstallApi.getRestartOptions).not.toHaveBeenCalled()
    expect(findButton('确认重启策略')).toBeUndefined()
    expect(patchInstallApi.executeRestart).not.toHaveBeenCalled()
    patchInstallApi.getTask.mockResolvedValue({ data: { id: 'no-restart', status: 'COMPLETED' } })
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
  })

  it('ignores old task responses after switching tasks and still remembers accepted starts', async () => {
    let finish
    patchInstallApi.runTask.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    create({ id: 'old', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await wrapper.setProps({ task: { id: 'new', status: 'CREATED' } })
    finish({ data: { id: 'old', status: 'INSTALLING' } })
    await flushPromises()
    expect(isAutoRunTask({ id: 'old' })).toBe(true)
    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([false])
    expect(findButton('一键执行')).toBeDefined()
  })

  it('shares a pending start across closing and reopening the same task', async () => {
    let finish
    patchInstallApi.runTask.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    create({ id: 'reopen', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await flushPromises()
    await wrapper.setProps({ enabled: false })
    await wrapper.setProps({ enabled: true })
    await findButton('一键执行').trigger('click')
    expect(patchInstallApi.runTask).toHaveBeenCalledTimes(1)
    finish({ data: { id: 'reopen', status: 'INSTALLING' } })
    await flushPromises()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([true])
    expect(wrapper.emitted('updated').at(-1)[0].status).toBe('INSTALLING')
  })

  it('keeps the latest status instead of reverting to a delayed audit snapshot', async () => {
    patchInstallApi.runTask.mockResolvedValue({ data: { id: 'fresh', status: 'INSTALLING' } })
    create({ id: 'fresh', status: 'CREATED' })
    await findButton('一键执行').trigger('click')
    await flushPromises()
    await wrapper.setProps({ task: { id: 'fresh', status: 'CREATED' } })
    expect(findButton('一键执行')).toBeUndefined()
    expect(wrapper.emitted('active-change').at(-1)).toEqual([true])
  })
})
