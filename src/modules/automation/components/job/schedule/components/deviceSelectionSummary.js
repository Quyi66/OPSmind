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
  if (counts.devices) parts.push(`${counts.devices} 台设备`)
  if (counts.groups) parts.push(`${counts.groups} 个分组`)
  if (counts.tags) parts.push(`${counts.tags} 个标签`)
  if (counts.other) parts.push(`${counts.other} 项其他选择`)
  return parts.length ? `已选 ${parts.join('、')}` : '未选择目标'
}
