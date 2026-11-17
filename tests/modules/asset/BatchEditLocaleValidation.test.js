import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale, t } from '@/core/i18n'
import BatchEditDialog from '@/modules/asset/components/asset-info/BatchEditDialog.vue'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const api = vi.hoisted(() => ({ getModel: vi.fn(), post: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({ assetApi: { getModel: api.getModel } }))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }
}))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
let wrapper
const state = () => wrapper.vm.$.setupState
const errors = () => wrapper.findAll('.el-form-item__error').map(error => error.text())

async function open() {
  wrapper = mount(BatchEditDialog, {
    props: { modelValue: false, ciIds: ['original-ci-id'], assetType: 'original-type' },
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-select': Slot,
        'el-option': true,
        'el-input': true,
        'el-alert': true
      },
      directives: { loading() {} }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
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
  await setLocale('en-US', { persist: false })
  api.getModel.mockResolvedValue({
    records: [{ code: '负责人', title: '后端中文属性', editable: true, type: 'string' }]
  })
})
afterEach(async () => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('资产批量编辑校验语言', () => {
  it('只更新已有错误的文字，不对未操作字段新增错误或提交保存', async () => {
    await open()
    await state()
      .formRef.validateField('value')
      .catch(() => {})
    await flushPromises()
    await vi.waitFor(() => expect(errors()).toEqual(['Enter an attribute value']))
    const fields = state().formRef.fields
    expect(fields.find(field => field.prop === 'code').validateState).toBe('')

    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    await vi.waitFor(() => expect(errors()).toEqual(['请输入属性值']))
    expect(fields.find(field => field.prop === 'code').validateState).toBe('')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    await vi.waitFor(() => expect(errors()).toEqual(['Enter an attribute value']))
    expect(api.getModel).toHaveBeenCalledExactlyOnceWith('original-type')
    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('保留属性代码、输入草稿、选择的资产与已加载模型，保持未校验状态', async () => {
    await open()
    Object.assign(state().formData, { code: '负责人', value: '原始中文负责人 #{raw}' })
    const draft = state().formData
    const attributes = state().editableAttrs
    for (const locale of ['zh-CN', 'en-US', 'zh-CN']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(errors()).toEqual([])
      expect(state().formData).toBe(draft)
      expect(state().editableAttrs).toBe(attributes)
      expect(state().formData).toEqual({ code: '负责人', value: '原始中文负责人 #{raw}' })
      expect(wrapper.props('ciIds')).toEqual(['original-ci-id'])
      expect(state().formRules.value[0].message).toBe(t('asset.enterAttrValue'))
    }
    expect(api.getModel).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })
})
