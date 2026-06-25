function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function extractRecords(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.records)) return response.records
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.records)) return response.data.records
  return []
}

export function extractTotal(response, fallback = 0) {
  const candidates = [response?.total, response?.data?.total, fallback]
  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function normalizePagedResponse(response) {
  const records = extractRecords(response)
  return {
    records,
    total: extractTotal(response, records.length)
  }
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

export function ensurePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export { toNumber }
