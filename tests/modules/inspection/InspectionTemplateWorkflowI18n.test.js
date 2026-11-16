import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale, t } from '@/core/i18n'
import Edit from '@/modules/inspection/components/template/TemplateEditDialog.vue'
import Run from '@/modules/inspection/components/template/RunTemplateDialog.vue'
import Scripts from '@/modules/inspection/components/template/ScriptSelectorDialog.vue'
import { getInspectionScriptLabel } from '@/modules/inspection/utils/scriptPresentation'

const api = vi.hoisted(() => ({ getTemplateById: vi.fn(), createTemplate: vi.fn(), runJob: vi.fn(), get: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('@/modules/inspection/api', () => ({ templateApi: api, jobApi: api }))
vi.mock('@/core/api', () => ({ apiService: api }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, error: api.error, warning: api.warning } }))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({ default: { template: '<div />' } }))
const { ElForm, ElFormItem } = createRequire(import.meta.url)('element-plus/lib/components/form/index.js')
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
const originalScript = { scriptName: '后端脚本名称', scriptPath: '目录/site.yml', scriptParams: "--extra-vars '用户参数={{raw}} | keep'" }
const originalHost = { key: 'raw-host', value: '原始主机', assetType: 'linux' }
const fixture = () => ({ id: 'raw-template', templateName: '后端模板名称', description: '后端说明', icon: 'fa-server', appletCode: 'original-module', auditParams: JSON.stringify([{ scripts: [originalScript], hosts: [originalHost], ruleExpressions: [] }]) })
async function open(component, props = {}, realForm = false) {
  const wrapper = shallowMount(component, { props: { visible: false, ...props }, global: { stubs: {
    'el-dialog': Slot, 'el-form': realForm ? ElForm : { ...Slot, methods: { validate: async () => true, resetFields() {} } },
    'el-form-item': realForm ? ElFormItem : Slot, 'el-table': Slot, 'el-table-column': { template: '<div />' }, 'el-button': Slot,
    'el-tag': Slot, 'el-popover': Slot, 'el-input': true, 'el-empty': true, 'el-pagination': true, 'el-tooltip': Slot,
    ScriptSelectorDialog: true, I18nT: false, 'i18n-t': false
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await wrapper.setProps({ visible: true })
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.resetAllMocks()
  api.getTemplateById.mockResolvedValue({ data: fixture() })
  api.createTemplate.mockResolvedValue({})
  api.runJob.mockResolvedValue({ data: { runId: 'raw-run', status: 'WAITING' } })
  api.get.mockResolvedValue({ data: Array.from({ length: 3 }, (_, index) => ({ name: `site-${index}.yml`, path: `目录/site-${index}.yml`, onlineStatus: index === 1 ? 'DISABLED' : 'PUBLISHED', lastModified: '2026-01-05T08:00:00', size: 1024 })) })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection template workflow language changes', () => {
  it.each([0, 1, 2])('renders complete quantity messages for %i scripts and hosts in both languages', async count => {
    const { wrapper: edit, vm: editVm } = await open(Edit, { templateId: 'raw-template' })
    const { wrapper: run, vm: runVm } = await open(Run, { templateId: 'raw-template' })
    for (const vm of [editVm, runVm]) {
      vm.formData.scripts = Array.from({ length: count }, () => ({ ...originalScript }))
      vm.formData.hosts = Array.from({ length: count }, () => ({ ...originalHost }))
    }
    await flushPromises()
    const captions = wrapper => wrapper.findAll('.config-count-pill').map(item => item.text())
    expect(captions(edit)).toEqual([`已选 ${count} 个脚本`, `已配置 ${count} 项资产`])
    expect(captions(run)).toEqual([`共 ${count} 个文件`, `已选 ${count} 项主机配置`])
    await setLocale('en-US', { persist: false })
    await flushPromises()
    const suffix = count === 1 ? '' : 's'
    expect(captions(edit)).toEqual([`${count} script${suffix} selected`, `${count} asset${suffix} configured`])
    expect(captions(run)).toEqual([`${count} file${suffix}`, `${count} host configuration${suffix} selected`])
    expect(edit.find('.config-count-pill strong').text()).toBe(String(count))
    expect(t('inspection.templates.filteredCount', { matched: count, total: count, count })).toBe(`${count} / ${count} template${suffix}`)
  })

  it.each([[Edit, 'handleSave'], [Run, 'handleRun']])('preserves drafts and submits original script, host and template values', async (component, submit) => {
    const { vm } = await open(component, { templateId: 'raw-template' }, true)
    vm.formData.templateName = '用户草稿名称'
    vm.formData.description = '用户草稿说明'
    vm.hostFilter = '原始'
    vm.openScriptSelector()
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.formData).toMatchObject({ templateName: '用户草稿名称', description: '用户草稿说明', scripts: [originalScript], hosts: [originalHost] })
    expect(vm.scriptSelectorVisible).toBe(true)
    expect(vm.hostFilter).toBe('原始')
    expect(api.getTemplateById).toHaveBeenCalledTimes(1)
    await vm[submit]()
    const payload = (component === Edit ? api.createTemplate : api.runJob).mock.calls[0][0]
    expect(JSON.parse(payload.auditParams)).toEqual(JSON.parse(fixture().auditParams))
    expect(payload.templateName).toBe('用户草稿名称')
    if (component === Edit) expect(payload).toMatchObject({ id: 'raw-template', appletCode: 'original-module', description: '用户草稿说明' })
    else expect(payload.templateId).toBe('raw-template')
  })

  it.each([Edit, Run])('updates only existing validation errors without resetting the form', async component => {
    const { vm } = await open(component, { templateId: 'raw-template' }, true)
    vm.formData.templateName = ''
    await flushPromises()
    await vm.formRef.validateField('templateName').catch(() => {})
    const field = () => vm.formRef.fields.find(item => item.prop === 'templateName')
    expect(field().validateMessage).toBe('请输入模板名称')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(field().validateMessage).toBe('Enter a template name')
    expect(vm.formData.templateName).toBe('')
    expect(vm.formData.scripts).toEqual([originalScript])
    expect(vm.formData.hosts).toEqual([originalHost])
    expect(api.createTemplate).not.toHaveBeenCalled()
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('updates loaded file status and date captions without reloading or resetting the selection', async () => {
    const { wrapper, vm } = await open(Scripts, { selected: [originalScript] })
    vm.currentPath = '目录'
    vm.searchKeyword = 'site'
    vm.pageSize = 1
    await flushPromises()
    vm.currentPage = 2
    const requests = api.get.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentPath).toBe('目录')
    expect(vm.searchKeyword).toBe('site')
    expect(vm.currentPage).toBe(2)
    expect(wrapper.text()).toContain('Disabled')
    expect(vm.files[0].statusText).toBe('Enabled')
    expect(vm.formatDate('2026-01-05T08:00:00')).toBe('1/5/2026')
    expect(api.get).toHaveBeenCalledTimes(requests)
    vm.handleConfirm()
    expect(wrapper.emitted('confirm')[0][0][0]).toMatchObject(originalScript)
  })

  it('retains duplicate-configuration protection with an English warning', async () => {
    const { vm } = await open(Scripts, { selected: [originalScript, { ...originalScript, scriptParams: '--other-original' }] })
    vm.selectedFiles = []
    await setLocale('en-US', { persist: false })
    vm.toggleSelect({ path: originalScript.scriptPath, name: 'site.yml' })
    expect(vm.selectedFiles).toEqual([])
    expect(api.warning).toHaveBeenCalledWith(expect.stringContaining('multiple original configurations'))
  })

  it('keeps backend execution errors and original display names verbatim', async () => {
    const { vm } = await open(Run, { templateId: 'raw-template' })
    api.runJob.mockResolvedValue({ data: { error: '后端执行错误 {raw}' } })
    await setLocale('en-US', { persist: false })
    await vm.handleRun()
    expect(api.error).toHaveBeenLastCalledWith('后端执行错误 {raw}')
    expect(getInspectionScriptLabel(originalScript)).toBe('后端脚本名称')
    expect(getInspectionScriptLabel({ scriptPath: '目录/原名.yml' })).toBe('原名.yml')
    expect(getInspectionScriptLabel()).toBe('Unnamed script')
  })
})
