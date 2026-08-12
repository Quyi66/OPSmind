export const AGENT_PLATFORM = Object.freeze({
  WINDOWS: 'windows',
  LINUX: 'linux',
  UNKNOWN: 'unknown'
})

export function getAgentPlatform(record) {
  const value = String(record?.agentPlatform || record?.agent_platform || '').trim().toLowerCase()
  return [AGENT_PLATFORM.WINDOWS, AGENT_PLATFORM.LINUX].includes(value)
    ? value
    : AGENT_PLATFORM.UNKNOWN
}

export function getAgentPlatformLabel(record) {
  return {
    [AGENT_PLATFORM.WINDOWS]: 'Windows',
    [AGENT_PLATFORM.LINUX]: 'Linux',
    [AGENT_PLATFORM.UNKNOWN]: '平台未知'
  }[getAgentPlatform(record)]
}

export function getAgentCmdbIp(record) {
  return String(record?.cmdbIp || record?.cmdb_ip || record?.IP || record?.ip || '').trim()
}

export function getAgentReportedIp(record) {
  return String(record?.lastReportedIp || record?.last_reported_ip || '').trim()
}

export function hasAgentIpMismatch(record) {
  return record?.ipMismatch === true || record?.ip_mismatch === true
}

export function formatAgentTimestamp(value) {
  return String(value || '').trim().replace(/(\d{2})\.\d+$/, '$1') || '-'
}
