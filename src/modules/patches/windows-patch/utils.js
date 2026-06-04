import {
  WIN_PATCH_EXPORT_DEFAULT_FILENAME,
  WIN_PATCH_INSTALL_ACTION_LABELS,
  WIN_PATCH_INSTALL_ACTION_TAG_TYPES,
  WIN_PATCH_INSTALL_RESULT_LABELS,
  WIN_PATCH_INSTALL_RESULT_TAG_TYPES,
  WIN_PATCH_PATCH_STATUS_LABELS,
  WIN_PATCH_PATCH_STATUS_TAG_TYPES,
  WIN_PATCH_SEVERITY_LABELS,
  WIN_PATCH_TASK_SKIPPABLE_STEPS,
  WIN_PATCH_TASK_STEP_LABELS,
  WIN_PATCH_TASK_STEP_TAG_TYPES,
  WIN_PATCH_TASK_STATUS_LABELS,
  WIN_PATCH_TASK_STATUS_TAG_TYPES,
  WIN_PATCH_TASK_TYPE_LABELS
} from './constants'

export function unwrapResponse(response) {
  return response?.data ?? response ?? {}
}

export function ensureArray(value) {
  if (Array.isArray(value)) return value
  return []
}

export function parsePageResponse(response) {
  const data = unwrapResponse(response)
  const content = Array.isArray(data?.content)
    ? data.content
    : Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data)
        ? data
        : []

  return {
    content,
    total: Number(data?.totalElements ?? data?.total ?? content.length ?? 0),
    page: Number(data?.number ?? 0) + 1,
    size: Number(data?.size ?? content.length ?? 0)
  }
}

export function pickValue(source, keys, fallback = '') {
  if (!source) return fallback

  const keyList = Array.isArray(keys) ? keys : [keys]
  for (const key of keyList) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

export function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

export function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

export function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function resolveHostId(host) {
  return String(pickValue(host, ['hostId', 'host_id', 'id', 'key'], '')).trim()
}

export function resolveHostKey(host) {
  return (
    String(pickValue(host, ['hostKey', 'host_key', 'hostname', 'value', 'ip', 'IP'], '-')).trim() ||
    '-'
  )
}

export function resolvePatchStatusId(row) {
  return String(pickValue(row, ['patchStatusId', 'patch_status_id', 'id'], '')).trim()
}

export function resolveInstallLogId(row) {
  return String(pickValue(row, ['installLogId', 'install_log_id', 'id'], '')).trim()
}

export function resolveWsusConfigId(config) {
  return String(pickValue(config, ['id'], '')).trim()
}

export function buildSelectorHostItem(host) {
  const hostId = resolveHostId(host)
  if (!hostId) return null

  return {
    key: hostId,
    value: resolveHostKey(host),
    assetType: 'windows'
  }
}

export function buildSelectorHostItems(hosts = []) {
  return ensureArray(hosts)
    .map(host => buildSelectorHostItem(host))
    .filter(Boolean)
}

export function extractHostIds(selection = []) {
  return Array.from(new Set(ensureArray(selection).map(resolveHostId).filter(Boolean)))
}

export function getSeverityTagType(severity) {
  const normalized = normalizeUpper(severity)

  return (
    {
      CRITICAL: 'danger',
      IMPORTANT: 'warning',
      MODERATE: 'info',
      MEDIUM: 'info',
      LOW: 'success',
      UNSPECIFIED: 'info',
      NONE: 'info'
    }[normalized] || 'info'
  )
}

export function getSeverityLabel(value) {
  const severity = normalizeUpper(value)
  return WIN_PATCH_SEVERITY_LABELS[severity] || String(value || '').trim() || '-'
}

export function getTaskTypeLabel(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['taskType', 'task_type'], '')
  const type = normalizeUpper(value)
  return WIN_PATCH_TASK_TYPE_LABELS[type] || type || '-'
}

export function getTaskTypeTagType(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['taskType', 'task_type'], '')
  const type = normalizeUpper(value)

  if (type === 'SCAN') return 'primary'
  if (type === 'INSTALL') return 'success'
  if (type === 'ROLLBACK') return 'warning'
  if (type.includes('CONN')) return 'info'
  return 'info'
}

function hasAnyItemStatus(items = [], statuses = [], keys = ['status']) {
  return items.some(item => statuses.includes(normalizeUpper(pickValue(item, keys, ''))))
}

function areAllItemsInStatus(items = [], statuses = [], keys = ['status']) {
  return (
    items.length > 0 &&
    items.every(item => statuses.includes(normalizeUpper(pickValue(item, keys, ''))))
  )
}

export function getTaskStatusValue(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['taskStatus', 'task_status', 'status'], '')
  const explicitStatus = normalizeUpper(value)

  if (!rowOrValue || typeof rowOrValue === 'string') {
    return explicitStatus
  }

  const steps = Array.isArray(rowOrValue.steps) ? rowOrValue.steps : []
  const hosts = Array.isArray(rowOrValue.hosts) ? rowOrValue.hosts : []
  const errorMessage = String(pickValue(rowOrValue, ['errorMessage', 'error_message'], '')).trim()

  const hasFailedStep = hasAnyItemStatus(steps, ['FAILED', 'ERROR'])
  const hasRunningStep = hasAnyItemStatus(steps, ['RUNNING', 'IN_PROGRESS'])
  const hasPendingStep = hasAnyItemStatus(steps, ['PENDING', 'WAITING', 'CREATED'])
  const hasFailedHost = hasAnyItemStatus(
    hosts,
    ['FAILED', 'ERROR'],
    ['status', 'taskStatus', 'task_status']
  )
  const allStepsCompleted = areAllItemsInStatus(steps, ['SUCCESS', 'SKIPPED', 'COMPLETED'])

  if (
    ['FAILED', 'ERROR', 'PARTIAL_SUCCESS', 'COMPLETED', 'SUCCESS', 'PASS'].includes(explicitStatus)
  ) {
    return explicitStatus
  }

  if (['RUNNING', 'IN_PROGRESS', 'PENDING', 'CREATED', ''].includes(explicitStatus)) {
    if (hasFailedStep || hasFailedHost) {
      return 'FAILED'
    }

    if (allStepsCompleted) {
      return 'COMPLETED'
    }

    if (errorMessage && !hasRunningStep && !hasPendingStep) {
      return 'FAILED'
    }

    if (!explicitStatus && hasRunningStep) {
      return 'RUNNING'
    }

    if (!explicitStatus && hasPendingStep) {
      return 'PENDING'
    }
  }

  if (!explicitStatus && errorMessage) {
    return 'FAILED'
  }

  return explicitStatus
}

export function getTaskStatusLabel(rowOrValue) {
  const status = getTaskStatusValue(rowOrValue)
  return WIN_PATCH_TASK_STATUS_LABELS[status] || status || '-'
}

export function getTaskStatusTagType(rowOrValue) {
  const status = getTaskStatusValue(rowOrValue)
  return WIN_PATCH_TASK_STATUS_TAG_TYPES[status] || 'info'
}

export function getTaskStepValue(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['currentStep', 'current_step'], '')
  return normalizeUpper(value)
}

function resolveTaskStepDisplayValue(rowOrValue) {
  const step = getTaskStepValue(rowOrValue)
  if (step !== 'EXECUTE') {
    return step
  }

  const taskType = normalizeUpper(
    typeof rowOrValue === 'string' ? '' : pickValue(rowOrValue, ['taskType', 'task_type'], '')
  )

  if (taskType === 'ROLLBACK') {
    return 'ROLLBACK'
  }

  if (taskType === 'INSTALL') {
    return 'INSTALL'
  }

  return step
}

export function getTaskStepLabel(rowOrValue) {
  const step = resolveTaskStepDisplayValue(rowOrValue)
  return WIN_PATCH_TASK_STEP_LABELS[step] || step || '-'
}

export function getTaskStepTagType(rowOrValue) {
  const step = resolveTaskStepDisplayValue(rowOrValue)
  return WIN_PATCH_TASK_STEP_TAG_TYPES[step] || 'info'
}

export function isStepControlledTask(rowOrValue) {
  const type = normalizeUpper(
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['taskType', 'task_type'], '')
  )

  return type === 'INSTALL' || type === 'ROLLBACK'
}

export function canSkipTaskStep(rowOrValue) {
  return WIN_PATCH_TASK_SKIPPABLE_STEPS.includes(getTaskStepValue(rowOrValue))
}

export function getPatchStatusLabel(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['patchStatus', 'patch_status'], '')
  const status = normalizeUpper(value)
  return WIN_PATCH_PATCH_STATUS_LABELS[status] || status || '-'
}

export function getPatchStatusTagType(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['patchStatus', 'patch_status'], '')
  const status = normalizeUpper(value)
  return WIN_PATCH_PATCH_STATUS_TAG_TYPES[status] || 'info'
}

export function getInstallActionLabel(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : pickValue(rowOrValue, ['action'], '')
  const action = normalizeUpper(value)
  return WIN_PATCH_INSTALL_ACTION_LABELS[action] || action || '-'
}

export function getInstallActionTagType(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : pickValue(rowOrValue, ['action'], '')
  const action = normalizeUpper(value)
  return WIN_PATCH_INSTALL_ACTION_TAG_TYPES[action] || 'info'
}

export function getInstallResultLabel(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : pickValue(rowOrValue, ['result'], '')
  const result = normalizeUpper(value)
  return WIN_PATCH_INSTALL_RESULT_LABELS[result] || result || '-'
}

export function getInstallResultTagType(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : pickValue(rowOrValue, ['result'], '')
  const result = normalizeUpper(value)
  return WIN_PATCH_INSTALL_RESULT_TAG_TYPES[result] || 'info'
}

export function isPatchInstallable(row) {
  const status = normalizeUpper(pickValue(row, ['patchStatus', 'patch_status'], ''))
  // 已修复/修复中（及旧枚举 已安装/安装中）不可再次安装
  return !['REPAIRD', 'REPAIRING', 'INSTALLED', 'INSTALLING'].includes(status)
}

export function isRollbackSelectable(row) {
  const action = normalizeUpper(pickValue(row, ['action'], ''))
  const result = normalizeUpper(pickValue(row, ['result'], ''))
  return (
    (action === 'INSTALL' && result === 'SUCCESS') || (action === 'ROLLBACK' && result === 'FAILED')
  )
}

export function isTaskRunning(rowOrValue) {
  const status = getTaskStatusValue(rowOrValue)
  return ['RUNNING', 'IN_PROGRESS'].includes(status)
}

export function getWsusConfigLabel(config) {
  const description = pickValue(config, ['description'], '')
  const url = pickValue(config, ['wsusUrl', 'wsus_url'], '-')
  return description ? `${description} / ${url}` : url
}

export function parseContentDispositionFilename(headerValue) {
  const source = String(headerValue || '')
  if (!source) return ''

  const utf8Match = source.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = source.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || ''
}

export function downloadBlobResponse(response, fallbackName = WIN_PATCH_EXPORT_DEFAULT_FILENAME) {
  const blob = new Blob([response?.data ?? response])
  const filename =
    parseContentDispositionFilename(response?.headers?.['content-disposition']) || fallbackName

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}
