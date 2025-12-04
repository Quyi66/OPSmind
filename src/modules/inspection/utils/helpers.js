/**
 * 通用工具函数
 */

/**
 * 格式化日期时间
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期时间
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 解析 auditParams 获取主机和脚本信息
 * @param {string} auditParamsStr - JSON 字符串
 * @returns {{ hosts: Array, scripts: Array }}
 */
export function parseAuditParams(auditParamsStr) {
  if (!auditParamsStr) return { hosts: [], scripts: [] }

  try {
    const auditParams = JSON.parse(auditParamsStr)
    const hosts = []
    const scripts = []

    for (const param of auditParams) {
      if (param.hosts) {
        hosts.push(...param.hosts)
      }
      if (param.scripts) {
        scripts.push(...param.scripts)
      }
    }

    return { hosts, scripts }
  } catch (e) {
    console.error('解析 auditParams 失败:', e)
    return { hosts: [], scripts: [] }
  }
}

/**
 * 计算分页信息
 * @param {number} page - 当前页
 * @param {number} size - 每页大小
 * @param {number} total - 总数
 * @returns {string} 分页信息文本
 */
export function getPaginationInfo(page, size, total) {
  const start = Math.min((page - 1) * size + 1, total)
  const end = Math.min(page * size, total)
  return `${start} - ${end} / ${total}`
}
