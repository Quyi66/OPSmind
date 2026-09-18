import { describe, expect, it, vi } from 'vitest'
import { isFutureSchedule, isTaskExecutionBlocked, isPackageInstallFinished } from '@/modules/patches/utils/patchInstallSchedule'
import { formatTaskStatus, getRecordDisplayState } from '@/modules/patches/utils/patchProcessLogs'

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))
import { patchInstallApi } from '@/modules/patches/api'

describe('scheduled package installation', () => {
  const now = new Date('2026-09-20T02:00:00').getTime()

  it('requires a valid future time, accepting local strings and millisecond timestamps', () => {
    for (const value of [null, undefined, '', 'invalid', now, now - 1]) {
      expect(isFutureSchedule(value, now)).toBe(false)
    }
    expect(isFutureSchedule(now + 1, now)).toBe(true)
    expect(isFutureSchedule('2026-09-20 02:00:01', now)).toBe(true)
  })

  it('blocks execution before the schedule and for unapproved or terminated applications', () => {
    for (const status of ['PENDING_APPROVAL', 'REJECTED', 'EXPIRED']) {
      expect(isTaskExecutionBlocked({ status, scheduledTime: now - 1 }, now)).toBe(true)
    }
    expect(isTaskExecutionBlocked({ status: 'PRE_CHECK_FAILED', scheduledTime: now + 1 }, now)).toBe(true)
    expect(isTaskExecutionBlocked({ status: 'PRE_CHECK_FAILED', scheduledTime: now }, now)).toBe(false)
    expect(isTaskExecutionBlocked({ status: 'PRE_CHECK_FAILED' }, now)).toBe(false)
  })

  it('keeps waiting tasks polling and stops rejected, expired and completed tasks', () => {
    for (const status of ['CREATED', 'PENDING_APPROVAL', 'PRE_CHECKING', 'INSTALLING']) {
      expect(isPackageInstallFinished(status)).toBe(false)
    }
    for (const status of ['REJECTED', 'EXPIRED', 'COMPLETED', 'INSTALL_DONE', 'INSTALL_FAILED']) {
      expect(isPackageInstallFinished(status)).toBe(true)
    }
    expect(formatTaskStatus('PENDING_APPROVAL')).toBe('待管理员审批')
    expect(getRecordDisplayState({ action: 'APPROVE' })).toBe('success')
    expect(getRecordDisplayState({ action: 'EXPIRE' })).toBe('failed')
  })

  it('submits the schedule and preserves approval metadata in the returned task', async () => {
    const task = { id: 'task-1', status: 'PENDING_APPROVAL', scheduledTime: now + 1000, createdBy: 'user', approvedBy: null }
    api.post.mockResolvedValueOnce({ data: task })
    const payload = { packages: ['curl'], targets: [{ key: 'host-1' }], scheduledTime: task.scheduledTime }
    const response = await patchInstallApi.createAndRunTask(payload)
    expect(api.post).toHaveBeenLastCalledWith('/secops/api/secops/v2/patch/task/create-and-run', payload)
    expect(response.data).toMatchObject(task)
  })

  it('sends approval decisions and queries the pending list', async () => {
    api.post.mockResolvedValue({ data: { status: 'CREATED' } })
    for (const approved of [true, false]) {
      await patchInstallApi.approveTask('task-1', { approved, comment: '意见' })
      expect(api.post).toHaveBeenLastCalledWith('/secops/api/secops/v2/patch/task/task-1/approval', { approved, comment: '意见' })
    }
    api.get.mockResolvedValue({ data: { content: [], totalElements: 0 } })
    await patchInstallApi.listTasks({ status: 'PENDING_APPROVAL' })
    expect(api.get).toHaveBeenLastCalledWith('/secops/api/secops/v2/patch/task/list?status=PENDING_APPROVAL&page=0&size=20')
  })
})
