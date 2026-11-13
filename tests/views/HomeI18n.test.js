import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import AssetOverview from '@/views/home/components/AssetOverview.vue'
import InspectionOverview from '@/views/home/components/InspectionOverview.vue'
import HostVulnerabilityOverview from '@/views/home/components/HostVulnerabilityOverview.vue'
import CriticalCveAlert from '@/views/home/components/CriticalCveAlert.vue'
import HomePage from '@/views/home/HomePage.vue'
import AIAssistant from '@/components/ai/AIAssistant.vue'
import AboutPage from '@/views/about/AboutPage.vue'
import { setLocale } from '@/core/i18n'
import {
  formatCvssScore,
  formatKnownCount,
  getAssetDisplayName,
  toKnownNumber
} from '@/utils/workspacePresentation'
import {
  getCveSourceLabel,
  normalizeCveSourceKey
} from '@/modules/patches/composables/useFormatters'

const api = vi.hoisted(() => ({
  store: null,
  linux: vi.fn(),
  windows: vi.fn(),
  assets: vi.fn(),
  cves: vi.fn(),
  push: vi.fn(),
  info: vi.fn()
}))
vi.mock('@/stores/dashboard', () => ({ useDashboardStore: () => api.store }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: api.push }),
  useRoute: () => ({ path: '/home', name: 'home-index' })
}))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false) }) }))
vi.mock('@/composables/useOptimizedModuleLoader', () => ({
  ModulePreloadManager: { preloadCommonModules: vi.fn() }
}))
vi.mock('@/modules/patches/api', () => ({
  patchScanApi: { getScanResults: api.linux },
  cveApi: { getCveList: api.cves }
}))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: { getHosts: api.windows } }))
vi.mock('@/modules/asset/api', () => ({ assetApi: { getAssetList: api.assets } }))
vi.mock('element-plus', () => ({
  ElMessage: { info: api.info, warning: vi.fn(), error: vi.fn(), success: vi.fn() }
}))
vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', props: ['option'], emits: ['click'], template: '<div class="test-chart" />' }
}))

const Slot = { template: '<div><slot /></div>' }
const Button = { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }
const Chart = {
  name: 'VChart',
  props: ['option'],
  emits: ['click'],
  template: '<div class="test-chart" />'
}
const Popover = { template: '<div><slot name="reference" /><slot /></div>' }
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
async function open(component, stubs = {}) {
  const wrapper = mount(component, {
    global: {
      stubs: {
        VChart: Chart,
        'el-button': Button,
        'el-popover': Popover,
        'el-tag': Slot,
        'el-alert': { props: ['title'], template: '<p>{{ title }}</p>' },
        ...stubs
      },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(async () => {
  Object.entries(api).forEach(([key, value]) => {
    if (key !== 'store') value.mockReset()
  })
  api.store = reactive({
    loading: false,
    error: null,
    needsRefresh: false,
    dashboardFullData: Object.freeze({
      assetOverview: Object.freeze({ windowsServers: 1234, unixServers: 8, linuxServers: 99 }),
      monthlyInspectionStats: Object.freeze({
        monthlyInspections: 12,
        normalInspections: 8,
        abnormalInspections: 4
      }),
      recentInspectionStats: Object.freeze([
        { date: '11-12', normalInspections: 8, abnormalInspections: 4 }
      ])
    }),
    loadDashboardData: vi.fn().mockResolvedValue(),
    fetchAiOpsUrl: vi.fn().mockResolvedValue('')
  })
  api.assets.mockResolvedValue({ records: [] })
  api.linux.mockResolvedValue({
    data: {
      records: [
        {
          host_key: '10.0.0.1',
          hostname: '原始中文主机',
          host_id: 'raw-host-id',
          os_distro: '原始系统',
          os_version: '1.2',
          need_reboot: 1,
          memoryOverview: { freeGb: 1.5, totalGb: 8 },
          num_critical: 0
        }
      ]
    }
  })
  api.windows.mockResolvedValue({
    data: {
      content: [
        {
          hostKey: 'raw-win',
          hostName: '中文 Windows 主机',
          installedCount: 1,
          osVersion: '原始 Windows 版本'
        }
      ]
    }
  })
  api.cves.mockResolvedValue({
    data: {
      content: [
        {
          cveId: 'CVE-RAW-1',
          description: '后端漏洞原文 #{raw} {{value}}',
          source: 'kylin',
          affectedHostCount: null,
          affectedCount: 0,
          totalPackageCount: 0,
          cvss3Score: null
        },
        { cveId: 'CVE-ZERO', source: '后端自定义来源', affectedHostCount: 0, cvss3Score: 0 }
      ]
    }
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  if (vi.isFakeTimers()) {
    vi.clearAllTimers()
    vi.useRealTimers()
  }
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('reachable dashboard components', () => {
  it('translates asset chart labels while routing by stable series position', async () => {
    const wrapper = await open(AssetOverview),
      vm = state(wrapper),
      data = api.store.dashboardFullData
    expect(vm.chartOption.yAxis.data).toEqual(['Windows服务器', 'Unix服务器', 'Linux服务器'])
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.chartOption.yAxis.data).toEqual(['Windows servers', 'Unix servers', 'Linux servers'])
    expect(vm.chartOption.series[0].data).toEqual([1234, 8, 99])
    vm.handleChartClick({ dataIndex: 2, name: '任何显示文案' })
    expect(api.push).toHaveBeenLastCalledWith({ path: '/acm/info', query: { type: 'linux' } })
    vm.activeTab = 'system'
    await setLocale('zh-CN', { persist: false })
    expect(vm.activeTab).toBe('system')
    expect(vm.chartOption.yAxis.data).toEqual(['Windows', 'Unix', 'Linux'])
    expect(api.store.dashboardFullData).toBe(data)
    expect(api.store.loadDashboardData).not.toHaveBeenCalled()
  })
  it('updates inspection series and cards without replacing numeric data or route identities', async () => {
    const wrapper = await open(InspectionOverview),
      vm = state(wrapper),
      data = vm.chartData
    const ids = vm.inspectionStats.map(stat => stat.id)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('This month')
    expect(vm.chartOption.series.map(series => series.name)).toEqual(['Normal', 'Abnormal'])
    expect(vm.chartOption.series.map(series => series.data)).toEqual([[8], [4]])
    expect(vm.chartData).toBe(data)
    expect(vm.inspectionStats.map(stat => stat.id)).toEqual(ids)
    vm.handleStatClick(ids[0])
    expect(api.push).toHaveBeenLastCalledWith({ name: 'cac-results' })
    expect(api.store.loadDashboardData).not.toHaveBeenCalled()
  })
  it('preserves Linux and Windows records and selected OS while updating host details', async () => {
    const wrapper = await open(HostVulnerabilityOverview),
      vm = state(wrapper),
      linux = vm.linuxHosts
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Affected hosts')
    expect(wrapper.text()).toContain('原始中文主机')
    expect(wrapper.text()).toContain('1.5 GB available')
    expect(wrapper.text()).toContain('8 GB total')
    expect(vm.linuxHosts).toBe(linux)
    expect(api.linux).toHaveBeenCalledExactlyOnceWith({ page: 0, size: 20 })
    vm.navigateToHostDetail(linux[0])
    expect(api.push.mock.lastCall[0]).toMatchObject({
      name: 'patches-hostDetail',
      query: {
        host_key: '10.0.0.1',
        host_id: 'raw-host-id',
        hostname: '原始中文主机',
        os_distro: '原始系统',
        fromRouteName: 'patches-machineScan'
      }
    })
    vm.activeTab = 'windows'
    await flushPromises()
    expect(wrapper.text()).toContain('Installed patches:')
    expect(wrapper.findAll('.detail-value').some(node => node.text() === '1')).toBe(true)
    const windows = vm.windowsHosts
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(vm.activeTab).toBe('windows')
    expect(vm.windowsHosts).toBe(windows)
    expect(api.windows).toHaveBeenCalledExactlyOnceWith({ page: 0, size: 20 })
    expect(api.linux).toHaveBeenCalledTimes(1)
  })
  it('preserves raw CVEs, zero values, unknown counts and sorting while translating local labels', async () => {
    const wrapper = await open(CriticalCveAlert),
      vm = state(wrapper),
      records = vm.cveList
    const raw = JSON.stringify(records)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Vulnerability intelligence')
    expect(wrapper.text()).toContain('Unconfirmed')
    expect(wrapper.text()).toContain('Unscored')
    expect(wrapper.text()).toContain('Kylin')
    expect(wrapper.text()).toContain('后端漏洞原文 #{raw} {{value}}')
    expect(wrapper.text()).toContain('后端自定义来源')
    expect(formatCvssScore(0)).toBe('0.0')
    expect(formatKnownCount(0)).toBe('0')
    expect(vm.cveList).toBe(records)
    expect(JSON.stringify(records)).toBe(raw)
    expect(api.cves).toHaveBeenCalledExactlyOnceWith({
      severity: 'critical',
      page: 0,
      size: 20,
      sortBy: 'publicDate',
      sortDir: 'desc'
    })
    vm.navigateToDetail(records[0])
    expect(api.push).toHaveBeenLastCalledWith({
      name: 'patches-cveList',
      query: { view: 'detail', cveId: records[0].cveId }
    })
  })
  it('keeps unknown number and source semantics separate from translated display labels', async () => {
    await setLocale('en-US', { persist: false })
    expect(toKnownNumber('未评分')).toBeNull()
    expect(toKnownNumber('0')).toBe(0)
    expect(getCveSourceLabel('kylin')).toBe('Kylin')
    expect(normalizeCveSourceKey('Kylin V10')).toBe('kylin')
    expect(getCveSourceLabel('自定义中文来源')).toBe('自定义中文来源')
    expect(getAssetDisplayName({ hostname: '中文自定义设备' })).toBe('中文自定义设备')
    expect(getAssetDisplayName({})).toBe('Unnamed device')
  })
  it('updates dashboard retry controls without refetching data or translating backend error details', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    api.store.error = '后端中文失败原因'
    const wrapper = await open(HomePage)
    const count = api.store.loadDashboardData.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Reload')
    expect(wrapper.text()).toContain('后端中文失败原因')
    expect(api.store.loadDashboardData).toHaveBeenCalledTimes(count)
    expect(api.store.fetchAiOpsUrl).toHaveBeenCalledTimes(count)
  })
  it('retains an AI question during a switch and passes its original text to the existing page URL', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue({ opener: {} })
    const wrapper = await open(AIAssistant),
      question = '中文问题 #{raw} {{value}}'
    await wrapper.find('input').setValue(question)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.find('input').element.value).toBe(question)
    expect(wrapper.text()).toContain('OPS assistant, ready to help')
    expect(opened).not.toHaveBeenCalled()
    await wrapper.find('.search-btn').trigger('click')
    expect(new URL(opened.mock.lastCall[0]).searchParams.get('q')).toBe(question)
    expect(new URL(opened.mock.lastCall[0]).pathname).toMatch(/aiops-full.html$/)
    expect(api.info).toHaveBeenCalledWith(`Processing your question: ${question}`)
  })
  it('updates the about page while retaining the existing dashboard navigation', async () => {
    const wrapper = await open(AboutPage)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('About KoreOPS')
    expect(wrapper.text()).toContain('Version 1.0.0')
    await wrapper.find('button').trigger('click')
    expect(api.push).toHaveBeenLastCalledWith('/')
  })
})
