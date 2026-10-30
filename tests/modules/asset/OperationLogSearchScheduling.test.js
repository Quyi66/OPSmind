import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { ElForm, ElFormItem, ElInput } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import OperationLogPage from '@/modules/asset/views/OperationLogPage.vue'

const api = vi.hoisted(() => ({ getOperationLogs: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({ operationLogApi: api }))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling() {} }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<aside />' }
}))

let wrapper, router, root, shown
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open(query = {}, cached = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: ['/acm/log', '/acm/info'].map(path => ({ path, component: { template: '<div />' } }))
  })
  await router.push({ path: '/acm/log', query })
  shown = ref(true)
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(OperationLogPage) : null) })
  })
  root = mount(cached ? Host : OperationLogPage, {
    global: {
      plugins: [router],
      components: { ElForm, ElFormItem, ElInput },
      stubs: {
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-button': { template: '<button type="button"><slot /></button>' },
        'el-icon': true,
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-table': { template: '<section />' },
        'el-table-column': true,
        'el-tag': true,
        'el-link': true,
        'el-pagination': true
      },
      directives: { loading() {} }
    }
  })
  wrapper = cached ? root.findComponent(OperationLogPage) : root
  await flushPromises()
}
async function advance(ms = 600) {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}
beforeEach(() => {
  api.getOperationLogs.mockReset().mockResolvedValue({ records: [], total: 0 })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  root?.unmount()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('资产操作日志搜索调度', () => {
  it('从带关键词的地址打开只读取一次，路由回填不再安排防抖搜索', async () => {
    await open({ keyword: 'node-a', day: '7', status: 'FAILED' })
    await advance()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
    expect(api.getOperationLogs).toHaveBeenLastCalledWith(
      { module: 'cmdb', action: 'all', day: 7, status: 'FAILED' },
      { page: 1, size: 20, filter: 'executor_node:*node-a*' }
    )
    expect(wrapper.get('input').element.value).toBe('node-a')
  })

  it('连续输入合并为一次查询，Enter立即搜索后不再追加定时查询', async () => {
    await open()
    await wrapper.get('input').setValue('node')
    await advance(200)
    await wrapper.get('input').setValue('node-b')
    await wrapper.get('input').trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
    await advance()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.query.keyword).toBe('node-b')
  })

  it('真实清除控件只查询一次，并取消旧关键词的防抖', async () => {
    await open({ keyword: 'node-a' })
    await advance()
    api.getOperationLogs.mockClear()
    await wrapper.get('input').setValue('node-b')
    await wrapper.get('.el-input').trigger('mouseenter')
    await wrapper.get('.el-input__clear').trigger('click')
    await flushPromises()
    await advance()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
    expect(api.getOperationLogs.mock.calls[0][1].filter).toBeUndefined()
    expect(router.currentRoute.value.query.keyword).toBeUndefined()
  })

  it('重置取消待搜索词，保留原默认条件且只查询一次', async () => {
    await open({ keyword: 'node-a', day: '30', status: 'FAILED' })
    await advance()
    api.getOperationLogs.mockClear()
    await wrapper.get('input').setValue('unsent')
    await button('重置').trigger('click')
    await flushPromises()
    await advance()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
    expect(api.getOperationLogs.mock.calls[0]).toEqual([
      { module: 'cmdb', action: 'all', day: 1, status: 'all' },
      { page: 1, size: 20, filter: undefined }
    ])
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('离开并卸载后未完成的输入计时器不会把用户带回操作日志', async () => {
    await open()
    await wrapper.get('input').setValue('unsent')
    wrapper.unmount()
    await router.push('/acm/info')
    await advance()
    expect(router.currentRoute.value.path).toBe('/acm/info')
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
  })

  it('页签缓存失活也会清除待搜索计时器，返回时保留原地址条件', async () => {
    await open({}, true)
    await wrapper.get('input').setValue('unsent')
    shown.value = false
    await flushPromises()
    await advance()
    expect(router.currentRoute.value.query).toEqual({})
    expect(api.getOperationLogs).toHaveBeenCalledTimes(1)
    shown.value = true
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('unsent')
  })
})
