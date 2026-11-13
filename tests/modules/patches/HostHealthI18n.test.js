import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Page from '@/modules/patches/views/HostHealthCheckPage.vue'
import RulesDialog from '@/modules/patches/components/host-health/HostHealthScoringRulesDialog.vue'
import { setLocale } from '@/core/i18n'
import { HEALTH_SCORING_RULES, HEALTH_STATUS_LIST } from '@/modules/patches/constants/hostHealth'
import {
  enrichAndSortCheckItems,
  findScoringRuleForItem,
  formatHostRiskSummary,
  formatHostScore
} from '@/modules/patches/utils/hostHealth'

const { ElTable, ElTableColumn } = createRequire(import.meta.url)(
  'element-plus/lib/components/table/index.js'
)

const api = vi.hoisted(() => ({ summary: vi.fn(), hosts: vi.fn(), run: vi.fn() }))
vi.mock('@/modules/patches/api/hostHealth', () => ({
  hostHealthApi: { getSummary: api.summary, getHosts: api.hosts, runHealthCheck: api.run }
}))
vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }
}))
const rawHost = Object.freeze({
  hostId: '原始主机ID',
  hostIp: '192.0.2.7',
  hostname: '原始中文主机',
  status: 'WARNING',
  score: 85,
  risks: ['后端风险描述'],
  items: [{ name: '磁盘使用率', value: '85%', level: 'WARNING' }]
})
let wrapper
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  api.summary.mockResolvedValue({
    counts: { WARNING: 1, UNREACHABLE: 2 },
    avgScore: 85,
    latestRun: { runId: 'raw-run', status: 'COMPLETED', message: '后端作业消息' }
  })
  api.hosts.mockResolvedValue({ total: 1, list: [rawHost] })
  api.run.mockResolvedValue({ runId: 'new-run', message: '后端任务已启动' })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
async function open() {
  const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
  wrapper = mount(Page, {
    shallow: true,
    global: {
      stubs: {
        HostHealthSummaryBar: false,
        HostHealthDetailDrawer: false,
        ElTable: defineComponent({
          setup(_, { expose }) {
            expose({ clearSelection: vi.fn() })
            return () => null
          }
        }),
        ElTableColumn: true,
        'el-drawer': Slot,
        'el-alert': { props: ['title'], template: '<p>{{ title }}</p>' },
        'el-descriptions': Slot,
        'el-descriptions-item': Slot,
        'el-tag': Slot,
        'el-button': Slot,
        'el-radio-group': Slot,
        'el-radio-button': Slot
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
describe('host health inspection localization', () => {
  it('updates the real rules table while retaining canonical rule names, thresholds and deductions', async () => {
    wrapper = mount(RulesDialog, {
      global: {
        components: { ElTable, ElTableColumn },
        stubs: {
          'el-dialog': { template: '<div><slot /></div>' },
          'el-table': false,
          'el-table-column': false,
          'el-alert': true,
          'el-button': true
        }
      }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('只读文件系统')
    const records = wrapper.findComponent(ElTable).props('data')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Read-only file systems')
    expect(wrapper.text()).toContain('Critical if present')
    expect(wrapper.findComponent(ElTable).props('data')).toBe(records)
    expect(records.find(rule => rule.name === '只读文件系统').deduction).toBe('25')
    expect(records.find(rule => rule.name === '磁盘使用率（最高分区）').threshold).toBe(
      '≥80% / ≥90%'
    )
  })
  it('keeps Chinese scoring lookup keys and backend risks while translating local rules and statuses', async () => {
    const names = HEALTH_SCORING_RULES.map(rule => rule.name)
    const rule = findScoringRuleForItem('磁盘使用率')
    expect(rule.deduction).toBe('10 / 25')
    await setLocale('en-US', { persist: false })
    expect(findScoringRuleForItem('磁盘使用率')).toBe(rule)
    expect(HEALTH_SCORING_RULES.map(rule => rule.name)).toEqual(names)
    expect(rule.label).toBe('Disk usage (highest partition)')
    expect(findScoringRuleForItem('只读文件系统').threshold).toBe('Critical if present')
    expect(enrichAndSortCheckItems(rawHost.items)[0]).toMatchObject({
      name: '磁盘使用率',
      value: '85%',
      threshold: '≥80% / ≥90%',
      deduction: '10 / 25'
    })
    expect(HEALTH_STATUS_LIST.map(item => item.value)).toEqual([
      'CRITICAL',
      'WARNING',
      'HEALTHY',
      'UNREACHABLE',
      'UNCHECKED'
    ])
    expect(HEALTH_STATUS_LIST[0].label).toBe('Critical')
    expect(formatHostRiskSummary(rawHost)).toBe('后端风险描述')
    expect(formatHostRiskSummary({ ...rawHost, risks: ['后端风险甲', '后端风险乙'] })).toBe(
      '2 risks: 后端风险甲; 后端风险乙'
    )
    expect(formatHostScore(rawHost)).toBe('85 points')
    expect(formatHostScore({ status: 'UNREACHABLE', score: 0 })).toBe('—')
  })
  it('preserves host selection, filters, current drawer and level filter with no new reads on locale change', async () => {
    await open()
    const vm = wrapper.vm.$.setupState
    const rows = vm.hostList
    vm.handleSelectionChange(rows)
    vm.filters.status = 'WARNING'
    vm.filters.keyword = '中文查询'
    vm.filters.page = 3
    vm.openHostDetail(rows[0])
    await flushPromises()
    const drawer = wrapper.findComponent({ name: 'HostHealthDetailDrawer' })
    drawer.vm.$.setupState.levelFilter = 'ABNORMAL'
    for (const locale of ['en-US', 'zh-CN', 'en-US']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(vm.hostList).toBe(rows)
      expect(vm.selectedHostIds).toEqual(['原始主机ID'])
      expect(vm.filters).toMatchObject({ status: 'WARNING', keyword: '中文查询', page: 3 })
      expect(vm.detailDrawerVisible).toBe(true)
      expect(vm.currentDetailHost.hostId).toBe('原始主机ID')
      expect(drawer.vm.$.setupState.levelFilter).toBe('ABNORMAL')
      expect(api.hosts).toHaveBeenCalledTimes(1)
      expect(api.summary).toHaveBeenCalledTimes(1)
      expect(api.run).not.toHaveBeenCalled()
    }
    expect(wrapper.text()).toContain('Average score of inspected hosts')
    expect(wrapper.text()).toContain('后端风险描述')
    expect(wrapper.text()).toContain('后端作业消息')
    await vm.handleRunSelected()
    await flushPromises()
    expect(api.run).toHaveBeenCalledExactlyOnceWith(['原始主机ID'])
    expect(vm.activeRunResultId).toBe('new-run')
  })
  it('does not restart or stop inspection polling when the language changes', async () => {
    vi.useFakeTimers()
    api.summary.mockResolvedValue({
      counts: { WARNING: 1 },
      latestRun: { runId: 'running-id', status: 'RUNNING' }
    })
    await open()
    const timers = vi.getTimerCount()
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vi.getTimerCount()).toBe(timers)
    expect(api.summary).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(api.summary).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.$.setupState.summary.latestRun.runId).toBe('running-id')
    expect(wrapper.vm.$.setupState.isRunInProgress).toBe(true)
  })
})
