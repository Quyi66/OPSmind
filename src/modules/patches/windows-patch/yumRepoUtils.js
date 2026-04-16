import {
  formatDateTime,
  normalizeUpper,
  pickValue,
  unwrapResponse
} from './utils'
import {
  YUM_REPO_COLLECT_STATUS_LABELS,
  YUM_REPO_COLLECT_STATUS_TAG_TYPES,
  YUM_REPO_DIFF_TYPE_LABELS,
  YUM_REPO_DIFF_TYPE_TAG_TYPES
} from './yumRepoConstants'

export { formatDateTime, unwrapResponse }

export function resolveYumRepoId(row) {
  return String(pickValue(row, ['id', 'sourceId', 'source_id'], '')).trim()
}

export function getYumRepoLabel(row) {
  return pickValue(row, ['sourceName', 'source_name', 'repoUrl', 'repo_url'], '-')
}

export function getYumRepoOsLabel(row) {
  const family = pickValue(row, ['osFamily', 'os_family'], '-')
  const major = pickValue(row, ['osMajor', 'os_major'], '')
  return major ? `${family} ${major}` : family
}

export function buildYumRepoPayload(form = {}) {
  const payload = {
    repoUrl: String(form.repoUrl || '').trim()
  }

  const sourceName = String(form.sourceName || '').trim()
  const repoId = String(form.repoId || '').trim()
  const osFamily = String(form.osFamily || '').trim()
  const osMajor = String(form.osMajor || '').trim()

  if (sourceName) payload.sourceName = sourceName
  if (repoId) payload.repoId = repoId
  if (osFamily) payload.osFamily = osFamily
  if (osMajor) payload.osMajor = osMajor

  return payload
}

export function getCollectStatusValue(rowOrValue) {
  const value =
    typeof rowOrValue === 'string'
      ? rowOrValue
      : pickValue(rowOrValue, ['collectStatus', 'collect_status'], 'UNCOLLECTED')

  return normalizeUpper(value || 'UNCOLLECTED') || 'UNCOLLECTED'
}

export function getCollectStatusMessage(rowOrValue) {
  if (!rowOrValue || typeof rowOrValue === 'string') {
    return ''
  }

  return String(pickValue(rowOrValue, ['message'], '')).trim()
}

function hasCollectProgressMessage(rowOrValue) {
  if (!rowOrValue || typeof rowOrValue === 'string') {
    return false
  }

  return Boolean(getCollectStatusMessage(rowOrValue)) && !String(
    pickValue(rowOrValue, ['collectStatus', 'collect_status'], '')
  ).trim()
}

export function getCollectStatusLabel(rowOrValue) {
  if (hasCollectProgressMessage(rowOrValue)) {
    return getCollectStatusMessage(rowOrValue)
  }

  const status = getCollectStatusValue(rowOrValue)
  return YUM_REPO_COLLECT_STATUS_LABELS[status] || status || '-'
}

export function getCollectStatusTagType(rowOrValue) {
  if (hasCollectProgressMessage(rowOrValue)) {
    return 'warning'
  }

  const status = getCollectStatusValue(rowOrValue)
  return YUM_REPO_COLLECT_STATUS_TAG_TYPES[status] || 'info'
}

export function isCollectRunning(rowOrValue) {
  if (hasCollectProgressMessage(rowOrValue)) {
    return true
  }

  const status = getCollectStatusValue(rowOrValue)
  return status === 'PENDING' || status === 'RUNNING'
}

export function getDiffTypeValue(rowOrValue) {
  const value =
    typeof rowOrValue === 'string' ? rowOrValue : pickValue(rowOrValue, ['diffType', 'diff_type'], '')

  return normalizeUpper(value)
}

export function getDiffTypeLabel(rowOrValue) {
  const diffType = getDiffTypeValue(rowOrValue)
  return YUM_REPO_DIFF_TYPE_LABELS[diffType] || diffType || '-'
}

export function getDiffTypeTagType(rowOrValue) {
  const diffType = getDiffTypeValue(rowOrValue)
  return YUM_REPO_DIFF_TYPE_TAG_TYPES[diffType] || 'info'
}

export function splitPatchIds(rawText = '') {
  const raw = String(rawText || '')
  return Array.from(
    new Set(
      raw
        .split(/[\s,，;；]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}
