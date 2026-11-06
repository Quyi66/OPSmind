export function extractExecutionFailures(contents = []) {
  const failures = []
  const array = value => (Array.isArray(value) ? value : [])
  for (const content of array(contents)) {
    for (const play of array(content?.plays)) {
      for (const task of array(play?.tasks)) {
        for (const host of array(task?.hosts)) {
          if (!host || typeof host !== 'object') continue
          const hasFailedCode =
            host.rc !== undefined &&
            host.rc !== null &&
            host.rc !== '' &&
            Number.isFinite(Number(host.rc)) &&
            Number(host.rc) !== 0
          if (!host.failed && !host.unreachable && !hasFailedCode) continue
          failures.push({
            host: host.hostKey || host.host || host.name || '',
            step: task.task?.name || task.name || '',
            status: host.unreachable ? '不可达' : '失败',
            message: host.msg || host.message || host.stderr || host.stdout || '',
            raw: JSON.stringify(host, null, 2)
          })
        }
      }
    }
  }
  return failures
}
