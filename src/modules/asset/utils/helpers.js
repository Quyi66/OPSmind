/**
 * 资产管理模块工具函数
 */

import { formatDateTime, formatDate } from '@/utils/date'

export { formatDateTime, formatDate }

/**
 * 处理操作系统分布数据
 * 合并相同操作系统的数据
 */
export function processOsDistribution(records) {
  const result = []

  records.forEach(rec => {
    let os
    if (!rec.os_distro || rec.os_distro === 'null' || rec.os_distro === 'N/A') {
      os = '未知'
      return // 跳过未知的
    } else if (rec.os_distro.includes('Windows')) {
      os = 'Windows'
    } else {
      os = rec.os_distro
    }

    // 查找是否已存在
    const existing = result.find(o => o.os_distro === os)
    if (existing) {
      existing.count += rec.count
    } else {
      result.push({
        os_distro: os,
        count: rec.count
      })
    }
  })

  return result
}

/**
 * 格式化数字（千分位）
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
