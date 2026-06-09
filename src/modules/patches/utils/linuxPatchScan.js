export function parseOsVersionFilter(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return {
      osVersion: '',
      osSpVersion: ''
    }
  }

  const [osVersion, ...osSpParts] = normalized.split(/\s+/)
  return {
    osVersion,
    osSpVersion: osSpParts.join(' ')
  }
}
