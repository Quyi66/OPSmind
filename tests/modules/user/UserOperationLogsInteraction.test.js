import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import LogsPage from '@/modules/user/views/UserOperationLogsPage.vue'
const api = vi.hoisted(() => ({ logs: vi.fn() }))
vi.mock('@/modules/user/api', () => ({ getOperationLogs: api.logs }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', props: ['visible', 'runId'], template: '<aside />' }
}))
const Slot = { template: '<div><slot /></div>' }
const stubs = {
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': Slot,
  ElIcon: Slot,
  ElTag: Slot,
  'el-button': {
    props: ['loading', 'disabled'],
    template: '<button :disabled="loading || disabled"><slot /></button>'
  },
  'el-input': {
    name: 'ElInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'clear'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<div><slot /></div>'
  },
  ElOption: true,
  ElAlert: { props: ['title'], template: '<p role="alert">{{ title }}</p>' },
  ElTable: {
    props: ['data', 'emptyText'],
    template: '<section><slot /><p>{{ emptyText }}</p></section>'
  },
  ElTableColumn: { name: 'ElTableColumn', props: ['sortable'], template: '<div />' },
  ElPagination: {
    name: 'ElPagination',
    props: ['currentPage', 'pageSize', 'total', 'disabled'],
    template: '<nav />'
  }
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
const result = (
  records = [
    {
      run_id: 'run-A',
      status: 'COMPLETED',
      username: 'admin',
      action: 'create',
      start_time: '2026-10-22T01:00:00Z',
      end_time: '2026-10-22T01:00:02Z'
    }
  ],
  total = 31
) => ({ records, total })
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
const query = (day = '3650', status = 'all', keyword = '', page = 1, size = 10) => [
  { module: 'uim', action: 'all', status, day },
  keyword ? `username|executor_node|message:*${keyword}*` : '',
  page,
  size
]
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function open(queryParams = {}, real = false, keepAlive = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/users/logs', component: { template: '<div />' } },
      { path: '/users/overview', component: { template: '<div />' } }
    ]
  })
  await router.push({ path: '/users/logs', query: queryParams, hash: '#anchor' })
  const shown = ref(true)
  const Root = defineComponent({
    setup: () => () => h(KeepAlive, null, { default: () => (shown.value ? h(LogsPage) : null) })
  })
  const wrapper = mount(keepAlive ? Root : LogsPage, {
    global: {
      plugins: [router],
      stubs: { ...stubs, ...(real ? { ElTable, ElTableColumn, ElPagination } : {}) },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper: keepAlive ? wrapper.findComponent(LogsPage) : wrapper, router, shown }
}
beforeEach(() => {
  api.logs.mockReset().mockResolvedValue(result())
  vi.spyOn(console, 'error').mockImplementation(() => {})
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
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('主机用户日志查询与反馈', () => {
  it('重置地址更新途中新的搜索不会被迟到的路由重置丢弃', async () => {
    const { wrapper } = await open({ day: '30', status: 'FAILED' })
    state(wrapper).handleReset()
    state(wrapper).filters.keyword = 'new-intent'
    state(wrapper).handleSearch()
    await flushPromises()
    expect(state(wrapper).appliedFilters.keyword).toBe('new-intent')
    expect(api.logs).toHaveBeenLastCalledWith(...query('3650', 'all', 'new-intent'))
  })
  it('离开路由不覆盖缓存查询，失活中新入口条件只在返回时读一次', async () => {
    const { wrapper, router, shown } = await open({}, false, true)
    state(wrapper).filters.keyword = 'retained'
    await state(wrapper).handleSearch()
    await flushPromises()
    shown.value = false
    await flushPromises()
    api.logs.mockClear()
    await router.push('/users/overview')
    await flushPromises()
    expect(state(wrapper).appliedFilters.keyword).toBe('retained')
    expect(api.logs).not.toHaveBeenCalled()
    await router.push({ path: '/users/logs', query: { day: '30' } })
    await flushPromises()
    expect(api.logs).not.toHaveBeenCalled()
    shown.value = true
    await flushPromises()
    expect(api.logs).toHaveBeenCalledExactlyOnceWith(...query('30'))
  })
  it('校正页再次失效则报错停止，不循环补查', async () => {
    const { wrapper } = await open()
    state(wrapper).handleCurrentPageChange(4)
    await flushPromises()
    api.logs.mockClear().mockResolvedValueOnce(result([], 21)).mockResolvedValueOnce(result([], 0))
    await state(wrapper).loadData()
    await flushPromises()
    expect(api.logs.mock.calls.map(args => args[2])).toEqual([4, 3])
    expect(state(wrapper).readError).toContain('读取失败')
  })
  it('保留原模块/参数；刷新、分页、即时筛选不提交关键词草稿', async () => {
    const { wrapper } = await open()
    expect(api.logs).toHaveBeenCalledExactlyOnceWith(...query())
    await wrapper.find('input').setValue('applied')
    await button(wrapper, '搜索').trigger('click')
    await flushPromises()
    await wrapper.find('input').setValue('draft')
    await wrapper.find('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('3650', 'all', 'applied'))
    state(wrapper).handleCurrentPageChange(2)
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('3650', 'all', 'applied', 2))
    state(wrapper).filters.status = ['FAILED', 'ERROR']
    state(wrapper).filters.day = '30'
    state(wrapper).handleFilterChange()
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('30', 'FAILED,ERROR', 'applied'))
  })
  it('Enter/清空应用；重置清地址条件保留无关query/hash且只读一次', async () => {
    const { wrapper, router } = await open({ day: '30', status: 'ERROR,FAILED', keep: 'yes' })
    expect(api.logs).toHaveBeenLastCalledWith(...query('30', 'ERROR,FAILED'))
    await wrapper.find('input').setValue('alpha')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('30', 'ERROR,FAILED', 'alpha'))
    const input = wrapper.findComponent({ name: 'ElInput' })
    input.vm.$emit('update:modelValue', '')
    input.vm.$emit('clear')
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('30', 'ERROR,FAILED'))
    state(wrapper).handlePageSizeChange(20)
    await flushPromises()
    api.logs.mockClear()
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    expect(api.logs).toHaveBeenCalledExactlyOnceWith(...query())
    expect(router.currentRoute.value.query).toEqual({ keep: 'yes' })
    expect(router.currentRoute.value.hash).toBe('#anchor')
  })
  it('同一路由新总览条件生效，非法入口条件不会变成隐藏筛选', async () => {
    const { wrapper, router } = await open({ day: 'invalid', status: 'FAKE' })
    expect(api.logs).toHaveBeenLastCalledWith(...query())
    await router.push({ path: '/users/logs', query: { day: '365', status: 'ERROR,FAILED' } })
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('365', 'ERROR,FAILED'))
    expect(state(wrapper).currentPage).toBe(1)
  })
  it('允许新搜索取代读取中查询，旧成功/失败/finally不覆盖最新结果', async () => {
    const { wrapper } = await open()
    const old = deferred(),
      current = deferred()
    api.logs.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    state(wrapper).filters.keyword = 'old'
    state(wrapper).handleSearch()
    state(wrapper).filters.keyword = 'current'
    state(wrapper).handleSearch()
    old.reject(new Error('old failure'))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).readError).toBe('')
    current.resolve(result([{ run_id: 'current' }], 1))
    await flushPromises()
    expect(state(wrapper).tableData).toEqual([{ run_id: 'current' }])
    expect(state(wrapper).loading).toBe(false)
  })
  it('同查询失败保留旧数据并标过期，换关键词清行/总数，重试不提交草稿', async () => {
    const { wrapper } = await open()
    api.logs.mockRejectedValueOnce(new Error('offline'))
    await state(wrapper).loadData()
    await flushPromises()
    expect(state(wrapper).tableData).toHaveLength(1)
    expect(wrapper.text()).toContain('可能已过期')
    state(wrapper).filters.keyword = 'draft'
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query())
    api.logs.mockRejectedValueOnce(new Error('offline'))
    await state(wrapper).handleSearch()
    await flushPromises()
    expect(state(wrapper).tableData).toEqual([])
    expect(state(wrapper).totalKnown).toBe(false)
    expect(wrapper.text()).toContain('操作日志读取失败')
  })
  it.each([401, 403])('认证%s清除旧结果与运行弹窗且无普通重试', async status => {
    const { wrapper } = await open()
    state(wrapper).handleViewRunResult(state(wrapper).tableData[0])
    api.logs.mockRejectedValueOnce({ response: { status } })
    await state(wrapper).loadData()
    await flushPromises()
    expect(state(wrapper).tableData).toEqual([])
    expect(state(wrapper).showRunResultDialog).toBe(false)
    expect(button(wrapper, '重试读取')).toBeUndefined()
  })
  it('真实零与未知总数分开，矛盾总数报错不伪装空结果', async () => {
    const { wrapper } = await open()
    api.logs.mockResolvedValueOnce(result([], 0))
    await state(wrapper).loadData()
    await flushPromises()
    expect(state(wrapper).total).toBe(0)
    expect(state(wrapper).totalKnown).toBe(true)
    expect(wrapper.text()).toContain('暂无符合条件')
    api.logs.mockResolvedValueOnce({ records: [{ run_id: 'unknown' }] })
    await state(wrapper).loadData()
    await flushPromises()
    expect(wrapper.text()).toContain('未返回可确认的总数')
    expect(wrapper.find('nav').exists()).toBe(false)
    api.logs.mockResolvedValueOnce(result([{ run_id: 'bad' }], 0))
    await state(wrapper).loadData()
    await flushPromises()
    expect(wrapper.text()).toContain('刷新失败')
  })
  it('失效页最多补查一次原查询有效页，合法0不沿旧total', async () => {
    const { wrapper } = await open()
    state(wrapper).handleCurrentPageChange(4)
    await flushPromises()
    api.logs.mockClear().mockResolvedValueOnce(result([], 0)).mockResolvedValueOnce(result([], 0))
    await state(wrapper).loadData()
    await flushPromises()
    expect(api.logs.mock.calls.map(args => args[2])).toEqual([4, 1])
    expect(state(wrapper).total).toBe(0)
    expect(state(wrapper).currentPage).toBe(1)
  })
  it('真实Element表格/分页取消局部排序，切页容量只请求一次首页', async () => {
    const { wrapper } = await open({}, true)
    expect(wrapper.findAll('th.is-sortable')).toHaveLength(0)
    expect(wrapper.find('.ops-filter-bar').exists()).toBe(true)
    expect(wrapper.find('.ops-action-bar').exists()).toBe(true)
    await wrapper
      .findAll('.el-pager li')
      .find(item => item.text() === '2')
      .trigger('click')
    await flushPromises()
    expect(api.logs).toHaveBeenLastCalledWith(...query('3650', 'all', '', 2))
    api.logs.mockClear()
    wrapper.findComponent(ElPagination).vm.$emit('update:page-size', 20)
    await flushPromises()
    expect(api.logs).toHaveBeenCalledExactlyOnceWith(...query('3650', 'all', '', 1, 20))
  })
  it('运行结果只沿当前行原run_id，缺记录/旧引用不可误开', async () => {
    const { wrapper } = await open()
    const original = state(wrapper).tableData[0]
    state(wrapper).handleViewRunResult({ run_id: 'foreign' })
    expect(state(wrapper).showRunResultDialog).toBe(false)
    state(wrapper).handleViewRunResult(original)
    expect(state(wrapper).currentRunId).toBe('run-A')
    expect(state(wrapper).formatDateTime('bad')).toBe('-')
    expect(state(wrapper).calcDuration('bad', 'bad')).toBe('-')
    expect(state(wrapper).calcDuration('2026-10-22T01:00:00Z', '2026-10-22T01:00:02Z')).toBe(
      '0:00:02'
    )
  })
  it('原5秒活动列表轮询沿应用条件，读取失败后停止自动重试', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.logs.mockResolvedValue(result([{ run_id: 'active', status: 'RUNNING' }], 1))
    const { wrapper } = await open()
    state(wrapper).filters.keyword = 'draft'
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.logs).toHaveBeenCalledTimes(2)
    expect(api.logs).toHaveBeenLastCalledWith(...query())
    api.logs.mockRejectedValueOnce(new Error('offline'))
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    const count = api.logs.mock.calls.length
    await vi.advanceTimersByTimeAsync(20000)
    expect(api.logs).toHaveBeenCalledTimes(count)
  })
  it('失活隔离旧读取/弹窗，返回提示手动重读，卸载也丢弃响应', async () => {
    const { wrapper, shown } = await open({}, false, true)
    const pending = deferred()
    api.logs.mockReturnValueOnce(pending.promise)
    state(wrapper).loadData()
    shown.value = false
    await flushPromises()
    pending.resolve(result([{ run_id: 'late' }], 1))
    await flushPromises()
    shown.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(state(wrapper).tableData[0].run_id).toBe('run-A')
    expect(api.logs).toHaveBeenCalledTimes(2)
    const second = deferred()
    api.logs.mockReturnValueOnce(second.promise)
    state(wrapper).loadData()
    wrappers[0].unmount()
    second.resolve(result([{ run_id: 'unmounted' }], 1))
    await flushPromises()
    expect(state(wrapper).tableData[0].run_id).toBe('run-A')
  })
})
