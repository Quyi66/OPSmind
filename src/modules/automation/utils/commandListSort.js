import { toKnownNumber } from '@/utils/workspacePresentation'

const fields = new Set([
  'name',
  'type',
  'createdAt',
  'updatedAt',
  'lastRunTime',
  'runNumber',
  'createdBy',
  'checkBy',
  'status',
  'unapprovedCommand'
])

function sortValue(row, field) {
  const value = row[field]
  if (value == null || value === '') return null
  if (field === 'status' || field === 'runNumber') return toKnownNumber(value)
  if (field === 'createdAt' || field === 'updatedAt' || field === 'lastRunTime') {
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : null
  }
  return String(value).trim() || null
}

export function sortCommandRows(rows, { prop, order }) {
  const result = [...rows]
  if (!fields.has(prop) || !['ascending', 'descending'].includes(order)) return result
  return result.sort((a, b) => {
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
