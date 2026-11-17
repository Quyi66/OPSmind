import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElSelect, ElOption } from 'element-plus'
import { setLocale, t } from '@/core/i18n'
import ExecuteHistoryDialog from '@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue'

const api = vi.hoisted(() => ({ fetchJobRunLogs: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
let wrapper
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }

afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('工具历史弹窗语言切换', () => {
  it('更新已打开的时间选项，保留筛选、草稿及真实记录且不重复查询', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    await setLocale('zh-CN', { persist: false })
    api.fetchJobRunLogs.mockResolvedValue({
      data: {
        total: 1,
        records: [
          {
            id: 'original-run',
            job_id: 'original-job',
            job_title: '用户自定义工具',
            status: 'FAILED',
            job_type: 'script',
            start_time: '2026-11-16T02:00:00Z'
          }
        ]
      }
    })
    wrapper = mount(ExecuteHistoryDialog, {
      props: { visible: true, jobId: 'original-job', autoRefresh: false },
      global: {
        components: { ElSelect, ElOption },
        stubs: {
          'el-dialog': Slot,
          'el-form': Slot,
          'el-form-item': Slot,
          'el-select': false,
          'el-option': false,
          'el-table': true,
          'el-pagination': true,
          'el-input': true
        },
        directives: { loading() {} }
      }
    })
    await flushPromises()
    const select = wrapper.findAllComponents(ElSelect)[0]
    const labels = () => select.findAllComponents(ElOption).map(option => option.props('label'))
    expect(labels()).toContain(t('automation.workbench.last30Days'))
    select.vm.$emit('update:modelValue', 'last30')
    select.vm.$emit('change', 'last30')
    await flushPromises()
    const state = wrapper.vm.$.setupState
    state.keyword = '未提交的查询草稿'
    const records = state.tableData
    const calls = api.fetchJobRunLogs.mock.calls.length
    const payload = api.fetchJobRunLogs.mock.calls.at(-1)[0]
    expect(payload.params).toMatchObject({ job_id: 'original-job', day: '30' })
    expect(records[0]).toMatchObject({ id: 'original-run', jobTitle: '用户自定义工具' })

    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(labels()).toContain('Last 30 days')
    expect(labels()).toContain('Today')
    expect(select.props('modelValue')).toBe('last30')
    expect(state.tableData).toBe(records)
    expect(state.keyword).toBe('未提交的查询草稿')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(calls)

    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(labels()).toContain(t('automation.workbench.last30Days'))
    expect(labels()).not.toContain('Last 30 days')
    expect(select.props('modelValue')).toBe('last30')
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(calls)
  })
})
