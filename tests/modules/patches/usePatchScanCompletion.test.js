import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
const api = vi.hoisted(() => ({ getExecuteResult: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => api)
import { usePatchScanCompletion } from '@/modules/patches/composables/usePatchScanCompletion'

describe('page-owned scan completion tracking', () => {
  let scope, refresh, tracker
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    scope = effectScope()
    refresh = vi.fn()
    tracker = scope.run(() => usePatchScanCompletion(refresh))
  })
  afterEach(() => {
    scope.stop()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('refreshes after a slow scan completes, without depending on result dialog events', async () => {
    api.getExecuteResult
      .mockResolvedValueOnce({ data: { status: 'RUNNING' } })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { status: 'SUCCESS' } })
    tracker.trackScan('scan-1')
    tracker.trackScan('scan-1')
    await vi.advanceTimersByTimeAsync(10000)
    expect(refresh).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5000)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(api.getExecuteResult).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('tracks multiple submissions independently and refreshes partial failure results too', async () => {
    api.getExecuteResult.mockImplementation(async id => ({
      data: { status: id === 'a' ? 'FAILED' : 'COMPLETED' }
    }))
    tracker.trackScan('a')
    tracker.trackScan('b')
    await vi.advanceTimersByTimeAsync(5000)
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores late responses after leaving the page', async () => {
    let finish
    api.getExecuteResult.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    tracker.trackScan('scan-1')
    await vi.advanceTimersByTimeAsync(5000)
    scope.stop()
    finish({ data: { status: 'COMPLETED' } })
    await vi.advanceTimersByTimeAsync(0)
    expect(refresh).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
