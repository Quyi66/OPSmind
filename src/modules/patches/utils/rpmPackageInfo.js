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

function stripRpmDistributionSuffix(version) {
  const normalizedVersion = String(version || '').trim()
  const distributionIndex = normalizedVersion.search(
    /(?:\.module\+|[.+_-])el\d+(?=$|[._+~-])/i
  )

  return distributionIndex > 0 ? normalizedVersion.slice(0, distributionIndex) : ''
}

function extractRhelMajor(detail = {}) {
  const normalizedDetail = normalizeRpmPackageDetail(detail)
  const values = [
    normalizedDetail.currentPackage,
    normalizedDetail.completePackageName,
    normalizedDetail.pkgId,
    normalizedDetail.installedPkg,
    normalizedDetail.rpmPath,
    normalizedDetail.release,
    normalizedDetail.version,
    normalizedDetail.source,
    normalizedDetail.osVersion
  ]

  for (const value of values) {
    const normalizedValue = String(value || '').trim()
    const elMatch = normalizedValue.match(/(?:^|[._+~-])el(\d+)(?=$|[._+~-])/i)
    if (elMatch) return elMatch[1]

    const rhelMatch = normalizedValue.match(/rhel[\s_-]?(\d+)/i)
    if (rhelMatch) return rhelMatch[1]
  }

  const osVersionMatch = String(normalizedDetail.osVersion || '').match(/^(\d+)/)
  if (osVersionMatch) return osVersionMatch[1]

  return ''
}

function normalizeChangelogPathSegment(value) {
  const normalizedValue = String(value || '').trim()
  if (
    !normalizedValue ||
    normalizedValue === '.' ||
    normalizedValue === '..' ||
    /[\\/\0]/.test(normalizedValue)
  ) {
    return ''
  }

  return normalizedValue
}

function extractChangelogOsVersion(detail = {}, source = '') {
  const versionValues = [
    detail.osVersion,
    detail.os_version,
    detail.osMajorVersion,
    detail.os_major_version
  ]

  if (source === 'ubuntu') {
    versionValues.push(detail.osDistro, detail.os_distro)
  }

  for (const value of versionValues) {
    const normalizedValue = normalizeChangelogPathSegment(value)
    if (!normalizedValue) continue

    if (source === 'ubuntu') {
      const ubuntuVersionMatch = normalizedValue.match(
        /(?:^|\D)(\d{1,2}\.\d{2})(?:\.\d+)?(?:\D|$)/
      )
      if (ubuntuVersionMatch) return ubuntuVersionMatch[1]
    } else {
      return normalizedValue
    }
  }

  return ''
}

function extractChangelogHeaderParts(header) {
  const normalizedHeader = String(header || '')
    .trim()
    .replace(/^\*\s*/, '')
  if (!normalizedHeader) return { headline: '', version: '' }

  const bracketVersionMatch = normalizedHeader.match(/^(.*?)\s+\[([^\]]+)\]\s*$/)
  if (bracketVersionMatch) {
    return {
      headline: bracketVersionMatch[1].trim(),
      version: bracketVersionMatch[2].trim()
    }
  }

  const debianVersionMatch = normalizedHeader.match(/^\S+\s+\(([^)]+)\)\s+/)
  if (debianVersionMatch) {
    return {
      headline: normalizedHeader,
      version: debianVersionMatch[1].trim()
    }
  }

  const separatorIndex = normalizedHeader.lastIndexOf(' - ')
  if (separatorIndex !== -1) {
    return {
      headline: normalizedHeader.slice(0, separatorIndex).trim(),
      version: normalizedHeader.slice(separatorIndex + 3).trim()
    }
  }

  const suffixVersionMatch = normalizedHeader.match(/^(.*?)\s+((?:\d+:)?\d[^\s]*)$/)
  if (suffixVersionMatch) {
    return {
      headline: suffixVersionMatch[1].trim(),
      version: suffixVersionMatch[2].trim()
    }
  }

  return { headline: normalizedHeader, version: '' }
}

function isPackageVersionCharacter(character) {
  return Boolean(character && /[0-9a-z._+~^:-]/i.test(character))
}

function hasPackageVersionStartBoundary(header, versionStartIndex) {
  const previousCharacter = header[versionStartIndex - 1]
  if (!isPackageVersionCharacter(previousCharacter)) return true

  // RPM headers may include a numeric epoch (for example, 1:2.7-5)
  // even when the package detail only exposes the version after the colon.
  if (previousCharacter !== ':') return false

  let epochStartIndex = versionStartIndex - 2
  if (epochStartIndex < 0 || !/[0-9]/.test(header[epochStartIndex])) return false

  while (epochStartIndex >= 0 && /[0-9]/.test(header[epochStartIndex])) {
    epochStartIndex -= 1
  }

  return !isPackageVersionCharacter(header[epochStartIndex])
}

function hasEarlierDigitInVersionRun(header, versionStartIndex) {
  for (let index = versionStartIndex - 1; index >= 0; index -= 1) {
    const character = header[index]
    if (!isPackageVersionCharacter(character)) return false
    if (/[0-9]/.test(character)) return true
  }

  return false
}

function hasKnownPackageVersionPrefix(header, versionStartIndex, packageName) {
  const normalizedPackageName = String(packageName || '').trim().toLowerCase()
  if (!normalizedPackageName) return false

  const headerPrefix = header.slice(0, versionStartIndex).toLowerCase()
  return [`${normalizedPackageName}-`, `${normalizedPackageName}_`, `${normalizedPackageName}=`].some(
    prefix => headerPrefix.endsWith(prefix)
  )
}

function getChangelogHeaderVersionMatchLevel(header, version, packageName) {
  const normalizedHeader = String(header || '')
  const targetVersion = String(version || '').trim()
  if (!normalizedHeader || !targetVersion) return 0

  let relaxedMatchFound = false
  let matchIndex = normalizedHeader.indexOf(targetVersion)
  while (matchIndex !== -1) {
    const nextCharacter = normalizedHeader[matchIndex + targetVersion.length]

    if (!isPackageVersionCharacter(nextCharacter)) {
      if (hasPackageVersionStartBoundary(normalizedHeader, matchIndex)) return 2

      if (
        !hasEarlierDigitInVersionRun(normalizedHeader, matchIndex) ||
        hasKnownPackageVersionPrefix(normalizedHeader, matchIndex, packageName)
      ) {
        relaxedMatchFound = true
      }
    }

    matchIndex = normalizedHeader.indexOf(targetVersion, matchIndex + 1)
  }

  return relaxedMatchFound ? 1 : 0
}

function isDebianChangelogHeader(line) {
  return /^\S+\s+\([^)]+\)\s+[^;]+;\s*urgency=/i.test(String(line || '').trim())
}

function splitDebianChangelogHeader(header) {
  const normalizedHeader = String(header || '').trim()
  const headerMatch = normalizedHeader.match(
    /^(\S+)\s+\(([^)]+)\)\s+([^;]+);\s*urgency=([^\s;]+)(?:\s.*)?$/i
  )
  if (!headerMatch) return null

  const packageName = headerMatch[1].trim()
  const version = headerMatch[2].trim()
  const distribution = headerMatch[3].trim()
  const urgency = headerMatch[4].trim()

  return {
    headline: packageName,
    contextText: [packageName, distribution, `urgency=${urgency}`].filter(Boolean).join(' · '),
    version
  }
}

function parseDebianChangelog(value) {
  const rawText = normalizeChangelog(value)
  const lines = rawText.split(/\r?\n/)
  const entries = []
  const introLines = []
  let currentEntry = null

  const pushCurrentEntry = () => {
    if (!currentEntry) return
    entries.push(currentEntry)
    currentEntry = null
  }

  const appendContinuation = text => {
    if (!text || !currentEntry) return

    if (currentEntry.items.length) {
      const lastIndex = currentEntry.items.length - 1
      currentEntry.items[lastIndex] = `${currentEntry.items[lastIndex]}\n${text}`
    } else {
      currentEntry.notes.push(text)
    }
  }

  lines.forEach(rawLine => {
    const line = String(rawLine || '').trimEnd()
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    const headerParts = splitDebianChangelogHeader(trimmedLine)
    if (headerParts) {
      pushCurrentEntry()
      currentEntry = {
        header: trimmedLine,
        ...headerParts,
        dateText: '',
        maintainer: '',
        email: '',
        items: [],
        notes: []
      }
      return
    }

    if (!currentEntry) {
      introLines.push(trimmedLine)
      return
    }

    const signatureMatch = trimmedLine.match(/^--\s+(.+?)\s+<([^>]+)>\s{2,}(.+)$/)
    if (signatureMatch) {
      currentEntry.maintainer = signatureMatch[1].trim()
      currentEntry.email = signatureMatch[2].trim()
      currentEntry.dateText = signatureMatch[3].trim()
      return
    }

    const itemMatch = trimmedLine.match(/^\*\s+(.+)$/)
    if (itemMatch) {
      currentEntry.items.push(itemMatch[1].trim())
      return
    }

    appendContinuation(trimmedLine)
  })

  pushCurrentEntry()

  if (introLines.length) {
    entries.unshift({
      header: '',
      headline: '',
      contextText: '',
      version: '',
      dateText: '',
      maintainer: '',
      email: '',
      items: [],
      notes: introLines
    })
  }

  return {
    rawText,
    entries,
    isStructured: entries.some(entry => entry.header)
  }
}

export function buildRpmChangelogFileUrl(source) {
  const rawSource = String(source || '').trim()
  const normalizedSource = normalizePackageDetailSource({ source: rawSource }) || rawSource.toLowerCase()
  if (!normalizedSource || !/^[a-z0-9_-]+$/.test(normalizedSource)) return ''

  return `${CHANGELOG_BASE_PATH}/${encodeURIComponent(normalizedSource)}.txt`
}

export function buildRpmChangelogFileUrls(detail = {}) {
  const normalizedDetail = normalizeRpmPackageDetail(detail)
  const normalizedSource = normalizePackageDetailSource({
    source: normalizedDetail.source,
    osDistro: normalizedDetail.osDistro
  })
  const rawSource = String(normalizedDetail.source || '')
    .trim()
    .toLowerCase()
  const sourceFolder = normalizedSource || (/^[a-z0-9_-]+$/.test(rawSource) ? rawSource : '')
  const packageName = String(normalizedDetail.name || '').trim()
  const initial = packageName.charAt(0).toLowerCase()
  if (!sourceFolder || !packageName || !/^[a-z0-9]$/.test(initial)) return []

  let basePath = ''
  if (normalizedSource === 'redhat') {
    const rhelMajor = extractRhelMajor(normalizedDetail)
    if (!rhelMajor) return []

    basePath = `${CHANGELOG_BASE_PATH}/rhel/rhel${encodeURIComponent(rhelMajor)}/${initial}`
  } else {
    const osVersion = extractChangelogOsVersion(normalizedDetail, sourceFolder)
    if (!osVersion) return []

    basePath = `${CHANGELOG_BASE_PATH}/${encodeURIComponent(sourceFolder)}/${encodeURIComponent(osVersion)}/${initial}`
  }
  const fileStems = []
  addUniqueText(fileStems, packageName)

  const versionCandidates = getRpmChangelogVersionCandidates(normalizedDetail)
  const filenameVersions = [...versionCandidates].sort((left, right) => left.length - right.length)
  filenameVersions.forEach(version => addUniqueText(fileStems, `${packageName}-${version}`))

  return fileStems.map(stem => `${basePath}/${encodeURIComponent(stem)}.txt`)
}

export function getRpmChangelogVersionCandidates(detail = {}) {
  const normalizedDetail = normalizeRpmPackageDetail(detail)
  const versions = []
  const version = String(normalizedDetail.version || '').trim()
  const release = String(normalizedDetail.release || '').trim()

  if (version && release && version !== release) {
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

  const distributionVersions = [...versions]
  distributionVersions.forEach(candidate => {
    addUniqueText(versions, stripRpmDistributionSuffix(candidate))
  })

  return versions.sort((left, right) => right.length - left.length)
}

export function extractRpmPackageChangelog(changelog, detail = {}) {
  const rawText = normalizeChangelog(changelog).replace(/\r\n?/g, '\n')
  const normalizedDetail = normalizeRpmPackageDetail(detail)
  const versions = getRpmChangelogVersionCandidates(normalizedDetail)
  if (!rawText || !versions.length) return ''

  const lines = rawText.split('\n')
  let relaxedMatch = ''
  let relaxedMatchCount = 0
  for (let start = 0; start < lines.length; start += 1) {
    const header = lines[start]
    const normalizedHeader = String(header || '').trim()
    const isRpmHeader = /^\*\s+/.test(normalizedHeader)
    const isDebianHeader = isDebianChangelogHeader(normalizedHeader)
    if (!isRpmHeader && !isDebianHeader) continue

    const matchLevel = versions.reduce(
      (level, version) =>
        Math.max(
          level,
          getChangelogHeaderVersionMatchLevel(header, version, normalizedDetail.name)
        ),
      0
    )
    if (!matchLevel) continue

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

    const matchedBlock = lines.slice(start, end).join('\n').trim()
    if (matchLevel === 2) return matchedBlock

    relaxedMatch = matchedBlock
    relaxedMatchCount += 1
  }

  return relaxedMatchCount === 1 ? relaxedMatch : ''
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
  const { headline, version } = extractChangelogHeaderParts(header)
  if (!headline) {
    return {
      headline: '',
      version: '',
      dateText: '',
      maintainer: '',
      email: ''
    }
  }
  const headerMatch = headline.match(
    /^((?:[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4})|(?:\d{4}-\d{2}-\d{2}))\s+(.+?)(?:\s+<([^>]+)>)?$/
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

  const containsDebianChangelog = rawText
    .split(/\r?\n/)
    .some(line => isDebianChangelogHeader(line))
  if (containsDebianChangelog) {
    return parseDebianChangelog(rawText)
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
    name:
      baseDetail.name ||
      baseDetail.pkgName ||
      rawDetail.pkgName ||
      rawDetail.packageName ||
      rawDetail.name ||
      '',
    source: baseDetail.source || rawDetail.source || '',
    osDistro:
      baseDetail.osDistro ||
      baseDetail.os_distro ||
      rawDetail.osDistro ||
      rawDetail.os_distro ||
      '',
    osVersion:
      baseDetail.osVersion ||
      baseDetail.os_version ||
      rawDetail.osVersion ||
      rawDetail.os_version ||
      '',
    osSpVersion:
      baseDetail.osSpVersion ||
      baseDetail.os_sp_version ||
      rawDetail.osSpVersion ||
      rawDetail.os_sp_version ||
      '',
    architecture:
      baseDetail.architecture ||
      baseDetail.arch ||
      baseDetail.pkgArch ||
      rawDetail.pkgArch ||
      rawDetail.architecture ||
      rawDetail.arch ||
      '',
    version:
      baseDetail.version || baseDetail.pkgVersion || rawDetail.version || rawDetail.pkgVersion || '',
    release:
      baseDetail.release || baseDetail.pkgRelease || rawDetail.release || rawDetail.pkgRelease || '',
    currentPackage:
      baseDetail.currentPackage ||
      rawDetail.currentPackage ||
      rawDetail.pkgId ||
      rawDetail.installedPkg ||
      baseDetail.pkgId ||
      baseDetail.installedPkg ||
      baseDetail.completePackageName ||
      rawDetail.completePackageName ||
      baseDetail.rpmCompletePackageName ||
      rawDetail.rpmCompletePackageName ||
      baseDetail.pkgFullNevra ||
      rawDetail.pkgFullNevra ||
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
