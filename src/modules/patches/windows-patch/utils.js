/**
 * Windows 离线补丁模块工具函数
 * 已移除旧版任务/向导/WSUS 相关函数
 */
import {
  WIN_PATCH_EXPORT_DEFAULT_FILENAME,
  WIN_PATCH_INSTALL_ACTION_LABELS,
  WIN_PATCH_INSTALL_ACTION_TAG_TYPES,
  WIN_PATCH_INSTALL_RESULT_LABELS,
  WIN_PATCH_INSTALL_RESULT_TAG_TYPES,
  WIN_PATCH_PATCH_STATUS_LABELS,
  WIN_PATCH_PATCH_STATUS_TAG_TYPES,
  WIN_PATCH_SEVERITY_LABELS
} from './constants'

// ─────────────────────────────────────────────
//  通用工具
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  主机字段解析
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  主机选择器辅助
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  严重等级
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  补丁状态（适配新版 + 旧版兼容）
// ─────────────────────────────────────────────

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

/**
 * 判断补丁是否可修复（安装）
 * 新版：no_repair / repair_faild 可操作
 * 旧版：MISSING / INSTALL_FAILED 可操作
 */
export function isPatchInstallable(row) {
  const status = normalizeUpper(pickValue(row, ['patchStatus', 'patch_status'], ''))
  const installableStatuses = [
    'NO_REPAIR',
    'REPAIR_FAILD',
    'MISSING',
    'INSTALL_FAILED',
    'ROLLBACK_SUCCESS'
  ]
  return installableStatuses.includes(status)
}

// ─────────────────────────────────────────────
//  安装/回滚历史标签
// ─────────────────────────────────────────────

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

/**
 * 判断历史记录是否可回滚
 * 安装成功 或 回滚失败 的记录允许回滚
 */
export function isRollbackSelectable(row) {
  const action = normalizeUpper(pickValue(row, ['action'], ''))
  const result = normalizeUpper(pickValue(row, ['result'], ''))
  return (
    (action === 'INSTALL' && result === 'SUCCESS') || (action === 'ROLLBACK' && result === 'FAILED')
  )
}

// ─────────────────────────────────────────────
//  CVE 字段解析（新增可选字段）
// ─────────────────────────────────────────────

/**
 * 解析逗号分隔的 cveIds 字段为数组
 * 离线机器有值，联网机器可能为空
 */
export function resolveCveIds(row) {
  const raw = pickValue(row, ['cveIds', 'cve_ids'], '')
  if (!raw) return []
  return String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

// ─────────────────────────────────────────────
//  文件下载
// ─────────────────────────────────────────────

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
