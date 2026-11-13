import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { setLocale } from '@/core/i18n'
import ModelFormDialog from '@/modules/asset/components/model/ModelFormDialog.vue'
import AssetHistoryDialog from '@/modules/asset/components/asset-info/AssetHistoryDialog.vue'
import AssetEditDialog from '@/modules/asset/components/asset-info/AssetEditDialog.vue'
import DeleteAssetImportDialog from '@/modules/asset/components/asset-info/DeleteAssetImportDialog.vue'
import { ElMessageBox } from 'element-plus'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  attrs: vi.fn(),
  model: vi.fn(),
  update: vi.fn(),
  chart: { setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() },
  init: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { get: api.get, post: api.post } }))
vi.mock('@/modules/asset/api', () => ({
  assetApi: {
    getAssetAttrs: api.attrs,
    getAssetTypeByAssetId: api.model,
    updateAssetAttrs: api.update
  }
}))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false) }) }))
vi.mock('echarts', () => ({ init: api.init }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { alert: vi.fn().mockResolvedValue('confirm') }
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
  'el-switch': true,
  'el-checkbox': true,
  'el-tooltip': Slot,
  'el-button': Slot,
  'el-icon': true,
  'el-alert': true,
  'el-empty': true,
  'el-upload': true,
  IconPicker: true
}
const wrappers = []
async function open(component, props) {
  const wrapper = mount(component, {
    props: { modelValue: false, ...props },
    global: { stubs, directives: { loading() {} } }
  })
  wrappers.push(wrapper)
  await wrapper.setProps({ modelValue: true })
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
    data: [{ id: 'linux-template', code: 'linux', title: '原始模板名称' }]
  })
  api.post.mockResolvedValue({})
  api.attrs.mockResolvedValue({ id: 'asset-id', 负责人: '原始负责人' })
  api.model.mockResolvedValue({
    attrs: [{ code: '负责人', title: '后端中文字段', editable: true, type: 'string' }]
  })
  api.update.mockResolvedValue({})
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
describe('asset type, detail and import localization', () => {
  it('refreshes existing model validation errors without losing model drafts or template IDs', async () => {
    const wrapper = await open(ModelFormDialog)
    const vm = wrapper.vm.$.setupState
    vm.formData.title = '用户输入的中文类型'
    vm.formData.code = 'invalid-code'
    await vm.formRef.validateField('code').catch(() => {})
    const attrs = vm.formData.attrs
    for (const locale of ['en-US', 'zh-CN', 'en-US']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(vm.formData.title).toBe('用户输入的中文类型')
      expect(vm.formData.code).toBe('invalid-code')
      expect(vm.formData.templateId).toBe('linux-template')
      expect(vm.formData.attrs).toBe(attrs)
      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.post).not.toHaveBeenCalled()
    }
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Codes must start with an English letter')
    )
    expect(vm.formRef.fields.filter(f => f.validateState === 'error').map(f => f.prop)).toEqual([
      'code'
    ])
    vm.formData.code = 'custom_type'
    await vm.handleSave()
    expect(api.post.mock.calls[0][1]).toMatchObject({
      code: 'custom_type',
      title: '用户输入的中文类型',
      template_id: 'linux-template',
      attrs: [{ title: 'Default', type: 'group' }]
    })
  })
  it('keeps raw Chinese field keys and editing drafts when local dialog text changes', async () => {
    const wrapper = await open(AssetEditDialog, { assetId: 'asset-id' })
    const vm = wrapper.vm.$.setupState
    vm.formData['负责人'] = '新的中文负责人'
    const attrs = vm.visibleAttrs
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Edit asset')
    expect(vm.formData['负责人']).toBe('新的中文负责人')
    expect(vm.visibleAttrs).toBe(attrs)
    expect(api.attrs).toHaveBeenCalledTimes(1)
    expect(api.model).toHaveBeenCalledTimes(1)
    await vm.handleSave()
    expect(api.update).toHaveBeenCalledExactlyOnceWith(
      'asset-id',
      expect.objectContaining({ 负责人: '新的中文负责人' })
    )
  })
  it('changes history series labels without refetching data or replacing the chart', async () => {
    api.post.mockResolvedValue({
      data: [{ time: 'raw-time', memfree_mb: '42', memtotal_mb: '128' }]
    })
    const wrapper = await open(AssetHistoryDialog, { assetId: 'asset-id' })
    const data = wrapper.vm.$.setupState.chartData
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.vm.$.setupState.chartData).toBe(data)
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/cmdb/api/cmdb/auto/hist/statistic/single/attr/asset-id/15',
      ['memtotal_mb', 'memfree_mb']
    )
    expect(api.init).toHaveBeenCalledTimes(1)
    expect(api.chart.dispose).not.toHaveBeenCalled()
    expect(api.chart.setOption.mock.lastCall[0].series).toMatchObject([
      { name: 'Free memory', data: [42] },
      { name: 'memtotal_mb', data: [128] }
    ])
  })
  it('escapes backend deletion errors while translating the result shell and preserving its uploaded file', async () => {
    const wrapper = await open(DeleteAssetImportDialog)
    const vm = wrapper.vm.$.setupState
    const file = new File(['raw workbook'], '删除文件.xlsx')
    vm.handleFileChange({ raw: file })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedFile).toBe(file)
    api.post.mockResolvedValue({
      data: {
        totalCount: 2,
        successCount: 1,
        failedCount: 1,
        errorMessages: ['后端中文 <script>alert(1)</script>'],
        successIps: ['192.0.2.1'],
        failedIps: ['192.0.2.2']
      }
    })
    await vm.handleUpload()
    expect(api.post.mock.calls[0][0]).toMatch(
      /\/cmdb\/api\/cmdb\/ci\/batch-delete-by-excel\?cacheBuster=/
    )
    expect(api.post.mock.calls[0][1].get('file').name).toBe('删除文件.xlsx')
    const [html, title] = ElMessageBox.alert.mock.calls[0]
    expect(title).toBe('Deletion results')
    expect(html).toContain('Processed: 2 records')
    expect(html).toContain('后端中文 &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })
})
