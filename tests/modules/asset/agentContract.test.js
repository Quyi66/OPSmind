import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiService } from '@/core/api'
import { agentApi, getAgentErrorMessage } from '@/modules/asset/api'
import { getAgentReportedIp } from '@/modules/asset/utils/agentInfo'
import { scanPatchHosts, getScanRuns } from '@/modules/patches/api/scan'

vi.mock('@/core/api', () => ({
  apiService: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  getJaoOperationLogs: vi.fn()
}))
beforeEach(() => {
  vi.clearAllMocks()
})

describe('simplified agent management API', () => {
  it('issues prebound enrollment tokens and reads status from pending', async () => {
    apiService.post.mockResolvedValue({ data: { id: 'tok', remainingUses: 1 } })
    await agentApi.createEnrollmentToken({ hostId: 'h1', targetOs: 'windows' })
    expect(apiService.post).toHaveBeenCalledWith('/cmdb/api/cmdb/agent/enroll-tokens', {
      hostId: 'h1',
      targetOs: 'windows'
    })
    const pending = { token: { status: 'exhausted', remainingUses: 0 }, agents: [] }
    apiService.get.mockResolvedValue({ data: pending })
    expect(await agentApi.getPendingAgents('tok')).toEqual(pending)
    expect(apiService.get).toHaveBeenCalledWith('/cmdb/api/cmdb/agent/pending', {
      params: { tokenId: 'tok' }
    })
  })
  it('sends new-host gateway binding to the unified bind endpoint', async () => {
    apiService.post.mockResolvedValue({ data: { hostId: 'created', hostCreated: true } })
    const binding = {
      clientId: 'client',
      mode: 'gateway',
      targetIp: '10.0.0.2',
      newHost: { ciType: 'linux' }
    }
    expect(await agentApi.bindAgent(binding)).toEqual({ hostId: 'created', hostCreated: true })
    expect(apiService.post).toHaveBeenCalledWith('/cmdb/api/cmdb/agent/bind', binding)
  })
  it('preserves install skips and uses the new revoke path', async () => {
    const result = { runId: 'run1', submitted: ['h1'], skipped: { h2: '已绑定' } }
    apiService.post.mockResolvedValue({ data: result })
    expect(await agentApi.installAgent(['h1', 'h2'])).toEqual(result)
    expect(apiService.post).toHaveBeenCalledWith('/cmdb/api/cmdb/agent/install', {
      hostIds: ['h1', 'h2']
    })
    apiService.delete.mockResolvedValue({ data: 'ok' })
    await agentApi.revokeEnrollmentToken('tok')
    expect(apiService.delete).toHaveBeenCalledWith('/cmdb/api/cmdb/agent/enroll-tokens/tok')
  })
  it('preserves multi-host errors, Problem details and the actual execution IP', () => {
    const message = '[AgentRoute] 本次下发已阻断\n- [PLATFORM_SELF] h1\n- [PLATFORM_SELF] h2'
    expect(
      getAgentErrorMessage({ response: { data: { errorCode: 'PLATFORM_SELF', message } } })
    ).toBe(message)
    expect(
      getAgentErrorMessage({ response: { data: { detail: '请选择 hostId 或 newHost' } } })
    ).toBe('请选择 hostId 或 newHost')
    expect(getAgentReportedIp({ agentIp: '10.0.0.2', ip: '10.0.0.1' })).toBe('10.0.0.2')
  })
  it('submits mixed-platform scans and keeps every returned run', async () => {
    const result = { windowsRunId: 'w', linuxRunIds: ['l1', 'l2'], windowsHosts: 1, linuxHosts: 2 }
    apiService.post.mockResolvedValue({ data: result })
    expect(await scanPatchHosts(['win', 'linux', 'win'])).toEqual(result)
    expect(apiService.post).toHaveBeenCalledWith('/secops/api/secops/patch/scan', {
      hostIds: ['win', 'linux']
    })
    expect(getScanRuns(result).map(run => run.runId)).toEqual(['w', 'l1', 'l2'])
  })
})
