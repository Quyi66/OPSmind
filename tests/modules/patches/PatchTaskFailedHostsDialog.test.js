import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import PatchTaskFailedHostsDialog from '@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import { hostDialogTestOptions, deferred } from './helpers/hostDialogTestUtils'

const api = vi.hoisted(() => ({ getFailedHosts: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: { getFailedHosts: api.getFailedHosts }
}))

const wrappers = []
function mount(component, props) {
  const wrapper = shallowMount(component, { props, global: hostDialogTestOptions })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  api.getFailedHosts.mockReset()
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

describe('安装任务失败主机', () => {
  it('does not fetch a closed dialog and displays separate failure groups with a unique count', async () => {
    const preCheckFailed = [{ hostId: 'h1', hostKey: '192.168.1.1', reason: 'SSH 不可达' }]
    const installFailed = [{ hostId: 'h1', hostKey: '192.168.1.1', reason: '软件包安装失败' }]
    api.getFailedHosts.mockResolvedValue({
      data: { preCheckFailed, installFailed, failedHostIds: ['h1'] }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { taskId: 'task-1' })
    expect(api.getFailedHosts).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(api.getFailedHosts).toHaveBeenCalledWith('task-1')
    expect(wrapper.findAll('h3').map(item => item.text())).toEqual([
      '预检失败（1）',
      '安装失败（1）'
    ])
    expect(wrapper.text()).toContain('失败主机共 1 台（去重）')
    expect(wrapper.text()).toContain('SSH 不可达')
    expect(wrapper.text()).toContain('软件包安装失败')
    expect(wrapper.find('[data-column="hostId"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('h1')
    expect(wrapper.text()).not.toContain('task-1')
  })

  it('shows a 404 message and can refresh to recover', async () => {
    api.getFailedHosts.mockRejectedValueOnce({ response: { status: 404 } })
    api.getFailedHosts.mockResolvedValue({
      data: { preCheckFailed: [], installFailed: [], failedHostIds: [] }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'missing' })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('任务不存在或已删除')
    const refresh = wrapper
      .findAllComponents({ name: 'ElButton' })
      .find(button => button.text() === '刷新')
    refresh.vm.$emit('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无失败主机')
  })

  it('ignores a response for the previously selected task', async () => {
    const oldRequest = deferred()
    api.getFailedHosts.mockReturnValueOnce(oldRequest.promise)
    api.getFailedHosts.mockResolvedValue({
      data: {
        preCheckFailed: [],
        installFailed: [{ hostId: 'new-host', reason: '新的失败原因' }],
        failedHostIds: ['new-host']
      }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'old-task' })
    await wrapper.setProps({ taskId: 'new-task' })
    await flushPromises()
    oldRequest.resolve({
      data: { preCheckFailed: [{ hostId: 'old-host', reason: '旧的失败原因' }] }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('新的失败原因')
    expect(wrapper.text()).not.toContain('new-host')
    expect(wrapper.text()).not.toContain('旧的失败原因')
  })
})
