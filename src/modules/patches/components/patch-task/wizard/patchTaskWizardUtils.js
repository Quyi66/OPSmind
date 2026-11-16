import { t } from '@/core/i18n'
export function formatHostDisplay(host) {
  const hostName = host?.hostKey || host?.hostname || host?.hostId || host?.id || t('patches.linux.currentHost')
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
  if (normalized === 'system') return t('patches.linux.systemRestart')
  if (normalized === 'service') return t('patches.linux.serviceRestart')
  return t('patches.linux.noRestartRequired')
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
    t('patches.linux.restartAdviceHostCount', { count: hostAdviceList.length }),
    t('patches.linux.restartAdviceCounts', { system: systemHosts.length, service: serviceHosts.length, none: noneHosts.length })
  ]

  if (highlightedHosts.length > 0) {
    parts.push(t('patches.linux.restartExamples', { examples: highlightedHosts.join('；') }))
  }

  if (ignoredCount > 0) {
    parts.push(t('patches.linux.restartIgnored', { count: ignoredCount }))
  }

  if (failedCount > 0) {
    parts.push(t('patches.linux.restartPartial', { count: failedCount }))
  }

  return parts.join(' ')
}
