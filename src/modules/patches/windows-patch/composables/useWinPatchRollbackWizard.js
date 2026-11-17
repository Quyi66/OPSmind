
import { createPatchTaskError } from '@/modules/patches/utils/patchTaskFeedback'

import { message as localMessage, messageRef } from '@/core/i18n/feedback'
import { t } from '@/core/i18n'
import { isChangeControlCancelled } from '../../utils/changeControl'
import { createWinPatchError, getWinPatchErrorFeedback, getWinPatchRunTitle } from '../feedback'
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../api'
import { WIN_PATCH_ROLLBACK_PIPELINE_STEPS, WIN_PATCH_ROLLBACK_WIZARD_STEPS } from '../constants'
import { useWinPatchPolling } from './useWinPatchPolling'
import {
  getSeverityLabel,
  getTaskStatusValue,
  normalizeUpper,
  pickValue,
  resolveHistUpdateId,
  resolveHostId,
  resolveHostKey,
  unwrapResponse
} from '../utils'

function getStepSuccessStatuses(stepKey) {
  switch (normalizeUpper(stepKey)) {
    case 'PRE_CHECK':
      return ['PRE_CHECK_DONE']
    case 'ROLLBACK':
      return ['ROLLBACK_DONE']
    case 'RESTART':
      return ['RESTART_DONE']
    case 'VALIDATE':
      return ['COMPLETED', 'SUCCESS', 'PASS']
    default:
      return []
  }
}

function getStepFailedStatuses(stepKey) {
  switch (normalizeUpper(stepKey)) {
    case 'PRE_CHECK':
      return ['PRE_CHECK_FAILED']
    case 'ROLLBACK':
    case 'EXECUTE':
      return ['ROLLBACK_FAILED']
    case 'RESTART':
      return ['RESTART_FAILED']
    case 'VALIDATE':
      return ['VALIDATE_FAILED']
    default:
      return []
  }
}

function getStepRunningStatuses(stepKey) {
  switch (normalizeUpper(stepKey)) {
    case 'PRE_CHECK':
      return ['PRE_CHECKING']
    case 'ROLLBACK':
      return ['ROLLING_BACK']
    case 'RESTART':
      return ['RESTARTING', 'RESTART_RUNNING']
    case 'VALIDATE':
      return ['VALIDATING']
    default:
      return []
  }
}

function createRollbackOptions() {
  return {
    reboot: false,
    rescanAfter: false
  }
}

function createScriptConfig() {
  return {
    mode: 'edit',
    content: '',
    file: null,
    fileName: ''
  }
}

function createSkippedSteps() {
  return {
    'pre-check': false,
    validate: false,
    restart: false
  }
}

function normalizeScriptConfig(value = {}) {
  return {
    mode: value?.mode === 'upload' ? 'upload' : 'edit',
    content: String(value?.content || ''),
    file: value?.file || null,
    fileName: String(value?.fileName || '')
  }
}

function hasConfiguredScript(scriptConfig = {}) {
  if (scriptConfig.mode === 'upload') {
    return Boolean(scriptConfig.file)
  }

  return Boolean(String(scriptConfig.content || '').trim())
}

function resolveUploadedScriptFile(scriptConfig = {}) {
  if (scriptConfig.mode !== 'upload') {
    return null
  }

  return scriptConfig.file || null
}

function resolveApiErrorMessage(error, fallback = t('patches.windows.rollbackTaskFailedRetry')) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    fallback
  )
}

function getAuditStepKey(step) {
  return normalizeUpper(step?.step)
}

function filterAuditSteps(steps = [], stepKey) {
  const normalizedKeys = (Array.isArray(stepKey) ? stepKey : [stepKey])
    .map(key => normalizeUpper(key))
    .filter(Boolean)

  return steps.filter(step => normalizedKeys.includes(getAuditStepKey(step)))
}

function resolveAggregatedAuditStep(steps = [], stepKey) {
  const matchingSteps = filterAuditSteps(steps, stepKey)
  if (!matchingSteps.length) {
    return null
  }

  const statuses = matchingSteps.map(step => normalizeUpper(step?.status))
  let aggregatedStatus = 'PENDING'

  if (statuses.some(status => ['FAILED', 'ERROR'].includes(status))) {
    aggregatedStatus = 'FAILED'
  } else if (statuses.every(status => status === 'SKIPPED')) {
    aggregatedStatus = 'SKIPPED'
  } else if (statuses.every(status => ['SUCCESS', 'COMPLETED', 'SKIPPED'].includes(status))) {
    aggregatedStatus = 'SUCCESS'
  } else if (
    statuses.some(status => ['RUNNING', 'IN_PROGRESS'].includes(status)) ||
    (statuses.some(status => ['SUCCESS', 'COMPLETED'].includes(status)) &&
      statuses.some(status => ['PENDING', 'WAITING', 'CREATED'].includes(status)))
  ) {
    aggregatedStatus = 'RUNNING'
  } else if (statuses.every(status => ['PENDING', 'WAITING', 'CREATED'].includes(status))) {
    aggregatedStatus = 'PENDING'
  } else {
    aggregatedStatus = statuses[0] || 'PENDING'
  }

  const runId = matchingSteps.find(step => String(step?.runId || '').trim())?.runId || ''
  const remark = matchingSteps.find(step => String(step?.remark || '').trim())?.remark || ''

  return {
    ...matchingSteps[0],
    status: aggregatedStatus,
    runId,
    remark
  }
}

function findAuditStep(steps = [], stepKey) {
  return resolveAggregatedAuditStep(steps, stepKey)
}

function resolveExecuteStepKeys(task = null) {
  const taskType = normalizeUpper(pickValue(task, ['taskType', 'task_type'], ''))
  return taskType === 'ROLLBACK' ? ['ROLLBACK', 'EXECUTE'] : ['INSTALL', 'EXECUTE']
}

function resolvePipelineStepKeys(stepKey, task = null) {
  const normalizedStepKey = normalizeUpper(stepKey)
  if (['INSTALL', 'ROLLBACK', 'EXECUTE'].includes(normalizedStepKey)) {
    return resolveExecuteStepKeys(task)
  }

  return [normalizedStepKey]
}

function resolvePipelineCurrentStep(task = null) {
  const currentStep = normalizeUpper(
    pickValue(task, ['currentStep', 'current_step'], '') ||
      deriveCurrentStep(task, task?.steps || [])
  )
  if (currentStep === 'EXECUTE') {
    return resolveExecuteStepKeys(task)[0]
  }

  return currentStep
}

function findLatestScriptContent(logs = [], scriptType) {
  const normalizedType = String(scriptType || '')
    .trim()
    .toLowerCase()

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const record = logs[index]
    if (
      getAuditStepKey(record) === 'SCRIPT' &&
      String(record?.scriptType || '')
        .trim()
        .toLowerCase() === normalizedType &&
      String(record?.scriptContent || '').trim()
    ) {
      return record.scriptContent
    }
  }

  return ''
}

function deriveCurrentStep(task, auditSteps = []) {
  const explicitStep = String(pickValue(task, ['currentStep', 'current_step'], '')).trim()
  if (explicitStep) {
    return explicitStep
  }

  const activeStep = auditSteps.find(step => {
    const status = normalizeUpper(step?.status)
    return ['PENDING', 'RUNNING', 'WAITING', 'CREATED'].includes(status)
  })

  if (activeStep) {
    return getAuditStepKey(activeStep)
  }

  if (
    auditSteps.length &&
    auditSteps.every(step => ['SUCCESS', 'SKIPPED'].includes(normalizeUpper(step?.status)))
  ) {
    return 'COMPLETED'
  }

  return ''
}

function mergeTaskDetail(
  baseTask = null,
  auditTask = null,
  auditSteps = [],
  auditLogs = [],
  hosts = []
) {
  const mergedTask = {
    ...(baseTask && typeof baseTask === 'object' ? baseTask : {}),
    ...(auditTask && typeof auditTask === 'object' ? auditTask : {})
  }

  if (!Object.keys(mergedTask).length && !auditSteps.length && !auditLogs.length) {
    return null
  }

  const preCheckStep = findAuditStep(auditSteps, 'PRE_CHECK')
  const rollbackStep = findAuditStep(auditSteps, resolveExecuteStepKeys(mergedTask))
  const restartStep = findAuditStep(auditSteps, 'RESTART')
  const validateStep = findAuditStep(auditSteps, 'VALIDATE')
  const currentStep = deriveCurrentStep(mergedTask, auditSteps)
  const preCheckScript = findLatestScriptContent(auditLogs, 'pre-check')
  const validateScript = findLatestScriptContent(auditLogs, 'validate')

  if (currentStep) {
    mergedTask.currentStep = currentStep
  }

  if (!pickValue(mergedTask, ['preCheckRunId', 'pre_check_run_id'], '') && preCheckStep?.runId) {
    mergedTask.preCheckRunId = preCheckStep.runId
  }

  if (!pickValue(mergedTask, ['executeRunId', 'execute_run_id'], '') && rollbackStep?.runId) {
    mergedTask.executeRunId = rollbackStep.runId
  }

  if (!pickValue(mergedTask, ['restartRunId', 'restart_run_id'], '') && restartStep?.runId) {
    mergedTask.restartRunId = restartStep.runId
  }

  if (!pickValue(mergedTask, ['validateRunId', 'validate_run_id'], '') && validateStep?.runId) {
    mergedTask.validateRunId = validateStep.runId
  }

  if (!pickValue(mergedTask, ['preCheckScript', 'pre_check_script'], '') && preCheckScript) {
    mergedTask.preCheckScript = preCheckScript
  }

  if (!pickValue(mergedTask, ['validateScript', 'validate_script'], '') && validateScript) {
    mergedTask.validateScript = validateScript
  }

  mergedTask.steps = auditSteps
  mergedTask.logs = auditLogs
  mergedTask.hosts = hosts

  return mergedTask
}

function mapPipelineUiStatus(status) {
  const normalizedStatus = normalizeUpper(status)

  if (['SUCCESS', 'COMPLETED'].includes(normalizedStatus)) return 'success'
  if (normalizedStatus === 'SKIPPED') return 'skipped'
  if (['FAILED', 'ERROR'].includes(normalizedStatus)) return 'failed'
  if (['RUNNING', 'IN_PROGRESS'].includes(normalizedStatus)) return 'running'
  if (['PENDING', 'WAITING', 'CREATED'].includes(normalizedStatus)) return 'pending'
  return 'idle'
}

const PIPELINE_STEP_ORDER = {
  PRE_CHECK: 0,
  ROLLBACK: 1,
  EXECUTE: 1,
  INSTALL: 1,
  RESTART: 2,
  VALIDATE: 3
}

function resolvePipelineStepUiStatus({
  stepKey,
  auditStatus,
  task,
  pipelineStatus,
  isSkipped
}) {
  if (isSkipped || auditStatus === 'SKIPPED') {
    return 'skipped'
  }

  const normalizedStepKey = normalizeUpper(stepKey)
  const rawTaskStatus = normalizeUpper(
    pickValue(task, ['taskStatus', 'task_status', 'status'], '')
  )
  const taskStatus = getTaskStatusValue(task)
  const currentStep = normalizeUpper(resolvePipelineCurrentStep(task))
  const stepOrder = PIPELINE_STEP_ORDER[normalizedStepKey] ?? -1
  const currentStepOrder = PIPELINE_STEP_ORDER[currentStep] ?? -1
  const runningStatuses = getStepRunningStatuses(normalizedStepKey)
  const successStatuses = getStepSuccessStatuses(normalizedStepKey)
  const failedStatuses = getStepFailedStatuses(normalizedStepKey)

  const isCurrentStep = currentStep === normalizedStepKey
  const isTaskGlobalFailed =
    ['FAILED', 'ERROR'].includes(taskStatus) ||
    ['FAILED', 'ERROR'].includes(rawTaskStatus) ||
    pipelineStatus === 'failed'

  // 1. 优先判定失败状态：步骤专属失败、聚合审计失败，或当前正在执行的步骤发生全局失败
  if (
    auditStatus === 'FAILED' ||
    failedStatuses.includes(rawTaskStatus) ||
    failedStatuses.includes(taskStatus) ||
    (isCurrentStep && isTaskGlobalFailed)
  ) {
    return 'failed'
  }

  // 2. 判定尚未开始的后置步骤：防止全局 running 穿透至尚未到达的步骤
  if (currentStepOrder !== -1 && stepOrder > currentStepOrder) {
    return 'pending'
  }

  // 3. 判定运行中状态：主任务处于该步骤运行中，或当前处于该步骤且处于全局运行中，或聚合审计仍在运行中
  if (
    runningStatuses.includes(rawTaskStatus) ||
    runningStatuses.includes(taskStatus) ||
    auditStatus === 'RUNNING' ||
    (isCurrentStep &&
      (['RUNNING', 'IN_PROGRESS'].includes(taskStatus) || pipelineStatus === 'running'))
  ) {
    return 'running'
  }

  // 4. 判定完成成功状态（以主任务接口状态为主）
  // (1) 主任务明确返回了该步骤的成功状态（如 RESTART_DONE, ROLLBACK_DONE, PRE_CHECK_DONE, COMPLETED）
  // (2) 主任务已推进到后续步骤（currentStepOrder > stepOrder），说明前置步骤必然已完成
  const isStepDoneByMainTask =
    successStatuses.includes(rawTaskStatus) ||
    successStatuses.includes(taskStatus) ||
    (currentStepOrder > stepOrder && currentStepOrder !== -1)

  if (isStepDoneByMainTask) {
    return 'success'
  }

  // (3) 所有主机的审计均已成功，但若主任务仍停留在本步骤的未完成态，则绝不能提前显示成功
  if (auditStatus === 'SUCCESS') {
    if (isCurrentStep && !successStatuses.includes(rawTaskStatus)) {
      if (
        pipelineStatus === 'running' ||
        ['RUNNING', 'IN_PROGRESS', 'PENDING', 'CREATED'].includes(taskStatus)
      ) {
        return 'running'
      }
    }
    return 'success'
  }

  // 5. 兜底映射
  return mapPipelineUiStatus(auditStatus)
}

export function useWinPatchRollbackWizard({ selectedRows, onSubmitted, onSuccess } = {}) {
  const activeStep = ref(0)
  const rollbackOptions = ref(createRollbackOptions())
  const preScriptConfig = ref(createScriptConfig())
  const validateScriptConfig = ref(createScriptConfig())
  const skippedSteps = ref(createSkippedSteps())
  const executionSubmitting = ref(false)
  const runtimeLoading = ref(false)
  const createdTask = ref(null)
  const planDraft = ref({})
  const pendingApproval = computed(() =>
    pickValue(taskDetail.value || createdTask.value, ['status'], '') === 'PENDING_APPROVAL'
  )
  const taskDetail = ref(null)
  const taskHosts = ref([])
  const taskAuditSteps = ref([])
  const taskAuditLogs = ref([])
  const taskErrorMessage = messageRef('')
  const pipelineStatus = ref('idle')
  const showRunResultDialog = ref(false)
  const currentRunId = ref('')
  const currentRunTitle = messageRef('')
  let sessionId = 0
  let cancelWait = null
  let resumeStep = 0
  let resumePolling = false
  let scriptsSynced = false
  let scanSubmitted = false
  let taskHostIds = []

  function checkSession(session) {
    if (session !== sessionId) throw createPatchTaskError('patches.windows.rollbackWizardClosed')
  }

  const { start, stop } = useWinPatchPolling(3000)

  const wizardSteps = WIN_PATCH_ROLLBACK_WIZARD_STEPS
  const lastStepIndex = wizardSteps.length - 1
  const currentStepKey = computed(() => wizardSteps[activeStep.value]?.key || 'summary')
  const currentStepSkippable = computed(() => {
    return ['pre-check', 'validate', 'restart'].includes(currentStepKey.value)
  })
  const currentStepSkipped = computed(() => {
    return Boolean(skippedSteps.value[currentStepKey.value])
  })
  const currentTaskId = computed(() => {
    return String(
      pickValue(taskDetail.value, ['id'], '') || pickValue(createdTask.value, ['id'], '')
    ).trim()
  })
  const dialogBusy = computed(() => {
    return executionSubmitting.value || pipelineStatus.value === 'running'
  })
  const selectedHistUpdateIds = computed(() => {
    const rows = Array.isArray(selectedRows?.value) ? selectedRows.value : []
    return Array.from(new Set(rows.map(row => resolveHistUpdateId(row)).filter(Boolean)))
  })
  const selectedRollbackItems = computed(() => {
    const rows = Array.isArray(selectedRows?.value) ? selectedRows.value : []
    return rows.map(row => ({
      id: resolveHistUpdateId(row),
      kbNumber: pickValue(
        row,
        ['updateKbNumbers', 'update_kb_numbers', 'kbNumber', 'kb_number'],
        '-'
      ),
      title: pickValue(row, ['title'], ''),
      hostId: resolveHostId(row),
      hostKey: resolveHostKey(row),
      runId: pickValue(row, ['runId', 'run_id'], ''),
      updateTime: pickValue(
        row,
        ['updateTime', 'update_time', 'executedDate', 'executed_date'],
        ''
      ),
      severity: pickValue(row, ['severity'], ''),
      severityLabel: getSeverityLabel(pickValue(row, ['severity'], ''))
    }))
  })
  const selectedHostItems = computed(() => {
    const seen = new Set()

    return selectedRollbackItems.value
      .filter(item => {
        const key = `${item.hostId || ''}::${item.hostKey || ''}`
        if (seen.has(key)) {
          return false
        }

        seen.add(key)
        return true
      })
      .map(item => ({
        hostId: item.hostId,
        hostKey: item.hostKey
      }))
  })
  const selectedHostIds = computed(() => {
    return Array.from(new Set(selectedHostItems.value.map(item => item.hostId).filter(Boolean)))
  })
  const currentTaskStatus = computed(() => getTaskStatusValue(taskDetail.value))
  const currentPipelineStep = computed(() => resolvePipelineCurrentStep(taskDetail.value))
  const stepKeyToSkipKeyMap = {
    PRE_CHECK: 'pre-check',
    ROLLBACK: 'execute',
    RESTART: 'restart',
    VALIDATE: 'validate'
  }

  const pipelineItems = computed(() => {
    return WIN_PATCH_ROLLBACK_PIPELINE_STEPS.map(step => {
      const auditStep = findAuditStep(
        taskAuditSteps.value,
        resolvePipelineStepKeys(step.key, taskDetail.value)
      )
      const auditStatus = normalizeUpper(auditStep?.status)
      const skipKey = stepKeyToSkipKeyMap[normalizeUpper(step.key)]
      const isSkipped = skipKey ? Boolean(skippedSteps.value[skipKey]) : false

      const uiStatus = resolvePipelineStepUiStatus({
        stepKey: step.key,
        auditStatus,
        task: taskDetail.value,
        pipelineStatus: pipelineStatus.value,
        isSkipped
      })

      return {
        key: step.key,
        label: step.label,
        runId: String(auditStep?.runId || '').trim(),
        remark: String(auditStep?.remark || '').trim(),
        status: auditStatus || 'PENDING',
        uiStatus
      }
    })
  })
  const pipelineItemMap = computed(() => {
    return pipelineItems.value.reduce((result, item) => {
      result[item.key] = item
      return result
    }, {})
  })
  const availableRunItems = computed(() => {
    const candidates = [
      {
        key: 'main',
        get label() { return t('patches.windows.mainExecution') },
        runId: String(pickValue(taskDetail.value, ['runId', 'run_id'], '')).trim()
      },
      {
        key: 'PRE_CHECK',
        get label() { return t('patches.linux.precheck') },
        runId: String(pickValue(taskDetail.value, ['preCheckRunId', 'pre_check_run_id'], '')).trim()
      },
      {
        key: 'ROLLBACK',
        get label() { return t('patches.windows.executeRollback') },
        runId: String(pickValue(taskDetail.value, ['executeRunId', 'execute_run_id'], '')).trim()
      },
      {
        key: 'RESTART',
        get label() { return t('patches.linux.executeRestart') },
        runId: String(pickValue(taskDetail.value, ['restartRunId', 'restart_run_id'], '')).trim()
      },
      {
        key: 'VALIDATE',
        get label() { return t('patches.windows.executeValidation') },
        runId: String(pickValue(taskDetail.value, ['validateRunId', 'validate_run_id'], '')).trim()
      }
    ]

    const seen = new Set()
    return candidates.filter(item => {
      if (!item.runId || seen.has(item.runId)) {
        return false
      }

      seen.add(item.runId)
      return true
    })
  })
  const wizardStepStates = computed(() => {
    return wizardSteps.map((step, index) => {
      if (step.key === 'execute') {
        if (pipelineStatus.value === 'failed') return 'failed'
        if (pipelineStatus.value === 'success') return 'success'
      }

      if (index < activeStep.value) return 'success'
      if (index === activeStep.value) return 'active'
      return 'idle'
    })
  })
  const canGoBack = computed(() => {
    return activeStep.value > 0 && !dialogBusy.value && !currentTaskId.value
  })
  const canGoNext = computed(() => {
    return activeStep.value < lastStepIndex && !dialogBusy.value && !currentTaskId.value
  })

  async function loadTaskRuntime(options = {}) {
    const session = sessionId
    if (!currentTaskId.value) {
      return null
    }

    runtimeLoading.value = !options.silent

    try {
      const detailResponse = await winPatchApi.getTaskDetail(currentTaskId.value)
      checkSession(session)
      const detailData = unwrapResponse(detailResponse)
      const baseTask = detailData?.task || detailData || null
      const nextAuditSteps = Array.isArray(detailData?.steps) ? detailData.steps : []
      const nextAuditLogs = Array.isArray(detailData?.logs) ? detailData.logs : []

      taskHosts.value = Array.isArray(detailData?.hosts) ? detailData.hosts : []
      taskAuditSteps.value = nextAuditSteps
      taskAuditLogs.value = nextAuditLogs

      const mergedTask = mergeTaskDetail(
        baseTask,
        null,
        nextAuditSteps,
        nextAuditLogs,
        taskHosts.value
      )

      taskDetail.value = mergedTask
      if (mergedTask) {
        createdTask.value = {
          ...(createdTask.value || {}),
          ...mergedTask
        }
      }
      taskErrorMessage.value = String(
        pickValue(mergedTask, ['errorMessage', 'error_message'], '')
      ).trim()

      return mergedTask
    } catch (error) {
      if (!options.silent) {
        ElMessage.error(t('patches.windows.rollbackDetailLoadFailed'))
      }
      const queryError = createWinPatchError(error, 'patches.windows.rollbackQueryFailed')
      queryError.queryInterrupted = true
      throw queryError
    } finally {
      if (session === sessionId) runtimeLoading.value = false
    }
  }

  function applyTaskSnapshot(taskSnapshot = null) {
    if (!taskSnapshot || typeof taskSnapshot !== 'object') {
      return
    }

    const nextTask = {
      ...(taskDetail.value || createdTask.value || {}),
      ...taskSnapshot
    }

    taskDetail.value = nextTask
    createdTask.value = {
      ...(createdTask.value || {}),
      ...taskSnapshot
    }
    taskErrorMessage.value = String(
      pickValue(nextTask, ['errorMessage', 'error_message'], '')
    ).trim()
  }

  async function ensureTaskCreated() {
    const session = sessionId
    if (currentTaskId.value) {
      return currentTaskId.value
    }

    if (!selectedHistUpdateIds.value.length) {
      throw createPatchTaskError('patches.windows.noRollbackableSelection')
    }

    if (!selectedHostIds.value.length) {
      throw createPatchTaskError('patches.windows.missingRollbackHost')
    }

    taskHostIds = [...selectedHostIds.value]
    const response = await winPatchApi.createRollbackTask({
      hostIds: taskHostIds,
      histUpdateIds: selectedHistUpdateIds.value,
      reboot: rollbackOptions.value.reboot,
      rescanAfter: rollbackOptions.value.rescanAfter,
      ...planDraft.value
    })
    checkSession(session)
    const task = unwrapResponse(response)
    const taskId = String(pickValue(task, ['id'], '')).trim()

    if (!taskId) {
      throw createPatchTaskError('patches.windows.createRollbackFailed')
    }

    createdTask.value = task
    taskErrorMessage.value = ''

    if (typeof onSubmitted === 'function') {
      onSubmitted(task)
    }

    await loadTaskRuntime({ silent: true })
    return taskId
  }

  async function syncScriptConfig(scriptType, scriptConfig, label) {
    if (!currentTaskId.value) {
      return
    }

    try {
      if (scriptConfig.mode === 'upload') {
        const file = resolveUploadedScriptFile(scriptConfig)
        if (!file) {
          return
        }

        await winPatchApi.uploadTaskScript(currentTaskId.value, scriptType, file)
        return
      }

      await winPatchApi.updateTaskScript(
        currentTaskId.value,
        scriptType,
        String(scriptConfig.content || '')
      )
    } catch (error) {
      throw createWinPatchError(error, scriptConfig.mode === 'upload' ? 'patches.windows.stepUploadFailed' : 'patches.windows.stepSaveFailed', () => ({ p0: label() }))
    }
  }

  function getAuditStepStatus(stepKey) {
    return normalizeUpper(
      findAuditStep(taskAuditSteps.value, resolvePipelineStepKeys(stepKey, taskDetail.value))
        ?.status
    )
  }

  function stopRuntimePolling() {
    stop()
  }

  function waitForStepCompletion(stepKey, actionLabel) {
    const normalizedStepKey = normalizeUpper(stepKey)
    const session = sessionId

    return new Promise((resolve, reject) => {
      let settled = false
      let queryFailures = 0
      const successStatuses = getStepSuccessStatuses(stepKey)
      const failedStatuses = getStepFailedStatuses(stepKey)

      const finalize = (success, error = null) => {
        if (settled) {
          return
        }

        settled = true
        cancelWait = null
        stopRuntimePolling()

        if (success) {
          resolve(true)
          return
        }

        reject(error || createWinPatchError(null, 'patches.windows.operationFailed', () => ({ p0: actionLabel() })))
      }
      cancelWait = () => finalize(false, createPatchTaskError('patches.windows.rollbackWizardClosed'))

      const evaluate = () => {
        const stepStatus = getAuditStepStatus(stepKey)
        const rawTaskStatus = normalizeUpper(
          pickValue(taskDetail.value, ['taskStatus', 'task_status', 'status'], '')
        )
        const taskStatus = getTaskStatusValue(taskDetail.value)
        const currentStep = normalizeUpper(resolvePipelineCurrentStep(taskDetail.value))
        const runningStatuses = getStepRunningStatuses(stepKey)
        const isMainTaskRunningCurrentStep =
          currentStep === normalizedStepKey &&
          (['RUNNING', 'IN_PROGRESS'].includes(taskStatus) ||
            ['RUNNING', 'IN_PROGRESS'].includes(rawTaskStatus))

        // 如果主任务状态表明当前步骤仍处于运行态，或聚合审计状态仍处于运行态，继续轮询等待
        if (
          runningStatuses.includes(rawTaskStatus) ||
          runningStatuses.includes(taskStatus) ||
          stepStatus === 'RUNNING' ||
          isMainTaskRunningCurrentStep
        ) {
          return
        }

        // 执行或跳过重启都须等待主任务进入 RESTART_DONE，审计状态不能替代校验前置条件
        if (normalizedStepKey === 'RESTART') {
          if (rawTaskStatus === 'RESTART_DONE') {
            finalize(true)
            return
          }

          if (
            ['FAILED', 'ERROR'].includes(rawTaskStatus) ||
            ['FAILED', 'ERROR'].includes(taskStatus) ||
            failedStatuses.includes(rawTaskStatus) ||
            failedStatuses.includes(taskStatus) ||
            ['FAILED', 'ERROR'].includes(stepStatus)
          ) {
            finalize(false, createWinPatchError(taskErrorMessage.value ? new Error(taskErrorMessage.value) : null, 'patches.windows.operationFailed', () => ({ p0: actionLabel() })))
            return
          }

          // 中间状态（RESTARTING, RESTART_RUNNING, ROLLBACK_DONE 等）继续轮询
          return
        }

        if (['SUCCESS', 'SKIPPED'].includes(stepStatus)) {
          finalize(true)
          return
        }

        if (successStatuses.includes(taskStatus) || successStatuses.includes(rawTaskStatus)) {
          finalize(true)
          return
        }

        if (
          ['FAILED', 'ERROR'].includes(stepStatus) ||
          ['FAILED', 'ERROR'].includes(taskStatus) ||
          ['FAILED', 'ERROR'].includes(rawTaskStatus) ||
          failedStatuses.includes(taskStatus) ||
          failedStatuses.includes(rawTaskStatus)
        ) {
          finalize(false, createWinPatchError(taskErrorMessage.value ? new Error(taskErrorMessage.value) : null, 'patches.windows.operationFailed', () => ({ p0: actionLabel() })))
          return
        }
      }

      start(
        async () => {
          try {
            await loadTaskRuntime({ silent: true })
            checkSession(session)
            queryFailures = 0
            evaluate()
          } catch {
            if (session !== sessionId || settled) return
            queryFailures += 1
            if (queryFailures >= 3) {
              const queryError = createPatchTaskError('patches.windows.threeQueriesFailed')
              queryError.queryInterrupted = true
              finalize(false, queryError)
            }
          }
        },
        { immediate: true }
      )
    })
  }

  async function triggerTaskStep(stepKey, action, executeOptions = {}) {
    const session = sessionId
    const normalizedStepKey = normalizeUpper(stepKey)
    const currentStatus = getAuditStepStatus(stepKey)
    const rawTaskStatus = normalizeUpper(
      pickValue(taskDetail.value, ['taskStatus', 'task_status', 'status'], '')
    )
    if (normalizedStepKey === 'RESTART') {
      if (rawTaskStatus === 'RESTART_DONE') {
        return
      }
    } else if (['SUCCESS', 'SKIPPED'].includes(currentStatus)) {
      return
    }

    if (
      ['RUNNING', 'IN_PROGRESS'].includes(currentStatus) ||
      (normalizedStepKey === 'RESTART' && ['RESTARTING', 'RESTART_RUNNING'].includes(rawTaskStatus))
    ) {
      const stepLabel = () =>
        WIN_PATCH_ROLLBACK_PIPELINE_STEPS.find(item => item.key === stepKey)?.label || stepKey
      await waitForStepCompletion(stepKey, stepLabel)
      return
    }

    if (!currentTaskId.value) {
      throw createPatchTaskError('patches.windows.rollbackNotCreated')
    }

    const stepLabel = () =>
      WIN_PATCH_ROLLBACK_PIPELINE_STEPS.find(item => item.key === stepKey)?.label || stepKey
    const actionLabel = () => action === 'skip' ? t('patches.windows.skipNamedStep', { p0: stepLabel() }) : stepLabel()

    try {
      const response =
        action === 'skip'
          ? await winPatchApi.skipTaskStep(currentTaskId.value, taskDetail.value, {
              stepKey,
              taskType: 'ROLLBACK'
            })
          : await winPatchApi.executeTaskStep(currentTaskId.value, taskDetail.value, {
              stepKey,
              taskType: 'ROLLBACK',
              ...executeOptions
            })
      checkSession(session)
      applyTaskSnapshot(unwrapResponse(response))

      if (action === 'skip' && normalizedStepKey !== 'RESTART') {
        taskAuditSteps.value = taskAuditSteps.value.map(step => {
          if (normalizeUpper(step?.step) !== normalizedStepKey) {
            return step
          }

          return {
            ...step,
            status: 'SKIPPED'
          }
        })
      }
      await waitForStepCompletion(stepKey, actionLabel)
    } catch (error) {
      if (error.queryInterrupted) throw error
      throw createWinPatchError(error, 'patches.windows.operationFailed', () => ({ p0: actionLabel() }))
    }
  }

  async function startExecution() {
    if (dialogBusy.value) {
      return
    }

    const session = sessionId
    executionSubmitting.value = true
    pipelineStatus.value = 'running'
    taskErrorMessage.value = ''
    activeStep.value = lastStepIndex

    try {
      if (currentTaskId.value && !resumePolling) {
        await loadTaskRuntime({ silent: true })
        checkSession(session)
      }
      await ensureTaskCreated()
      checkSession(session)
      if (!scriptsSynced && !skippedSteps.value['pre-check']) {
        await syncScriptConfig('pre-check', preScriptConfig.value, () => t('patches.windows.preCheckScript'))
        checkSession(session)
      }
      if (!scriptsSynced && !skippedSteps.value.validate) {
        await syncScriptConfig('validate', validateScriptConfig.value, () => t('patches.linux.validationScript'))
        checkSession(session)
      }
      scriptsSynced = true
      if (pendingApproval.value) {
        pipelineStatus.value = 'idle'
        ElMessage.success(t('patches.linux.applicationSubmitted'))
        return
      }
      const steps = [
        [
          'PRE_CHECK',
          skippedSteps.value['pre-check'] || !hasConfiguredScript(preScriptConfig.value)
            ? 'skip'
            : 'execute'
        ],
        ['ROLLBACK', 'execute'],
        [
          'RESTART',
          skippedSteps.value.restart || !rollbackOptions.value.reboot ? 'skip' : 'execute'
        ],
        [
          'VALIDATE',
          skippedSteps.value.validate || !hasConfiguredScript(validateScriptConfig.value)
            ? 'skip'
            : 'execute'
        ]
      ]
      for (; resumeStep < steps.length; resumeStep += 1) {
        const [stepKey, action] = steps[resumeStep]
        try {
          if (resumePolling) {
            await waitForStepCompletion(
              stepKey,
              WIN_PATCH_ROLLBACK_PIPELINE_STEPS.find(step => step.key === stepKey)?.label || stepKey
            )
          } else {
            await triggerTaskStep(stepKey, action, { confirmText: '确认重启', isCurrent: () => session === sessionId })
          }
          checkSession(session)
          resumePolling = false
        } catch (error) {
          if (error.queryInterrupted && session === sessionId) resumePolling = true
          throw error
        }
      }
      await loadTaskRuntime({ silent: true })
      checkSession(session)

      if (rollbackOptions.value.rescanAfter && !scanSubmitted) {
        try {
          await winPatchApi.createScanTask(taskHostIds)
        } catch (error) {
          throw createWinPatchError(null, 'patches.windows.rollbackRescanFailed', () => ({ p0: resolveApiErrorMessage(error, t('patches.windows.rescanLater')) }))
        }
        checkSession(session)
        scanSubmitted = true
        ElMessage.info(t('patches.windows.rollbackCompletedRescan'))
      }

      pipelineStatus.value = 'success'
      ElMessage.success(t('patches.windows.rollbackCompleted'))

      if (typeof onSuccess === 'function') {
        onSuccess(taskDetail.value || createdTask.value || null)
      }
    } catch (error) {
      if (session !== sessionId) return
      if (isChangeControlCancelled(error)) {
        pipelineStatus.value = currentTaskId.value ? 'paused' : 'idle'
        return
      }
      pipelineStatus.value = !currentTaskId.value ? 'idle' :
        error.queryInterrupted || error?.response?.status === 400 ? 'paused' : 'failed'
      taskErrorMessage.value = getWinPatchErrorFeedback(error, localMessage('patches.windows.rollbackFailed'))
      ElMessage.error(taskErrorMessage.value)
    } finally {
      if (session === sessionId) {
        executionSubmitting.value = false
        stopRuntimePolling()
      }
    }
  }

  function updateRollbackOptions(value = {}) {
    rollbackOptions.value = {
      reboot: Boolean(value?.reboot),
      rescanAfter: Boolean(value?.rescanAfter)
    }
  }

  function updatePreScriptConfig(value = {}) {
    preScriptConfig.value = normalizeScriptConfig(value)
  }

  function updateValidateScriptConfig(value = {}) {
    validateScriptConfig.value = normalizeScriptConfig(value)
  }

  function goNext() {
    if (!canGoNext.value) {
      return
    }

    if (currentStepSkippable.value) {
      skippedSteps.value = {
        ...skippedSteps.value,
        [currentStepKey.value]: false
      }
    }

    activeStep.value += 1
  }

  function goBack() {
    if (!canGoBack.value) {
      return
    }

    activeStep.value -= 1
  }

  function skipCurrentStep() {
    if (
      !currentStepSkippable.value ||
      dialogBusy.value ||
      currentTaskId.value ||
      !canGoNext.value
    ) {
      return
    }

    skippedSteps.value = {
      ...skippedSteps.value,
      [currentStepKey.value]: true
    }
    activeStep.value += 1
  }

  function openRunResult(runId, title = '', titleKey = '') {
    if (!runId) {
      return
    }

    currentRunId.value = runId
    currentRunTitle.value = getWinPatchRunTitle(titleKey, title || localMessage('patches.windows.windowsRollbackTask'))
    showRunResultDialog.value = true
  }

  function clearRunResult() {
    showRunResultDialog.value = false
    currentRunId.value = ''
    currentRunTitle.value = ''
  }

  function resetState() {
    sessionId += 1
    cancelWait?.()
    stopRuntimePolling()
    resumeStep = 0
    resumePolling = false
    scriptsSynced = false
    scanSubmitted = false
    taskHostIds = []
    activeStep.value = 0
    rollbackOptions.value = createRollbackOptions()
    preScriptConfig.value = createScriptConfig()
    validateScriptConfig.value = createScriptConfig()
    skippedSteps.value = createSkippedSteps()
    executionSubmitting.value = false
    runtimeLoading.value = false
    createdTask.value = null
    planDraft.value = {}
    taskDetail.value = null
    taskHosts.value = []
    taskAuditSteps.value = []
    taskAuditLogs.value = []
    taskErrorMessage.value = ''
    pipelineStatus.value = 'idle'
    clearRunResult()
  }

  onUnmounted(resetState)

  return {
    activeStep,
    availableRunItems,
    canGoBack,
    canGoNext,
    clearRunResult,
    currentRunId,
    currentRunTitle,
    currentStepKey,
    currentStepSkipped,
    currentStepSkippable,
    currentTaskId,
    dialogBusy,
    executionSubmitting,
    goBack,
    goNext,
    openRunResult,
    pipelineItemMap,
    pipelineItems,
    pipelineStatus,
    preScriptConfig,
    resetState,
    rollbackOptions,
    selectedHostItems,
    selectedHistUpdateIds,
    selectedRollbackItems,
    showRunResultDialog,
    skipCurrentStep,
    skippedSteps,
    planDraft,
    pendingApproval,
    startExecution,
    taskErrorMessage,
    updatePreScriptConfig,
    updateRollbackOptions,
    updateValidateScriptConfig,
    validateScriptConfig,
    wizardStepStates,
    wizardSteps
  }
}

export default useWinPatchRollbackWizard
