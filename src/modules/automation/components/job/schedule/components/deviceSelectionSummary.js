import { t } from '@/core/i18n'

// 分组、标签在执行时才展开，不能把选择项数量当作实际设备数量。
export function summarizeDeviceSelection(selection = []) {
  const counts = { devices: 0, groups: 0, tags: 0, other: 0 }
  for (const item of selection) {
    if (!item) continue
    if (item.runType === 'group' || item.runType === 'all') counts.groups++
    else if (item.runType === 'tag' || String(item.key || '').startsWith('#')) counts.tags++
    else if (!item.runType || item.runType === 'host') counts.devices++
    else counts.other++
  }
  return counts
}

export function formatDeviceSelection(selection = []) {
  const counts = summarizeDeviceSelection(selection)
  const parts = []
  if (counts.devices) parts.push(t('selection.deviceCount', { count: counts.devices }))
  if (counts.groups) parts.push(t('selection.groupCount', { count: counts.groups }))
  if (counts.tags) parts.push(t('selection.tagCount', { count: counts.tags }))
  if (counts.other) parts.push(t('selection.otherCount', { count: counts.other }))
  return parts.length
    ? t('selection.summary', { items: parts.join(t('selection.listSeparator')) })
    : t('selection.noTargets')
}
