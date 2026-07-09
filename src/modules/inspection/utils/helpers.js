/**
 * 通用工具函数
 */

import { formatDateTime } from '@/utils/date'

export { formatDateTime }

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
