const fields = new Set(['start_time', 'end_time'])

export function getRunLogOrderBy({ prop, order }) {
  if (!fields.has(prop) || !['ascending', 'descending'].includes(order)) return 'start_time desc'
  return `${prop} ${order === 'ascending' ? 'asc' : 'desc'}`
}
