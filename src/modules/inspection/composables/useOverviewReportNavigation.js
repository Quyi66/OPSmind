import { nextTick, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildOverviewReportQuery, parseOverviewReportContext } from '../utils/report-navigation'

// Keep the snapshot in the overview history entry as well as the report URL:
// browser Back and an explicit return after reloading the report use the same context.
export function useOverviewReportNavigation(searchKeyword, loading, isTemplateCurrent) {
  const route = useRoute()
  const router = useRouter()
  const reportTable = ref(null)
  const openingReport = ref(false)
  let active = true
  let disposed = false
  let pendingScroll = null
  let appliedQuery = ''
  let restoreVersion = 0
  const atOverview = () => active && !disposed && route.path === '/cac/overview'

  async function restoreScroll() {
    if (!atOverview() || loading.value || !pendingScroll || !reportTable.value) return
    const version = ++restoreVersion
    const position = pendingScroll
    await nextTick()
    if (!atOverview() || loading.value || version !== restoreVersion) return
    reportTable.value?.setScrollTop?.(position.top)
    reportTable.value?.setScrollLeft?.(position.left)
    pendingScroll = null
  }

  function applyContext() {
    if (!atOverview()) return
    const context = parseOverviewReportContext(route.query)
    const signature = JSON.stringify(context)
    if (signature !== appliedQuery) {
      appliedQuery = signature
      searchKeyword.value = context.search
      pendingScroll = context
    }
    restoreScroll()
  }

  watch(
    () => [
      route.path,
      route.query.overviewSearch,
      route.query.overviewTop,
      route.query.overviewLeft
    ],
    applyContext,
    { immediate: true, flush: 'post' }
  )
  watch([loading, reportTable], restoreScroll, { flush: 'post' })
  onActivated(() => {
    active = true
    applyContext()
  })
  onDeactivated(() => {
    const wrap = reportTable.value?.scrollBarRef?.wrapRef
    if (wrap) pendingScroll = { top: wrap.scrollTop, left: wrap.scrollLeft }
    active = false
    restoreVersion++
  })
  onBeforeUnmount(() => {
    disposed = true
    restoreVersion++
  })

  async function openReport(template) {
    if (!atOverview() || openingReport.value || !isTemplateCurrent(template)) return
    const path = route.path
    const jobId = template.jobId
    const wrap = reportTable.value?.scrollBarRef?.wrapRef
    const contextQuery = buildOverviewReportQuery({
      search: searchKeyword.value,
      top: wrap?.scrollTop || 0,
      left: wrap?.scrollLeft || 0
    })
    const query = { ...route.query }
    delete query.overviewSearch
    delete query.overviewTop
    delete query.overviewLeft
    Object.assign(query, contextQuery)
    openingReport.value = true
    try {
      const failure = await router.replace({ path, query, hash: route.hash, force: true })
      if (
        failure ||
        !atOverview() ||
        route.path !== path ||
        template.jobId !== jobId ||
        !isTemplateCurrent(template)
      )
        return
      await router.push({
        path: `/cac/results/${encodeURIComponent(jobId)}`,
        query: { from: 'overview', ...contextQuery }
      })
    } finally {
      openingReport.value = false
    }
  }

  return { reportTable, openingReport, openReport }
}
