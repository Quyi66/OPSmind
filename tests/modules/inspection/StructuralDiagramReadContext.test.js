import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElMessage } from 'element-plus'
import Page from '@/modules/inspection/views/StructuralDiagramPage.vue'

const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      'getJob',
      'getStructuralDiagram',
      'getStructuralDiagramPrimaryInfo',
      'getStructuralDiagramHostItemInfo',
      'getStructuralKpi',
      'getStructuralKpiHostAll',
      'getStructuralKpiHostOk',
      'getStructuralKpiHostFailed',
      'getStructuralKpiHostCheck',
      'getStructuralKpiItemAll',
      'getCheckItemByStatus',
      'getCheckItemInfo'
    ].map(name => [name, vi.fn()])
  )
)
const chart = vi.hoisted(() => ({
  init: vi.fn(),
  setOption: vi.fn(),
  clear: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}))
vi.mock('@/modules/inspection/api', () => ({ jobApi: api, dtsApi: api }))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: vi.fn() } }))
vi.mock('echarts', () => ({ init: chart.init }))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const detail = name => ({ data: { records: [{ id: name, name, host_key: name, output: name }] } })
const primary = name => ({ data: { primaryData: [{ name }], itemTotal: 3, hostTotal: 2 } })
const secondary = name => ({ data: { itemLists: [{ item: name }], hostLists: [{ host: name }] } })
const Slot = { template: '<div><slot /></div>' }
const Dialog = {
  props: ['modelValue', 'title'],
  emits: ['update:modelValue'],
  template:
    '<section v-if="modelValue" :data-dialog="title"><button data-close @click="$emit(\'update:modelValue\', false)">关闭</button><slot /></section>'
}
let wrapper, router
const state = () => wrapper.findComponent(Page).vm.$.setupState
const dialog = title => wrapper.get(`[data-dialog="${title}"]`)
const retry = title =>
  dialog(title)
    .findAll('button')
    .find(item => item.text() === '重试')
async function open(
  props = { jobId: 'report-a' },
  path = '/cac/structural-diagram/report-a',
  routed = false
) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/cac/structural-diagram/:jobId',
        component: routed ? Page : { template: '<div />' }
      },
      { path: '/cac/results', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  wrapper = mount(routed ? Host : Page, {
    props: routed ? {} : props,
    global: {
      plugins: [router],
      stubs: {
        'router-view': false,
        'el-dialog': Dialog,
        'el-button': { template: '<button><slot /></button>' },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': Slot,
        'el-input': {
          props: ['modelValue', 'placeholder', 'size'],
          emits: ['update:modelValue'],
          template:
            '<input :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
        'el-table': {
          props: ['data'],
          template:
            '<div data-table><span v-for="(row, index) in data" :key="index">{{ row.name || row.item || row.host_key || row.host }}</span></div>'
        },
        'el-table-column': true,
        'el-breadcrumb': Slot,
        'el-breadcrumb-item': Slot,
        'el-icon': true,
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-tag': Slot
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset().mockResolvedValue({ data: { records: [] } }))
  Object.values(chart).forEach(mock => mock.mockReset())
  chart.init.mockReturnValue(chart)
  api.getJob.mockResolvedValue({ data: { templateName: '报告A' } })
  api.getStructuralDiagram.mockResolvedValue({ data: [] })
  api.getStructuralKpi.mockResolvedValue({
    data: {
      records: [
        { name: 'hostAll', value: 2 },
        { name: 'FAILED', value: 1 },
        { name: 'itemAll', value: 3 }
      ]
    }
  })
  api.getStructuralDiagramPrimaryInfo.mockResolvedValue(primary('service'))
  api.getStructuralDiagramHostItemInfo.mockResolvedValue(secondary('item'))
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('巡检架构图读取上下文', () => {
  it('初次只读取一次，图表点击沿真实报告及业务名请求原接口', async () => {
    await open()
    expect(api.getJob).toHaveBeenCalledExactlyOnceWith('report-a')
    expect(api.getStructuralDiagram).toHaveBeenCalledExactlyOnceWith('report-a')
    expect(api.getStructuralKpi).toHaveBeenCalledExactlyOnceWith('report-a')
    const handlers = Object.fromEntries(chart.on.mock.calls)
    handlers.dblclick({ data: { type: 'sub', name: '支付业务' } })
    await flushPromises()
    expect(api.getStructuralDiagramPrimaryInfo).toHaveBeenLastCalledWith({
      jobId: 'report-a',
      primaryService: '支付业务'
    })
    handlers.click({ data: { type: 'item', value: '支付业务::结算系统' } })
    await flushPromises()
    expect(api.getStructuralDiagramHostItemInfo).toHaveBeenLastCalledWith({
      jobId: 'report-a',
      primaryService: '支付业务',
      secondaryService: '结算系统'
    })
  })

  it.each(['resolve', 'reject'])('切报告后忽略旧主信息/统计/图表%s，关闭旧详情', async method => {
    const job = deferred(),
      kpi = deferred(),
      diagram = deferred()
    api.getJob.mockReturnValueOnce(job.promise)
    api.getStructuralKpi.mockReturnValueOnce(kpi.promise)
    api.getStructuralDiagram.mockReturnValueOnce(diagram.promise)
    await open()
    await state().showPrimaryDialog('old-service')
    api.getJob.mockResolvedValueOnce({ data: { templateName: '报告B' } })
    await wrapper.setProps({ jobId: 'report-b' })
    await flushPromises()
    expect(state().primaryDialogVisible).toBe(false)
    job[method](method === 'resolve' ? { data: { templateName: '旧报告' } } : new Error('old'))
    kpi[method](
      method === 'resolve'
        ? { data: { records: [{ name: 'hostAll', value: 999 }] } }
        : new Error('old')
    )
    diagram[method](method === 'resolve' ? { data: [{ name: '旧图' }] } : new Error('old'))
    await flushPromises()
    expect(state().jobInfo.templateName).toBe('报告B')
    expect(state().kpiList[0].value).toBe(2)
    expect(state().diagramData).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(chart.setOption).toHaveBeenCalledTimes(1)
  })

  it('同组件路由报告变化会读取新报告，不消费结果列表中的其他jobId', async () => {
    await open({})
    await router.replace('/cac/structural-diagram/report-b')
    await flushPromises()
    expect(state().currentJobId).toBe('report-b')
    expect(api.getJob).toHaveBeenCalledTimes(2)
    expect(api.getJob).toHaveBeenLastCalledWith('report-b')
    await router.push('/cac/results?jobId=other-report')
    await flushPromises()
    expect(api.getJob).toHaveBeenCalledTimes(2)
    expect(state().currentJobId).toBe('')
  })

  it.each(['resolve', 'reject'])(
    '一级业务关闭重开同名后，旧%s不填新窗口且不结束新加载',
    async method => {
      await open()
      const old = deferred(),
        latest = deferred()
      api.getStructuralDiagramPrimaryInfo
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise)
      const first = state().showPrimaryDialog('same')
      await flushPromises()
      await dialog('same - 二级业务列表').get('[data-close]').trigger('click')
      const second = state().showPrimaryDialog('same')
      old[method](method === 'resolve' ? primary('old') : new Error('old'))
      await first
      expect(state().primaryData).toEqual([])
      expect(state().primaryLoading).toBe(true)
      latest.resolve(primary('latest'))
      await second
      expect(state().primaryData[0].name).toBe('latest')
      expect(ElMessage.error).not.toHaveBeenCalled()
    }
  )

  it.each(['resolve', 'reject'])('二级业务快切时旧%s不混入检查项或主机列表', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getStructuralDiagramHostItemInfo
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise)
    const first = state().showSecondaryDialog('primary', 'a')
    const second = state().showSecondaryDialog('primary', 'b')
    old[method](method === 'resolve' ? secondary('old') : new Error('old'))
    await first
    expect(state().itemData).toEqual([])
    expect(state().hostData).toEqual([])
    expect(state().secondaryLoading).toBe(true)
    latest.resolve(secondary('latest'))
    await second
    expect(state().itemData[0].item).toBe('latest')
    expect(state().hostData[0].host).toBe('latest')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('一级/二级业务失败可原条件重试并保留各自搜索和页签', async () => {
    await open()
    api.getStructuralDiagramPrimaryInfo.mockRejectedValueOnce(new Error('current'))
    await state().showPrimaryDialog('pay')
    await wrapper.get('input[placeholder="搜索二级业务名称..."]').setValue(' SERVICE ')
    await retry('pay - 二级业务列表').trigger('click')
    await flushPromises()
    expect(state().primaryFilterText).toBe(' SERVICE ')
    expect(state().filteredPrimaryData).toHaveLength(1)
    expect(api.getStructuralDiagramPrimaryInfo).toHaveBeenLastCalledWith({
      jobId: 'report-a',
      primaryService: 'pay'
    })
    api.getStructuralDiagramHostItemInfo.mockRejectedValueOnce(new Error('current'))
    await state().showSecondaryDialog('pay', 'sub')
    state().secondaryActiveTab = 'host'
    state().secondaryItemFilterText = ' ITEM '
    state().secondaryHostFilterText = ' ITEM '
    await retry('sub - 详情').trigger('click')
    await flushPromises()
    expect(state().secondaryActiveTab).toBe('host')
    expect(state().filteredItemData).toHaveLength(1)
    expect(state().filteredHostData).toHaveLength(1)
    expect(api.getStructuralDiagramHostItemInfo).toHaveBeenLastCalledWith({
      jobId: 'report-a',
      primaryService: 'pay',
      secondaryService: 'sub'
    })
  })

  it.each(['resolve', 'reject'])('KPI切类型后旧%s不覆盖当前列的数据或loading', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getStructuralKpiHostAll.mockReturnValueOnce(old.promise)
    api.getCheckItemByStatus.mockReturnValueOnce(latest.promise)
    const first = state().handleKpiClick({ name: '主机总数', pageParam: 'hostAll' })
    const second = state().handleKpiClick({ name: '检查失败', pageParam: 'FAILED' })
    old[method](method === 'resolve' ? detail('old') : new Error('old'))
    await first
    expect(state().kpiDialogData).toEqual([])
    expect(state().kpiDialogLoading).toBe(true)
    latest.resolve(detail('latest'))
    await second
    expect(state().kpiDialogData[0].name).toBe('latest')
    expect(api.getCheckItemByStatus).toHaveBeenCalledExactlyOnceWith('report-a', 'FAILED')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('KPI卡片读取失败在原类型重试，搜索保留且表单阻止原生提交', async () => {
    await open()
    api.getStructuralKpiHostAll.mockRejectedValueOnce(new Error('current'))
    await wrapper.findAll('.kpi-card')[0].trigger('click')
    await flushPromises()
    state().kpiFilterText = ' NODE '
    api.getStructuralKpiHostAll.mockResolvedValueOnce(detail('node'))
    await retry('主机总数 - 详情').trigger('click')
    await flushPromises()
    expect(state().filteredKpiDialogData).toHaveLength(1)
    expect(state().kpiFilterText).toBe(' NODE ')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    dialog('主机总数 - 详情').get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it.each([0, false, ''])('检查项真实输出%j按原值展示，缺失内容才显示无输出', async output => {
    await open()
    api.getCheckItemInfo.mockResolvedValueOnce({
      data: { records: [{ name: 'check', status: 'OK', output }] }
    })
    await state().showCheckItemDetail({ id: 'real-check-id' })
    await flushPromises()
    expect(api.getCheckItemInfo).toHaveBeenCalledExactlyOnceWith('real-check-id')
    expect(dialog('巡检结果').get('.output-content pre').text()).toBe(
      output === '' ? '无输出内容' : String(output)
    )
  })

  it.each(['resolve', 'reject'])('检查项关闭重开后旧%s不覆盖新检查项', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getCheckItemInfo.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().showCheckItemDetail({ id: 'check-a', name: 'A' })
    await flushPromises()
    await dialog('巡检结果').get('[data-close]').trigger('click')
    const second = state().showCheckItemDetail({ id: 'check-b', name: 'B' })
    old[method](method === 'resolve' ? detail('old') : new Error('old'))
    await first
    expect(state().currentCheckItem.id).toBe('check-b')
    expect(state().checkItemDetailLoading).toBe(true)
    latest.resolve(detail('latest'))
    await second
    expect(state().currentCheckItem.output).toBe('latest')
  })

  it('检查项当前失败提示已有信息并可使用原ID重试', async () => {
    await open()
    api.getCheckItemInfo
      .mockRejectedValueOnce(new Error('current'))
      .mockResolvedValueOnce(detail('recovered'))
    await state().showCheckItemDetail({ id: 'check-a', name: '已有名称', output: '已有输出' })
    await flushPromises()
    expect(dialog('巡检结果').text()).toContain('当前仅显示已有信息')
    expect(dialog('巡检结果').text()).toContain('已有输出')
    await retry('巡检结果').trigger('click')
    await flushPromises()
    expect(api.getCheckItemInfo).toHaveBeenLastCalledWith('check-a')
    expect(state().currentCheckItem.output).toBe('recovered')
  })

  it('图表和统计失败均可重试原报告，不重新读取另一个成功分支', async () => {
    api.getStructuralDiagram.mockRejectedValueOnce(new Error('diagram'))
    api.getStructuralKpi.mockRejectedValueOnce(new Error('kpi'))
    await open()
    const alerts = wrapper.findAll('[role="alert"]')
    expect(alerts).toHaveLength(2)
    await alerts
      .find(item => item.text().includes('加载架构图统计'))
      .get('button')
      .trigger('click')
    await flushPromises()
    expect(api.getStructuralKpi).toHaveBeenCalledTimes(2)
    expect(api.getStructuralDiagram).toHaveBeenCalledTimes(1)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(api.getStructuralDiagram).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it.each(['resolve', 'reject'])('卸载后迟到%s不建图、不写统计也不弹错误', async method => {
    const pending = deferred()
    api.getStructuralDiagram.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: [{ name: 'late' }] } : new Error('late'))
    await flushPromises()
    expect(context.diagramData).toEqual([])
    expect(chart.init).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('真实KeepAlive切报告只由当前页读取，返回缓存页重读自身报告并隔离旧在途结果', async () => {
    await open({}, '/cac/structural-diagram/report-a', true)
    const firstContext = state()
    const pending = deferred()
    api.getStructuralDiagram.mockReturnValueOnce(pending.promise)
    const read = firstContext.loadDiagramData()
    await router.push('/cac/structural-diagram/report-b')
    await flushPromises()
    expect(api.getJob.mock.calls.map(call => call[0])).toEqual(['report-a', 'report-b'])
    pending.resolve({ data: [{ name: 'old-report-a' }] })
    await read
    expect(state().diagramData).toEqual([])
    expect(firstContext.diagramData).toEqual([])
    await router.push('/cac/results?jobId=unrelated')
    await flushPromises()
    expect(api.getJob).toHaveBeenCalledTimes(2)
    await router.push('/cac/structural-diagram/report-a')
    await flushPromises()
    expect(state()).toBe(firstContext)
    expect(state().currentJobId).toBe('report-a')
    expect(api.getJob.mock.calls.map(call => call[0])).toEqual(['report-a', 'report-b', 'report-a'])
  })
})
