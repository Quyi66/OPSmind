import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import { setLocale } from '@/core/i18n'
import Overview from '@/modules/patches/windows-patch/views/WindowsPatchOverviewPage.vue'
import HostPatches from '@/modules/patches/windows-patch/components/overview/WinPatchHostPatchesDrawer.vue'
import BatchPatches from '@/modules/patches/windows-patch/components/overview/WinPatchBatchInstallDrawer.vue'
import Scan from '@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue'
import Report from '@/modules/patches/windows-patch/components/overview/WinPatchReportDialog.vue'

const api = vi.hoisted(() => ({ getHosts: vi.fn(), getHostPatches: vi.fn(), createScanTask: vi.fn(), exportReport: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('@/modules/asset/api', () => ({ dataManageApi: { getAllTags: vi.fn().mockResolvedValue({ records: [] }) } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {}, name: '' }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({ default: { template: '<div />' } }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
async function open(component, props = {}) {
  const wrapper = mount(component, { props, global: { stubs: {
    'el-table': ElTable, 'el-table-column': ElTableColumn, 'el-drawer': Slot, 'el-dialog': Slot,
    'el-form': Slot, 'el-form-item': Slot, 'el-button': Slot, 'el-tag': Slot, 'el-tooltip': Slot,
    'el-descriptions': Slot, 'el-descriptions-item': Slot,
    'el-input': true, 'el-select': true, 'el-option': true, 'el-pagination': true, 'el-icon': true,
    'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
    WinPatchHostPatchesDrawer: true, WinPatchBatchInstallDrawer: true, WinPatchReportDialog: true,
    WinPatchScanDialog: true, WinPatchTaskDetailDrawer: true, WinPatchInstallWizard: true,
    WindowsKbDetailDialog: true, WindowsKbLinkList: true, CveLinkList: true,
    AcmDeviceSelector: true, AcmDeviceSelectorDialog: true
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const host = { hostId: 'raw-host', hostKey: '原始中文主机', criticalCount: 2 }
const patch = { id: 'raw-patch', patchStatusId: 'raw-patch', hostId: 'raw-host', title: '后端补丁标题', kbNumber: 'KB9000', severity: 'Critical', patchStatus: 'no_repair' }
beforeEach(async () => {
  vi.resetAllMocks()
  api.getHosts.mockResolvedValue({ data: { content: [host], totalElements: 80 } })
  api.getHostPatches.mockResolvedValue({ data: { content: [patch], totalElements: 1 } })
  api.createScanTask.mockResolvedValue({ data: { status: 'SUCCESS' } })
  api.exportReport.mockResolvedValue({ data: 'raw-report' })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('Windows host actions across language changes', () => {
  it('preserves the host selection and page, and opens severity details with a stable value', async () => {
    const { wrapper, vm } = await open(Overview)
    wrapper.findComponent(ElTable).vm.$emit('selection-change', [vm.hostList[0]])
    vm.pagination.page = 3
    const requests = api.getHosts.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.pagination.page).toBe(3)
    expect(vm.selectedHostRows.map(row => row.hostId)).toEqual(['raw-host'])
    expect(api.getHosts).toHaveBeenCalledTimes(requests)
    await wrapper.get('button[aria-label="View critical patches"]').trigger('click')
    expect(vm.hostDrawerVisible).toBe(true)
    expect(vm.currentHost.hostKey).toBe('原始中文主机')
    expect(vm.hostDrawerInitialFilters.severity).toBe('Critical')
  })

  it('keeps selected host patches and an open installation snapshot without reloading', async () => {
    const { wrapper, vm } = await open(HostPatches, { modelValue: true, hostSummary: host })
    wrapper.findComponent(ElTable).vm.$emit('selection-change', [vm.patchList[0]])
    await flushPromises()
    vm.openInstallWizard()
    vm.pagination.page = 3
    const requests = api.getHostPatches.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedRows[0].patchStatusId).toBe('raw-patch')
    expect(vm.wizardRows[0].title).toBe('后端补丁标题')
    expect(vm.installWizardVisible).toBe(true)
    expect(vm.pagination.page).toBe(3)
    expect(api.getHostPatches).toHaveBeenCalledTimes(requests)
    expect(wrapper.text()).toContain('Critical')
  })

  it('preserves a real table checkbox selection and batch filters when labels change', async () => {
    const { wrapper, vm } = await open(BatchPatches, { modelValue: true, hostSummaries: [host] })
    vm.patchTableRef.toggleRowSelection(vm.allPatchList[0], true)
    await flushPromises()
    vm.filters.keyword = 'KB9000'
    vm.filters.severity = 'Critical'
    await flushPromises()
    const requests = api.getHostPatches.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedRows.map(row => row.patchStatusId)).toEqual(['raw-patch'])
    expect(vm.filters).toMatchObject({ keyword: 'KB9000', severity: 'Critical' })
    expect(wrapper.findAll('.el-table__body .el-checkbox.is-checked')).toHaveLength(1)
    expect(api.getHostPatches).toHaveBeenCalledTimes(requests)
    vm.openInstallWizard()
    expect(vm.wizardRows[0].patchStatusId).toBe('raw-patch')
    expect(vm.wizardHosts[0].hostId).toBe('raw-host')
  })

  it('keeps the selected scan hosts and submits only their original IDs', async () => {
    const { wrapper, vm } = await open(Scan, { modelValue: false, preselectedHosts: [host] })
    await wrapper.setProps({ modelValue: true })
    await setLocale('en-US', { persist: false })
    expect(vm.hostIds).toEqual(['raw-host'])
    expect(vm.selectorOptions.label).toBe('Select Windows hosts')
    expect(api.createScanTask).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(api.createScanTask).toHaveBeenCalledExactlyOnceWith(['raw-host'])
    expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ refreshOverview: true, openDetail: false })
  })

  it('keeps report filters and host IDs and uses the completion locale for the filename', async () => {
    const names = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { names.push(this.download) })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:raw'), revokeObjectURL: vi.fn() }))
    let complete
    api.exportReport.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const { wrapper, vm } = await open(Report, { modelValue: false, preselectedHosts: [host] })
    await wrapper.setProps({ modelValue: true })
    vm.form.severity = 'Critical'
    vm.form.patchStatus = 'is_repair_artificial'
    const pending = vm.handleExport()
    await setLocale('en-US', { persist: false })
    complete({ data: 'raw-report' })
    await pending
    expect(api.exportReport).toHaveBeenCalledExactlyOnceWith({ hostIds: ['raw-host'], severity: 'Critical', patchStatus: 'is_repair_artificial' })
    expect(names).toEqual(['Windows-patch-scan-report.xlsx'])
  })
})
