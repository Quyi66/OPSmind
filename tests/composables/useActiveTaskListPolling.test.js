import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

describe('useActiveTaskListPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls while a record is active and stops at a terminal status', async () => {
    const records = ref([{ status: 'RUNNING' }])
    const refresh = vi.fn(async () => {
      records.value = [{ status: 'COMPLETED' }]
    })
    const scope = effectScope()

    scope.run(() => {
      useActiveTaskListPolling({ records, refresh, interval: 1000 })
    })

    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()
    expect(refresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).toHaveBeenCalledTimes(1)
    scope.stop()
  })

  it('does not poll terminal failure records', async () => {
    const records = ref([{ status: 'FAILED' }, { status: 'ERROR' }])
    const refresh = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      useActiveTaskListPolling({ records, refresh, interval: 1000 })
    })

    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).not.toHaveBeenCalled()
    scope.stop()
  })

  it('pauses when polling is disabled', async () => {
    const records = ref([{ status: 'WAITING' }])
    const enabled = ref(false)
    const refresh = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      useActiveTaskListPolling({ records, refresh, enabled, interval: 1000 })
    })

    await vi.advanceTimersByTimeAsync(2000)
    expect(refresh).not.toHaveBeenCalled()

    enabled.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(refresh).toHaveBeenCalledTimes(1)
    scope.stop()
  })

  it('keeps the existing timer when active records change but polling eligibility does not', async () => {
    const sourceRecords = ref([{ id: 'run-1', status: 'RUNNING' }])
    const refresh = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      useActiveTaskListPolling({
        records: () => sourceRecords.value.map(record => ({ ...record })),
        refresh,
        interval: 1000
      })
    })

    await vi.advanceTimersByTimeAsync(500)
    sourceRecords.value = [{ id: 'run-1', status: 'PROCESSING' }]
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)

    expect(refresh).toHaveBeenCalledTimes(1)
    scope.stop()
  })
})
