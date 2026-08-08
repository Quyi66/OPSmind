export const ACTIVE_RUN_STATUSES = Object.freeze([
  'WAITING',
  'RUNNING',
  'CALLBACK',
  'PENDING',
  'ASYNC',
  'STARTED',
  'PROCESSING',
  'IN_PROGRESS',
  'CREATED'
])

export const SUCCESS_RUN_STATUSES = Object.freeze([
  'COMPLETED',
  'SUCCESS',
  'PASS',
  'PARTIAL_SUCCESS'
])

export function normalizeRunStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase()
}

export function isActiveRunStatus(status) {
  return ACTIVE_RUN_STATUSES.includes(normalizeRunStatus(status))
}

export function isSuccessfulRunStatus(status) {
  return SUCCESS_RUN_STATUSES.includes(normalizeRunStatus(status))
}
