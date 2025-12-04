/**
 * 资产管理模块工具函数
 */

/**
 * 格式化日期时间
 * @param {string|Date} date - 日期
 * @param {string} format - 格式
 */
export function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化日期（短格式）
 * @param {string|Date} date - 日期
 */
export function formatDate(date) {
  return formatDateTime(date, 'MM-DD')
}

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
