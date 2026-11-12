import { message, messageRef } from '@/core/i18n/feedback'

import { t } from '@/core/i18n'
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
  const reason = messageRef('')
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
        submitting: t('hostUser.submittingTask'),
        running:
          currentStatus.value === 'WAITING'
            ? t('hostUser.taskSubmittedAndAwaitingExecution')
            : t('hostUser.taskIsRunning'),
        failed: t('hostUser.taskFailed'),
        unknown: t('hostUser.taskResultIsUnknownVerifyItBeforeTaking')
      })[phase.value]
  )
  const taskDescription = computed(() =>
    [reason.value, runId.value ? t('hostUser.executionRecordValue', { p0: runId.value }) : '']
      .filter(Boolean)
      .join(' ')
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
        ElMessage.success(typeof successMessage === 'function' ? successMessage() : successMessage)
        notify()
        onSuccess()
        return
      }
      phase.value = !fallback && ['FAILED', 'ERROR'].includes(result?.status) ? 'failed' : 'unknown'
      reason.value =
        fallback ||
        result?.error ||
        result?.message ||
        (phase.value === 'failed'
          ? message('hostUser.checkTheTargetsAndResultsOfThisOperation')
          : message('hostUser.noConfirmedCompletionStatusWasReturned'))
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
          finish(result, message('hostUser.theTaskIsRunningButNoExecutionRecord'))
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
                : message('hostUser.unableToReadResultsCompletionOfTheBackground')
            ),
          onTimeout: result =>
            finish(result, message('hostUser.waitingForResultsTimedOutThisDoesNot'))
        })
      } else finish(result)
    } catch (error) {
      if (!isCurrent()) return
      busy.value = false
      phase.value = 'unknown'
      reason.value = message('hostUser.submissionCouldNotBeConfirmedValueCheckWhether', () => ({
        p0: error?.message || t('hostUser.requestError')
      }))
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
      reason.value = message('hostUser.theWindowWasLeftAndTheTaskResult')
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
    reason,
    runId,
    reset,
    captureReady,
    run
  }
}
