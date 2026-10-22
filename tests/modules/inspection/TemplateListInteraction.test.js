import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, KeepAlive, nextTick, provide, ref } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import TemplateListPage from '@/modules/inspection/views/TemplateListPage.vue'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  params: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getTemplates: api.list, deleteTemplate: api.remove },
  paramApi: { getParams: api.params }
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: api.push })
}))
vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: api.confirm },
  ElMessage: { success: api.success, error: api.error }
}))
vi.mock('@/modules/inspection/components/template/TemplateEditDialog.vue', () => ({
  default: { name: 'TemplateEditDialog', props: ['visible', 'templateId'], template: '<div />' }
}))
vi.mock('@/modules/inspection/components/template/RunTemplateDialog.vue', () => ({
  default: { name: 'RunTemplateDialog', props: ['visible', 'templateId'], template: '<div />' }
}))

const template = (id, extra = {}) => ({
  id,
  templateName: `template ${id}`,
  description: 'description',
  executedBy: 'operator',
  executedAt: '2026-10-01T08:00:00Z',
  auditParams: '[]',
  ...extra
})
const templates = (count = 25) =>
  Array.from({ length: count }, (_, i) =>
    template(`id${i}`, {
      templateName: `template ${i}`,
      executedAt: new Date(Date.UTC(2026, 9, i + 1)).toISOString(),
      auditParams: [{ hosts: Array.from({ length: i }, () => ({})), scripts: [] }]
    })
  )
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Table = defineComponent({
  name: 'ElTable',
  props: ['data'],
  setup(props) {
    provide(
      'templateRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><div v-if="!data.length"><slot name="empty" /></div></div>'
})
const Column = defineComponent({
  name: 'ElTableColumn',
  props: ['label', 'prop'],
  inheritAttrs: false,
  setup(props, { slots }) {
    const rows = inject('templateRows')
    return () =>
      rows.value.map(row =>
        h(
          'div',
          {
            'data-row': row.id,
            'data-column': props.label
          },
          slots.default?.({ row }) || row[props.prop]
        )
      )
  }
})
const global = {
  stubs: {
    'el-form': { props: ['model', 'inline', 'size'], template: '<form><slot /></form>' },
    'el-form-item': { props: ['label'], template: '<div><slot /></div>' },
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
    ElIcon: { template: '<span><slot /></span>' },
    ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
    ElEmpty: { props: ['description'], template: '<div>{{ description }}<slot /></div>' },
    ElPagination: {
      name: 'ElPagination',
      props: ['total', 'currentPage', 'pageSize'],
      template: '<div />'
    }
  },
  directives: { loading() {} }
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
function open(options = {}) {
  const wrapper = shallowMount(TemplateListPage, { global, ...options })
  wrappers.push(wrapper)
  return wrapper
}
const cell = (wrapper, id, label) => wrapper.find(`[data-row="${id}"][data-column="${label}"]`)
const button = (container, label) => container.findAll('button').find(item => item.text() === label)
const row = (wrapper, id = 'one') => state(wrapper).tableData.find(item => item.id === id)

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
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {}
  }))
  api.list.mockResolvedValue({ data: [template('one')] })
  api.params.mockResolvedValue([])
  api.confirm.mockResolvedValue('confirm')
  api.remove.mockResolvedValue({})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('巡检模板列表交互', () => {
  it('多参数组按配置条目计数，保留原身份/脚本/未知字段，不去重或修改源数据', async () => {
    const original = Object.freeze(
      template('real', {
        auditParams: [
          {
            hosts: [{ id: 'same' }],
            scripts: [{ scriptPath: '/original/a.yml', scriptParams: '--keep' }],
            rules: { retained: true }
          },
          { hosts: [{ id: 'same' }], scripts: [{ scriptPath: '/original/b.yml' }] }
        ],
        unknown: { retained: true }
      })
    )
    api.list.mockResolvedValue({ data: [original] })
    const wrapper = open()
    await flushPromises()
    expect(row(wrapper, 'real')).toMatchObject({ ...original, hostCount: 2, scriptCount: 2 })
    expect(original).not.toHaveProperty('hostCount')
    expect(cell(wrapper, 'real', '配置主机数').text()).toBe('2')
  })

  it('未知/非法配置不显示确定0，合法空数组显示0，单字段错误不吞掉另一字段', async () => {
    api.list.mockResolvedValue({
      data: [
        template('bad', { auditParams: '{bad', executedAt: 'invalid' }),
        template('missing', { auditParams: null }),
        template('shape', { auditParams: {} }),
        template('empty'),
        template('partial', { auditParams: [{ hosts: {}, scripts: [{}] }] })
      ]
    })
    const wrapper = open()
    await flushPromises()
    expect(row(wrapper, 'bad')).toMatchObject({ hostCount: null, scriptCount: null })
    expect(cell(wrapper, 'bad', '配置主机数').text()).toBe('—')
    expect(cell(wrapper, 'bad', '上次检查时间').text()).toBe('—')
    expect(row(wrapper, 'missing').hostCount).toBeNull()
    expect(row(wrapper, 'shape').hostCount).toBeNull()
    expect(row(wrapper, 'empty')).toMatchObject({ hostCount: 0, scriptCount: 0 })
    expect(row(wrapper, 'partial')).toMatchObject({ hostCount: null, scriptCount: 1 })
  })

  it('按全量日期/数值排序后分页，未知永远置后，清排序恢复源顺序', async () => {
    const source = [...templates(), template('unknown', { auditParams: null, executedAt: null })]
    api.list.mockResolvedValue({ data: source })
    const wrapper = open()
    await flushPromises()
    const vm = state(wrapper)
    expect(vm.paginatedData[0].id).toBe('id24')
    vm.currentPage = 3
    expect(vm.paginatedData.map(item => item.id)).toEqual([
      'id4',
      'id3',
      'id2',
      'id1',
      'id0',
      'unknown'
    ])
    vm.handleSortChange({ prop: 'hostCount', order: 'ascending' })
    expect(vm.currentPage).toBe(1)
    expect(vm.paginatedData[0].id).toBe('id0')
    vm.handleSortChange({ prop: 'hostCount', order: 'descending' })
    vm.currentPage = 3
    expect(vm.paginatedData.at(-1).id).toBe('unknown')
    vm.handleSortChange({ prop: 'hostCount', order: null })
    expect(vm.paginatedData.map(item => item.id)).toEqual(source.slice(0, 10).map(item => item.id))
    expect(api.list).toHaveBeenCalledTimes(1)
    expect(source[0].id).toBe('id0')
  })

  it.each(['templateName', 'description', 'executedBy'])(
    '输入即时搜索%s并回首页，不请求后台',
    async field => {
      api.list.mockResolvedValue({
        data: templates().map(item => ({ ...item, [field]: `find ${item.id}` }))
      })
      const wrapper = open()
      await flushPromises()
      state(wrapper).currentPage = 3
      await wrapper.find('input').setValue('FIND id2')
      expect(state(wrapper).currentPage).toBe(1)
      expect(state(wrapper).filteredData).toHaveLength(6)
      expect(wrapper.find('.template-count').text()).toBe('6 / 25 个模板')
      expect(api.list).toHaveBeenCalledTimes(1)
    }
  )

  it('无匹配与真实空分开，清除搜索不重置页大小或发请求', async () => {
    const wrapper = open()
    await flushPromises()
    state(wrapper).pageSize = 20
    await wrapper.find('input').setValue('not found')
    expect(wrapper.text()).toContain('没有匹配的模板')
    expect(wrapper.text()).not.toContain('暂无巡检模板')
    await button(wrapper, '清除搜索').trigger('click')
    expect(state(wrapper).filters.keyword).toBe('')
    expect(state(wrapper).pageSize).toBe(20)
    expect(api.list).toHaveBeenCalledTimes(1)
    api.list.mockResolvedValue({ data: [] })
    await wrapper.vm.refresh()
    await nextTick()
    expect(wrapper.text()).toContain('暂无巡检模板')
  })

  it('刷新保留搜索/排序/有效页，数据减少收敛到最后一页，页大小改变回首页', async () => {
    api.list.mockResolvedValue({ data: templates() })
    const wrapper = open()
    await flushPromises()
    const vm = state(wrapper)
    vm.filters.keyword = 'template'
    vm.handleSortChange({ prop: 'hostCount', order: 'ascending' })
    vm.currentPage = 3
    await wrapper.vm.refresh()
    expect(vm.currentPage).toBe(3)
    expect(vm.paginatedData[0].id).toBe('id20')
    api.list.mockResolvedValue({ data: templates(20) })
    await wrapper.vm.refresh()
    expect(vm.currentPage).toBe(2)
    expect(vm.filters.keyword).toBe('template')
    expect(vm.paginatedData[0].id).toBe('id10')
    vm.pageSize = 20
    expect(vm.currentPage).toBe(1)
  })

  it('首次读取失败不显示暂无模板，刷新可重试，成功空也成为有效结果', async () => {
    api.list.mockRejectedValueOnce(new Error('offline'))
    const wrapper = open()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('读取失败')
    expect(wrapper.text()).not.toContain('暂无巡检模板')
    expect(state(wrapper).hasResult).toBe(false)
    await wrapper.find('input').setValue('keep')
    api.list.mockResolvedValue({ data: [] })
    await wrapper.find('button[aria-label="重试读取巡检模板"]').trigger('click')
    await flushPromises()
    expect(state(wrapper).hasResult).toBe(true)
    expect(state(wrapper).filters.keyword).toBe('keep')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无巡检模板')
  })

  it('刷新失败保留旧行与条件并说明过期，旧行写操作禁用，独立新建保留', async () => {
    const wrapper = open()
    await flushPromises()
    const previous = row(wrapper)
    state(wrapper).filters.keyword = 'template'
    api.list.mockRejectedValueOnce(new Error('offline'))
    await wrapper.vm.refresh()
    await nextTick()
    expect(row(wrapper)).toBe(previous)
    expect(wrapper.find('[role="alert"]').text()).toContain('可能已过期')
    for (const label of ['执行', '编辑', '删除'])
      expect(button(cell(wrapper, 'one', '操作'), label).element.disabled).toBe(true)
    await state(wrapper).runTemplate(previous)
    await state(wrapper).editTemplate(previous)
    await state(wrapper).deleteTemplate(previous)
    expect(api.confirm).not.toHaveBeenCalled()
    await button(wrapper, '新建模板').trigger('click')
    expect(wrapper.findComponent({ name: 'TemplateEditDialog' }).props()).toMatchObject({
      visible: true,
      templateId: ''
    })
    api.list.mockResolvedValue({ data: [template('one')] })
    await wrapper.vm.refresh()
    expect(state(wrapper).isTemplateCurrent(row(wrapper))).toBe(true)
    expect(state(wrapper).isTemplateCurrent(previous)).toBe(false)
  })

  it.each([401, 403])('权限拒绝%s清旧行且不普通重试', async status => {
    const wrapper = open()
    await flushPromises()
    api.list.mockRejectedValueOnce({ response: { status } })
    await wrapper.vm.refresh()
    await nextTick()
    expect(state(wrapper).tableData).toEqual([])
    expect(state(wrapper).hasResult).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toContain('无权读取')
    expect(wrapper.find('button[aria-label="重试读取巡检模板"]').element.disabled).toBe(true)
    await wrapper.vm.refresh()
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('非法列表响应作为错误，不把已知数据替换成空', async () => {
    const wrapper = open()
    await flushPromises()
    api.list.mockResolvedValue({ data: { unexpected: true } })
    await wrapper.vm.refresh()
    expect(state(wrapper).tableData).toHaveLength(1)
    expect(state(wrapper).error).toBe('read')
  })

  it('逆序读取只使用最新结果，旧finally不结束最新loading', async () => {
    const old = deferred(),
      latest = deferred()
    api.list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const wrapper = open()
    const refresh = wrapper.vm.refresh()
    old.resolve({ data: [template('old')] })
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).tableData).toEqual([])
    latest.resolve({ data: [template('latest')] })
    await refresh
    expect(state(wrapper).tableData[0].id).toBe('latest')
  })

  it('旧失败晚到不清新结果或报旧错误，卸载使旧行和确认失效', async () => {
    const old = deferred()
    api.list.mockReturnValueOnce(old.promise)
    const wrapper = open()
    await wrapper.vm.refresh()
    old.reject(new Error('old'))
    await flushPromises()
    expect(state(wrapper).error).toBe('')
    const vm = state(wrapper),
      previous = row(wrapper)
    wrapper.unmount()
    expect(vm.isTemplateCurrent(previous)).toBe(false)
  })

  it('KeepAlive失活忽略在途读取，激活不自动请求，可手动重试', async () => {
    const pending = deferred()
    api.list.mockReturnValueOnce(pending.promise)
    const visible = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, {
            default: () => (visible.value ? h(TemplateListPage) : h('div'))
          })
      }),
      { global }
    )
    wrappers.push(wrapper)
    const page = wrapper.findComponent(TemplateListPage),
      vm = state(page)
    visible.value = false
    await nextTick()
    pending.resolve({ data: [template('old')] })
    await flushPromises()
    visible.value = true
    await nextTick()
    expect(vm.tableData).toEqual([])
    expect(vm.error).toBe('interrupted')
    expect(api.list).toHaveBeenCalledTimes(1)
    await page.vm.refresh()
    expect(vm.tableData[0].id).toBe('one')
  })

  it('名称为普通文本，执行记录按钮携原ID，执行/编辑仍开原弹窗并保留条件', async () => {
    api.list.mockResolvedValue({ data: [template('real&=?')] })
    const wrapper = open()
    await flushPromises()
    const name = cell(wrapper, 'real&=?', '模板名称')
    expect(name.text()).toBe('template real&=?')
    expect(name.find('a').exists()).toBe(false)
    await button(cell(wrapper, 'real&=?', '操作'), '执行记录').trigger('click')
    expect(api.push).toHaveBeenCalledExactlyOnceWith({
      path: '/cac/results',
      query: { templateId: 'real&=?' }
    })
    await button(cell(wrapper, 'real&=?', '操作'), '执行').trigger('click')
    expect(wrapper.findComponent({ name: 'RunTemplateDialog' }).props()).toMatchObject({
      visible: true,
      templateId: 'real&=?'
    })
    await button(cell(wrapper, 'real&=?', '操作'), '编辑').trigger('click')
    expect(wrapper.findComponent({ name: 'TemplateEditDialog' }).props()).toMatchObject({
      visible: true,
      templateId: 'real&=?'
    })
    state(wrapper).filters.keyword = 'template'
    wrapper.findComponent({ name: 'TemplateEditDialog' }).vm.$emit('success')
    await flushPromises()
    expect(state(wrapper).filters.keyword).toBe('template')
    expect(api.remove).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'close'])('删除确认%s不误报失败或刷新', async reason => {
    api.confirm.mockRejectedValueOnce(reason)
    const wrapper = open()
    await flushPromises()
    await state(wrapper).deleteTemplate(row(wrapper))
    expect(api.remove).not.toHaveBeenCalled()
    expect(api.error).not.toHaveBeenCalled()
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('删除保留原确认与0标识，成功刷新后收敛页码并保留搜索', async () => {
    api.list.mockResolvedValue({ data: [...templates(20), template(0, { executedAt: null })] })
    const wrapper = open()
    await flushPromises()
    const vm = state(wrapper)
    vm.filters.keyword = 'template'
    vm.currentPage = 3
    api.list.mockResolvedValue({ data: templates(20) })
    await vm.deleteTemplate(row(wrapper, 0))
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith(
      '确定要删除模板「template 0」吗？',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    expect(api.remove).toHaveBeenCalledExactlyOnceWith(0)
    expect(vm.currentPage).toBe(2)
    expect(vm.filters.keyword).toBe('template')
    expect(api.success).toHaveBeenCalledExactlyOnceWith('删除成功')
  })

  it('确认期间刷新替换原行，不发旧删除', async () => {
    const confirm = deferred()
    api.confirm.mockReturnValueOnce(confirm.promise)
    const wrapper = open()
    await flushPromises()
    const deletion = state(wrapper).deleteTemplate(row(wrapper))
    await wrapper.vm.refresh()
    confirm.resolve('confirm')
    await deletion
    expect(api.remove).not.toHaveBeenCalled()
    expect(api.success).not.toHaveBeenCalled()
  })

  it('已发送删除晚到不刷新或提示新列表，重复点击不重复确认', async () => {
    const pending = deferred()
    api.remove.mockReturnValueOnce(pending.promise)
    const wrapper = open()
    await flushPromises()
    const vm = state(wrapper),
      deletion = vm.deleteTemplate(row(wrapper))
    await flushPromises()
    await vm.deleteTemplate(row(wrapper))
    await wrapper.vm.refresh()
    pending.resolve({})
    await deletion
    expect(api.confirm).toHaveBeenCalledTimes(1)
    expect(api.list).toHaveBeenCalledTimes(2)
    expect(api.success).not.toHaveBeenCalled()
  })

  it('真实Element排序表头和分页在全量数据上接线，点击记录仍用真实ID', async () => {
    api.list.mockResolvedValue({ data: templates() })
    const wrapper = mount(TemplateListPage, {
      global: {
        ...global,
        stubs: { ...global.stubs, ElTable, ElTableColumn, ElPagination }
      }
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.find('.el-table__body').text()).toContain('template 24')
    const nameHeader = wrapper
      .findAll('.el-table__header th')
      .find(item => item.text().includes('模板名称'))
    expect(nameHeader.find('.caret-wrapper').exists()).toBe(false)
    const header = wrapper
      .findAll('.el-table__header th')
      .find(item => item.text().includes('配置主机数'))
    await header.find('.sort-caret.ascending').trigger('click')
    await flushPromises()
    expect(state(wrapper).paginatedData[0].id).toBe('id0')
    await wrapper.find('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(state(wrapper).currentPage).toBe(2)
    expect(state(wrapper).paginatedData[0].id).toBe('id10')
    expect(wrapper.find('.el-table__body td a').exists()).toBe(false)
    const records = wrapper
      .find('.el-table__body')
      .findAll('button')
      .find(item => item.text() === '执行记录')
    await records.trigger('click')
    expect(api.push).toHaveBeenCalledExactlyOnceWith({
      path: '/cac/results',
      query: { templateId: 'id10' }
    })
    expect(api.list).toHaveBeenCalledTimes(1)
  })
})
