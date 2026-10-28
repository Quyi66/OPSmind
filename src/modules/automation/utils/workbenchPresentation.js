const JOB_TYPES = {
  rest: { label: 'REST 运维工具', tag: 'primary' },
  script: { label: '脚本运维工具', tag: 'success' },
  command: { label: '命令运维工具', tag: 'warning' },
  process: { label: '流程运维工具', tag: 'info' },
  cmd: { label: '命令任务', tag: 'warning' },
  audit: { label: '巡检任务', tag: 'primary' },
  flows: { label: '流程任务', tag: 'info' }
}

export function getWorkbenchJobType(record) {
  const type = String(record?.job_type || record?.jobType || record?.type || '')
    .trim()
    .toLowerCase()
  return JOB_TYPES[type] || { label: type || '类型未知', tag: 'info' }
}

export function getWorkbenchCardLayout(width, height) {
  const gap = 20
  const minHeight = 112
  const targetHeight = 124
  const maxHeight = 148
  const columns = Math.max(1, Math.floor((width + gap) / (260 + gap)))
  const maxRows = Math.max(1, Math.floor((height + gap) / (minHeight + gap)))
  const rows = Math.min(maxRows, Math.max(1, Math.round((height + gap) / (targetHeight + gap))))
  return {
    columns,
    rows,
    limit: width > 0 && height > 0 ? columns * rows : 0,
    gap,
    minHeight,
    maxHeight
  }
}

export function getWorkbenchJobDate(job) {
  for (const [field, source] of [
    ['updatedAt', '更新'],
    ['createdAt', '创建']
  ]) {
    const value = job?.[field]
    if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') continue
    if (typeof value === 'string' && !value.trim()) continue
    const parsed =
      typeof value === 'string' && /^\d{13}$/.test(value.trim()) ? Number(value) : value
    const timestamp = new Date(parsed).getTime()
    if (Number.isFinite(timestamp)) return { timestamp, source }
  }
  return { timestamp: null, source: '' }
}

export function selectWorkbenchJobs(rows, type = '') {
  if (!Array.isArray(rows)) return []
  const selectedType = type.trim().toLowerCase()
  return rows
    .filter(
      job =>
        !selectedType ||
        String(job?.type || '')
          .trim()
          .toLowerCase() === selectedType
    )
    .map(job => ({ job, timestamp: getWorkbenchJobDate(job).timestamp ?? -Infinity }))
    .sort((left, right) =>
      left.timestamp === right.timestamp ? 0 : left.timestamp > right.timestamp ? -1 : 1
    )
    .map(item => item.job)
}

export function formatWorkbenchJobDate(job, now = new Date()) {
  const { timestamp, source } = getWorkbenchJobDate(job)
  if (timestamp === null) return { label: '时间未提供', title: '更新时间和创建时间均未提供或无效' }
  const date = new Date(timestamp)
  const pad = value => String(value).padStart(2, '0')
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const fullDate = `${date.getFullYear()}-${monthDay}`
  return {
    label: `${source} ${date.getFullYear() === now.getFullYear() ? monthDay : fullDate} ${time}`,
    title: `${source}时间：${fullDate} ${time}:${pad(date.getSeconds())}`
  }
}

export function getRunNodes(record) {
  return String(record?.executor_url || record?.ata_url || '')
    .split(',')
    .map(node => node.trim())
    .filter(Boolean)
}

export function getRunHostStats(value) {
  let stats
  try {
    stats = typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return []
  }
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return []
  return [
    ['totalHosts', '总数', 'info'],
    ['okHosts', '成功', 'success'],
    ['failedHosts', '失败', 'danger'],
    ['unreachableHosts', '不可达', 'warning']
  ].flatMap(([key, label, tone]) => {
    const raw = stats[key]
    if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '') return []
    const count = Number(raw)
    return Number.isSafeInteger(count) && count >= 0 ? [{ key, label, tone, count }] : []
  })
}

export function formatRunDuration(record) {
  const start = record?.start_time ? new Date(record.start_time).getTime() : NaN
  const end = record?.end_time ? new Date(record.end_time).getTime() : NaN
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return ['RUNNING', 'CALLBACK'].includes(String(record?.status).toUpperCase()) ? '进行中' : '—'
  }
  const seconds = Math.floor((end - start) / 1000)
  if (seconds >= 3600)
    return `${Math.floor(seconds / 3600)}时 ${Math.floor((seconds % 3600) / 60)}分`
  if (seconds >= 60) return `${Math.floor(seconds / 60)}分 ${seconds % 60}秒`
  return `${seconds}秒`
}
