import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import JobLogs from '@/modules/automation/views/job/JobRunLogsPage.vue'

const api = vi.hoisted(() => ({ fetchJobRunLogs: vi.fn(), rerunJob: vi.fn(), post: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/core/api', () => ({ useApi: () => ({ post: api.post }) }))
vi.mock('@/modules/automation/stores/useJobStore', () => ({
  JOB_TYPE_OPTIONS: [
    { value: '', label: '全部' },
    { value: 'command', label: '命令' }
  ]
}))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling() {} }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/views/job/JobStatisticsPage.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/components/shared/RunLogStatusTag.vue', () => ({
  default: { template: '<span><slot /></span>' }
}))

const record = id => ({
  id,
  job_title: '示例运行',
  job_type: 'command',
  status: 'COMPLETED',
  start_time: '2026-10-30T00:00:00Z',
  end_time: '2026-10-30T00:01:00Z',
  stats_json: '{}'
})
const response = (rows = [record('original')], total = 45) => ({ data: { records: rows, total } })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component }]
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(component, {
    global: {
      plugins: [router],
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot /></div>' },
        'el-form': { template: '<form @submit.prevent><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': true,
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot /></button>'
        },
        'el-tag': { template: '<span><slot /></span>' },
        'el-alert': { template: '<div><slot /></div>' },
        'el-icon': true,
        'el-dialog': { template: '<div />' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function sort(label, direction) {
  const heading = wrapper.findAll('th').find(item => item.text() === label)
  await heading.get(`.sort-caret.${direction}`).trigger('click')
  await flushPromises()
}
async function page(value) {
  const pagination = wrapper.findComponent(ElPagination)
  pagination.vm.$emit('update:current-page', value)
  pagination.vm.$emit('current-change', value)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.fetchJobRunLogs.mockResolvedValue(response())
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
  wrapper?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('运行记录时间排序参与分页查询', () => {
  it('真实时间表头发送原接口orderBy，回首页并保留筛选/大小，翻页刷新保持排序', async () => {
    await open(JobLogs)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
    Object.assign(state().filters, { day: '7', status: 'FAILED' })
    state().pagination.size = 20
    await page(3)
    await sort('结束时间', 'ascending')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0]).toMatchObject({
      orderBy: 'end_time asc',
      page: 1,
      size: 20,
      params: { day: '7', status: 'FAILED' }
    })
    await page(2)
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0]).toMatchObject({
      orderBy: 'end_time asc',
      page: 2
    })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0]).toMatchObject({
      orderBy: 'end_time asc',
      page: 2
    })
    await sort('结束时间', 'descending')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].orderBy).toBe('end_time desc')
    await sort('结束时间', 'descending')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].orderBy).toBe('start_time desc')
    await sort('开始时间', 'ascending')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].orderBy).toBe('start_time asc')
    expect(api.rerunJob).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('连续排序只接受最新结果/总数，保留查看结果的真实运行ID', async () => {
    await open(JobLogs)
    const old = deferred(),
      latest = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await sort('结束时间', 'ascending')
    await sort('结束时间', 'descending')
    latest.resolve(response([record('latest-run')], 1))
    await flushPromises()
    old.resolve(response([record('stale-run')], 99))
    await flushPromises()
    expect(state().tableData.map(row => row.id)).toEqual(['latest-run'])
    expect(state().pagination.total).toBe(1)
    await state().handleViewResult(state().tableData[0])
    expect(state().resultMeta.runId).toBe('latest-run')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('旧查询错误不影响新排序的加载，卸载后迟到错误不提示', async () => {
    await open(JobLogs)
    const old = deferred(),
      latest = deferred()
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    api.fetchJobRunLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await sort('结束时间', 'ascending')
    await sort('结束时间', 'descending')
    old.reject(new Error('obsolete'))
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    wrapper.unmount()
    latest.reject(new Error('unmounted'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
