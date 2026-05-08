import {
  formatDateTime,
  normalizeUpper,
  pickValue,
  unwrapResponse
} from '../utils'
import {
  YUM_REPO_COLLECT_STATUS_LABELS,
  YUM_REPO_COLLECT_STATUS_TAG_TYPES,
  YUM_REPO_DIFF_TYPE_LABELS,
  YUM_REPO_DIFF_TYPE_TAG_TYPES
} from './constants'

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

function normalizeStringArrayValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  if (value === undefined || value === null || value === '') {
    return []
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return normalizeStringArrayValue(JSON.parse(trimmed))
      } catch {
        return [trimmed]
      }
    }

    return [trimmed]
  }

  return [String(value).trim()].filter(Boolean)
}

function buildYumRepoDisplayLabel(name, repoUrl) {
  const primary = String(name || '').trim()
  const resolvedRepoUrl = String(repoUrl || '').trim()

  if (!primary) {
    return resolvedRepoUrl || '-'
  }

  if (!resolvedRepoUrl) {
    return primary
  }

  const normalizedPrimary = normalizeCompareValue(primary)
  const normalizedRepoUrl = normalizeRepoUrlValue(resolvedRepoUrl)

  if (
    !normalizedRepoUrl
    || normalizedPrimary.includes(normalizedRepoUrl)
    || normalizeRepoUrlValue(primary) === normalizedRepoUrl
  ) {
    return primary
  }

  return `${primary} (${resolvedRepoUrl})`
}

export function resolveYumConfigId(row) {
  return String(pickValue(row, ['dcDataId', 'dc_data_id', 'id'], '')).trim()
}

export function normalizeYumConfigRecord(row) {
  const normalizedRow = row && typeof row === 'object' ? row : {}
  const dataJson = parseYumConfigJson(pickValue(normalizedRow, ['dataJson', 'data_json'], {}))
  const dataOwnerId = String(pickValue(normalizedRow, ['dataOwnerId', 'data_owner_id'], '')).trim()
  const baseurls = normalizeStringArrayValue(
    pickValue(
      normalizedRow,
      ['baseurls', 'baseUrls'],
      pickValue(
        dataJson,
        ['baseurls', 'baseUrls'],
        pickValue(
          normalizedRow,
          ['baseurl', 'baseUrl', 'repoUrl', 'repo_url'],
          pickValue(dataJson, ['baseurl', 'baseUrl', 'repoUrl', 'repo_url'], '')
        )
      )
    )
  )
  const sourceIds = normalizeStringArrayValue(
    pickValue(
      normalizedRow,
      ['sourceIds', 'source_ids'],
      pickValue(
        dataJson,
        ['sourceIds', 'source_ids'],
        pickValue(normalizedRow, ['sourceId', 'source_id'], pickValue(dataJson, ['sourceId', 'source_id'], ''))
      )
    )
  )

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
    baseurls,
    baseurl: baseurls[0] || '',
    file: String(pickValue(normalizedRow, ['file'], pickValue(dataJson, ['file'], ''))).trim(),
    sourceIds,
    sourceId: sourceIds[0] || '',
    collected: normalizeBooleanValue(
      pickValue(normalizedRow, ['collected'], ''),
      sourceIds.length > 0
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

export function getYumConfigCompareLabel(row) {
  const config = normalizeYumConfigRecord(row)
  const primary = config.name || config.description || config.baseurl || '-'
  const repoCount = Array.isArray(config.baseurls) ? config.baseurls.length : 0

  if (repoCount <= 1) {
    return primary
  }

  return `${primary} (${repoCount} 个 repo)`
}

export function getYumConfigBaseurl(row) {
  return normalizeYumConfigRecord(row).baseurl || '-'
}

export function getYumConfigFile(row) {
  return normalizeYumConfigRecord(row).file || '-'
}

export function isYumRepoCollectSucceeded(row) {
  return normalizeUpper(pickValue(row, ['collectStatus', 'collect_status'], '')) === 'SUCCESS'
}

export function buildYumRepoSourceFromConfig(row, sourceId = '') {
  const config = normalizeYumConfigRecord(row)
  const configSourceIds = Array.isArray(config.sourceIds) ? config.sourceIds : []
  const configBaseurls = Array.isArray(config.baseurls) ? config.baseurls : []
  const resolvedSourceId = String(sourceId || config.sourceId || '').trim()
  const sourceIndex = configSourceIds.findIndex(item => String(item || '').trim() === resolvedSourceId)
  const resolvedRepoUrl = String(
    (sourceIndex >= 0 ? configBaseurls[sourceIndex] : '') || config.baseurl || configBaseurls[0] || ''
  ).trim()

  return {
    id: resolvedSourceId,
    sourceId: resolvedSourceId,
    sourceType: 'USER_INPUT',
    sourceName: buildYumRepoDisplayLabel(config.name, resolvedRepoUrl),
    repoUrl: resolvedRepoUrl,
    repoId: config.name,
    enabled: true,
    collectStatus: config.collectStatus || undefined,
    packageCount: config.packageCount,
    finishedAt: config.finishedAt || ''
  }
}

export function buildYumRepoSourcesFromConfig(row) {
  const config = normalizeYumConfigRecord(row)

  if (!config.sourceIds.length) {
    return []
  }

  return config.sourceIds.map(sourceId => buildYumRepoSourceFromConfig(config, sourceId))
}

export function buildCollectedYumRepoSources(configList = []) {
  return configList
    .flatMap(item => buildYumRepoSourcesFromConfig(item))
}

export function findYumRepoSourceByConfig(configRow, repoList = []) {
  const config = normalizeYumConfigRecord(configRow)
  if (!config.id) return null

  const configSourceIds = config.sourceIds.map(item => normalizeCompareValue(item)).filter(Boolean)
  const configUrls = config.baseurls.map(item => normalizeRepoUrlValue(item)).filter(Boolean)
  const configName = normalizeCompareValue(config.name)

  return repoList.find(repo => {
    const repoSourceId = normalizeCompareValue(resolveYumRepoId(repo))
    if (configSourceIds.length && repoSourceId && configSourceIds.includes(repoSourceId)) {
      return true
    }

    const repoUrl = normalizeRepoUrlValue(pickValue(repo, ['repoUrl', 'repo_url'], ''))
    const repoId = normalizeCompareValue(pickValue(repo, ['repoId', 'repo_id'], ''))
    const repoName = normalizeCompareValue(pickValue(repo, ['sourceName', 'source_name'], ''))

    const sameUrl = configUrls.length > 0 && Boolean(repoUrl) && configUrls.includes(repoUrl)
    if (sameUrl) {
      return true
    }

    const sameName = Boolean(configName) && (configName === repoId || configName === repoName)
    if (sameName && (configUrls.length === 0 || !repoUrl || configUrls.includes(repoUrl))) {
      return true
    }

    return false
  }) || null
}

export function resolveYumRepoId(row) {
  return String(pickValue(row, ['id', 'sourceId', 'source_id', 'dcDataId', 'dc_data_id'], '')).trim()
}

export function getYumRepoLabel(row) {
  return buildYumRepoDisplayLabel(
    pickValue(row, ['sourceName', 'source_name', 'name'], ''),
    pickValue(row, ['repoUrl', 'repo_url', 'baseurl'], '')
  )
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
