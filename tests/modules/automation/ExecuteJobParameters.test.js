import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ExecuteJobDialog from '@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue'
import * as api from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({ getJobDetail: vi.fn(), executeJob: vi.fn() }))
vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal()),
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/utils/i18n', () => ({
  initTranslations: vi.fn().mockResolvedValue(),
  translateText: text => (text || '').replace('#{common.action.confirm}', '确认')
}))

let wrapper
afterEach(() => wrapper?.unmount())

describe('执行参数的展示与请求', () => {
  it('翻译标签和说明，但不翻译参数名、默认值或写回详情', async () => {
    const params = Object.freeze([
      Object.freeze({
        name: 'scope',
        label: '#{common.action.confirm}',
        description: '说明：#{common.action.confirm}',
        defaultValue: '#{raw.value}'
      }),
      Object.freeze({ name: 'hosts', label: '', description: '', defaultValue: '192.0.2.1' })
    ])
    api.getJobDetail.mockResolvedValue({ data: { type: 'rest', params, configJson: '{}' } })
    // 模拟失败避免触发轮询；请求只发送给 mock。
    api.executeJob.mockRejectedValue(new Error('模拟错误'))
    const slots = { template: '<div><slot /><slot name="footer" /></div>' }
    wrapper = shallowMount(ExecuteJobDialog, {
      props: { visible: true, jobId: 'tool-id' },
      global: {
        stubs: { 'el-dialog': slots, 'el-form': slots, 'el-form-item': slots },
        directives: { loading: () => {} }
      }
    })
    await flushPromises()
    const state = wrapper.vm.$.setupState
    expect(state.formSchema[0].label).toBe('确认')
    expect(wrapper.text()).toContain('说明：确认')
    expect(state.formSchema[1].label).toBe('hosts')
    expect(params[0].label).toBe('#{common.action.confirm}')
    expect(params[0].description).toBe('说明：#{common.action.confirm}')
    await state.handleSubmit()
    expect(api.executeJob).toHaveBeenCalledWith({
      jobId: 'tool-id',
      type: 'rest',
      configJson: '{}',
      options: { secretParams: [], params: { scope: '#{raw.value}', hosts: '192.0.2.1' } }
    })
  })
})
