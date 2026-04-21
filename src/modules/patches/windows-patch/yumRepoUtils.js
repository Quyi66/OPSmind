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

function parseYumConfigJson(dataJson) {
  if (!dataJson) return {}
  if (typeof dataJson === 'object') return dataJson

  try {
    const parsed = JSON.parse(dataJson)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeCompareValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizeRepoUrlValue(value) {
  return normalizeCompareValue(value).replace(/\/+$/, '')
}

export function resolveYumConfigId(row) {
  return String(pickValue(row, ['id'], '')).trim()
}

export function normalizeYumConfigRecord(row) {
  const normalizedRow = row && typeof row === 'object' ? row : {}
  const dataJson = parseYumConfigJson(pickValue(normalizedRow, ['dataJson', 'data_json'], {}))
  const dataOwnerId = String(
    pickValue(normalizedRow, ['dataOwnerId', 'data_owner_id', 'hostId', 'host_id'], '')
  ).trim()

  return {
    ...normalizedRow,
    id: resolveYumConfigId(normalizedRow),
    dataJson,
    dataOwnerId,
    name: String(pickValue(dataJson, ['name'], '')).trim(),
    description: String(pickValue(dataJson, ['description'], '')).trim(),
    baseurl: String(pickValue(dataJson, ['baseurl', 'baseUrl', 'repoUrl', 'repo_url'], '')).trim(),
    file: String(pickValue(dataJson, ['file'], '')).trim()
  }
}

export function getYumConfigLabel(row) {
  const config = normalizeYumConfigRecord(row)
  return config.name || config.baseurl || '-'
}

export function getYumConfigBaseurl(row) {
  return normalizeYumConfigRecord(row).baseurl || '-'
}

export function getYumConfigFile(row) {
  return normalizeYumConfigRecord(row).file || '-'
}

export function getYumConfigMarkerValue(row) {
  return normalizeYumConfigRecord(row).dataOwnerId || '-'
}

export function buildYumRepoSourceFromConfig(row, sourceId = '') {
  const config = normalizeYumConfigRecord(row)

  return {
    id: sourceId,
    sourceId,
    sourceType: 'USER_INPUT',
    sourceName: config.name || config.baseurl || '-',
    repoUrl: config.baseurl,
    repoId: config.name,
    enabled: true
  }
}

export function findYumRepoSourceByConfig(configRow, repoList = []) {
  const config = normalizeYumConfigRecord(configRow)
  if (!config.id) return null

  const configUrl = normalizeRepoUrlValue(config.baseurl)
  const configName = normalizeCompareValue(config.name)

  return repoList.find(repo => {
    const repoUrl = normalizeRepoUrlValue(pickValue(repo, ['repoUrl', 'repo_url'], ''))
    const repoId = normalizeCompareValue(pickValue(repo, ['repoId', 'repo_id'], ''))
    const repoName = normalizeCompareValue(pickValue(repo, ['sourceName', 'source_name'], ''))

    const sameUrl = Boolean(configUrl) && Boolean(repoUrl) && configUrl === repoUrl
    if (sameUrl) {
      return true
    }

    const sameName = Boolean(configName) && (configName === repoId || configName === repoName)
    if (sameName && (!configUrl || !repoUrl || configUrl === repoUrl)) {
      return true
    }

    return false
  }) || null
}

export function resolveYumRepoId(row) {
  return String(pickValue(row, ['id', 'sourceId', 'source_id'], '')).trim()
}

export function getYumRepoLabel(row) {
  return pickValue(row, ['sourceName', 'source_name', 'name', 'repoUrl', 'repo_url', 'baseurl'], '-')
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
