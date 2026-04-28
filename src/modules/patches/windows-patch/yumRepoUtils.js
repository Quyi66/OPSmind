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

function normalizeBooleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value

  const normalized = normalizeCompareValue(value)
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false

  return Boolean(value)
}

export function resolveYumConfigId(row) {
  return String(pickValue(row, ['dcDataId', 'dc_data_id', 'id'], '')).trim()
}

export function normalizeYumConfigRecord(row) {
  const normalizedRow = row && typeof row === 'object' ? row : {}
  const dataJson = parseYumConfigJson(pickValue(normalizedRow, ['dataJson', 'data_json'], {}))
  const dataOwnerId = String(pickValue(normalizedRow, ['dataOwnerId', 'data_owner_id'], '')).trim()

  return {
    ...normalizedRow,
    id: resolveYumConfigId(normalizedRow),
    dcDataId: resolveYumConfigId(normalizedRow),
    dataJson,
    dataOwnerId,
    name: String(pickValue(normalizedRow, ['name'], pickValue(dataJson, ['name'], ''))).trim(),
    description: String(
      pickValue(normalizedRow, ['description'], pickValue(dataJson, ['description'], ''))
    ).trim(),
    baseurl: String(
      pickValue(
        normalizedRow,
        ['baseurl', 'baseUrl', 'repoUrl', 'repo_url'],
        pickValue(dataJson, ['baseurl', 'baseUrl', 'repoUrl', 'repo_url'], '')
      )
    ).trim(),
    file: String(pickValue(normalizedRow, ['file'], pickValue(dataJson, ['file'], ''))).trim(),
    sourceId: String(pickValue(normalizedRow, ['sourceId', 'source_id'], '')).trim(),
    collected: normalizeBooleanValue(
      pickValue(normalizedRow, ['collected'], ''),
      Boolean(pickValue(normalizedRow, ['sourceId', 'source_id'], ''))
    ),
    collectStatus: String(pickValue(normalizedRow, ['collectStatus', 'collect_status'], '')).trim(),
    packageCount: pickValue(normalizedRow, ['packageCount', 'package_count'], null),
    finishedAt: pickValue(normalizedRow, ['finishedAt', 'finished_at'], ''),
    updateTime: pickValue(normalizedRow, ['updateTime', 'update_time'], ''),
    createTime: pickValue(normalizedRow, ['createTime', 'create_time'], '')
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

export function buildYumRepoSourceFromConfig(row, sourceId = '') {
  const config = normalizeYumConfigRecord(row)
  const resolvedSourceId = String(sourceId || config.sourceId || '').trim()

  return {
    id: resolvedSourceId,
    sourceId: resolvedSourceId,
    sourceType: 'USER_INPUT',
    sourceName: config.name || config.baseurl || '-',
    repoUrl: config.baseurl,
    repoId: config.name,
    enabled: true,
    collectStatus: config.collectStatus || undefined,
    packageCount: config.packageCount,
    finishedAt: config.finishedAt || ''
  }
}

export function buildCollectedYumRepoSources(configList = []) {
  return configList
    .map(item => normalizeYumConfigRecord(item))
    .filter(item => item.sourceId)
    .map(item => buildYumRepoSourceFromConfig(item))
}

export function findYumRepoSourceByConfig(configRow, repoList = []) {
  const config = normalizeYumConfigRecord(configRow)
  if (!config.id) return null

  const configSourceId = normalizeCompareValue(config.sourceId)
  const configUrl = normalizeRepoUrlValue(config.baseurl)
  const configName = normalizeCompareValue(config.name)

  return repoList.find(repo => {
    const repoSourceId = normalizeCompareValue(resolveYumRepoId(repo))
    if (configSourceId && repoSourceId && configSourceId === repoSourceId) {
      return true
    }

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
