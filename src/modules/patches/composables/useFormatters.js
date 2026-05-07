/**
 * 格式化工具函数 Composable
 */

// 格式化日期
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateStr
  }
}

// 格式化日期时间
export function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

// 获取已安装软件包数量
export function getInstalledPkgsCount(pkgsStr) {
  if (!pkgsStr) return 0
  try {
    const pkgs = JSON.parse(pkgsStr)
    return Array.isArray(pkgs) ? pkgs.length : 0
  } catch {
    return 0
  }
}

// 格式化软件包列表
export function formatPackages(pkgsStr) {
  if (!pkgsStr) return ''
  const pkgs = pkgsStr.split(',')
  if (pkgs.length > 3) {
    return `${pkgs.slice(0, 3).join(', ')}...`
  }
  return pkgs.join(', ')
}

// 获取CVE列表
export function getCVEList(vulsStr) {
  if (!vulsStr) return []
  return vulsStr.split(',').filter(v => v.trim())
}

function normalizeCveLinkTarget(source) {
  const value = String(source || '')
    .trim()
    .toLowerCase()
  if (!value) return 'redhat'
  if (value.includes('oracle')) return 'oracle'
  if (value.includes('ubuntu')) return 'ubuntu'
  if (value.includes('kylin')) return 'kylin'
  if (value.includes('redhat') || value.includes('rhel')) return 'redhat'
  return 'redhat'
}

export function normalizeCveSourceKey(source) {
  const raw = String(source || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (lower.includes('redhat') || lower.includes('red hat') || lower.includes('rhel')) {
    return 'redhat'
  }
  if (lower.includes('kylin')) return 'kylin'
  if (lower === 'nvd') return 'nvd'

  return lower
}

export function getCveSourceLabel(source) {
  const key = normalizeCveSourceKey(source)
  const labelMap = {
    redhat: 'Red Hat',
    kylin: '麒麟',
    nvd: 'NVD'
  }

  return labelMap[key] || source
}

export function getCveSourceType(source) {
  const key = normalizeCveSourceKey(source)
  const typeMap = {
    redhat: 'danger',
    kylin: 'primary',
    nvd: 'info'
  }

  return typeMap[key] || 'info'
}

export function isSameCveSource(source, targetSource) {
  if (!targetSource || targetSource === 'all') return true

  const rawSource = String(source || '')
    .trim()
    .toLowerCase()
  const rawTarget = String(targetSource || '')
    .trim()
    .toLowerCase()
  if (rawSource && rawSource === rawTarget) return true

  return normalizeCveSourceKey(source) === normalizeCveSourceKey(targetSource)
}

export function buildCveSourceOptions(sourceList = [], options = {}) {
  const { includeAll = false, dedupe = false } = options
  const items = []
  const seen = new Set()

  if (includeAll) {
    items.push({ value: 'all', label: '全部' })
    seen.add('all')
  }

  sourceList.forEach(source => {
    const rawValue = String(source || '').trim()
    if (!rawValue) return

    const dedupeKey = dedupe
      ? normalizeCveSourceKey(rawValue) || rawValue.toLowerCase()
      : rawValue.toLowerCase()

    if (seen.has(dedupeKey)) return

    seen.add(dedupeKey)
    items.push({
      value: rawValue,
      label: getCveSourceLabel(rawValue)
    })
  })

  return items
}

// 获取 CVE 外链地址（根据厂商或操作系统发行版）
export function getCveUrl(cveId, source) {
  const id = String(cveId || '').trim()
  if (!id) return ''

  const target = normalizeCveLinkTarget(source)
  if (target === 'oracle') {
    return `https://linux.oracle.com/cve/${encodeURIComponent(id)}.html`
  }
  if (target === 'ubuntu') {
    return `https://ubuntu.com/security/${encodeURIComponent(id)}`
  }
  if (target === 'kylin') {
    return `https://support.kylinos.cn/#/security/cveDetail?allTitle=${encodeURIComponent(id)}`
  }
  return `https://access.redhat.com/security/cve/${id}`
}

// 获取严重程度类型
export function getSeverityType(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return 'info'

  const lower = raw.toLowerCase()
  let key = ''
  if (lower === 'critical' || raw === '严重' || raw === 'Critical') key = 'critical'
  else if (lower === 'important' || raw === '重要' || raw === '高危' || raw === 'Important')
    key = 'important'
  else if (lower === 'moderate' || raw === '中等' || raw === '中危' || raw === 'Moderate')
    key = 'moderate'
  else if (lower === 'low' || raw === '低' || raw === '低危' || raw === 'Low') key = 'low'

  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }

  return typeMap[key] || 'info'
}

// 获取补丁状态类型
export function getPatchStatusType(status) {
  const typeMap = {
    未修复: 'info',
    已修复: 'success',
    '已修复(手动)': 'success',
    修复中: 'primary',
    修复失败: 'warning',
    回滚中: 'primary',
    回滚失败: 'warning',
    回滚成功: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取补丁状态文本
export function getPatchStatusText(status) {
  const textMap = {
    已修复: '已修复',
    未修复: '未修复',
    修复中: '修复中',
    修复失败: '修复失败',
    回滚中: '回滚中',
    回滚失败: '回滚失败',
    回滚成功: '回滚成功',
    '已修复(手动)': '已修复(手动)'
  }
  return textMap[status] || status
}
