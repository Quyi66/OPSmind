import { t } from '@/core/i18n'

function createStatusLabels(statuses: string[], namespace: string): Record<string, string> {
  return Object.defineProperties(
    {},
    Object.fromEntries(
      statuses.map(status => [status, { enumerable: true, get: () => t(`${namespace}.${status}`) }])
    )
  )
}

export const JOB_STATUS_LABELS = createStatusLabels(
  [
    'WAITING',
    'RUNNING',
    'CALLBACK',
    'ERROR',
    'FAILED',
    'COMPLETED',
    'INTERRUPTED',
    'SUCCESS',
    'PARTIAL_SUCCESS',
    'CANCELLED'
  ],
  'execution.jobStatus'
)

export const TASK_STATUS_LABELS = createStatusLabels(
  ['ok', 'changed', 'failed', 'unreachable', 'ignored', 'skipped', 'running', 'unknown'],
  'execution.taskStatus'
)

export const JOB_STATUS_CLASS_MAP: Record<string, string> = {
  WAITING: 'is-waiting',
  RUNNING: 'is-waiting',
  CALLBACK: 'is-warning',
  ERROR: 'is-danger',
  FAILED: 'is-danger',
  COMPLETED: 'is-success',
  INTERRUPTED: 'is-info',
  SUCCESS: 'is-success',
  PARTIAL_SUCCESS: 'is-warning',
  CANCELLED: 'is-info'
}

export const JOB_STATUS_TAG_TYPES: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> =
  {
    WAITING: 'info',
    RUNNING: 'info',
    CALLBACK: 'warning',
    ERROR: 'danger',
    FAILED: 'danger',
    COMPLETED: 'success',
    INTERRUPTED: 'info',
    SUCCESS: 'success',
    PARTIAL_SUCCESS: 'warning',
    CANCELLED: 'info'
  }

export const JOB_HISTORY_STATUS_OPTIONS = [
  'all',
  'WAITING',
  'RUNNING',
  'CALLBACK',
  'ERROR',
  'FAILED',
  'COMPLETED',
  'INTERRUPTED'
].map(value => ({
  value,
  get label() {
    return value === 'all' ? t('common.all') : JOB_STATUS_LABELS[value]
  }
}))

export function getJobStatusLabel(status?: string): string {
  if (!status) return ''
  return JOB_STATUS_LABELS[status] || status
}
