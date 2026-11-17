import { changeControlTimestamp } from './changeControl'

export function canInspectPatchTask(task) {
  return Boolean(task && !String(task.osType || task.os_type || '').toLowerCase().includes('win') &&
    ['INSTALL_DONE', 'INSTALL_FAILED', 'ROLLBACK_DONE', 'ROLLBACK_FAILED', 'RESTART_PENDING',
      'RESTART_DONE', 'VALIDATE_FAILED', 'COMPLETED'].includes(task.status))
}

export function isApprovalExpired(task, now = Date.now()) {
  return [task.scheduledTime, task.planEndTime]
    .some(value => changeControlTimestamp(value) <= now)
}

export function isFutureSchedule(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return false
  const timestamp = changeControlTimestamp(value)
  return Number.isFinite(timestamp) && timestamp > now
}

export function isTaskExecutionBlocked(task, now = Date.now()) {
  return !task || ['PENDING_APPROVAL', 'REJECTED', 'EXPIRED'].includes(task.status) ||
    isFutureSchedule(task.scheduledTime, now)
}

export function isPackageInstallFinished(status) {
  return ['INSTALL_DONE', 'INSTALL_FAILED', 'FAILED', 'COMPLETED', 'REJECTED', 'EXPIRED'].includes(status)
}
