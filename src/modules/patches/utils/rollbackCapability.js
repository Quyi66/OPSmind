function normalizeBoolean(value) {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}

/**
 * 回滚属于补丁业务能力，不能用 Agent 的 rollback 通道能力代替。
 * 只有后端任务明确返回 rollbackSupported=true 才允许创建回滚任务。
 */
export function getRollbackSupportInfo(record = {}) {
  const supported = normalizeBoolean(record.rollbackSupported ?? record.rollback_supported)
  const reason =
    record.rollbackUnsupportedReason ||
    record.rollback_unsupported_reason ||
    (supported ? '' : '该安装任务未返回可回滚确认')

  return { supported, reason }
}

export function getRollbackSupportIssues(records = []) {
  return records
    .map(record => {
      const support = getRollbackSupportInfo(record)
      if (support.supported) return null
      return {
        host: record.host_key || record.hostKey || record.hosts || record.hostId || record.host_id || '未知主机',
        reason: support.reason
      }
    })
    .filter(Boolean)
}

export function formatRollbackSupportIssues(issues = []) {
  if (!issues.length) return ''
  const details = issues.slice(0, 3).map(item => `[${item.host}] ${item.reason}`).join('；')
  const more = issues.length > 3 ? `；另有 ${issues.length - 3} 条记录不可回滚` : ''
  return `已阻止回滚：${issues.length} 条记录未获得后端回滚确认。${details}${more}`
}
