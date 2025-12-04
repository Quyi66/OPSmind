/**
 * 巡检状态相关常量和工具函数
 */

// 任务状态映射
export const JOB_STATUS_MAP = {
  OK: { type: 'success', text: '完成' },
  ERROR: { type: 'danger', text: '失败' },
  WAITING: { type: 'info', text: '等待中' },
  RUNNING: { type: 'warning', text: '运行中' }
}

// 检查项状态映射
export const CHECK_STATUS_MAP = {
  OK: { type: 'success', text: '检查通过', icon: 'fa-check', tagType: 'success' },
  FAILED: { type: 'danger', text: '检查失败', icon: 'fa-times', tagType: 'danger' },
  CHECK: { type: 'warning', text: '人工检查', icon: 'fa-user-md', tagType: 'warning' },
  SKIPPING: { type: 'info', text: '白名单', icon: 'fa-adjust', tagType: 'info' },
  UNREACHABLE: { type: 'info', text: '无数据', icon: 'fa-question', tagType: 'info' }
}

// 统计卡片配置
export const STATISTICS_CARD_CONFIG = [
  { name: 'OK', label: '检查通过', icon: 'fa fa-check', theme: 'theme-success' },
  { name: 'FAILED', label: '检查失败', icon: 'fa fa-times', theme: 'theme-danger' },
  { name: 'CHECK', label: '人工检查', icon: 'fa fa-user-md', theme: 'theme-info' },
  { name: 'SKIPPING', label: '白名单', icon: 'fa fa-adjust', theme: 'theme-secondary' },
  { name: 'UNREACHABLE', label: '数据缺失', icon: 'fa fa-question', theme: 'theme-warning' }
]

// 状态筛选选项
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'OK', label: '检查通过' },
  { value: 'FAILED', label: '检查失败' },
  { value: 'CHECK', label: '人工检查' },
  { value: 'SKIPPING', label: '跳过' },
  { value: 'UNREACHABLE', label: '无数据' }
]

/**
 * 获取任务状态类型
 */
export function getJobStatusType(status) {
  return JOB_STATUS_MAP[status]?.type || 'info'
}

/**
 * 获取任务状态文本
 */
export function getJobStatusText(status) {
  return JOB_STATUS_MAP[status]?.text || status || '-'
}

/**
 * 获取检查项状态类型
 */
export function getItemStatusType(status) {
  return CHECK_STATUS_MAP[status]?.type || 'info'
}

/**
 * 获取检查项状态文本
 */
export function getItemStatusText(status) {
  return CHECK_STATUS_MAP[status]?.text || status || '-'
}

/**
 * 获取 KPI 状态标签类型
 */
export function getKpiStatusTagType(status) {
  return CHECK_STATUS_MAP[status]?.tagType || 'info'
}

/**
 * 获取 KPI 状态图标
 */
export function getKpiStatusIcon(status) {
  return CHECK_STATUS_MAP[status]?.icon || 'fa-question'
}

/**
 * 获取 KPI 状态文本
 */
export function getKpiStatusLabel(status) {
  return CHECK_STATUS_MAP[status]?.text || status || '-'
}
