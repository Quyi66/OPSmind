import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import Enrollment from '@/modules/asset/components/asset-info/AgentEnrollmentDialog.vue'
import Install from '@/modules/asset/components/asset-info/AgentInstallDialog.vue'
import { validateAgentCapability } from '@/modules/patches/utils/agentCapability'

const api = vi.hoisted(() => ({
  createEnrollmentToken: vi.fn(),
  getPendingAgents: vi.fn(),
  bindAgent: vi.fn(),
  getHostAgentInfo: vi.fn(),
  installAgent: vi.fn(),
  revokeEnrollmentToken: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({
  agentApi: api,
  automationApi: { getInstanceGroupList: vi.fn().mockResolvedValue([]) },
  getAgentErrorMessage: error => error?.message || '失败'
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

const wrappers = []
const token = {
  id: 'token-1',
  status: 'active',
  remainingUses: null,
  targetOs: 'linux',
  installCommand: 'server-command'
}
const state = wrapper => wrapper.vm.$.setupState
async function open(component, props = {}) {
  const wrapper = shallowMount(component, { props: { modelValue: false, ...props } })
  wrappers.push(wrapper)
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  api.createEnrollmentToken.mockImplementation(async payload => ({
    ...token,
    targetOs: payload.targetOs
  }))
  api.getPendingAgents.mockResolvedValue({ agents: [] })
  api.bindAgent.mockResolvedValue({ hostId: 'bound-host', hostCreated: true })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
})

describe('latest Agent documents audit', () => {
  it('预绑定凭证按 Windows 资产使用一次性凭证', async () => {
    const wrapper = await open(Enrollment, { initialAsset: { id: 'win-host', ciType: 'windows' } })
    await state(wrapper).generateToken()
    expect(api.createEnrollmentToken).toHaveBeenCalledWith(
      expect.objectContaining({ hostId: 'win-host', targetOs: 'windows', maxUses: 1 })
    )
    expect(state(wrapper).installCommand).toBe('server-command')
  })

  it('已有命令切换操作系统后应按清单2.1重新签发凭证', async () => {
    const wrapper = await open(Enrollment)
    await state(wrapper).generateToken()
    state(wrapper).tokenForm.targetOs = 'windows'
    state(wrapper).handleTargetOsChange()
    await flushPromises()
    expect(api.createEnrollmentToken).toHaveBeenCalledTimes(2)
    expect(state(wrapper).installCommand).toBe('server-command')
  })

  it('没有候选资产时默认新建并可提交空 newHost', async () => {
    const wrapper = await open(Enrollment, { mode: 'pending' })
    state(wrapper).selectClient({
      clientId: 'client-1',
      agentStatus: 'online',
      hostname: 'host',
      ip: '192.0.2.1',
      matchedHosts: []
    })
    expect(state(wrapper).assetMode).toBe('new')
    await state(wrapper).submitBind()
    expect(api.bindAgent).toHaveBeenCalledWith({ clientId: 'client-1', mode: 'local', newHost: {} })
    expect(wrapper.emitted('success')).toEqual([['bound-host']])
  })

  it('跳板新建资产只填 targetIp 时应允许按接口2.4提交', async () => {
    const wrapper = await open(Enrollment, { mode: 'pending' })
    state(wrapper).bindMode = 'gateway'
    state(wrapper).gatewayInfo = { agentClientId: 'gateway-client', agentStatus: 'online' }
    state(wrapper).targetIp = '10.0.0.5'
    await state(wrapper).submitBind()
    expect(api.bindAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'gateway-client',
        mode: 'gateway',
        targetIp: '10.0.0.5',
        newHost: expect.any(Object)
      })
    )
  })

  it('凭证用尽后停止 pending 轮询', async () => {
    vi.useFakeTimers()
    const wrapper = await open(Enrollment)
    await state(wrapper).generateToken()
    api.getPendingAgents.mockResolvedValue({
      token: { id: 'token-1', status: 'exhausted', remainingUses: 0 },
      agents: []
    })
    state(wrapper).page = 'pending'
    await flushPromises()
    await vi.advanceTimersByTimeAsync(12000)
    expect(api.getPendingAgents).toHaveBeenCalledTimes(1)
    expect(state(wrapper).tokenUsable).toBe(false)
  })

  it('Agent 推装显示跳过原因并在上线后标记成功', async () => {
    api.installAgent.mockResolvedValue({
      runId: 'install-run',
      submitted: ['linux-host'],
      skipped: { 'win-host': '已绑定 Agent' }
    })
    api.getHostAgentInfo.mockResolvedValue([
      { hostId: 'linux-host', connectionType: 'koreops_agent', agentStatus: 'online' }
    ])
    const wrapper = await open(Install, {
      hosts: [
        { id: 'linux-host', hostname: 'linux' },
        { id: 'win-host', hostname: 'windows' }
      ]
    })
    await state(wrapper).install()
    expect(api.installAgent).toHaveBeenCalledWith(['linux-host', 'win-host'])
    expect(state(wrapper).rows.map(row => row.message)).toEqual([
      '安装成功，Agent 已在线',
      '已绑定 Agent'
    ])
    expect(state(wrapper).runId).toBe('install-run')
    expect(wrapper.emitted('updated')).toHaveLength(1)
  })

  it('离线 Agent 应按接口2.6禁止 patch 操作', () => {
    expect(
      validateAgentCapability(
        [
          {
            hostId: 'offline',
            connectionType: 'koreops_agent',
            agentStatus: 'offline',
            capabilities: ['patch']
          }
        ],
        'patch'
      )
    ).toBe(false)
  })
})
