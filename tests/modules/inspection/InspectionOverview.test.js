import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, KeepAlive, nextTick, provide, ref } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu
} from 'element-plus/es/components/dropdown/index.mjs'
import InspectionOverviewPage from '@/modules/inspection/views/InspectionOverviewPage.vue'

const mocks = vi.hoisted(() => ({
  templates: vi.fn(),
  statistics: vi.fn(),
  recent: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  route: { path: '/cac/overview', fullPath: '/cac/overview', query: {}, hash: '' }
}))
vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getSquareTemplates: mocks.templates, deleteTemplate: mocks.remove },
  dtsApi: { getStatistics: mocks.statistics },
  paramApi: {},
  jobApi: {}
}))
vi.mock('axios', () => ({ default: { post: mocks.recent } }))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: () => ({}) } }))
vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace })
}))
vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: mocks.confirm },
  ElMessage: { success: mocks.success, error: mocks.error, warning: mocks.warning }
}))
vi.mock('@/modules/inspection/components/template/TemplateEditDialog.vue', () => ({
  default: { name: 'TemplateEditDialog', props: ['visible', 'templateId'], template: '<div />' }
}))
vi.mock('@/modules/inspection/components/template/RunTemplateDialog.vue', () => ({
  default: { name: 'RunTemplateDialog', props: ['visible', 'templateId'], template: '<div />' }
}))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const statistics = values => ({
  data: { records: Object.entries(values).map(([name, value]) => ({ name, value })) }
})
const makeTemplate = (id, jobId = `job-${id}`, extra = {}) => ({
  id,
  jobId,
  templateName: `Display ${id}`,
  executedAt: '2026-10-20T08:00:00Z',
  auditParams: JSON.stringify([
    {
      hosts: [{ key: 'real-host', value: '192.0.2.5' }],
      scripts: [{ scriptPath: '/original/check.yml', scriptParams: '--keep' }],
      unknownRules: ['keep']
    }
  ]),
  ...extra
})
const table = defineComponent({
  name: 'ElTable',
  props: ['data'],
  setup(props) {
    provide(
      'overviewRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><div v-if="!data.length"><slot name="empty" /></div></div>'
})
const column = defineComponent({
  name: 'ElTableColumn',
  inheritAttrs: false,
  props: ['label', 'prop'],
  setup(props, { slots }) {
    const rows = inject('overviewRows')
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
const global = {
  renderStubDefaultSlot: true,
  stubs: {
    ElTable: table,
    ElTableColumn: column,
    'el-button': {
      name: 'ElButton',
      props: ['disabled', 'loading'],
      emits: ['click'],
      template:
        '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
    },
    'el-input': {
      name: 'ElInput',
      props: ['modelValue', 'size'],
      emits: ['update:modelValue'],
      template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    },
    ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
    ElTag: { template: '<span><slot /></span>' },
    ElEmpty: { props: ['description'], template: '<div>{{ description }}<slot /></div>' },
    ElDropdown: {
      name: 'ElDropdown',
      props: ['disabled'],
      emits: ['command'],
      template: '<div><slot /><slot name="dropdown" /></div>'
    },
    ElDropdownMenu: { template: '<div><slot /></div>' },
    ElDropdownItem: { props: ['command'], template: '<span><slot /></span>' }
  },
  directives: { loading: () => {} }
}
const wrappers = []
const attached = []
function open() {
  const wrapper = shallowMount(InspectionOverviewPage, { global })
  wrappers.push(wrapper)
  return wrapper
}
const row = (wrapper, id) => wrapper.vm.templateList.find(item => item.id === id)
const cell = (wrapper, id, label) => wrapper.find(`[data-row="${id}"][data-column="${label}"]`)
const button = (container, text) => container.findAll('button').find(item => item.text() === text)
const summaryValue = (wrapper, key) =>
  wrapper.vm.distributionData.find(item => item.key === key).value

beforeEach(() => {
  vi.resetAllMocks()
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
  mocks.templates.mockResolvedValue({ data: [makeTemplate('one')] })
  mocks.statistics.mockResolvedValue(
    statistics({ OK: 10, FAILED: 2, CHECK: 1, SKIPPING: 3, UNREACHABLE: 4 })
  )
  mocks.recent.mockResolvedValue({ data: { data: [] } })
  mocks.confirm.mockResolvedValue('confirm')
  mocks.remove.mockResolvedValue({})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  attached.splice(0).forEach(element => element.remove())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('巡检总览摘要与模板结果列表', () => {
  it('五类结果同列展示，摘要沿全量模板合计，保留原字段及真实身份', async () => {
    const original = Object.freeze(
      makeTemplate('real-id', 'real-job', {
        templateName: 'different display',
        unknown: { retained: true }
      })
    )
    mocks.templates.mockResolvedValueOnce({ data: [original] })
    const wrapper = open()
    await flushPromises()
    expect(wrapper.text()).toContain('模板巡检结果')
    expect(wrapper.text()).not.toContain('模板健康度')
    for (const [label, count] of [
      ['失败', 2],
      ['数据缺失', 4],
      ['人工', 1],
      ['跳过', 3],
      ['通过', 10]
    ]) {
      expect(cell(wrapper, 'real-id', label).text()).toBe(String(count))
    }
    expect(cell(wrapper, 'real-id', '配置主机数').text()).toBe('1')
    expect(cell(wrapper, 'real-id', '模板记录时间').text()).toContain('2026-10-20')
    expect(cell(wrapper, 'real-id', '结果状态').text()).toContain('有失败结果')
    expect(summaryValue(wrapper, 'UNREACHABLE')).toBe(4)
    expect(row(wrapper, 'real-id').auditParams).toBe(original.auditParams)
    expect(row(wrapper, 'real-id').unknown).toEqual(original.unknown)
    expect(mocks.statistics).toHaveBeenCalledExactlyOnceWith('real-job')
    expect(wrapper.vm.summaryCoverage).toContain('1 / 1')
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('存在报告但统计读取中不显示未执行或零通过数', async () => {
    const pending = deferred()
    mocks.statistics.mockReturnValueOnce(pending.promise)
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'one', '结果状态').text()).toBe('统计读取中')
    expect(cell(wrapper, 'one', '通过').text()).toBe('—')
    expect(wrapper.vm.hasSummaryData).toBe(false)
    expect(wrapper.vm.refreshing).toBe(true)
    expect(wrapper.vm.summaryCoverage).toContain('部分汇总')
    pending.resolve(statistics({ OK: 2 }))
    await flushPromises()
    expect(cell(wrapper, 'one', '通过').text()).toBe('2')
  })

  it('没有关联jobId时明确无报告；模板时间存在也不推断有检查结果', async () => {
    mocks.templates.mockResolvedValueOnce({ data: [makeTemplate('none', null)] })
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'none', '结果状态').text()).toBe('暂无关联报告')
    expect(cell(wrapper, 'none', '失败').text()).toBe('—')
    expect(button(cell(wrapper, 'none', '操作'), '查看报告').element.disabled).toBe(true)
    expect(wrapper.vm.hasSummaryData).toBe(false)
    expect(mocks.statistics).not.toHaveBeenCalled()
    expect(wrapper.vm.refreshing).toBe(false)
  })

  it.each([
    { values: { UNREACHABLE: 2 }, label: '存在数据缺失' },
    { values: { CHECK: 2 }, label: '需人工检查' },
    { values: { SKIPPING: 2 }, label: '已有检查结果' }
  ])('仅有单类计数时仍是检查结果：$label', async ({ values, label }) => {
    mocks.statistics.mockResolvedValueOnce(statistics(values))
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'one', '结果状态').text()).toBe(label)
    expect(row(wrapper, 'one').statisticsState).toBe('ready')
    expect(wrapper.text()).not.toContain('尚未执行巡检')
  })

  it('统计返回空数组和显式全零分别保留未知/零计数，均不推断未执行或健康', async () => {
    mocks.templates.mockResolvedValueOnce({ data: [makeTemplate('empty'), makeTemplate('zero')] })
    mocks.statistics.mockImplementation(job =>
      Promise.resolve(
        job === 'job-empty'
          ? statistics({})
          : statistics({ OK: 0, FAILED: 0, CHECK: 0, SKIPPING: 0, UNREACHABLE: 0 })
      )
    )
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'empty', '结果状态').text()).toBe('暂无检查统计')
    expect(cell(wrapper, 'empty', '通过').text()).toBe('—')
    expect(cell(wrapper, 'zero', '结果状态').text()).toBe('暂无检查统计')
    expect(cell(wrapper, 'zero', '通过').text()).toBe('0')
    expect(wrapper.vm.hasSummaryData).toBe(true)
    expect(wrapper.text()).not.toContain('健康')
  })

  it('部分失败不归零，明确部分汇总；单行重试只GET原jobId且不刷新其他读取', async () => {
    mocks.templates.mockResolvedValueOnce({ data: [makeTemplate('ok'), makeTemplate('error')] })
    mocks.statistics.mockImplementation(job =>
      job === 'job-error'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(statistics({ OK: 7 }))
    )
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'error', '结果状态').text()).toContain('统计读取失败')
    expect(cell(wrapper, 'error', '通过').text()).toBe('—')
    expect(summaryValue(wrapper, 'OK')).toBe(7)
    expect(wrapper.vm.summaryCoverage).toContain('部分汇总')
    const reads = mocks.recent.mock.calls.length
    mocks.statistics.mockResolvedValueOnce(statistics({ UNREACHABLE: 3 }))
    await button(cell(wrapper, 'error', '结果状态'), '重试统计').trigger('click')
    await flushPromises()
    expect(mocks.statistics).toHaveBeenLastCalledWith('job-error')
    expect(mocks.templates).toHaveBeenCalledTimes(1)
    expect(mocks.recent).toHaveBeenCalledTimes(reads)
    expect(cell(wrapper, 'error', '结果状态').text()).toBe('存在数据缺失')
    expect(wrapper.vm.summaryCoverage).not.toContain('部分汇总')
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it.each([statistics({ OK: -1 }), { data: {} }, statistics({ OK: 'invalid' })])(
    '异常计数不能显示成检查通过：%j',
    async response => {
      mocks.statistics.mockResolvedValueOnce(response)
      const wrapper = open()
      await flushPromises()
      expect(row(wrapper, 'one').statisticsState).toBe('error')
      expect(cell(wrapper, 'one', '通过').text()).toBe('—')
      expect(wrapper.vm.hasSummaryData).toBe(false)
    }
  )

  it('模板读取失败与真实空列表分开，原刷新可重试且保留搜索', async () => {
    mocks.templates.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: [] })
    const wrapper = open()
    await flushPromises()
    expect(wrapper.text()).toContain('读取失败')
    expect(wrapper.text()).not.toContain('暂无巡检模板')
    expect(wrapper.text()).not.toContain('新增模板')
    await wrapper.find('input').setValue('keep')
    await wrapper.find('button[title="重试读取"]').trigger('click')
    await flushPromises()
    expect(wrapper.vm.searchKeyword).toBe('keep')
    expect(wrapper.text()).toContain('暂无巡检模板')
    expect(wrapper.text()).toContain('新增模板')
    expect(wrapper.vm.hasSummaryData).toBe(false)
  })

  it('刷新后没有报告时清除旧汇总，不残留上次通过数', async () => {
    const wrapper = open()
    await flushPromises()
    mocks.templates.mockResolvedValueOnce({ data: [makeTemplate('new', null)] })
    await wrapper.vm.refreshAll()
    await nextTick()
    expect(wrapper.vm.hasSummaryData).toBe(false)
    expect(summaryValue(wrapper, 'OK')).toBe(0)
    expect(wrapper.vm.summaryCoverage).toBe('暂无关联报告')
  })

  it('未知配置数量显示横线而不使整表失败，0配置仍保留已有报告；不猜名称身份', async () => {
    mocks.templates.mockResolvedValueOnce({
      data: [
        makeTemplate('bad-params', 'real-a', {
          auditParams: '{invalid',
          executedAt: 'invalid date'
        }),
        makeTemplate('zero-hosts', 0, { auditParams: '[]' })
      ]
    })
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'bad-params', '配置主机数').text()).toBe('—')
    expect(cell(wrapper, 'bad-params', '模板记录时间').text()).toBe('—')
    expect(cell(wrapper, 'zero-hosts', '配置主机数').text()).toBe('0')
    expect(cell(wrapper, 'zero-hosts', '结果状态').text()).toBe('有失败结果')
    await button(cell(wrapper, 'zero-hosts', '操作'), '查看报告').trigger('click')
    expect(mocks.push).toHaveBeenLastCalledWith({
      path: '/cac/results/0',
      query: { from: 'overview' }
    })
    expect(mocks.statistics).toHaveBeenCalledWith(0)
  })

  it('相同jobId关联到不同模板时分别附加各行统计，保持按模板关联汇总口径', async () => {
    mocks.templates.mockResolvedValueOnce({
      data: [makeTemplate('a', 'same-job'), makeTemplate('b', 'same-job')]
    })
    mocks.statistics.mockResolvedValue(statistics({ OK: 6 }))
    const wrapper = open()
    await flushPromises()
    expect(cell(wrapper, 'a', '通过').text()).toBe('6')
    expect(cell(wrapper, 'b', '通过').text()).toBe('6')
    expect(summaryValue(wrapper, 'OK')).toBe(12)
    expect(mocks.statistics).toHaveBeenCalledTimes(2)
  })

  it('本地搜索不触发读取、隐藏后仍保持全量摘要，清除后恢复全部行', async () => {
    const wrapper = open()
    await flushPromises()
    const reads = mocks.statistics.mock.calls.length
    await wrapper.find('input').setValue('no-match')
    expect(wrapper.text()).toContain('没有匹配的模板')
    expect(wrapper.vm.filteredTemplateList).toHaveLength(0)
    expect(summaryValue(wrapper, 'OK')).toBe(10)
    await wrapper.find('input').setValue('')
    expect(wrapper.vm.filteredTemplateList).toHaveLength(1)
    expect(mocks.templates).toHaveBeenCalledTimes(1)
    expect(mocks.statistics).toHaveBeenCalledTimes(reads)
  })
})

describe('总览读取上下文', () => {
  it('模板读取逆序时只使用最新列表，旧请求不继续发统计或结束新loading', async () => {
    const old = deferred(),
      current = deferred()
    mocks.templates.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = open()
    const refreshing = wrapper.vm.refreshAll()
    old.resolve({ data: [makeTemplate('old')] })
    await flushPromises()
    expect(wrapper.vm.loading).toBe(true)
    expect(mocks.statistics).not.toHaveBeenCalled()
    current.resolve({ data: [makeTemplate('current')] })
    await refreshing
    expect(wrapper.vm.templateList.map(item => item.id)).toEqual(['current'])
    expect(mocks.statistics).toHaveBeenCalledExactlyOnceWith('job-current')
  })

  it.each(['resolve', 'reject'])('旧统计迟到%s不污染新列表及摘要', async outcome => {
    const old = deferred()
    mocks.statistics.mockReturnValueOnce(old.promise)
    const wrapper = open()
    await flushPromises()
    mocks.templates.mockResolvedValueOnce({ data: [makeTemplate('new')] })
    mocks.statistics.mockResolvedValueOnce(statistics({ FAILED: 5 }))
    await wrapper.vm.refreshAll()
    if (outcome === 'resolve') old.resolve(statistics({ OK: 999 }))
    else old.reject(new Error('old error'))
    await flushPromises()
    expect(wrapper.vm.templateList.map(item => item.id)).toEqual(['new'])
    expect(summaryValue(wrapper, 'FAILED')).toBe(5)
    expect(summaryValue(wrapper, 'OK')).toBe(0)
    expect(wrapper.vm.refreshing).toBe(false)
  })

  it('单行重试进行中不重复请求，完整刷新使该行旧重试失效', async () => {
    mocks.statistics.mockRejectedValueOnce(new Error('initial error'))
    const wrapper = open()
    await flushPromises()
    const pending = deferred()
    mocks.statistics.mockReturnValueOnce(pending.promise)
    const oldRow = row(wrapper, 'one')
    const first = wrapper.vm.retryStatistics(oldRow)
    await wrapper.vm.retryStatistics(oldRow)
    expect(mocks.statistics).toHaveBeenCalledTimes(2)
    await wrapper.vm.refreshAll()
    pending.resolve(statistics({ OK: 999 }))
    await first
    expect(summaryValue(wrapper, 'OK')).toBe(10)
  })

  it('卸载时模板请求失效，不再发起统计/最近记录请求', async () => {
    const pending = deferred()
    mocks.templates.mockReturnValueOnce(pending.promise)
    const wrapper = open()
    wrapper.unmount()
    pending.resolve({ data: [makeTemplate('late')] })
    await flushPromises()
    expect(mocks.statistics).not.toHaveBeenCalled()
    expect(mocks.recent).not.toHaveBeenCalled()
  })

  it('KeepAlive失活忽略在途统计，恢复不自动读，可手动重试原报告', async () => {
    const pending = deferred()
    mocks.statistics.mockReturnValueOnce(pending.promise)
    const show = ref(true)
    const Parent = defineComponent({
      setup: () => () =>
        h(KeepAlive, null, { default: () => (show.value ? h(InspectionOverviewPage) : null) })
    })
    const wrapper = mount(Parent, { global })
    wrappers.push(wrapper)
    await flushPromises()
    const page = wrapper.findComponent(InspectionOverviewPage)
    const current = row(page, 'one')
    show.value = false
    await nextTick()
    pending.resolve(statistics({ OK: 999 }))
    await flushPromises()
    show.value = true
    await nextTick()
    expect(current.statisticsState).toBe('interrupted')
    expect(current.stats).toBe(null)
    expect(mocks.templates).toHaveBeenCalledTimes(1)
    expect(mocks.statistics).toHaveBeenCalledTimes(1)
    await page.vm.retryStatistics(current)
    expect(current.statisticsState).toBe('ready')
    expect(mocks.statistics).toHaveBeenLastCalledWith('job-one')
  })
})

describe('总览原操作与必要确认', () => {
  it('真实Element表格和下拉菜单可查看报告、点击更多并选择编辑，原模板身份不变', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    attached.push(container)
    const wrapper = mount(InspectionOverviewPage, {
      attachTo: container,
      global: {
        ...global,
        stubs: {
          ...global.stubs,
          ElTable,
          ElTableColumn,
          ElDropdown,
          ElDropdownItem,
          ElDropdownMenu
        }
      }
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.find('.el-table__body').text()).toContain('Display one')
    expect(wrapper.find('.el-table__body').text()).toContain('有失败结果')
    const scrollWrap = wrapper.vm.reportTable.scrollBarRef.wrapRef
    expect(scrollWrap).toBeInstanceOf(HTMLElement)
    scrollWrap.scrollTop = 120
    scrollWrap.scrollLeft = 32
    const report = wrapper.findAll('button').find(item => item.text() === '查看报告')
    await report.trigger('click')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
      path: '/cac/results/job-one',
      query: { from: 'overview', overviewTop: '120', overviewLeft: '32' }
    })
    await wrapper.find('button[aria-label="Display one的更多操作"]').trigger('click')
    await flushPromises()
    const edit = [...document.querySelectorAll('[role="menuitem"]')].find(
      item => item.textContent.trim() === '编辑'
    )
    expect(edit).toBeDefined()
    edit.click()
    await nextTick()
    expect(wrapper.findComponent({ name: 'TemplateEditDialog' }).props()).toMatchObject({
      visible: true,
      templateId: 'one'
    })
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('查看报告使用原jobId，执行/更多编辑传原模板id且不提前写入', async () => {
    const wrapper = open()
    await flushPromises()
    await button(cell(wrapper, 'one', '操作'), '查看报告').trigger('click')
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
      path: '/cac/results/job-one',
      query: { from: 'overview' }
    })
    await button(cell(wrapper, 'one', '操作'), '执行').trigger('click')
    expect(wrapper.findComponent({ name: 'RunTemplateDialog' }).props()).toMatchObject({
      visible: true,
      templateId: 'one'
    })
    const dropdown = cell(wrapper, 'one', '操作').findComponent({ name: 'ElDropdown' })
    dropdown.vm.$emit('command', 'edit')
    await nextTick()
    expect(wrapper.findComponent({ name: 'TemplateEditDialog' }).props()).toMatchObject({
      visible: true,
      templateId: 'one'
    })
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('更多删除保留原确认文案和真实id，成功后刷新', async () => {
    const wrapper = open()
    await flushPromises()
    cell(wrapper, 'one', '操作').findComponent({ name: 'ElDropdown' }).vm.$emit('command', 'delete')
    await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledExactlyOnceWith(
      '确定要删除模板「Display one」吗？',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('one')
    expect(mocks.templates).toHaveBeenCalledTimes(2)
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith('删除成功')
  })

  it.each(['cancel', 'close'])('删除确认%s不写入、不假报成功/失败或刷新', async outcome => {
    mocks.confirm.mockRejectedValueOnce(outcome)
    const wrapper = open()
    await flushPromises()
    await wrapper.vm.deleteTemplate(row(wrapper, 'one'))
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.templates).toHaveBeenCalledTimes(1)
  })

  it('删除失败明确提示且不假刷新', async () => {
    mocks.remove.mockRejectedValueOnce(new Error('failed'))
    const wrapper = open()
    await flushPromises()
    await wrapper.vm.deleteTemplate(row(wrapper, 'one'))
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('删除失败')
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.templates).toHaveBeenCalledTimes(1)
  })

  it('确认期间换列表后不发旧删除，旧行也不能打开新编辑/执行', async () => {
    const confirmation = deferred()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const wrapper = open()
    await flushPromises()
    const old = row(wrapper, 'one')
    const deleting = wrapper.vm.deleteTemplate(old)
    await wrapper.vm.refreshAll()
    confirmation.resolve('confirm')
    await deleting
    wrapper.vm.handleCommand('edit', old)
    wrapper.vm.handleCommand('run', old)
    expect(wrapper.vm.editDialogVisible).toBe(false)
    expect(wrapper.vm.runDialogVisible).toBe(false)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('已发送删除迟到后不提示或刷新新列表', async () => {
    const pending = deferred()
    mocks.remove.mockReturnValueOnce(pending.promise)
    const wrapper = open()
    await flushPromises()
    const deleting = wrapper.vm.deleteTemplate(row(wrapper, 'one'))
    await flushPromises()
    expect(mocks.remove).toHaveBeenCalledWith('one')
    await wrapper.vm.refreshAll()
    pending.resolve({})
    await deleting
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.templates).toHaveBeenCalledTimes(2)
  })

  it('真实空模板列表保留原新增入口；弹窗成功沿原刷新', async () => {
    mocks.templates.mockResolvedValueOnce({ data: [] })
    const wrapper = open()
    await flushPromises()
    await button(wrapper, '新增模板').trigger('click')
    expect(wrapper.findComponent({ name: 'TemplateEditDialog' }).props()).toMatchObject({
      visible: true,
      templateId: ''
    })
    wrapper.findComponent({ name: 'TemplateEditDialog' }).vm.$emit('success')
    await flushPromises()
    expect(mocks.templates).toHaveBeenCalledTimes(2)
    wrapper.findComponent({ name: 'RunTemplateDialog' }).vm.$emit('success')
    await flushPromises()
    expect(mocks.templates).toHaveBeenCalledTimes(3)
  })
})
