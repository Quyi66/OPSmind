import { t } from '@/core/i18n'

const JOB_TYPES = {
  rest: { get label() { return t('automation.types.rest') }, tag: 'primary' },
  script: { get label() { return t('automation.types.script') }, tag: 'success' },
  command: { get label() { return t('automation.types.command') }, tag: 'warning' },
  process: { get label() { return t('automation.types.process') }, tag: 'info' },
  cmd: { get label() { return t('automation.types.cmd') }, tag: 'warning' },
  audit: { get label() { return t('automation.types.audit') }, tag: 'primary' },
  flows: { get label() { return t('automation.types.flows') }, tag: 'info' }
}

export function getWorkbenchJobType(record) {
  const type = String(record?.job_type || record?.jobType || record?.type || '')
    .trim()
    .toLowerCase()
  return JOB_TYPES[type] || { label: type || t('automation.types.unknown'), tag: 'info' }
}

export function getWorkbenchCardLayout(width, height, compact = false) {
  const gap = compact ? 12 : 20
  const minHeight = 112
  const targetHeight = compact ? minHeight : 124
  const minWidth = compact ? 240 : 260
  const columns = Math.max(1, Math.floor((width + gap) / (minWidth + gap)))
  const maxRows = Math.max(1, Math.floor((height + gap) / (minHeight + gap)))
  const rows = Math.min(maxRows, Math.max(1, Math.round((height + gap) / (targetHeight + gap))))
  return {
    columns,
    rows,
    limit: width > 0 && height > 0 ? columns * rows : 0,
    gap,
    minHeight
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

export function formatWorkbenchJobDate(job) {
  const { timestamp, source } = getWorkbenchJobDate(job)
  const sourceLabel = source === '更新' ? t('automation.date.updated') : t('automation.date.created')
  if (timestamp === null) return { get label() { return t('automation.date.notProvided') }, title: t('automation.date.invalid') }
  const date = new Date(timestamp)
  const pad = value => String(value).padStart(2, '0')
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const fullDate = `${date.getFullYear()}-${monthDay}`
  return {
    label: t('automation.date.label', { source: sourceLabel, date: fullDate, time }),
    title: t('automation.date.title', { source: sourceLabel, date: fullDate, time: `${time}:${pad(date.getSeconds())}` })
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
    ['totalHosts', t('automation.stats.total'), 'info'],
    ['okHosts', t('automation.stats.ok'), 'success'],
    ['failedHosts', t('automation.stats.failed'), 'danger'],
    ['unreachableHosts', t('automation.stats.unreachable'), 'warning']
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
    return ['RUNNING', 'CALLBACK'].includes(String(record?.status).toUpperCase()) ? t('automation.duration.inProgress') : '—'
  }
  const seconds = Math.floor((end - start) / 1000)
  if (seconds >= 3600)
    return t('automation.duration.hoursMinutes', { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60) })
  if (seconds >= 60) return t('automation.duration.minutesSeconds', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
  return t('automation.duration.seconds', { seconds })
}
