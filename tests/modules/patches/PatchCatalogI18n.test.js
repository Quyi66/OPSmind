import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { setLocale } from '@/core/i18n'
import Library from '@/modules/patches/views/LinuxPatchLibraryPage.vue'
import Catalog from '@/modules/patches/views/RpmPackageListPage.vue'
import Installed from '@/modules/patches/views/LinuxMachinePackageListPage.vue'
import RpmDetail from '@/modules/patches/components/rpm/RpmPackageDetailDialog.vue'
import PatchContent from '@/modules/patches/components/common/PatchDetailContent.vue'
import { downloadBlobResponse } from '@/modules/patches/utils/linuxMachinePackageList'

const mocks = vi.hoisted(() => ({
  rpm: Object.fromEntries(
    [
      'getPackageList',
      'getArchitectures',
      'getOsVersions',
      'getPackageDetailById',
      'getInstalledScanPackages',
      'getInstalledDetail'
    ].map(key => [key, vi.fn()])
  ),
  library: Object.fromEntries(
    ['getVendorStats', 'getPatchList', 'getPatchDetail', 'uploadAndImport'].map(key => [
      key,
      vi.fn()
    ])
  ),
  runJob: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ rpmInfoApi: mocks.rpm, patchLibraryApi: mocks.library }))
vi.mock('@/modules/automation/api/command', () => ({ runJob: mocks.runJob }))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '', initTranslations: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { warning: mocks.warning, error: mocks.error, success: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const patch = {
  patch_id: 'raw-patch',
  title: '后端中文标题',
  description: '后端中文正文 <img src="raw">',
  severity: 'Critical',
  related_vuls: 'CVE-2026-1234'
}
const catalogRow = {
  id: 101,
  name: 'kernel',
  completePackageName: 'kernel-4.18.0-553.el8.x86_64',
  source: 'redhat',
  architecture: 'x86_64',
  osVersion: '8.10'
}
const installedRow = {
  hostId: 'raw-host',
  hostKey: '原始主机',
  pkgName: 'kernel',
  pkgVersion: '4.18.0-553.el8',
  pkgArch: 'x86_64',
  source: 'redhat',
  osDistro: 'Red Hat',
  osVersion: '8.10',
  osArch: 'x86_64',
  currentPackage: catalogRow.completePackageName
}
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-drawer': Slot,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-table': true,
        'el-table-column': true,
        'el-tag': Slot,
        'el-descriptions': Slot,
        'el-descriptions-item': Slot
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
  mocks.rpm.getArchitectures.mockResolvedValue({ content: ['x86_64'] })
  mocks.rpm.getOsVersions.mockResolvedValue({ content: ['8.10'] })
  mocks.rpm.getPackageList.mockResolvedValue({ content: [catalogRow], totalElements: 21 })
  mocks.rpm.getInstalledScanPackages.mockResolvedValue({
    content: [installedRow],
    totalElements: 21
  })
  mocks.rpm.getPackageDetailById.mockResolvedValue({
    data: { ...catalogRow, description: '后端中文描述' }
  })
  mocks.rpm.getInstalledDetail.mockResolvedValue({ data: installedRow })
  mocks.library.getVendorStats.mockResolvedValue({ records: [{ vendor: 'redhat', count: 20 }] })
  mocks.library.getPatchList.mockResolvedValue({ records: [patch], total: 21 })
  mocks.library.getPatchDetail.mockResolvedValue(patch)
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: async () =>
          '* Fri May 10 2024 Author <a@example.test> [4.18.0-553.el8]\n- 原始变更正文 CPUHP'
      })
  )
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('patch library and RPM catalog i18n', () => {
  it('keeps filters, selection and detail data and submits original allowlist job identifiers', async () => {
    const { vm } = await open(Library)
    vm.filterText = '中文补丁'
    vm.ignoreFilter = '0'
    vm.severityFilter = ['Critical']
    vm.selectedPatches = [patch]
    vm.pagination.page = 2
    await vm.handleViewDetail(patch)
    const detail = raw(vm.patchDetail),
      calls = mocks.library.getPatchList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.getSeverityLabel('Critical')).toBe('Critical')
    expect(vm.pagination.page).toBe(2)
    expect(vm.filterText).toBe('中文补丁')
    expect(vm.selectedPatches).toEqual([patch])
    expect(raw(vm.patchDetail)).toEqual(detail)
    expect(vm.detailDialogVisible).toBe(true)
    expect(mocks.library.getPatchList).toHaveBeenCalledTimes(calls)
    expect(mocks.runJob).not.toHaveBeenCalled()
    await vm.handleAddToWhitelist(patch)
    expect(mocks.runJob).toHaveBeenCalledExactlyOnceWith('sosZAJ', {
      params: { patchIdList: ['raw-patch'] }
    })
  })

  it.each([
    [Catalog, 'getPackageList', catalogRow],
    [Installed, 'getInstalledScanPackages', installedRow]
  ])(
    'keeps catalog filters, target hosts and original detail identity',
    async (component, query, row) => {
      const { vm } = await open(component)
      vm.filters.keyword = '原始包名'
      vm.filters.osVersion = '8.10'
      vm.pagination.page = 2
      if (vm.selectedHosts) vm.selectedHosts = [{ key: 'raw-host', value: '原始主机' }]
      await vm.handleViewDetail(row)
      const filters = raw(vm.filters),
        detail = raw(vm.detailData),
        calls = mocks.rpm[query].mock.calls.length
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(raw(vm.filters)).toEqual(filters)
      expect(vm.pagination.page).toBe(2)
      expect(raw(vm.detailData)).toEqual(detail)
      expect(vm.detailVisible).toBe(true)
      expect(mocks.rpm[query]).toHaveBeenCalledTimes(calls)
      if (vm.selectedHosts)
        expect(vm.selectedHosts).toEqual([{ key: 'raw-host', value: '原始主机' }])
    }
  )

  it('keeps the loaded changelog and search without another file request', async () => {
    const detail = {
      ...catalogRow,
      version: '4.18.0-553.el8',
      currentPackage: catalogRow.completePackageName,
      description: '后端原文'
    }
    const { vm } = await open(RpmDetail, { modelValue: true, detailData: detail })
    expect(vm.changelogContent).toContain('原始变更正文')
    vm.searchKeyword = 'CPUHP'
    const content = vm.changelogContent,
      calls = fetch.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.changelogContent).toBe(content)
    expect(vm.searchKeyword).toBe('CPUHP')
    expect(vm.normalizedDetail.description).toBe('后端原文')
    expect(fetch).toHaveBeenCalledTimes(calls)
  })

  it('updates a persistent changelog empty-state error without a retry', async () => {
    const { vm } = await open(RpmDetail, {
      modelValue: true,
      detailData: { name: 'raw-package', source: 'unknown' }
    })
    const message = vm.changelogStatusText,
      calls = fetch.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.changelogStatusText).not.toBe(message)
    expect(vm.changelogStatusText).toContain('valid source')
    expect(fetch).toHaveBeenCalledTimes(calls)
  })

  it('keeps upload files and safely renders backend messages and file names as text', async () => {
    const summary = '后端原文 <img src="raw">',
      failed = ['原文件 <script>alert(1)</script>.json']
    mocks.library.uploadAndImport.mockResolvedValue({ status: 'RUNNING', message: summary, failed })
    const { vm } = await open(Library)
    await setLocale('en-US', { persist: false })
    const file = new File(['原始内容'], '原文件.json', { type: 'application/json' })
    await vm.handleFileUpload({ target: { files: [file], value: 'selected' } })
    const data = mocks.library.uploadAndImport.mock.calls[0][0]
    expect(data.get('files').name).toBe('原文件.json')
    const feedback = mocks.warning.mock.lastCall[0]
    expect(feedback.dangerouslyUseHTMLString).toBeUndefined()
    const rendered = mount(defineComponent({ render: () => feedback.message }))
    wrappers.push(rendered)
    expect(rendered.text()).toContain(summary)
    expect(rendered.text()).toContain(failed[0])
    expect(rendered.text()).toContain('Files that failed:')
    expect(rendered.find('img').exists()).toBe(false)
    expect(rendered.find('script').exists()).toBe(false)
  })

  it('translates local severity and keeps escaped vulnerability description and link identifiers', async () => {
    const { wrapper } = await open(PatchContent, { patch, markdown: true })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Critical')
    expect(wrapper.text()).toContain(patch.description)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.vm.$.setupState.cveList).toEqual(['CVE-2026-1234'])
  })

  it('localizes only a missing export filename and retains a server filename', async () => {
    const names = []
    vi.stubGlobal(
      'URL',
      Object.assign(class extends URL {}, {
        createObjectURL: vi.fn(() => 'blob:test'),
        revokeObjectURL: vi.fn()
      })
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      names.push(this.download)
    })
    await setLocale('en-US', { persist: false })
    downloadBlobResponse({ data: '原始导出内容' })
    downloadBlobResponse({
      data: '原始导出内容',
      headers: {
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent('后端原文件名.xlsx')}`
      }
    })
    expect(names).toEqual(['Linux-host-package-inventory.xlsx', '后端原文件名.xlsx'])
  })
})
