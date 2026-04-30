export function formatHostDisplay(host) {
  const hostName = host?.hostKey || host?.hostname || host?.hostId || host?.id || '当前主机'
  const osName = [host?.os_distro, host?.os_version].filter(Boolean).join(' ')
  return osName ? `${hostName} (${osName})` : hostName
}

export function normalizeRestartType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return ['system', 'service', 'none'].includes(normalized) ? normalized : 'none'
}

export function getRestartPriority(value) {
  const normalized = normalizeRestartType(value)
  if (normalized === 'system') return 2
  if (normalized === 'service') return 1
  return 0
}

export function getRestartLabel(value) {
  const normalized = normalizeRestartType(value)
  if (normalized === 'system') return '系统重启'
  if (normalized === 'service') return '服务重启'
  return '无需重启'
}

export function resolveHostIp(host) {
  return String(
    host?.hostIp ||
      host?.host_ip ||
      host?.hostKey ||
      host?.host_key ||
      host?.ip ||
      host?.hostname ||
      ''
  ).trim()
}

export function buildRestartAdviceDescription(hostAdviceList, ignoredCount, failedCount) {
  const systemHosts = hostAdviceList.filter(item => item.rebootStatus === 'system')
  const serviceHosts = hostAdviceList.filter(item => item.rebootStatus === 'service')
  const noneHosts = hostAdviceList.filter(item => item.rebootStatus === 'none')
  const highlightedHosts = hostAdviceList
    .filter(item => item.rebootStatus !== 'none')
    .slice(0, 3)
    .map(item => `${item.hostLabel}：${getRestartLabel(item.rebootStatus)}`)

  const parts = [
    `后端已基于 ${hostAdviceList.length} 台目标主机的补丁状态生成重启建议。`,
    `系统重启 ${systemHosts.length} 台，服务重启 ${serviceHosts.length} 台，无需重启 ${noneHosts.length} 台。`
  ]

  if (highlightedHosts.length > 0) {
    parts.push(`示例：${highlightedHosts.join('；')}。`)
  }

  if (ignoredCount > 0) {
    parts.push(`${ignoredCount} 个主机与补丁组合未命中状态记录，已自动忽略。`)
  }

  if (failedCount > 0) {
    parts.push(`${failedCount} 个主机与补丁组合查询失败，当前结果已按成功返回部分汇总。`)
  }

  return parts.join(' ')
}
