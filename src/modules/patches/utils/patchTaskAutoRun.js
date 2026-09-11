// 仅记录 /run 已成功的任务，不根据向导共用的状态推断执行模式。
// sessionStorage 保留当前标签页刷新后的模式；存储不可用时退回内存。
export const autoRunTaskIds = new Set()
const storageKey = id => `patch-task:auto-run:${id}`

export function rememberAutoRunTask(id) {
  if (!id) return
  autoRunTaskIds.add(String(id))
  try {
    sessionStorage.setItem(storageKey(id), 'true')
  } catch {
    // 浏览器可能禁用会话存储，仍支持当前页面内重新打开详情。
  }
}

export function forgetAutoRunTask(id) {
  autoRunTaskIds.delete(String(id))
  try {
    sessionStorage.removeItem(storageKey(id))
  } catch {
    // 会话存储不可用。
  }
}

export function isAutoRunTask(task) {
  const id = String(task?.id || task?.taskId || '')
  if (!id) return false
  if (autoRunTaskIds.has(id)) return true
  try {
    return sessionStorage.getItem(storageKey(id)) === 'true'
  } catch {
    return false
  }
}

export function canRunPatchTask(task) {
  const status = task?.status || ''
  return (
    ['CREATED', 'PRE_CHECK_DONE', 'RESTART_DONE'].includes(status) || status.endsWith('_FAILED')
  )
}

export function needsAutoRunRestartConfirmation(task) {
  return (
    ['INSTALL_DONE', 'ROLLBACK_DONE'].includes(task?.status) &&
    task?.restartType !== 'none' &&
    task?.restartConfirmed !== true
  )
}
