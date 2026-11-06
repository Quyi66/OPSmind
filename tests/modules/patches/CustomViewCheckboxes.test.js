import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElCheckbox, ElCheckboxGroup, ElMessage } from 'element-plus'
import Dialog from '@/modules/patches/components/host-detail/dialogs/CustomViewDialog.vue'

const api = vi.hoisted(() => ({
  getAttrs: vi.fn(),
  getViewConfig: vi.fn(),
  saveViewConfig: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ viewConfigApi: api }))
const Slot = { template: '<div><slot /></div>' }
let wrapper
const groups = () => wrapper.findAllComponents(ElCheckboxGroup)
const checkbox = (index, code) =>
  groups()
    [index].findAllComponents(ElCheckbox)
    .find(item => item.props('value') === code)
async function open() {
  wrapper = mount(Dialog, {
    props: { modelValue: false },
    global: {
      components: { ElCheckbox, ElCheckboxGroup },
      directives: { loading() {} },
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
        },
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-radio-group': Slot,
        'el-radio': Slot,
        'el-alert': true,
        'el-button': { template: '<button><slot /></button>' }
      }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  api.getAttrs.mockResolvedValue({ data: [] })
  api.getViewConfig.mockResolvedValue({
    data: {
      viewJson: {
        listColumns: ['HOSTNAME', 'OS'],
        overviewCard: { groups: [{ title: '详细信息', attrs: ['OS', 'OWNER'] }] }
      }
    }
  })
  api.saveViewConfig.mockResolvedValue({})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('自定义视图复选框组', () => {
  it('数组仅绑定到复选框组，打开和勾选都不再触发单个 checkbox 的属性类型警告', async () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await open()
    expect(groups()).toHaveLength(2)
    expect(groups()[0].props('modelValue')).toEqual(['HOSTNAME', 'OS'])
    expect(checkbox(0, 'HOSTNAME').get('input').element.checked).toBe(true)
    expect(checkbox(0, 'OWNER').get('input').element.checked).toBe(false)
    await checkbox(0, 'OWNER').get('input').setValue(true)
    await flushPromises()
    expect(groups()[0].props('modelValue')).toEqual(['HOSTNAME', 'OS', 'OWNER'])
    expect(warnings.mock.calls.flat().join(' ')).not.toContain('Invalid prop')
    expect(api.saveViewConfig).not.toHaveBeenCalled()
  })

  it('列表列与详情属性独立勾选，保存仍按各自展示顺序输出数组', async () => {
    await open()
    await checkbox(0, 'HOSTNAME').get('input').setValue(false)
    await checkbox(0, 'OWNER').get('input').setValue(true)
    await checkbox(1, 'OWNER').get('input').setValue(false)
    await checkbox(1, 'HOSTNAME').get('input').setValue(true)
    await flushPromises()
    wrapper
      .findAll('button')
      .find(button => button.text() === '保存并应用视图')
      .trigger('click')
    await flushPromises()
    expect(api.saveViewConfig).toHaveBeenCalledExactlyOnceWith({
      ciType: 'host',
      scope: 'user',
      viewJson: {
        listColumns: ['OS', 'OWNER'],
        overviewCard: { groups: [{ title: '详细信息', attrs: ['OS', 'HOSTNAME'] }] }
      }
    })
  })
})
