import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, KeepAlive, provide, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import InspectionOverviewPage from '@/modules/inspection/views/InspectionOverviewPage.vue'
import ResultDetailPage from '@/modules/inspection/views/ResultDetailPage.vue'
import { getReportReturnTarget } from '@/modules/inspection/utils/report-navigation'

const mocks = vi.hoisted(() => ({
  templates: vi.fn(),
  statistics: vi.fn(),
  recent: vi.fn(),
  job: vi.fn(),
  machines: vi.fn(),
  write: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getSquareTemplates: mocks.templates, deleteTemplate: mocks.write },
  dtsApi: { getStatistics: mocks.statistics, getCheckItemMachine: mocks.machines },
  jobApi: { getJob: mocks.job },
  whitelistApi: { saveWhitelist: mocks.write, deleteWhitelist: mocks.write },
  paramApi: {}
}))
vi.mock('axios', () => ({ default: { post: mocks.recent } }))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: () => ({}) } }))
vi.mock('element-plus', () => ({
  ElMessage: { error: mocks.error, warning: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: mocks.write }
}))
vi.mock('@/modules/inspection/components/template/TemplateEditDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/inspection/components/template/RunTemplateDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/inspection/components/result-detail', () => ({
  ...Object.fromEntries(
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
}))

// Simulate the table scroll API. jsdom does not measure actual table geometry.
const Table = defineComponent({
  name: 'ElTable',
  props: { data: { type: Array, default: () => [] } },
  setup(props, { expose }) {
    const wrap = reactive({ scrollTop: 0, scrollLeft: 0 })
    expose({
      scrollBarRef: { wrapRef: wrap },
      setScrollTop: value => (wrap.scrollTop = value),
      setScrollLeft: value => (wrap.scrollLeft = value)
    })
    provide(
      'reportRows',
      computed(() => props.data)
    )
  },
  render() {
    return h('div', { class: 'test-table' }, this.$slots.default?.())
  }
})
const Column = defineComponent({
  name: 'ElTableColumn',
  inheritAttrs: false,
  props: ['prop'],
  setup(props, { slots }) {
    const rows = inject('reportRows')
    return () => rows.value.map(row => h('div', slots.default?.({ row }) || row[props.prop]))
  }
})
const Slot = { template: '<div><slot /></div>' }
const global = {
  stubs: {
    'router-view': false,
    ElTable: Table,
    ElTableColumn: Column,
    'el-button': {
      props: ['disabled', 'loading'],
      template: '<button :disabled="disabled || loading"><slot /></button>'
    },
    'el-input': {
      props: ['modelValue', 'size'],
      emits: ['update:modelValue'],
      template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    },
    ElBreadcrumb: Slot,
    ElBreadcrumbItem: Slot,
    ElTag: Slot,
    ElAlert: true,
    ElEmpty: true,
    ElDropdown: Slot,
    ElDropdownMenu: true,
    ElDropdownItem: true,
    ElTabs: true,
    ElPagination: true,
    'el-dialog': true,
    ElCollapse: true,
    ElCollapseItem: true,
    ElDescriptions: true,
    ElDescriptionsItem: true,
    ElTabPane: true,
    ElSelect: true,
    ElOption: true
  },
  directives: { loading: () => {} }
}

let wrapper
let router
async function open(location = '/cac/overview', cache = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cac/overview', component: InspectionOverviewPage },
      { path: '/cac/results/:jobId', component: ResultDetailPage },
      { path: '/cac/results', component: { template: '<p>records</p>' } },
      { path: '/other', component: { template: '<p>other</p>' } }
    ]
  })
  await router.push(location)
  await router.isReady()
  wrapper = mount(
    {
      setup() {
        return () =>
          h(RouterView, null, {
            default: ({ Component, route }) =>
              cache
                ? h(
                    KeepAlive,
                    { include: 'InspectionOverviewPage' },
                    {
                      default: () => h(Component, { key: route.path })
                    }
                  )
                : h(Component, { key: route.path })
          })
      }
    },
    { global: { ...global, plugins: [router] } }
  )
  await flushPromises()
}
const overview = () => wrapper.findComponent(InspectionOverviewPage)
const scroll = () => overview().vm.reportTable.scrollBarRef.wrapRef
const clickReport = async () => {
  const button = overview()
    .findAll('button')
    .find(item => item.text() === '查看报告')
  await button.trigger('click')
  await flushPromises()
}
const breadcrumb = () => wrapper.find('.page-navbar a')

beforeEach(() => {
  vi.resetAllMocks()
  mocks.templates.mockResolvedValue({
    data: [
      {
        id: 'template-real',
        jobId: 'jobA123',
        templateName: 'original template',
        auditParams: '[]'
      },
      { id: 'other', jobId: null, templateName: 'other template', auditParams: '[]' }
    ]
  })
  mocks.statistics.mockResolvedValue({ records: [{ name: 'FAILED', value: 3 }] })
  mocks.recent.mockResolvedValue({ data: { data: [] } })
  mocks.job.mockResolvedValue({
    templateId: 'template-real',
    templateName: 'original template',
    auditParams: '[]'
  })
  mocks.machines.mockResolvedValue({ records: [], total: 0 })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('巡检报告来源与返回上下文（真实路由，API/滚动为桩）', () => {
  it.each([false, true])('显式返回恢复搜索与双向滚动，KeepAlive=%s', async cache => {
    await open('/cac/overview?keep=original', cache)
    await overview().find('input').setValue('original')
    scroll().scrollTop = 240
    scroll().scrollLeft = 72
    await clickReport()
    expect(router.currentRoute.value.path).toBe('/cac/results/jobA123')
    expect(router.currentRoute.value.query).toEqual({
      from: 'overview',
      overviewSearch: 'original',
      overviewTop: '240',
      overviewLeft: '72'
    })
    expect(breadcrumb().text()).toBe('巡检总览')
    expect(mocks.job).toHaveBeenCalledExactlyOnceWith('jobA123')
    await breadcrumb().trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/overview')
    expect(overview().find('input').element.value).toBe('original')
    expect(overview().vm.filteredTemplateList).toHaveLength(1)
    expect(scroll()).toMatchObject({ scrollTop: 240, scrollLeft: 72 })
    expect(mocks.templates).toHaveBeenCalledTimes(cache ? 1 : 2)
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it.each([false, true])('浏览器后退使用原历史项并保留原query，KeepAlive=%s', async cache => {
    await open('/cac/overview?keep=original', cache)
    await overview().find('input').setValue('original')
    scroll().scrollTop = 180
    scroll().scrollLeft = 48
    await clickReport()
    router.back()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/overview')
    expect(router.currentRoute.value.query.keep).toBe('original')
    expect(overview().find('input').element.value).toBe('original')
    expect(scroll()).toMatchObject({ scrollTop: 180, scrollLeft: 48 })
  })

  it('直接打开带总览来源的报告（等价刷新后的入口）仍可恢复上下文', async () => {
    await open(
      '/cac/results/jobA123?from=overview&overviewSearch=original&overviewTop=120&overviewLeft=16'
    )
    expect(breadcrumb().text()).toBe('巡检总览')
    expect(breadcrumb().attributes('href')).toContain('/cac/overview?')
    await breadcrumb().trigger('click')
    await flushPromises()
    expect(overview().find('input').element.value).toBe('original')
    expect(scroll()).toMatchObject({ scrollTop: 120, scrollLeft: 16 })
  })

  it('记录来源保留原筛选与分页，无来源直接访问仍返回执行记录', async () => {
    await open(
      '/cac/results/jobA123?templateId=real&templateSearch=label&keyword=failed&page=3&size=20'
    )
    expect(breadcrumb().text()).toBe('执行记录')
    await breadcrumb().trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/results')
    expect(router.currentRoute.value.query).toEqual({
      templateId: 'real',
      templateSearch: 'label',
      keyword: 'failed',
      page: '3',
      size: '20'
    })
    await router.push('/cac/results/jobA123')
    await flushPromises()
    expect(breadcrumb().text()).toBe('执行记录')
    await breadcrumb().trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/cac/results')
  })

  it('首次无搜索/滚动时也能打开；连续点击仅导航一次', async () => {
    await open()
    const push = vi.spyOn(router, 'push')
    const button = overview()
      .findAll('button')
      .find(item => item.text() === '查看报告')
    await Promise.all([button.trigger('click'), button.trigger('click')])
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/cac/results/jobA123?from=overview')
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('历史快照导航被守卫拒绝时不继续打开报告', async () => {
    await open()
    const stop = router.beforeEach(() => false)
    await clickReport()
    expect(router.currentRoute.value.fullPath).toBe('/cac/overview')
    expect(overview().vm.openingReport).toBe(false)
    expect(mocks.job).not.toHaveBeenCalled()
    stop()
  })

  it('快照等待期间离开总览，迟到完成不把用户带回报告', async () => {
    await open()
    let resolve
    vi.spyOn(router, 'replace').mockImplementationOnce(() => new Promise(done => (resolve = done)))
    const button = overview()
      .findAll('button')
      .find(item => item.text() === '查看报告')
    await button.trigger('click')
    await router.push('/other')
    resolve()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/other')
    expect(mocks.job).not.toHaveBeenCalled()
  })

  it('快照等待期间刷新替换了原模板行，不再沿旧身份打开', async () => {
    await open()
    let resolve
    vi.spyOn(router, 'replace').mockImplementationOnce(() => new Promise(done => (resolve = done)))
    const button = overview()
      .findAll('button')
      .find(item => item.text() === '查看报告')
    await button.trigger('click')
    await overview().vm.refreshAll()
    resolve()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/cac/overview')
    expect(mocks.job).not.toHaveBeenCalled()
  })

  it('导航异常解除按钮占用并提示，可重试，未发业务写入', async () => {
    await open()
    vi.spyOn(router, 'replace').mockRejectedValueOnce(new Error('navigation failed'))
    await clickReport()
    expect(overview().vm.openingReport).toBe(false)
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('无法打开报告，请重试')
    await clickReport()
    expect(router.currentRoute.value.path).toBe('/cac/results/jobA123')
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it('返回后清搜索并回到表首，再次打开不带旧快照', async () => {
    await open('/cac/overview?overviewSearch=original&overviewTop=140&overviewLeft=30')
    await clickReport()
    await breadcrumb().trigger('click')
    await flushPromises()
    await overview().find('input').setValue('')
    scroll().scrollTop = 0
    scroll().scrollLeft = 0
    await clickReport()
    expect(router.currentRoute.value.query).toEqual({ from: 'overview' })
    await breadcrumb().trigger('click')
    await flushPromises()
    expect(overview().find('input').element.value).toBe('')
    expect(scroll()).toMatchObject({ scrollTop: 0, scrollLeft: 0 })
  })

  it('拒绝任意返回URL或未知来源，异常上下文不污染原记录条件', () => {
    expect(
      getReportReturnTarget({ from: '//evil.test', returnTo: 'https://evil.test', page: '2' })
    ).toEqual({ label: '执行记录', location: { path: '/cac/results', query: { page: '2' } } })
    expect(getReportReturnTarget({ from: ['overview'], overviewSearch: 'other' }).label).toBe(
      '执行记录'
    )
    expect(
      getReportReturnTarget({
        from: 'overview',
        overviewSearch: ['bad'],
        overviewTop: '-1',
        overviewLeft: 'Infinity',
        templateId: 'unrelated',
        returnTo: '/other'
      })
    ).toEqual({ label: '巡检总览', location: { path: '/cac/overview', query: {} } })
  })
})
