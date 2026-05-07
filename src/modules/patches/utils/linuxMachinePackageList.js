function pickValue(source, keys, fallback = '') {
  if (!source || typeof source !== 'object') return fallback

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key]
    }
  }

  return fallback
}

export function resolveHostId(host) {
  return String(pickValue(host, ['hostId', 'host_id', 'id', 'key'], '')).trim()
}

export function resolveHostKey(host) {
  return (
    String(pickValue(host, ['hostKey', 'host_key', 'hostname', 'value', 'ip', 'IP'], '-')).trim() ||
    '-'
  )
}

export function buildSelectorHostItems(hosts = [], assetType = 'linux') {
  return (Array.isArray(hosts) ? hosts : [])
    .map(host => {
      const hostId = resolveHostId(host)
      if (!hostId) return null

      return {
        key: hostId,
        value: resolveHostKey(host),
        assetType
      }
    })
    .filter(Boolean)
}

export function extractHostIds(selection = []) {
  return Array.from(
    new Set((Array.isArray(selection) ? selection : []).map(resolveHostId).filter(Boolean))
  )
}

function parseContentDispositionFilename(headerValue) {
  const source = String(headerValue || '')
  if (!source) return ''

  const utf8Match = source.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = source.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || ''
}

export function downloadBlobResponse(response, fallbackName = 'Linux机器包清单.xlsx') {
  const blob = new Blob([response?.data ?? response])
  const filename =
    parseContentDispositionFilename(response?.headers?.['content-disposition']) || fallbackName

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}
