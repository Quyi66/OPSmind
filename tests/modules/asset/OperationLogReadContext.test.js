import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElMessage, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/asset/views/OperationLogPage.vue'

const api = vi.hoisted(() => ({ getOperationLogs: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({ operationLogApi: api }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', props: ['visible', 'runId'], template: '<aside />' }
}))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const receipt = (runId, node = runId) => ({
  records: [{ run_id: runId, executor_node: node, status: 'COMPLETED', action: 'read' }],
  total: 1
})
let root, router
const page = () => root.findComponent(Page)
const data = () => page().findComponent(ElTable).props('data')
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/acm/log', component: Page },
      { path: '/acm/info', component: { template: '<div>other</div>' } }
    ]
  })
  await router.push({ path: '/acm/log', query })
  await router.isReady()
  root = mount(
    defineComponent({
      setup: () => () =>
        h(RouterView, null, {
          default: ({ Component, route }) =>
            h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
        })
    }),
    {
      global: {
        plugins: [router],
        components: { ElTable, ElTableColumn },
        stubs: {
          'router-view': false,
          'el-form': { template: '<form @submit.prevent><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-button': {
            props: ['loading'],
            template: '<button :disabled="loading"><slot /></button>'
          },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-icon': true,
          'el-tag': { template: '<span><slot /></span>' },
          'el-link': true,
          'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
          'el-pagination': true
        },
        directives: { loading() {} }
      }
    }
  )
  await flushPromises()
}
const refresh = () => page().get('button[title="刷新"]').trigger('click')
beforeEach(() => {
  api.getOperationLogs.mockReset().mockResolvedValue(receipt('initial'))
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
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
  root?.unmount()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('资产操作日志读取上下文', () => {
  it('沿真实列表轮询从运行中刷新到完成，清空读取中的旧行不使轮询丢失', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const running = { records: [{ run_id: 'active', status: 'RUNNING' }], total: 1 }
    api.getOperationLogs
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(receipt('finished'))
    await open()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
    expect(data()[0].status).toBe('RUNNING')
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(3)
    expect(data()[0].run_id).toBe('finished')
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getOperationLogs).toHaveBeenCalledTimes(3)
  })

  it('缓存页离开后原运行中记录不会触发隐藏GET，返回仍读取当前条件', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getOperationLogs.mockResolvedValueOnce({
      records: [{ run_id: 'active', status: 'RUNNING' }],
      total: 1
    })
    await open()
    await router.push('/acm/info')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
    await router.push('/acm/log')
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
  })

  it('非法时间的耗时显示占位，真实零秒仍显示0:00', async () => {
    api.getOperationLogs.mockResolvedValueOnce({
      records: [
        {
          run_id: 'invalid',
          status: 'COMPLETED',
          start_time: 'invalid-date',
          end_time: '2026-10-30T00:00:00Z'
        },
        {
          run_id: 'zero',
          status: 'COMPLETED',
          start_time: '2026-10-30T00:00:00Z',
          end_time: '2026-10-30T00:00:00Z'
        }
      ],
      total: 2
    })
    await open()
    const rows = page().findAll('.el-table__body-wrapper tbody tr')
    expect(rows[0].findAll('td')[7].text()).toBe('-')
    expect(rows[1].findAll('td')[7].text()).toBe('0:00')
  })

  it.each(['resolve', 'reject'])('连续切查询时旧%s不回填、不结束新加载或弹旧错误', async method => {
    const old = deferred(),
      latest = deferred()
    api.getOperationLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await open({ keyword: 'node-a', day: '7' })
    await router.replace({
      path: '/acm/log',
      query: { keyword: 'node-b', status: 'FAILED', day: '30' }
    })
    await flushPromises()
    old[method](method === 'resolve' ? receipt('old') : new Error('old'))
    await flushPromises()
    expect(data()).toEqual([])
    expect(page().vm.$.setupState.loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(receipt('latest'))
    await flushPromises()
    expect(data().map(row => row.run_id)).toEqual(['latest'])
    expect(api.getOperationLogs.mock.calls[1]).toEqual([
      { module: 'cmdb', action: 'all', status: 'FAILED', day: 30 },
      { page: 1, size: 20, filter: 'executor_node:*node-b*' }
    ])
  })

  it('刷新时清除旧行，当前错误留页重试，成功后清除错误', async () => {
    await open({ keyword: 'node-a' })
    const pending = deferred()
    api.getOperationLogs.mockReturnValueOnce(pending.promise)
    await refresh()
    expect(data()).toEqual([])
    pending.reject(new Error('current'))
    await flushPromises()
    expect(page().text()).toContain('加载操作记录失败，请重试')
    expect(page().vm.$.setupState.loading).toBe(false)
    await page()
      .findAll('button')
      .find(item => item.text() === '重试')
      .trigger('click')
    await flushPromises()
    expect(data().map(row => row.run_id)).toEqual(['initial'])
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(api.getOperationLogs.mock.calls.at(-1)[1].filter).toBe('executor_node:*node-a*')
  })

  it('离开缓存页后忽略旧响应，回到新条件只展示新日志', async () => {
    await open()
    const pending = deferred()
    api.getOperationLogs.mockReturnValueOnce(pending.promise)
    await refresh()
    await router.push('/acm/info')
    await flushPromises()
    pending.resolve(receipt('hidden-old'))
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
    api.getOperationLogs.mockResolvedValueOnce(receipt('new-page'))
    await router.push({ path: '/acm/log', query: { keyword: 'new-node' } })
    await flushPromises()
    expect(data().map(row => row.run_id)).toEqual(['new-page'])
    expect(api.getOperationLogs).toHaveBeenCalledTimes(3)
  })

  it('卸载后旧失败不提示', async () => {
    await open()
    const pending = deferred()
    api.getOperationLogs.mockReturnValueOnce(pending.promise)
    await refresh()
    root.unmount()
    pending.reject(new Error('old'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
