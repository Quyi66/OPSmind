import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../api'
import {
  getPatchTaskDisplayConfig,
  getPatchTaskWizardSteps,
  resolvePatchTaskDisplayType
} from '../constants/task-display'
import {
  buildAffectedPackageList,
  buildDetailSelectionItems,
  buildPipelineItem,
  buildRestartAlert,
  buildScriptAlert,
  getLatestRecord,
  getRecordDisplayState,
  isExecutionRecord,
  sortAuditHistory,
  stepStatusToDisplayState,
  toDisplayArray
} from '../utils/patchProcessLogs'

const SCRIPT_STEP = 'SCRIPT'
const PRE_CHECK_STEP = 'PRE_CHECK'
const VALIDATE_STEP = 'VALIDATE'
const RESTART_STEP = 'RESTART'

export function usePatchProcessLogDetail(sourceTask) {
  const loading = ref(false)
  const task = ref(null)
  const history = ref([])
  const steps = ref([])
  const currentStep = ref(0)
  let requestVersion = 0

  const taskType = computed(() => task.value?.taskType || sourceTask.value?.taskType || 'install')
  const displayType = computed(() => resolvePatchTaskDisplayType({ taskType: taskType.value }))
  const operationConfig = computed(() => getPatchTaskDisplayConfig(displayType.value))
  const wizardSteps = computed(() => getPatchTaskWizardSteps(displayType.value))
  const currentStepKey = computed(() => wizardSteps.value[currentStep.value]?.key || 'select')

  const sortedHistory = computed(() => sortAuditHistory(history.value))
  const preCheckRecords = computed(() =>
    sortedHistory.value.filter(
      record =>
        record.step === PRE_CHECK_STEP ||
        (record.step === SCRIPT_STEP && normalizeScriptType(record) === 'pre-check')
    )
  )
  const validateRecords = computed(() =>
    sortedHistory.value.filter(
      record =>
        record.step === VALIDATE_STEP ||
        (record.step === SCRIPT_STEP && normalizeScriptType(record) === 'validate')
    )
  )
  const restartRecords = computed(() =>
    sortedHistory.value.filter(record => record.step === RESTART_STEP)
  )
  const executeRecords = computed(() =>
    sortedHistory.value.filter(record => ['INSTALL', 'ROLLBACK'].includes(record.step))
  )

  const selectionItems = computed(() => buildDetailSelectionItems(task.value, history.value))
  const hosts = computed(() => toDisplayArray(task.value?.hostIds))
  const affectedPackages = computed(() => buildAffectedPackageList(task.value, history.value))
  const preCheckScript = computed(
    () =>
      getLatestRecord(
        preCheckRecords.value,
        record => record.step === SCRIPT_STEP && normalizeScriptType(record) === 'pre-check'
      )?.scriptContent ||
      task.value?.preCheckScript ||
      ''
  )
  const validateScript = computed(
    () =>
      getLatestRecord(
        validateRecords.value,
        record => record.step === SCRIPT_STEP && normalizeScriptType(record) === 'validate'
      )?.scriptContent ||
      task.value?.validateScript ||
      ''
  )

  const latestPreCheckRecord = computed(() =>
    getLatestRecord(preCheckRecords.value, isExecutionRecord)
  )
  const latestValidateRecord = computed(() =>
    getLatestRecord(validateRecords.value, isExecutionRecord)
  )
  const latestRestartRecord = computed(() =>
    getLatestRecord(restartRecords.value, isExecutionRecord)
  )
  const latestExecuteRecord = computed(() =>
    getLatestRecord(executeRecords.value, isExecutionRecord)
  )

  const preCheckAlert = computed(() =>
    buildScriptAlert(
      'pre',
      latestPreCheckRecord.value,
      preCheckScript.value,
      getStepStatus(PRE_CHECK_STEP)
    )
  )
  const validateAlert = computed(() =>
    buildScriptAlert(
      'validate',
      latestValidateRecord.value,
      validateScript.value,
      getStepStatus(VALIDATE_STEP)
    )
  )
  const restartAlert = computed(() =>
    buildRestartAlert(task.value, latestRestartRecord.value, getStepStatus(RESTART_STEP))
  )

  const preCheckRunId = computed(() =>
    resolveRunId(PRE_CHECK_STEP, latestPreCheckRecord.value, task.value?.preCheckRunId)
  )
  const validateRunId = computed(() =>
    resolveRunId(VALIDATE_STEP, latestValidateRecord.value, task.value?.validateRunId)
  )
  const restartRunId = computed(() =>
    resolveRunId(RESTART_STEP, latestRestartRecord.value, task.value?.restartRunId)
  )

  const pipelineItems = computed(() => {
    const executeStep = taskType.value === 'rollback' ? 'ROLLBACK' : 'INSTALL'

    return [
      buildPipelineItem('pre-check', '预检查', preCheckRecords.value, {
        fallbackRunId: task.value?.preCheckRunId || '',
        stepStatus: getStepStatus(PRE_CHECK_STEP),
        stepRunId: getStepRunId(PRE_CHECK_STEP)
      }),
      buildPipelineItem(
        taskType.value === 'rollback' ? 'rollback' : 'execute',
        operationConfig.value.executeTitle,
        executeRecords.value,
        {
          fallbackRunId: task.value?.executeRunId || '',
          stepStatus: getStepStatus(executeStep),
          stepRunId: getStepRunId(executeStep)
        }
      ),
      buildPipelineItem('restart', '重启策略', restartRecords.value, {
        treatNoneAsSuccess: task.value?.restartType === 'none',
        fallbackRunId: task.value?.restartRunId || '',
        stepStatus: getStepStatus(RESTART_STEP),
        stepRunId: getStepRunId(RESTART_STEP)
      }),
      buildPipelineItem('validate', '脚本校验', validateRecords.value, {
        fallbackRunId: task.value?.validateRunId || '',
        stepStatus: getStepStatus(VALIDATE_STEP),
        stepRunId: getStepRunId(VALIDATE_STEP)
      })
    ]
  })

  async function load() {
    const version = ++requestVersion
    initializeFromSource()

    const taskId = sourceTask.value?.id || sourceTask.value?.taskId
    if (!taskId) return

    loading.value = true
    try {
      const response = await patchInstallApi.getAuditDetail(taskId)
      if (version !== requestVersion) return

      const detail = response?.data || response || {}
      task.value = detail.task || sourceTask.value || null
      steps.value = Array.isArray(detail.steps) ? detail.steps : []
      history.value = Array.isArray(detail.logs) ? detail.logs : []
    } catch {
      await loadLegacyDetail(taskId, version)
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  function reset() {
    requestVersion += 1
    loading.value = false
    task.value = null
    history.value = []
    steps.value = []
    currentStep.value = 0
  }

  function getWizardStepState(stepKey) {
    if (stepKey === 'select') return task.value ? 'success' : 'idle'
    if (stepKey === 'pre') {
      return resolveStepState(PRE_CHECK_STEP, latestPreCheckRecord.value, preCheckRecords.value)
    }
    if (stepKey === 'validate') {
      return resolveStepState(VALIDATE_STEP, latestValidateRecord.value, validateRecords.value)
    }
    if (stepKey === 'restart') {
      if (task.value?.restartType === 'none' && restartRecords.value.length === 0) {
        return 'success'
      }
      return resolveStepState(RESTART_STEP, latestRestartRecord.value, restartRecords.value)
    }
    if (stepKey === 'execute') {
      const executeStep = taskType.value === 'rollback' ? 'ROLLBACK' : 'INSTALL'
      return resolveStepState(executeStep, latestExecuteRecord.value, executeRecords.value)
    }
    return 'idle'
  }

  async function loadLegacyDetail(taskId, version) {
    const [taskResult, historyResult] = await Promise.allSettled([
      patchInstallApi.getTask(taskId),
      patchInstallApi.getTaskAuditHistoryAll(taskId)
    ])
    if (version !== requestVersion) return

    if (taskResult.status === 'fulfilled') {
      task.value = taskResult.value?.data || taskResult.value || sourceTask.value
    }
    if (historyResult.status === 'fulfilled') {
      const historyData = historyResult.value?.data || historyResult.value || []
      history.value = Array.isArray(historyData) ? historyData : []
    }
    if (taskResult.status === 'rejected' || historyResult.status === 'rejected') {
      ElMessage.warning('部分详情数据加载失败，已展示当前可用信息')
    }
  }

  function initializeFromSource() {
    loading.value = false
    task.value = sourceTask.value || null
    history.value = []
    steps.value = []
    currentStep.value = 0
  }

  function findStep(stepKey) {
    return steps.value.find(step => step.step === stepKey) || null
  }

  function getStepStatus(stepKey) {
    return findStep(stepKey)?.status || null
  }

  function getStepRunId(stepKey) {
    return findStep(stepKey)?.runId || ''
  }

  function resolveRunId(stepKey, latestRecord, fallbackRunId) {
    return getStepRunId(stepKey) || latestRecord?.runId || fallbackRunId || ''
  }

  function resolveStepState(stepKey, latestRecord, records) {
    const stepStatus = getStepStatus(stepKey)
    if (stepStatus) return stepStatusToDisplayState(stepStatus)
    return getRecordDisplayState(latestRecord || getLatestRecord(records))
  }

  return {
    loading,
    task,
    currentStep,
    currentStepKey,
    operationConfig,
    wizardSteps,
    selectionItems,
    hosts,
    affectedPackages,
    preCheckScript,
    validateScript,
    preCheckAlert,
    validateAlert,
    restartAlert,
    preCheckRunId,
    validateRunId,
    restartRunId,
    pipelineItems,
    load,
    reset,
    getWizardStepState
  }
}

function normalizeScriptType(record) {
  return String(record?.scriptType || '').toLowerCase()
}
