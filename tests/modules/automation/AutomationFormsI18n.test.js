import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import CreateJobDialog from '@/modules/automation/components/job/JobListView/CreateJobDialog.vue'
import ExecuteJobDialog from '@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue'
import RequestDetail from '@/modules/automation/components/job/JobApproveDetailDialog.vue'
import * as api from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({
  getJobDetail: vi.fn(),
  getScriptPath: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  executeJob: vi.fn(),
  submitApprove: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => ({
  checkFileExist: vi.fn().mockResolvedValue({ data: {} })
}))
vi.mock('@/utils/i18n', () => ({ initTranslations: vi.fn(), translateText: value => value || '' }))
vi.mock('@/modules/automation/components/job/JobListView/FileSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/CommandSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))

const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
async function open(component, props) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElDrawer: Slot,
        ElScrollbar: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElCollapse: Slot,
        ElCollapseItem: Slot,
        ElTag: Slot,
        ElButton: Slot
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.clearAllMocks()
  api.getScriptPath.mockResolvedValue([])
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('automation form drafts across language changes', () => {
  it.each(['rest', 'script', 'command'])(
    'preserves and submits the original %s draft',
    async type => {
      const { wrapper, vm } = await open(CreateJobDialog, { modelValue: true, jobType: type })
      vm.job.title = '业务中文标题'
      vm.job.description = '后端和用户中文不翻译'
      vm.job.appletCode = 'raw-app-code'
      vm.job.params = [
        {
          name: 'scope',
          label: '业务参数',
          description: '中文说明',
          type: 'string',
          defaultValue: '原值 {{scope}}',
          secret: true
        }
      ]
      vm.restConfig.curl = "curl 'https://example.test/{{scope}}' -d '{\"中文\":true}'"
      vm.jobConfig.tasks[0].scripts = [
        { location: '目录/脚本.sh', argline: '--scope {{scope}}', tag: '原标签' }
      ]
      vm.commandConfig.tasks[0].commands = [
        { id: 'cmd-id', name: '命令名称', type: 'linux', cmd: 'echo 中文 {{scope}}' }
      ]
      vm.commandConfig.tasks[0].hosts = [{ key: 'host-id', value: '原始主机' }]
      const draft = raw(vm.job)
      const config = vm.toConfigJson()
      const title = vm.dialogTitle
      const calls = api.getScriptPath.mock.calls.length
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(vm.dialogTitle).not.toBe(title)
      expect(vm.paramTypeList[0].title).toBe('String')
      expect(vm.curlPlaceholder).toContain('{{param_value}}')
      expect(raw(vm.job)).toEqual(draft)
      expect(vm.toConfigJson()).toBe(config)
      expect(api.createJob).not.toHaveBeenCalled()
      expect(api.getScriptPath).toHaveBeenCalledTimes(calls)
      await vm.save()
      expect(api.createJob).toHaveBeenCalledExactlyOnceWith({ ...draft, configJson: config })
      expect(wrapper.emitted('success')).toHaveLength(1)
    }
  )

  it('keeps edited execution values and serialized payload without reloading tool details', async () => {
    const params = [
      { name: 'scope', label: '业务参数', description: '后端中文说明', defaultValue: '默认中文' }
    ]
    api.getJobDetail.mockResolvedValue({
      data: { id: 'raw-id', type: 'rest', params, configJson: '{"中文":"{{scope}}"}' }
    })
    const { vm } = await open(ExecuteJobDialog, { visible: true, jobId: 'raw-id' })
    vm.formValues.scope = '已填写中文 {{scope}}'
    const payload = raw(vm.buildPayload())
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.formSchema[0]).toMatchObject({ label: '业务参数', description: '后端中文说明' })
    expect(vm.buildPayload()).toEqual(payload)
    expect(vm.formValues.scope).toBe('已填写中文 {{scope}}')
    expect(api.getJobDetail).toHaveBeenCalledTimes(1)
    expect(api.executeJob).not.toHaveBeenCalled()
  })

  it('keeps a rejected request draft and resubmits original mode, ID and parameters', async () => {
    const params = '{"原参数":"原值"}'
    const { vm } = await open(RequestDetail, {
      visible: true,
      approveData: {
        id: 'approval-id',
        jobId: 'tool-id',
        jobName: '后端标题',
        status: 2,
        approveMode: 'limitParams',
        params,
        validHour: 4,
        description: '原说明'
      }
    })
    vm.formData.description = '重提中文说明'
    vm.formData.validHour = 8
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.getStatusLabel(2)).toBe('Rejected')
    expect(vm.getApproveModeLabel('limitParams')).toBe('Run with specified parameters')
    expect(vm.formData).toEqual({ description: '重提中文说明', validHour: 8 })
    expect(api.submitApprove).not.toHaveBeenCalled()
    await vm.handleResubmit()
    expect(api.submitApprove).toHaveBeenCalledExactlyOnceWith({
      jobId: 'tool-id',
      approveMode: 'limitParams',
      validHour: 8,
      description: '重提中文说明',
      params
    })
  })
})
