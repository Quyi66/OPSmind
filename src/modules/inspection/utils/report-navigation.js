import { pickResultListRouteQuery } from './result-list-route-state'

const queryText = value => (typeof value === 'string' ? value : '')
const scrollPosition = value => {
  if (typeof value !== 'string' && typeof value !== 'number') return 0
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0
}

export function parseOverviewReportContext(query = {}) {
  return {
    search: queryText(query.overviewSearch),
    top: scrollPosition(query.overviewTop),
    left: scrollPosition(query.overviewLeft)
  }
}

export function buildOverviewReportQuery(context) {
  const { search, top, left } = parseOverviewReportContext({
    overviewSearch: context.search,
    overviewTop: context.top,
    overviewLeft: context.left
  })
  return {
    ...(search ? { overviewSearch: search } : {}),
    ...(top ? { overviewTop: String(top) } : {}),
    ...(left ? { overviewLeft: String(left) } : {})
  }
}

export function getReportReturnTarget(query = {}, basePath = '/cac') {
  if (query.from === 'overview') {
    return {
      label: '巡检总览',
      location: {
        path: `${basePath}/overview`,
        query: buildOverviewReportQuery(parseOverviewReportContext(query))
      }
    }
  }
  return {
    label: '执行记录',
    location: { path: `${basePath}/results`, query: pickResultListRouteQuery(query) }
  }
}
