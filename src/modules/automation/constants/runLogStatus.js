export const RUN_LOG_STATUS_MAP = Object.freeze({
  WAITING: { label: '等待中', type: 'info' },
  RUNNING: { label: '正在运行', type: 'primary' },
  CALLBACK: { label: '回调', type: 'primary' },
  ERROR: { label: '运行错误', type: 'warning' },
  FAILED: { label: '运行失败', type: 'danger' },
  FAILURE: { label: '运行失败', type: 'danger' },
  COMPLETED: { label: '完成', type: 'success' },
  SUCCESS: { label: '完成', type: 'success' },
  FINISH: { label: '完成', type: 'success' },
  INTERRUPTED: { label: '运行终止', type: 'info' },
  TIMEOUT: { label: '超时', type: 'warning' }
})

export function getRunLogStatusLabel(status) {
  const normalized = String(status || '').toUpperCase()
  return RUN_LOG_STATUS_MAP[normalized]?.label || status || '-'
}

export function getRunLogStatusType(status) {
  const normalized = String(status || '').toUpperCase()
  return RUN_LOG_STATUS_MAP[normalized]?.type || 'info'
}
