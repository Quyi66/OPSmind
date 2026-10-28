import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import TemplateEditDialog from '@/modules/inspection/components/template/TemplateEditDialog.vue'
import RunTemplateDialog from '@/modules/inspection/components/template/RunTemplateDialog.vue'
import { templateApi, jobApi } from '@/modules/inspection/api'

vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getTemplateById: vi.fn(), createTemplate: vi.fn() },
  jobApi: { runJob: vi.fn() }
}))
vi.mock('@/modules/inspection/components/template/ScriptSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))

let wrapper
const fixture = {
  id: 'template-original',
  templateName: '【CAC】自定义巡检',
  description: '保留原模板',
  icon: 'fa-server',
  appletCode: 'legacy-audit',
  auditParams: JSON.stringify([{
    scripts: [{ scriptName: '/sjxy/cac/check.yml', scriptPath: '/sjxy/cac/check.yml', scriptParams: '--all' }],
    hosts: [{ key: 'host-id', value: '10.0.0.1', assetType: 'linux' }],
    ruleExpressions: []
  }])
}
const slots = { template: '<div><slot /><slot name="footer" /></div>' }
const options = {
  props: { visible: false, templateId: fixture.id },
  global: {
    stubs: {
      'el-dialog': slots,
      'el-form': { ...slots, methods: { validate: () => Promise.resolve(true), resetFields: () => {} } },
      'el-form-item': slots,
      'el-table': true,
      'el-table-column': true,
      'el-tooltip': slots,
      'el-popover': true
    }
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  templateApi.getTemplateById.mockResolvedValue({ data: { ...fixture } })
  jobApi.runJob.mockResolvedValue({ data: { runId: 'original-run', status: 'WAITING' } })
})
afterEach(() => wrapper?.unmount())

describe('巡检脚本名称清理不影响保存和执行', () => {
  it('编辑沿用原模板字段、脚本路径、原名称和主机参数', async () => {
    wrapper = shallowMount(TemplateEditDialog, options)
    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.vm.$.setupState.handleSave()
    expect(templateApi.createTemplate).toHaveBeenCalledWith({ ...fixture, auditParams: expect.any(String) })
    expect(JSON.parse(templateApi.createTemplate.mock.calls[0][0].auditParams)).toEqual(JSON.parse(fixture.auditParams))
  })

  it('执行继续提交原关联，文件名展示不写入 auditParams', async () => {
    wrapper = shallowMount(RunTemplateDialog, options)
    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.vm.$.setupState.handleRun()
    expect(jobApi.runJob).toHaveBeenCalledWith({
      templateId: fixture.id,
      templateName: fixture.templateName,
      auditParams: expect.any(String)
    })
    expect(JSON.parse(jobApi.runJob.mock.calls[0][0].auditParams)).toEqual(JSON.parse(fixture.auditParams))
    expect(wrapper.emitted('success')).toEqual([[{ runId: 'original-run', status: 'WAITING' }]])
  })
})
