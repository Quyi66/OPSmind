const SOURCE_RECORDS_FIELD = '__sourceRecords'
const ROW_KEY_FIELD = '__rowKey'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function parseList(value) {
  const values = Array.isArray(value) ? value : normalizeString(value).split(',')
  return values.map(normalizeString).filter(Boolean)
}

function mergeListField(records, field) {
  return Array.from(new Set(records.flatMap(record => parseList(record?.[field])))).join(', ')
}

function parsePackages(value) {
  if (Array.isArray(value)) return value
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergePackages(records) {
  const packages = new Map()

  records.forEach(record => {
    parsePackages(record?.update_pkgs).forEach(pkg => {
      const key = JSON.stringify(pkg)
      if (!packages.has(key)) packages.set(key, pkg)
    })
  })

  return JSON.stringify(Array.from(packages.values()))
}

function createGroupKey(record, index) {
  const patchId = normalizeString(record?.patch_id)
  const updateTime = normalizeString(record?.update_time)

  // 没有完整批次标识时无法确认记录连续性，必须保持为独立记录。
  if (!patchId || !updateTime) return `single:${record?.id || 'record'}:${index}`
  return `group:${JSON.stringify([patchId, updateTime])}`
}

function updateMergedFields(row) {
  const records = row[SOURCE_RECORDS_FIELD]
  row.hosts = mergeListField(records, 'hosts')
  row.update_id = mergeListField(records, 'update_id')
  row.update_pkgs = mergePackages(records)
}

/**
 * 将同一次补丁更新产生的多条明细归并成一行。
 * update_time 是补丁执行批次边界，即使 patch_id 相同也不会跨时间合并。
 */
export function mergeRollbackHistoryRecords(records = []) {
  const groups = new Map()

  records.forEach((record, index) => {
    const key = createGroupKey(record, index)
    const existing = groups.get(key)

    if (existing) {
      existing[SOURCE_RECORDS_FIELD].push(record)
      updateMergedFields(existing)
      return
    }

    const row = {
      ...record,
      [ROW_KEY_FIELD]: key,
      [SOURCE_RECORDS_FIELD]: [record]
    }
    updateMergedFields(row)
    groups.set(key, row)
  })

  return Array.from(groups.values())
}

export function getRollbackSourceRecords(row) {
  const sourceRecords = row?.[SOURCE_RECORDS_FIELD]
  return Array.isArray(sourceRecords) && sourceRecords.length ? sourceRecords : row ? [row] : []
}

export function flattenRollbackSourceRecords(rows = []) {
  return rows.flatMap(getRollbackSourceRecords)
}

export function getRollbackRecordIds(rows = []) {
  return Array.from(
    new Set(
      flattenRollbackSourceRecords(rows)
        .map(record => record?.id)
        .filter(Boolean)
    )
  )
}

export function getRollbackRowKey(row) {
  return row?.[ROW_KEY_FIELD] || `single:${row?.id || ''}`
}
