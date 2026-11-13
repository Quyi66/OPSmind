import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { setLocale } from '@/core/i18n'
import { useAssetWorkbenchDrawers } from '@/modules/asset/composables/useAssetWorkbenchDrawers'
import OsVersionDialog from '@/modules/asset/components/overview/OsVersionDialog.vue'
import Page from '@/modules/asset/views/AssetOverviewPage.vue'
import { getRunLogStatusLabel } from '@/modules/automation/constants/runLogStatus'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  exceptions: vi.fn(),
  logs: vi.fn(),
  post: vi.fn(),
  refresh: vi.fn(),
  chart: { setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() },
  init: vi.fn()
}))
vi.mock('echarts', () => ({ init: api.init }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false) }) }))
vi.mock('@/composables/useJobPolling', () => ({ pollJobStatus: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({
  assetApi: { getAssetList: api.list },
  exceptionApi: { getExceptionDevices: api.exceptions },
  operationLogApi: { getOperationLogs: api.logs },
  overviewApi: {},
  dataManageApi: { getCurrentTenantId: async () => '原始租户' }
}))
vi.mock('@/modules/asset/utils/useAssetOverviewWorkbench', () => ({
  useAssetOverviewWorkbench: () => ({
    assetTypeData: ref([{ code: 'linux', title: '后端资产类型', count: 2 }]),
    groupAssetData: ref([]),
    groupRows: ref([]),
    tagRows: ref([]),
    recentLogs: ref([]),
    recentOperationTotal: ref(0),
    latestTrendPoint: ref(null),
    totalAssets: ref(2),
    assetTypeCount: ref(1),
    connectionStats: ref({ successCount: 1, failureCount: 1, totalConnection: 2, successRate: 50 }),
    governanceStats: ref({ permissionTeamCount: 0, permissionResourceCount: 0 }),
    loadGovernanceData: api.refresh,
    loadRecentOperations: api.refresh,
    refreshAll: api.refresh
  })
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="header" /><slot name="footer" /></div>' }
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  api.init.mockReturnValue(api.chart)
  api.list.mockResolvedValue({
    records: [{ id: '原始ID', IP: '192.0.2.1', 负责人: '原始负责人' }],
    total: 41
  })
  api.exceptions.mockResolvedValue({
    records: [
      { id: 'raw-exception', CONN_LATEST_STATUS: '0', CONN_RATE: 20, description: '后端中文详情' }
    ],
    total: 1
  })
  api.logs.mockResolvedValue({
    records: [{ action: 'asset_import', run_id: 'raw-run', message: '后端错误原文' }],
    total: 1
  })
  api.post.mockResolvedValue({ data: { runId: 'raw-run', status: 'COMPLETED' } })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
describe('asset workbench language changes', () => {
  it('updates already loaded drawer rows and run titles without replacing raw data or fetching again', async () => {
    let drawers
    const meta = ref({}),
      visible = ref(false)
    const Harness = defineComponent({
      setup() {
        drawers = useAssetWorkbenchDrawers({ runResultMeta: meta, runResultDialogVisible: visible })
        return () => null
      }
    })
    wrappers.push(mount(Harness))
    await drawers.openAssetListDrawer('linux')
    await drawers.openExceptionDrawer()
    await drawers.openFailedLogDrawer()
    const assets = drawers.assetListDrawer.records
    const exceptions = drawers.exceptionDrawer.records
    const failedLogs = drawers.failedLogDrawer.records
    drawers.assetListDrawer.keyword = '中文查询草稿'
    drawers.assetListDrawer.page = 3
    drawers.handleFailedLogClick(failedLogs[0].raw)
    expect(meta.value.jobTitle).toBe('资产导入')
    for (const locale of ['en-US', 'zh-CN', 'en-US']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(drawers.assetListDrawer.records).toBe(assets)
      expect(drawers.exceptionDrawer.records).toBe(exceptions)
      expect(drawers.failedLogDrawer.records).toBe(failedLogs)
      expect(drawers.assetListDrawer.keyword).toBe('中文查询草稿')
      expect(drawers.assetListDrawer.page).toBe(3)
      expect(failedLogs[0].desc).toBe('后端错误原文')
      expect(exceptions[0].raw.description).toBe('后端中文详情')
      expect(meta.value.runId).toBe('raw-run')
      expect(meta.value.jobTitle).toBe(locale === 'en-US' ? 'Asset import' : '资产导入')
    }
    expect(exceptions[0].title).toBe('Unidentified IP')
    expect(exceptions[0].desc).toBe('Unnamed asset · 后端中文详情')
    expect(exceptions[0].meta).toContain('Last check failed')
    expect(drawers.assetListDrawerTitle.value).toBe('Device list · linux')
    expect(api.list).toHaveBeenCalledTimes(1)
    expect(api.exceptions).toHaveBeenCalledTimes(1)
    expect(api.logs).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })
  it('updates OS chart labels on its existing instance while preserving backend category names', async () => {
    const data = Object.freeze([{ title: '后端系统名称', count: 17 }])
    const wrapper = mount(OsVersionDialog, {
      props: { modelValue: false, data },
      global: { stubs: { 'el-dialog': Slot, 'el-empty': true }, directives: { loading() {} } }
    })
    wrappers.push(wrapper)
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(api.init).toHaveBeenCalledTimes(1)
    expect(api.chart.dispose).not.toHaveBeenCalled()
    expect(api.chart.setOption.mock.lastCall[0]).toMatchObject({
      xAxis: { data: ['后端系统名称'] },
      yAxis: { name: 'Hosts' },
      series: [{ name: 'Version distribution', data: [17] }]
    })
  })
  it('keeps workbench selection, drawer search and raw operation codes when switching language', async () => {
    const wrapper = mount(Page, { shallow: true, global: { directives: { loading() {} } } })
    wrappers.push(wrapper)
    await flushPromises()
    const vm = wrapper.vm.$.setupState
    await vm.openAssetListDrawer('linux')
    vm.assetListDrawer.keyword = '中文关键字'
    vm.assetListDrawer.page = 2
    const reads = api.list.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedAssetTypeCode).toBe('linux')
    expect(vm.assetListDrawer.keyword).toBe('中文关键字')
    expect(vm.assetListDrawer.page).toBe(2)
    expect(vm.assetListDrawer.visible).toBe(true)
    expect(api.list).toHaveBeenCalledTimes(reads)
    expect(vm.getOperationActionLabel('#{acm.job.check_conn}')).toBe('Connectivity check')
    expect(vm.getOperationActionLabel('后端未知操作')).toBe('后端未知操作')
    expect(getRunLogStatusLabel('COMPLETED')).toBe('Completed')
    expect(getRunLogStatusLabel('后端状态')).toBe('后端状态')
    expect(wrapper.text()).toContain('Total assets')
  })
})
