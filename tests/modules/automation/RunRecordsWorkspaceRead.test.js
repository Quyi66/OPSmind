import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElForm, ElInput, ElMessage, ElTabPane, ElTabs } from 'element-plus'
import RecordsPage from '@/modules/automation/views/job/JobRunLogsPage.vue'
import StatisticsPage from '@/modules/automation/views/job/JobStatisticsPage.vue'

const api = vi.hoisted(() => ({
  fetchJobRunLogs: vi.fn(),
  fetchJobStats: vi.fn(),
  fetchJobRunCounts: vi.fn(),
  rerunJob: vi.fn()
}))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/modules/automation/stores/useJobStore', () => ({ JOB_TYPE_OPTIONS: [] }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: { value: false } }) }))
vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', props: ['option'], template: '<div class="chart-double" />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<aside />' }
}))
vi.mock('@/components/shared/RunLogStatusTag.vue', () => ({
  default: { template: '<span><slot /></span>' }
}))
const logs = () => ({ data: { records: [{ id: 'original-run', status: 'RUNNING' }], total: 1 } })
const trend = count => ({ data: { records: [{ start_date: '2026-10-30', run_count: count }] } })
const summary = count => ({
  data: { records: [{ job_id: 'original-tool', job_title: 'Original tool', run_count: count }] }
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let root, router
const page = () => root.findComponent(RecordsPage)
const state = () => page().vm.$.setupState
const stats = () => page().findComponent(StatisticsPage)
const chartState = () => stats().vm.$.setupState
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/run-records/logs', name: 'run-records-logs', component: RecordsPage },
      { path: '/other', component: { template: '<div>Other page</div>' } }
    ]
  })
  await router.push({ path: '/run-records/logs', query })
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  const Slot = { template: '<div><slot /></div>' }
  root = mount(Host, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-tabs': ElTabs,
        'el-tab-pane': ElTabPane,
        'el-form': ElForm,
        'el-input': ElInput,
        'el-form-item': Slot,
        'el-select': Slot,
        'el-option': true,
        'el-icon': true,
        'el-table': true,
        'el-table-column': true,
        'el-pagination': true,
        'el-tag': Slot,
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{title}}<slot /></div>' },
        'el-empty': { props: ['description'], template: '<p>{{description}}</p>' }
      }
    }
  })
  await flushPromises()
}
async function tab(name) {
  const target = page()
    .findAll('[role="tab"]')
    .find(item => item.text() === name)
  await target.trigger('click')
  await flushPromises()
}
beforeEach(() => {
  api.fetchJobRunLogs.mockReset().mockResolvedValue(logs())
  api.fetchJobStats.mockReset().mockResolvedValue(trend(3))
  api.fetchJobRunCounts.mockReset().mockResolvedValue(summary(3))
  api.rerunJob.mockReset()
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  root?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('运行记录与统计真实页签接合', () => {
  it('统计深链接只读一次两图，缓存返回保留搜索和子实例且各刷新一次', async () => {
    await open({ tab: 'statistics' })
    const parent = state(),
      child = chartState()
    expect(api.fetchJobRunLogs).not.toHaveBeenCalled()
    expect(api.fetchJobStats).toHaveBeenCalledTimes(1)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
    await stats().get('input[placeholder="搜索运维工具"]').setValue('Original')
    await router.push({ path: '/other', query: { tab: 'job', day: '30' } })
    await flushPromises()
    expect(parent.activeTab).toBe('statistics')
    expect(api.fetchJobRunLogs).not.toHaveBeenCalled()
    api.fetchJobStats.mockResolvedValueOnce(trend(4))
    api.fetchJobRunCounts.mockResolvedValueOnce(summary(4))
    await router.push({ path: '/run-records/logs', query: { tab: 'statistics' } })
    await flushPromises()
    expect(state()).toBe(parent)
    expect(chartState()).toBe(child)
    expect(chartState().summaryQuery).toBe('Original')
    expect(api.fetchJobStats).toHaveBeenCalledTimes(2)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(2)
    expect(chartState().summaryChartOption.series[0].data).toEqual([4])
  })
  it('点击真实页签时日志停轮询，统计只加载一次；切回日志只重读一次后恢复轮询', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
    await tab('统计分析')
    expect(router.currentRoute.value.query.tab).toBe('statistics')
    expect(api.fetchJobStats).toHaveBeenCalledTimes(1)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10000)
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
    await tab('运行记录')
    expect(router.currentRoute.value.query.tab).toBeUndefined()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    expect(page().findComponent(StatisticsPage).exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(3)
    expect(api.fetchJobStats).toHaveBeenCalledTimes(1)
  })
  it('两个图表在途时离开再回日志，旧图表结果/错误不串入父页也不额外读图表', async () => {
    const pendingTrend = deferred(),
      pendingSummary = deferred()
    api.fetchJobStats.mockReturnValueOnce(pendingTrend.promise)
    api.fetchJobRunCounts.mockReturnValueOnce(pendingSummary.promise)
    await open({ tab: 'statistics' })
    const parent = state(),
      child = chartState()
    await router.push('/other')
    await flushPromises()
    await router.push('/run-records/logs')
    await flushPromises()
    pendingTrend.resolve(trend(99))
    pendingSummary.reject(new Error('old-chart-error'))
    await flushPromises()
    expect(state()).toBe(parent)
    expect(parent.activeTab).toBe('logs')
    expect(child.rawData).toEqual([])
    expect(child.summaryRows).toEqual([])
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
    expect(api.fetchJobStats).toHaveBeenCalledTimes(1)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(api.rerunJob).not.toHaveBeenCalled()
  })
})
