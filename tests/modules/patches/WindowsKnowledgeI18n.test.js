import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import { setLocale, t } from '@/core/i18n'
import CveList from '@/modules/patches/windows-patch/views/WindowsCveListPage.vue'
import KbList from '@/modules/patches/windows-patch/views/WindowsKbListPage.vue'
import CveDetail from '@/modules/patches/windows-patch/components/cve/details/WindowsCveDetail.vue'
import KbDetail from '@/modules/patches/windows-patch/components/kb/WindowsKbDetail.vue'
import KbLinks from '@/modules/patches/windows-patch/components/kb/WindowsKbLinkList.vue'
import TaskDetail from '@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue'
import { downloadBlobResponse } from '@/modules/patches/windows-patch/utils'

const api = vi.hoisted(() => ({ cveList: vi.fn(), cveStats: vi.fn(), kbList: vi.fn(), kbStats: vi.fn(), cveDetail: vi.fn(), products: vi.fn(), kbDetail: vi.fn(), hosts: vi.fn(), taskDetail: vi.fn(), options: [] }))
vi.mock('@/modules/patches/api', () => ({ winCveApi: { getCveList: api.cveList, getStatistics: api.cveStats, getCveDetail: api.cveDetail, getAffectedProducts: api.products }, winKbApi: { getKbList: api.kbList, getStatistics: api.kbStats, getKbDetail: api.kbDetail, getAffectedHosts: api.hosts } }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: { getTaskDetail: api.taskDetail } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {}, name: '' }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/composables/useTheme', async () => {
  const { ref } = await import('vue')
  return { useTheme: () => ({ isDark: ref(false) }) }
})
vi.mock('echarts', () => ({ init: () => ({ dispose: vi.fn(), resize: vi.fn(), setOption: option => api.options.push(option) }) }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({ default: { template: '<div />' } }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Dialog = { props: ['title'], template: '<div data-dialog :data-title="title"><slot /><slot name="footer" /></div>' }
const wrappers = []
async function open(component, props = {}) {
  const wrapper = mount(component, { props, global: { stubs: {
    'el-dialog': Dialog, 'el-form': Slot, 'el-form-item': Slot, 'el-button': Slot,
    'el-table': ElTable, 'el-table-column': ElTableColumn, 'el-tabs': Slot, 'el-tab-pane': Slot,
    'el-tag': Slot, 'el-breadcrumb': Slot, 'el-breadcrumb-item': Slot, 'el-descriptions': Slot, 'el-descriptions-item': Slot,
    'el-input': true, 'el-select': true, 'el-option': true, 'el-date-picker': true, 'el-pagination': true, 'el-icon': true, 'el-switch': true,
    WindowsKbLinkList: true, CveLinkList: true, ManualExportDialog: true, WinPatchTaskScriptUploader: true
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.clearAllMocks()
  api.options.length = 0
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(); return 1 })
  api.cveList.mockResolvedValue({ data: { content: [{ cveId: 'CVE-RAW', cvss3Score: 0, severity: 'Critical', title: '后端中文标题' }], totalElements: 80 } })
  api.kbList.mockResolvedValue({ data: { content: [{ kbNumber: 'KB-RAW', maxCvss3Score: 0, msrcSeverity: 'Critical', title: '后端补丁标题' }], totalElements: 80 } })
  api.cveStats.mockResolvedValue({ data: { totalCves: 15, bySeverity: { 严重: 7, 重要: 5, 中等: 2, 低危: 1 } } })
  api.kbStats.mockResolvedValue({ data: { totalKbs: 15, bySeverity: { 严重: 7, 重要: 5, 中等: 2, 低危: 1, 未指定: 3 } } })
  api.cveDetail.mockResolvedValue({ data: { cveId: 'CVE-RAW', cvss3Score: 0, description: '', summary: { total: 3, affected: 2, fixed: 1 } } })
  api.products.mockResolvedValue({ data: { products: [{ productName: '原始产品', status: 'fixed' }, { productName: '另一产品', status: 'affected' }] } })
  api.kbDetail.mockResolvedValue({ data: { kbNumber: 'KB-RAW', description: '', cves: [{ cveId: 'CVE-RAW', cvss3Score: 0 }] } })
  api.hosts.mockResolvedValue({ data: { hosts: [] } })
  api.taskDetail.mockResolvedValue({ data: { task: { id: 'raw-task', taskType: 'ROLLBACK', currentStep: 'EXECUTE', status: 'ROLLBACK_DONE', executeRunId: 'raw-run' }, hosts: [], steps: [] } })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('Windows knowledge and task detail language changes', () => {
  it('英文 KB 统计保留完整数量与严重级别协议，表格宽度可恢复中文', async () => {
    api.kbStats.mockResolvedValueOnce({ data: { totalKbs: 3628, bySeverity: { 严重: 1407, 重要: 1984, 中等: 38, 低危: 7, 未指定: 192 } } })
    const { wrapper, vm } = await open(KbList)
    const table = wrapper.findComponent(ElTable)
    const highest = table.findAllComponents(ElTableColumn).find(item => item.props('label') === t('patches.windows.highestCvss'))
    const instance = table.vm.$.uid
    vm.searchParams.keyword = '保留查询'
    vm.searchParams.page = 2
    const counts = JSON.stringify(vm.statistics.bySeverity)
    const reads = api.kbList.mock.calls.length
    expect(Number(highest.props('width'))).toBe(110)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(Number(highest.props('width'))).toBe(144)
    expect(table.vm.$.uid).toBe(instance)
    const important = wrapper.findAll('.severity-bar').find(item => item.find('.severity-bar__label').text() === 'Important')
    expect(important.find('.severity-bar__value strong').text()).toBe('1,984')
    expect(important.find('.severity-bar__value em').text()).toMatch(/%$/)
    expect(JSON.stringify(vm.statistics.bySeverity)).toBe(counts)
    expect(vm.searchParams).toMatchObject({ keyword: '保留查询', page: 2 })
    expect(api.kbList).toHaveBeenCalledTimes(reads)
    await important.trigger('click')
    await flushPromises()
    expect(vm.searchParams.severity).toBe('Important')
    expect(api.kbList.mock.lastCall[0]).toMatchObject({ severity: 'Important' })
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(Number(highest.props('width'))).toBe(110)
    expect(api.kbStats).toHaveBeenCalledTimes(1)
  })

  it.each([[CveList, 'cveList'], [KbList, 'kbList']])('keeps Chinese severity counts, pagination, filters and zero CVSS after switching', async (component, request) => {
    const { wrapper, vm } = await open(component)
    vm.searchParams.page = 2
    vm.searchParams.keyword = '用户查询'
    vm.searchParams.severity = 'Critical'
    const calls = api[request].mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.searchParams).toMatchObject({ page: 2, keyword: '用户查询', severity: 'Critical' })
    expect(api[request]).toHaveBeenCalledTimes(calls)
    expect(wrapper.text()).toContain('Critical')
    expect(wrapper.text()).toContain('0.0')
    if (component === CveList) expect(vm.getSeverityCount('critical')).toBe(7)
    else {
      expect(vm.severityStats.find(item => item.value === 'Critical').count).toBe(7)
      expect(vm.unspecifiedCount).toBe(3)
    }
  })

  it('updates CVE chart and status labels while retaining the product filter, raw data and zero CVSS', async () => {
    const { wrapper, vm } = await open(CveDetail, { cveId: 'CVE-RAW' })
    vm.productFilter = 'fixed'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.productFilter).toBe('fixed')
    expect(vm.filteredProducts).toHaveLength(1)
    expect(vm.getStatusLabel(vm.filteredProducts[0].status)).toBe('Fixed')
    expect(vm.filteredProducts[0].productName).toBe('原始产品')
    expect(wrapper.text()).toContain('0.0')
    expect(vm.renderedDescription).toContain('No detailed description available.')
    expect(api.options.at(-1).series[0].data.map(item => [item.name, item.value])).toEqual([['Affected', 2], ['Fixed', 1]])
    expect(api.cveDetail).toHaveBeenCalledTimes(1)
    expect(api.products).toHaveBeenCalledTimes(1)
  })

  it('translates the KB description fallback without changing server-provided HTML', async () => {
    const { vm } = await open(KbDetail, { kbNumber: 'KB-RAW' })
    await setLocale('en-US', { persist: false })
    expect(vm.renderDescription(vm.detail.description)).toContain('No description available.')
    vm.detail.description = '<p>后端中文描述 {raw}</p>'
    expect(vm.renderDescription(vm.detail.description)).toContain('后端中文描述 {raw}')
    expect(api.kbDetail).toHaveBeenCalledTimes(1)
  })

  it('updates an open KB overflow dialog while preserving an explicitly supplied title', async () => {
    const { wrapper, vm } = await open(KbLinks, { kbNumbers: ['KB1', 'KB2'], max: 1 })
    vm.dialogVisible = true
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.get('[data-dialog]').attributes('data-title')).toBe('Related KBs')
    await wrapper.setProps({ dialogTitle: '自定义 KB 标题' })
    await setLocale('zh-CN', { persist: false })
    expect(wrapper.get('[data-dialog]').attributes('data-title')).toBe('自定义 KB 标题')
    expect(vm.dialogVisible).toBe(true)
  })

  it('recognizes rollback by task type and keeps the open run title reactive', async () => {
    const { vm } = await open(TaskDetail, { modelValue: true, taskId: 'raw-task' })
    vm.autoPollingEnabled = false
    vm.handleViewRunResult('raw-run', '执行回滚', 'ROLLBACK')
    await setLocale('en-US', { persist: false })
    expect(vm.availableExecuteRuns.find(item => item.key === 'ROLLBACK').label).toBe('Execute rollback')
    expect(vm.currentRunJobTitle).toBe('Execute rollback')
    expect(vm.currentRunId).toBe('raw-run')
    expect(api.taskDetail).toHaveBeenCalledTimes(1)
  })

  it('gives English partial-success tags more room and preserves the selected host status', async () => {
    api.taskDetail.mockResolvedValueOnce({
      data: {
        task: { id: 'raw-task', taskType: 'INSTALL', status: 'PARTIAL_SUCCESS' },
        hosts: [
          { hostKey: 'server-1', status: 'PARTIAL_SUCCESS', errorMessage: '原始错误详情' },
          { hostKey: 'server-2', status: 'FAILED' }
        ]
      }
    })
    const { wrapper, vm } = await open(TaskDetail, { modelValue: true, taskId: 'raw-task' })
    const statusColumn = wrapper
      .findAllComponents(ElTableColumn)
      .find(column => column.props('label') === t('common.status'))
    const content = wrapper.get('.win-patch-task-detail')
    vm.hostStatus = 'PARTIAL_SUCCESS'
    expect(Number(statusColumn.props('width'))).toBe(100)
    expect(content.classes()).not.toContain('is-english')

    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(Number(statusColumn.props('width'))).toBe(168)
    expect(content.classes()).toContain('is-english')
    expect(vm.hostStatus).toBe('PARTIAL_SUCCESS')
    expect(vm.hostStatusOptions).toContainEqual({
      value: 'PARTIAL_SUCCESS',
      label: 'Partially succeeded'
    })
    expect(wrapper.text()).toContain('原始错误详情')
    expect(wrapper.text()).not.toContain('server-2')

    await setLocale('zh-CN', { persist: false })
    expect(Number(statusColumn.props('width'))).toBe(100)
    expect(content.classes()).not.toContain('is-english')
    expect(api.taskDetail).toHaveBeenCalledTimes(1)
  })

  it('chooses the default download name at download time and preserves the backend filename', async () => {
    const downloads = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download) })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:raw'), revokeObjectURL: vi.fn() }))
    downloadBlobResponse({ data: 'raw' })
    await setLocale('en-US', { persist: false })
    downloadBlobResponse({ data: 'raw' })
    downloadBlobResponse({ data: 'raw', headers: { 'content-disposition': 'attachment; filename="后端报告.xlsx"' } })
    expect(downloads).toEqual(['Windows补丁扫描报告.xlsx', 'Windows-patch-scan-report.xlsx', '后端报告.xlsx'])
  })
})
