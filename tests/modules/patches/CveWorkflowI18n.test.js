import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Detail from '@/modules/patches/components/cve/details/CveDetail.vue'
import Middleware from '@/modules/patches/components/cve/details/MiddlewareCveDetail.vue'
import Affected from '@/modules/patches/components/cve/MiddlewareAffectedHostsDialog.vue'
import Export from '@/modules/patches/components/cve/dialogs/ManualExportDialog.vue'

const mocks = vi.hoisted(() => ({
  getCveDetail: vi.fn(),
  getAffectedHosts: vi.fn(),
  rebootHost: vi.fn(),
  getDetail: vi.fn(),
  getCveList: vi.fn(),
  exportReport: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  confirm: vi.fn(),
  charts: [],
  downloads: []
}))
vi.mock('@/modules/patches/api', () => ({ cveApi: mocks, middlewareCveApi: mocks }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/composables/useTheme', async () => {
  const { ref } = await import('vue')
  return { useTheme: () => ({ isDark: ref(false) }) }
})
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, error: vi.fn(), warning: mocks.warning },
  ElMessageBox: { confirm: mocks.confirm }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('echarts', async importOriginal => {
  const actual = await importOriginal()
  actual.setPlatformAPI({ measureText: text => ({ width: String(text).length * 7 }) })
  return {
    ...actual,
    init: () => {
      const chart = actual.init(null, null, { renderer: 'svg', ssr: true, width: 240, height: 240 })
      mocks.charts.push(chart)
      return chart
    }
  }
})
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const source = () => ({
  source: 'redhat',
  severity: 'critical',
  cvss3Score: null,
  description: '后端中文描述',
  summary: { total: 3, affected: 2, fixed: 1 },
  packages: {
    affected: [
      {
        productName: '原始产品',
        name: 'raw-pkg',
        version: '1.0',
        fixedVersion: '2.0',
        status: 'affected'
      },
      {
        productName: '原始产品',
        name: 'second-pkg',
        version: '1.0',
        fixedVersion: '2.0',
        status: 'affected'
      }
    ],
    fixed: [
      {
        productName: '原始产品',
        name: 'fixed-pkg',
        version: '2.0',
        fixedVersion: '2.0',
        status: 'fixed'
      }
    ]
  }
})
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-input': true,
        'el-button': Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElBreadcrumb: Slot,
        ElBreadcrumbItem: Slot,
        ElTag: Slot,
        ElTable: true,
        ElTableColumn: true,
        ElRadioGroup: Slot,
        ElRadioButton: Slot,
        ElSelect: Slot,
        ElOption: true,
        ElLink: Slot,
        ElIcon: true,
        ElEmpty: true,
        ElTooltip: Slot,
        RpmPackageDetailDialog: true,
        MiddlewareAffectedHostsDialog: true
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
  mocks.charts.length = 0
  mocks.downloads.length = 0
  mocks.getCveDetail.mockResolvedValue({ data: { sources: [source()] } })
  mocks.getAffectedHosts.mockResolvedValue({ data: { hosts: [] } })
  mocks.getDetail.mockResolvedValue({
    data: {
      middlewares: [
        {
          middlewareType: 'Tomcat',
          cvss3Score: null,
          severity: 'critical',
          description: '后端 Tomcat 正文'
        },
        { middlewareType: 'Nginx', cvss3Score: 0, severity: 'low', description: '后端 Nginx 正文' }
      ]
    }
  })
  mocks.getCveList.mockResolvedValue({
    data: {
      content: [{ cveId: 'CVE-2026-1234' }, { cveId: 'CVE-2026-5678' }],
      totalPages: 3,
      totalElements: 120
    }
  })
  mocks.exportReport.mockResolvedValue(new Blob(['原始导出正文']))
  mocks.confirm.mockResolvedValue('confirm')
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL() {
        return 'blob:test-export'
      }
      static revokeObjectURL() {}
    }
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    mocks.downloads.push(this.download)
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('CVE workflow language changes', () => {
  it('uses stable status values for both radio and legend filters and retains the selected source and package criteria', async () => {
    const { vm, wrapper } = await open(Detail, { cveId: 'CVE-raw' })
    vm.setPackageFilter('affected')
    vm.productNameFilter = '原始产品'
    vm.fixedVersionFilter = '2.0'
    expect(vm.filteredPackages).toHaveLength(2)
    const identities = vm.filteredPackages.map(item => item.name)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.packageFilter).toBe('affected')
    expect(vm.filteredPackages.map(item => item.name)).toEqual(identities)
    expect(vm.currentSourceId).toBe('redhat')
    expect(vm.productNameFilter).toBe('原始产品')
    expect(vm.fixedVersionFilter).toBe('2.0')
    expect(vm.impactLegendItems[1].label).toBe('Affected')
    expect(vm.getSeverityLabel('critical')).toBe('Critical')
    expect(wrapper.text()).toContain('后端中文描述')
    expect(wrapper.text()).not.toContain('Unrated')
    expect(apiCalls()).toEqual([1, 1])
    vm.setPackageFilter('fixed')
    expect(vm.filteredPackages.map(item => item.name)).toEqual(['fixed-pkg'])
    vm.setPackageFilter('all')
    expect(vm.filteredPackages).toHaveLength(3)
    expect(vm.allPackages.map(item => item.status)).toEqual(['affected', 'affected', 'fixed'])
  })

  it('updates a real ECharts instance with translated names while preserving counts and the active tab', async () => {
    const { vm } = await open(Detail, { cveId: 'CVE-chart' })
    vm.initImpactChart()
    const chart = mocks.charts[0]
    expect(chart.getOption().series[0].data.map(item => [item.name, item.value])).toEqual([
      ['受影响', 2],
      ['已修复', 1]
    ])
    vm.activeTab = 'packages'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(mocks.charts).toHaveLength(1)
    expect(chart.getOption().series[0].data.map(item => [item.name, item.value])).toEqual([
      ['Affected', 2],
      ['Fixed', 1]
    ])
    expect(vm.activeTab).toBe('packages')
    expect(apiCalls()).toEqual([1, 1])
  })

  it('keeps reboot identity, type and required backend confirmation token unchanged in English', async () => {
    const { vm } = await open(Detail, { cveId: 'CVE-reboot' })
    const host = {
      hostId: 'raw-host',
      hostKey: '后端主机',
      rebootAction: { enabled: true, recommended: true, rebootType: 'service_reboot' }
    }
    await setLocale('en-US', { persist: false })
    mocks.rebootHost.mockResolvedValue({
      data: { success: true, status: 'COMPLETED', runId: 'raw-run', message: '后端中文完成消息' }
    })
    await vm.handleHostReboot(host)
    expect(mocks.confirm.mock.calls[0][0]).toContain('Service restart')
    expect(mocks.rebootHost).toHaveBeenCalledExactlyOnceWith({
      hostId: 'raw-host',
      rebootType: 'service_reboot',
      confirmText: '确认重启'
    })
    expect(mocks.success).toHaveBeenCalledWith('后端中文完成消息')
    expect(vm.rebootResultRunId).toBe('raw-run')
    expect(vm.rebootResultDialogVisible).toBe(true)
    expect(apiCalls()).toEqual([1, 1])
  })

  it('retains middleware selection, detail and the affected-host dialog without reloading', async () => {
    const { vm } = await open(Middleware, { cveId: 'CVE-middleware' })
    vm.currentMiddlewareIndex = 1
    vm.selectMiddleware(1)
    vm.affectedHostsVisible = true
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentMiddlewareIndex).toBe(1)
    expect(vm.currentMiddleware.middlewareType).toBe('Nginx')
    expect(vm.currentMiddleware.description).toBe('后端 Nginx 正文')
    expect(vm.affectedHostsVisible).toBe(true)
    expect(vm.getSeverityLabel('low')).toBe('Low')
    expect(mocks.getDetail).toHaveBeenCalledExactlyOnceWith('CVE-middleware')
  })

  it('translates persistent affected-host errors without issuing a retry on language change', async () => {
    mocks.getAffectedHosts.mockRejectedValueOnce(new Error('network'))
    const { vm } = await open(Affected, {
      modelValue: true,
      cveId: 'CVE-middleware',
      middlewareType: 'Tomcat'
    })
    expect(vm.errorMessage).toBe('加载受影响主机失败，请点击刷新重试')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.errorMessage).toBe('Unable to load affected hosts. Click Refresh to retry.')
    expect(mocks.getAffectedHosts).toHaveBeenCalledExactlyOnceWith('CVE-middleware', 'Tomcat')
  })

  it('retains batch input and selected order, translates omitted defaults and exports only original IDs', async () => {
    const { vm } = await open(Export, { modelValue: true })
    vm.onOpen()
    await flushPromises()
    vm.addToExport({ cveId: 'CVE-2026-5678' })
    vm.addToExport({ cveId: 'CVE-2026-1234' })
    vm.activeTab = 'list'
    vm.batchInputText = 'CVE-原始内容，CVE-2026-1234'
    vm.exportSearchKeyword = '原始关键字'
    vm.exportCurrentPage = 2
    const requests = mocks.getCveList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.displayProps.searchTitle).toBe('Search vulnerabilities')
    expect(vm.batchInputText).toBe('CVE-原始内容，CVE-2026-1234')
    expect(vm.exportSearchKeyword).toBe('原始关键字')
    expect(vm.exportCurrentPage).toBe(2)
    expect(mocks.getCveList).toHaveBeenCalledTimes(requests)
    await vm.handleManualExportConfirm()
    expect(mocks.exportReport).toHaveBeenCalledExactlyOnceWith(['CVE-2026-5678', 'CVE-2026-1234'])
    expect(mocks.downloads).toEqual(['vulnerability-report.xlsx'])
  })

  it('preserves caller-provided export labels and filenames and deduplicates the original batch IDs', async () => {
    const { vm } = await open(Export, {
      modelValue: true,
      itemName: '自定义对象',
      dialogTitle: '用户导出标题',
      exportFilename: '用户指定文件.xlsx'
    })
    vm.batchInputText = 'CVE-2026-1234，CVE-2026-1234\nCVE-2026-5678'
    await setLocale('en-US', { persist: false })
    expect(vm.displayProps.dialogTitle).toBe('用户导出标题')
    expect(vm.displayProps.itemName).toBe('自定义对象')
    await vm.handleManualExportConfirm()
    expect(mocks.exportReport).toHaveBeenCalledWith(['CVE-2026-1234', 'CVE-2026-5678'])
    expect(mocks.downloads).toEqual(['用户指定文件.xlsx'])
  })
})

function apiCalls() {
  return [mocks.getCveDetail.mock.calls.length, mocks.getAffectedHosts.mock.calls.length]
}
