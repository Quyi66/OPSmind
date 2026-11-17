import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Page from '@/modules/yum-repo/views/YumRepoManagementPage.vue'
import SourceTable from '@/modules/yum-repo/components/YumRepoSourceTable.vue'
import Packages from '@/modules/yum-repo/components/YumRepoPackagesPanel.vue'
import Compare from '@/modules/yum-repo/components/YumRepoComparePanel.vue'
import LinuxYum from '@/modules/patches/views/LinuxYumManagePage.vue'
import { yumRepoApi } from '@/modules/yum-repo/api'
import {
  getCollectStatusLabel,
  getDiffTypeLabel,
  getYumConfigCompareLabel
} from '@/modules/yum-repo/utils'
import { YUM_REPO_OS_FAMILY_OPTIONS } from '@/modules/yum-repo/constants'

const hostApi = vi.hoisted(() => ({
  getHostYumList: vi.fn(),
  getHostRepoDetail: vi.fn(),
  runJob: vi.fn()
}))
vi.mock('@/modules/yum-repo/api', () => ({
  yumRepoApi: {
    getConfigList: vi.fn(),
    getCompareOverview: vi.fn(),
    createConfig: vi.fn(),
    updateConfig: vi.fn(),
    deleteConfig: vi.fn(),
    collectPackages: vi.fn(),
    compareScannedPatches: vi.fn(),
    getPackages: vi.fn(),
    getComparePatchView: vi.fn()
  }
}))
vi.mock('@/modules/patches/api', () => ({ yumManageApi: hostApi }))
vi.mock('@/modules/automation/api/command', () => ({ runJob: hostApi.runJob }))
vi.mock('@/modules/patches/composables/usePatchScanCompletion', () => ({
  usePatchScanCompletion: () => ({ trackScan: vi.fn() })
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const config = {
  id: 'dc-id',
  name: '原仓库',
  description: '后端中文描述',
  baseurls: ['https://example.test/原始/$basearch'],
  osFamily: 'kylinos',
  osMajor: 'V10',
  arch: 'aarch64',
  file: '/原目录/local.repo',
  collectStatus: 'SUCCESS',
  sourceIds: ['source-id']
}
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElTable: true,
        ElTableColumn: true,
        ElSelect: Slot,
        ElOption: true,
        ElTag: Slot
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
  yumRepoApi.getConfigList.mockResolvedValue([config])
  yumRepoApi.getCompareOverview.mockResolvedValue({ sources: [] })
  yumRepoApi.getPackages.mockResolvedValue({
    data: { content: [{ name: 'raw-package', version: '1.2.3' }], totalElements: 31 }
  })
  yumRepoApi.collectPackages.mockResolvedValue({ data: { id: 'collect-id' } })
  yumRepoApi.compareScannedPatches.mockResolvedValue({ success: true })
  hostApi.getHostYumList.mockResolvedValue({
    data: { records: [{ $data_owner: '原始主机', os_distro: '原系统', os_version: 'V10' }] }
  })
  hostApi.getHostRepoDetail.mockResolvedValue({ data: { records: [] } })
  hostApi.runJob.mockResolvedValue({ data: { runId: 'raw-run' } })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  await setLocale('zh-CN', { persist: false })
})

describe('Yum repository i18n and stable request values', () => {
  it('routes compact English menu actions without submitting requests or enabling unavailable comparisons', async () => {
    const { vm, wrapper } = await open(SourceTable, { configs: [config], sources: [] })
    await setLocale('en-US', { persist: false })
    vm.handleConfigAction('compare', config)
    vm.handleConfigAction('unknown', config)
    expect(wrapper.emitted('open-compare')).toBeUndefined()
    expect(yumRepoApi.deleteConfig).not.toHaveBeenCalled()
    vm.handleConfigAction('edit', config)
    expect(vm.dialogVisible).toBe(true)
    expect(vm.editingConfig.id).toBe(config.id)
    expect(yumRepoApi.updateConfig).not.toHaveBeenCalled()
    expect(yumRepoApi.collectPackages).not.toHaveBeenCalled()
  })
  it('translates local status labels and OS options without rewriting codes or backend messages', async () => {
    const codes = YUM_REPO_OS_FAMILY_OPTIONS.map(item => item.value)
    expect(getCollectStatusLabel('SUCCESS')).toBe('采集成功')
    await setLocale('en-US', { persist: false })
    expect(getCollectStatusLabel('SUCCESS')).toBe('Collection succeeded')
    expect(getDiffTypeLabel('MISSING')).toBe('Missing')
    expect(YUM_REPO_OS_FAMILY_OPTIONS.find(item => item.value === 'kylinos').label).toBe('KylinOS')
    expect(YUM_REPO_OS_FAMILY_OPTIONS.map(item => item.value)).toEqual(codes)
    expect(getCollectStatusLabel({ message: '后端原始进度' })).toBe('后端原始进度')
    expect(getYumConfigCompareLabel(config)).toContain('原仓库')
  })

  it('keeps an edited source draft and submits original OS, architecture and URL expressions', async () => {
    const { vm } = await open(SourceTable, { configs: [config] })
    vm.handleEditConfig(config)
    vm.formData.description = '正在编辑的中文'
    vm.formData.osSpVersion = 'SP3 2403'
    vm.formRef = { validate: vi.fn().mockResolvedValue(true), clearValidate: vi.fn() }
    const draft = raw(vm.formData)
    const payload = raw(vm.createSubmitPayload())
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(raw(vm.formData)).toEqual(draft)
    expect(vm.dialogVisible).toBe(true)
    expect(vm.formRules.name[0].message).toBe('Enter a Yum source name')
    expect(yumRepoApi.updateConfig).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(yumRepoApi.updateConfig).toHaveBeenCalledExactlyOnceWith('dc-id', payload)
    expect(payload).toMatchObject({
      osFamily: 'kylinos',
      arch: 'aarch64',
      baseurls: ['https://example.test/原始/$basearch'],
      osSpVersion: 'SP3 2403'
    })
  })

  it('keeps package filters, pagination, loaded records and selection without reloading', async () => {
    const { vm, wrapper } = await open(Packages, {
      active: true,
      configs: [config],
      selectedRepoId: 'dc-id'
    })
    vm.keyword = '原始包名'
    vm.pagination.page = 2
    const records = vm.packageList
    const statusCalls = yumRepoApi.getConfigList.mock.calls.length
    const packageCalls = yumRepoApi.getPackages.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.packageList).toBe(records)
    expect(vm.keyword).toBe('原始包名')
    expect(vm.pagination.page).toBe(2)
    expect(vm.packagesSelectedRepoModel).toBe('dc-id')
    expect(yumRepoApi.getConfigList).toHaveBeenCalledTimes(statusCalls)
    expect(yumRepoApi.getPackages).toHaveBeenCalledTimes(packageCalls)
    expect(wrapper.emitted('update:selectedRepoId')).toBeUndefined()
  })

  it('keeps comparison filters and an open detail without executing a comparison', async () => {
    const { vm } = await open(Compare, {
      active: false,
      configs: [config],
      selectedRepoId: 'dc-id'
    })
    vm.diffRunId = 'raw-diff'
    vm.patchViewFilters.keyword = '原始补丁名'
    vm.patchViewFilters.status = 'NOT_SATISFIED'
    vm.pagination.page = 3
    vm.handleOpenDetail({ patchId: 'patch-id', title: '后端中文标题' })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.PATCH_VIEW_STATUS_OPTIONS[1]).toEqual({
      label: 'Unsatisfied only',
      value: 'NOT_SATISFIED'
    })
    expect(vm.compareActionLabel).toBe('Run comparison again')
    expect(vm.patchViewFilters).toEqual({ keyword: '原始补丁名', status: 'NOT_SATISFIED' })
    expect(vm.pagination.page).toBe(3)
    expect(vm.detailPatch).toMatchObject({ patchId: 'patch-id', title: '后端中文标题' })
    expect(vm.detailDialogVisible).toBe(true)
    expect(yumRepoApi.compareScannedPatches).not.toHaveBeenCalled()
  })

  it('keeps a pending collection observer and automatically compares the original configuration once', async () => {
    vi.useFakeTimers()
    const { vm } = await open(Page)
    const submitted = vm.handleCollect(config)
    await flushPromises()
    const calls = yumRepoApi.getConfigList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(yumRepoApi.collectPackages).toHaveBeenCalledExactlyOnceWith({ dcDataId: 'dc-id' })
    expect(yumRepoApi.getConfigList).toHaveBeenCalledTimes(calls)
    expect(vm.collectingConfigId).toBe('dc-id')
    await vi.advanceTimersByTimeAsync(2500)
    await submitted
    expect(yumRepoApi.compareScannedPatches).toHaveBeenCalledExactlyOnceWith({ dcDataId: 'dc-id' })
    expect(vm.selectedRepoId).toBe('dc-id')
  })

  it('keeps host inventory filters and submits the existing Yum scan job with original hosts', async () => {
    const { vm } = await open(LinuxYum)
    vm.hostFilterText = '原始主机'
    vm.detailRepoStatus = 'disabled'
    const hosts = [{ key: 'raw-host', value: '原始主机', assetType: 'linux' }]
    vm.selectedDevices = hosts
    const calls = hostApi.getHostYumList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.hostFilterText).toBe('原始主机')
    expect(vm.detailRepoStatus).toBe('disabled')
    expect(hostApi.getHostYumList).toHaveBeenCalledTimes(calls)
    expect(hostApi.runJob).not.toHaveBeenCalled()
    await vm.executeScanJob()
    expect(hostApi.runJob).toHaveBeenCalledExactlyOnceWith('IxL8nr', {
      params: { hosts, func: 'yum-list' }
    })
    expect(vm.latestScanRunId).toBe('raw-run')
  })
})
