import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  ElTabs,
  ElTabPane,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElMessage
} from 'element-plus'
import ModelEditor from '@/modules/asset/views/ModelEditor.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))

const linux = { id: 'linux-original-id', code: 'linux', title: 'Linux服务器' }
const other = { id: 7, code: 'windows', title: 'Windows主机' }
const defaultGroup = () => ({
  code: null,
  title: 'Default',
  type: 'group',
  unique: false,
  required: false,
  editable: true,
  importable: true,
  display: {},
  input: {}
})
const defaultViews = () => [
  { type: 'list', config: { columns: [] } },
  { type: 'selector', config: { columns: [] } },
  { type: 'detail', config: {} },
  { type: 'editor', config: {} }
]
const expectedNew = templateId => ({
  code: 'server_model',
  title: '服务器模型',
  icon: '',
  isAuto: 0,
  attrs: [defaultGroup()],
  views: defaultViews(),
  template_id: templateId
})
const existingModel = () => ({
  id: 'existing-id',
  code: 'existing_code',
  title: '已有模型',
  icon: 'fa fa-server',
  isAuto: 1,
  template_id: 'existing-template',
  tenantId: 'original-tenant',
  actions: [{ code: 'original-action' }],
  attrs: [
    {
      code: 'IP',
      title: '地址',
      type: 'string',
      required: true,
      unique: true,
      editable: false,
      importable: false,
      display: { converter: 'original' },
      input: { control: 'input' }
    }
  ],
  views: [
    { type: 'list', config: { columns: [{ attr: 'IP' }] } },
    { type: 'selector', config: { columns: [{ attr: 'IP' }] } },
    { type: 'detail', config: {}, data: 'js:original' },
    { type: 'editor', config: {} }
  ]
})
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
const tabs = () => wrapper.findAll('[role="tab"]').map(item => item.text())
const templateSelect = () =>
  wrapper.findAllComponents(ElSelect).find(item => item.props('placeholder') === '不使用模板')
async function chooseTemplate(id) {
  templateSelect().vm.$emit('update:modelValue', id)
  await flushPromises()
}
async function fillBasic() {
  await wrapper.findComponent(ElInput).find('input').setValue('server_model')
  await wrapper.findAllComponents(ElInput)[1].find('input').setValue('服务器模型')
}
async function open(modelId = 'new') {
  wrapper = mount(ModelEditor, {
    props: { modelId },
    global: {
      components: { ElTabs, ElTabPane, ElForm, ElFormItem, ElInput, ElSelect, ElOption },
      stubs: {
        'el-tabs': false,
        'el-tab-pane': false,
        'el-select': false,
        'el-option': false,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-button': Button,
        IconPicker: true,
        ViewColumnConfig: true,
        DataConverterInput: true,
        'el-checkbox': true,
        'el-collapse': true,
        'el-collapse-item': true,
        'el-input-number': true,
        'el-tooltip': true
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation(async url => ({
    data: url.includes('/vo/citid/') ? existingModel() : [other, linux]
  }))
  api.post.mockResolvedValue({})
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
  wrapper = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('新建资产模型使用原模板与原请求', () => {
  it('按真实 code 选 Linux 原 ID，仅基本信息即可保存；默认组和四视图保持原值', async () => {
    await open()
    expect(state().formData.templateId).toBe(linux.id)
    expect(tabs()).toEqual(['基本信息'])
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get.mock.calls[0][0]).toMatch(/^\/cmdb\/api\/cmdb\/cit\?cacheBuster=\d+$/)
    await fillBasic()
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\/cmdb\/api\/cmdb\/cit\/modify\/batch\?cacheBuster=\d+$/),
      expectedNew(linux.id)
    )
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('清空模板才显示属性/视图，重新选模板回基本信息且不清空已输入配置', async () => {
    await open()
    await chooseTemplate('')
    expect(tabs()).toEqual(['基本信息', '模型属性', '视图定义'])
    const custom = {
      _id: 'ui-id',
      code: 'serial',
      title: '序列号',
      type: 'string',
      unique: true,
      required: false,
      editable: true,
      importable: false,
      display: { converter: 'original-converter' },
      input: { control: 'input' }
    }
    state().formData.attrs.push(custom)
    state().listColumns = ['serial']
    state().selectorColumns = ['serial']
    state().detailViewData = 'js:original-script'
    state().activeTab = 'attrs'
    await chooseTemplate(other.id)
    expect(tabs()).toEqual(['基本信息'])
    expect(state().activeTab).toBe('basic')
    expect(state().formData.attrs[1]).toEqual(custom)
    await fillBasic()
    await state().handleSave()
    const expected = expectedNew(other.id)
    const { _id, ...rawAttr } = custom
    expected.attrs.push(rawAttr)
    expected.views[0].config.columns = [{ attr: 'serial' }]
    expected.views[1].config.columns = [{ attr: 'serial' }]
    expected.views[2].data = 'js:original-script'
    expect(api.post.mock.calls[0][1]).toEqual(expected)
    await chooseTemplate('')
    expect(state().listColumns).toEqual(['serial'])
    expect(state().formData.attrs[1]).toEqual(custom)
  })

  it('模板列表确实为空时提供手动配置入口，未选择模板仍按原 0 和默认值提交', async () => {
    api.get.mockResolvedValue({ data: [] })
    await open()
    expect(tabs()).toEqual(['基本信息', '模型属性', '视图定义'])
    await fillBasic()
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(expectedNew('0'))
  })

  it('没有 Linux 时不猜模板 ID；可选其他真实模板，保留数字类型原值', async () => {
    api.get.mockResolvedValue({ data: [other] })
    await open()
    expect(state().formData.templateId).toBe('')
    expect(tabs()).toContain('模型属性')
    await chooseTemplate(other.id)
    expect(tabs()).toEqual(['基本信息'])
    await fillBasic()
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(expectedNew(7))
  })

  it('模板读取失败不误当空列表，禁止保存；原请求重试保留已填基本信息', async () => {
    api.get.mockRejectedValueOnce(new Error('read failed'))
    await open()
    expect(wrapper.text()).toContain('资产模板加载失败，请重试')
    expect(tabs()).toEqual(['基本信息'])
    await fillBasic()
    expect(button('保存').element.disabled).toBe(true)
    await state().handleSave()
    expect(api.post).not.toHaveBeenCalled()
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().formData.code).toBe('server_model')
    expect(state().formData.templateId).toBe(linux.id)
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(expectedNew(linux.id))
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('模板加载期间不允许提前创建，返回真实模板后保持用户输入', async () => {
    let finish
    api.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    await open()
    await fillBasic()
    expect(templateSelect().props('disabled')).toBe(true)
    expect(tabs()).toEqual(['基本信息'])
    await state().handleSave()
    expect(api.post).not.toHaveBeenCalled()
    finish({ data: [linux] })
    await flushPromises()
    expect(state().formData.title).toBe('服务器模型')
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(expectedNew(linux.id))
  })

  it('编辑原模型保留三个入口及完整原字段，不替换原 template_id 或请求结构', async () => {
    await open('existing-id')
    expect(tabs()).toEqual(['基本信息', '模型属性', '视图定义'])
    expect(templateSelect()).toBeUndefined()
    expect(api.get.mock.calls[0][0]).toMatch(
      /^\/cmdb\/api\/cmdb\/cit\/vo\/citid\/existing-id\?cacheBuster=\d+$/
    )
    await state().handleSave()
    const expected = existingModel()
    expect(api.post.mock.calls[0][1]).toEqual(expected)
  })

  it('新建模板旧响应在切到编辑后失效，不覆盖编辑字段或隐藏原配置入口', async () => {
    let finish
    api.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    await open()
    await wrapper.setProps({ modelId: 'existing-id' })
    await flushPromises()
    finish({ data: [linux] })
    await flushPromises()
    expect(state().formData.code).toBe('existing_code')
    expect(state().templateList).toEqual([])
    expect(tabs()).toHaveLength(3)
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(existingModel())
  })

  it('编辑详情旧响应在切回新建后失效，新建原默认数据及模板正确', async () => {
    let finish
    api.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    await open('existing-id')
    await wrapper.setProps({ modelId: 'new' })
    await flushPromises()
    finish({ data: existingModel() })
    await flushPromises()
    expect(state().formData.code).toBe('')
    expect(state().formData.templateId).toBe(linux.id)
    await fillBasic()
    await state().handleSave()
    expect(api.post.mock.calls[0][1]).toEqual(expectedNew(linux.id))
  })

  it('保存失败保留基本信息和模板，原参数重试；提交中阻止重复保存', async () => {
    api.post.mockRejectedValueOnce(new Error('mock failure'))
    await open()
    await fillBasic()
    await state().handleSave()
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(state().formData.templateId).toBe(linux.id)
    let finish
    api.post.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    const pending = state().handleSave()
    await flushPromises()
    await state().handleSave()
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls[1][1]).toEqual(api.post.mock.calls[0][1])
    expect(button('保存').element.disabled).toBe(true)
    finish({})
    await pending
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })
})
