/**
 * 全局通用日期时间工具函数
 */

/**
 * 格式化日期时间
 * @param {string|Date|number} date - 日期、时间戳或ISO字符串
 * @param {string} format - 格式化模板 (如 'YYYY-MM-DD HH:mm:ss'，'MM-DD HH:mm')
 * @returns {string} 格式化后的时间字符串，若无效则返回 '-'
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
 * 格式化日期（短格式 MM-DD）
 * @param {string|Date|number} date - 日期
 * @returns {string} 格式化后的日期
 */
export function formatDate(date) {
  return formatDateTime(date, 'MM-DD')
}
