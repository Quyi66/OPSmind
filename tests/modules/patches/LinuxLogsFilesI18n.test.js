import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import { addLegacyTranslations } from '@/core/i18n/legacy-resources'
import { translateText } from '@/utils/i18n'
import Logs from '@/modules/patches/components/logs/OperationLogsDialog.vue'
import Report from '@/modules/patches/components/logs/ScanReportDialog.vue'
import Files from '@/modules/patches/components/local-install/FileSelectorDialog.vue'
import { formatTaskStatus, formatTaskType } from '@/modules/patches/utils/patchProcessLogs'
import {
  getRebootStatusTooltip,
  getDisplayRebootStatus
} from '@/modules/patches/utils/vulnerabilityPackages'
const api = vi.hoisted(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  return { getLogs: vi.fn(), get: vi.fn() }
})
vi.mock('@/modules/patches/api', () => ({ patchLogsApi: api }))
vi.mock('@/core/api', () => ({ apiService: api, useApi: () => api }))
vi.mock('@/core/auth', () => ({ authService: { getTenantId: () => 'raw-tenant' } }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
async function open(component, props) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-input': true,
        'el-button': Slot,
        ElTable: true,
        ElTableColumn: true,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElTag: Slot,
        ElIcon: true,
        ElEmpty: true,
        ElScrollbar: Slot,
        ElTooltip: Slot,
        ElSelect: true,
        ElOption: true,
        ElPagination: true,
        ScanReportDialog: true,
        WindowsScanReportDialog: true
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
  api.getLogs.mockResolvedValue({
    records: [
      {
        action: '#{app_vap.menu.patch_scan.title}',
        status: 'COMPLETED',
        run_id: 'raw-run',
        message: '后端中文消息'
      }
    ],
    total: 1
  })
  api.get.mockImplementation(async url => {
    if (url.includes('/gfs/'))
      return {
        data: [{ name: '中文包.rpm', path: '原始目录/中文包.rpm', size: 1024, modifiedAt: 1 }]
      }
    if (url.endsWith('/scan-hist'))
      return { data: { data: [{ machine_count: 2, scan_timestamp: 'raw-time' }] } }
    return {
      data: { data: { records: [{ host_id: 'raw-host', host_key: '后端中文主机' }], total: 1 } }
    }
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Linux logs, report and local file language changes', () => {
  it('translates known legacy actions while preserving original action query values and report availability', async () => {
    const { vm } = await open(Logs, { modelValue: true })
    const row = vm.tableData[0]
    expect(vm.canShowScanReport(row)).toBe(true)
    vm.actionFilter = '#{app_vap.menu.patch_install.title}'
    vm.pagination.page = 3
    vm.selectedRunId = 'raw-run'
    vm.detailDialogVisible = true
    const requests = api.getLogs.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.formatAction(row.action)).toBe('Patch scan')
    expect(vm.canShowScanReport(row)).toBe(true)
    expect(vm.pagination.page).toBe(3)
    expect(vm.detailDialogVisible).toBe(true)
    expect(vm.selectedRunId).toBe('raw-run')
    expect(vm.formatMessage(row.message)).toBe('后端中文消息')
    expect(api.getLogs).toHaveBeenCalledTimes(requests)
    await vm.loadData()
    expect(api.getLogs.mock.calls.at(-1)[0]).toMatchObject({
      action: '补丁安装',
      page: 3,
      status: 'all'
    })
    expect(
      vm.resolveDownloadFilename({ name: '服务器中文文件.xlsx' }, 'patch_install', '', '')
    ).toBe('服务器中文文件.xlsx')
  })

  it('keeps custom historical action classification independent of its current-language display name', async () => {
    addLegacyTranslations({ 'i18n-test.scan-action': '补丁扫描' }, 'zh-CN')
    addLegacyTranslations({ 'i18n-test.scan-action': 'Custom scan title' }, 'en-US')
    const { vm } = await open(Logs, { modelValue: true })
    const row = { action: '#{i18n-test.scan-action}', status: 'COMPLETED', run_id: 'raw-run' }
    await setLocale('en-US', { persist: false })
    expect(vm.formatAction(row.action)).toBe('Custom scan title')
    expect(translateText(row.action, 'zh-CN')).toBe('补丁扫描')
    expect(vm.canShowScanReport(row)).toBe(true)
    expect(translateText('#{app_vap.menu.patch_install.title}', 'zh-CN')).toBe('补丁安装')
    expect(translateText('#{app_vap.menu.patch_install.title}')).toBe('Patch installation')
  })

  it('retains loaded scan details, expanded sections, tab and page without rereading a report', async () => {
    const { vm } = await open(Report, { modelValue: false, runId: 'raw-run' })
    await vm.loadReport()
    vm.activeTab = 'packages'
    vm.expandedSections.installedPkgs = true
    vm.hostDetailVisible = true
    vm.hostDetailContext = { hostId: 'raw-host', runId: 'raw-run' }
    vm.hostDetail.installedPkgs = ['原始包名-1.0']
    vm.pagination.page = 2
    const requests = api.get.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.activeTab).toBe('packages')
    expect(vm.expandedSections.installedPkgs).toBe(true)
    expect(vm.hostDetail.installedPkgs).toEqual(['原始包名-1.0'])
    expect(vm.hostDetailContext).toEqual({ hostId: 'raw-host', runId: 'raw-run' })
    expect(vm.pagination.page).toBe(2)
    expect(vm.summary.machine_count).toBe(2)
    expect(api.get).toHaveBeenCalledTimes(requests)
  })

  it('preserves file paths, selections, search and sorting and confirms original files after switching', async () => {
    const { wrapper, vm } = await open(Files, {
      modelValue: false,
      multiple: true,
      filter: '*.rpm'
    })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    const file = vm.fileList.find(item => item.name === '中文包.rpm')
    vm.selectFile(file)
    vm.searchText = '中文包'
    vm.sortBy('name')
    const requests = api.get.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentDir).toBe('')
    expect(vm.searchText).toBe('中文包')
    expect(vm.displayFileList).toHaveLength(1)
    expect(vm.selectionMap['原始目录/中文包.rpm'].name).toBe('中文包.rpm')
    expect(wrapper.text()).toContain('Selected (1)')
    expect(wrapper.find('.selected-column .title').exists()).toBe(true)
    expect(api.get).toHaveBeenCalledTimes(requests)
    vm.handleConfirm()
    expect(wrapper.emitted('confirm')[0][0][0]).toMatchObject({
      name: '中文包.rpm',
      path: '原始目录/中文包.rpm'
    })
  })

  it('translates known presentation helpers while leaving protocol values and unknown statuses unchanged', async () => {
    const row = { reboot_status: '服务重启', reboot_services: ['原始服务', 'sshd'] }
    expect(getDisplayRebootStatus(row)).toBe('服务重启')
    await setLocale('en-US', { persist: false })
    expect(getRebootStatusTooltip(row)).toBe('Service restart (原始服务, sshd)')
    expect(getDisplayRebootStatus(row)).toBe('服务重启')
    expect(formatTaskStatus('PRE_CHECKING')).toBe('Prechecking')
    expect(formatTaskType('pkg_update')).toBe('Package update')
    expect(formatTaskStatus('后端未知状态')).toBe('后端未知状态')
  })
})
