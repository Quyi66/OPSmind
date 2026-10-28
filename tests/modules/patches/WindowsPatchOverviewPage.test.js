import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { ElPagination } from 'element-plus'
import Overview from '@/modules/patches/windows-patch/views/WindowsPatchOverviewPage.vue'

const api = vi.hoisted(() => ({ getHosts: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: { getAllTags: vi.fn().mockResolvedValue({ records: [] }) }
}))
vi.mock('@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue', () => ({
  default: {
    name: 'WinPatchScanDialog',
    props: ['modelValue', 'preselectedHosts'],
    template: '<div />'
  }
}))
vi.mock('@/modules/patches/windows-patch/components/overview/WinPatchReportDialog.vue', () => ({
  default: {
    name: 'WinPatchReportDialog',
    props: ['modelValue', 'preselectedHosts'],
    template: '<div />'
  }
}))
vi.mock(
  '@/modules/patches/windows-patch/components/overview/WinPatchBatchInstallDrawer.vue',
  () => ({
    default: {
      name: 'WinPatchBatchInstallDrawer',
      props: ['modelValue', 'hostSummaries'],
      template: '<div />'
    }
  })
)
vi.mock(
  '@/modules/patches/windows-patch/components/overview/WinPatchHostPatchesDrawer.vue',
  () => ({
    default: {
      name: 'WinPatchHostPatchesDrawer',
      props: ['modelValue', 'hostSummary', 'initialFilters'],
      template: '<div />'
    }
  })
)
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue', () => ({
  default: {
    name: 'WinPatchTaskDetailDrawer',
    props: ['modelValue', 'taskId'],
    template: '<div />'
  }
}))

const host = Object.freeze({ hostId: 'real-host/a', hostKey: '192.0.2.10', criticalCount: 2 })
const response = (rows = [], total = rows.length) => ({
  data: { content: rows, totalElements: total }
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Slot = { template: '<div><slot /></div>' }
const Input = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'clear'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const Select = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<div />'
}
const Table = {
  props: ['data', 'emptyText'],
  emits: ['selection-change'],
  template: '<div>{{ data.length ? data.map(row => row.hostId).join(",") : emptyText }}</div>'
}
const Pagination = {
  props: ['currentPage', 'pageSize', 'total'],
  emits: ['update:current-page', 'update:page-size'],
  template: '<div />'
}
const Harness = defineComponent({
  setup() {
    return () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, {
            default: () => h(Component, { key: route.path })
          })
      })
  }
})
let wrapper, router
const page = () => wrapper.findComponent(Overview)
const state = () => page().vm.$.setupState
const button = text =>
  page()
    .findAll('button')
    .find(item => item.text() === text)
const child = name => page().findComponent({ name })
async function open(realPagination = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/overview', name: 'patches-windowsVulnerability', component: Overview },
      { path: '/other', component: { template: '<div>other</div>' } }
    ]
  })
  await router.push('/overview')
  await router.isReady()
  wrapper = mount(Harness, {
    global: {
      plugins: [router],
      stubs: {
        'router-view': false,
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': Slot,
        'el-input': Input,
        'el-select': Select,
        'el-option': true,
        'el-button': {
          props: ['disabled'],
          template: '<button type="button" :disabled="disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
        'el-icon': true,
        'el-table': Table,
        'el-table-column': true,
        'el-link': true,
        'el-tag': true,
        'el-pagination': realPagination ? ElPagination : Pagination
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function changeFilter(index, value) {
  const select = page().findAllComponents(Select)[index]
  select.vm.$emit('update:modelValue', value)
  select.vm.$emit('change', value)
  await flushPromises()
}
async function selectHosts(rows = state().hostList) {
  page().findComponent(Table).vm.$emit('selection-change', rows)
  await flushPromises()
}
beforeEach(() => {
  api.getHosts.mockReset().mockResolvedValue(response([host], 100))
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('Windows 主机概览列表交互', () => {
  it('关键词仅搜索/Enter/清空应用；即时筛选、分页和刷新沿已应用关键词，重置只查一次', async () => {
    await open()
    const input = page().findComponent(Input)
    await input.setValue('host-a')
    await button('搜索').trigger('click')
    await flushPromises()
    await input.setValue('unsubmitted')
    await changeFilter(0, 'Windows Server')
    await changeFilter(1, '20348')
    await changeFilter(2, ['生产'])
    const pager = page().findComponent(Pagination)
    pager.vm.$emit('update:current-page', 3)
    await flushPromises()
    await page().find('[aria-label="刷新主机列表"]').trigger('click')
    await flushPromises()
    expect(api.getHosts).toHaveBeenLastCalledWith({
      page: 2,
      size: 20,
      keyword: 'host-a',
      os: 'Windows Server',
      osVersion: '20348',
      tags: ['生产']
    })
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(api.getHosts.mock.calls.at(-1)[0]).toMatchObject({ page: 0, keyword: 'unsubmitted' })
    await input.setValue('')
    input.vm.$emit('clear')
    await flushPromises()
    expect(api.getHosts.mock.calls.at(-1)[0].keyword).toBe('')
    page().findComponent(Pagination).vm.$emit('update:page-size', 50)
    await flushPromises()
    const calls = api.getHosts.mock.calls.length
    await button('重置').trigger('click')
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(calls + 1)
    expect(api.getHosts).toHaveBeenLastCalledWith({
      page: 0,
      size: 20,
      keyword: '',
      os: '',
      osVersion: '',
      tags: []
    })
    const event = new window.Event('submit', { cancelable: true })
    page().find('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(api.getHosts).toHaveBeenCalledTimes(calls + 1)
  })

  it('连续搜索旧成功不能覆盖新结果/总数/选择，旧失败不能结束新加载', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getHosts.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    state().filters.hostKeyword = 'old'
    state().handleSearch()
    state().filters.hostKeyword = 'latest'
    state().handleSearch()
    latest.resolve(response([{ hostId: 'latest' }], 55))
    await flushPromises()
    await selectHosts()
    old.resolve(response([{ hostId: 'old' }], 999))
    await flushPromises()
    expect(state().hostList.map(row => row.hostId)).toEqual(['latest'])
    expect(state().pagination.total).toBe(55)
    expect(state().selectedHostRows.map(row => row.hostId)).toEqual(['latest'])
    const oldFailure = deferred(),
      pending = deferred()
    api.getHosts.mockReturnValueOnce(oldFailure.promise).mockReturnValueOnce(pending.promise)
    state().handleSearch()
    state().handleSearch()
    oldFailure.reject(new Error('old failure'))
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(state().loadError).toBe('')
    pending.resolve(response())
    await flushPromises()
    expect(state().loading).toBe(false)
  })

  it('开始查询即清除旧选择/结果，失败可按原查询重试，不把失败显示为零命中', async () => {
    await open()
    const previous = state().hostList[0]
    await selectHosts()
    const pending = deferred()
    api.getHosts.mockReturnValueOnce(pending.promise)
    state().filters.hostKeyword = 'applied'
    await button('搜索').trigger('click')
    expect(state().selectedHostRows).toEqual([])
    expect(state().hostList).toEqual([])
    expect(button('安装补丁').element.disabled).toBe(true)
    await selectHosts([previous])
    state().openBatchInstallDrawer([previous])
    state().openHostDrawer(previous)
    expect(state().selectedHostRows).toEqual([])
    expect(state().batchInstallDrawerVisible).toBe(false)
    expect(state().hostDrawerVisible).toBe(false)
    pending.reject(new Error('read failed'))
    await flushPromises()
    expect(page().text()).toContain('加载主机列表失败，请重试')
    expect(page().findComponent(Pagination).exists()).toBe(false)
    state().filters.hostKeyword = 'draft'
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getHosts.mock.calls.at(-1)[0].keyword).toBe('applied')
    expect(state().loadError).toBe('')
    api.getHosts.mockResolvedValueOnce(response())
    await page().find('[aria-label="刷新主机列表"]').trigger('click')
    await flushPromises()
    expect(page().text()).toContain('暂无符合条件的主机')
    expect(page().findComponent(Pagination).props('total')).toBe(0)
  })

  it('失效页仅补查一次有效页，补查仍失效则报错且不循环', async () => {
    await open()
    api.getHosts.mockResolvedValueOnce(response([], 21)).mockResolvedValueOnce(response([host], 21))
    page().findComponent(Pagination).vm.$emit('update:current-page', 5)
    await flushPromises()
    expect(api.getHosts.mock.calls.slice(-2).map(([query]) => query.page)).toEqual([4, 1])
    expect(state().pagination.page).toBe(2)
    expect(state().hostList).toHaveLength(1)
    const calls = api.getHosts.mock.calls.length
    api.getHosts.mockResolvedValueOnce(response([], 21)).mockResolvedValueOnce(response([], 0))
    page().findComponent(Pagination).vm.$emit('update:current-page', 5)
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(calls + 2)
    expect(state().loadError).toContain('加载主机列表失败')
    expect(state().hostList).toEqual([])
  })

  it('补查途中被新查询替代，补查响应不覆盖新查询', async () => {
    await open()
    const correction = deferred()
    api.getHosts.mockResolvedValueOnce(response([], 21)).mockReturnValueOnce(correction.promise)
    state().handlePageChange(5)
    await flushPromises()
    state().filters.hostKeyword = 'new'
    await button('搜索').trigger('click')
    await flushPromises()
    correction.resolve(response([{ hostId: 'obsolete' }], 21))
    await flushPromises()
    expect(state().hostList.map(row => row.hostId)).toEqual([host.hostId])
    expect(state().pagination.page).toBe(1)
    expect(state().pagination.total).toBe(100)
  })

  it('真实分页组件换页/改大小各查一次，改大小回首页，刷新保持当前页', async () => {
    await open(true)
    for (let index = 0; index < 3; index += 1) {
      await page().find('.btn-next').trigger('click')
      await flushPromises()
    }
    expect(api.getHosts).toHaveBeenCalledTimes(4)
    expect(state().pagination.page).toBe(4)
    // 触发真实 Pagination 内部大小选择器，覆盖其 update/size-change/页码联动。
    page().findComponent(ElPagination).findComponent(Select).vm.$emit('change', 50)
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(5)
    expect(api.getHosts.mock.calls.at(-1)[0]).toMatchObject({ page: 0, size: 50 })
    await page().find('.btn-next').trigger('click')
    await flushPromises()
    await page().find('[aria-label="刷新主机列表"]').trigger('click')
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(7)
    expect(api.getHosts.mock.calls.at(-1)[0]).toMatchObject({ page: 1, size: 50 })
  })

  it('有效选择沿真实 ID 传给扫描/批量安装/报告；旧行引用不能打开新操作', async () => {
    await open()
    const current = state().hostList[0]
    await selectHosts()
    await button('扫描选中主机').trigger('click')
    await button('安装补丁').trigger('click')
    await button('导出报告').trigger('click')
    expect(child('WinPatchScanDialog').props('preselectedHosts')[0].hostId).toBe(host.hostId)
    expect(child('WinPatchBatchInstallDrawer').props('hostSummaries')[0].hostId).toBe(host.hostId)
    expect(child('WinPatchReportDialog').props('preselectedHosts')[0].hostId).toBe(host.hostId)
    state().openHostDrawerWithSeverity(current, 'Critical')
    await flushPromises()
    expect(child('WinPatchHostPatchesDrawer').props('initialFilters')).toEqual({
      severity: 'Critical',
      patchStatus: 'no_repair'
    })
    state().hostDrawerVisible = false
    await page().find('[aria-label="刷新主机列表"]').trigger('click')
    await flushPromises()
    state().openHostDrawer(current)
    expect(state().hostDrawerVisible).toBe(false)
    await selectHosts([current])
    expect(state().selectedHostRows).toEqual([])
    expect(host.hostId).toBe('real-host/a')
  })

  it('缓存失活隔离在途请求，返回后手动恢复；卸载后不接纳结果', async () => {
    await open()
    const pending = deferred()
    api.getHosts.mockReturnValueOnce(pending.promise)
    state().loadPageData()
    const overviewState = state()
    await router.push('/other')
    await flushPromises()
    overviewState.loadPageData()
    expect(api.getHosts).toHaveBeenCalledTimes(2)
    await router.push('/overview')
    await flushPromises()
    expect(state()).toBe(overviewState)
    pending.resolve(response([{ hostId: 'obsolete' }]))
    await flushPromises()
    expect(state().hostList).toEqual([])
    expect(page().text()).toContain('主机列表加载已中断，请重试')
    expect(api.getHosts).toHaveBeenCalledTimes(2)
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().hostList[0].hostId).toBe(host.hostId)
    const unmounted = deferred()
    api.getHosts.mockReturnValueOnce(unmounted.promise)
    state().loadPageData()
    wrapper.unmount()
    wrapper = null
    unmounted.resolve(response([{ hostId: 'unmounted' }]))
    await flushPromises()
    expect(overviewState.hostList).toEqual([])
    expect(overviewState.loading).toBe(false)
  })

  it('扫描/任务完成回调刷新沿当前应用条件，向导创建回调保持原不刷新/不另开详情约定', async () => {
    await open()
    state().filters.hostKeyword = 'applied'
    state().handleSearch()
    await flushPromises()
    state().filters.hostKeyword = 'draft'
    const calls = api.getHosts.mock.calls.length
    child('WinPatchBatchInstallDrawer').vm.$emit('task-submitted', {
      id: 'real-task',
      openDetail: false,
      refreshOverview: false
    })
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(calls)
    expect(child('WinPatchTaskDetailDrawer').props('modelValue')).toBe(false)
    child('WinPatchScanDialog').vm.$emit('submitted', { runId: 'real-run', refreshOverview: true })
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(calls + 1)
    expect(api.getHosts.mock.calls.at(-1)[0].keyword).toBe('applied')
    child('WinPatchTaskDetailDrawer').vm.$emit('close', { succeeded: true })
    await flushPromises()
    expect(api.getHosts).toHaveBeenCalledTimes(calls + 2)
    expect(api.getHosts.mock.calls.at(-1)[0].keyword).toBe('applied')
  })
})
