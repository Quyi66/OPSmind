import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import WinPatchScanDialog from '@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue'
import DeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const api = vi.hoisted(() => ({
  hostInfo: vi.fn(),
  scan: vi.fn(),
  poll: vi.fn(),
  stop: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({ agentApi: { getHostAgentInfo: api.hostInfo } }))
vi.mock('@/modules/patches/windows-patch/api', () => ({
  winPatchApi: { createScanTask: api.scan }
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: api.poll, stopPolling: api.stop })
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: {
    props: ['modelValue', 'ciTypes', 'options', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<div><span v-for="item in modelValue" :key="item.key">{{ item.value || item.key }}</span></div>'
  }
}))

const hosts = [
  { hostId: 'asset/windows-a', hostKey: '192.168.1.218' },
  { host_id: 'asset/windows-b', host_key: '192.168.1.93' }
]
const Layer = {
  props: ['modelValue', 'title', 'width'],
  emits: ['update:modelValue'],
  template:
    '<section v-if="modelValue"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>'
}
const Slot = { template: '<div><slot /></div>' }
let wrapper
const selector = () => wrapper.findComponent(DeviceSelector)
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open(props = {}) {
  wrapper = mount(WinPatchScanDialog, {
    props: { modelValue: true, preselectedHosts: hosts, ...props },
    global: {
      stubs: {
        'el-dialog': Layer,
        'el-form': Slot,
        'el-form-item': { props: ['label'], template: '<div>{{ label }}<slot /></div>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}</div>' },
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        }
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  api.hostInfo.mockImplementation(async hostIds =>
    hostIds.map(hostId => ({ hostId, connectionType: 'ssh' }))
  )
  api.scan.mockResolvedValue({ data: { runId: 'windows/run-1' } })
})
afterEach(() => wrapper?.unmount())

describe('Windows patch scan dialog', () => {
  it('uses the Windows form and displays preselected IPs while preserving asset IDs', async () => {
    await open()
    expect(wrapper.findComponent(Layer).props()).toMatchObject({
      title: '创建扫描任务',
      width: '760px'
    })
    expect(wrapper.text()).toContain('选择主机')
    expect(wrapper.text()).toContain('选择 Windows 主机并提交补丁扫描任务')
    expect(wrapper.text()).not.toContain('可混选 Linux')
    expect(selector().props()).toMatchObject({
      ciTypes: 'windows',
      modelValue: [
        { key: 'asset/windows-a', value: '192.168.1.218', assetType: 'windows' },
        { key: 'asset/windows-b', value: '192.168.1.93', assetType: 'windows' }
      ]
    })
    expect(selector().text()).toContain('192.168.1.218')
    expect(selector().text()).not.toContain('asset/windows-a')
    expect(button('取消').exists()).toBe(true)
    expect(button('提交扫描任务').element.disabled).toBe(false)
    expect(api.scan).not.toHaveBeenCalled()
  })

  it('allows cancelling without submitting and resets preselection on reopening', async () => {
    await open()
    await button('取消').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(api.scan).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, preselectedHosts: [hosts[1]] })
    await flushPromises()
    expect(selector().props('modelValue')).toEqual([
      { key: 'asset/windows-b', value: '192.168.1.93', assetType: 'windows' }
    ])
  })

  it('disables submission without selected assets', async () => {
    await open({ preselectedHosts: [] })
    expect(button('提交扫描任务').element.disabled).toBe(true)
    expect(api.hostInfo).not.toHaveBeenCalled()
    expect(api.scan).not.toHaveBeenCalled()
  })

  it.each(['ssh', 'koreops_agent'])(
    'submits %s asset IDs and polls the Windows run before refreshing',
    async connectionType => {
      if (connectionType === 'ssh')
        api.hostInfo.mockRejectedValue(new Error('Agent 信息服务不可用'))
      else
        api.hostInfo.mockImplementation(async ids =>
          ids.map(hostId => ({
            hostId,
            connectionType,
            agentStatus: 'online',
            capabilities: ['scan']
          }))
        )
      await open({ preselectedHosts: hosts.map(host => ({ ...host, connectionType })) })
      await button('提交扫描任务').trigger('click')
      await flushPromises()
      expect(api.scan).toHaveBeenCalledExactlyOnceWith(['asset/windows-a', 'asset/windows-b'])
      if (connectionType === 'ssh') expect(api.hostInfo).not.toHaveBeenCalled()
      else expect(api.hostInfo).toHaveBeenCalled()
      expect(api.poll).toHaveBeenCalledWith(
        'windows/run-1',
        expect.objectContaining({
          showMessage: false,
          interval: 5000,
          maxAttempts: 120
        })
      )
      expect(selector().props('disabled')).toBe(true)
      expect(button('扫描中…').element.disabled).toBe(true)
      expect(button('取消').element.disabled).toBe(true)
      expect(wrapper.emitted('submitted')).toBeUndefined()
      api.poll.mock.calls[0][1].onSuccess()
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(wrapper.emitted('submitted')).toEqual([
        [{ runId: 'windows/run-1', refreshOverview: true }]
      ])
      expect(ElMessage.success).toHaveBeenLastCalledWith('扫描作业已完成，正在刷新主机列表')
    }
  )

  it('keeps the selected IPs and backend error when scan submission fails', async () => {
    api.scan.mockRejectedValueOnce({
      response: { data: { errorCode: 'AGENT_OFFLINE', message: '主机已离线，请重试' } }
    })
    await open()
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('主机已离线，请重试')
    expect(selector().text()).toContain('192.168.1.218')
    expect(button('提交扫描任务').element.disabled).toBe(false)
    expect(wrapper.emitted('submitted')).toBeUndefined()
    expect(api.poll).not.toHaveBeenCalled()
  })

  it.each(['offline', 'missing-capability', 'unavailable'])(
    'blocks the whole batch for an Agent with %s and shows the reason',
    async kind => {
      const agents = hosts.map(host => ({ ...host, connectionType: 'koreops_agent' }))
      if (kind === 'unavailable') api.hostInfo.mockRejectedValue(new Error('状态查询失败'))
      else
        api.hostInfo.mockImplementation(async ids =>
          ids.map((hostId, index) => ({
            hostId,
            connectionType: 'koreops_agent',
            agentStatus: index === 0 && kind === 'offline' ? 'offline' : 'online',
            capabilities: index === 0 && kind === 'missing-capability' ? ['patch'] : ['scan']
          }))
        )
      await open({ preselectedHosts: agents })
      expect(button('提交扫描任务').element.disabled).toBe(true)
      expect(wrapper.text()).toContain(
        kind === 'unavailable' ? '可执行 0 台 / 不可执行 2 台' : '可执行 1 台 / 不可执行 1 台'
      )
      expect(wrapper.text()).toContain(
        kind === 'offline' ? '离线' : kind === 'unavailable' ? '无法读取' : '[scan]'
      )
      expect(api.scan).not.toHaveBeenCalled()
    }
  )

  it('refreshes capability at submit so a newly offline Agent is not submitted', async () => {
    await open()
    api.hostInfo.mockImplementation(async ids =>
      ids.map(hostId => ({ hostId, connectionType: 'koreops_agent', agentStatus: 'offline' }))
    )
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(api.scan).not.toHaveBeenCalled()
    expect(button('提交扫描任务').element.disabled).toBe(true)
  })

  it.each(['error', 'timeout'])(
    'refreshes after a polling %s without reporting execution success',
    async outcome => {
      await open()
      await button('提交扫描任务').trigger('click')
      await flushPromises()
      const callbacks = api.poll.mock.calls[0][1]
      if (outcome === 'error') callbacks.onError({ error: 'WUA 扫描失败' })
      else callbacks.onTimeout()
      expect(ElMessage.success).not.toHaveBeenCalledWith('扫描作业已完成，正在刷新主机列表')
      expect(wrapper.emitted('submitted')[0][0].refreshOverview).toBe(true)
      if (outcome === 'error') expect(ElMessage.error).toHaveBeenCalledWith('WUA 扫描失败')
      else expect(ElMessage.warning).toHaveBeenCalledWith(expect.stringContaining('超时'))
    }
  )

  it('treats a response without a run ID as submitted and does not claim execution success', async () => {
    api.scan.mockResolvedValueOnce({ data: { _status: 'ok' } })
    await open()
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(api.poll).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith(
      '扫描任务已提交，请稍后刷新主机列表查看结果'
    )
    expect(wrapper.emitted('submitted')[0][0].refreshOverview).toBe(true)
  })

  it('ignores a previous scan response after closing and reopening the form', async () => {
    let resolveScan
    api.scan.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveScan = resolve
        })
    )
    await open()
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, preselectedHosts: [hosts[1]] })
    await flushPromises()
    resolveScan({ data: { runId: 'old-run' } })
    await flushPromises()
    expect(api.poll).not.toHaveBeenCalled()
    expect(wrapper.emitted('submitted')).toBeUndefined()
    expect(selector().props('modelValue')[0].value).toBe('192.168.1.93')
    expect(button('提交扫描任务').element.disabled).toBe(false)
  })
})
