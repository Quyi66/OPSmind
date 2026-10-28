import { onScopeDispose } from 'vue'
import { getExecuteResult } from '@/modules/automation/api/jao'
import { normalizeRunStatus, isSuccessfulRunStatus } from '@/utils/taskStatus'

const FAILED_STATUSES = [
  'FAILED',
  'ERROR',
  'CANCELED',
  'CANCELLED',
  'ABORTED',
  'TIMEOUT',
  'TIMED_OUT'
]

// The page owns these observers; closing a result dialog does not stop them.
export function usePatchScanCompletion(refresh, interval = 5000) {
  const runs = new Map()
  let disposed = false

  function trackScan(runId) {
    const id = String(runId || '').trim()
    if (!id || disposed || runs.has(id)) return
    const run = { timer: null }
    runs.set(id, run)
    const schedule = () => {
      if (disposed || !runs.has(id)) return
      run.timer = setTimeout(poll, interval)
    }
    const poll = async () => {
      run.timer = null
      try {
        const response = await getExecuteResult(id)
        if (disposed || !runs.has(id)) return
        const data = response?.data ?? response
        const status = normalizeRunStatus(data?.status)
        if (isSuccessfulRunStatus(status) || FAILED_STATUSES.includes(status)) {
          // Refresh on failure too: a multi-host scan may have partial results.
          await refresh()
          if (disposed) return
          runs.delete(id)
          return
        }
      } catch {
        // A temporary query error must not lose the submitted scan.
      }
      schedule()
    }
    schedule()
  }

  onScopeDispose(() => {
    disposed = true
    for (const run of runs.values()) clearTimeout(run.timer)
    runs.clear()
  })

  return { trackScan }
}
