import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Host from '@/modules/patches/views/LinuxHostDetailPage.vue'
import Patches from '@/modules/patches/components/host-detail/tabs/PatchesTab.vue'
import Vulnerabilities from '@/modules/patches/components/host-detail/tabs/VulnerabilitiesTab.vue'
const api = vi.hoisted(() => ({
  getMachineInfo: vi.fn(),
  getPatchesOfMachine: vi.fn(),
  getMachineCVEList: vi.fn(),
  push: vi.fn(),
  route: { query: {} }
}))
vi.mock('@/modules/patches/api', () => ({ patchScanApi: api, rpmInfoApi: {} }))
vi.mock('vue-router', () => ({ useRoute: () => api.route, useRouter: () => ({ push: api.push }) }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="label" /></div>' }
const Table = { methods: { clearSelection() {}, toggleRowSelection() {} }, template: '<div />' }
const Child = {
  methods: { loadPatchList() {}, loadPackageList() {}, loadVulnerabilityList() {} },
  template: '<div />'
}
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElTabs: Slot,
        ElTabPane: Slot,
        ElBreadcrumb: Slot,
        ElBreadcrumbItem: Slot,
        ElTag: Slot,
        ElTable: Table,
        ElTableColumn: true,
        ElIcon: true,
        ElPopover: true,
        ElTooltip: true,
        ElSelect: true,
        ElOption: true,
        'el-input': true,
        'el-button': Slot,
        ElPagination: true,
        PatchesTab: Child,
        PackagesTab: Child,
        VulnerabilitiesTab: Child,
        PatchInstallWizard: true,
        PatchDetailDialog: true,
        RpmPackageDetailDialog: true,
        CveLinkList: true,
        RepoCheckStatus: true
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
  api.route.query = {
    host_id: 'raw-host',
    host_key: '192.0.2.20',
    hostname: '后端主机名',
    fromLabel: '漏洞详情',
    fromRouteName: 'patches-cveList',
    fromRouteQuery: '{"view":"detail","cveId":"CVE-raw"}'
  }
  api.getMachineInfo.mockResolvedValue({
    data: {
      records: [
        { hostname: '后端主机名', os_distro: 'Red Hat', os_version: '8', installed_pkgs: '[]' }
      ]
    }
  })
  api.getPatchesOfMachine.mockResolvedValue({
    data: { records: [{ patch_id: 'raw-patch', severity: 'Critical', patch_name: '后端补丁名' }] }
  })
  api.getMachineCVEList.mockResolvedValue({
    data: {
      records: Array.from({ length: 25 }, (_, index) => ({
        vul_id: `CVE-${index}`,
        patch_id: 'raw-patch',
        patch_status: '未修复',
        host_key: '192.0.2.20'
      }))
    }
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Linux host detail language changes', () => {
  it('translates a known historical back label while retaining the loaded host and original return context', async () => {
    const { vm } = await open(Host)
    vm.activeTab = 'packages'
    vm.patchesToInstall = [{ patch_id: 'raw-patch', patch_name: '后端补丁名' }]
    vm.installDialogVisible = true
    await flushPromises()
    const requests = api.getMachineInfo.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.fromLabel).toBe('Vulnerability details')
    expect(vm.activeTab).toBe('packages')
    expect(vm.machineInfo.hostname).toBe('后端主机名')
    expect(vm.installDialogVisible).toBe(true)
    expect(vm.patchesToInstall).toEqual([{ patch_id: 'raw-patch', patch_name: '后端补丁名' }])
    expect(api.getMachineInfo).toHaveBeenCalledTimes(requests)
    vm.handleBack()
    expect(api.push).toHaveBeenCalledWith({
      name: 'patches-cveList',
      query: { view: 'detail', cveId: 'CVE-raw' }
    })
  })

  it('retains raw severity values and selected patch identities while rendering translated labels', async () => {
    const { vm, wrapper } = await open(Patches, { hostId: 'raw-host', hostKey: '192.0.2.20' })
    vm.selectedPatches = [vm.patchTableData[0]]
    vm.selectedSeverities = ['Critical']
    const requests = api.getPatchesOfMachine.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.getSeverityLabel('严重')).toBe('Critical')
    expect(vm.selectedSeverities).toEqual(['Critical'])
    expect(vm.selectedPatches[0].patch_id).toBe('raw-patch')
    expect(api.getPatchesOfMachine).toHaveBeenCalledTimes(requests)
    vm.handleFixPatches()
    expect(wrapper.emitted('fix-patches')[0][0][0].patch_id).toBe('raw-patch')
    await vm.handleFilterChange()
    expect(api.getPatchesOfMachine.mock.calls.at(-1)[0]).toMatchObject({
      host_id: 'raw-host',
      severity: 'Critical'
    })
  })

  it('keeps Chinese backend patch-status matching, current page and selected vulnerabilities after switching', async () => {
    const { vm } = await open(Vulnerabilities, { hostId: 'raw-host' })
    await vm.loadVulnerabilityList()
    vm.vulPatchStatus = '未修复'
    vm.handleVulPatchStatusChange()
    vm.handleVulPageChange(2)
    vm.selectedVuls = [vm.vulTableData[0]]
    const selected = vm.selectedVuls[0].vul_id
    const requests = api.getMachineCVEList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.vulPatchStatus).toBe('未修复')
    expect(vm.vulPagination.page).toBe(2)
    expect(vm.selectedVuls[0].vul_id).toBe(selected)
    expect(vm.vulTableData).toHaveLength(5)
    expect(vm.patchStatusOptions.find(item => item.value === '未修复').label).toBe('Unfixed')
    expect(api.getMachineCVEList).toHaveBeenCalledTimes(requests)
  })
})
