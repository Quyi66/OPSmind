import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import PasswordSettingsPage from '@/modules/password/views/PasswordSettingsPage.vue'
import CheckPasswordStateDialog from '@/modules/password/components/CheckPasswordStateDialog.vue'
import AdminPanelView from '@/modules/password/components/AdminPanelView.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: http }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/password/components/BatchModifyDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/password/components/SelectModifyDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/password/components/RevertPasswordDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/password/components/ImportInitPasswordDialog.vue', () => ({
  default: { template: '<div />' }
}))

const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Dialog = {
  props: ['modelValue', 'showClose'],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
}
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
const Input = {
  props: ['modelValue', 'value', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue ?? value" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const parameter = Object.freeze({
  id: 'system-param/42',
  type: 'PASSWORD_CONFIG',
  param_name: 'PASSWORD_STRENGTH',
  expression: '原始策略',
  description: '原始备注'
})
const editedPayload = {
  id: parameter.id,
  type: parameter.type,
  paramName: parameter.param_name,
  expression: '保留策略表达式 [A-Z] + 数字',
  description: '保留未保存备注'
}
const errorReceipt = {
  status: 200,
  data: [{ status: 'ERROR', runId: 'failed-run', error: '{"message":"作业参数校验失败"}' }]
}
const failures = [
  ['HTTP200 ERROR数组带runId', errorReceipt, '作业参数校验失败'],
  ['直接ERROR且error为空', { status: 'ERROR', error: null }, null],
  [
    '混合成败数组',
    [{ status: 'COMPLETED' }, { status: 'FAILED', error: '其中一项失败' }],
    '其中一项失败'
  ],
  [
    '完成回执包含内层400',
    { data: { status: 'COMPLETED', detail: { statusCode: 400 }, message: '参数不合法' } },
    '参数不合法'
  ]
]
const wrappers = []
const stateOf = wrapper => wrapper.vm.$.setupState
const button = (wrapper, label) => wrapper.findAll('button').find(item => item.text() === label)

function mount(component, props = {}, extraStubs = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      directives: { loading() {} },
      stubs: {
        'el-dialog': Dialog,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-button': Button,
        'el-input': Input,
        'el-table': true,
        'el-table-column': true,
        'el-pagination': true,
        'el-icon': Slot,
        'el-alert': true,
        'el-breadcrumb': true,
        'el-breadcrumb-item': true,
        'el-tag': true,
        ...extraStubs
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

async function openSettings() {
  const wrapper = mount(PasswordSettingsPage)
  await flushPromises()
  stateOf(wrapper).handleEdit(stateOf(wrapper).tableData[0])
  await flushPromises()
  const inputs = wrapper.findAll('input')
  await inputs.at(-2).setValue(editedPayload.expression)
  await inputs.at(-1).setValue(editedPayload.description)
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  http.get.mockImplementation(url => {
    if (url === '/dashboard/api/sys/dashboard/pms-system-param') {
      return Promise.resolve({ data: [parameter] })
    }
    if (url === '/dashboard/api/sys/dashboard/pms-server') {
      return Promise.resolve({ data: [{ id: 'asset/42', host_key: 'host-key', username: 'user' }] })
    }
    throw new Error(`Unexpected GET ${url}`)
  })
  http.post.mockResolvedValue(errorReceipt)
})

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('密码参数保存回执', () => {
  it.each(failures)('%s不成功、关窗或刷新，保留原输入和参数', async (_name, receipt, message) => {
    http.post.mockResolvedValue(receipt)
    const wrapper = await openSettings()
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith(message || '保存失败')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(stateOf(wrapper).editDialogVisible).toBe(true)
    expect(stateOf(wrapper).saving).toBe(false)
    expect(stateOf(wrapper).editForm).toEqual({
      ...parameter,
      expression: editedPayload.expression,
      description: editedPayload.description
    })
    expect(stateOf(wrapper).tableData).toEqual([parameter])
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\/workflow\/api\/workflow\/jobs\/zRQjPA\/run\?cacheBuster=\d+$/),
      { params: editedPayload }
    )
  })

  it('失败后手动重试成功才关闭和刷新，保留同一设置正文', async () => {
    const wrapper = await openSettings()
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(1)
    http.post.mockResolvedValue({ data: [{ status: 'COMPLETED', error: null }] })
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(2)
    expect(http.post.mock.calls[1][1]).toEqual({ params: editedPayload })
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('保存成功')
    expect(stateOf(wrapper).editDialogVisible).toBe(false)
    expect(stateOf(wrapper).saving).toBe(false)
    expect(http.get).toHaveBeenCalledTimes(2)
  })

  it('网络拒绝保留编辑并显示原因', async () => {
    http.post.mockRejectedValue(new Error('连接已中断'))
    const wrapper = await openSettings()
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith('连接已中断')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(stateOf(wrapper).editDialogVisible).toBe(true)
    expect(stateOf(wrapper).editForm.expression).toBe(editedPayload.expression)
    expect(stateOf(wrapper).saving).toBe(false)
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('完成回执的业务data中ERROR不误判为本次保存失败', async () => {
    http.post.mockResolvedValue({
      data: { status: 'COMPLETED', data: { status: 'ERROR', error: '业务字段内容' } }
    })
    const wrapper = await openSettings()
    await button(wrapper, '保存').trigger('click')
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('保存成功')
    expect(stateOf(wrapper).editDialogVisible).toBe(false)
    expect(http.get).toHaveBeenCalledTimes(2)
  })
})

describe('密码状态检查回执', () => {
  it.each(failures)('%s不提示提交、关闭或发success', async (_name, receipt, message) => {
    http.post.mockResolvedValue(receipt)
    const wrapper = mount(CheckPasswordStateDialog, { modelValue: true })
    await button(wrapper, '确认检查').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith(message || '检查密码状态失败')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(stateOf(wrapper).visible).toBe(true)
    expect(stateOf(wrapper).submitting).toBe(false)
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\/workflow\/api\/workflow\/jobs\/v0KKtQ\/run\?cacheBuster=\d+$/),
      { params: {} }
    )
  })

  it('网络拒绝不触发成功事件，保留窗口且恢复提交按钮', async () => {
    http.post.mockRejectedValue(new Error('连接已中断'))
    const wrapper = mount(CheckPasswordStateDialog, { modelValue: true })
    await button(wrapper, '确认检查').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith('连接已中断')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(stateOf(wrapper).visible).toBe(true)
    expect(stateOf(wrapper).submitting).toBe(false)
  })

  it('管理员页失败不刷新，手动重试受理后按原事件刷新并关闭', async () => {
    const wrapper = mount(AdminPanelView, {}, { CheckPasswordStateDialog: false })
    await flushPromises()
    stateOf(wrapper).selectedRows = [...stateOf(wrapper).tableData]
    const selection = [...stateOf(wrapper).selectedRows]
    await button(wrapper, '检查密码状态').trigger('click')
    const dialog = wrapper.findComponent(CheckPasswordStateDialog)
    await button(dialog, '确认检查').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith('作业参数校验失败')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(dialog.emitted('success')).toBeUndefined()
    expect(stateOf(wrapper).checkPasswordStateDialogVisible).toBe(true)
    expect(stateOf(wrapper).selectedRows).toEqual(selection)
    http.post.mockResolvedValue({ data: [{ status: 'WAITING', runId: 'accepted-run' }] })
    await button(dialog, '确认检查').trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(2)
    expect(http.post.mock.calls[1][0]).toMatch(/\/jobs\/v0KKtQ\/run\?cacheBuster=\d+$/)
    expect(http.post.mock.calls[1][1]).toEqual({ params: {} })
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('密码状态检查任务已提交')
    expect(dialog.emitted('success')).toEqual([[]])
    expect(stateOf(wrapper).checkPasswordStateDialogVisible).toBe(false)
    expect(stateOf(wrapper).selectedRows).toEqual(selection)
    expect(http.get).toHaveBeenCalledTimes(2)
    expect(http.get.mock.calls.at(-1)).toEqual([
      '/dashboard/api/sys/dashboard/pms-server',
      { params: { pluginFindHost: '@@(linux)' } }
    ])
  })
})
