import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { pollJobStatus, useJobPolling } from '@/composables/useJobPolling'
import { setLocale, t } from '@/core/i18n'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { get: mocks.get } }))
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, error: mocks.error, warning: mocks.warning }
}))
const wrappers = []
function polling() {
  let instance
  const wrapper = mount({
    setup() {
      instance = useJobPolling()
      return {}
    },
    template: '<div />'
  })
  wrappers.push(wrapper)
  return instance
}
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  await setLocale('zh-CN', { persist: false })
})

describe('作业轮询迟到响应', () => {
  it('resolves local completion messages at settlement without changing timers or request IDs', async () => {
    mocks.get.mockResolvedValueOnce({ data: { status: 'RUNNING' } }).mockResolvedValueOnce({ data: { status: 'SUCCESS' } })
    const instance = polling()
    instance.startPolling('original-run', { interval: 1000, successMessage: () => t('asset.connectivityDone') })
    await flushPromises()
    const timers = vi.getTimerCount()
    await setLocale('en-US', { persist: false })
    expect(vi.getTimerCount()).toBe(timers)
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.success).toHaveBeenCalledWith('Connectivity check completed')
    expect(mocks.get).toHaveBeenLastCalledWith('/workflow/api/workflow/runlogs/original-run/result')
  })
  it('keeps standalone polling callbacks and raw caller messages compatible', async () => {
    const pending = deferred(), callback = vi.fn()
    mocks.get.mockReturnValueOnce(pending.promise)
    await pollJobStatus('standalone-run', { successMessage: () => t('common.pollingSuccess'), onSuccess: callback })
    await setLocale('en-US', { persist: false })
    pending.resolve({ data: { status: 'SUCCESS' } })
    await flushPromises()
    expect(mocks.success).toHaveBeenCalledWith('Task completed successfully')
    expect(callback).toHaveBeenCalledExactlyOnceWith({ status: 'SUCCESS' })
    mocks.get.mockResolvedValueOnce({ data: { status: 'FAILED', error: '后端错误原文' } })
    polling().startPolling('failed-run')
    await flushPromises()
    expect(mocks.error).toHaveBeenCalledWith('后端错误原文')
  })
  it.each(['resolve', 'reject'])('ignores a stopped request that settles with %s', async settle => {
    const response = deferred(),
      callbacks = { onSuccess: vi.fn(), onError: vi.fn(), onComplete: vi.fn() }
    mocks.get.mockReturnValueOnce(response.promise)
    const instance = polling()
    instance.startPolling('old-run', callbacks)
    instance.stopPolling()
    response[settle](
      settle === 'resolve' ? { data: { status: 'SUCCESS' } } : new Error('old failure')
    )
    await flushPromises()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
    for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled()
    expect(instance.isPolling.value).toBe(false)
  })
  it.each(['new-run', 'same-run'])(
    'keeps a newer polling session active for %s',
    async latestRun => {
      const older = deferred(),
        latest = deferred(),
        oldCallback = vi.fn(),
        latestCallback = vi.fn()
      mocks.get.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise)
      const instance = polling()
      instance.startPolling('same-run', { onComplete: oldCallback })
      instance.stopPolling()
      instance.startPolling(latestRun, { onSuccess: latestCallback })
      older.resolve({ data: { status: 'SUCCESS' } })
      await flushPromises()
      expect(instance.isPolling.value).toBe(true)
      expect(oldCallback).not.toHaveBeenCalled()
      latest.resolve({ data: { status: 'SUCCESS' } })
      await flushPromises()
      expect(latestCallback).toHaveBeenCalledWith({ status: 'SUCCESS' })
      expect(mocks.success).toHaveBeenCalledTimes(1)
      expect(mocks.get).toHaveBeenLastCalledWith(
        `/workflow/api/workflow/runlogs/${latestRun}/result`
      )
      expect(instance.isPolling.value).toBe(false)
    }
  )
  it('preserves running, success, failure and silent message behavior', async () => {
    const instance = polling(),
      done = vi.fn(),
      failed = vi.fn()
    mocks.get
      .mockResolvedValueOnce({ data: { status: 'RUNNING' } })
      .mockResolvedValueOnce({ data: { status: 'SUCCESS' } })
    instance.startPolling('run-1', { interval: 1000, successMessage: '启用成功', onSuccess: done })
    await flushPromises()
    expect(instance.isPolling.value).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(done).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledWith('启用成功')
    mocks.get.mockResolvedValueOnce({ data: { status: 'FAILED', error: 'fixture failure' } })
    instance.startPolling('run-2', { showMessage: false, onError: failed })
    await flushPromises()
    expect(failed).toHaveBeenCalledWith({ status: 'FAILED', error: 'fixture failure' })
    expect(mocks.error).not.toHaveBeenCalled()
    expect(instance.isPolling.value).toBe(false)
  })
})
