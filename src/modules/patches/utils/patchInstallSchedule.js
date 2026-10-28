export function isFutureSchedule(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return false
  const timestamp = new Date(typeof value === 'string' ? value.replace(' ', 'T') : value).getTime()
  return Number.isFinite(timestamp) && timestamp > now
}

export function isTaskExecutionBlocked(task, now = Date.now()) {
  return !task || ['PENDING_APPROVAL', 'REJECTED', 'EXPIRED'].includes(task.status) ||
    isFutureSchedule(task.scheduledTime, now)
}

export function isPackageInstallFinished(status) {
  return ['INSTALL_DONE', 'INSTALL_FAILED', 'FAILED', 'COMPLETED', 'REJECTED', 'EXPIRED'].includes(status)
}
