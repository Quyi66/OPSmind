import { changeControlTimestamp } from './changeControl'

const failedHostResultStatuses = new Set([
  'PRE_CHECKING', 'PRE_CHECK_DONE', 'PRE_CHECK_FAILED',
  'INSTALLING', 'INSTALL_DONE', 'INSTALL_FAILED',
  'RESTART_PENDING', 'RESTARTING', 'RESTART_DONE', 'RESTART_FAILED',
  'VALIDATING', 'VALIDATE_FAILED', 'COMPLETED', 'FAILED'
])

export function canViewPatchTaskFailedHosts(task) {
  return Boolean(task && task.taskType !== 'rollback' && failedHostResultStatuses.has(task.status))
}

export function canInspectPatchTask(task) {
  return Boolean(task && !String(task.osType || task.os_type || '').toLowerCase().includes('win') &&
    ['INSTALL_DONE', 'INSTALL_FAILED', 'ROLLBACK_DONE', 'ROLLBACK_FAILED', 'RESTART_PENDING',
      'RESTART_DONE', 'VALIDATE_FAILED', 'COMPLETED'].includes(task.status))
}

export function isApprovalExpired(task, now = Date.now()) {
  return [task.scheduledTime, task.planEndTime]
    .some(value => changeControlTimestamp(value) <= now)
}

export function isApprovedInstallApplication(task) {
  return Boolean(task && !task.scheduledTime &&
    String(task.taskType || '').toLowerCase() !== 'rollback' &&
    (task.approvedBy || task.approvedTime))
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
