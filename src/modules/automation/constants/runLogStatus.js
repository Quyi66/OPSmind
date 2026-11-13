import { t } from '@/core/i18n'

export const RUN_LOG_STATUS_MAP = Object.freeze({
  WAITING: { get label() { return t('execution.jobStatus.WAITING') }, type: 'info' },
  RUNNING: { get label() { return t('execution.jobStatus.RUNNING') }, type: 'primary' },
  CALLBACK: { get label() { return t('execution.jobStatus.CALLBACK') }, type: 'primary' },
  ERROR: { get label() { return t('execution.jobStatus.ERROR') }, type: 'warning' },
  FAILED: { get label() { return t('execution.jobStatus.FAILED') }, type: 'danger' },
  FAILURE: { get label() { return t('execution.jobStatus.FAILED') }, type: 'danger' },
  COMPLETED: { get label() { return t('execution.jobStatus.COMPLETED') }, type: 'success' },
  SUCCESS: { get label() { return t('execution.jobStatus.COMPLETED') }, type: 'success' },
  FINISH: { get label() { return t('execution.jobStatus.COMPLETED') }, type: 'success' },
  INTERRUPTED: { get label() { return t('execution.jobStatus.INTERRUPTED') }, type: 'info' },
  TIMEOUT: { get label() { return t('execution.jobStatus.TIMEOUT') }, type: 'warning' }
})

export function getRunLogStatusLabel(status) {
  const normalized = String(status || '').toUpperCase()
  return RUN_LOG_STATUS_MAP[normalized]?.label || status || '-'
}

export function getRunLogStatusType(status) {
  const normalized = String(status || '').toUpperCase()
  return RUN_LOG_STATUS_MAP[normalized]?.type || 'info'
}
