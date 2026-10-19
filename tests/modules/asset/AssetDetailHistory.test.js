import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import AssetInfoPage from '@/modules/asset/views/AssetInfoPage.vue'
import AssetDetailDialog from '@/modules/asset/components/asset-info/AssetDetailDialog.vue'
import AssetHistoryDialog from '@/modules/asset/components/asset-info/AssetHistoryDialog.vue'

const api = vi.hoisted(() => ({
  post: vi.fn(),
  getAssetTypes: vi.fn(),
  getAssetAttrs: vi.fn(),
  getAssetTypeByAssetId: vi.fn(),
  getViewConfig: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('@/modules/asset/api', () => ({
  assetApi: api,
  dataManageApi: { getCurrentTenantId: vi.fn().mockResolvedValue('tenant') }
}))
vi.mock('@/modules/patches/api', () => ({ viewConfigApi: api }))
vi.mock('@/composables/useJobPolling', () => ({ pollJobStatus: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false) }) }))
vi.mock('echarts', () => ({ init: vi.fn() }))
vi.mock('@/modules/asset/components/asset-info/AssetSidebar.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/AssetEditDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/AutoEntryDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/ImportAssetDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/DeleteAssetImportDialog.vue', () => ({
  default: {}
}))
vi.mock('@/modules/asset/components/asset-info/BatchEditDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/AddTagDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/asset/components/asset-info/AddGroupDialog.vue', () => ({ default: {} }))
vi.mock('@/modules/patches/components/host-detail/dialogs/CustomViewDialog.vue', () => ({
  default: {}
}))
vi.mock('@/modules/patches/components/host-detail/dialogs/BatchLocationDialog.vue', () => ({
  default: {}
}))

// Keep the real page and both real read-only dialogs; omit UI layout and charts.
const Layer = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue', 'close'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('section', [slots.default?.(), slots.footer?.()]) : null)
  }
})
const Button = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const detail = () => wrapper.findComponent(AssetDetailDialog)
const history = () => wrapper.findComponent(AssetHistoryDialog)
const shortcut = () =>
  detail()
    .findAll('button')
    .find(button => button.text() === '历史趋势')

async function openPage() {
  wrapper = shallowMount(AssetInfoPage, {
    global: {
      stubs: {
        AssetDetailDialog: false,
        AssetHistoryDialog: false,
        'el-drawer': Layer,
        'el-dialog': Layer,
        'el-button': Button,
        ...Object.fromEntries(
          [
            'ElTabs',
            'ElTabPane',
            'ElOption',
            'ElSelect',
            'ElIcon',
            'ElTooltip',
            'ElDropdownItem',
            'ElDropdownMenu',
            'ElDropdown',
            'ElTableColumn',
            'ElTag',
            'ElLink',
            'ElProgress',
            'ElAvatar',
            'ElTable',
            'ElPagination',
            'ElDescriptions',
            'ElDescriptionsItem',
            'ElEmpty'
          ].map(name => [name, true])
        )
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getAssetTypes.mockResolvedValue({ records: [] })
  api.getAssetAttrs.mockResolvedValue({ HOSTNAME: 'host' })
  api.getAssetTypeByAssetId.mockResolvedValue({ attrs: [] })
  api.getViewConfig.mockResolvedValue({})
  api.post.mockResolvedValue({ data: [] })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('资产详情直达已有历史趋势', () => {
  it('点击前不查趋势，点击后用同一资产和原参数查询，关闭趋势回到详情并保留列表上下文', async () => {
    await openPage()
    const row = Object.freeze({ id: 'asset-a', IP: '192.0.2.1' })
    state().searchText = 'example'
    state().filters.status = '1'
    state().currentPage = 3
    state().selectedRows = [row]
    state().handleView(row)
    await flushPromises()
    expect(api.post).not.toHaveBeenCalled()
    expect(detail().props('assetId')).toBe(row.id)
    await shortcut().trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/cmdb/api/cmdb/auto/hist/statistic/single/attr/asset-a/15',
      ['memtotal_mb', 'memfree_mb']
    )
    expect(history().props()).toMatchObject({ modelValue: true, assetId: row.id, assetIp: row.IP })
    history().findComponent(Layer).vm.$emit('close')
    await flushPromises()
    expect(history().props('modelValue')).toBe(false)
    expect(detail().props('modelValue')).toBe(true)
    expect(api.getAssetAttrs).toHaveBeenCalledExactlyOnceWith(row.id)
    expect(state().searchText).toBe('example')
    expect(state().filters.status).toBe('1')
    expect(state().currentPage).toBe(3)
    expect(state().selectedRows).toEqual([row])
  })

  it('先从原历史入口查看 A 再从详情查看 B，使用 B 的真实 ID，缺 IP 不沿用 A', async () => {
    await openPage()
    state().handleHistory({ id: 'asset-a', IP: '192.0.2.1' })
    await flushPromises()
    history().findComponent(Layer).vm.$emit('close')
    await flushPromises()
    state().handleView(Object.freeze({ id: 'asset-b' }))
    await flushPromises()
    await shortcut().trigger('click')
    await flushPromises()
    expect(history().props()).toMatchObject({ assetId: 'asset-b', assetIp: '' })
    expect(api.post.mock.calls).toEqual([
      ['/cmdb/api/cmdb/auto/hist/statistic/single/attr/asset-a/15', ['memtotal_mb', 'memfree_mb']],
      ['/cmdb/api/cmdb/auto/hist/statistic/single/attr/asset-b/15', ['memtotal_mb', 'memfree_mb']]
    ])
  })

  it('趋势查询失败仍保留详情，关闭后可从原详情重试', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await openPage()
    state().handleView({ id: 'asset-a', IP: '192.0.2.1' })
    await flushPromises()
    api.post.mockRejectedValueOnce(new Error('read failed'))
    await shortcut().trigger('click')
    await flushPromises()
    expect(error).toHaveBeenCalledWith('加载历史数据失败')
    expect(detail().props('modelValue')).toBe(true)
    history().findComponent(Layer).vm.$emit('close')
    await flushPromises()
    await shortcut().trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.getAssetAttrs).toHaveBeenCalledTimes(1)
  })
})
