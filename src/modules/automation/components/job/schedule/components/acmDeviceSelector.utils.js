function toSelectionArray(selection) {
  if (Array.isArray(selection)) {
    return selection
  }

  if (typeof selection === 'string') {
    const trimmedSelection = selection.trim()
    if (!trimmedSelection) {
      return []
    }

    try {
      const parsedSelection = JSON.parse(trimmedSelection)
      return toSelectionArray(parsedSelection)
    } catch {
      return trimmedSelection
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
  }

  return selection ? [selection] : []
}

export function normalizeAcmDeviceItem(item, fallbackAssetType = '') {
  if (!item) {
    return null
  }

  if (typeof item === 'string') {
    const trimmedItem = item.trim()
    if (!trimmedItem) {
      return null
    }

    return {
      key: trimmedItem,
      value: trimmedItem,
      assetType: fallbackAssetType
    }
  }

  if (typeof item !== 'object') {
    const normalizedValue = String(item).trim()
    if (!normalizedValue) {
      return null
    }

    return {
      key: normalizedValue,
      value: normalizedValue,
      assetType: fallbackAssetType
    }
  }

  const key =
    item.key ||
    item.id ||
    item.ci_id ||
    item.ciId ||
    item.host_id ||
    item.hostId ||
    item.host_key ||
    item.hostKey ||
    item.IP ||
    item.ip ||
    item.value ||
    item.hostname ||
    item.hostName ||
    item.name ||
    ''
  const value =
    item.value ||
    item.IP ||
    item.ip ||
    item.hostname ||
    item.hostName ||
    item.name ||
    item.host_key ||
    item.hostKey ||
    item.key ||
    item.id ||
    ''
  const assetType = item.assetType || item.ciType || item.asset_type || fallbackAssetType

  if (!key && !value) {
    return null
  }

  const normalizedItem = {
    ...item,
    key: key || value,
    value: value || key,
    assetType
  }

  if (normalizedItem.total_hosts == null && normalizedItem.totalHosts != null) {
    normalizedItem.total_hosts = normalizedItem.totalHosts
  }

  if (normalizedItem.totalHosts == null && normalizedItem.total_hosts != null) {
    normalizedItem.totalHosts = normalizedItem.total_hosts
  }

  return normalizedItem
}

export function normalizeAcmDeviceSelection(selection, fallbackAssetType = '') {
  return toSelectionArray(selection)
    .map(item => normalizeAcmDeviceItem(item, fallbackAssetType))
    .filter(Boolean)
}

export function normalizeAcmDeviceJobHosts(selection, fallbackAssetType = '') {
  return normalizeAcmDeviceSelection(selection, fallbackAssetType).map(item => {
    const normalizedHost = {
      key: item.key,
      value: item.value,
      assetType: item.assetType || fallbackAssetType
    }

    if (item.runType) {
      normalizedHost.runType = item.runType
    }

    if (item.total_hosts != null) {
      normalizedHost.total_hosts = item.total_hosts
    }

    return normalizedHost
  })
}
