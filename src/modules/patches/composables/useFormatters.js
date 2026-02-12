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
  } catch (error) {
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
  } catch (error) {
    return timestamp
  }
}

// 获取已安装软件包数量
export function getInstalledPkgsCount(pkgsStr) {
  if (!pkgsStr) return 0
  try {
    const pkgs = JSON.parse(pkgsStr)
    return Array.isArray(pkgs) ? pkgs.length : 0
  } catch (error) {
    return 0
  }
}

// 格式化软件包列表
export function formatPackages(pkgsStr) {
  if (!pkgsStr) return ''
  const pkgs = pkgsStr.split(',')
  if (pkgs.length > 3) {
    return pkgs.slice(0, 3).join(', ') + '...'
  }
  return pkgs.join(', ')
}

// 获取CVE列表
export function getCVEList(vulsStr) {
  if (!vulsStr) return []
  return vulsStr.split(',').filter(v => v.trim())
}

function normalizeOsDistro(osDistro) {
  const value = String(osDistro || '').trim().toLowerCase()
  if (!value) return 'redhat'
  if (value.includes('kylin')) return 'kylin'
  if (value.includes('redhat') || value.includes('rhel')) return 'redhat'
  return 'redhat'
}

// 获取 CVE 外链地址（根据操作系统发行版）
export function getCveUrl(cveId, osDistro) {
  const id = String(cveId || '').trim()
  if (!id) return ''

  const distro = normalizeOsDistro(osDistro)
  if (distro === 'kylin') {
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
    '未修复': 'info',
    '已修复': 'success',
    '已修复(手动)': 'success',
    '修复中': 'primary',
    '修复失败': 'warning',
    '回滚中': 'primary',
    '回滚失败': 'warning',
    '回滚成功': 'info'
  }
  return typeMap[status] || 'info'
}

// 获取补丁状态文本
export function getPatchStatusText(status) {
  const textMap = {
    '已修复': '已修复',
    '未修复': '未修复',
    '修复中': '修复中',
    '修复失败': '修复失败',
    '回滚中': '回滚中',
    '回滚失败': '回滚失败',
    '回滚成功': '回滚成功',
    '已修复(手动)': '已修复(手动)'
  }
  return textMap[status] || status
}
