import { t } from '@/core/i18n'

/**
 * 巡检状态相关常量和工具函数
 */

// 任务状态映射
export const JOB_STATUS_MAP = {
  OK: { type: 'success', get text() { return t('inspection.status.completed') } },
  ERROR: { type: 'danger', get text() { return t('inspection.status.failed') } },
  WAITING: { type: 'info', get text() { return t('inspection.status.waiting') } },
  RUNNING: { type: 'warning', get text() { return t('inspection.status.running') } }
}

// 检查项状态映射
export const CHECK_STATUS_MAP = {
  OK: { type: 'success', get text() { return t('inspection.status.passed') }, icon: 'fa-check', tagType: 'success' },
  FAILED: { type: 'danger', get text() { return t('inspection.status.checkFailed') }, icon: 'fa-times', tagType: 'danger' },
  CHECK: { type: 'warning', get text() { return t('inspection.status.manual') }, icon: 'fa-user-md', tagType: 'warning' },
  SKIPPING: { type: 'info', get text() { return t('inspection.status.skipped') }, icon: 'fa-adjust', tagType: 'info' },
  UNREACHABLE: { type: 'info', get text() { return t('inspection.status.noData') }, icon: 'fa-question', tagType: 'info' }
}

// 统计卡片配置
export const STATISTICS_CARD_CONFIG = [
  { name: 'OK', get label() { return t('inspection.status.passed') }, icon: 'fa fa-check', theme: 'theme-success' },
  { name: 'FAILED', get label() { return t('inspection.status.checkFailed') }, icon: 'fa fa-times', theme: 'theme-danger' },
  { name: 'CHECK', get label() { return t('inspection.status.manual') }, icon: 'fa fa-user-md', theme: 'theme-info' },
  { name: 'SKIPPING', get label() { return t('inspection.status.skipped') }, icon: 'fa fa-adjust', theme: 'theme-secondary' },
  { name: 'UNREACHABLE', get label() { return t('inspection.status.missingData') }, icon: 'fa fa-question', theme: 'theme-warning' }
]

// 状态筛选选项
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', get label() { return t('inspection.status.all') } },
  { value: 'OK', get label() { return t('inspection.status.passed') } },
  { value: 'FAILED', get label() { return t('inspection.status.checkFailed') } },
  { value: 'CHECK', get label() { return t('inspection.status.manual') } },
  { value: 'SKIPPING', get label() { return t('inspection.status.skipped') } },
  { value: 'UNREACHABLE', get label() { return t('inspection.status.noData') } }
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
