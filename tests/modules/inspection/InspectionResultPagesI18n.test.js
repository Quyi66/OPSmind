import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import List from '@/modules/inspection/views/ResultListPage.vue'
import Report from '@/modules/inspection/views/ResultDetailPage.vue'
import { summarizeResultConfiguration } from '@/modules/inspection/utils/result-record-presentation'

const api = vi.hoisted(() => ({
  getTemplates: vi.fn(), getJob: vi.fn(), getStatistics: vi.fn(), getCheckItemMachine: vi.fn(), getHostCheckItems: vi.fn(),
  getCheckItemByStatus: vi.fn(), getCheckItemDetail: vi.fn(), post: vi.fn(), get: vi.fn(), confirm: vi.fn(), saveWhitelist: vi.fn(),
  success: vi.fn(), error: vi.fn(), push: vi.fn(),
  route: { path: '/cac/results', fullPath: '/cac/results', query: {}, params: {}, hash: '' }
}))
vi.mock('@/modules/inspection/api', () => ({ templateApi: api, jobApi: api, dtsApi: api, whitelistApi: api }))
vi.mock('axios', () => ({ default: { post: api.post } }))
vi.mock('@/core/api', () => ({ apiService: { get: api.get } }))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: () => ({ 'X-Test-Auth': 'original' }) } }))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling() {} }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, error: api.error }, ElMessageBox: { confirm: api.confirm } }))
vi.mock('vue-router', () => ({ useRoute: () => api.route, useRouter: () => ({ push: api.push, resolve: target => ({ href: target.path, fullPath: target.path }) }) }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/modules/inspection/components/result-detail', () => Object.fromEntries([
  'AssetModelConfigDialog', 'StatisticsCards', 'HostDetailDialog', 'KpiDetailDialog', 'CheckItemDetailDialog',
  'CheckItemHostsDialog', 'WhitelistDialog', 'ItemWhitelistDialog'
].map(name => [name, { template: '<div />' }])))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
const configuration = [{ hosts: [{ hostKey: '中文主机', key: 'raw-host' }], scripts: [{ scriptPath: '目录/原脚本.yml', scriptParams: '--raw' }] }]
const record = { id: 'runA', templateId: 'template/raw', templateName: '后端中文模板', jobStatus: 'OK', auditParams: configuration }
async function open(component) {
  const wrapper = shallowMount(component, { global: { stubs: {
    ...Object.fromEntries(['el-form','el-form-item','el-table','el-button','el-icon','el-select','el-option','el-tag','el-dialog',
      'el-breadcrumb','el-breadcrumb-item','el-dropdown','el-dropdown-menu'].map(name => [name, Slot])),
    'el-table-column': true, 'el-input': true, 'el-pagination': true, 'el-tabs': true, 'el-tab-pane': true,
    'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' }, I18nT: false, 'i18n-t': false
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.resetAllMocks()
  api.route.path = '/cac/results'
  api.route.fullPath = '/cac/results'
  api.route.query = { templateId: record.templateId, keyword: '已应用中文', page: '3', size: '20', sortProp: 'endedAt', sortOrder: 'ascending' }
  api.getTemplates.mockResolvedValue({ data: [{ id: record.templateId, templateName: record.templateName }] })
  api.post.mockResolvedValue({ data: { data: [record], recordsFiltered: 55 } })
  api.get.mockResolvedValue({ value: 'yes' })
  api.getJob.mockResolvedValue({ data: { ...record, taskId: 'raw-task' } })
  api.getStatistics.mockResolvedValue({ records: [{ name: 'FAILED', value: 2 }] })
  api.getCheckItemMachine.mockResolvedValue({ records: [], total: 0 })
  api.getCheckItemByStatus.mockResolvedValue({ records: [{ name: '原始检查项', host_key: '中文主机', status: 'FAILED' }] })
  api.getHostCheckItems.mockResolvedValue({ data: [] })
  api.confirm.mockResolvedValue()
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection execution history and reports language changes', () => {
  it('preserves applied query, draft keyword, paging, sorting, row identity and log task IDs', async () => {
    const { vm } = await open(List)
    const row = vm.tableData[0]
    const summary = vm.configurationCounts.get(row)
    vm.filters.keyword = '尚未应用草稿'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedTemplateId).toBe(record.templateId)
    expect(vm.filters.keyword).toBe('尚未应用草稿')
    expect(vm.appliedKeyword).toBe('已应用中文')
    expect(vm.pagination).toMatchObject({ page: 3, size: 20, total: 55 })
    expect(vm.sortState).toEqual({ prop: 'endedAt', order: 'ascending' })
    expect(vm.tableData[0]).toBe(row)
    expect(vm.configurationCounts.get(row)).toBe(summary)
    expect(summary.summary).toBe('Group 1: hosts 1, scripts 1')
    expect(vm.getStatusText('OK')).toBe('Completed')
    expect(vm.getStatusText('后端未知状态')).toBe('后端未知状态')
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.getTemplates).toHaveBeenCalledTimes(1)
    const [url, params] = api.post.mock.calls[0]
    expect(url).toContain('/jobs/page/template/raw')
    expect(Object.fromEntries(params)).toMatchObject({ 'search[value]': '已应用中文', start: '40', length: '20', 'order[0][column]': '3', 'order[0][dir]': 'asc' })
    await vm.showJobLog(row)
    expect(vm.currentRunId).toBe('raw-task')
    expect(vm.currentJobTitle).toBe(record.templateName)
    vm.viewResult(row)
    expect(api.push).toHaveBeenLastCalledWith({ path: '/cac/results/runA', query: expect.objectContaining({ templateId: record.templateId, keyword: '已应用中文', page: '3' }) })
  })

  it('translates persistent read errors and action reasons without retrying or replacing stale rows', async () => {
    const { vm } = await open(List)
    const rows = vm.tableData
    api.post.mockRejectedValueOnce(new Error('offline'))
    await vm.loadResults()
    await setLocale('en-US', { persist: false })
    expect(vm.tableData).toBe(rows)
    expect(vm.readMessage).toContain('last successful results')
    expect(vm.reportActionReason({ jobStatus: 'RUNNING' })).toContain('after the task finishes')
    expect(api.post).toHaveBeenCalledTimes(2)
  })

  it('keeps obtained configuration summaries reactive without changing counts or backend data', async () => {
    const source = structuredClone(configuration)
    const summary = summarizeResultConfiguration(source)
    const invalid = summarizeResultConfiguration('{invalid')
    const empty = summarizeResultConfiguration([])
    expect(summary.summary).toBe('配置组 1：主机 1，脚本 1')
    await setLocale('en-US', { persist: false })
    expect(summary).toMatchObject({ hostCount: 1, scriptCount: 1, summary: 'Group 1: hosts 1, scripts 1' })
    expect(invalid.summary).toBe('Configuration cannot be verified')
    expect(empty.summary).toBe('No configuration entries')
    expect(source).toEqual(configuration)
  })

  it('updates an open KPI title while preserving its rows, filters and raw status requests', async () => {
    api.route.path = '/cac/results/runA'
    api.route.fullPath = api.route.path
    const { vm } = await open(Report)
    await vm.dialogs.showKpiDialog('FAILED')
    const rows = vm.dialogs.kpiDialogData.value
    vm.hostSearchText = '主机草稿'
    vm.inspectionResultFilter = 'FAILED'
    vm.inspectionSearchText = '检查项草稿'
    await flushPromises()
    vm.inspectionPage = 3
    vm.selectedHostIds = ['original-host-id']
    await setLocale('en-US', { persist: false })
    expect(vm.dialogs.kpiDialogVisible.value).toBe(true)
    expect(vm.dialogs.kpiDialogTitle.value).toBe('Check failed - Details')
    expect(vm.dialogs.kpiDialogData.value).toBe(rows)
    expect(vm.inspectionPage).toBe(3)
    expect(vm.inspectionResultFilter).toBe('FAILED')
    expect(vm.inspectionSearchText).toBe('检查项草稿')
    expect(vm.hostSearchText).toBe('主机草稿')
    expect(vm.selectedHostIds).toEqual(['original-host-id'])
    expect(api.getCheckItemByStatus).toHaveBeenCalledExactlyOnceWith('runA', 'FAILED')
    expect(api.getJob).toHaveBeenCalledTimes(1)
    expect(api.getStatistics).toHaveBeenCalledTimes(1)
  })

  it('downloads the original report bytes with the original template name and raw export URL', async () => {
    api.route.path = '/cac/results/runA'
    const { vm } = await open(Report)
    const blob = new Blob(['原始后端工作簿'])
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob })
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:original')
      static revokeObjectURL = vi.fn()
    })
    let filename
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download })
    await setLocale('en-US', { persist: false })
    await vm.exportResult()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/results/export/runA'), { method: 'GET', headers: { 'X-Test-Auth': 'original' } })
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(filename).toMatch(/^后端中文模板_.*\.xlsx$/)
    expect(api.success).toHaveBeenLastCalledWith('Export completed')
  })
})
