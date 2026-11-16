import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import EmailPage from '@/modules/inspection/views/EmailConfigPage.vue'

const api = vi.hoisted(() => ({ getEmailSwitch: vi.fn(), saveEmailSwitch: vi.fn(), getTemplates: vi.fn(), getRecipientList: vi.fn(), saveRecipient: vi.fn(), deleteRecipient: vi.fn(), getEmailCustomList: vi.fn(), saveEmailCustom: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/modules/inspection/api', () => ({ emailConfigApi: api }))
vi.mock('@/core/auth', () => ({ authService: { getCurrentUser: () => ({ tenantId: 'raw-tenant' }), getTenantId: () => 'fallback-tenant' } }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, error: api.error }, ElMessageBox: { confirm: api.confirm } }))
const { ElForm, ElFormItem } = createRequire(import.meta.url)('element-plus/lib/components/form/index.js')
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
async function open(realForm = false) {
  const wrapper = shallowMount(EmailPage, { global: { stubs: {
    'el-dialog': Slot, 'el-form': realForm ? ElForm : Slot, 'el-form-item': realForm ? ElFormItem : Slot,
    'el-table': Slot, 'el-table-column': { template: '<div />' }, 'el-button': Slot,
    'el-input': true, 'el-radio-group': Slot, 'el-radio': Slot, 'el-switch': true, 'el-pagination': true, 'el-icon': true
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const template = { template_id: 'raw-template', template_name: '后端中文模板名称' }
beforeEach(async () => {
  vi.resetAllMocks()
  api.getEmailSwitch.mockResolvedValue({ data: { id: 'raw-config', isTheEmailEnabled: 'yes', backendSetting: '后端值' } })
  api.getTemplates.mockResolvedValue({ records: Array.from({ length: 35 }, (_, index) => ({ ...template, template_id: `template-${index}` })) })
  api.getRecipientList.mockResolvedValue({ data: [{ id: 'recipient-data-id', dataJson: JSON.stringify({ template_id: 'raw-template', name: '后端收件人', email: 'raw@example.com', status: '0', remarks: '后端备注' }) }] })
  api.getEmailCustomList.mockResolvedValue({ data: [{ id: 'raw-content', dataJson: { template_id: 'raw-template', title: '后端邮件标题', content: '后端正文 {{raw}}', state: '1' } }] })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection email language changes', () => {
  it('updates visible status and template count without resetting query drafts or pagination', async () => {
    const { wrapper, vm } = await open()
    vm.searchKeyword = '用户查询'
    vm.currentPage = 3
    const calls = api.getTemplates.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Global email notifications enabled')
    expect(wrapper.text()).toContain('35 templates')
    expect(vm.searchKeyword).toBe('用户查询')
    expect(vm.currentPage).toBe(3)
    expect(vm.templateList[0].template_name).toBe('后端中文模板名称')
    expect(api.getTemplates).toHaveBeenCalledTimes(calls)
    vm.handleSearch()
    await flushPromises()
    expect(api.getTemplates).toHaveBeenLastCalledWith('raw-tenant', 'template_name:*用户查询*')
  })

  it('preserves recipient filtering, the selected template and original data across languages', async () => {
    const { vm } = await open()
    await vm.showRecipientDialog(template)
    vm.recipientSearchKeyword = '后端收件人'
    await setLocale('en-US', { persist: false })
    expect(vm.recipientDialogVisible).toBe(true)
    expect(vm.currentTemplate.template_id).toBe('raw-template')
    expect(vm.filteredRecipientTableData[0]).toMatchObject({ _dataId: 'recipient-data-id', name: '后端收件人', email: 'raw@example.com', status: '0', remarks: '后端备注' })
    expect(api.getRecipientList).toHaveBeenCalledTimes(1)
  })

  it('updates existing validation errors and saves the same recipient draft with its raw status and ID', async () => {
    const { wrapper, vm } = await open(true)
    vm.currentTemplate = template
    vm.showAddRecipientDialog()
    vm.recipientFormData.email = 'invalid'
    vm.recipientFormData.remarks = '用户备注 {raw}'
    await flushPromises()
    await vm.recipientFormRef.validateField('email').catch(() => {})
    const field = () => vm.recipientFormRef.fields.find(item => item.prop === 'email')
    expect(field().validateMessage).toBe('请输入有效的邮箱地址')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(field().validateMessage).toBe('Enter a valid email address')
    expect(wrapper.find('[placeholder="Enter notes"]').exists()).toBe(true)
    expect(vm.recipientFormRef.fields.find(item => item.prop === 'name').validateState).toBe('')
    expect(vm.recipientFormData.remarks).toBe('用户备注 {raw}')
    vm.recipientFormData = { id: 'raw-recipient', name: '用户姓名', email: 'Case@example.com', status: '1', remarks: '用户备注 {raw}' }
    await flushPromises()
    await vm.saveRecipient()
    expect(api.saveRecipient).toHaveBeenCalledExactlyOnceWith({ id: 'raw-recipient', name: '用户姓名', email: 'Case@example.com', status: '1', remarks: '用户备注 {raw}', templateId: 'raw-template' })
    expect(vm.recipientFormVisible).toBe(false)
  })

  it('preserves custom content and uses the completion language without interpreting user placeholders', async () => {
    const { vm } = await open()
    await vm.showCustomContentDialog(template)
    vm.customContentData.title = '用户自定义标题'
    vm.customContentData.content = '用户内容 {{template_name}} #{raw} | 原文'
    let complete
    api.saveEmailCustom.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const pending = vm.saveCustomContent()
    await setLocale('en-US', { persist: false })
    expect(vm.customContentDialogVisible).toBe(true)
    complete({})
    await pending
    expect(api.saveEmailCustom).toHaveBeenCalledExactlyOnceWith({ id: 'raw-content', title: '用户自定义标题', content: '用户内容 {{template_name}} #{raw} | 原文', state: '1', templateId: 'raw-template' })
    expect(api.success).toHaveBeenLastCalledWith('Saved successfully')
    expect(api.getEmailCustomList).toHaveBeenCalledTimes(1)
  })

  it('keeps the yes/no switch protocol and other backend configuration fields', async () => {
    const { vm } = await open()
    await setLocale('en-US', { persist: false })
    await vm.handleSwitchChange(false)
    expect(api.saveEmailSwitch).toHaveBeenCalledExactlyOnceWith({ id: 'raw-config', isTheEmailEnabled: 'no', backendSetting: '后端值' })
    expect(api.success).toHaveBeenLastCalledWith('Email notifications disabled')
    expect(api.getEmailSwitch).toHaveBeenCalledTimes(1)
    api.saveEmailSwitch.mockRejectedValueOnce(new Error('offline'))
    vm.emailEnabled = false
    await vm.handleSwitchChange(false)
    expect(vm.emailEnabled).toBe(true)
    expect(api.error).toHaveBeenLastCalledWith('Failed to save. Please try again.')
  })

  it('uses the original recipient data ID for deletion and leaves cancellation unchanged', async () => {
    const { vm } = await open()
    await setLocale('en-US', { persist: false })
    api.confirm.mockRejectedValueOnce('cancel')
    await vm.deleteRecipient({ _dataId: 'raw-recipient' })
    expect(api.deleteRecipient).not.toHaveBeenCalled()
    api.confirm.mockResolvedValueOnce()
    await vm.deleteRecipient({ _dataId: 'raw-recipient' })
    expect(api.confirm.mock.calls.at(-1)[0]).toBe('Delete this recipient?')
    expect(api.deleteRecipient).toHaveBeenCalledExactlyOnceWith('raw-recipient')
  })
})
