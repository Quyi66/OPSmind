import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import Overview from '@/modules/user/views/UserOverviewPage.vue'
const api = vi.hoisted(() => ({ stats: vi.fn(), chart: vi.fn(), init: vi.fn(), navigate: vi.fn() }))
const isDark = ref(false)
vi.mock('@/modules/user/api', () => ({ getOverviewStats: api.stats, getAuditLogStats: api.chart }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark }) }))
vi.mock('echarts', () => ({ init: api.init, graphic: { LinearGradient: class {} } }))
const wrappers = []
const instances = []
const state = wrapper => wrapper.vm.$.setupState
const body = records => ({ data: { records } })
const counts = (total = 5) => ({ total, completedCount: 3, failedCount: 1, runningCount: 1 })
const values = (n = 1) => ({
  hostTotal: n,
  userTotal: 0,
  errorUserTotal: 0,
  groupTotal: 4,
  oneMonthTotal: 5,
  failedTotal: 6
})
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function open(keepAlive = false) {
  const shown = ref(true)
  const Root = defineComponent({
    setup: () => () => h(KeepAlive, null, { default: () => (shown.value ? h(Overview) : null) })
  })
  const wrapper = mount(keepAlive ? Root : Overview, {
    global: {
      provide: { handleNavigate: api.navigate },
      stubs: {
        'el-button': {
          props: ['loading'],
          template: '<button :disabled="loading"><slot /></button>'
        },
        ElAlert: { props: ['title'], template: '<p role="alert">{{ title }}</p>' }
      },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper: keepAlive ? wrapper.findComponent(Overview) : wrapper, shown }
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  isDark.value = false
  instances.splice(0)
  api.stats.mockResolvedValue(body([values()]))
  api.chart.mockResolvedValue(body([{ auditDate: '2026-10-23', ...counts() }]))
  api.init.mockImplementation(() => {
    const instance = { setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }
    instances.push(instance)
    return instance
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 23, 10, 0, 0))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('主机用户总览读取与日期', () => {
  it('加载与缺失不用0冒充，显式0及有效数值字符串保留', async () => {
    const pending = deferred()
    api.stats.mockReturnValueOnce(pending.promise)
    const { wrapper } = await open()
    expect(wrapper.findAll('.stat-card__value').map(item => item.text())).toEqual(
      Array(6).fill('—')
    )
    expect(wrapper.text()).toContain('正在读取用户统计')
    pending.resolve(body([{ hostTotal: '2', userTotal: 0, groupTotal: -1 }]))
    await flushPromises()
    expect(wrapper.findAll('.stat-card__value').map(item => item.text())).toEqual([
      '2',
      '0',
      '—',
      '—',
      '—',
      '—'
    ])
    expect(wrapper.text()).toContain('部分统计未返回有效计数')
  })
  it('统计与图表独立失败/重试，图表失败不画15天零曲线', async () => {
    api.stats.mockRejectedValueOnce(new Error('stats offline'))
    api.chart.mockRejectedValueOnce(new Error('chart offline'))
    const { wrapper } = await open()
    expect(wrapper.text()).toContain('用户统计读取失败')
    expect(wrapper.text()).toContain('操作统计读取失败')
    expect(api.init).not.toHaveBeenCalled()
    await button(wrapper, '重试用户统计').trigger('click')
    await flushPromises()
    expect(api.stats).toHaveBeenCalledTimes(2)
    expect(api.chart).toHaveBeenCalledTimes(1)
    await button(wrapper, '重试操作统计').trigger('click')
    await flushPromises()
    expect(api.chart).toHaveBeenCalledTimes(2)
    expect(api.init).toHaveBeenCalledTimes(1)
    expect(api.chart).toHaveBeenLastCalledWith(15)
  })
  it('同统计刷新失败标记旧值，手动刷新两区且不添加自动轮询', async () => {
    const { wrapper } = await open()
    api.stats.mockRejectedValueOnce(new Error('offline'))
    await state(wrapper).loadStats()
    await flushPromises()
    expect(wrapper.text()).toContain('上次成功结果')
    expect(wrapper.find('.stat-card__value').text()).toBe('1')
    await button(wrapper, '刷新').trigger('click')
    await flushPromises()
    expect(api.stats).toHaveBeenCalledTimes(3)
    expect(api.chart).toHaveBeenCalledTimes(2)
  })
  it.each([401, 403])('认证%s清除统计/图表且无普通重试与导航', async status => {
    const { wrapper } = await open()
    api.stats.mockRejectedValueOnce({ response: { status } })
    api.chart.mockRejectedValueOnce({ response: { status } })
    await state(wrapper).refreshOverview()
    await flushPromises()
    expect(wrapper.findAll('.stat-card__value').map(item => item.text())).toEqual(
      Array(6).fill('—')
    )
    expect(state(wrapper).chartReady).toBe(false)
    expect(button(wrapper, '重试用户统计')).toBeUndefined()
    expect(button(wrapper, '重试操作统计')).toBeUndefined()
    await wrapper.find('.stat-card').trigger('click')
    expect(api.navigate).not.toHaveBeenCalled()
  })
  it('空集合单独提示无数据，既不显示有效0也不初始化图表', async () => {
    api.stats.mockResolvedValueOnce(body([]))
    api.chart.mockResolvedValueOnce(body([]))
    const { wrapper } = await open()
    expect(wrapper.text()).toContain('暂无用户统计')
    expect(wrapper.text()).toContain('暂无可显示的操作统计')
    expect(api.init).not.toHaveBeenCalled()
  })
  it('使用本地日期到当天，缺失日期/计数留缺口，显式零可见', async () => {
    api.chart.mockResolvedValueOnce(
      body([
        { auditDate: '2026-10-23', ...counts(0), completedCount: 0, failedCount: null },
        { auditDate: '2026-10-09', ...counts(8) }
      ])
    )
    const { wrapper } = await open()
    const option = instances[0].setOption.mock.lastCall[0]
    expect(option.xAxis.data).toHaveLength(15)
    expect(option.xAxis.data[0]).toBe('10-9')
    expect(option.xAxis.data.at(-1)).toBe('10-23')
    expect(option.series[0].data.at(-1)).toBe(0)
    expect(option.series[2].data.at(-1)).toBe(null)
    expect(option.series[0].data[1]).toBe(null)
    expect(option.series[0].data[0]).toBe(8)
    expect(wrapper.text()).toContain('部分日期计数缺失')
  })
  it('重复日期报错不静默覆盖，范围外记录不变成当前15天的0', async () => {
    api.chart.mockResolvedValueOnce(
      body([
        { auditDate: '2026-10-23', ...counts() },
        { auditDate: '2026-10-23', ...counts() }
      ])
    )
    const { wrapper } = await open()
    expect(wrapper.text()).toContain('操作统计读取失败')
    expect(api.init).not.toHaveBeenCalled()
    api.chart.mockResolvedValueOnce(body([{ auditDate: '2025-01-01', ...counts() }]))
    await state(wrapper).loadChartData()
    await flushPromises()
    expect(api.init).not.toHaveBeenCalled()
    expect(state(wrapper).chartReady).toBe(false)
  })
  it('最新统计/图表请求生效，旧成功/失败/finally不覆盖新结果', async () => {
    const { wrapper } = await open()
    const oldStats = deferred(),
      newStats = deferred(),
      oldChart = deferred(),
      newChart = deferred()
    api.stats.mockReturnValueOnce(oldStats.promise).mockReturnValueOnce(newStats.promise)
    api.chart.mockReturnValueOnce(oldChart.promise).mockReturnValueOnce(newChart.promise)
    state(wrapper).refreshOverview()
    state(wrapper).refreshOverview()
    oldStats.reject(new Error('old'))
    oldChart.resolve(body([]))
    await flushPromises()
    expect(state(wrapper).statsLoading).toBe(true)
    expect(state(wrapper).chartLoading).toBe(true)
    newStats.resolve(body([values(9)]))
    newChart.resolve(body([{ auditDate: '2026-10-23', ...counts(9) }]))
    await flushPromises()
    expect(wrapper.find('.stat-card__value').text()).toBe('9')
    expect(instances.at(-1).setOption.mock.lastCall[0].series[0].data.at(-1)).toBe(9)
    expect(state(wrapper).statsError).toBe('')
  })
  it('可用卡片键盘导航沿原参数；异常用户不再假装筛出异常名单', async () => {
    const { wrapper } = await open()
    const cards = wrapper.findAll('.stat-card')
    await cards[4].trigger('keydown.enter')
    expect(api.navigate).toHaveBeenLastCalledWith({ view: 'logs', params: { day: '30' } })
    await cards[5].trigger('keydown.space')
    expect(api.navigate).toHaveBeenLastCalledWith({
      view: 'logs',
      params: { day: '365', status: 'ERROR,FAILED' }
    })
    api.navigate.mockClear()
    await cards[2].trigger('click')
    expect(api.navigate).not.toHaveBeenCalled()
    expect(cards[2].attributes('role')).toBeUndefined()
    expect(cards[2].attributes('title')).toContain('未提供异常用户明细筛选')
  })
  it('失活/卸载丢弃迟到读取并销毁图表，返回仅重绘已确认数据不自动GET', async () => {
    const { wrapper, shown } = await open(true)
    const pending = deferred()
    api.chart.mockReturnValueOnce(pending.promise)
    state(wrapper).loadChartData()
    shown.value = false
    await flushPromises()
    expect(instances[0].dispose).toHaveBeenCalledTimes(1)
    pending.resolve(body([{ auditDate: '2026-10-23', ...counts(99) }]))
    await flushPromises()
    shown.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(state(wrapper).chartReady).toBe(false)
    expect(api.chart).toHaveBeenCalledTimes(2)
    const late = deferred()
    api.stats.mockReturnValueOnce(late.promise)
    state(wrapper).loadStats()
    wrappers[0].unmount()
    late.resolve(body([values(88)]))
    await flushPromises()
    expect(state(wrapper).statCards[0].value).toBe(1)
  })
  it('主题变化重绘与ResizeObserver不新增GET，卸载后不再初始化图表', async () => {
    const { wrapper } = await open()
    isDark.value = true
    await flushPromises()
    expect(api.init.mock.lastCall[1]).toBe('dark')
    expect(api.chart).toHaveBeenCalledTimes(1)
    expect(instances[0].dispose).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    const count = api.init.mock.calls.length
    isDark.value = false
    await flushPromises()
    expect(api.init).toHaveBeenCalledTimes(count)
  })
})
