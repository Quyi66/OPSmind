import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Overview from '@/modules/inspection/views/InspectionOverviewPage.vue'
import Templates from '@/modules/inspection/views/TemplateListPage.vue'
import { getReportReturnTarget } from '@/modules/inspection/utils/report-navigation'

const api = vi.hoisted(() => ({ square: vi.fn(), list: vi.fn(), statistics: vi.fn(), remove: vi.fn(), params: vi.fn(), recent: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), push: vi.fn(), replace: vi.fn(), route: { path: '/cac/overview', query: {}, hash: '' } }))
vi.mock('@/modules/inspection/api', () => ({ templateApi: { getSquareTemplates: api.square, getTemplates: api.list, deleteTemplate: api.remove }, dtsApi: { getStatistics: api.statistics }, paramApi: { getParams: api.params }, jobApi: {} }))
vi.mock('axios', () => ({ default: { post: api.recent } }))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: () => ({}) } }))
vi.mock('vue-router', () => ({ useRoute: () => api.route, useRouter: () => ({ push: api.push, replace: api.replace }) }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, error: api.error, warning: api.warning }, ElMessageBox: { confirm: api.confirm } }))
vi.mock('@/modules/inspection/components/template/TemplateEditDialog.vue', () => ({ default: { props: ['visible', 'templateId'], template: '<div />' } }))
vi.mock('@/modules/inspection/components/template/RunTemplateDialog.vue', () => ({ default: { props: ['visible', 'templateId'], template: '<div />' } }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
async function open(component) {
  const wrapper = shallowMount(component, { global: { stubs: {
    'el-table': Slot, 'el-table-column': { template: '<div />' }, 'el-button': Slot, 'el-form': Slot, 'el-form-item': Slot,
    'el-input': true, 'el-pagination': true, 'el-dropdown': Slot, 'el-dropdown-menu': Slot, 'el-dropdown-item': Slot, 'el-icon': true,
    'el-alert': { props: ['title'], template: '<div>{{ title }}</div>' }
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const fixture = () => Array.from({ length: 35 }, (_, i) => ({ id: `raw-${i}`, jobId: `job/${i}`, templateName: `原始模板-${i}`, description: '后端中文描述', executedBy: '原始执行人', executedAt: new Date(Date.UTC(2026, 9, i + 1)).toISOString(), auditParams: [{ hosts: [{ key: 'raw-host', value: '中文主机' }], scripts: [] }] }))
beforeEach(async () => {
  vi.resetAllMocks()
  api.route.query = {}
  api.list.mockResolvedValue({ data: fixture() })
  api.square.mockResolvedValue({ data: fixture().slice(0, 1) })
  api.statistics.mockResolvedValue({ data: { records: [{ name: 'OK', value: 3 }, { name: 'FAILED', value: 2 }, { name: 'UNREACHABLE', value: 0 }] } })
  api.params.mockResolvedValue({ data: [] })
  api.recent.mockResolvedValue({ data: { data: [] } })
  api.confirm.mockResolvedValue()
  api.remove.mockResolvedValue({})
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection overview and template list language changes', () => {
  it('keeps overview counts, identities and raw search without reloading', async () => {
    const { wrapper, vm } = await open(Overview)
    vm.searchKeyword = '原始'
    const row = vm.templateList[0]
    const requests = api.square.mock.calls.length
    const statisticsRequests = api.statistics.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Inspection results summary')
    expect(vm.searchKeyword).toBe('原始')
    expect(vm.templateList[0]).toBe(row)
    expect(vm.distributionData.find(item => item.key === 'FAILED')).toMatchObject({ field: 'failed', value: 2, label: 'Check failed' })
    expect(vm.getResultState(row).label).toBe('Failed checks found')
    expect(vm.summaryCoverage).toContain('Statistics loaded for 1 / 1')
    expect(api.square).toHaveBeenCalledTimes(requests)
    expect(api.statistics).toHaveBeenCalledTimes(statisticsRequests)
    vm.handleCommand('run', row)
    expect(vm.runTemplateId).toBe('raw-0')
    expect(vm.runDialogVisible).toBe(true)
  })

  it('updates an interrupted loading notice without retrying automatically', async () => {
    api.square.mockRejectedValue(new Error('offline'))
    const { vm } = await open(Overview)
    expect(vm.listError).toBe('读取巡检模板失败，请刷新重试。')
    await setLocale('en-US', { persist: false })
    expect(vm.listError).toBe('Failed to load inspection templates. Refresh to try again.')
    expect(vm.summaryCoverage).toContain('No verified summary')
    expect(api.square).toHaveBeenCalledTimes(1)
  })

  it('lets in-flight statistics complete in the selected language without restarting the request', async () => {
    let finish
    api.statistics.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const { vm } = await open(Overview)
    expect(vm.templateList[0].statisticsState).toBe('loading')
    await setLocale('en-US', { persist: false })
    expect(vm.getResultState(vm.templateList[0]).label).toBe('Loading statistics')
    expect(vm.summaryCoverage).toBe('Partial summary · Statistics loaded for 0 / 1 template with a report')
    finish({ data: { records: [{ name: 'OK', value: 4 }] } })
    await flushPromises()
    expect(vm.templateList[0].statisticsState).toBe('ready')
    expect(vm.distributionData.find(item => item.key === 'OK').value).toBe(4)
    expect(vm.summaryCoverage).toBe('Statistics loaded for 1 / 1 template with a report')
    expect(api.statistics).toHaveBeenCalledTimes(1)
  })

  it('joins partial statistics and failure notices without resource whitespace or ordinal parameters', async () => {
    api.square.mockResolvedValue({ data: fixture().slice(0, 2) })
    api.statistics.mockRejectedValueOnce(new Error('offline'))
    const { vm } = await open(Overview)
    expect(vm.summaryCoverage).toBe('部分汇总 · 统计已读取 1 / 2 个有报告模板 · 1 个统计未读取成功')
    await setLocale('en-US', { persist: false })
    expect(vm.summaryCoverage).toBe('Partial summary · Statistics loaded for 1 / 2 templates with reports · Failed to load statistics for 1 template')
    expect(api.statistics).toHaveBeenCalledTimes(2)
  })

  it('reuses the relative-time formatter across rows and replaces it after a language change', async () => {
    const now = Date.UTC(2026, 10, 16, 8)
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const RelativeTimeFormat = Intl.RelativeTimeFormat
    const formatter = vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(function (locale, options) {
      return new RelativeTimeFormat(locale, options)
    })
    const rows = fixture().slice(0, 2)
    rows[0].executedAt = new Date(now - 86400000).toISOString()
    rows[1].executedAt = new Date(now - 120000).toISOString()
    api.square.mockResolvedValue({ data: rows })
    const { vm } = await open(Overview)
    await setLocale('en-US', { persist: false })
    expect(vm.templateList[0].executedTime).toBe('1 day ago')
    expect(vm.templateList[1].executedTime).toBe('2 minutes ago')
    expect(vm.templateList[0].executedTime).toBe('1 day ago')
    expect(formatter).toHaveBeenCalledTimes(1)
    await setLocale('zh-CN', { persist: false })
    expect(vm.templateList[0].executedTime).toBe('1天前')
    expect(vm.templateList[1].executedTime).toBe('2分钟前')
    expect(formatter).toHaveBeenCalledTimes(2)
  })

  it('preserves list filters, sorting, pagination and raw names when labels change', async () => {
    const { vm } = await open(Templates)
    vm.filters.keyword = '原始'
    vm.handleSortChange({ prop: 'hostCount', order: 'ascending' })
    vm.currentPage = 3
    const row = vm.paginatedData[0]
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentPage).toBe(3)
    expect(vm.filters.keyword).toBe('原始')
    expect(vm.paginatedData[0]).toBe(row)
    expect(api.list).toHaveBeenCalledTimes(1)
    vm.goToJobList(row)
    expect(api.push).toHaveBeenLastCalledWith({ path: '/cac/results', query: { templateId: row.id } })
  })

  it('translates stale-result warnings while retaining the last successful data and disabled actions', async () => {
    const { vm } = await open(Templates)
    const previous = vm.tableData
    api.list.mockRejectedValueOnce(new Error('offline'))
    await vm.loadTemplates()
    await setLocale('en-US', { persist: false })
    expect(vm.tableData).toBe(previous)
    expect(vm.readMessage).toContain('last successful results')
    expect(vm.rowActionReason).toContain('Refresh successfully')
    expect(vm.isTemplateCurrent(previous[0])).toBe(false)
    await vm.deleteTemplate(previous[0])
    expect(api.remove).not.toHaveBeenCalled()
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('keeps delete IDs and previously obtained report return locations independent of the language', async () => {
    const { vm } = await open(Templates)
    const target = getReportReturnTarget({ from: 'overview', overviewSearch: '原始搜索', overviewTop: '20' })
    const history = getReportReturnTarget({ templateId: 'raw-template', page: '2' })
    const location = structuredClone(target.location)
    const historyLocation = structuredClone(history.location)
    expect(history.label).toBe('执行记录')
    await setLocale('en-US', { persist: false })
    expect(target.label).toBe('Inspection overview')
    expect(target.location).toEqual(location)
    expect(history.label).toBe('Execution history')
    expect(history.location).toEqual(historyLocation)
    await vm.deleteTemplate(vm.tableData[0])
    expect(api.confirm.mock.calls[0][0]).toBe('Delete template “原始模板-0”?')
    expect(api.remove).toHaveBeenCalledExactlyOnceWith('raw-0')
  })
})
