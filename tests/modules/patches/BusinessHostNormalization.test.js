import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import {
  resolveAgentCapabilityHosts,
  validateAgentCapability,
  getAgentCapabilityIssues,
  formatAgentCapabilitySummary
} from '@/modules/patches/utils/agentCapability'
import { useAgentCapabilitySelection } from '@/modules/patches/composables/useAgentCapabilitySelection'
const hostInfo = vi.hoisted(() => vi.fn())
vi.mock('@/modules/asset/api', () => ({ agentApi: { getHostAgentInfo: hostInfo } }))
vi.mock('element-plus', () => ({ ElMessage: { warning: vi.fn() } }))
let scope
beforeEach(() => {
  vi.resetAllMocks()
  hostInfo.mockRejectedValue(new Error('Agent 信息服务不可用'))
  scope = effectScope()
})
afterEach(() => scope.stop())

describe('补丁任务的 Agent 能力校验', () => {
  it('SSH 主机不查询 Agent 信息；未知通道查询失败仍保留原主机和输入', async () => {
    const ssh = Object.freeze({ hostId: 'ssh', connectionType: 'ssh' })
    expect(await resolveAgentCapabilityHosts([ssh])).toEqual([ssh])
    expect(hostInfo).not.toHaveBeenCalled()
    const result = await resolveAgentCapabilityHosts([
      { affectedHosts: [{ hostId: 'unknown' }] },
      '192.0.2.3'
    ])
    expect(result).toEqual([{ hostId: 'unknown' }, { value: '192.0.2.3' }])
    expect(validateAgentCapability(result, 'patch')).toBe(true)
  })
  it('只阻止已确认的 Agent 在状态查询失败时提交，不修改原主机对象', async () => {
    const host = Object.freeze({
      hostId: 'agent',
      connectionType: 'koreops_agent',
      agentStatus: 'online',
      capabilities: ['patch']
    })
    const result = await resolveAgentCapabilityHosts([host])
    expect(result[0]).toMatchObject({ ...host, agentInfoUnavailable: true })
    expect(host.agentInfoUnavailable).toBeUndefined()
    expect(validateAgentCapability(result, 'patch')).toBe(false)
    expect(ElMessage.warning).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('无法读取 Agent 实时状态') })
    )
  })
  it('保留 ID 和目标顺序，识别离线和缺失能力，IP 不一致仍可执行', async () => {
    hostInfo.mockResolvedValue([
      {
        hostId: 'offline',
        connectionType: 'koreops_agent',
        agentStatus: 'offline',
        capabilities: ['patch']
      },
      {
        hostId: 'limited',
        connectionType: 'koreops_agent',
        agentStatus: 'online',
        capabilities: ['scan']
      },
      {
        hostId: 'online',
        connectionType: 'koreops_agent',
        agentStatus: 'online',
        capabilities: ['patch'],
        cmdbIp: '192.0.2.1',
        agentIp: '192.0.2.9'
      }
    ])
    const result = await resolveAgentCapabilityHosts(
      ['offline', 'limited', 'online'].map(hostId => ({ hostId }))
    )
    expect(result.map(h => h.hostId)).toEqual(['offline', 'limited', 'online'])
    const issues = getAgentCapabilityIssues(result, 'patch')
    expect(issues).toHaveLength(2)
    expect(issues[0].reason).toContain('离线')
    expect(issues[1].reason).toContain('[patch]')
    expect(formatAgentCapabilitySummary(result, issues)).toContain('可执行 1 台 / 不可执行 2 台')
    expect(validateAgentCapability([result[2]], 'patch')).toBe(true)
  })
  it('一个查询批次失败不会抹掉另一个批次已经识别的 Agent', async () => {
    hostInfo.mockResolvedValueOnce([
      { hostId: 'h0', connectionType: 'koreops_agent', agentStatus: 'offline' }
    ])
    const result = await resolveAgentCapabilityHosts(
      Array.from({ length: 101 }, (_, i) => ({ hostId: `h${i}` }))
    )
    expect(hostInfo).toHaveBeenCalledTimes(2)
    expect(getAgentCapabilityIssues(result, 'scan')).toHaveLength(1)
    expect(result.map(h => h.hostId)).toHaveLength(101)
  })
  it('选择变化和关闭窗口后忽略旧查询', async () => {
    const pending = []
    hostInfo.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const hosts = ref([{ hostId: 'old' }])
    const enabled = ref(true)
    let state
    scope.run(() => {
      state = useAgentCapabilitySelection(hosts, 'scan', enabled)
    })
    hosts.value = [{ hostId: 'new' }]
    pending[1]([{ hostId: 'new', connectionType: 'ssh' }])
    await flushPromises()
    pending[0]([{ hostId: 'old', connectionType: 'koreops_agent', agentStatus: 'offline' }])
    await flushPromises()
    expect(state.resolvedHosts.value[0].hostId).toBe('new')
    hosts.value = [{ hostId: 'closing' }]
    enabled.value = false
    pending[2]([{ hostId: 'closing', connectionType: 'koreops_agent', agentStatus: 'offline' }])
    await flushPromises()
    expect(state.checking.value).toBe(false)
    expect(state.issues.value).toHaveLength(0)
  })
})
