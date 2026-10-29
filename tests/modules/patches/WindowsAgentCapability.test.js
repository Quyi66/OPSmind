import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useWinPatchInstallWizard } from '@/modules/patches/windows-patch/composables/useWinPatchInstallWizard'
import { useWinPatchRollbackWizard } from '@/modules/patches/windows-patch/composables/useWinPatchRollbackWizard'
const api = vi.hoisted(() => ({
  hostInfo: vi.fn(),
  createInstallTask: vi.fn(),
  createRollbackTask: vi.fn(),
  executeTaskStep: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({ agentApi: { getHostAgentInfo: api.hostInfo } }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  api.createInstallTask.mockRejectedValue(new Error('backend validation'))
  api.createRollbackTask.mockRejectedValue(new Error('backend validation'))
})
afterEach(() => wrapper?.unmount())
describe.each([
  ['patch', useWinPatchInstallWizard, 'createInstallTask'],
  ['rollback', useWinPatchRollbackWizard, 'createRollbackTask']
])('Windows %s Agent guard', (capability, useWizard, createApi) => {
  function setup(connectionType = 'koreops_agent', hostSummaries = []) {
    let wizard
    wrapper = mount({
      setup() {
        wizard = useWizard({
          hostSummaries: ref(hostSummaries),
          selectedRows: ref([
            {
              hostId: 'h1',
              hostKey: '192.0.2.1',
              patchStatusId: 'p1',
              histUpdateId: 'u1',
              connectionType
            }
          ])
        })
        return () => null
      }
    })
    return wizard
  }
  it.each(['offline', 'missing', 'unavailable'])(
    'prevents task creation for %s Agent',
    async reason => {
      if (reason === 'unavailable') api.hostInfo.mockRejectedValue(new Error('unavailable'))
      else
        api.hostInfo.mockResolvedValue([
          {
            hostId: 'h1',
            connectionType: 'koreops_agent',
            agentStatus: reason === 'offline' ? 'offline' : 'online',
            capabilities: []
          }
        ])
      const wizard = setup()
      await flushPromises()
      expect(wizard.capabilityIssues.value).toHaveLength(1)
      expect(wizard.capabilitySummary.value).toContain('可执行 0 台 / 不可执行 1 台')
      await wizard.startExecution()
      expect(api[createApi]).not.toHaveBeenCalled()
      expect(api.executeTaskStep).not.toHaveBeenCalled()
    }
  )
  it('rechecks an online Agent before task creation', async () => {
    api.hostInfo.mockResolvedValue([
      {
        hostId: 'h1',
        connectionType: 'koreops_agent',
        agentStatus: 'online',
        capabilities: [capability]
      }
    ])
    const wizard = setup()
    await flushPromises()
    expect(wizard.capabilityIssues.value).toHaveLength(0)
    api.hostInfo.mockResolvedValue([
      {
        hostId: 'h1',
        connectionType: 'koreops_agent',
        agentStatus: 'offline',
        capabilities: [capability]
      }
    ])
    await wizard.startExecution()
    expect(api[createApi]).not.toHaveBeenCalled()
  })
  if (capability === 'patch')
    it('preserves confirmed Agent metadata from batch host summaries when status lookup fails', async () => {
      api.hostInfo.mockRejectedValue(new Error('unavailable'))
      const wizard = setup('', [
        {
          hostId: 'h1',
          connectionType: 'koreops_agent',
          agentStatus: 'online',
          capabilities: ['patch']
        }
      ])
      await flushPromises()
      await wizard.startExecution()
      expect(api.createInstallTask).not.toHaveBeenCalled()
      expect(wizard.capabilitySummary.value).toContain('无法读取 Agent 实时状态')
    })
  it.each(['ssh', 'koreops_agent'])('allows capable %s with original host IDs', async type => {
    api.hostInfo.mockResolvedValue([
      {
        hostId: 'h1',
        connectionType: type,
        agentStatus: 'online',
        capabilities: [capability],
        agentIp: '192.0.2.9',
        cmdbIp: '192.0.2.1'
      }
    ])
    const wizard = setup(type)
    await flushPromises()
    await wizard.startExecution()
    expect(api[createApi]).toHaveBeenCalledWith(expect.objectContaining({ hostIds: ['h1'] }))
    if (type === 'ssh') expect(api.hostInfo).not.toHaveBeenCalled()
  })
})
