import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessageBox } from 'element-plus'
import RecentlySelector from '@/modules/automation/components/job/schedule/components/acm/RecentlySelector.vue'
import ExecuteHistoryDialog from '@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue'
import JobStatisticsPage from '@/modules/automation/views/job/JobStatisticsPage.vue'
import JobApprovalsPage from '@/modules/automation/views/job/JobApprovalsPage.vue'
import JobMyRequestsPage from '@/modules/automation/views/job/JobMyRequestsPage.vue'
import JobApprovalDetailDialog from '@/modules/automation/components/job/JobApprovalDetailDialog.vue'
import JobApproveDetailDialog from '@/modules/automation/components/job/JobApproveDetailDialog.vue'
import * as api from '@/modules/automation/api/jao'
import acmDictionary from '../../../public/i18n/zh-cn/acm.json'

vi.mock('@/modules/automation/api/jao', () => ({
  queryAcmRecentlyUsed: vi.fn(),
  fetchJobRunLogs: vi.fn(),
  fetchJobStats: vi.fn(),
  fetchJobRunCounts: vi.fn(),
  fetchApproveList: vi.fn(),
  fetchMyApproveList: vi.fn(),
  passApprove: vi.fn(),
  submitApprove: vi.fn(),
  executeJob: vi.fn()
}))
vi.mock('@/utils/i18n', () => ({
  translateText: value =>
    (value || '').replace('#{acm.job.check_conn}', acmDictionary['acm.job.check_conn'])
}))
vi.mock('@/stores/useReviewCountStore.js', () => ({ useReviewCountStore: () => ({}) }))
vi.mock('@/modules/automation/stores/useJobStore', () => ({ JOB_TYPE_OPTIONS: [] }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: {
    name: 'ExecuteResultDialog',
    props: ['runId', 'jobId', 'jobTitle', 'rawJobTitle'],
    template: '<div />'
  }
}))
vi.mock('@/modules/automation/components/job/JobListView/CreateJobDialog.vue', () => ({
  default: {
    name: 'CreateJobDialog',
    props: ['jobId', 'appletCode', 'viewMode'],
    template: '<div />'
  }
}))
vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', props: ['option'], template: '<div />' }
}))

// Render each consumer's actual column slots with API rows; omit the UI library's
// layout, charts and timers. These tests do not call live business endpoints.
const Table = defineComponent({
  props: ['data'],
  setup(props, { slots, expose }) {
    provide(
      'consumerRows',
      computed(() => props.data || [])
    )
    expose({ clearSelection() {}, toggleRowSelection() {} })
    return () => h('div', slots.default?.())
  }
})
const Column = defineComponent({
  props: ['prop', 'label'],
  setup(props, { slots }) {
    const rows = inject(
      'consumerRows',
      computed(() => [])
    )
    return () =>
      h(
        'section',
        { 'data-column': props.label },
        rows.value.map(row =>
          h('div', slots.default ? slots.default({ row }) : String(row[props.prop] ?? ''))
        )
      )
  }
})
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Dialog = {
  props: ['title'],
  template: '<div><h2>{{ title }}</h2><slot /><slot name="footer" /></div>'
}
const wrappers = []
function mountConsumer(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        'el-table': Table,
        'el-table-column': Column,
        'el-dialog': Dialog,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-tag': Slot,
        RunLogStatusTag: Slot,
        'el-icon': Slot,
        'el-select': true,
        'el-option': true,
        'el-pagination': true,
        'el-tooltip': true,
        'el-input-number': true,
        'el-empty': true,
        'el-button': Slot
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
const original = '【ACM】设备连通性检测'
const alias = '设备连通性检测'
const jobId = 'M1x855'
const stateOf = wrapper => wrapper.vm.$.setupState
const columnText = wrapper => wrapper.find('[data-column="运维工具"]').text()

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  api.queryAcmRecentlyUsed.mockResolvedValue({ data: [] })
  api.fetchJobRunLogs.mockResolvedValue({ data: { records: [] } })
  api.fetchJobStats.mockResolvedValue({ data: { records: [] } })
  api.fetchJobRunCounts.mockResolvedValue({ data: { records: [] } })
  api.fetchApproveList.mockResolvedValue({ data: [] })
  api.fetchMyApproveList.mockResolvedValue({ data: [] })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  expect(api.executeJob).not.toHaveBeenCalled()
  expect(api.submitApprove).not.toHaveBeenCalled()
  expect(api.passApprove).not.toHaveBeenCalled()
})

describe('最近选择器独立消费者', () => {
  it('名称、搜索和结果使用工具身份，选择仍输出原主机，不把运行 ID 当工具 ID', async () => {
    const host = Object.freeze({ key: 'host-1', value: 'host.example', assetType: 'linux' })
    const rows = Object.freeze([
      Object.freeze({ id: 'run-1', jobId, jobTitle: original, run_result_hosts: [host] }),
      Object.freeze({ id: 'run-2', job_id: jobId, jobTitle: original }),
      Object.freeze({ id: jobId, jobTitle: original })
    ])
    api.queryAcmRecentlyUsed.mockResolvedValue({ data: rows })
    const wrapper = mountConsumer(RecentlySelector, { ciType: 'linux' })
    await flushPromises()
    expect(columnText(wrapper)).toBe(alias + alias + original)
    const state = stateOf(wrapper)
    state.searchKeyword = '【ACM】'
    await flushPromises()
    expect(state.filteredData).toEqual([rows[2]])
    state.handleViewResult(rows[0])
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      runId: 'run-1',
      jobId,
      jobTitle: original
    })
    state.handleSelectionChange([rows[0]])
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([[host]])
    expect(api.queryAcmRecentlyUsed).toHaveBeenCalledWith({
      jobTypes: 'script,command',
      limit: 100
    })
  })
})

describe('单工具历史独立消费者', () => {
  it('父工具身份用于缺字段历史，显式 jobId 优先，结果保留原运行 ID 和原名', async () => {
    const rows = Object.freeze([
      Object.freeze({ id: 'run-parent', job_title: original, status: 'COMPLETED' }),
      Object.freeze({
        id: 'run-camel',
        jobId: 'custom-tool',
        jobTitle: original,
        status: 'COMPLETED'
      }),
      Object.freeze({
        id: 'run-snake',
        job_id: 'custom-tool',
        job_title: original,
        status: 'COMPLETED'
      })
    ])
    api.fetchJobRunLogs.mockResolvedValue({ data: { records: rows, total: 3 } })
    const wrapper = mountConsumer(ExecuteHistoryDialog, {
      visible: true,
      jobId,
      jobTitle: original,
      autoRefresh: false
    })
    await flushPromises()
    expect(wrapper.find('h2').text()).toBe(`运维工具运行记录 · ${alias}`)
    expect(columnText(wrapper)).toBe(alias + original + original)
    const state = stateOf(wrapper)
    state.handleStatusClick(state.tableData[1])
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      runId: 'run-camel',
      jobId: 'custom-tool',
      jobTitle: original,
      rawJobTitle: original
    })
    state.handleStatusClick(state.tableData[0])
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      runId: 'run-parent',
      jobId,
      jobTitle: alias,
      rawJobTitle: original
    })
    state.handleStatusClick(state.tableData[2])
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      runId: 'run-snake',
      jobId: 'custom-tool',
      jobTitle: original
    })
    expect(api.fetchJobRunLogs).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ job_id: jobId }) })
    )
    expect(rows[1].jobTitle).toBe(original)
  })
})

it('审批确认也保护缺失的工具身份，取消不调用审批接口', async () => {
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
  const wrapper = mountConsumer(JobApprovalsPage)
  await flushPromises()
  await stateOf(wrapper).handlePass({ id: jobId, jobName: original })
  expect(confirm).toHaveBeenCalledWith(
    `确定要通过运维工具 "${original}" 的审批申请吗？`,
    '通过审批',
    { type: 'success' }
  )
})

describe('次数排行独立消费者', () => {
  it('实际统计记录缺工具 ID 时保留原名，不凭名称推断身份', async () => {
    const row = Object.freeze({ run_count: 4318, job_title: '【ACM】#{acm.job.check_conn}' })
    api.fetchJobRunCounts.mockResolvedValue({ data: { records: [row] } })
    const wrapper = mountConsumer(JobStatisticsPage)
    await flushPromises()
    const state = stateOf(wrapper)
    expect(state.summaryChartOption.yAxis.data).toEqual([original])
    expect(state.summaryChartOption.series[0].data).toEqual([4318])
    expect(state.summaryRows[0].job_id).toBeUndefined()
    state.summaryQuery = '设备连通性检测'
    await flushPromises()
    expect(state.filteredSummary).toHaveLength(1)
    expect(state.filteredSummary[0].translatedTitle).toBe(original)
    expect(row).toEqual({ run_count: 4318, job_title: '【ACM】#{acm.job.check_conn}' })
  })

  it('图表轴、过滤和数值按显式工具 ID 映射，未知与重命名工具保留', async () => {
    const rows = Object.freeze([
      Object.freeze({ job_id: jobId, job_title: original, run_count: 3 }),
      Object.freeze({ job_id: 'custom', job_title: original, run_count: 2 }),
      Object.freeze({ job_id: jobId, job_title: '自定义检测', run_count: 0 })
    ])
    api.fetchJobRunCounts.mockResolvedValue({ data: { records: rows } })
    const wrapper = mountConsumer(JobStatisticsPage)
    await flushPromises()
    const state = stateOf(wrapper)
    expect(state.summaryChartOption.yAxis.data).toEqual([alias, original, '自定义检测'])
    expect(state.summaryChartOption.series[0].data).toEqual([3, 2, 0])
    expect(wrapper.findAllComponents({ name: 'VChart' }).at(-1).props('option').yAxis.data).toEqual(
      [alias, original, '自定义检测']
    )
    state.summaryQuery = '【ACM】'
    await flushPromises()
    expect(state.summaryChartOption.yAxis.data).toEqual([original])
    expect(rows[0].job_title).toBe(original)
  })
})

describe.each([
  ['审批列表', JobApprovalsPage, 'fetchApproveList', 'JobApprovalDetailDialog'],
  ['我的申请', JobMyRequestsPage, 'fetchMyApproveList', 'JobApproveDetailDialog']
])('%s独立消费者', (_label, component, method, detailName) => {
  it('展示、搜索和详情透传保留原对象，审批 ID 不能冒充工具身份', async () => {
    const rows = Object.freeze([
      Object.freeze({
        id: 'approval-1',
        jobId,
        jobName: original,
        appletCode: 'legacy-app',
        status: 1
      }),
      Object.freeze({ id: jobId, jobName: original, status: 1 }),
      Object.freeze({ id: 'approval-3', jobId, jobName: '自定义检测', status: 1 })
    ])
    api[method].mockResolvedValue({ data: rows })
    const wrapper = mountConsumer(component)
    await flushPromises()
    expect(columnText(wrapper)).toBe(`${alias}${original}自定义检测`)
    expect(wrapper.text()).not.toContain('所属应用')
    const state = stateOf(wrapper)
    state.filters.keyword = '【ACM】'
    await flushPromises()
    // Existing search intentionally accepts raw names as well as display names.
    expect(state.filteredData).toEqual(rows.slice(0, 2))
    state.handleViewDetail(rows[0])
    await flushPromises()
    expect(wrapper.findComponent({ name: detailName }).props('approveData')).toEqual(rows[0])
    expect(rows[0].jobName).toBe(original)
  })
})

describe.each([
  ['审批详情', JobApprovalDetailDialog],
  ['申请详情', JobApproveDetailDialog]
])('%s独立消费者', (_label, component) => {
  it('显示别名但查看仍传真实工具 ID/关联，缺身份与自定义名称原样保留', async () => {
    const approval = Object.freeze({
      id: 'approval-1',
      jobId,
      jobName: original,
      appletCode: 'legacy-app',
      approveMode: 'limitParams',
      params: '{"zero":0}',
      status: 1
    })
    const wrapper = mountConsumer(component, { visible: true, approveData: approval })
    await flushPromises()
    expect(wrapper.text()).toContain(alias)
    expect(wrapper.text()).not.toContain('【ACM】')
    expect(wrapper.text()).toContain('zero : 0')
    stateOf(wrapper).handleViewJob()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'CreateJobDialog' }).props()).toMatchObject({
      jobId,
      appletCode: 'legacy-app',
      viewMode: true
    })
    await wrapper.setProps({ approveData: { ...approval, jobId: '', id: jobId } })
    expect(wrapper.text()).toContain(original)
    await wrapper.setProps({ approveData: { ...approval, jobName: '自定义检测' } })
    expect(wrapper.text()).toContain('自定义检测')
    expect(approval.jobName).toBe(original)
  })
})
