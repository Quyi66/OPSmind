import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))
vi.mock('@/core/auth', () => ({ authService: {} }))
vi.mock('@/modules/automation/api/jao', () => ({}))
vi.mock('@/modules/asset/api', () => ({ AGENT_ERROR_MESSAGES: {}, agentApi: {} }))

let wrapper
afterEach(() => wrapper?.unmount())

describe('结果弹窗的工具身份与名称', () => {
  it('根据工具 ID 展示内置别名，保留自定义名称并且不把运行 ID 当工具 ID', async () => {
    wrapper = shallowMount(ExecuteResultDialog, {
      props: { visible: false, runId: 'run-1', jobId: 'M1x855', jobTitle: '【ACM】设备连通性检测' },
      global: { stubs: { ElDialog: true }, directives: { loading: () => {} } }
    })
    const title = () => wrapper.findComponent({ name: 'ElDialog' }).attributes('title')
    expect(title()).toBe('运维工具运行结果 · 设备连通性检测')
    await wrapper.setProps({ jobId: 'custom' })
    expect(title()).toContain('【ACM】设备连通性检测')
    await wrapper.setProps({ jobId: 'M1x855', jobTitle: '自定义检测' })
    expect(title()).toBe('运维工具运行结果 · 自定义检测')
    await wrapper.setProps({ jobId: '', runId: 'M1x855', jobTitle: '【ACM】设备连通性检测' })
    expect(title()).toContain('【ACM】设备连通性检测')
  })
})
