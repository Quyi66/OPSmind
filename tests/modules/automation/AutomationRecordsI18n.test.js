import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive } from 'vue'
import { init, use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { setLocale } from '@/core/i18n'
import Logs from '@/modules/automation/views/job/JobRunLogsPage.vue'
import Stats from '@/modules/automation/views/job/JobStatisticsPage.vue'
import Approvals from '@/modules/automation/views/job/JobApprovalsPage.vue'
import Requests from '@/modules/automation/views/job/JobMyRequestsPage.vue'

const api = vi.hoisted(() => ({
  fetchJobRunLogs: vi.fn(),
  rerunJob: vi.fn(),
  fetchJobStats: vi.fn(),
  fetchJobRunCounts: vi.fn(),
  fetchApproveList: vi.fn(),
  fetchMyApproveList: vi.fn(),
  passApprove: vi.fn(),
  refuseApprove: vi.fn(),
  discardApprove: vi.fn(),
  cancelApprove: vi.fn(),
  replace: vi.fn(),
  route: null
}))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('vue-router', () => ({
  useRoute: () => api.route,
  useRouter: () => ({
    replace: api.replace,
    resolve: value => ({ fullPath: JSON.stringify(value) })
  })
}))
vi.mock('@/stores/useReviewCountStore.js', () => ({
  useReviewCountStore: () => ({ approvalCount: 0 })
}))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: { value: false } }) }))
vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', props: ['option'], template: '<div />' }
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
const wrappers = []
use([SVGRenderer])
const Slot = { template: '<div><slot /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const row = {
  id: 'approval-id',
  jobId: 'M1x855',
  jobName: '【ACM】设备连通性检测',
  status: 0,
  approveMode: 'noLimitParams',
  validHour: 3,
  description: '后端申请说明'
}
async function open(component) {
  const wrapper = shallowMount(component, {
    global: {
      stubs: {
        ElTabs: Slot,
        ElTabPane: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElTable: true,
        ElTableColumn: true,
        JobStatisticsPage: true,
        ExecuteResultDialog: true
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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  api.route = reactive({
    name: 'run-records-logs',
    path: '/run-records/logs',
    query: { day: '7', status: 'FAILED', type: 'script', keyword: '原始搜索' }
  })
  api.fetchJobRunLogs.mockResolvedValue({
    data: {
      records: [
        {
          id: 'run-id',
          job_id: 'M1x855',
          job_title: row.jobName,
          job_type: 'script',
          status: 'FAILED'
        }
      ],
      total: 30
    }
  })
  api.fetchJobStats.mockResolvedValue({
    data: {
      records: [
        { start_date: '2026-11-12', run_count: 0 },
        { start_date: '2026-11-11', run_count: 'invalid' }
      ]
    }
  })
  api.fetchJobRunCounts.mockResolvedValue({
    data: {
      records: Array.from({ length: 20 }, (_, index) => ({
        job_id: index ? `tool-${index}` : 'M1x855',
        job_title: index ? `业务中文${index}` : row.jobName,
        run_count: index
      }))
    }
  })
  api.fetchApproveList.mockResolvedValue({ data: [row] })
  api.fetchMyApproveList.mockResolvedValue({ data: [row] })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('automation record and approval language state', () => {
  it('keeps route filters, pagination and an open result while translating its title', async () => {
    const { vm } = await open(Logs)
    vm.pagination.page = 2
    const record = vm.tableData[0]
    vm.handleViewResult(record)
    const filters = raw(vm.filters)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.resultMeta.jobTitle).toBe('Device connectivity check')
    expect(vm.resultMeta.runId).toBe('run-id')
    expect(vm.getStatusLabel('FAILED')).toBe('Failed')
    expect(vm.pagination.page).toBe(2)
    expect(raw(vm.filters)).toEqual(filters)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(1)
    expect(api.replace).not.toHaveBeenCalled()
    expect(api.rerunJob).not.toHaveBeenCalled()
  })

  it('keeps chart values, applied title search and zoom while labels update', async () => {
    const { vm } = await open(Stats)
    vm.handleSummaryZoom({ batch: [{ start: 25, end: 75 }] })
    const trend = raw(vm.recentTrendOption.series[0].data)
    const counts = raw(vm.summaryChartOption.series[0].data)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.recentTrendOption.series[0].name).toBe('Executions')
    expect(vm.summaryChartOption.series[0].name).toBe('Runs')
    expect(vm.recentTrendOption.series[0].data).toEqual(trend)
    expect(vm.summaryChartOption.series[0].data).toEqual(counts)
    expect(vm.summaryChartOption.dataZoom[0]).toMatchObject({ start: 25, end: 75 })
    await setLocale('zh-CN', { persist: false })
    vm.summaryQuery = '设备连通性'
    await flushPromises()
    expect(vm.filteredSummary).toHaveLength(1)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.summaryQuery).toBe('设备连通性')
    expect(vm.filteredSummary[0].translatedTitle).toBe('Device connectivity check')
    expect(api.fetchJobStats).toHaveBeenCalledTimes(1)
    expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
  })

  it('preserves a real ECharts zoom range when translated series options are merged', async () => {
    const { vm } = await open(Stats)
    const measure = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: text => ({ width: String(text).length * 7 })
    })
    const chart = init(null, null, { renderer: 'svg', ssr: true, width: 800, height: 400 })
    try {
      chart.setOption(vm.summaryChartOption)
      chart.on('datazoom', vm.handleSummaryZoom)
      chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 })
      await setLocale('en-US', { persist: false })
      await flushPromises()
      chart.setOption(vm.summaryChartOption)
      const options = chart.getOption()
      expect(options.dataZoom[0]).toMatchObject({ start: 25, end: 75 })
      expect(options.series[0].name).toBe('Runs')
      expect(options.series[0].data).toEqual(vm.summaryChartOption.series[0].data)
      expect(api.fetchJobRunCounts).toHaveBeenCalledTimes(1)
      vm.summaryQuery = '业务中文'
      await flushPromises()
      chart.setOption(vm.summaryChartOption)
      expect(chart.getOption().dataZoom[0]).toMatchObject({ startValue: 0, endValue: 11 })
    } finally {
      chart.dispose()
      measure.mockRestore()
    }
  })

  it.each([
    [Approvals, 'fetchApproveList'],
    [Requests, 'fetchMyApproveList']
  ])('keeps approval search, status codes and detail record', async (component, query) => {
    const { vm } = await open(component)
    vm.filters.keyword = '设备连通性'
    vm.filters.status = 0
    vm.handleViewDetail(vm.tableData[0])
    await flushPromises()
    const before = vm.filteredData
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.getStatusLabel(0)).toBe('Pending approval')
    expect(vm.getApproveModeLabel('noLimitParams')).toBe('Run with unrestricted parameters')
    expect(vm.filteredData).toBe(before)
    expect(vm.filters).toEqual({ keyword: '设备连通性', status: 0 })
    expect(vm.detailDialogVisible).toBe(true)
    expect(vm.tableData[0]).toEqual(row)
    expect(api[query]).toHaveBeenCalledTimes(1)
    expect(api.passApprove).not.toHaveBeenCalled()
    expect(api.cancelApprove).not.toHaveBeenCalled()
  })
})
