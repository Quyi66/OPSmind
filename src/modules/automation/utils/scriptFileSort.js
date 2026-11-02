import { toKnownNumber } from '@/utils/workspacePresentation'

function sortValue(file, prop) {
  if (prop === 'size') return file.directory ? null : toKnownNumber(file.size)
  const value = file[prop]
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null
  if (prop === 'lastModified') {
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : null
  }
  return String(value).trim()
}

export function sortScriptFiles(files, { prop, order }) {
  const result = [...files]
  if (
    !['name', 'size', 'lastModified'].includes(prop) ||
    !['ascending', 'descending'].includes(order)
  ) {
    return result
  }
  return result.sort((a, b) => {
    if (Boolean(a._isParentDir) !== Boolean(b._isParentDir)) return a._isParentDir ? -1 : 1
    if (Boolean(a.directory) !== Boolean(b.directory)) return a.directory ? -1 : 1
    const left = sortValue(a, prop),
      right = sortValue(b, prop)
    if (left === null) return right === null ? 0 : 1
    if (right === null) return -1
    const compared =
      typeof left === 'number'
        ? left - right
        : left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' })
    return order === 'ascending' ? compared : -compared
  })
}
