import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../api'
import { WIN_PATCH_INSTALL_PIPELINE_STEPS, WIN_PATCH_INSTALL_WIZARD_STEPS } from '../constants'
import { useWinPatchPolling } from './useWinPatchPolling'
import {
  getSeverityLabel,
  getTaskStatusValue,
  normalizeUpper,
  pickValue,
  resolveHostId,
  resolvePatchStatusId,
  unwrapResponse
} from '../utils'

function getStepSuccessStatuses(stepKey) {
  switch (normalizeUpper(stepKey)) {
    case 'PRE_CHECK':
      return ['PRE_CHECK_DONE']
    case 'INSTALL':
      return ['INSTALL_DONE']
    case 'RESTART':
      return ['RESTART_DONE']
    case 'VALIDATE':
      return ['COMPLETED']
    default:
      return []
  }
}

function getStepFailedStatuses(stepKey) {
  switch (normalizeUpper(stepKey)) {
    case 'PRE_CHECK':
      return ['PRE_CHECK_FAILED', 'FAILED']
    case 'INSTALL':
      return ['INSTALL_FAILED', 'FAILED']
    case 'RESTART':
      return ['FAILED']
    case 'VALIDATE':
      return ['VALIDATE_FAILED', 'FAILED']
    default:
      return ['FAILED', 'ERROR']
  }
}

function createInstallOptions() {
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

function resolveApiErrorMessage(error, fallback = '安装任务执行失败，请稍后重试') {
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

function findAuditStep(steps = [], stepKey) {
  const normalizedKeys = (Array.isArray(stepKey) ? stepKey : [stepKey])
    .map(key => normalizeUpper(key))
    .filter(Boolean)

  return steps.find(step => normalizedKeys.includes(getAuditStepKey(step))) || null
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
  const currentStep = normalizeUpper(pickValue(task, ['currentStep', 'current_step'], ''))
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
  const installStep = findAuditStep(auditSteps, resolveExecuteStepKeys(mergedTask))
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

  if (!pickValue(mergedTask, ['executeRunId', 'execute_run_id'], '') && installStep?.runId) {
    mergedTask.executeRunId = installStep.runId
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

export function useWinPatchInstallWizard({
  hostSummary,
  selectedRows,
  onSubmitted,
  onSuccess
} = {}) {
  const activeStep = ref(0)
  const installOptions = ref(createInstallOptions())
  const preScriptConfig = ref(createScriptConfig())
  const validateScriptConfig = ref(createScriptConfig())
  const skippedSteps = ref(createSkippedSteps())
  const executionSubmitting = ref(false)
  const runtimeLoading = ref(false)
  const createdTask = ref(null)
  const taskDetail = ref(null)
  const taskHosts = ref([])
  const taskAuditSteps = ref([])
  const taskAuditLogs = ref([])
  const taskErrorMessage = ref('')
  const pipelineStatus = ref('idle')
  const showRunResultDialog = ref(false)
  const currentRunId = ref('')
  const currentRunTitle = ref('')

  const { start, stop } = useWinPatchPolling(3000)

  const wizardSteps = WIN_PATCH_INSTALL_WIZARD_STEPS
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
  const selectedPatchStatusIds = computed(() => {
    const rows = Array.isArray(selectedRows?.value) ? selectedRows.value : []
    return Array.from(new Set(rows.map(row => resolvePatchStatusId(row)).filter(Boolean)))
  })
  const selectedHostIds = computed(() => {
    const rows = Array.isArray(selectedRows?.value) ? selectedRows.value : []
    const rowHostIds = rows
      .map(row => String(pickValue(row, ['hostId', 'host_id'], '')).trim())
      .filter(Boolean)
    const fallbackHostId = resolveHostId(hostSummary?.value || hostSummary)

    return Array.from(new Set([...rowHostIds, fallbackHostId].filter(Boolean)))
  })
  const selectedPatchItems = computed(() => {
    const rows = Array.isArray(selectedRows?.value) ? selectedRows.value : []
    return rows.map(row => ({
      id: resolvePatchStatusId(row),
      kbNumber: pickValue(row, ['kbNumber', 'kb_number'], '-'),
      title: pickValue(row, ['title'], '-'),
      severity: pickValue(row, ['severity'], ''),
      severityLabel: getSeverityLabel(pickValue(row, ['severity'], '')),
      cveIds: pickValue(row, ['cveIds', 'cve_ids'], '')
    }))
  })
  const currentTaskStatus = computed(() => getTaskStatusValue(taskDetail.value))
  const currentPipelineStep = computed(() => resolvePipelineCurrentStep(taskDetail.value))
  const pipelineItems = computed(() => {
    return WIN_PATCH_INSTALL_PIPELINE_STEPS.map(step => {
      const auditStep = findAuditStep(
        taskAuditSteps.value,
        resolvePipelineStepKeys(step.key, taskDetail.value)
      )
      const auditStatus = normalizeUpper(auditStep?.status)
      let uiStatus = mapPipelineUiStatus(auditStatus)

      if (!auditStatus && currentTaskId.value && currentPipelineStep.value === step.key) {
        if (
          ['FAILED', 'ERROR'].includes(currentTaskStatus.value) ||
          pipelineStatus.value === 'failed'
        ) {
          uiStatus = 'failed'
        } else if (pipelineStatus.value === 'running') {
          uiStatus = 'running'
        }
      }

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
        label: '主任务作业',
        runId: String(pickValue(taskDetail.value, ['runId', 'run_id'], '')).trim()
      },
      {
        label: '预检查',
        runId: String(pickValue(taskDetail.value, ['preCheckRunId', 'pre_check_run_id'], '')).trim()
      },
      {
        label: '执行安装',
        runId: String(pickValue(taskDetail.value, ['executeRunId', 'execute_run_id'], '')).trim()
      },
      {
        label: '执行重启',
        runId: String(pickValue(taskDetail.value, ['restartRunId', 'restart_run_id'], '')).trim()
      },
      {
        label: '执行校验',
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
    if (!currentTaskId.value) {
      return null
    }

    runtimeLoading.value = !options.silent

    try {
      const detailResponse = await winPatchApi.getTaskDetail(currentTaskId.value)
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
        ElMessage.error('加载 Windows 安装任务详情失败')
      }
      throw error
    } finally {
      runtimeLoading.value = false
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
    if (currentTaskId.value) {
      return currentTaskId.value
    }

    if (!selectedPatchStatusIds.value.length) {
      throw new Error('当前选择中没有可安装的补丁记录')
    }

    if (!selectedHostIds.value.length) {
      throw new Error('当前选择中缺少主机信息，无法创建安装任务')
    }

    const response = await winPatchApi.createInstallTask({
      hostIds: selectedHostIds.value,
      patchStatusIds: selectedPatchStatusIds.value,
      reboot: installOptions.value.reboot,
      rescanAfter: installOptions.value.rescanAfter
    })
    const task = unwrapResponse(response)
    const taskId = String(pickValue(task, ['id'], '')).trim()

    if (!taskId) {
      throw new Error('创建安装任务失败，请稍后重试')
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
      const actionLabel = scriptConfig.mode === 'upload' ? `${label}上传失败` : `${label}保存失败`
      throw new Error(resolveApiErrorMessage(error, actionLabel))
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
    return new Promise((resolve, reject) => {
      let settled = false
      const successStatuses = getStepSuccessStatuses(stepKey)
      const failedStatuses = getStepFailedStatuses(stepKey)

      const finalize = (success, error = null) => {
        if (settled) {
          return
        }

        settled = true
        stopRuntimePolling()

        if (success) {
          resolve(true)
          return
        }

        reject(error || new Error(`${actionLabel}失败`))
      }

      const evaluate = () => {
        const stepStatus = getAuditStepStatus(stepKey)
        const taskStatus = getTaskStatusValue(taskDetail.value)

        if (['SUCCESS', 'SKIPPED'].includes(stepStatus)) {
          finalize(true)
          return
        }

        if (successStatuses.includes(taskStatus)) {
          finalize(true)
          return
        }

        if (['FAILED', 'ERROR'].includes(stepStatus) || failedStatuses.includes(taskStatus)) {
          finalize(false, new Error(taskErrorMessage.value || `${actionLabel}失败`))
          return
        }
      }

      start(
        async () => {
          try {
            await loadTaskRuntime({ silent: true })
            evaluate()
          } catch (error) {
            finalize(false, error)
          }
        },
        { immediate: true }
      )
    })
  }

  async function triggerTaskStep(stepKey, action, executeOptions = {}) {
    const currentStatus = getAuditStepStatus(stepKey)
    if (['SUCCESS', 'SKIPPED'].includes(currentStatus)) {
      return
    }

    if (['RUNNING', 'IN_PROGRESS'].includes(currentStatus)) {
      const stepLabel =
        WIN_PATCH_INSTALL_PIPELINE_STEPS.find(item => item.key === stepKey)?.label || stepKey
      await waitForStepCompletion(stepKey, stepLabel)
      return
    }

    if (!currentTaskId.value) {
      throw new Error('安装任务尚未创建，无法继续执行')
    }

    const stepLabel =
      WIN_PATCH_INSTALL_PIPELINE_STEPS.find(item => item.key === stepKey)?.label || stepKey
    const actionLabel = action === 'skip' ? `跳过${stepLabel}` : stepLabel

    try {
      const response =
        action === 'skip'
          ? await winPatchApi.skipTaskStep(currentTaskId.value, taskDetail.value, {
              stepKey,
              taskType: 'INSTALL'
            })
          : await winPatchApi.executeTaskStep(currentTaskId.value, taskDetail.value, {
              stepKey,
              taskType: 'INSTALL',
              ...executeOptions
            })
      applyTaskSnapshot(unwrapResponse(response))

      if (action === 'skip' && stepKey !== 'RESTART') {
        taskAuditSteps.value = taskAuditSteps.value.map(step => {
          if (normalizeUpper(step?.step) !== stepKey) {
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
      throw new Error(resolveApiErrorMessage(error, `${actionLabel}失败`))
    }
  }

  async function startExecution() {
    if (dialogBusy.value) {
      return
    }

    executionSubmitting.value = true
    pipelineStatus.value = 'running'
    taskErrorMessage.value = ''
    activeStep.value = lastStepIndex

    try {
      await ensureTaskCreated()
      if (!skippedSteps.value['pre-check']) {
        await syncScriptConfig('pre-check', preScriptConfig.value, '预检查脚本')
      }
      if (!skippedSteps.value.validate) {
        await syncScriptConfig('validate', validateScriptConfig.value, '校验脚本')
      }

      await triggerTaskStep(
        'PRE_CHECK',
        skippedSteps.value['pre-check'] || !hasConfiguredScript(preScriptConfig.value)
          ? 'skip'
          : 'execute'
      )
      await triggerTaskStep('INSTALL', 'execute')
      await triggerTaskStep(
        'RESTART',
        skippedSteps.value.restart || !installOptions.value.reboot ? 'skip' : 'execute',
        { confirmText: '确认重启' }
      )
      await triggerTaskStep(
        'VALIDATE',
        skippedSteps.value.validate || !hasConfiguredScript(validateScriptConfig.value)
          ? 'skip'
          : 'execute'
      )
      await loadTaskRuntime({ silent: true })

      pipelineStatus.value = 'success'
      ElMessage.success('Windows 补丁安装流程已完成')

      if (typeof onSuccess === 'function') {
        onSuccess(taskDetail.value || createdTask.value || null)
      }
    } catch (error) {
      pipelineStatus.value = 'failed'
      taskErrorMessage.value = resolveApiErrorMessage(error, 'Windows 补丁安装流程执行失败')
      ElMessage.error(taskErrorMessage.value)
    } finally {
      executionSubmitting.value = false
      stopRuntimePolling()
    }
  }

  function updateInstallOptions(value = {}) {
    installOptions.value = {
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

  function openRunResult(runId, title = '') {
    if (!runId) {
      return
    }

    currentRunId.value = runId
    currentRunTitle.value = title || 'Windows 补丁任务'
    showRunResultDialog.value = true
  }

  function clearRunResult() {
    showRunResultDialog.value = false
    currentRunId.value = ''
    currentRunTitle.value = ''
  }

  function resetState() {
    stopRuntimePolling()
    activeStep.value = 0
    installOptions.value = createInstallOptions()
    preScriptConfig.value = createScriptConfig()
    validateScriptConfig.value = createScriptConfig()
    skippedSteps.value = createSkippedSteps()
    executionSubmitting.value = false
    runtimeLoading.value = false
    createdTask.value = null
    taskDetail.value = null
    taskHosts.value = []
    taskAuditSteps.value = []
    taskAuditLogs.value = []
    taskErrorMessage.value = ''
    pipelineStatus.value = 'idle'
    clearRunResult()
  }

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
    installOptions,
    openRunResult,
    pipelineItemMap,
    pipelineItems,
    pipelineStatus,
    preScriptConfig,
    resetState,
    runtimeLoading,
    selectedPatchItems,
    selectedPatchStatusIds,
    showRunResultDialog,
    skipCurrentStep,
    skippedSteps,
    startExecution,
    taskDetail,
    taskErrorMessage,
    taskHosts,
    updateInstallOptions,
    updatePreScriptConfig,
    updateValidateScriptConfig,
    validateScriptConfig,
    wizardStepStates,
    wizardSteps
  }
}

export default useWinPatchInstallWizard
