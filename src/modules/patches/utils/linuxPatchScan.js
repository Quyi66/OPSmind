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

function parseMemoryMb(value) {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value
  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function formatMemoryGb(memoryMb) {
  return (memoryMb / 1024).toFixed(1)
}

function getMemoryUsageLevel(usedPercent) {
  if (usedPercent === null) return null
  if (usedPercent >= 90) return 'danger'
  if (usedPercent >= 75) return 'warning'
  return 'healthy'
}

export function buildMemoryOverview(totalMbValue, freeMbValue) {
  const totalMb = parseMemoryMb(totalMbValue)
  const freeMb = parseMemoryMb(freeMbValue)

  if (totalMb === null && freeMb === null) {
    return null
  }

  const hasUsage = totalMb !== null && totalMb > 0 && freeMb !== null
  const usedPercent = hasUsage
    ? Math.round(((totalMb - Math.min(freeMb, totalMb)) / totalMb) * 100)
    : null

  return {
    totalGb: totalMb !== null ? formatMemoryGb(totalMb) : null,
    freeGb: freeMb !== null ? formatMemoryGb(freeMb) : null,
    usedPercent,
    usageLevel: getMemoryUsageLevel(usedPercent)
  }
}
