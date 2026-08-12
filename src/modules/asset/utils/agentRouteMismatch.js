export const AGENT_ROUTE_MISMATCH_PREFIX = '[AgentRouteMismatch]'

function findInValue(value, visited) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return findInValue(JSON.parse(trimmed), visited)
      } catch {
        // 不是合法 JSON 时继续按普通文本处理。
      }
    }
    const index = value.indexOf(AGENT_ROUTE_MISMATCH_PREFIX)
    return index >= 0 ? value.slice(index).trim() : ''
  }
  if (!value || typeof value !== 'object' || visited.has(value)) return ''

  visited.add(value)
  const values = Array.isArray(value) ? value : Object.values(value)
  for (const item of values) {
    const matched = findInValue(item, visited)
    if (matched) return matched
  }
  return ''
}

export function extractAgentRouteMismatchMessage(value) {
  return findInValue(value, new Set())
}
