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
      '安装失败（1）',
      '未下发（无可更新包）（0）'
    ])
    expect(wrapper.text()).toContain('失败主机共 1 台（去重）')
    expect(wrapper.text()).toContain('SSH 不可达')
    expect(wrapper.text()).toContain('软件包安装失败')
    expect(wrapper.find('[data-column="hostId"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('h1')
    expect(wrapper.text()).not.toContain('task-1')
  })

  it.each([{ failedHostIds: ['h1', 'h2'] }, { failedHostIds: undefined }])(
    'displays skipped hosts without including them in the failure count ($failedHostIds)',
    async ({ failedHostIds }) => {
      const preCheckReason = '未返回检查结果：主机无法连通……'
      const installReason = '未返回安装结果：所在执行机批次没有产出结果……'
      const skippedReason = '该主机扫描结果中没有本次清单里的可更新包，未下发'
      api.getFailedHosts.mockResolvedValue({
        data: {
          preCheckFailed: [{ hostId: 'h1', hostKey: '192.168.1.1', reason: preCheckReason }],
          installFailed: [
            { hostId: 'h1', hostKey: '192.168.1.1', reason: installReason },
            { hostId: 'h2', hostKey: '192.168.1.2', reason: installReason }
          ],
          skipped: [{ hostId: 'h3', hostKey: '192.168.1.94', reason: skippedReason }],
          failedHostIds
        }
      })
      const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'task-1' })
      await flushPromises()

      expect(wrapper.text()).toContain('失败主机共 2 台（去重）')
      expect(wrapper.text()).toContain(preCheckReason)
      expect(wrapper.text()).toContain(installReason)
      const skippedGroup = wrapper.findAll('section')[2]
      expect(skippedGroup.find('h3').text()).toBe('未下发（无可更新包）（1）')
      expect(skippedGroup.text()).toContain('192.168.1.94')
      expect(skippedGroup.text()).toContain(skippedReason)
      expect(skippedGroup.find('[data-column="reason"]').text()).toContain('未下发原因')
      expect(skippedGroup.text()).not.toContain('失败原因')
    }
  )

  it.each([{ failedHostIds: [] }, { failedHostIds: undefined }])(
    'counts no failures when all hosts are skipped ($failedHostIds)',
    async ({ failedHostIds }) => {
      api.getFailedHosts.mockResolvedValue({
        data: {
          skipped: [{ hostId: 'h1', hostKey: '192.168.1.94', reason: '没有可更新包' }],
          failedHostIds
        }
      })
      const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'task-1' })
      await flushPromises()

      expect(wrapper.text()).toContain('失败主机共 0 台（去重）')
      expect(wrapper.text()).toContain('未下发（无可更新包）（1）')
    }
  )

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
