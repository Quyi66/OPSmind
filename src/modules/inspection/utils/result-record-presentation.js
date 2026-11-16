import { t } from '@/core/i18n'
// Configured entries in each original audit group, not observed report coverage or deduplicated hosts.
export function summarizeResultConfiguration(value) {
  const unknown = { hostCount: null, scriptCount: null, get summary() { return t('inspection.results.configurationUnknown') } }
  if (value == null || value === '') return unknown
  try {
    const groups = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(groups)) return unknown
    let hostCount = 0
    let scriptCount = 0
    const summaries = []
    for (const [index, group] of groups.entries()) {
      if (!group || typeof group !== 'object' || Array.isArray(group)) return unknown
      const hosts = group.hosts == null ? 0 : Array.isArray(group.hosts) ? group.hosts.length : null
      const scripts =
        group.scripts == null ? 0 : Array.isArray(group.scripts) ? group.scripts.length : null
      hostCount = hostCount === null || hosts === null ? null : hostCount + hosts
      scriptCount = scriptCount === null || scripts === null ? null : scriptCount + scripts
      summaries.push({ group: index + 1, hosts: hosts ?? '—', scripts: scripts ?? '—' })
    }
    return {
      hostCount,
      scriptCount,
      get summary() {
        return summaries.map(({ group, hosts, scripts }) => t('inspection.results.groupSummary', { group, hosts, scripts })).join('\n') || t('inspection.results.noConfiguration')
      }
    }
  } catch {
    return unknown
  }
}
