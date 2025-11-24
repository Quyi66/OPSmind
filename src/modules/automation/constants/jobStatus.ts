export const JOB_STATUS_LABELS: Record<string, string> = {
  WAITING: '等待中',
  RUNNING: '正在运行',
  CALLBACK: '回调',
  ERROR: '运行错误',
  FAILED: '运行失败',
  COMPLETED: '完成',
  INTERRUPTED: '运行终止',
  SUCCESS: '执行成功',
  PARTIAL_SUCCESS: '部分成功',
  CANCELLED: '已取消'
}

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

export const JOB_STATUS_TAG_TYPES: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
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
  { label: 'ALL', value: 'all' },
  { label: '等待中', value: 'WAITING' },
  { label: '正在运行', value: 'RUNNING' },
  { label: '回调', value: 'CALLBACK' },
  { label: '运行错误', value: 'ERROR' },
  { label: '运行失败', value: 'FAILED' },
  { label: '完成', value: 'COMPLETED' },
  { label: '运行终止', value: 'INTERRUPTED' }
]

export function getJobStatusLabel(status?: string): string {
  if (!status) return ''
  return JOB_STATUS_LABELS[status] || status
}
