import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { useAutomationJobStore } from '@/modules/automation/stores/useJobStore'
import { setLocale } from '@/core/i18n'
import Page from '@/modules/automation/views/AutomationWorkbenchPage.vue'
import WbJobListDrawer from '@/modules/automation/components/workbench/WbJobListDrawer.vue'
import WbRunLogsDrawer from '@/modules/automation/components/workbench/WbRunLogsDrawer.vue'
import {
  getWorkbenchJobDate,
  selectWorkbenchJobs,
  formatWorkbenchJobDate,
  getRunHostStats,
  formatRunDuration
} from '@/modules/automation/utils/workbenchPresentation'
import { getCronTaskIdentity } from '@/modules/automation/utils/cronTaskPresentation'

const api = vi.hoisted(() => ({
  store: null,
  list: vi.fn(),
  logs: vi.fn(),
  approve: vi.fn(),
  fetchApprovals: vi.fn(),
  refresh: vi.fn(),
  refreshRuns: vi.fn(),
  commandReviews: vi.fn(),
  scriptReviews: vi.fn(),
  fetchJobs: vi.fn()
}))
vi.mock('@/core/auth', () => ({ authService: { hasPermission: () => true } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/modules/automation/composables/useAutomationWorkbench', () => ({
  useAutomationWorkbench: () => api.store
}))
vi.mock('@/modules/automation/components/job/composables/useAppletTranslation', () => ({
  useAppletTranslation: () => ({ appletsList: ref([]) })
}))
vi.mock('@/modules/automation/api/jao', () => ({
  appTableList: api.list,
  fetchJobRunLogs: api.logs,
  passApprove: api.approve,
  refuseApprove: vi.fn(),
  fetchFlowInstances: vi.fn(),
  copyCronJob: vi.fn(),
  deleteCronJob: vi.fn(),
  deleteFlow: vi.fn()
}))
vi.mock('@/modules/automation/api/jobApi', () => ({
  copyJob: vi.fn(),
  deleteJob: vi.fn(),
  deleteJobs: vi.fn(),
  moveJobs: vi.fn(),
  fetchJobs: api.fetchJobs
}))
vi.mock('@/modules/automation/api/command', () => ({
  approveCommand: vi.fn(),
  COMMAND_STATUS: { PUBLISHED: 0, REJECTED: 2 },
  saveCommand: vi.fn(),
  deleteCommand: vi.fn()
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: {
    confirm: vi.fn().mockResolvedValue('confirm'),
    prompt: vi.fn().mockResolvedValue({ value: '原始拒绝原因' })
  }
}))
const wrappers = []
const jobs = [
  {
    id: 'M1x855',
    type: 'script',
    title: '【ACM】设备连通性检测',
    updatedAt: '2026-11-12 10:00:00'
  },
  {
    id: 'raw-job',
    type: 'script',
    title: '自定义中文工具',
    description: '后端中文描述',
    updatedAt: '2026-11-11 10:00:00'
  }
]
const Slot = { template: '<div><slot /><slot name="header" /><slot name="footer" /></div>' }
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDrawer: Slot,
        ElTable: true,
        ElTableColumn: true,
        ElTag: Slot,
        ElAlert: { props: ['title'], template: '<p>{{ title }}</p>' },
        FlowInstanceViewer: true
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
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
  api.list.mockResolvedValue({ data: jobs })
  api.logs.mockResolvedValue({
    data: {
      records: [
        {
          id: 'run-id',
          job_id: 'M1x855',
          job_title: '【ACM】设备连通性检测',
          job_type: 'script',
          status: 'COMPLETED'
        }
      ],
      total: 1
    }
  })
  api.fetchApprovals.mockResolvedValue([
    { id: 'M1x855', title: '【ACM】设备连通性检测', status: 0, description: '后端申请说明' }
  ])
  api.store = {
    loading: ref(false),
    reviewStore: reactive({ approvalCount: 1, commandCount: 0, scriptCount: 0, fetchAll: vi.fn() }),
    todayRunTotal: ref(10),
    failedRunTotal: ref(2),
    activeRunCount: ref(0),
    hasActiveRuns: ref(false),
    jobList: ref(jobs),
    jobTypeCounts: ref([]),
    commandJobList: ref([]),
    commandTypeCounts: ref([]),
    commandList: ref([]),
    flows: ref([]),
    cronSummary: ref({ total: 0, enabled: 0, disabled: 0 }),
    cronJobs: ref([]),
    refreshRunLogData: api.refreshRuns,
    toggleCronJob: vi.fn(),
    executeCronJobNow: vi.fn(),
    fetchApproveItems: api.fetchApprovals,
    fetchCommandReviewItems: api.commandReviews,
    fetchScriptReviewItems: api.scriptReviews,
    refreshAll: api.refresh
  }
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
describe('workbench bilingual presentation', () => {
  it('keeps the Pinia error reference nullable and writable while local errors translate', async () => {
    setActivePinia(createPinia())
    const store = useAutomationJobStore()
    const { error } = storeToRefs(store)
    try {
      expect(error.value).toBe(null)
      api.fetchJobs.mockRejectedValueOnce({ code: 'unavailable' })
      await store.loadJobs()
      expect(error.value).toBe('加载运维工具列表失败')
      await setLocale('en-US', { persist: false })
      expect(error.value).toBe('Unable to load tools')
      expect(api.fetchJobs).toHaveBeenCalledTimes(1)
      store.error = null
      expect(error.value).toBe(null)
      api.fetchJobs.mockRejectedValueOnce(new Error('后端原始错误'))
      await store.loadJobs()
      await setLocale('zh-CN', { persist: false })
      expect(error.value).toBe('后端原始错误')
      expect(api.fetchJobs).toHaveBeenCalledTimes(2)
    } finally {
      store.$dispose()
      setActivePinia(undefined)
    }
  })

  it('keeps filters, card/table state, pagination and loaded approval records while local titles update', async () => {
    const wrapper = await open(Page),
      vm = wrapper.vm.$.setupState
    vm.jobViewportWidth = 900
    vm.jobViewportHeight = 420
    vm.selectedJobType = 'script'
    await flushPromises()
    vm.workbenchViewMode = 'table'
    vm.tablePageSize = 1
    vm.tableCurrentPage = 2
    vm.openFilteredJobListDrawer()
    await vm.openApprovalsDrawer()
    await flushPromises()
    const rows = vm.jobList,
      filtered = vm.filteredWorkbenchJobs,
      approvals = vm.approvalsDrawer.records
    vm.handleOpenRunResult({ id: 'run-id', job_id: 'M1x855', job_title: '【ACM】设备连通性检测' })
    for (const locale of ['en-US', 'zh-CN', 'en-US']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(vm.jobList).toBe(rows)
      expect(vm.filteredWorkbenchJobs).toBe(filtered)
      expect(vm.selectedJobType).toBe('script')
      expect(vm.workbenchViewMode).toBe('table')
      expect(vm.tableCurrentPage).toBe(2)
      expect(vm.approvalsDrawer.records).toBe(approvals)
      expect(vm.jobListDrawer.visible).toBe(true)
      expect(vm.resultMeta.runId).toBe('run-id')
      expect(api.refresh).toHaveBeenCalledTimes(1)
      expect(api.fetchApprovals).toHaveBeenCalledTimes(1)
      expect(api.approve).not.toHaveBeenCalled()
    }
    expect(vm.jobListDrawer.title).toBe('Script tools')
    expect(approvals[0].tagLabel).toBe('Awaiting approval')
    expect(approvals[0].name).toBe('Device connectivity check')
    expect(approvals[0].meta).toBe('后端申请说明')
    expect(vm.resultMeta.jobTitle).toBe('Device connectivity check')
    await vm.handleApproveItem(approvals[0])
    expect(api.approve).toHaveBeenCalledExactlyOnceWith('M1x855', '')
  })
  it('preserves an applied localized tool search while switching language, then emits the original job', async () => {
    const wrapper = await open(WbJobListDrawer, { visible: false })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    const vm = wrapper.vm.$.setupState
    vm.filters.keyword = '设备连通性检测'
    vm.handleSearch()
    const rows = vm.jobs
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.jobs).toBe(rows)
    expect(vm.filteredJobs.map(job => job.id)).toEqual(['M1x855'])
    expect(api.list).toHaveBeenCalledTimes(1)
    vm.handleMoreCommand(vm.filteredJobs[0], 'execute')
    expect(wrapper.emitted('execute')[0][0]).toEqual(jobs[0])
    expect(wrapper.text()).toContain('Device connectivity check')
  })
  it('keeps page filtering, protocol values, pagination and loaded runs without fetching on locale change', async () => {
    const wrapper = await open(WbRunLogsDrawer, { visible: false })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    const vm = wrapper.vm.$.setupState
    vm.pageKeyword = '脚本运维工具'
    vm.pagination.page = 3
    await flushPromises()
    const records = vm.drawerRecords
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.drawerRecords).toBe(records)
    expect(vm.displayRecords).toHaveLength(1)
    expect(vm.pagination.page).toBe(3)
    expect(vm.appliedFilters).toMatchObject({ day: '0', status: 'all', type: '' })
    expect(api.logs).toHaveBeenCalledTimes(1)
    expect(vm.statusOptions.find(item => item.value === 'COMPLETED').label).toBe('Completed')
  })
  it('keeps sorting metadata and task identities stable while translating dates, counts and duration units', async () => {
    const date = getWorkbenchJobDate(jobs[0]),
      sorted = selectWorkbenchJobs(jobs)
    await setLocale('en-US', { persist: false })
    expect(getWorkbenchJobDate(jobs[0])).toEqual(date)
    expect(selectWorkbenchJobs(jobs)).toEqual(sorted)
    expect(formatWorkbenchJobDate(jobs[0]).label).toContain('Updated')
    expect(getRunHostStats('{"totalHosts":2,"okHosts":0}')).toEqual([
      { key: 'totalHosts', label: 'Total', tone: 'info', count: 2 },
      { key: 'okHosts', label: 'Succeeded', tone: 'success', count: 0 }
    ])
    expect(
      formatRunDuration({ start_time: '2026-11-12 10:00:00', end_time: '2026-11-12 10:01:02' })
    ).toBe('1m 2s')
    expect(
      getCronTaskIdentity({ id: 'original-id', jobDesc: '原始中文任务', jobType: 'script' })
    ).toBe('原始中文任务 (Script task · ID: original-id)')
  })
})
