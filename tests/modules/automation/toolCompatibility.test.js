import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import CreateJobDialog from '@/modules/automation/components/job/JobListView/CreateJobDialog.vue'
import JobApproveDialog from '@/modules/automation/components/job/JobListView/JobApproveDialog.vue'
import * as api from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({
  getJobDetail: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getScriptPath: vi.fn(),
  submitApprove: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => ({}))
vi.mock('@/modules/automation/components/job/JobListView/FileSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/CommandSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

let wrapper
const slots = { template: '<div><slot /><slot name="footer" /></div>' }
const mountOptions = {
  global: {
    stubs: {
      ElDrawer: slots,
      ElScrollbar: slots,
      'el-form': slots,
      'el-form-item': slots,
      'el-dialog': slots,
      'el-table': true,
      'el-table-column': true
    },
    directives: { loading: () => {} }
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  api.getScriptPath.mockResolvedValue([])
})
afterEach(() => wrapper?.unmount())

describe('工具去除所属应用展示后保留接口关联', () => {
  it('编辑读取并回传原 appletCode、原名称和配置，显示别名不写入资源', async () => {
    const fixture = {
      id: 'M1x855',
      title: '【ACM】设备连通性检测',
      type: 'rest',
      appletCode: 'legacy-acm',
      description: '检查设备',
      params: [{ name: 'scope', type: 'string', defaultValue: 'all' }],
      needApprove: true,
      needReview: false,
      needDelayed: true,
      configJson: JSON.stringify({
        audit: { enabled: true, module: 'acm', action: 'check' },
        curl: 'curl https://example.invalid'
      })
    }
    api.getJobDetail.mockResolvedValue({ data: fixture })
    wrapper = shallowMount(CreateJobDialog, {
      ...mountOptions,
      props: { modelValue: true, jobId: fixture.id, appletCode: 'other-scope' }
    })
    await flushPromises()
    const state = wrapper.vm.$.setupState
    expect(wrapper.text()).not.toContain('所属应用')
    expect(wrapper.text()).not.toContain('legacy-acm')
    await state.save()
    const { id, ...expected } = fixture
    expect(api.updateJob).toHaveBeenCalledWith(id, { ...expected, id })
    expect(api.createJob).not.toHaveBeenCalled()
  })

  it('新增继续沿用调用方传入的 appletCode', async () => {
    wrapper = shallowMount(CreateJobDialog, {
      ...mountOptions,
      props: { modelValue: true, jobType: 'rest', appletCode: 'caller-scope' }
    })
    await flushPromises()
    const state = wrapper.vm.$.setupState
    state.job.title = '自定义工具'
    state.restConfig.curl = 'curl https://example.invalid'
    await state.save()
    expect(api.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ title: '自定义工具', appletCode: 'caller-scope', type: 'rest' })
    )
  })

  it('审批限定参数序列化与原有接口契约一致', async () => {
    wrapper = shallowMount(JobApproveDialog, {
      ...mountOptions,
      props: {
        visible: true,
        jobId: 'tool-a',
        jobTitle: '检查',
        appletCode: 'legacy-app',
        params: { scope: 'all' }
      }
    })
    await flushPromises()
    const state = wrapper.vm.$.setupState
    state.formData.approveMode = 'limitParams'
    await state.handleSubmit()
    expect(api.submitApprove).toHaveBeenCalledWith({
      jobId: 'tool-a',
      approveMode: 'limitParams',
      validHour: 1,
      description: '',
      params: JSON.stringify([{ name: 'scope', value: 'all' }])
    })
    expect(wrapper.text()).not.toContain('所属应用')
  })
})
