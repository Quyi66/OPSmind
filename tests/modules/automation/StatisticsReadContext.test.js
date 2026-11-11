import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElInput, ElMessage } from 'element-plus'
import Page from '@/modules/automation/views/job/JobStatisticsPage.vue'

const api = vi.hoisted(() => ({ fetchJobStats: vi.fn(), fetchJobRunCounts: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: { value: false } }) }))
vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', props: ['option'], template: '<div class="chart-double" />' }
}))
const trend = count => ({
  data: { records: [{ start_date: '2026-10-30T12:00:00Z', run_count: count }] }
})
const summary = count => ({
  data: { records: [{ job_id: 'original-id', job_title: 'Original tool', run_count: count }] }
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, router
const page = () => wrapper.findComponent(Page)
const state = () => page().vm.$.setupState
const button = text =>
  page()
    .findAll('button')
    .find(item => item.text() === text)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/stats', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/stats')
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  wrapper = mount(routed ? Host : Page, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-input': ElInput,
        'el-icon': true,
        'el-empty': { props: ['description'], template: '<p>{{description}}</p>' },
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{title}}<slot /></div>' }
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.fetchJobStats.mockReset().mockResolvedValue(trend(3))
  api.fetchJobRunCounts.mockReset().mockResolvedValue(summary(3))
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('执行统计独立读取与可信计数', () => {
  it('趋势失败只重试趋势，不误示暂无数据、不影响排行/搜索', async () => {
    api.fetchJobStats.mockRejectedValueOnce(new Error('trend-read'))
    await open()
    expect(page().get('.trend-card').text()).toContain('趋势读取失败')
    expect(page().get('.summary-card').find('.chart-double').exists()).toBe(true)
    await page().get('input').setValue('no-match')
    await flushPromises()
    expect(page().get('.summary-card').text()).toContain('没有匹配的运维工具')
    await button('重试趋势').trigger('click')
    await flushPromises()
    expect(state().statsError).toBe('')
    expect(state().recentTrendOption.series[0].data).toEqual([3])
    expect(state().summaryQuery).toBe('no-match')
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
  })
  it('排行失败只重试排行，成功不重置搜索，刷新失败不显示旧成功图表', async () => {
    await open()
    await page().get('input').setValue(' original ')
    api.fetchJobRunCounts.mockRejectedValueOnce(new Error('summary-read'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(page().get('.summary-card').find('.chart-double').exists()).toBe(false)
    expect(page().get('.trend-card').find('.chart-double').exists()).toBe(true)
    const count = api.fetchJobStats.mock.calls.length
    await button('重试排行').trigger('click')
    await flushPromises()
    expect(state().summaryError).toBe('')
    expect(state().summaryQuery).toBe(' original ')
    expect(api.fetchJobStats).toHaveBeenCalledTimes(count)
  })
  it.each(['resolve', 'reject'])('旧趋势%s不能覆盖最新读取或结束其加载', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.fetchJobStats.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().fetchStats(),
      second = state().fetchStats()
    old[method](method === 'resolve' ? trend(1) : new Error('old'))
    await first
    expect(state().statsLoading).toBe(true)
    expect(state().recentTrendRows[0].count).toBe(3)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(trend(2))
    await second
    expect(state().recentTrendRows[0].count).toBe(2)
  })
  it.each(['resolve', 'reject'])('旧排行%s不能覆盖最新读取或结束其加载', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.fetchJobRunCounts.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().fetchRunCounts(),
      second = state().fetchRunCounts()
    old[method](method === 'resolve' ? summary(1) : new Error('old'))
    await first
    expect(state().summaryLoading).toBe(true)
    expect(state().summaryRows[0].run_count).toBe(3)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(summary(2))
    await second
    expect(state().summaryRows[0].run_count).toBe(2)
  })
  it('有效零次与数字字符串保留，非法/负数/无穷次数留空并排在有效次数后', async () => {
    const values = [0, '0', '4', null, '', undefined, -1, 'bad', Infinity, false, {}]
    api.fetchJobRunCounts.mockResolvedValueOnce({
      data: {
        records: values.map((value, index) => ({
          job_id: index,
          job_title: `Tool-${index}`,
          run_count: value
        }))
      }
    })
    await open()
    expect(
      state()
        .summaryRows.slice(0, 3)
        .map(row => row.run_count)
    ).toEqual([0, 0, 4])
    expect(
      state()
        .summaryRows.slice(3)
        .every(row => row.run_count === null)
    ).toBe(true)
    expect(state().summaryChartOption.series[0].data).toEqual([4, 0, 0, ...Array(8).fill(null)])
    expect(state().summaryChartOption.yAxis.data[0]).toBe('Tool-2')
    expect(state().summaryRows[0].job_id).toBe(0)
    expect(page().get('.summary-card').text()).toContain('未按零次处理')
  })
  it('趋势按日期聚合与排序，一条无效计数使当日留空；非法日期不进图表', async () => {
    api.fetchJobStats.mockResolvedValueOnce({
      data: {
        records: [
          { start_date: '2026-10-30 12:00:00', run_count: '2' },
          { start_date: '2026-10-29T12:00:00Z', run_count: 0 },
          { start_date: '2026-10-30T13:00:00Z', run_count: 3 },
          { start_date: '2026-10-28', run_count: 1 },
          { start_date: '2026-10-28', run_count: 'bad' },
          { start_date: '2026-02-30', run_count: 9 },
          { start_date: 'not-date', run_count: 9 },
          { start_date: 0, run_count: 9 }
        ]
      }
    })
    await open()
    expect(state().recentTrendRows).toEqual([
      { date: '2026-10-28', count: null },
      { date: '2026-10-29', count: 0 },
      { date: '2026-10-30', count: 5 }
    ])
    expect(state().recentTrendOption.series[0].data).toEqual([null, 0, 5])
    expect(page().get('.trend-card').text()).toContain('次数或日期无效')
  })
  it('聚合溢出不把Infinity传给图表，缺失数据不报零', async () => {
    api.fetchJobStats.mockResolvedValueOnce({
      data: {
        records: [
          { start_date: '2026-10-30', run_count: Number.MAX_VALUE },
          { start_date: '2026-10-30', run_count: Number.MAX_VALUE }
        ]
      }
    })
    await open()
    expect(state().recentTrendOption.series[0].data).toEqual([null])
    expect(state().invalidTrendCount).toBeGreaterThan(0)
  })
  it('格式错误记录进入读取错误态，空数组成功才显示暂无统计数据', async () => {
    api.fetchJobStats.mockResolvedValueOnce({ data: { records: [null] } })
    api.fetchJobRunCounts.mockResolvedValueOnce({ data: { records: { bad: true } } })
    await open()
    expect(state().statsError).not.toBe('')
    expect(state().summaryError).not.toBe('')
    api.fetchJobStats.mockResolvedValueOnce({ data: { records: [] } })
    api.fetchJobRunCounts.mockResolvedValueOnce({ data: { records: [] } })
    await state().handleRefresh()
    await flushPromises()
    expect(page().get('.trend-card').text()).toContain('暂无统计数据')
    expect(page().get('.summary-card').text()).toContain('暂无统计数据')
  })
  it('缓存失活忽略在途两个结果，返回同实例并保留搜索', async () => {
    await open(true)
    const context = state(),
      oldTrend = deferred(),
      oldSummary = deferred()
    context.summaryQuery = 'Original'
    api.fetchJobStats.mockReturnValueOnce(oldTrend.promise)
    api.fetchJobRunCounts.mockReturnValueOnce(oldSummary.promise)
    const read = context.handleRefresh()
    await router.push('/other')
    await flushPromises()
    oldTrend.resolve(trend(1))
    oldSummary.reject(new Error('old'))
    await read
    await flushPromises()
    expect(context.recentTrendRows[0].count).toBe(3)
    expect(context.summaryRows[0].run_count).toBe(3)
    expect(ElMessage.error).not.toHaveBeenCalled()
    await router.push('/stats')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().summaryQuery).toBe('Original')
    expect(api.fetchJobStats).toHaveBeenCalledTimes(3)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(3)
  })
  it.each(['resolve', 'reject'])('卸载后%s不改变统计或提示', async method => {
    const pendingTrend = deferred(),
      pendingSummary = deferred()
    api.fetchJobStats.mockReturnValueOnce(pendingTrend.promise)
    api.fetchJobRunCounts.mockReturnValueOnce(pendingSummary.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pendingTrend[method](method === 'resolve' ? trend(1) : new Error('late'))
    pendingSummary[method](method === 'resolve' ? summary(1) : new Error('late'))
    await flushPromises()
    expect(context.rawData).toEqual([])
    expect(context.summaryRows).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
