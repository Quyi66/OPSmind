import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElSelect, ElOption } from 'element-plus/es/components/select/index.mjs'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import ResultListPage from '@/modules/inspection/views/ResultListPage.vue'
import ResultDetailPage from '@/modules/inspection/views/ResultDetailPage.vue'
import { pickResultListRouteQuery } from '@/modules/inspection/utils/result-list-route-state'
import { summarizeResultConfiguration } from '@/modules/inspection/utils/result-record-presentation'

const api = vi.hoisted(() => ({
  templates: vi.fn(),
  results: vi.fn(),
  job: vi.fn(),
  params: vi.fn(),
  statistics: vi.fn(),
  machines: vi.fn(),
  polling: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getTemplates: api.templates },
  jobApi: { getJob: api.job },
  dtsApi: { getStatistics: api.statistics, getCheckItemMachine: api.machines },
  whitelistApi: {}
}))
vi.mock('axios', () => ({ default: { post: api.results } }))
vi.mock('@/core/api', () => ({ apiService: { get: api.params } }))
vi.mock('@/core/auth', () => ({
  authService: { getAuthHeaders: () => ({ 'X-Test-Auth': 'original' }) }
}))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling: api.polling }))
vi.mock('element-plus', () => ({
  ElMessage: { error: api.error, success: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: {
    name: 'ExecuteResultDialog',
    props: ['visible', 'runId', 'jobTitle'],
    template: '<div />'
  }
}))
vi.mock('@/modules/inspection/components/result-detail', () =>
  Object.fromEntries(
    [
      'AssetModelConfigDialog',
      'StatisticsCards',
      'HostDetailDialog',
      'KpiDetailDialog',
      'CheckItemDetailDialog',
      'CheckItemHostsDialog',
      'WhitelistDialog',
      'ItemWhitelistDialog'
    ].map(name => [name, { template: '<div />' }])
  )
)

const Table = defineComponent({
  name: 'ElTable',
  props: { data: { type: Array, default: () => [] } },
  setup(props) {
    provide(
      'resultRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><div v-if="!data.length"><slot name="empty" /></div></div>'
})
const Column = defineComponent({
  name: 'ElTableColumn',
  props: ['prop', 'label'],
  inheritAttrs: false,
  setup(props, { slots }) {
    const rows = inject('resultRows')
    return () =>
      rows.value.map(row =>
        h(
          'div',
          { 'data-row': row.id, 'data-column': props.label },
          slots.default?.({ row }) || row[props.prop]
        )
      )
  }
})
const Slot = { template: '<div><slot /></div>' }
const stubs = {
  'router-view': false,
  'el-form': { props: ['model', 'inline', 'size'], template: '<form><slot /></form>' },
  'el-form-item': { props: ['label'], template: '<label>{{ label }}<slot /></label>' },
  'el-button': {
    props: ['loading', 'disabled'],
    template: '<button :disabled="loading || disabled"><slot /></button>'
  },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'loading'],
    emits: ['update:modelValue', 'change'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElTable: Table,
  ElTableColumn: Column,
  ElPagination: {
    name: 'ElPagination',
    props: ['total', 'currentPage', 'pageSize'],
    template: '<div />'
  },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}<slot /></aside>' },
  ElIcon: Slot,
  ElBreadcrumb: Slot,
  ElBreadcrumbItem: Slot,
  ElTag: Slot,
  ElTabs: true,
  ElTabPane: true,
  ElCollapse: true,
  ElCollapseItem: true,
  ElDescriptions: true,
  ElDescriptionsItem: true,
  ElOptionGroup: true,
  'el-dialog': true,
  RunLogStatusTag: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}
const record = { id: 'jobA123', templateName: 'Alpha', jobStatus: 'OK', auditParams: '[]' }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, router, container
const page = () => wrapper.findComponent(ResultListPage)
const state = () => page().vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
const lastRead = () => api.results.mock.calls.at(-1)
async function open(
  location = '/cac/results',
  realSelect = false,
  { realTable = false, cached = false } = {}
) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cac/results', component: ResultListPage },
      { path: '/cac/results/:jobId', component: ResultDetailPage },
      { path: '/cac/structural-diagram/:jobId', component: { template: '<p>structure</p>' } }
    ]
  })
  await router.push(location)
  await router.isReady()
  container = document.createElement('div')
  document.body.appendChild(container)
  wrapper = mount(
    {
      setup: () => () =>
        cached
          ? h(RouterView, null, {
              default: ({ Component }) =>
                h(KeepAlive, { include: 'ResultListPage' }, () => Component)
            })
          : h(RouterView)
    },
    {
      attachTo: container,
      global: {
        plugins: [router],
        stubs: {
          ...stubs,
          ...(realSelect ? { ElSelect, ElOption } : {}),
          ...(realTable ? { ElTable, ElTableColumn, ElPagination } : {})
        },
        directives: { loading() {} }
      }
    }
  )
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  window.matchMedia.mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {}
  }))
  api.templates.mockResolvedValue({
    data: [
      { id: 'B', templateName: 'Beta' },
      { id: 'A', templateName: 'Alpha' },
      { id: 0, templateName: 'Zero' }
    ]
  })
  api.results.mockResolvedValue({ data: { data: [record], recordsFiltered: 51, recordsTotal: 51 } })
  api.params.mockResolvedValue({ value: 'no' })
  api.job.mockResolvedValue({
    templateId: 'A',
    templateName: 'Alpha',
    auditParams: '[]',
    taskId: 'realTask'
  })
  api.statistics.mockResolvedValue({ records: [] })
  api.machines.mockResolvedValue({ records: [], total: 0 })
})
afterEach(() => {
  wrapper?.unmount()
  container?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('执行记录列表交互（真实路由，API与轮询隔离）', () => {
  it('移除侧栏，筛选区下拉与关键词、独立操作栏保持系统结构，默认读取全部', async () => {
    await open()
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.find('.ops-filter-bar select').exists()).toBe(true)
    expect(wrapper.find('.ops-action-bar').exists()).toBe(true)
    expect(
      page()
        .findAll('option')
        .map(item => item.text())
    ).toEqual(['全部模板', 'Alpha', 'Beta', 'Zero'])
    expect(lastRead()[0]).toContain('/jobs/page/all')
    expect(lastRead()[1].get('start')).toBe('0')
    expect(lastRead()[2].headers).toMatchObject({
      'X-Test-Auth': 'original',
      'Content-Type': 'application/x-www-form-urlencoded'
    })
    expect(api.templates).toHaveBeenCalledTimes(1)
  })

  it('选择模板一次读取且回首，保留关键词、大小与原排序参数', async () => {
    await open('/cac/results?keyword=failed&page=3&size=20')
    const before = api.results.mock.calls.length
    await page().find('select').setValue('A')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(before + 1)
    expect(state().pagination.page).toBe(1)
    expect(state().pagination.size).toBe(20)
    expect(lastRead()[0]).toContain('/jobs/page/A')
    expect(lastRead()[1].get('search[value]')).toBe('failed')
    expect(lastRead()[1].get('length')).toBe('20')
    expect(lastRead()[1].get('order[0][column]')).toBe('2')
    expect(lastRead()[1].get('order[0][dir]')).toBe('desc')
  })

  it('选择全部或清除回全部，数字0模板不被当作all', async () => {
    await open()
    await page().find('select').setValue('0')
    await flushPromises()
    expect(lastRead()[0]).toContain('/jobs/page/0')
    await page().find('select').setValue('')
    await flushPromises()
    expect(lastRead()[0]).toContain('/jobs/page/all')
    await state().selectTemplate(undefined)
    await flushPromises()
    expect(state().selectedTemplateId).toBe('')
    expect(lastRead()[0]).toContain('/jobs/page/all')
  })

  it('模板页带入的ID先恢复，旧侧栏搜索query不隐藏选项，分页恢复不回首', async () => {
    await open('/cac/results?templateId=A&templateSearch=unmatched&keyword=keep&page=3&size=20')
    expect(page().find('select').element.value).toBe('A')
    expect(page().findAll('option')).toHaveLength(4)
    expect(state().pagination.page).toBe(3)
    expect(lastRead()[0]).toContain('/jobs/page/A')
    expect(lastRead()[1].get('start')).toBe('40')
    expect(lastRead()[1].get('search[value]')).toBe('keep')
  })

  it('模板读取中/失败/未返回该ID均保留原筛选，不悄悄扩大为全部，重试恢复名称', async () => {
    let reject
    api.templates.mockReturnValueOnce(new Promise((_, no) => (reject = no)))
    await open('/cac/results?templateId=A')
    expect(page().find('select').element.value).toBe('A')
    expect(page().find('option[value="A"]').text()).toContain('ID：A')
    reject(new Error('offline'))
    await flushPromises()
    expect(page().find('[role="status"]').text()).toContain('模板列表读取失败')
    const reads = api.results.mock.calls.length
    await button('重试').trigger('click')
    await flushPromises()
    expect(page().find('option[value="A"]').text()).toBe('Alpha')
    expect(page().find('[role="status"]').exists()).toBe(false)
    expect(api.results).toHaveBeenCalledTimes(reads)
    await router.push('/cac/results?templateId=removed')
    await flushPromises()
    expect(page().find('option[value="removed"]').text()).toContain('ID：removed')
    expect(lastRead()[0]).toContain('/jobs/page/removed')
  })

  it('重置清除模板/关键词/旧URL条件，保留无关query/hash且只查询一次，返回不恢复旧条件', async () => {
    await open(
      '/cac/results?templateId=A&templateSearch=old&keyword=keep&page=2&size=20&keep=original#position'
    )
    const reads = api.results.mock.calls.length
    await button('重置').trigger('click')
    await flushPromises()
    expect(state().selectedTemplateId).toBe('')
    expect(page().find('select').element.value).toBe('')
    expect(state().filters.keyword).toBe('')
    expect(state().templateSearchText).toBe('')
    expect(state().pagination).toMatchObject({ page: 1, size: 10 })
    expect(router.currentRoute.value.query).toEqual({ keep: 'original' })
    expect(router.currentRoute.value.hash).toBe('#position')
    expect(api.results).toHaveBeenCalledTimes(reads + 1)
    expect(lastRead()[0]).toContain('/jobs/page/all')
    expect(lastRead()[1].get('search[value]')).toBe('')
    expect(lastRead()[1].get('length')).toBe('10')
    expect(lastRead()[1].get('start')).toBe('0')
    await wrapper.find('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().selectedTemplateId).toBe('')
    await button('检查结果').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    await wrapper.find('.page-navbar a').trigger('click')
    await flushPromises()
    expect(state().selectedTemplateId).toBe('')
    expect(state().filters.keyword).toBe('')
  })

  it('无URL条件时也清除后来选择的模板与关键词，只发一次全部查询', async () => {
    await open()
    await page().find('select').setValue('B')
    await flushPromises()
    state().filters.keyword = 'draft'
    state().pagination.page = 3
    state().pagination.size = 20
    const reads = api.results.mock.calls.length
    await button('重置').trigger('click')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(reads + 1)
    expect(lastRead()[0]).toContain('/jobs/page/all')
    expect(lastRead()[1].get('search[value]')).toBe('')
    expect(lastRead()[1].get('start')).toBe('0')
    expect(lastRead()[1].get('length')).toBe('10')
  })

  it('重置前旧响应/旧finally不覆盖新查询或提前结束loading', async () => {
    const old = deferred(),
      current = deferred()
    api.results.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await open('/cac/results?templateId=A')
    await button('重置').trigger('click')
    await flushPromises()
    expect(state().loading).toBe(true)
    old.resolve({ data: { data: [{ ...record, id: 'old' }], recordsFiltered: 99 } })
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(state().tableData).toEqual([])
    current.resolve({ data: { data: [{ ...record, id: 'current' }], recordsFiltered: 1 } })
    await flushPromises()
    expect(state().tableData[0].id).toBe('current')
    expect(state().pagination.total).toBe(1)
  })

  it('重置前的失败迟到不提示旧错误或清空新结果', async () => {
    const old = deferred()
    api.results.mockReturnValueOnce(old.promise)
    await open('/cac/results?templateId=A')
    await button('重置').trigger('click')
    await flushPromises()
    old.reject(new Error('old request failed'))
    await flushPromises()
    expect(state().tableData[0].id).toBe(record.id)
    expect(api.error).not.toHaveBeenCalled()
  })

  it('卸载使在途记录读取失效，不写旧状态', async () => {
    const pending = deferred()
    api.results.mockReturnValueOnce(pending.promise)
    await open()
    const vm = state()
    wrapper.unmount()
    wrapper = undefined
    pending.resolve({ data: { data: [record], recordsFiltered: 51 } })
    await flushPromises()
    expect(vm.tableData).toEqual([])
    expect(api.error).not.toHaveBeenCalled()
  })

  it('真实Element重置同步清掉所选模板和下拉内临时搜索', async () => {
    await open('/cac/results?templateId=A&keyword=keep&page=2&size=20', true)
    const select = page().findComponent(ElSelect)
    await select.find('.el-select__wrapper').trigger('click')
    await flushPromises()
    await select.find('input').setValue('Beta')
    await flushPromises()
    const reads = api.results.mock.calls.length
    await button('重置').trigger('click')
    await flushPromises()
    const resetSelect = page().findComponent(ElSelect)
    expect(resetSelect.props('modelValue')).toBe('')
    expect(resetSelect.find('input').element.value).toBe('')
    expect(api.results).toHaveBeenCalledTimes(reads + 1)
    expect(lastRead()[0]).toContain('/jobs/page/all')
  })

  it('从结果详情返回恢复模板名称、关键词、分页及旧query兼容', async () => {
    await open('/cac/results?templateId=A&keyword=keep&templateSearch=old&page=2&size=20')
    await button('检查结果').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/results/jobA123')
    expect(router.currentRoute.value.query).toEqual({
      templateId: 'A',
      keyword: 'keep',
      templateSearch: 'old',
      page: '2',
      size: '20'
    })
    await wrapper.find('.page-navbar a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/results')
    expect(page().find('select').element.value).toBe('A')
    expect(state().pagination).toMatchObject({ page: 2, size: 20 })
    expect(lastRead()[1].get('start')).toBe('20')
  })

  it('保留原状态日志taskId接线与原活跃轮询调用，不新增定时器或任务', async () => {
    await open()
    await button('完成').trigger('click')
    await flushPromises()
    expect(api.job).toHaveBeenCalledExactlyOnceWith('jobA123')
    expect(page().findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      visible: true,
      runId: 'realTask'
    })
    expect(api.polling).toHaveBeenCalledTimes(1)
    expect(api.polling.mock.calls[0][0].getStatus(record)).toBe('OK')
  })

  it('真实Element下拉输入仅本地找模板，点选和清除各发一次原查询', async () => {
    await open('/cac/results?templateId=A', true)
    const select = page().findComponent(ElSelect)
    const reads = api.results.mock.calls.length
    await select.find('.el-select__wrapper').trigger('click')
    await flushPromises()
    await select.find('input').setValue('Beta')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(reads)
    expect(api.templates).toHaveBeenCalledTimes(1)
    const beta = [...document.querySelectorAll('.el-select-dropdown__item')].find(
      item => item.textContent.trim() === 'Beta'
    )
    expect(beta).toBeDefined()
    beta.click()
    await flushPromises()
    expect(state().selectedTemplateId).toBe('B')
    expect(lastRead()[0]).toContain('/jobs/page/B')
    expect(api.results).toHaveBeenCalledTimes(reads + 1)
    await select.find('.el-select__wrapper').trigger('mouseenter')
    await flushPromises()
    await select.find('.el-select__clear').trigger('click')
    await flushPromises()
    expect(state().selectedTemplateId).toBe('')
    expect(lastRead()[0]).toContain('/jobs/page/all')
    expect(api.results).toHaveBeenCalledTimes(reads + 2)
  })

  it('首次失败有页内重试，成功空结果及合法0命中不回退为全量总数', async () => {
    api.results.mockRejectedValueOnce(new Error('offline'))
    await open('/cac/results?keyword=none')
    expect(wrapper.find('[role="alert"]').text()).toContain('读取失败')
    expect(wrapper.text()).not.toContain('暂无执行记录')
    expect(page().findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    api.results.mockResolvedValueOnce({ data: { data: [], recordsFiltered: 0, recordsTotal: 51 } })
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('没有匹配的执行记录')
    expect(state().pagination.total).toBe(0)
    expect(page().findComponent({ name: 'ElPagination' }).props('total')).toBe(0)
  })

  it('同查询刷新失败保留上次行和总数，重试不提交后来输入的草稿，成功清提示', async () => {
    await open('/cac/results?templateId=A&keyword=applied&page=2&size=20')
    api.results.mockRejectedValueOnce(new Error('offline'))
    await wrapper.find('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().tableData[0].id).toBe(record.id)
    expect(state().pagination.total).toBe(51)
    expect(wrapper.find('[role="alert"]').text()).toContain('上次成功结果，可能已过期')
    expect(api.polling.mock.calls[0][0].enabled.value).toBe(false)
    await page().find('input').setValue('draft')
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(lastRead()[0]).toContain('/jobs/page/A')
    expect(lastRead()[1].get('search[value]')).toBe('applied')
    expect(lastRead()[1].get('start')).toBe('20')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(state().filters.keyword).toBe('draft')
    expect(api.polling.mock.calls[0][0].enabled.value).toBe(true)
  })

  it('成功空结果也可作为同查询过期数据保留，不把换查询旧行当新结果', async () => {
    api.results.mockResolvedValueOnce({ data: { data: [], recordsFiltered: 0 } })
    await open()
    api.results.mockRejectedValueOnce(new Error('offline'))
    await state().loadResults()
    expect(state().hasResult).toBe(true)
    expect(state().pagination.total).toBe(0)
    expect(state().readMessage).toContain('上次成功结果')
    const pending = deferred()
    api.results.mockReturnValueOnce(pending.promise)
    await page().find('select').setValue('B')
    expect(state().hasResult).toBe(false)
    expect(state().readError).toBe('')
    pending.reject(new Error('new query failed'))
    await flushPromises()
    expect(state().readMessage).not.toContain('上次成功结果')
    expect(state().tableData).toEqual([])
  })

  it.each([401, 403])('认证或权限拒绝%s清除旧数据，不暴露普通重试或自动循环', async status => {
    await open()
    api.results.mockRejectedValueOnce({ response: { status } })
    await state().loadResults()
    await flushPromises()
    expect(state().tableData).toEqual([])
    expect(state().hasResult).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toContain('重新登录或联系管理员')
    expect(button('重试读取')).toBeUndefined()
    expect(wrapper.find('button[title="刷新"]').element.disabled).toBe(true)
    expect(api.polling.mock.calls[0][0].enabled.value).toBe(false)
    const count = api.results.mock.calls.length
    await state().loadResults()
    expect(api.results).toHaveBeenCalledTimes(count)
  })

  it('非法记录结构明确失败，未知总数不显示虚假分页0', async () => {
    api.results.mockResolvedValueOnce({ data: { data: null, recordsFiltered: 0 } })
    await open()
    expect(state().readError).toBe('read')
    api.results.mockResolvedValueOnce({ data: { data: [record] } })
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().pagination.total).toBeNull()
    expect(wrapper.text()).toContain('总数暂不可核实')
    expect(page().findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    expect(button('检查结果').element.disabled).toBe(false)
  })

  it('草稿不随刷新/轮询/分页/排序/模板切换隐式应用，搜索才应用并回首页', async () => {
    await open('/cac/results?keyword=applied')
    await page().find('input').setValue('draft')
    expect(wrapper.text()).toContain('关键词尚未应用')
    await state().loadResults()
    await api.polling.mock.calls[0][0].refresh()
    await state().handlePageChange(2)
    await state().handleSortChange({ prop: 'endedAt', order: 'ascending' })
    await page().find('select').setValue('B')
    await flushPromises()
    expect(api.results.mock.calls.every(call => call[1].get('search[value]') === 'applied')).toBe(
      true
    )
    expect(state().getCurrentRouteStateQuery().keyword).toBe('applied')
    await page().find('input').trigger('keyup.enter')
    await flushPromises()
    expect(lastRead()[1].get('search[value]')).toBe('draft')
    expect(lastRead()[1].get('start')).toBe('0')
    expect(wrapper.text()).not.toContain('关键词尚未应用')
  })

  it('真实Element表头排序与分页，经真实详情往返恢复且不额外重查', async () => {
    await open('/cac/results?templateId=A&keyword=keep&size=20', false, { realTable: true })
    expect(api.results).toHaveBeenCalledTimes(1)
    const table = page().findComponent(ElTable)
    const endedHeader = table
      .findAll('.el-table__header th')
      .find(item => item.text().includes('结束时间'))
    await endedHeader.find('.sort-caret.ascending').trigger('click')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(2)
    await page().findComponent(ElPagination).find('button.btn-next').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    const count = api.results.mock.calls.length
    await button('检查结果').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      sortProp: 'endedAt',
      sortOrder: 'ascending',
      page: '2',
      size: '20'
    })
    await wrapper.find('.page-navbar a').trigger('click')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(count + 1)
    expect(lastRead()[1].get('order[0][column]')).toBe('3')
    expect(lastRead()[1].get('order[0][dir]')).toBe('asc')
    expect(lastRead()[1].get('start')).toBe('20')
    expect(page().findComponent(ElTable).find('th.ascending').text()).toContain('结束时间')
  })

  it('重置清筛选及显式默认URL键，保留当前表头排序且仅查一次', async () => {
    await open(
      '/cac/results?templateId=&keyword=&page=1&size=10&sortProp=createdAt&sortOrder=descending&keep=yes'
    )
    await state().handleSortChange({ prop: 'endedAt', order: 'ascending' })
    await flushPromises()
    await page().find('select').setValue('B')
    await flushPromises()
    const count = api.results.mock.calls.length
    await button('重置').trigger('click')
    await flushPromises()
    expect(api.results).toHaveBeenCalledTimes(count + 1)
    expect(router.currentRoute.value.query).toEqual({
      keep: 'yes',
      sortProp: 'endedAt',
      sortOrder: 'ascending'
    })
    expect(state().sortState).toMatchObject({ prop: 'endedAt', order: 'ascending' })
    expect(state().selectedTemplateId).toBe('')
  })

  it('真实Element缓存表格随路由恢复表头方向和页码，不将同步排序再当一次查询', async () => {
    await open('/cac/results?keyword=keep&sortProp=endedAt&sortOrder=ascending', false, {
      realTable: true,
      cached: true
    })
    const original = state()
    expect(page().findComponent(ElTable).find('th.ascending').text()).toContain('结束时间')
    const count = api.results.mock.calls.length
    await router.push(
      '/cac/results?keyword=keep&sortProp=createdAt&sortOrder=ascending&page=2&size=20'
    )
    await flushPromises()
    expect(state()).toBe(original)
    expect(api.results).toHaveBeenCalledTimes(count + 1)
    expect(page().findComponent(ElTable).find('th.ascending').text()).toContain('开始时间')
    expect(page().findComponent(ElPagination).props('currentPage')).toBe(2)
    expect(lastRead()[1].get('start')).toBe('20')
  })

  it('KeepAlive离开隔离在途读取/日志，返回恢复应用条件和排序，手动重试中断读取', async () => {
    await open('/cac/results?keyword=keep', false, { cached: true })
    const vm = state()
    await state().handleSortChange({ prop: 'endedAt', order: 'ascending' })
    await flushPromises()
    const staleRead = deferred(),
      staleLog = deferred()
    api.job.mockReturnValueOnce(staleLog.promise)
    await button('完成').trigger('click')
    api.results.mockReturnValueOnce(staleRead.promise)
    wrapper.find('button[title="刷新"]').trigger('click')
    await flushPromises()
    await button('检查结果').trigger('click')
    await flushPromises()
    expect(vm.pageActive).toBe(false)
    expect(api.polling.mock.calls[0][0].enabled.value).toBe(false)
    staleRead.resolve({ data: { data: [{ ...record, id: 'stale' }], recordsFiltered: 999 } })
    staleLog.resolve({ taskId: 'staleTask' })
    await flushPromises()
    expect(vm.tableData[0].id).toBe(record.id)
    expect(vm.executeResultVisible).toBe(false)
    const count = api.results.mock.calls.length
    await wrapper.find('.page-navbar a').trigger('click')
    await flushPromises()
    expect(state()).toBe(vm)
    expect(state().sortState.prop).toBe('endedAt')
    expect(api.results).toHaveBeenCalledTimes(count + 1)
    expect(lastRead()[1].get('search[value]')).toBe('keep')
    // URL changes from the original unsorted route on return, so that restoration reads once.
    const pending = deferred()
    api.results.mockReturnValueOnce(pending.promise)
    wrapper.find('button[title="刷新"]').trigger('click')
    await flushPromises()
    await button('检查结果').trigger('click')
    await flushPromises()
    await wrapper.find('.page-navbar a').trigger('click')
    await flushPromises()
    expect(state().readError).toBe('interrupted')
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().readError).toBe('')
    expect(lastRead()[1].get('order[0][column]')).toBe('3')
    pending.reject(new Error('old interrupted error'))
    await flushPromises()
    expect(state().readError).toBe('')
  })

  it('配置列展示所有组条目之和与组明细，不修改源数据或冒充覆盖主机数', async () => {
    const groups = [
      { hosts: ['h1', 'h1'], scripts: [{ path: 'a', params: '--keep' }], unknown: { keep: true } },
      { hosts: ['h1'], scripts: ['b', 'c'] }
    ]
    const original = JSON.stringify(groups)
    api.results.mockResolvedValueOnce({
      data: { data: [{ ...record, auditParams: original }], recordsFiltered: 1 }
    })
    await open()
    const host = wrapper.find('[data-column="配置主机数"] span')
    const scripts = wrapper.find('[data-column="脚本数"] span')
    expect(host.text()).toBe('3')
    expect(scripts.text()).toBe('3')
    expect(host.attributes('title')).toContain('配置组 2：主机 1，脚本 2')
    expect(state().tableData[0].auditParams).toBe(original)
    expect(wrapper.text()).toContain('不代表报告覆盖或检查结果')
  })

  it.each(['WAITING', 'RUNNING'])(
    '%s保留日志入口并禁用报告，完整操作文案解释原因',
    async jobStatus => {
      api.results.mockResolvedValueOnce({
        data: { data: [{ ...record, jobStatus }], recordsFiltered: 1 }
      })
      await open()
      expect(button('架构图').element.disabled).toBe(true)
      expect(button('检查结果').element.disabled).toBe(true)
      expect(wrapper.find('.result-row-actions').attributes('title')).toBe(
        '任务结束后可查看架构图和检查结果'
      )
      await state().viewResult(state().tableData[0])
      expect(router.currentRoute.value.path).toBe('/cac/results')
      await button(jobStatus === 'WAITING' ? '等待中' : '运行中').trigger('click')
      await flushPromises()
      expect(api.job).toHaveBeenCalledExactlyOnceWith(record.id)
      expect(state().currentRunId).toBe('realTask')
    }
  )

  it('架构图沿真实jobId与应用查询导航，原行离开列表后不能再次导航', async () => {
    await open('/cac/results?templateId=A&keyword=applied&sortProp=endedAt&sortOrder=ascending')
    const originalRow = state().tableData[0]
    await button('架构图').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/cac/structural-diagram/${record.id}`)
    expect(router.currentRoute.value.query).toMatchObject({
      templateId: 'A',
      keyword: 'applied',
      sortProp: 'endedAt',
      sortOrder: 'ascending'
    })
    await router.back()
    await flushPromises()
    await state().viewResult(originalRow)
    expect(router.currentRoute.value.path).toBe('/cac/results')
  })
})

describe('记录页返回排序白名单与配置数量边界', () => {
  it('仅带入原支持列/方向，默认省略，外部字段及非法配对回默认', () => {
    expect(pickResultListRouteQuery({})).toEqual({})
    expect(
      pickResultListRouteQuery({
        sortProp: 'templateName',
        sortOrder: 'ascending',
        redirect: 'external'
      })
    ).toEqual({ sortProp: 'templateName', sortOrder: 'ascending' })
    expect(pickResultListRouteQuery({ sortProp: 'auditParams', sortOrder: 'ascending' })).toEqual(
      {}
    )
    expect(pickResultListRouteQuery({ sortProp: 'endedAt', sortOrder: 'sql' })).toEqual({})
  })
  it.each([
    [null, null, null],
    ['broken', null, null],
    ['{}', null, null],
    ['[]', 0, 0],
    [
      [
        { hosts: ['h'], scripts: 'invalid' },
        { hosts: ['h'], scripts: [] }
      ],
      2,
      null
    ],
    [[{ hosts: {}, scripts: ['a'] }], null, 1]
  ])('配置数据%j不能伪造为已知覆盖数量', (input, hostCount, scriptCount) => {
    expect(summarizeResultConfiguration(input)).toMatchObject({ hostCount, scriptCount })
  })
})
