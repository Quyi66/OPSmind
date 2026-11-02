import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElForm, ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/automation/views/job/JobRunLogsPage.vue'

const api = vi.hoisted(() => ({
  fetchJobRunLogs: vi.fn(),
  rerunJob: vi.fn(),
  statsMounted: vi.fn()
}))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/modules/automation/stores/useJobStore', () => ({
  JOB_TYPE_OPTIONS: [
    { value: '', label: '全部' },
    { value: 'command', label: '命令' }
  ]
}))
vi.mock('@/modules/automation/views/job/JobStatisticsPage.vue', () => ({
  default: {
    name: 'JobStatisticsPage',
    template: '<aside>统计</aside>',
    mounted() {
      api.statsMounted()
    }
  }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', template: '<aside />' }
}))
vi.mock('@/components/shared/RunLogStatusTag.vue', () => ({
  default: { template: '<span><slot /></span>' }
}))
const record = (id = 'original-run', status = 'FAILED') => ({
  id,
  runId: id,
  job_id: 'original-tool-id',
  job_title: 'Original tool',
  job_type: 'script',
  status,
  start_time: '2026-10-30T00:00:00Z',
  end_time: '2026-10-30T00:01:00Z',
  stats_json: '{}'
})
const response = (id = 'original-run', status = 'FAILED') => ({
  data: { records: [record(id, status)], total: 45 }
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
const page = () => root.findComponent(Page)
const state = () => page().vm.$.setupState
const button = text =>
  page()
    .findAll('button')
    .find(item => item.text() === text)
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/run-records/logs', name: 'run-records-logs', component: Page },
      { path: '/other', component: { template: '<div>other</div>' } }
    ]
  })
  await router.push({ path: '/run-records/logs', query })
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, {
            default: () => h(Component, { key: route.path.replace(/\/$/, '') })
          })
      })
  })
  const Slot = { template: '<div><slot /></div>' }
  root = mount(Host, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': Slot,
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-select': Slot,
        'el-option': true,
        'el-icon': true,
        'el-tag': Slot,
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
  api.fetchJobRunLogs.mockReset().mockResolvedValue(response())
  api.rerunJob.mockReset()
  api.statsMounted.mockReset()
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

describe('运行记录本页路由与缓存读取', () => {
  it('其他路由筛选不覆盖本页条件/页码或隐藏创建统计页', async () => {
    await open({ day: '7', status: 'FAILED', type: 'command', keyword: 'original' })
    const context = state()
    context.pagination.page = 3
    const reads = api.fetchJobRunLogs.mock.calls.length
    await router.push({
      path: '/other',
      query: { tab: 'statistics', day: '30', status: 'COMPLETED', type: 'rest', keyword: 'other' }
    })
    await flushPromises()
    expect(context.activeTab).toBe('logs')
    expect(context.pagination.page).toBe(3)
    expect(context.filters).toMatchObject({
      day: '7',
      status: 'FAILED',
      type: 'command',
      search: 'original'
    })
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(reads)
    expect(api.statsMounted).not.toHaveBeenCalled()
    expect(api.rerunJob).not.toHaveBeenCalled()
  })
  it('缓存返回同查询只刷新一次、保留当前页和原参数；返回新查询才回首页', async () => {
    const query = { day: '7', status: 'FAILED', type: 'command', keyword: 'original' }
    await open(query)
    const context = state()
    context.pagination.page = 3
    await router.push({ path: '/other', query: { day: '30' } })
    await flushPromises()
    const reads = api.fetchJobRunLogs.mock.calls.length
    await router.push({ path: '/run-records/logs', query })
    await flushPromises()
    expect(state()).toBe(context)
    expect(context.pagination.page).toBe(3)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(reads + 1)
    expect(api.fetchJobRunLogs.mock.lastCall[0]).toMatchObject({
      page: 3,
      params: { day: '7', status: 'FAILED', type: 'command' },
      filter: 'start_time|username|executor_url:*original*'
    })
    await router.push('/other')
    await flushPromises()
    const nextReads = api.fetchJobRunLogs.mock.calls.length
    await router.push({ path: '/run-records/logs', query: { day: '30', status: 'COMPLETED' } })
    await flushPromises()
    expect(context.pagination.page).toBe(1)
    expect(context.filters.day).toBe('30')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(nextReads + 1)
  })
  it('初始统计页不读日志，离开不被别处query切换，返回本页日志才加载', async () => {
    await open({ tab: 'statistics' })
    expect(api.fetchJobRunLogs).not.toHaveBeenCalled()
    expect(api.statsMounted).toHaveBeenCalledTimes(1)
    const context = state()
    await router.push('/other')
    await flushPromises()
    expect(context.activeTab).toBe('statistics')
    expect(api.fetchJobRunLogs).not.toHaveBeenCalled()
    await router.push('/run-records/logs')
    await flushPromises()
    expect(context.activeTab).toBe('logs')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
  })
  it('真实自动轮询离开缓存后停止，返回同实例恢复，旧在途结果无效', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.fetchJobRunLogs.mockResolvedValue(response('original-running', 'RUNNING'))
    await open()
    const context = state(),
      pending = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(pending.promise)
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    await router.push('/other')
    await flushPromises()
    pending.resolve(response('old-finished'))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(context.tableData[0].id).toBe('original-running')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    await router.push('/run-records/logs')
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(4)
  })
  it('切到统计页使在途日志无效并停止轮询，切回重新查询', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.fetchJobRunLogs.mockResolvedValue(response('original-running', 'RUNNING'))
    await open()
    const pending = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    await router.replace({ path: '/run-records/logs', query: { tab: 'statistics' } })
    await flushPromises()
    pending.reject(new Error('old-logs'))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(10000)
    expect(state().activeTab).toBe('statistics')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    expect(ElMessage.error).not.toHaveBeenCalled()
    await router.replace('/run-records/logs')
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(3)
  })
  it('失败隐藏旧重新启动入口，持久提示/重试保留本页筛选和页码', async () => {
    await open({ day: '7', status: 'FAILED' })
    state().pagination.page = 2
    api.fetchJobRunLogs.mockRejectedValueOnce(new Error('read-failed'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('获取运行记录失败')
    expect(button('重新启动')).toBeUndefined()
    expect(page().findComponent(ElPagination).exists()).toBe(false)
    expect(state().tableData[0].id).toBe('original-run')
    expect(state().pagination.page).toBe(2)
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().loadError).toBe('')
    expect(state().pagination.page).toBe(2)
    expect(api.fetchJobRunLogs.mock.lastCall[0]).toMatchObject({
      page: 2,
      params: { day: '7', status: 'FAILED' }
    })
  })
  it('无关query变化不重读，自身数组query与尾斜线按原条件生效', async () => {
    await open({ day: '7' })
    const reads = api.fetchJobRunLogs.mock.calls.length
    await router.replace({ path: '/run-records/logs', query: { day: '7', other: 'unrelated' } })
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(reads)
    await router.replace({
      path: '/run-records/logs/',
      query: { day: ['30'], status: ['FAILED'], type: ['command'], keyword: ['original'] }
    })
    await flushPromises()
    expect(state().filters).toMatchObject({
      day: '30',
      status: 'FAILED',
      type: 'command',
      search: 'original'
    })
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(reads + 1)
  })
  it('有效零时间/耗时/统计保留，负耗时与非法值占位；原结果ID不变', async () => {
    await open()
    const context = state()
    expect(context.calculateDuration(0, 0)).toBe('0s')
    expect(context.calculateDuration(1000, 0)).toBe('-')
    expect(context.calculateDuration('invalid', '2026-10-30')).toBe('-')
    expect(
      context.formatStats('{"totalHosts":0,"okHosts":"0","failedHosts":2,"unreachableHosts":0}')
    ).toBe('总数:0 | 成功:0 | 失败:2 | 不可达:0')
    expect(context.formatStats('{"totalHosts":-1,"okHosts":"invalid","failedHosts":null}')).toBe(
      '-'
    )
    context.handleViewResult(context.tableData[0])
    expect(context.resultMeta.runId).toBe('original-run')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('慢手动读取不被轮询反复覆盖，失败暂停本页轮询，重试成功后恢复', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.fetchJobRunLogs.mockResolvedValue(response('original-running', 'RUNNING'))
    await open()
    const pending = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    expect(state().loading).toBe(true)
    pending.reject(new Error('slow-read-failed'))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(2)
    expect(state().loadError).not.toBe('')
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(4)
  })
})
