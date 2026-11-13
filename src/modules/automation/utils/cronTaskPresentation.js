import { t } from '@/core/i18n'

// 仅派生展示身份，不写回任务或用关联工具 ID 替代调度 ID。
export function getCronTaskName(task) {
  return typeof task.jobDesc === 'string' && task.jobDesc.trim() ? task.jobDesc : t('automation.cron.unnamed')
}

export function getCronTaskType(type) {
  return (
    {
      rest: t('automation.cron.rest'),
      script: t('automation.cron.script'),
      audit: t('automation.types.audit'),
      cac: t('automation.types.audit'),
      cmd: t('automation.types.cmd'),
      flows: t('automation.types.flows')
    }[type] ||
    type ||
    t('automation.cron.typeMissing')
  )
}

export function getCronTaskId(task) {
  return task.id === null || task.id === undefined || task.id === '' ? '' : String(task.id)
}

export function getCronTaskShortId(task) {
  const id = getCronTaskId(task)
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id
}

export function getCronTaskIdentity(task) {
  return t('automation.cron.identity', { name: getCronTaskName(task), type: getCronTaskType(task.jobType), id: getCronTaskShortId(task) || t('automation.cron.idMissing') })
}

export function getCronTaskConfirmation(task) {
  const id = getCronTaskId(task)
  return id.length > 12 ? t('automation.cron.fullId', { identity: getCronTaskIdentity(task), id }) : getCronTaskIdentity(task)
}

export function getCronTaskDisplayName(task, tasks) {
  const name = getCronTaskName(task)
  const ambiguous =
    !task.jobDesc ||
    !String(task.jobDesc).trim() ||
    tasks.filter(item => getCronTaskName(item) === name).length > 1
  if (!ambiguous) return name
  // 极少数前后缀相同的长 ID 使用全值，避免短标识碰撞。
  const collision = tasks.some(
    item =>
      getCronTaskId(item) !== getCronTaskId(task) &&
      getCronTaskShortId(item) === getCronTaskShortId(task)
  )
  return collision ? getCronTaskConfirmation(task) : getCronTaskIdentity(task)
}

export function matchesCronTaskKeyword(task, keyword, fields) {
  const query = keyword.trim().toLowerCase()
  const exactId = /^id[:：]\s*(.*)$/.exec(query)
  if (exactId) return getCronTaskId(task).toLowerCase() === exactId[1]
  return [getCronTaskId(task), ...fields.map(field => task[field])].some(
    value => value !== null && value !== undefined && String(value).toLowerCase().includes(query)
  )
}
