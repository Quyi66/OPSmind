const DEFAULT_RESULT_LIST_STATE = {
  templateId: '',
  templateSearchText: '',
  keyword: '',
  page: 1,
  size: 10
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
    size: normalizePositiveInteger(query.size, DEFAULT_RESULT_LIST_STATE.size)
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

  return query
}

export function pickResultListRouteQuery(query = {}) {
  return buildResultListRouteQuery(parseResultListRouteState(query))
}
