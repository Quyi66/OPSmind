import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElPagination,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn
} from 'element-plus'
import Page from '@/modules/patches/views/OperationLogsPage.vue'

const api = vi.hoisted(() => ({ getLogs: vi.fn(), get: vi.fn(), initTranslations: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchLogsApi: api }))
vi.mock('@/core/api', () => ({ useApi: () => ({ get: api.get }) }))
vi.mock('@/core/auth', () => ({ authService: { getTenantId: () => 'tenant-original' } }))
vi.mock('@/utils/i18n', () => ({
  initTranslations: api.initTranslations,
  translateText: text => text
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { props: ['visible', 'runId', 'title'], template: '<aside data-result />' }
}))
vi.mock('@/modules/patches/components/logs/ScanReportDialog.vue', () => ({
  default: { props: ['modelValue', 'runId'], template: '<aside data-scan />' }
}))
vi.mock('@/modules/patches/components/logs/WindowsScanReportDialog.vue', () => ({
  default: { props: ['modelValue', 'runId'], template: '<aside />' }
}))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const record = (id = 'initial', overrides = {}) => ({
  run_id: id,
  run_record: true,
  action: '补丁扫描',
  status: 'COMPLETED',
  message: '原始结果',
  username: 'admin',
  target_hosts: 'host-a,host-b',
  start_time: '2026-10-30T00:00:00Z',
  end_time: '2026-10-30T00:00:00Z',
  ...overrides
})
const receipt = (id = 'initial', overrides = {}, total = 45) => ({
  records: [record(id, overrides)],
  total
})
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
      { path: '/patches/logs', component: Page },
      { path: '/other', component: { template: '<div>other</div>' } }
    ]
  })
  await router.push('/patches/logs')
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
      components: { ElSelect, ElOption },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-select': ElSelect,
        'el-option': ElOption,
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-button': {
          props: ['loading'],
          template: '<button :disabled="loading"><slot /></button>'
        },
        'el-icon': true,
        'el-tooltip': { template: '<span><slot /><slot name="content" /></span>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-dialog': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        },
        'el-scrollbar': { template: '<div><slot /></div>' },
        'el-empty': true,
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.getLogs.mockReset().mockResolvedValue(receipt())
  api.get.mockReset()
  api.initTranslations.mockReset().mockResolvedValue(undefined)
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
  wrapper?.unmount()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  expect(api.get).not.toHaveBeenCalled()
})

describe('补丁变更日志读取交互', () => {
  it('分页和刷新保留已应用关键词/当前页，搜索才应用trim草稿', async () => {
    await open()
    await page().get('input[placeholder="搜索"]').setValue('  admin  ')
    await button('搜索').trigger('click')
    await flushPromises()
    expect(api.getLogs.mock.calls.at(-1)[0].filter).toBe('message|username:*admin*')
    await page().get('input[placeholder="搜索"]').setValue('draft')
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({
      page: 2,
      filter: 'message|username:*admin*'
    })
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({
      page: 2,
      filter: 'message|username:*admin*'
    })
    await page().get('input[placeholder="搜索"]').trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({
      page: 1,
      filter: 'message|username:*draft*'
    })
  })

  it('原活动列表轮询不应用关键词草稿，完成后停止，无共享轮询替换', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getLogs
      .mockResolvedValueOnce(receipt('running', { status: 'RUNNING' }))
      .mockResolvedValueOnce(receipt('running', { status: 'RUNNING' }))
      .mockResolvedValueOnce(receipt('done'))
    await open()
    await page().get('input[placeholder="搜索"]').setValue('not-applied')
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.getLogs.mock.calls[1][0].filter).toBe('')
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(state().visibleRows[0].run_id).toBe('done')
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getLogs).toHaveBeenCalledTimes(3)
  })

  it.each(['resolve', 'reject'])('连续读取旧%s不覆盖新数据或结束新loading', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().loadData()
    await page().get('input[placeholder="搜索"]').setValue('latest')
    state().handleFilterChange()
    old[method](method === 'resolve' ? receipt('old') : new Error('old'))
    await first
    expect(state().loading).toBe(true)
    expect(state().visibleRows).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(receipt('latest'))
    await flushPromises()
    expect(state().visibleRows[0].run_id).toBe('latest')
  })

  it('当前读取失败隐藏旧行和下载入口，停止自动读并可按原条件/页码重试', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getLogs.mockResolvedValueOnce(receipt('running', { status: 'RUNNING' }))
    await open()
    state().pagination.page = 2
    api.getLogs.mockRejectedValueOnce(new Error('network'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().visibleRows).toEqual([])
    expect(button('详情')).toBeUndefined()
    expect(page().get('[role="alert"]').text()).toContain('加载变更日志失败')
    const count = api.getLogs.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getLogs).toHaveBeenCalledTimes(count)
    await page().get('input[placeholder="搜索"]').setValue('draft')
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({ page: 2, filter: '' })
    expect(page().find('[role="alert"]').exists()).toBe(false)
  })

  it('变条数和重置只各查一次，恢复默认查询，表单禁止原生提交', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    const count = api.getLogs.mock.calls.length
    const pagination = page().findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 25)
    pagination.vm.$emit('size-change', 25)
    pagination.vm.$emit('current-change', 1)
    await flushPromises()
    expect(api.getLogs).toHaveBeenCalledTimes(count + 1)
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({ page: 1, size: 25 })
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await button('重置').trigger('click')
    await flushPromises()
    expect(api.getLogs).toHaveBeenCalledTimes(count + 2)
    expect(api.getLogs.mock.calls.at(-1)[0]).toEqual({
      page: 1,
      size: 10,
      action: 'all',
      status: 'all',
      day: 1,
      filter: ''
    })
  })

  it.each(['statusFilter', 'actionFilter'])('真实下拉清除%s回显全部且查询all', async field => {
    await open()
    const value = field === 'statusFilter' ? 'FAILED' : 'Windows补丁安装'
    state()[field] = value
    state().handleFilterChange()
    await flushPromises()
    const select = page().findAllComponents(ElSelect)[field === 'statusFilter' ? 1 : 2]
    await select.get('.el-select__wrapper').trigger('click')
    await flushPromises()
    await select.trigger('mouseenter')
    await select.get('.el-select__clear').trigger('click')
    await flushPromises()
    expect(state()[field]).toBe('all')
    expect(select.text()).toContain('全部')
    expect(api.getLogs.mock.calls.at(-1)[0][field === 'statusFilter' ? 'status' : 'action']).toBe(
      'all'
    )
  })

  it.each(['#{app_vap.menu.patch_install.title}', '#{app_vap.menu.patch_rollback.title}'])(
    '原操作别名%s和筛选值仍按既有接口映射',
    async action => {
      await open()
      state().actionFilter = action
      state().statusFilter = 'FAILED'
      state().dayFilter = 7
      state().handleFilterChange()
      await flushPromises()
      expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({
        action: action.includes('install') ? '补丁安装' : '补丁回滚',
        status: 'FAILED',
        day: 7
      })
    }
  )

  it('当前行仍用真实run_id查看执行结果/扫描报告，目标节点查看保持原值', async () => {
    await open()
    await button('详情').trigger('click')
    expect(state().selectedRunId).toBe('initial')
    await button('扫描报告').trigger('click')
    expect(state().scanReportRunId).toBe('initial')
    await page().get('.host-tags-wrapper').trigger('click')
    expect(state().hostsDialogList).toEqual(['host-a', 'host-b'])
  })

  it.each([
    { start_time: 'invalid', end_time: 'invalid', expected: '-' },
    { start_time: '2026-10-30T01:00:00Z', end_time: '2026-10-30T00:00:00Z', expected: '-' },
    { start_time: '2026-10-30T00:00:00Z', end_time: '2026-10-30T00:00:00Z', expected: '0:00:00' },
    { start_time: 0, end_time: 0, expected: '0:00:00' },
    { start_time: false, end_time: true, expected: '-' }
  ])('时间/耗时按真实数据展示：$expected', async ({ expected, ...times }) => {
    api.getLogs.mockResolvedValueOnce(receipt('time', times))
    await open()
    const cells = page().get('.el-table__body-wrapper tbody tr').findAll('td')
    expect(cells[8].text()).toBe(expected)
    expect(cells[0].text()).not.toContain('NaN')
    if (times.start_time === 0) expect(cells[0].text()).toContain('1970-01-01')
  })

  it('KeepAlive失活停止轮询并关闭只读窗口，返回原页读取新结果', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getLogs.mockResolvedValueOnce(receipt('running', { status: 'RUNNING' }))
    await open(true)
    const context = state()
    context.handleViewRunResult(context.tableData[0])
    context.handleScanReport(context.tableData[0])
    context.handleShowAllHosts(context.tableData[0])
    await router.push('/other')
    await flushPromises()
    expect(context.runResultDialogVisible).toBe(false)
    expect(context.scanReportVisible).toBe(false)
    expect(context.hostsDialogVisible).toBe(false)
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getLogs).toHaveBeenCalledTimes(1)
    await router.push('/patches/logs')
    await flushPromises()
    expect(state()).toBe(context)
    expect(api.getLogs).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'])('卸载后迟到%s不更新数据或弹错误', async method => {
    const pending = deferred()
    api.getLogs.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? receipt('late') : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
