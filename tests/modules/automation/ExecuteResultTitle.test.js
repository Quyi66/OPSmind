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

  it('结果概览将完整原始错误和按主机日志传递给错误详情，日志入口能打开原始输出', async () => {
    wrapper = shallowMount(ExecuteResultDialog, {
      props: { visible: false, runId: 'run-1' },
      global: {
        stubs: {
          'el-dialog': { template: '<div><slot /></div>' },
          ElTabs: { template: '<div><slot /></div>' },
          ElTabPane: { template: '<div><slot /></div>' },
          ElScrollbar: { template: '<div><slot /></div>' },
          ...Object.fromEntries(
            [
              'el-tag',
              'el-empty',
              'el-alert',
              'el-dropdown-item',
              'el-dropdown-menu',
              'el-dropdown',
              'el-tree',
              'el-table',
              'el-table-column',
              'el-pagination'
            ].map(name => [name, true])
          )
        },
        directives: { loading: () => {} }
      }
    })
    const original = 'Unexpected transport Z9\noriginal next line'
    const output = {
      plays: [
        {
          tasks: [
            {
              task: { name: 'scan' },
              hosts: [{ hostKey: '192.0.2.1', unreachable: true, msg: original }]
            }
          ]
        }
      ]
    }
    wrapper.vm.$.setupState.result = {
      status: 'FAILED',
      jobType: 'script',
      error: original,
      data: [{ output: JSON.stringify(output) }]
    }
    await wrapper.vm.$nextTick()
    const details = wrapper.findComponent({ name: 'ExecutionFailureDetails' })
    expect(details.props('error')).toBe(original)
    expect(details.props('contents')[0].plays).toEqual(output.plays)
    expect(details.props('hasLog')).toBe(true)
    details.vm.$emit('view-log')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.$.setupState.activeTab).toBe('raw')
  })
})
