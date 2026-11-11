import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import CommonDetail from '@/modules/patches/components/cve/details/CveDetail.vue'
import MiddlewareDetail from '@/modules/patches/components/cve/details/MiddlewareCveDetail.vue'
import WindowsDetail from '@/modules/patches/windows-patch/components/cve/details/WindowsCveDetail.vue'
import KbDetail from '@/modules/patches/windows-patch/components/kb/WindowsKbDetail.vue'

const api = vi.hoisted(() => ({
  common: vi.fn(),
  middleware: vi.fn(),
  windows: vi.fn(),
  kb: vi.fn(),
  products: vi.fn(),
  hosts: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  cveApi: { getCveDetail: api.common },
  middlewareCveApi: { getDetail: api.middleware },
  winCveApi: { getCveDetail: api.windows, getAffectedProducts: api.products },
  winKbApi: { getKbDetail: api.kb, getAffectedHosts: api.hosts }
}))
vi.mock('echarts', () => ({ init: () => ({ setOption() {}, dispose() {}, resize() {} }) }))
vi.mock('@/composables/useTheme', async () => {
  const { ref } = await import('vue')
  return { useTheme: () => ({ isDark: ref(false) }) }
})
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/rpm/RpmPackageDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/cve/MiddlewareAffectedHostsDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { props: ['cves'], template: '<span>{{ cves.join(",") }}</span>' }
}))

const Slot = { template: '<div><slot /></div>' }
let wrapper
const fixture = score => ({
  cveId: 'CVE-score',
  kbNumber: 'KB5001',
  cvss3Score: score,
  severity: 'low',
  description: '模拟漏洞',
  products: [],
  cves: [{ cveId: 'CVE-score', cvss3Score: score }],
  sources: [{ source: 'redhat', cvss3Score: score, packages: {}, description: '模拟漏洞' }],
  middlewares: [
    { middlewareType: 'Tomcat', cvss3Score: score, affectedVersions: [], fixedVersions: [] }
  ]
})
async function open(component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component }]
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(component, {
    props: component === KbDetail ? { kbNumber: 'KB5001' } : { cveId: 'CVE-score' },
    global: {
      plugins: [router],
      components: { ElTable, ElTableColumn },
      stubs: {
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-card': Slot,
        'el-row': Slot,
        'el-col': Slot,
        'el-breadcrumb': Slot,
        'el-breadcrumb-item': Slot,
        'el-descriptions': Slot,
        'el-descriptions-item': Slot,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-button': Slot,
        'el-link': Slot,
        'el-select': Slot,
        'el-option': true,
        'el-tag': Slot,
        'el-icon': true,
        'el-tooltip': Slot,
        'el-empty': true,
        'el-alert': true,
        'el-skeleton': true,
        'el-divider': true
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
function scoreText(component) {
  if (component === KbDetail) {
    const row = wrapper
      .findAll('.el-table__body-wrapper tbody tr')
      .find(item => item.text().includes('CVE-score'))
    return row.findAll('td')[2].text()
  }
  const cell = wrapper
    .findAll('.detail-cell')
    .find(item => item.find('.label').exists() && item.find('.label').text() === 'CVSS 评分')
  return cell.get('.value > span').text()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.products.mockResolvedValue({ data: { products: [], affectedHosts: [] } })
  api.hosts.mockResolvedValue({ data: { hosts: [] } })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each([
  ['通用CVE', CommonDetail, api.common],
  ['中间件CVE', MiddlewareDetail, api.middleware],
  ['Windows CVE', WindowsDetail, api.windows],
  ['Windows KB关联CVE', KbDetail, api.kb]
])('%s详情评分', (_, component, query) => {
  it('真实0分显示0.0', async () => {
    query.mockResolvedValue({ data: fixture(0) })
    await open(component)
    expect(scoreText(component)).toBe('0.0')
  })

  it('数字字符串正常显示，切换到非法评分详情时保持占位而不显示NaN', async () => {
    query.mockResolvedValue({ data: fixture('9.8') })
    await open(component)
    expect(scoreText(component)).toBe('9.8')
    query.mockResolvedValue({ data: fixture('invalid') })
    await wrapper.setProps(component === KbDetail ? { kbNumber: 'KB5002' } : { cveId: 'CVE-other' })
    await flushPromises()
    expect(scoreText(component)).toBe('-')
    expect(wrapper.text()).not.toContain('NaN')
  })
})
