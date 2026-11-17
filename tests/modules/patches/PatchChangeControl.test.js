import { beforeEach, describe, expect, it, vi } from 'vitest'
import { patchChangeControlApi, patchInstallApi } from '@/modules/patches/api'
import { implementationPlan, isChangeControlCancelled } from '@/modules/patches/utils/changeControl'
import { canInspectPatchTask, isApprovalExpired } from '@/modules/patches/utils/patchInstallSchedule'

const calls = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), prompt: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: { get: calls.get, post: calls.post } }))
vi.mock('element-plus', () => ({ ElMessageBox: { prompt: calls.prompt } }))

const prefix = '/secops/api/secops/v2/patch'
const phrase = 'CONFIRM NON-WINDOW IMPLEMENTATION'
const review = { response: { data: {
  code: 'NON_WINDOW_CONFIRM_REQUIRED',
  error: 'Outside the change window',
  confirmText: phrase
} } }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('patch change control', () => {
  it('requests the Chinese catalog explicitly so audit actions can be indexed in English mode', () => {
    patchChangeControlApi.getMessages('zh-CN')
    expect(calls.get).toHaveBeenCalledExactlyOnceWith('/secops/api/secops/v2/i18n/messages', {
      params: { lang: 'zh-CN' },
      headers: { Language: 'zh-CN' }
    })
  })
  it('preflights Shanghai timestamps and submits the user-entered confirmation without alteration', async () => {
    const plan = implementationPlan({
      planStartTime: '2026-11-20 22:00:00',
      planEndTime: '2026-11-21 06:00:00',
      applyReason: '原始申请'
    })
    const payload = { hostIds: ['host-1'], ...plan }
    calls.post.mockResolvedValueOnce({
      data: { decision: 'CONFIRM', confirmText: phrase, message: 'Review required' }
    }).mockResolvedValueOnce({ data: { status: 'PENDING_APPROVAL' } })
    calls.prompt.mockResolvedValueOnce({ value: phrase.toLowerCase() })

    await expect(patchInstallApi.createTask(payload)).resolves.toMatchObject({
      data: { status: 'PENDING_APPROVAL' }
    })
    expect(calls.post.mock.calls).toEqual([
      [`${prefix}/change-control/check`, {
        planStartTime: Date.parse('2026-11-20T22:00:00+08:00'),
        planEndTime: Date.parse('2026-11-21T06:00:00+08:00')
      }],
      [`${prefix}/task/create`, { ...payload, nonWindowConfirmText: phrase.toLowerCase() }]
    ])
    expect(calls.prompt.mock.lastCall[2].inputValidator(phrase.toLowerCase())).toBe(true)
    expect(calls.prompt.mock.lastCall[2].inputValidator('incorrect')).not.toBe(true)
  })

  it('blocks rejected and cancelled submissions before creating a task', async () => {
    calls.post.mockResolvedValueOnce({ data: { decision: 'REJECT', message: '原始拒绝原因' } })
    await expect(patchInstallApi.createRollbackTask({})).rejects.toThrow('原始拒绝原因')
    expect(calls.post).toHaveBeenCalledTimes(1)
    calls.post.mockResolvedValueOnce({ data: { decision: 'CONFIRM', confirmText: phrase } })
    calls.prompt.mockRejectedValueOnce('cancel')
    await patchInstallApi.createPkgUpdateTask({}).catch(error => {
      expect(isChangeControlCancelled(error)).toBe(true)
    })
    expect(calls.post).toHaveBeenCalledTimes(2)
  })

  it('retries only the challenged execution request and preserves unrelated business errors', async () => {
    calls.post.mockRejectedValueOnce(review).mockResolvedValueOnce({ data: { status: 'INSTALLING' } })
    calls.prompt.mockResolvedValueOnce({ value: phrase })
    await patchInstallApi.executeInstallTask('one')
    expect(calls.post.mock.calls).toEqual([
      [`${prefix}/task/one/install/execute`],
      [`${prefix}/task/one/install/execute`, { nonWindowConfirmText: phrase }]
    ])
    const early = { response: { data: { error: '未到实施时间' }, status: 400 } }
    calls.post.mockRejectedValueOnce(early)
    await expect(patchInstallApi.executeRestart('one')).rejects.toBe(early)
    expect(calls.prompt).toHaveBeenCalledTimes(1)
  })

  it('evaluates approval deadlines and excludes Windows tasks from system inspection', () => {
    const now = Date.parse('2026-11-21T06:00:00+08:00')
    expect(isApprovalExpired({ planEndTime: '2026-11-21 06:00:00' }, now)).toBe(true)
    expect(isApprovalExpired({}, now)).toBe(false)
    expect(canInspectPatchTask({ osType: 'WINDOWS', status: 'COMPLETED' })).toBe(false)
    expect(canInspectPatchTask({ osType: 'linux', status: 'RESTART_PENDING' })).toBe(true)
  })
})
