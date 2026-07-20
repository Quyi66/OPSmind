import { formatDateTime } from '@/utils/date'
export { formatDateTime }

const TASK_TYPE_LABELS = {
  install: '补丁安装',
  rollback: '变更回滚',
  pkg_update: '软件包更新',
  vuln_fix: '漏洞修复'
}

const TASK_TYPE_TAGS = {
  install: 'primary',
  rollback: 'danger',
  pkg_update: 'warning',
  vuln_fix: 'success'
}

const TASK_STATUS_LABELS = {
  CREATED: '已创建',
  PRE_CHECKING: '预检查中',
  PRE_CHECK_DONE: '预检查完成',
  PRE_CHECK_FAILED: '预检查失败',
  INSTALLING: '执行中',
  INSTALL_DONE: '执行完成',
  INSTALL_FAILED: '执行失败',
  ROLLING_BACK: '回滚中',
  ROLLBACK_DONE: '回滚完成',
  ROLLBACK_FAILED: '回滚失败',
  RESTART_PENDING: '等待重启',
  RESTARTING: '重启中',
  RESTART_DONE: '重启完成',
  VALIDATING: '校验中',
  VALIDATE_FAILED: '校验失败',
  COMPLETED: '已完成',
  FAILED: '失败'
}

const SUCCESSFUL_RECORD_ACTIONS = [
  'TASK_CREATED',
  'SCRIPT_UPLOAD',
  'SCRIPT_UPDATE',
  'COMPLETE',
  'RESTART_CONFIRM'
]

export function formatTaskType(taskType) {
  return TASK_TYPE_LABELS[taskType] || taskType || '-'
}

export function getTaskTypeTagType(taskType) {
  return TASK_TYPE_TAGS[taskType] || 'info'
}

export function formatTaskStatus(status) {
  return TASK_STATUS_LABELS[status] || status || '-'
}

export function getTaskStatusTagType(status) {
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
      secondary: task.taskType === 'vuln_fix' ? '按补丁任务修复' : ''
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
        skipped: '已跳过预执行脚本',
        success: '预执行脚本执行完毕',
        running: '预执行脚本执行中...',
        configured: '已配置预执行脚本',
        empty: '未配置预执行脚本'
      }
    : {
        skipped: '已跳过校验脚本',
        success: '全部校验通过',
        running: '校验脚本执行中...',
        configured: '已配置校验脚本',
        empty: '未配置校验脚本'
      }

  if (stepStatus) {
    if (stepStatus === 'FAILED') return buildFailureAlert('执行失败', record, task)
    if (stepStatus === 'SKIPPED') return { type: 'success', title: labels.skipped }
    if (stepStatus === 'SUCCESS') return { type: 'success', title: labels.success }
    if (stepStatus === 'RUNNING') return { type: 'warning', title: labels.running }
  } else {
    if (getRecordDisplayState(record) === 'failed') {
      return buildFailureAlert('执行失败', record, task)
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
    if (stepStatus === 'FAILED') return buildFailureAlert('重启失败', record, task)
    if (stepStatus === 'SKIPPED') return { type: 'success', title: '已跳过重启' }
    if (stepStatus === 'SUCCESS') return { type: 'success', title: '重启完成' }
    if (stepStatus === 'RUNNING') return { type: 'warning', title: '正在重启中...' }
  } else {
    if (getRecordDisplayState(record) === 'failed') {
      return buildFailureAlert('重启失败', record, task)
    }
    if (isSkippedRecord(record)) return { type: 'success', title: '已跳过重启' }
    if (record?.action === 'COMPLETE' || record?.status === 'SUCCESS') {
      return { type: 'success', title: '重启完成' }
    }
  }

  if (record?.action === 'RESTART_CONFIRM') {
    return { type: 'success', title: '已确认重启' }
  }
  if (task?.restartType === 'none' && !record) {
    return { type: 'info', title: '无需重启' }
  }

  return {
    type: 'info',
    title: `重启策略：${formatRestartType(task?.restartType)}`
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
  if (value === 'system') return '系统重启'
  if (value === 'service') return '服务重启'
  if (value === 'none') return '无需重启'
  return value || '-'
}

function buildFailureAlert(prefix, record, task) {
  const errMsg =
    record?.errorMessage ||
    record?.remark ||
    task?.errorMessage ||
    task?.failReason ||
    task?.remark ||
    '未知错误'
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
  if (options.treatNoneAsSuccess && !record) return '当前任务无需重启'
  if (options.stepStatus === 'SKIPPED' || isSkippedRecord(record)) return '系统已跳过执行'
  if (state === 'success') return '任务执行成功'
  if (state === 'failed') {
    return record?.errorMessage || options.taskErrorMessage || record?.remark || '任务执行失败，请检查'
  }
  if (state === 'running') return '正在执行中...'
  return '等待调度中'
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}
