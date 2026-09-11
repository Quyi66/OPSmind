import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import WinPatchTaskDetailDrawer from '@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue'
import { winPatchApi } from '@/modules/patches/windows-patch/api'

vi.mock('@/modules/patches/windows-patch/api', () => ({
  winPatchApi: { getTaskDetail: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/patch-task/PatchTaskRunControls.vue', () => ({
  default: {
    name: 'PatchTaskRunControls',
    props: ['task', 'enabled', 'disabled'],
    emits: ['updated', 'active-change'],
    template: '<div />'
  }
}))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchTaskScriptUploader.vue', () => ({
  default: { template: '<div />' }
}))

let wrapper
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('Windows one-click task detail', () => {
  it('refreshes host results and audit data during execution and at completion', async () => {
    const task = { id: 'win-task', taskType: 'install', status: 'CREATED' }
    winPatchApi.getTaskDetail.mockResolvedValue({ data: { task, hosts: [], steps: [], logs: [] } })
    wrapper = shallowMount(WinPatchTaskDetailDrawer, {
      props: { modelValue: true, taskId: task.id },
      global: {
        stubs: {
          'el-dialog': { template: '<div><slot /></div>' },
          'el-table': { name: 'TestHostTable', props: ['data'], template: '<div />' },
          'el-descriptions': true,
          'el-switch': true
        }
      }
    })
    await flushPromises()
    const controls = wrapper.findComponent({ name: 'PatchTaskRunControls' })
    controls.vm.$emit('active-change', true)

    for (const status of ['INSTALLING', 'INSTALL_FAILED', 'COMPLETED']) {
      const hosts = [
        { hostKey: 'win-host', status, errorMessage: status === 'INSTALL_FAILED' ? '安装失败' : '' }
      ]
      const steps = [{ step: 'INSTALL', status: status === 'COMPLETED' ? 'SUCCESS' : 'RUNNING' }]
      const logs = [{ step: 'INSTALL', status }]
      // 审计返回旧任务状态时，仍应保留一键轮询的最新快照。
      winPatchApi.getTaskDetail.mockResolvedValue({ data: { task, hosts, steps, logs } })
      controls.vm.$emit('updated', { ...task, status })
      if (status === 'COMPLETED') controls.vm.$emit('active-change', false)
      await flushPromises()
      expect(controls.props('task').status).toBe(status)
      expect(controls.props('task').steps).toEqual(steps)
      expect(controls.props('task').logs).toEqual(logs)
      expect(wrapper.findComponent({ name: 'TestHostTable' }).props('data')).toEqual(hosts)
    }
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(4)
    await vi.advanceTimersByTimeAsync(9000)
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(4)
  })
})
