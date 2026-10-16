import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElCollapse, ElCollapseItem } from 'element-plus'
import WinPatchTaskDetailDrawer from '@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { winPatchApi } from '@/modules/patches/windows-patch/api'

vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: { getTaskDetail: vi.fn() } }))
vi.mock('@/modules/patches/windows-patch/composables/useWinPatchPolling', () => ({
  useWinPatchPolling: () => ({ isPolling: ref(false), start: vi.fn(), stop: vi.fn() })
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { props: ['visible', 'runId', 'jobTitle'], template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchTaskScriptUploader.vue', () => ({
  default: { template: '<div />' }
}))

let wrapper
const slots = { template: '<div><slot /></div>' }
const task = Object.freeze({ id: 'task-original', taskType: 'INSTALL', status: 'COMPLETED', run_id: 'run-original' })

beforeEach(() => {
  vi.resetAllMocks()
  winPatchApi.getTaskDetail.mockResolvedValue({ data: { task, hosts: [], steps: [], logs: [] } })
})
afterEach(() => wrapper?.unmount())

describe('Windows 补丁任务的技术信息与执行结果', () => {
  it('默认收起运行标识，展开可排查，结果入口仍使用真实运行标识', async () => {
    wrapper = shallowMount(WinPatchTaskDetailDrawer, {
      props: { modelValue: true, taskId: task.id },
      global: {
        components: { ElCollapse, ElCollapseItem },
        stubs: {
          'el-dialog': slots,
          'el-collapse': false,
          'el-collapse-item': false,
          'el-collapse-transition': slots,
          'el-descriptions': slots,
          'el-descriptions-item': slots,
          'el-switch': true,
          'el-tag': { template: '<button><slot /></button>' },
          'el-icon': true,
          'el-table': true,
          'el-table-column': true
        },
        directives: { loading: () => {} }
      }
    })
    await flushPromises()
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledWith(task.id)
    const technical = wrapper.find('.win-patch-task-technical')
    expect(technical.find('.el-collapse-item__wrap').attributes('aria-hidden')).toBe('true')
    await technical.find('.el-collapse-item__header').trigger('click')
    await flushPromises()
    expect(technical.find('.el-collapse-item__header').attributes('aria-expanded')).toBe('true')
    expect(technical.find('.el-collapse-item__wrap').attributes('aria-hidden')).toBe('false')
    expect(technical.text()).toContain(task.run_id)
    const mainRun = wrapper.findAll('.win-patch-task-runs__actions button').find(tag => tag.text() === '主任务执行')
    await mainRun.trigger('click')
    expect(wrapper.findComponent(ExecuteResultDialog).props()).toMatchObject({
      visible: true, runId: task.run_id, jobTitle: '主任务执行'
    })
    expect(task.run_id).toBe('run-original')
  })
})
