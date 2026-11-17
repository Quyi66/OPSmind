import { t } from '@/core/i18n'
import { formatDateTime } from '@/utils/date'
import { secopsText } from './secopsMessages'
export { formatDateTime }

const TASK_TYPE_LABELS = {
  get install() { return t('patches.linux.patchInstall') },
  get rollback() { return t('patches.linux.changeRollback') },
  get pkg_update() { return t('patches.linux.packageUpdate') },
  get vuln_fix() { return t('patches.linux.vulnFix') }
}

const TASK_TYPE_TAGS = {
  install: 'primary',
  rollback: 'info',
  pkg_update: 'warning',
  vuln_fix: 'success'
}

function normalizeTaskStatus(status) {
  return String(status ?? '').trim().toUpperCase()
}

export function getTaskStatusTagStyle(status) {
  // 保留全局浅底和边框，仅微调文字深浅，区分最终完成和审批驳回。
  const accents = {
    COMPLETED: 'success',
    REJECTED: 'danger'
  }
  const accent = accents[normalizeTaskStatus(status)]
  return accent ? { '--el-tag-text-color': `var(--el-color-${accent}-dark-2)` } : {}
}

const TASK_STATUS_LABELS = {
  get PENDING_APPROVAL() { return t('patches.linux.pendingApproval') },
  get REJECTED() { return t('patches.linux.approvalRejected') },
  get EXPIRED() { return t('patches.linux.expired') },
  get CREATED() { return t('patches.linux.created') },
  get PRE_CHECKING() { return t('patches.linux.prechecking') },
  get PRE_CHECK_DONE() { return t('patches.linux.precheckDone') },
  get PRE_CHECK_FAILED() { return t('patches.linux.precheckFailedAlt') },
  get INSTALLING() { return t('patches.linux.running') },
  get INSTALL_DONE() { return t('patches.linux.executionDone') },
  get INSTALL_FAILED() { return t('execution.ui.executionFailed') },
  get ROLLING_BACK() { return t('patches.linux.rollingBack') },
  get ROLLBACK_DONE() { return t('patches.linux.rollbackDone') },
  get ROLLBACK_FAILED() { return t('patches.linux.rollbackFailed') },
  get RESTART_PENDING() { return t('patches.linux.awaitingRestart') },
  get RESTARTING() { return t('patches.linux.restarting') },
  get RESTART_DONE() { return t('patches.linux.restartDone') },
  get VALIDATING() { return t('patches.linux.validating') },
  get VALIDATE_FAILED() { return t('patches.linux.validationFailed') },
  get COMPLETED() { return t('automation.workbench.completed') },
  get FAILED() { return t('execution.taskStatus.failed') }
}

const SUCCESSFUL_RECORD_ACTIONS = [
  'TASK_CREATED',
  'SCRIPT_UPLOAD',
  'SCRIPT_UPDATE',
  'COMPLETE',
  'RESTART_CONFIRM'
]

export function formatTaskType(taskType) {
  return secopsText(`secops.task_type.${taskType}`, TASK_TYPE_LABELS[taskType] || taskType || '-')
}

export function getTaskTypeTagType(taskType) {
  return TASK_TYPE_TAGS[taskType] || 'info'
}

export function getTaskTypeTagStyle(taskType) {
  const type = getTaskTypeTagType(taskType)
  // 回滚是恢复类操作，使用柔和紫色，与安装蓝色及失败红色区分。
  const isRollback = taskType === 'rollback'
  return {
    '--el-tag-text-color': isRollback ? '#9673c2' : `var(--el-color-${type})`,
    '--el-tag-bg-color': 'var(--el-bg-color)',
    '--el-tag-border-color': isRollback
      ? 'color-mix(in srgb, #9673c2 45%, var(--el-bg-color))'
      : `var(--el-color-${type}-light-5)`
  }
}

export function formatTaskStatus(status) {
  const code = normalizeTaskStatus(status)
  return secopsText(`secops.status.${code}`, TASK_STATUS_LABELS[code] || status || '-')
}

export function getTaskStatusTagType(status) {
  status = normalizeTaskStatus(status)
  if (status === 'PENDING_APPROVAL' || status === 'RESTART_PENDING') return 'warning'
  if (status === 'REJECTED') return 'danger'
  if (status === 'EXPIRED') return 'info'
  if (status === 'COMPLETED' || status?.endsWith('_DONE')) return 'success'
  if (status === 'FAILED' || status?.endsWith('_FAILED')) return 'danger'
  if (status?.endsWith('ING')) return 'primary'
  return 'info'
}

export function getOsIcon(osType) {
  const normalizedType = String(osType || '').toLowerCase()
  if (normalizedType.includes('windows')) return 'fab fa-windows'
  if (normalizedType.includes('linux')) return 'fab fa-linux'
  return ''
}



export function formatJsonArray(value) {
  if (!value) return ''

  const parsed = parseMaybeJson(value)
  return Array.isArray(parsed) ? parsed.filter(Boolean).join(', ') : String(value)
}

export function toDisplayArray(value) {
  const parsed = parseMaybeJson(value)

  if (Array.isArray(parsed)) {
    return parsed.map(item => String(item || '').trim()).filter(Boolean)
  }

  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

export function sortAuditHistory(history = []) {
  return [...history].sort((left, right) => {
    const sequenceDifference = Number(left?.seqNo ?? 0) - Number(right?.seqNo ?? 0)
    if (sequenceDifference !== 0) return sequenceDifference

    return toTimestamp(left?.createdTime) - toTimestamp(right?.createdTime)
  })
}

export function buildDetailSelectionItems(task, history = []) {
  if (!task) return []

  if (task.taskType === 'pkg_update') {
    return toDisplayArray(task.packages).map((entry, index) => ({
      key: `pkg-${index}-${entry}`,
      ...parsePackageEntry(entry)
    }))
  }

  if (task.taskType === 'rollback') {
    const historyUpdateIds = toDisplayArray(task.histUpdateIds)
    if (historyUpdateIds.length > 0) {
      const patchIds = toDisplayArray(task.patchIds).join(', ')
      return historyUpdateIds.map((item, index) => ({
        key: `hist-${index}-${item}`,
        primary: item,
        secondary: patchIds
      }))
    }
  }

  const patchIds = toDisplayArray(task.patchIds)
  if (patchIds.length > 0) {
    return patchIds.map((item, index) => ({
      key: `patch-${index}-${item}`,
      primary: item,
      secondary: task.taskType === 'vuln_fix' ? t('patches.linux.fixByPatchTask') : ''
    }))
  }

  const latestRecord = getLatestRecord(history, record => Boolean(record.remark))
  if (!latestRecord) return []

  return [
    {
      key: `remark-${latestRecord.id || latestRecord.createdTime}`,
      primary: latestRecord.remark,
      secondary: latestRecord.createdTime ? formatDateTime(latestRecord.createdTime) : ''
    }
  ]
}

export function buildAffectedPackageList(task, history = []) {
  const patchPackages = toDisplayArray(task?.patchPkgs)
  if (patchPackages.length > 0) return patchPackages

  const packageEntries = toDisplayArray(task?.packages)
  if (packageEntries.length > 0) {
    return packageEntries.map(entry => parsePackageEntry(entry).primary)
  }

  return Array.from(new Set(history.flatMap(record => toDisplayArray(record.affectedPackages))))
}

export function isExecutionRecord(record) {
  return Boolean(record?.action || record?.status)
}

export function getLatestRecord(records = [], predicate = () => true) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (predicate(records[index])) return records[index]
  }
  return null
}

export function getRecordDisplayState(record) {
  if (!record) return 'idle'
  if (record.action === 'REJECT' || record.action === 'EXPIRE') return 'failed'
  if (record.action === 'APPROVE') return 'success'
  if (record.action === 'FAILED' || record.status === 'FAILED') return 'failed'
  if (record.status === 'RUNNING') return 'running'
  if (isSkippedRecord(record)) return 'success'
  if (SUCCESSFUL_RECORD_ACTIONS.includes(record.action) || record.status === 'SUCCESS') {
    return 'success'
  }
  return 'idle'
}

export function stepStatusToDisplayState(status) {
  if (status === 'SUCCESS' || status === 'SKIPPED') return 'success'
  if (status === 'FAILED') return 'failed'
  if (status === 'RUNNING') return 'running'
  return 'idle'
}

export function buildScriptAlert(scriptType, record, scriptContent, stepStatus, task) {
  const isPreCheck = scriptType === 'pre'
  const labels = isPreCheck
    ? {
        get skipped() { return t('patches.linux.preScriptSkipped') },
        get success() { return t('patches.linux.preScriptDone') },
        get running() { return t('patches.linux.preScriptRunning') },
        get configured() { return t('patches.linux.preScriptConfigured') },
        get empty() { return t('patches.linux.preScriptNotConfigured') }
      }
    : {
        get skipped() { return t('patches.linux.validationSkipped') },
        get success() { return t('patches.linux.allValidated') },
        get running() { return t('patches.linux.validationRunning') },
        get configured() { return t('patches.linux.validationConfigured') },
        get empty() { return t('patches.linux.validationNotConfigured') }
      }

  if (stepStatus) {
    if (stepStatus === 'FAILED') return buildFailureAlert(t('execution.ui.executionFailed'), record, task)
    if (stepStatus === 'SKIPPED') return { type: 'success', title: labels.skipped }
    if (stepStatus === 'SUCCESS') return { type: 'success', title: labels.success }
    if (stepStatus === 'RUNNING') return { type: 'warning', title: labels.running }
  } else {
    if (getRecordDisplayState(record) === 'failed') {
      return buildFailureAlert(t('execution.ui.executionFailed'), record, task)
    }
    if (isSkippedRecord(record)) return { type: 'success', title: labels.skipped }
    if (record?.action === 'COMPLETE' || record?.status === 'SUCCESS') {
      return { type: 'success', title: labels.success }
    }
  }

  return {
    type: 'info',
    title: scriptContent ? labels.configured : labels.empty
  }
}

export function buildRestartAlert(task, record, stepStatus) {
  if (stepStatus) {
    if (stepStatus === 'FAILED') return buildFailureAlert(t('patches.linux.restartFailed'), record, task)
    if (stepStatus === 'SKIPPED') return { type: 'success', get title() { return t('patches.linux.restartSkipped') } }
    if (stepStatus === 'SUCCESS') return { type: 'success', get title() { return t('patches.linux.restartDone') } }
    if (stepStatus === 'RUNNING') return { type: 'warning', get title() { return t('patches.linux.restartRunning') } }
  } else {
    if (getRecordDisplayState(record) === 'failed') {
      return buildFailureAlert(t('patches.linux.restartFailed'), record, task)
    }
    if (isSkippedRecord(record)) return { type: 'success', get title() { return t('patches.linux.restartSkipped') } }
    if (record?.action === 'COMPLETE' || record?.status === 'SUCCESS') {
      return { type: 'success', get title() { return t('patches.linux.restartDone') } }
    }
  }

  if (record?.action === 'RESTART_CONFIRM') {
    return { type: 'success', get title() { return t('patches.linux.restartConfirmed') } }
  }
  if (task?.restartType === 'none' && !record) {
    return { type: 'info', get title() { return t('patches.linux.noRestartRequired') } }
  }

  return {
    type: 'info',
    get title() { return t('patches.linux.restartPolicyValue', { policy: formatRestartType(task?.restartType) }) }
  }
}

export function buildPipelineItem(key, label, records, options = {}) {
  const latestRecord = getLatestRecord(records, isExecutionRecord)
  const state = resolvePipelineState(latestRecord, records, options)

  return {
    key,
    label,
    state,
    runId: options.stepRunId || latestRecord?.runId || options.fallbackRunId || '',
    text: getPipelineText(state, latestRecord, options)
  }
}

function parseMaybeJson(value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value) || typeof value === 'object') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parsePackageEntry(entry) {
  const [packageName, fullPackageName, patchId] = String(entry || '').split('#')
  return {
    primary: packageName || fullPackageName || String(entry || '-'),
    secondary: [fullPackageName && fullPackageName !== packageName ? fullPackageName : '', patchId]
      .filter(Boolean)
      .join(' / ')
  }
}

function formatRestartType(value) {
  if (value === 'system') return t('patches.linux.systemRestart')
  if (value === 'service') return t('patches.linux.serviceRestart')
  if (value === 'none') return t('patches.linux.noRestartRequired')
  return value || '-'
}

function buildFailureAlert(prefix, record, task) {
  const errMsg =
    record?.errorMessage ||
    record?.remark ||
    task?.errorMessage ||
    task?.failReason ||
    task?.remark ||
    t('automation.file.unknownError')
  return {
    type: 'error',
    title: `${prefix}：${errMsg}`
  }
}

function isSkippedRecord(record) {
  return (
    record?.action === 'SKIP' || record?.action === 'RESTART_SKIP' || record?.status === 'SKIPPED'
  )
}

function resolvePipelineState(latestRecord, records, options) {
  if (options.stepStatus) return stepStatusToDisplayState(options.stepStatus)
  if (options.treatNoneAsSuccess && records.length === 0) return 'success'
  return getRecordDisplayState(latestRecord)
}

function getPipelineText(state, record, options) {
  if (options.treatNoneAsSuccess && !record) return t('patches.linux.taskNoRestart')
  if (options.stepStatus === 'SKIPPED' || isSkippedRecord(record)) return t('patches.linux.systemSkipped')
  if (state === 'success') return t('common.pollingSuccess')
  if (state === 'failed') {
    return record?.errorMessage || options.taskErrorMessage || record?.remark || t('patches.linux.taskFailedCheck')
  }
  if (state === 'running') return t('patches.linux.executing')
  return t('patches.linux.waitingSchedule')
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}
