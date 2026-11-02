import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import {
  ElAlert,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import Page from '@/modules/asset/views/ExceptionDevicePage.vue'

const api = vi.hoisted(() => ({
  getConnectException: vi.fn(),
  getConnectionCount: vi.fn(),
  getResourceTypes: vi.fn(),
  post: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({ exceptionApi: api, dataManageApi: api }))
vi.mock('@/core/api', () => ({ apiService: api }))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const receipt = (prefix = 'host', total = 36, length = 10) => ({
  records: Array.from({ length }, (_, i) => ({
    id: `${prefix}-${i}`,
    IP: `${prefix}-${i}`,
    ci_name: 'Linux服务器',
    CONN_LATEST_STATUS: '0',
    CONN_RATE: 0
  })),
  total
})
let root, router
const page = () => root.findComponent(Page)
const state = () => page().vm.$.setupState
const rows = () => page().findComponent(ElTable).props('data')
const button = label =>
  page()
    .findAll('button')
    .find(item => item.text() === label)
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/acm/exception', component: Page },
      { path: '/acm/info', component: { template: '<div>设备清单</div>' } }
    ]
  })
  await router.push({ path: '/acm/exception', query })
  await router.isReady()
  const components = {
    ElAlert,
    ElButton,
    ElForm,
    ElFormItem,
    ElInput,
    ElOption,
    ElPagination,
    ElSelect,
    ElTable,
    ElTableColumn
  }
  root = mount(
    defineComponent({
      setup: () => () =>
        h(RouterView, null, {
          default: ({ Component, route }) =>
            h(KeepAlive, null, {
              default: () => h(Component, { key: route.path.replace(/\/$/, '') })
            })
        })
    }),
    {
      global: {
        plugins: [router],
        components,
        stubs: {
          'router-view': false,
          ...components,
          'el-button': ElButton,
          'el-form': ElForm,
          'el-form-item': ElFormItem,
          'el-input': ElInput,
          'el-icon': true,
          'el-tag': { template: '<span><slot /></span>' },
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-progress': true,
          'el-dialog': true
        },
        directives: { loading() {} }
      }
    }
  )
  await flushPromises()
}
beforeEach(() => {
  api.getConnectException.mockReset().mockResolvedValue(receipt())
  api.getConnectionCount.mockReset().mockResolvedValue({ records: [] })
  api.getResourceTypes.mockReset().mockResolvedValue({ records: [] })
  api.post.mockReset()
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  expect(api.post).not.toHaveBeenCalled()
})

describe('连通巡检查询上下文', () => {
  it('IP草稿不随翻页或刷新应用，搜索才trim应用并回首页', async () => {
    await open({ ip: 'host-a', cit: 'linux', conditions: 'low' })
    await page().get('input[placeholder="搜索设备 IP..."]').setValue('  host-b  ')
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(api.getConnectException).toHaveBeenLastCalledWith(
      { cit: 'linux', conditions: 'low', ip: 'host-a' },
      { size: 10, page: 2 }
    )
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.getConnectException.mock.calls.at(-1)[0].ip).toBe('host-a')
    await button('搜索').trigger('click')
    await flushPromises()
    expect(api.getConnectException).toHaveBeenLastCalledWith(
      { cit: 'linux', conditions: 'low', ip: 'host-b' },
      { size: 10, page: 1 }
    )
    expect(state().filters.ip).toBe('  host-b  ')
  })

  it('筛选表单阻止原生提交，Enter沿原搜索应用一次', async () => {
    await open()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    const input = page().get('input[placeholder="搜索设备 IP..."]')
    await input.setValue('  entered-host  ')
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(api.getConnectException).toHaveBeenCalledTimes(2)
    expect(api.getConnectException.mock.calls.at(-1)[0].ip).toBe('entered-host')
  })

  it('缓存页不消费其他页面IP，返回自身路由再应用原条件', async () => {
    await open({ ip: 'host-a', conditions: 'low' })
    const context = state()
    await router.push({ path: '/acm/info', query: { ip: 'other-host', conditions: 'today' } })
    await flushPromises()
    expect(api.getConnectException).toHaveBeenCalledTimes(1)
    expect(context.filters.ip).toBe('host-a')
    expect(context.filters.conditions).toBe('low')
    await router.push({ path: '/acm/exception', query: { ip: 'host-b', conditions: 'recently' } })
    await flushPromises()
    expect(state()).toBe(context)
    expect(api.getConnectException).toHaveBeenCalledTimes(2)
    expect(api.getConnectException).toHaveBeenLastCalledWith(
      { cit: 'sjxy_all', conditions: 'recently', ip: 'host-b' },
      { size: 10, page: 1 }
    )
  })

  it.each(['resolve', 'reject'])(
    '连续查询时旧%s不回填、不结束新loading或显示旧错误',
    async method => {
      const old = deferred(),
        latest = deferred()
      api.getConnectException.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      await open({ ip: 'host-a' })
      await router.replace({ path: '/acm/exception', query: { ip: 'host-b' } })
      await flushPromises()
      old[method](method === 'resolve' ? receipt('old') : new Error('old'))
      await flushPromises()
      expect(rows()).toEqual([])
      expect(state().tableLoading).toBe(true)
      expect(state().loadError).toBe('')
      latest.resolve(receipt('latest'))
      await flushPromises()
      expect(rows()[0].id).toBe('latest-0')
      expect(state().tableLoading).toBe(false)
    }
  )

  it('当前读取失败清旧设备和选择，保留已应用条件并用原GET重试', async () => {
    await open({ ip: 'host-a' })
    await page().get('.el-table__body-wrapper tbody tr input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(state().selectedExceptionRows).toHaveLength(1)
    api.getConnectException.mockRejectedValueOnce(new Error('network'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(rows()).toEqual([])
    expect(state().selectedExceptionRows).toEqual([])
    expect(page().find('[role="alert"]').text()).toContain('加载连通巡检设备失败')
    await page().get('input[placeholder="搜索设备 IP..."]').setValue('draft-host')
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getConnectException.mock.calls.at(-1)[0].ip).toBe('host-a')
    expect(rows()).toHaveLength(10)
    expect(page().find('[role="alert"]').exists()).toBe(false)
  })

  it('跨页保留原设备选择，应用新搜索才清除', async () => {
    await open()
    await page().get('.el-table__body-wrapper tbody tr input[type="checkbox"]').setValue(true)
    await flushPromises()
    api.getConnectException.mockResolvedValueOnce(receipt('page-two'))
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(state().selectedExceptionRows.map(row => row.id)).toEqual(['host-0'])
    await button('搜索').trigger('click')
    await flushPromises()
    expect(state().selectedExceptionRows).toEqual([])
  })

  it('变条数回首页且只读取一次新页面', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    const count = api.getConnectException.mock.calls.length
    page().findComponent(ElPagination).vm.$emit('update:page-size', 50)
    page().findComponent(ElPagination).vm.$emit('size-change', 50)
    await flushPromises()
    expect(api.getConnectException).toHaveBeenCalledTimes(count + 1)
    expect(api.getConnectException.mock.calls.at(-1)[1]).toEqual({ size: 50, page: 1 })
  })

  it.each(['resolve', 'reject'])('离开缓存页后迟到%s不更新设备，返回后读取新结果', async method => {
    await open()
    const pending = deferred()
    api.getConnectException.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    const context = state()
    await router.push('/acm/info')
    await flushPromises()
    pending[method](method === 'resolve' ? receipt('late') : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(context.tableLoading).toBe(false)
    await router.push('/acm/exception')
    await flushPromises()
    expect(rows()[0].id).toBe('host-0')
  })
})
