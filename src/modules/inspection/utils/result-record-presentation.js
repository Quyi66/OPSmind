// Configured entries in each original audit group, not observed report coverage or deduplicated hosts.
export function summarizeResultConfiguration(value) {
  const unknown = { hostCount: null, scriptCount: null, summary: '配置信息无法核实' }
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
      summaries.push(`配置组 ${index + 1}：主机 ${hosts ?? '—'}，脚本 ${scripts ?? '—'}`)
    }
    return { hostCount, scriptCount, summary: summaries.join('\n') || '暂无配置条目' }
  } catch {
    return unknown
  }
}
