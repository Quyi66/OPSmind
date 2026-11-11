import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/patches/views/PatchProcessLogsPage.vue'

const api = vi.hoisted(() => ({ getAuditLogs: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchLogsApi: api }))
vi.mock('@/modules/patches/components/logs/PatchProcessLogDetailDialog.vue', () => ({
  default: { props: ['modelValue', 'task'], template: '<aside />' }
}))
vi.mock('@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue', () => ({
  default: { props: ['modelValue', 'taskId'], template: '<aside />' }
}))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const receipt = (id = 'initial', status = 'COMPLETED', total = 75) => ({
  data: {
    content: [{ id, taskType: 'install', status, createdBy: 'operator', osType: 'Linux' }],
    totalElements: total
  }
})
let wrapper, router
const page = () => wrapper.findComponent(Page)
const state = () => page().vm.$.setupState
const button = label =>
  page()
    .findAll('button')
    .find(item => item.text() === label)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/patches/process', component: Page },
      { path: '/other', component: { template: '<div>other</div>' } }
    ]
  })
  await router.push('/patches/process')
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
      stubs: {
        'router-view': false,
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-select': true,
        'el-option': true,
        'el-input': {
          props: ['modelValue'],
          emits: ['update:modelValue', 'clear'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
        'el-date-picker': true,
        'el-button': {
          props: ['loading'],
          template: '<button :disabled="loading"><slot /></button>'
        },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.getAuditLogs.mockReset().mockResolvedValue(receipt())
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
})

describe('流程操作记录查询与轮询上下文', () => {
  it('真实列表轮询沿已应用条件，操作人草稿不自动应用，完成后停止轮询', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getAuditLogs
      .mockResolvedValueOnce(receipt('active', 'INSTALLING'))
      .mockResolvedValueOnce(receipt('active', 'INSTALLING'))
      .mockResolvedValueOnce(receipt('done'))
    await open()
    await page().get('input[placeholder="请输入"]').setValue('  draft-operator  ')
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(api.getAuditLogs.mock.calls[1][0].operator).toBeUndefined()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(state().tableData[0].id).toBe('done')
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getAuditLogs).toHaveBeenCalledTimes(3)
  })

  it('显式搜索固定操作人/类型/日期快照，翻页和刷新不消费新草稿', async () => {
    await open()
    state().filters.taskType = 'rollback'
    state().filters.timeRange = ['2026-10-01', '2026-10-30']
    await page().get('input[placeholder="请输入"]').setValue('  admin  ')
    await button('搜索').trigger('click')
    await flushPromises()
    const expected = {
      taskType: 'rollback',
      operator: 'admin',
      startTime: '2026-10-01 00:00:00',
      endTime: '2026-10-30 23:59:59',
      page: 0,
      size: 20
    }
    expect(api.getAuditLogs).toHaveBeenLastCalledWith(expected)
    state().filters.timeRange[0] = '2026-01-01'
    await page().get('input[placeholder="请输入"]').setValue('draft')
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(api.getAuditLogs).toHaveBeenLastCalledWith({ ...expected, page: 1 })
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.getAuditLogs).toHaveBeenLastCalledWith({ ...expected, page: 1 })
  })

  it('缩量仅补读最后有效页，分页事件不重复读取，保留同一查询', async () => {
    await open()
    state().pagination.page = 4
    api.getAuditLogs
      .mockResolvedValueOnce(receipt('empty', 'COMPLETED', 25))
      .mockResolvedValueOnce(receipt('last', 'COMPLETED', 25))
    const count = api.getAuditLogs.mock.calls.length
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.getAuditLogs.mock.calls.slice(count).map(call => call[0].page)).toEqual([3, 1])
    expect(state().pagination.page).toBe(2)
    expect(state().tableData[0].id).toBe('last')
    expect(state().visibleRows).toHaveLength(1)
  })

  it('变条数回首页只查询一次，保持原0基接口页码', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    const count = api.getAuditLogs.mock.calls.length
    const pagination = page().findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 50)
    pagination.vm.$emit('size-change', 50)
    pagination.vm.$emit('current-change', 1)
    await flushPromises()
    expect(api.getAuditLogs).toHaveBeenCalledTimes(count + 1)
    expect(api.getAuditLogs.mock.calls.at(-1)[0]).toMatchObject({ page: 0, size: 50 })
  })

  it.each(['resolve', 'reject'])('连续搜索旧%s不覆盖新记录或提前结束新加载', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getAuditLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().loadData()
    state().filters.operator = 'latest'
    state().handleSearch()
    old[method](method === 'resolve' ? receipt('old') : new Error('old'))
    await first
    expect(state().visibleRows).toEqual([])
    expect(state().loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(receipt('latest'))
    await flushPromises()
    expect(state().visibleRows[0].id).toBe('latest')
    expect(api.getAuditLogs.mock.calls.at(-1)[0].operator).toBe('latest')
  })

  it('读取失败隐藏旧操作行并暂停自动重试，原条件手动重试恢复当前页', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getAuditLogs.mockResolvedValueOnce(receipt('active', 'INSTALLING'))
    await open()
    state().pagination.page = 2
    api.getAuditLogs.mockRejectedValueOnce(new Error('current'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().visibleRows).toEqual([])
    expect(button('详情')).toBeUndefined()
    expect(page().get('[role="alert"]').text()).toContain('加载流程操作记录失败')
    const count = api.getAuditLogs.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getAuditLogs).toHaveBeenCalledTimes(count)
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getAuditLogs.mock.calls.at(-1)[0].page).toBe(1)
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(state().pagination.page).toBe(2)
  })

  it('缓存失活停止轮询并关闭只读窗口，返回自身页恢复原查询', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.getAuditLogs.mockResolvedValue(receipt('active', 'INSTALLING'))
    await open(true)
    const context = state()
    context.openDetail(context.tableData[0])
    context.openFailedHosts(context.tableData[0])
    await router.push('/other')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getAuditLogs).toHaveBeenCalledTimes(1)
    expect(context.detailVisible).toBe(false)
    expect(context.failedHostsVisible).toBe(false)
    await router.push('/patches/process')
    await flushPromises()
    expect(state()).toBe(context)
    expect(api.getAuditLogs).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'])('卸载后迟到%s不更新记录或提示错误', async method => {
    const pending = deferred()
    api.getAuditLogs.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? receipt('late') : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'])('缩量补查中的旧%s不覆盖后续新搜索', async method => {
    await open()
    const corrected = deferred(),
      latest = deferred()
    state().pagination.page = 4
    api.getAuditLogs
      .mockResolvedValueOnce(receipt('old-empty', 'COMPLETED', 25))
      .mockReturnValueOnce(corrected.promise)
      .mockReturnValueOnce(latest.promise)
    const read = state().loadData()
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    state().filters.operator = 'new-operator'
    state().handleSearch()
    corrected[method](
      method === 'resolve' ? receipt('old-corrected', 'COMPLETED', 25) : new Error('old')
    )
    await read
    expect(state().loading).toBe(true)
    expect(state().pagination.page).toBe(1)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(receipt('new-results', 'COMPLETED', 1))
    await flushPromises()
    expect(state().visibleRows[0].id).toBe('new-results')
    expect(state().pagination.total).toBe(1)
  })

  it('缩量补查失败后留在有效页，重试只读该页并沿真实任务对象打开原详情', async () => {
    await open()
    state().pagination.page = 4
    api.getAuditLogs
      .mockResolvedValueOnce(receipt('empty', 'COMPLETED', 25))
      .mockRejectedValueOnce(new Error('corrected page failed'))
    await state().loadData()
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    expect(state().visibleRows).toEqual([])
    const data = receipt('real-task', 'COMPLETED', 25)
    data.data.content[0].executeRunId = 'real-execution'
    data.data.content[0].taskSnapshot = { custom: 'keep-original' }
    api.getAuditLogs.mockResolvedValueOnce(data)
    const count = api.getAuditLogs.mock.calls.length
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getAuditLogs).toHaveBeenCalledTimes(count + 1)
    expect(api.getAuditLogs.mock.calls.at(-1)[0].page).toBe(1)
    await button('详情').trigger('click')
    expect(state().selectedTask).toEqual(data.data.content[0])
    await button('失败主机').trigger('click')
    expect(state().failedHostsTaskId).toBe('real-task')
  })
})
