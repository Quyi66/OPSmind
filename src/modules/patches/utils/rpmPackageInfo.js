function stringifyObject(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const CHANGELOG_BASE_PATH = '/KoreOPS/changelog'

function addUniqueText(target, value) {
  const normalizedValue = String(value || '').trim()
  if (normalizedValue && !target.includes(normalizedValue)) {
    target.push(normalizedValue)
  }
}

function stripPackageFileSuffix(value) {
  return String(value || '')
    .trim()
    .replace(/^.*[\\/]/, '')
    .replace(/\.(?:rpm|deb)$/i, '')
}

function extractVersionFromPackageIdentifier(identifier, { name, architecture } = {}) {
  let packageText = stripPackageFileSuffix(identifier)
  const packageName = String(name || '').trim()
  const arch = String(architecture || '').trim()

  if (!packageText) return ''

  if (arch) {
    const architectureSuffixes = [`.${arch}`, `-${arch}`, `_${arch}`]
    const matchedSuffix = architectureSuffixes.find(suffix =>
      packageText.toLowerCase().endsWith(suffix.toLowerCase())
    )
    if (matchedSuffix) {
      packageText = packageText.slice(0, -matchedSuffix.length)
    }
  }

  if (!packageName) return ''

  const packagePrefixes = [`${packageName}-`, `${packageName}_`, `${packageName}=`]
  const matchedPrefix = packagePrefixes.find(prefix =>
    packageText.toLowerCase().startsWith(prefix.toLowerCase())
  )

  return matchedPrefix ? packageText.slice(matchedPrefix.length).trim() : ''
}

function changelogHeaderMatchesVersion(header, version) {
  const normalizedHeader = String(header || '').trim()
  const normalizedVersion = String(version || '').trim()
  if (!normalizedHeader || !normalizedVersion) return false

  return (
    normalizedHeader.includes(`[${normalizedVersion}]`) ||
    normalizedHeader.includes(`(${normalizedVersion})`) ||
    normalizedHeader.endsWith(` - ${normalizedVersion}`)
  )
}

function isDebianChangelogHeader(line) {
  return /^\S+\s+\([^)]+\)\s+[^;]+;\s*urgency=/i.test(String(line || '').trim())
}

export function buildRpmChangelogFileUrl(source) {
  const rawSource = String(source || '').trim()
  const normalizedSource = normalizePackageDetailSource({ source: rawSource }) || rawSource.toLowerCase()
  if (!normalizedSource || !/^[a-z0-9_-]+$/.test(normalizedSource)) return ''

  return `${CHANGELOG_BASE_PATH}/${encodeURIComponent(normalizedSource)}.txt`
}

export function getRpmChangelogVersionCandidates(detail = {}) {
  const normalizedDetail = normalizeRpmPackageDetail(detail)
  const versions = []
  const version = String(normalizedDetail.version || '').trim()
  const release = String(normalizedDetail.release || '').trim()

  if (version && release) {
    addUniqueText(versions, version.endsWith(`-${release}`) ? version : `${version}-${release}`)
  }
  addUniqueText(versions, version)

  const packageIdentifiers = [
    normalizedDetail.currentPackage,
    normalizedDetail.completePackageName,
    normalizedDetail.pkgId,
    normalizedDetail.installedPkg,
    normalizedDetail.rpmPath
  ]

  packageIdentifiers.forEach(identifier => {
    addUniqueText(
      versions,
      extractVersionFromPackageIdentifier(identifier, {
        name: normalizedDetail.name,
        architecture: normalizedDetail.architecture
      })
    )
  })

  return versions.sort((left, right) => right.length - left.length)
}

export function extractRpmPackageChangelog(changelog, detail = {}) {
  const rawText = normalizeChangelog(changelog).replace(/\r\n?/g, '\n')
  const versions = getRpmChangelogVersionCandidates(detail)
  if (!rawText || !versions.length) return ''

  const lines = rawText.split('\n')
  for (let start = 0; start < lines.length; start += 1) {
    const header = lines[start]
    const normalizedHeader = String(header || '').trim()
    const isRpmHeader = /^\*\s+/.test(normalizedHeader)
    const isDebianHeader = isDebianChangelogHeader(normalizedHeader)
    if (!isRpmHeader && !isDebianHeader) continue

    const matched = versions.some(version => changelogHeaderMatchesVersion(header, version))
    if (!matched) continue

    let end = lines.length
    for (let index = start + 1; index < lines.length; index += 1) {
      const candidateLine = String(lines[index] || '').trim()
      const isNextHeader = isDebianHeader
        ? isDebianChangelogHeader(candidateLine)
        : /^\*\s+/.test(candidateLine)
      if (isNextHeader) {
        end = index
        break
      }
    }

    return lines.slice(start, end).join('\n').trim()
  }

  return ''
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

function splitChangelogHeader(header) {
  const normalizedHeader = String(header || '')
    .trim()
    .replace(/^\*\s*/, '')
  if (!normalizedHeader) {
    return {
      headline: '',
      version: '',
      dateText: '',
      maintainer: '',
      email: ''
    }
  }

  const bracketVersionMatch = normalizedHeader.match(/^(.*?)\s+\[([^\]]+)\]\s*$/)
  const separatorIndex = bracketVersionMatch ? -1 : normalizedHeader.lastIndexOf(' - ')
  const headline = bracketVersionMatch
    ? bracketVersionMatch[1].trim()
    : separatorIndex === -1
      ? normalizedHeader
      : normalizedHeader.slice(0, separatorIndex).trim()
  const version = bracketVersionMatch
    ? bracketVersionMatch[2].trim()
    : separatorIndex === -1
      ? ''
      : normalizedHeader.slice(separatorIndex + 3).trim()
  const headerMatch = headline.match(
    /^([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4})\s+(.+?)(?:\s+<([^>]+)>)?$/
  )

  if (headerMatch) {
    return {
      headline,
      version,
      dateText: headerMatch[1].trim(),
      maintainer: headerMatch[2].trim(),
      email: String(headerMatch[3] || '').trim()
    }
  }

  if (separatorIndex === -1) {
    return {
      headline,
      version,
      dateText: '',
      maintainer: '',
      email: ''
    }
  }

  return {
    headline,
    version,
    dateText: '',
    maintainer: '',
    email: ''
  }
}

export function parseRpmChangelog(value) {
  const rawText = normalizeChangelog(value)
  if (!rawText) {
    return {
      rawText: '',
      entries: [],
      isStructured: false
    }
  }

  const firstContentLine = rawText.split(/\r?\n/).find(line => String(line || '').trim())
  if (isDebianChangelogHeader(firstContentLine)) {
    return {
      rawText,
      entries: [],
      isStructured: false
    }
  }

  const lines = rawText.split(/\r?\n/)
  const entries = []
  const introLines = []
  let currentEntry = null

  const pushCurrentEntry = () => {
    if (!currentEntry) return

    entries.push({
      ...currentEntry,
      ...splitChangelogHeader(currentEntry.header)
    })
    currentEntry = null
  }

  const appendContinuation = text => {
    if (!text) return

    if (currentEntry.items.length) {
      const lastIndex = currentEntry.items.length - 1
      currentEntry.items[lastIndex] = `${currentEntry.items[lastIndex]}\n${text}`
      return
    }

    if (currentEntry.notes.length) {
      const lastIndex = currentEntry.notes.length - 1
      currentEntry.notes[lastIndex] = `${currentEntry.notes[lastIndex]}\n${text}`
      return
    }

    currentEntry.notes.push(text)
  }

  lines.forEach(rawLine => {
    const line = String(rawLine || '').trimEnd()
    const trimmedLine = line.trim()

    if (!trimmedLine) return

    if (/^\*\s+/.test(trimmedLine)) {
      pushCurrentEntry()
      currentEntry = {
        header: trimmedLine.replace(/^\*\s+/, ''),
        items: [],
        notes: []
      }
      return
    }

    if (!currentEntry) {
      introLines.push(trimmedLine)
      return
    }

    if (/^-\s+/.test(trimmedLine)) {
      currentEntry.items.push(trimmedLine.replace(/^-\s+/, ''))
      return
    }

    appendContinuation(trimmedLine)
  })

  pushCurrentEntry()

  const hasStructuredEntries =
    entries.some(entry => entry.header) &&
    entries.some(entry => entry.items.length || entry.notes.length)

  if (!hasStructuredEntries) {
    return {
      rawText,
      entries: [],
      isStructured: false
    }
  }

  if (introLines.length) {
    entries.unshift({
      header: '',
      headline: '',
      version: '',
      items: [],
      notes: introLines
    })
  }

  return {
    rawText,
    entries,
    isStructured: true
  }
}

export function normalizeRpmPackageDetail(rawDetail = {}) {
  const packageInfo =
    rawDetail.packageInfo && typeof rawDetail.packageInfo === 'object'
      ? rawDetail.packageInfo
      : null

  const baseDetail = packageInfo
    ? {
        ...packageInfo,
        description:
          rawDetail.packageDescription ||
          packageInfo.description ||
          packageInfo.packageDescription ||
          '',
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
    currentPackage:
      baseDetail.currentPackage ||
      rawDetail.currentPackage ||
      rawDetail.pkgId ||
      rawDetail.installedPkg ||
      baseDetail.pkgId ||
      baseDetail.installedPkg ||
      baseDetail.completePackageName ||
      rawDetail.completePackageName ||
      '',
    summary: baseDetail.summary || rawDetail.summary || '',
    description:
      baseDetail.description || rawDetail.packageDescription || rawDetail.description || '',
    changelog: normalizeChangelog(baseDetail.changelog || rawDetail.changelog),
    services: normalizeServiceList(baseDetail.services || rawDetail.services),
    rpmPath:
      baseDetail.rpmPath || baseDetail.rpm_path || rawDetail.rpmPath || rawDetail.rpm_path || ''
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

export function normalizePackageDetailSource({ source, osDistro } = {}) {
  const normalizedSource = String(source || '')
    .trim()
    .toLowerCase()
  if (
    normalizedSource.includes('suse') ||
    normalizedSource.includes('sles') ||
    normalizedSource.includes('opensuse')
  ) {
    return 'suse'
  }
  if (normalizedSource.includes('kylin')) return 'kylin'
  if (normalizedSource.includes('oracle')) return 'oracle'
  if (normalizedSource.includes('ubuntu')) return 'ubuntu'
  if (
    normalizedSource.includes('redhat') ||
    normalizedSource.includes('red hat') ||
    normalizedSource.includes('rhel')
  ) {
    return 'redhat'
  }

  const normalizedOsDistro = String(osDistro || '')
    .trim()
    .toLowerCase()
  if (
    normalizedOsDistro.includes('suse') ||
    normalizedOsDistro.includes('sles') ||
    normalizedOsDistro.includes('opensuse')
  ) {
    return 'suse'
  }
  if (normalizedOsDistro.includes('kylin')) return 'kylin'
  if (normalizedOsDistro.includes('oracle')) return 'oracle'
  if (normalizedOsDistro.includes('ubuntu')) return 'ubuntu'
  if (
    normalizedOsDistro.includes('redhat') ||
    normalizedOsDistro.includes('red hat') ||
    normalizedOsDistro.includes('rhel')
  ) {
    return 'redhat'
  }

  return ''
}

export function inferRpmSource(source, osDistro = '') {
  const normalizedSource = String(source || '')
    .trim()
    .toLowerCase()
  if (normalizedSource.includes('kylin')) return 'kylin'
  if (normalizedSource.includes('oracle')) return 'oracle'
  if (normalizedSource.includes('ubuntu')) return 'ubuntu'
  if (
    normalizedSource.includes('redhat') ||
    normalizedSource.includes('red hat') ||
    normalizedSource.includes('rhel')
  ) {
    return 'redhat'
  }

  const normalizedOsDistro = String(osDistro || '')
    .trim()
    .toLowerCase()
  if (normalizedOsDistro.includes('kylin')) return 'kylin'
  if (normalizedOsDistro.includes('oracle')) return 'oracle'
  if (normalizedOsDistro.includes('ubuntu')) return 'ubuntu'
  if (
    normalizedOsDistro.includes('redhat') ||
    normalizedOsDistro.includes('red hat') ||
    normalizedOsDistro.includes('rhel')
  ) {
    return 'redhat'
  }

  return ''
}

export function extractInstalledPackageVersion({ version, currentPackage, pkgName, arch } = {}) {
  const normalizedVersion = String(version || '').trim()
  if (normalizedVersion) return normalizedVersion

  let packageText = String(currentPackage || '').trim()
  const normalizedPkgName = String(pkgName || '').trim()
  const normalizedArch = String(arch || '').trim()

  if (!packageText || !normalizedPkgName) return ''

  if (packageText.toLowerCase().endsWith('.rpm')) {
    packageText = packageText.slice(0, -4)
  }

  if (normalizedArch && packageText.endsWith(`-${normalizedArch}`)) {
    packageText = packageText.slice(0, -(normalizedArch.length + 1))
  }

  if (!packageText.startsWith(`${normalizedPkgName}-`)) return ''

  return packageText.slice(normalizedPkgName.length + 1).trim()
}

export function getServicePreview(value, maxItems = 2) {
  const services = normalizeServiceList(value)

  return {
    services,
    preview: services.slice(0, maxItems),
    restCount: Math.max(services.length - maxItems, 0)
  }
}
