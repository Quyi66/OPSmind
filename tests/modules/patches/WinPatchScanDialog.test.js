import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import WinPatchScanDialog from '@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue'
import DeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const api = vi.hoisted(() => ({ hostInfo: vi.fn(), scan: vi.fn(), track: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({ agentApi: { getHostAgentInfo: api.hostInfo } }))
vi.mock('@/modules/patches/windows-patch/api', () => ({
  winPatchApi: { createScanTask: api.scan }
}))
vi.mock('@/modules/patches/composables/usePatchScanCompletion', () => ({
  usePatchScanCompletion: () => ({ trackScan: api.track })
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { props: ['visible', 'runId'], template: '<div />' }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock(
  '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue',
  () => ({
    default: {
      props: [
        'modelValue',
        'ciTypes',
        'initialSelection',
        'title',
        'description',
        'confirmText',
        'submitting',
        'confirmDisabled'
      ],
      emits: ['update:modelValue', 'confirm', 'selection-change'],
      template: `<section v-if="modelValue">
      <h2>{{ title }}</h2><p>{{ description }}</p>
      <span v-for="item in initialSelection" :key="item.key">{{ item.value }}</span>
      <slot name="context" />
      <button :disabled="submitting" @click="$emit('update:modelValue', false)">取消</button>
      <button :disabled="submitting || confirmDisabled || !initialSelection.length" @click="$emit('confirm', initialSelection)">{{ confirmText }}</button>
    </section>`
    }
  })
)

const hosts = [
  { hostId: 'asset/windows-a', hostKey: '192.168.1.218' },
  { host_id: 'asset/windows-b', host_key: '192.168.1.93' }
]
let wrapper
const selector = () => wrapper.findComponent(DeviceSelector)
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open(props = {}) {
  wrapper = mount(WinPatchScanDialog, {
    props: { modelValue: true, preselectedHosts: hosts, ...props },
    global: {
      stubs: {
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}</div>' }
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  api.hostInfo.mockImplementation(async ids =>
    ids.map(hostId => ({ hostId, connectionType: 'ssh' }))
  )
  api.scan.mockResolvedValue({ data: { runId: 'windows/run-1' } })
})
afterEach(() => wrapper?.unmount())

describe('Windows patch scan dialog', () => {
  it('opens the Windows selector with preselected IPs and original asset IDs', async () => {
    await open()
    expect(selector().props()).toMatchObject({
      title: '选择设备 · Windows 补丁扫描',
      ciTypes: 'windows',
      initialSelection: [
        { key: 'asset/windows-a', value: '192.168.1.218', assetType: 'windows' },
        { key: 'asset/windows-b', value: '192.168.1.93', assetType: 'windows' }
      ]
    })
    expect(selector().text()).toContain('192.168.1.218')
    expect(selector().text()).not.toContain('asset/windows-a')
    expect(button('提交扫描任务').element.disabled).toBe(false)
    expect(api.scan).not.toHaveBeenCalled()
  })

  it('cancels without submitting and resets preselection on reopening', async () => {
    await open()
    await button('取消').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(api.scan).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, preselectedHosts: [hosts[1]] })
    await flushPromises()
    expect(selector().props('initialSelection')).toEqual([
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
    'submits capable %s assets and observes completion independently',
    async connectionType => {
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
      expect(api.track).toHaveBeenCalledExactlyOnceWith('windows/run-1')
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(wrapper.emitted('submitted')).toEqual([
        [{ runId: 'windows/run-1', refreshOverview: true, openDetail: false }]
      ])
      expect(selector().props('submitting')).toBe(false)
    }
  )

  it('keeps selected IPs and backend errors when submission fails', async () => {
    api.scan.mockRejectedValueOnce({ response: { data: { message: '主机已离线，请重试' } } })
    await open()
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('主机已离线，请重试')
    expect(selector().text()).toContain('192.168.1.218')
    expect(button('提交扫描任务').element.disabled).toBe(false)
    expect(wrapper.emitted('submitted')).toBeUndefined()
    expect(api.track).not.toHaveBeenCalled()
  })

  it.each(['offline', 'missing-capability', 'unavailable'])(
    'blocks an Agent with %s and shows the reason',
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

  it('checks newly selected Agent devices before allowing submission', async () => {
    await open({ preselectedHosts: [] })
    api.hostInfo.mockImplementation(async ids =>
      ids.map(hostId => ({
        hostId,
        connectionType: 'koreops_agent',
        agentStatus: 'offline',
        capabilities: ['scan']
      }))
    )
    selector().vm.$emit('selection-change', [
      { key: 'new-agent', value: '192.0.2.1', connectionType: 'koreops_agent' }
    ])
    await flushPromises()
    expect(selector().props('confirmDisabled')).toBe(true)
    expect(wrapper.text()).toContain('离线')
    expect(api.scan).not.toHaveBeenCalled()
  })

  it('refreshes capabilities at submission and blocks a newly offline Agent', async () => {
    await open()
    api.hostInfo.mockImplementation(async ids =>
      ids.map(hostId => ({
        hostId,
        connectionType: 'koreops_agent',
        agentStatus: 'offline'
      }))
    )
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(api.scan).not.toHaveBeenCalled()
    expect(button('提交扫描任务').element.disabled).toBe(true)
  })

  it('treats a response without run ID as submitted', async () => {
    api.scan.mockResolvedValueOnce({ data: { _status: 'ok' } })
    await open()
    await button('提交扫描任务').trigger('click')
    await flushPromises()
    expect(api.track).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith(
      '扫描任务已提交，请稍后刷新主机列表查看结果'
    )
    expect(wrapper.emitted('submitted')[0][0].refreshOverview).toBe(true)
  })

  it('ignores previous responses after closing and reopening', async () => {
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
    expect(api.track).not.toHaveBeenCalled()
    expect(wrapper.emitted('submitted')).toBeUndefined()
    expect(selector().props('initialSelection')[0].value).toBe('192.168.1.93')
    expect(button('提交扫描任务').element.disabled).toBe(false)
  })
})
