import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElMessage } from 'element-plus'
import Schema from 'async-validator'
import DataAddTagDialog from '@/modules/asset/components/data/DataAddTagDialog.vue'
import DataEditTagDialog from '@/modules/asset/components/data/DataEditTagDialog.vue'
import AddTagDialog from '@/modules/asset/components/asset-info/AddTagDialog.vue'
import { throwIfTagJobFailed } from '@/modules/asset/utils/tagJobResult'
import { TAG_NAME_FORMAT_MESSAGE } from '@/modules/asset/utils/tagNameRules'

const api = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: {
    getResourceTypes: vi
      .fn()
      .mockResolvedValue({ records: [{ code: 'windows', title: 'Windows' }] })
  },
  assetApi: { getCiTagsByCit: vi.fn().mockResolvedValue({ records: [] }) }
}))

const message =
  'The name can only be entered in English, Chinese and numbers and underscores and space, and no special symbols are allowed.'
const failure = () => [
  {
    status: 'ERROR',
    data: null,
    error: JSON.stringify({ message }),
    statsJson: null,
    detail: { statusCode: 400, contentType: 'application/problem+json' }
  }
]
const Form = defineComponent({
  setup(_props, { slots, expose }) {
    expose({ validate: async () => true, resetFields() {} })
    return () => h('div', slots.default?.())
  }
})
let validationErrors
// 使用 Element Plus 同款校验引擎读取组件实际规则；隔离表单的 DOM 和依赖装配。
const ValidatingForm = defineComponent({
  props: ['model', 'rules'],
  setup(props, { slots, expose }) {
    expose({
      async validate() {
        validationErrors = {}
        try {
          await new Schema(props.rules).validate(props.model, { firstFields: true })
          return true
        } catch (error) {
          validationErrors = error.fields
          throw error
        }
      },
      resetFields() {}
    })
    return () => h('div', slots.default?.())
  }
})
const Slot = { template: '<div><slot /></div>' }
const cases = [
  {
    label: '数据管理/资产总览新增标签',
    component: DataAddTagDialog,
    props: {},
    fields: { ciType: 'windows', name: 'bad@tag' },
    payload: { id: null, name: 'bad@tag', ciType: 'windows' },
    success: '添加成功'
  },
  {
    label: '数据管理/资产总览编辑标签',
    component: DataEditTagDialog,
    props: { tagData: { id: 'real-tag/a', ci_type: 'windows', name: 'old' } },
    fields: { name: 'bad@tag' },
    payload: { parentId: '', id: 'real-tag/a', name: 'bad@tag', ciIds: null, ciType: 'windows' },
    success: '保存成功'
  },
  {
    label: '资产清单添加标签',
    component: AddTagDialog,
    props: { ciIds: ['real-asset/a', 'real-asset/b'], assetType: 'windows' },
    fields: { operate: 'new', name: 'bad@tag' },
    payload: {
      parentId: '',
      name: 'bad@tag',
      ciIds: 'real-asset/a,real-asset/b',
      ciType: 'windows'
    },
    success: '添加标签成功'
  }
]
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(testCase, validateRules = false) {
  wrapper = mount(testCase.component, {
    props: {
      modelValue: false,
      ...testCase.props,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value })
    },
    global: {
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        },
        'el-form': validateRules ? ValidatingForm : Form,
        'el-form-item': Slot,
        'el-button': {
          props: ['loading'],
          template: '<button :disabled="loading"><slot /></button>'
        },
        ...Object.fromEntries(
          ['el-select', 'el-option', 'el-radio-group', 'el-radio'].map(name => [name, true])
        ),
        'el-input': validateRules ? ElInput : true
      }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  if (testCase.fields.operate) {
    state().formData.operate = testCase.fields.operate
    await flushPromises()
  }
  Object.assign(state().formData, testCase.fields)
}
async function save() {
  await wrapper
    .findAll('button')
    .find(button => button.text() === '保存')
    .trigger('click')
  await flushPromises()
}
function expectNameError(message) {
  expect(validationErrors.name[0].message).toBe(message)
}
beforeEach(() => {
  validationErrors = {}
  api.post.mockReset()
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each(cases)('$label 的 chq5Pe 业务结果反馈', testCase => {
  it('实际规则拒绝输入/粘贴的特殊字符，阻止保存并保留输入', async () => {
    api.post.mockResolvedValue({ data: [{ status: 'SUCCESS', error: null }] })
    await open(testCase, true)
    const input = wrapper.findComponent(ElInput).get('input')
    expect(input.attributes('placeholder')).toContain('中英文、数字、下划线和空格')
    expect(
      state().formRules.name.every(
        rule => rule.trigger.includes('blur') && rule.trigger.includes('change')
      )
    ).toBe(true)
    for (const invalid of ['bad@tag', '中文-标签', 'tag.name', '标签/一', 'tag😀', 'tab\tname']) {
      await input.setValue(invalid)
      await save()
      expectNameError(TAG_NAME_FORMAT_MESSAGE)
      expect(api.post).not.toHaveBeenCalled()
      expect(wrapper.props('modelValue')).toBe(true)
      expect(state().formData.name).toBe(invalid)
    }
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('空值/纯空格仍是必填错误，末尾换行不能绕过格式规则', async () => {
    await open(testCase, true)
    const input = wrapper.findComponent(ElInput).get('input')
    for (const empty of ['', '   ']) {
      await input.setValue(empty)
      await save()
      expectNameError('请输入标签名称')
      expect(api.post).not.toHaveBeenCalled()
    }
    // 单行输入框会移除换行，直接改模型验证规则自身也不会接受末尾换行。
    state().formData.name = 'tag\n'
    await flushPromises()
    await save()
    expectNameError(TAG_NAME_FORMAT_MESSAGE)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('非法名称修正为中英文/数字/下划线/普通空格后可以原样提交', async () => {
    api.post.mockResolvedValueOnce({ data: [{ status: 'SUCCESS', error: null }] })
    await open(testCase, true)
    const input = wrapper.findComponent(ElInput).get('input')
    await input.setValue('bad@tag')
    await save()
    expectNameError(TAG_NAME_FORMAT_MESSAGE)
    expect(api.post).not.toHaveBeenCalled()
    const valid = '中文 English_123 Tag'
    await input.setValue(valid)
    await save()
    expect(validationErrors).toEqual({})
    expect(api.post).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
      params: { ...testCase.payload, name: valid }
    })
    expect(wrapper.emitted('saved')).toEqual([[]])
  })

  it('HTTP成功但返回用户提供的ERROR数组时显示原因、留窗留输入且不发saved', async () => {
    api.post.mockResolvedValueOnce({ status: 200, data: failure() })
    await open(testCase)
    await save()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\/workflow\/api\/workflow\/jobs\/chq5Pe\/run\?cacheBuster=\d+$/),
      { params: testCase.payload }
    )
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining(message))
    expect(wrapper.props('modelValue')).toBe(true)
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(state().formData).toMatchObject(testCase.fields)
    expect(state().saving).toBe(false)
  })

  it('失败后修正重试，正常结果仍沿原成功提示、自动关闭和saved回调', async () => {
    api.post.mockResolvedValueOnce({ data: failure() }).mockResolvedValueOnce({
      data: [
        { status: 'SUCCESS', data: { id: 'real-tag/a' }, error: null, detail: { statusCode: 200 } }
      ]
    })
    await open(testCase)
    await save()
    expect(wrapper.props('modelValue')).toBe(true)
    state().formData.name = 'valid_tag'
    await save()
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls.at(-1)[1].params.name).toBe('valid_tag')
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith(testCase.success)
    expect(wrapper.props('modelValue')).toBe(false)
    expect(wrapper.emitted('saved')).toEqual([[]])
  })
})

describe('标签作业返回结构及失败原因', () => {
  it('选择已有标签不要求新标签名称，仍使用原资产/标签关联参数', async () => {
    api.post.mockResolvedValueOnce({ data: [{ status: 'SUCCESS', error: null }] })
    await open(cases[2], true)
    state().formData.operate = 'select'
    await flushPromises()
    state().formData.parentId = 'existing-tag/a'
    await flushPromises()
    expect(wrapper.findComponent(ElInput).exists()).toBe(false)
    await save()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
      params: {
        parentId: 'existing-tag/a',
        name: '',
        ciIds: 'real-asset/a,real-asset/b',
        ciType: 'windows'
      }
    })
    expect(wrapper.emitted('saved')).toEqual([[]])
  })

  it.each([
    ['原始数组', () => failure(), message],
    ['单对象', () => ({ ...failure()[0], data: {}, error: { message: '名称重复' } }), '名称重复'],
    [
      '普通错误文本',
      () => ({ data: [{ status: 'FAILED', error: '标签创建失败' }] }),
      '标签创建失败'
    ],
    ['混合结果中的失败', () => ({ data: [{ status: 'SUCCESS' }, ...failure()] }), message],
    [
      '内层HTTP错误',
      () => ({ data: [{ status: 'SUCCESS', error: null, detail: { statusCode: 400 } }] }),
      '标签操作失败'
    ],
    ['缺少错误原因', () => ({ data: [{ status: 'ERROR', error: null }] }), '标签操作失败']
  ])('%s 不能遗漏业务失败', (_label, buildResponse, expected) => {
    expect(() => throwIfTagJobFailed(buildResponse())).toThrow(expected)
  })

  it('普通HTTP请求异常仍走原catch，资产选择已有标签仍传原关联参数', async () => {
    const testCase = cases[2]
    api.post.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({
      data: [{ status: 'SUCCESS', error: null }]
    })
    await open(testCase)
    await save()
    expect(wrapper.props('modelValue')).toBe(true)
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('Network Error'))
    state().formData.operate = 'select'
    await flushPromises()
    state().formData.parentId = 'existing-tag/a'
    await save()
    expect(api.post.mock.calls.at(-1)[1]).toEqual({
      params: {
        parentId: 'existing-tag/a',
        name: '',
        ciIds: 'real-asset/a,real-asset/b',
        ciType: 'windows'
      }
    })
    expect(wrapper.emitted('saved')).toEqual([[]])
  })
})
