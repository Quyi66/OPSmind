import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { useJobPolling } from '@/composables/useJobPolling'

// Scoped to host-user/group dialogs. Shared polling semantics and endpoints stay unchanged.
export function useUserDialogTask({
  visible,
  context = () => null,
  emit,
  onSuccess,
  successMessage,
  maxAttempts = 60
}) {
  const { startPolling, stopPolling } = useJobPolling()
  const attempted = ref(false)
  const busy = ref(false)
  const phase = ref('idle')
  const currentStatus = ref('')
  const runId = ref('')
  const reason = ref('')
  let version = 0
  let active = true
  const available = () => active && visible()
  const taskType = computed(() =>
    phase.value === 'failed' ? 'error' : phase.value === 'unknown' ? 'warning' : 'info'
  )
  const taskMessage = computed(
    () =>
      ({
        idle: '',
        submitting: '正在提交任务…',
        running: currentStatus.value === 'WAITING' ? '任务已提交，等待执行。' : '任务正在执行。',
        failed: '任务执行失败。',
        unknown: '任务结果尚未确定，请核实后再操作。'
      })[phase.value]
  )
  const taskDescription = computed(() =>
    [reason.value, runId.value ? `执行记录：${runId.value}` : ''].filter(Boolean).join(' ')
  )

  function reset() {
    version += 1
    stopPolling()
    attempted.value = false
    busy.value = false
    phase.value = 'idle'
    currentStatus.value = ''
    runId.value = ''
    reason.value = ''
  }
  watch([visible, context], reset, { flush: 'sync' })

  function captureReady() {
    const captured = version
    const target = context()
    return () => available() && !attempted.value && version === captured && context() === target
  }

  async function run(jobId, params) {
    if (!captureReady()()) return
    const captured = ++version
    const target = context()
    const isCurrent = () => available() && version === captured && context() === target
    attempted.value = true
    busy.value = true
    phase.value = 'submitting'
    reason.value = ''
    let notified = false
    let settled = false
    const notify = () => {
      if (!notified) {
        notified = true
        emit('success')
      }
    }
    const finish = (result, fallback = '') => {
      if (!isCurrent() || settled) return
      settled = true
      busy.value = false
      currentStatus.value = result?.status || ''
      if (['SUCCESS', 'COMPLETED'].includes(result?.status) && !fallback) {
        ElMessage.success(successMessage)
        notify()
        onSuccess()
        return
      }
      phase.value = !fallback && ['FAILED', 'ERROR'].includes(result?.status) ? 'failed' : 'unknown'
      reason.value =
        fallback ||
        result?.error ||
        result?.message ||
        (phase.value === 'failed' ? '请核对本次目标及结果。' : '未返回可确认的完成状态。')
      notify()
    }
    try {
      const { data } = await apiService.post(
        `/workflow/api/workflow/jobs/${jobId}/run?cacheBuster=${Date.now()}`,
        { params }
      )
      if (!isCurrent()) return
      const result = Array.isArray(data) ? data[0] : data
      currentStatus.value = result?.status || ''
      runId.value = result?.runId || ''
      if (['WAITING', 'RUNNING'].includes(result?.status)) {
        if (!runId.value) {
          finish(result, '任务返回运行状态，但缺少执行记录标识，无法确认后续结果。')
          return
        }
        phase.value = 'running'
        startPolling(runId.value, {
          interval: 5000,
          maxAttempts,
          showMessage: false,
          onProgress: result => {
            if (isCurrent() && !settled) currentStatus.value = result?.status || ''
          },
          onSuccess: result => finish(result),
          onError: result =>
            finish(
              result,
              ['FAILED', 'ERROR'].includes(result?.status)
                ? ''
                : '结果读取失败，后台任务是否完成尚未确定。'
            ),
          onTimeout: result =>
            finish(result, '等待结果超时，不代表任务执行失败，请勿直接重复提交。')
        })
      } else finish(result)
    } catch (error) {
      if (!isCurrent()) return
      busy.value = false
      phase.value = 'unknown'
      reason.value = `提交结果未确认：${error?.message || '请求异常'}。请先核实任务是否已下发，勿重复提交。`
    }
  }

  onActivated(() => {
    active = true
  })
  function suspend() {
    active = false
    version += 1
    stopPolling()
    if (busy.value) {
      busy.value = false
      phase.value = 'unknown'
      reason.value = '窗口已离开，任务结果尚未确定；关闭窗口不会取消已提交的后台任务。'
    }
  }
  onDeactivated(suspend)
  onBeforeUnmount(suspend)
  return {
    attempted,
    busy,
    currentStatus,
    taskType,
    taskMessage,
    taskDescription,
    runId,
    reset,
    captureReady,
    run
  }
}
