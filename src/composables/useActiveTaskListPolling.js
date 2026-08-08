import { computed, onScopeDispose, toValue, watch } from 'vue'
import { ACTIVE_RUN_STATUSES, normalizeRunStatus } from '@/utils/taskStatus'

export function useActiveTaskListPolling({
  records,
  refresh,
  enabled = true,
  interval = 5000,
  getStatus = record => record?.status,
  activeStatuses = ACTIVE_RUN_STATUSES
}) {
  const activeStatusSet = new Set(activeStatuses.map(normalizeRunStatus))
  const pollingInterval = Number(interval) > 0 ? Number(interval) : 5000
  let pollingTimer = null
  let pollingRequestPending = false
  let disposed = false

  function resolveRecords() {
    const value = toValue(records)
    return Array.isArray(value) ? value : []
  }

  function hasActiveRecords() {
    return resolveRecords().some(record =>
      activeStatusSet.has(normalizeRunStatus(getStatus(record)))
    )
  }

  const shouldPoll = computed(() => Boolean(toValue(enabled)) && hasActiveRecords())

  function stopPolling() {
    if (!pollingTimer) return
    clearTimeout(pollingTimer)
    pollingTimer = null
  }

  function syncPolling() {
    stopPolling()
    if (disposed || !shouldPoll.value) return

    pollingTimer = setTimeout(async () => {
      pollingTimer = null
      if (pollingRequestPending) {
        syncPolling()
        return
      }

      pollingRequestPending = true
      try {
        await refresh()
      } catch (error) {
        console.error('Failed to refresh active task list:', error)
      } finally {
        pollingRequestPending = false
        syncPolling()
      }
    }, pollingInterval)
  }

  watch(shouldPoll, syncPolling, { immediate: true })
  onScopeDispose(() => {
    disposed = true
    stopPolling()
  })

  return {
    hasActiveRecords,
    stopPolling,
    syncPolling
  }
}
