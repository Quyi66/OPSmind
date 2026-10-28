const DEFAULT_RESULT_LIST_STATE = {
  templateId: '',
  templateSearchText: '',
  keyword: '',
  page: 1,
  size: 10,
  sortProp: 'createdAt',
  sortOrder: 'descending'
}

const SORT_COLUMNS = new Set(['templateName', 'createdAt', 'endedAt'])
export function parseResultListSort(state = {}) {
  const prop = state.sortProp ?? DEFAULT_RESULT_LIST_STATE.sortProp
  const order = state.sortOrder ?? DEFAULT_RESULT_LIST_STATE.sortOrder
  return SORT_COLUMNS.has(prop) && ['ascending', 'descending'].includes(order)
    ? { sortProp: prop, sortOrder: order }
    : { sortProp: 'createdAt', sortOrder: 'descending' }
}

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value ? String(value) : ''
}

function normalizePositiveInteger(value, fallback) {
  const nextValue = Number.parseInt(normalizeQueryValue(value), 10)
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : fallback
}

export function parseResultListRouteState(query = {}) {
  return {
    templateId: normalizeQueryValue(query.templateId),
    templateSearchText: normalizeQueryValue(query.templateSearch),
    keyword: normalizeQueryValue(query.keyword),
    page: normalizePositiveInteger(query.page, DEFAULT_RESULT_LIST_STATE.page),
    size: normalizePositiveInteger(query.size, DEFAULT_RESULT_LIST_STATE.size),
    ...parseResultListSort(query)
  }
}

export function buildResultListRouteQuery(state = {}) {
  const nextState = {
    ...DEFAULT_RESULT_LIST_STATE,
    ...state
  }
  const query = {}

  if (nextState.templateId) {
    query.templateId = nextState.templateId
  }
  if (nextState.templateSearchText) {
    query.templateSearch = nextState.templateSearchText
  }
  if (nextState.keyword) {
    query.keyword = nextState.keyword
  }
  if (nextState.page !== DEFAULT_RESULT_LIST_STATE.page) {
    query.page = String(nextState.page)
  }
  if (nextState.size !== DEFAULT_RESULT_LIST_STATE.size) {
    query.size = String(nextState.size)
  }
  const sort = parseResultListSort(nextState)
  if (sort.sortProp !== 'createdAt' || sort.sortOrder !== 'descending') {
    query.sortProp = sort.sortProp
    query.sortOrder = sort.sortOrder
  }

  return query
}

export function pickResultListRouteQuery(query = {}) {
  return buildResultListRouteQuery(parseResultListRouteState(query))
}
