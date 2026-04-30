function stringifyObject(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function normalizeServiceList(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          return String(item.name || item.service || item.value || '').trim()
        }
        return String(item || '').trim()
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return normalizeServiceList(JSON.parse(trimmed))
      } catch {
        return trimmed
          .split(/[\n,]/)
          .map(item => item.trim())
          .filter(Boolean)
      }
    }

    return trimmed
      .split(/[\n,]/)
      .map(item => item.trim())
      .filter(Boolean)
  }

  return [String(value).trim()].filter(Boolean)
}

export function normalizeChangelog(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()

  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : stringifyObject(item)))
      .filter(Boolean)
      .join('\n\n')
  }

  if (typeof value === 'object') {
    return stringifyObject(value)
  }

  return String(value)
}

export function normalizeRpmPackageDetail(rawDetail = {}) {
  const packageInfo =
    rawDetail.packageInfo && typeof rawDetail.packageInfo === 'object' ? rawDetail.packageInfo : null

  const baseDetail = packageInfo
    ? {
        ...packageInfo,
        description:
          rawDetail.packageDescription || packageInfo.description || packageInfo.packageDescription || '',
        changelog: rawDetail.changelog || packageInfo.changelog || '',
        services: rawDetail.services || packageInfo.services || []
      }
    : { ...rawDetail }

  return {
    ...baseDetail,
    id: baseDetail.id || rawDetail.id || '',
    name: baseDetail.name || rawDetail.pkgName || rawDetail.packageName || rawDetail.name || '',
    source: baseDetail.source || rawDetail.source || '',
    architecture:
      baseDetail.architecture ||
      baseDetail.arch ||
      baseDetail.pkgArch ||
      rawDetail.pkgArch ||
      rawDetail.architecture ||
      rawDetail.arch ||
      '',
    version: baseDetail.version || rawDetail.version || '',
    release: baseDetail.release || rawDetail.release || '',
    summary: baseDetail.summary || rawDetail.summary || '',
    description: baseDetail.description || rawDetail.packageDescription || rawDetail.description || '',
    changelog: normalizeChangelog(baseDetail.changelog || rawDetail.changelog),
    services: normalizeServiceList(baseDetail.services || rawDetail.services),
    rpmPath: baseDetail.rpmPath || baseDetail.rpm_path || rawDetail.rpmPath || rawDetail.rpm_path || ''
  }
}

export function formatRpmVersion(detail = {}) {
  const version = String(detail.version || '').trim()
  const release = String(detail.release || '').trim()

  if (version && release) return `${version}-${release}`
  if (version) return version
  if (release) return release
  return '-'
}

export function getServicePreview(value, maxItems = 2) {
  const services = normalizeServiceList(value)

  return {
    services,
    preview: services.slice(0, maxItems),
    restCount: Math.max(services.length - maxItems, 0)
  }
}
