import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { setLocale } from '@/core/i18n'
import KpiCards from '@/modules/asset/components/exception/KpiCards.vue'
import DataAddGroupDialog from '@/modules/asset/components/data/DataAddGroupDialog.vue'
import GroupAssetDialog from '@/modules/asset/components/data/GroupAssetDialog.vue'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  groups: vi.fn(),
  types: vi.fn(),
  chart: { setOption: vi.fn(), on: vi.fn(), resize: vi.fn(), dispose: vi.fn() },
  init: vi.fn()
}))
vi.mock('echarts', () => ({ init: api.init }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false) }) }))
vi.mock('@/core/api', () => ({ apiService: { get: api.get, post: api.post } }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: { getResourceTypes: api.types },
  assetApi: { getGroupByCit: api.groups }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Input = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const stubs = {
  'el-dialog': {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /><slot name="footer" /></section>'
  },
  'el-form': ElForm,
  'el-form-item': ElFormItem,
  'el-input': Input,
  'el-select': Slot,
  'el-option': Slot,
  'el-button': Slot,
  'el-table': Slot,
  'el-table-column': {
    props: ['label', 'prop'],
    template: '<span :data-field="prop">{{ label }}</span>'
  },
  'el-tooltip': Slot,
  'el-pagination': true
}
const wrappers = []
async function open(component, props = {}) {
  const wrapper = mount(component, { props, global: { stubs, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  api.init.mockReturnValue(api.chart)
  api.get.mockResolvedValue({
    data: {
      records: [{ id: '原始资产-ID', 业务系统: '原始业务系统', 负责人: '原始负责人' }],
      total: 1
    }
  })
  api.types.mockResolvedValue({ records: [{ code: 'linux', title: '后端资产类型' }] })
  api.groups.mockResolvedValue({ records: [{ id: 'parent-id', path: '/原始上级分组' }] })
  api.post.mockResolvedValue({ status: 'COMPLETED' })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
describe('asset localization preserves operational state', () => {
  it('updates KPI chart text on the same instance while retaining counts and query conditions', async () => {
    const data = Object.freeze([
      { status: '0', count: 10 },
      { status: '1', count: 20 }
    ])
    const wrapper = await open(KpiCards, { data }),
      vm = wrapper.vm.$.setupState
    const stats = vm.parsedStats
    await setLocale('en-US', { persist: false })
    await flushPromises()
    const option = api.chart.setOption.mock.lastCall[0]
    expect(option.title.subtext).toBe('Connectivity rate')
    expect(option.series[0].data.map(item => item.value)).toEqual([10, 20])
    expect(option.series[0].data.map(item => item.condi)).toEqual(['recently_ok', 'recently'])
    expect(option.series[0].data.map(item => item.name)).toEqual(['Connected', 'Disconnected'])
    expect(option.tooltip.formatter({ name: 'Connected', value: 10, percent: 33.3 })).toBe(
      'Connected: 10 (33.3%)'
    )
    expect(vm.parsedStats).toBe(stats)
    expect(api.init).toHaveBeenCalledTimes(1)
    expect(api.chart.dispose).not.toHaveBeenCalled()
    vm.handleItemClick('recently')
    expect(wrapper.emitted('click')).toEqual([[{ conditions: 'recently' }]])
  })
  it('refreshes only existing group validation errors and preserves raw save parameters', async () => {
    const wrapper = await open(DataAddGroupDialog, { modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    const vm = wrapper.vm.$.setupState
    vm.formData.parentId = 'parent-id'
    await vm.formRef.validateField('name').catch(() => {})
    await vi.waitFor(() => expect(wrapper.text()).toContain('请输入分组名称'))
    await setLocale('en-US', { persist: false })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Enter a group name'))
    expect(vm.formData.ciType).toBe('linux')
    expect(vm.formData.parentId).toBe('parent-id')
    expect(
      vm.formRef.fields.filter(field => field.validateState === 'error').map(field => field.prop)
    ).toEqual(['name'])
    expect(api.groups).toHaveBeenCalledExactlyOnceWith('linux')
    expect(api.types).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
    vm.formData.name = '原始中文分组 #{raw}'
    await vm.handleSave()
    expect(api.post.mock.calls[0][0]).toMatch(/\/jobs\/a17VXM\/run\?cacheBuster=/)
    expect(api.post.mock.calls[0][1]).toEqual({
      params: {
        operate: 'new',
        ciIds: null,
        id: null,
        name: '原始中文分组 #{raw}',
        parentId: 'parent-id',
        ciType: 'linux'
      }
    })
  })
  it('translates asset column labels while keeping Chinese backend field keys and selection unchanged', async () => {
    const wrapper = await open(GroupAssetDialog, {
      modelValue: false,
      groupData: { id: 'raw-group', path: '/原始分组' }
    })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    const vm = wrapper.vm.$.setupState,
      rows = vm.assetList
    vm.handleSelectionChange(rows)
    vm.keyword = '草稿'
    vm.pagination.page = 2
    const selected = vm.selectedRows
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.find('[data-field="业务系统"]').text()).toBe('Business system')
    expect(wrapper.find('[data-field="负责人"]').text()).toBe('Owner')
    expect(vm.assetList).toBe(rows)
    expect(vm.selectedRows).toBe(selected)
    expect(rows[0]['业务系统']).toBe('原始业务系统')
    expect(vm.pagination.page).toBe(2)
    expect(vm.keyword).toBe('草稿')
    expect(wrapper.text()).toContain('Selected: 1')
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/cmdb/api/cmdb/ci/attrs/group', {
      params: { groupId: 'raw-group', size: 10, page: 1, filter: '' }
    })
    expect(api.post).not.toHaveBeenCalled()
  })
})
