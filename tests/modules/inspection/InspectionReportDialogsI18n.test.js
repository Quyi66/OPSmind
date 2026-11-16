import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Host from '@/modules/inspection/components/result-detail/HostDetailDialog.vue'
import Kpi from '@/modules/inspection/components/result-detail/KpiDetailDialog.vue'
import Item from '@/modules/inspection/components/result-detail/CheckItemDetailDialog.vue'
import Hosts from '@/modules/inspection/components/result-detail/CheckItemHostsDialog.vue'
import HostBlacklist from '@/modules/inspection/components/result-detail/WhitelistDialog.vue'
import ItemBlacklist from '@/modules/inspection/components/result-detail/ItemWhitelistDialog.vue'
import Columns from '@/modules/inspection/components/result-detail/AssetModelConfigDialog.vue'
import Statistics from '@/modules/inspection/components/result-detail/StatisticsCards.vue'

const api = vi.hoisted(() => ({ getAssetModelTypes: vi.fn(), getSelectedAssetModels: vi.fn(), saveAssetModel: vi.fn(),
  saveWhitelist: vi.fn(), deleteWhitelist: vi.fn(), confirm: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }))
vi.mock('@/modules/inspection/api', () => ({ assetModelApi: api, whitelistApi: api }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, warning: api.warning, error: api.error }, ElMessageBox: { confirm: api.confirm } }))
const Slot = { template: '<div><slot /><slot name="header" /><slot name="footer" /></div>' }
const wrappers = []
async function open(component, props = {}) {
  const wrapper = shallowMount(component, { props: { visible: false, ...props }, global: { stubs: {
    'el-dialog': { props: ['title'], template: '<div><h2>{{ title }}</h2><slot /><slot name="footer" /></div>' },
    ...Object.fromEntries(['el-table', 'el-tag', 'el-button', 'el-card'].map(name => [name, Slot])),
    'el-table-column': true, 'el-select': true, 'el-option': true, 'el-input': true, 'el-checkbox': true,
    'el-pagination': true, 'el-empty': true, I18nT: false, 'i18n-t': false
  }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await wrapper.setProps({ visible: true })
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const row = { id: 'raw-item', name: '中文检查项', status: 'FAILED', hostKey: '原始主机', host_key: '原始主机', hostId: 'raw-host', host_id: 'raw-host', output: '后端输出 {raw}\n{{raw}}', whetherWhiteList: 'n' }
beforeEach(async () => {
  vi.resetAllMocks()
  api.confirm.mockResolvedValue()
  api.saveWhitelist.mockResolvedValue()
  api.deleteWhitelist.mockResolvedValue()
  api.getAssetModelTypes.mockResolvedValue({ data: { 后端模型类型: [{ code: 'raw-code', title: '后端字段', protocol: '中文原值' }] } })
  api.getSelectedAssetModels.mockResolvedValue({ data: {} })
  api.saveAssetModel.mockResolvedValue()
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection report dialog language changes', () => {
  it('preserves loaded host/KPI filters and raw rows while translating captions', async () => {
    const { wrapper: host, vm: hostVm } = await open(Host, { host: row, machineInfo: { os_distro: '后端系统', os_version: '原版本' }, checkItems: [row], statusFilter: 'FAILED' })
    const { wrapper: kpi, vm: kpiVm } = await open(Kpi, { title: '后端标题', data: [row] })
    hostVm.filterText = '中文'
    kpiVm.filterText = '原始'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(host.text()).toContain('原始主机 - Check item details')
    expect(host.text()).toContain('Operating system: 后端系统 原版本')
    expect(host.text()).toContain('1 / 1 loaded item matched')
    expect(host.props('statusFilter')).toBe('FAILED')
    expect(hostVm.filterText).toBe('中文')
    expect(hostVm.filteredCheckItems).toEqual([row])
    expect(kpiVm.filterText).toBe('原始')
    expect(kpiVm.filteredData).toEqual([row])
    expect(kpi.text()).toContain('1 / 1 item matched')
    expect(kpi.props('title')).toBe('后端标题')
  })

  it.each([0, 1, 2])('renders associated host and exemption rule counts correctly for %i entries', async count => {
    const data = Array.from({ length: count }, (_, index) => ({ ...row, hostKey: `原始主机${index}` }))
    const { wrapper: hosts } = await open(Hosts, { data, itemName: '中文检查项', statusFilter: 'FAILED' })
    const { wrapper: rules } = await open(ItemBlacklist, { data })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(hosts.text()).toContain(`${count} associated host${count === 1 ? '' : 's'}`)
    expect(hosts.find('strong').text()).toBe('中文检查项')
    expect(rules.text()).toContain(`${count} exemption rule${count === 1 ? '' : 's'}`)
    expect(hosts.props('statusFilter')).toBe('FAILED')
  })

  it('preserves selected blacklist IDs, rule search and the loaded rule page', async () => {
    const { wrapper: hosts, vm: hostsVm } = await open(HostBlacklist, { data: [row] })
    const rules = Array.from({ length: 25 }, (_, index) => ({ ...row, id: `rule-${index}`, checkName: row.name }))
    const { vm: rulesVm } = await open(ItemBlacklist, { data: rules })
    hostsVm.handleSelectionChange([row])
    rulesVm.searchText = '中文'
    rulesVm.currentPage = 2
    const first = rulesVm.paginatedData[0]
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(hostsVm.selectedIds).toEqual(['raw-host'])
    expect(hosts.emitted('update:selectedIds')).toEqual([[['raw-host']]])
    expect(hosts.text()).toContain('Remove from blacklist (1)')
    expect(rulesVm.searchText).toBe('中文')
    expect(rulesVm.currentPage).toBe(2)
    expect(rulesVm.paginatedData[0]).toBe(first)
  })

  it('keeps backend output verbatim and uses original item metadata for blacklist writes', async () => {
    const { wrapper, vm } = await open(Item, { item: row, templateId: 'raw-template', templateName: '中文模板', scriptPath: '目录/原脚本.yml' })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.get('pre').text()).toBe(row.output)
    await vm.handleAddToWhitelist()
    expect(api.confirm.mock.calls[0][0]).toBe('Add this check item to the blacklist?')
    expect(api.saveWhitelist).toHaveBeenCalledExactlyOnceWith({ templateId: 'raw-template', templateName: '中文模板', scriptPath: '目录/原脚本.yml', hostId: 'raw-host', hostKey: '原始主机', checkName: '中文检查项' })
    await wrapper.setProps({ item: { ...row, whetherWhiteList: 'y,original-rule-id' } })
    await vm.handleRemoveFromWhitelist()
    expect(api.deleteWhitelist).toHaveBeenCalledExactlyOnceWith('original-rule-id')
  })

  it('retains export field drafts and sends original asset metadata after switching language', async () => {
    const { wrapper, vm } = await open(Columns)
    const field = vm.assetModelData.后端模型类型[0]
    vm.handleCheckChange('后端模型类型', field, true)
    const pending = vm.pendingChanges
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.pendingChanges).toBe(pending)
    expect(vm.hasPendingChanges).toBe(true)
    expect(wrapper.text()).toContain('1 / 1 field selected')
    expect(wrapper.text()).toContain('后端模型类型')
    expect(api.getAssetModelTypes).toHaveBeenCalledTimes(1)
    expect(api.getSelectedAssetModels).toHaveBeenCalledTimes(1)
    await vm.handleSave()
    expect(api.saveAssetModel).toHaveBeenCalledExactlyOnceWith({ code: 'raw-code', title: '后端字段', protocol: '中文原值', isChecked: true })
    expect(api.success).toHaveBeenLastCalledWith('Saved successfully')
  })

  it('updates statistics captions and emits the original status identity', async () => {
    const { wrapper } = await open(Statistics, { statistics: { OK: 1 } })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Click a count to view details · 1 check item')
    expect(wrapper.text()).toContain('Check passed')
    await wrapper.get('.stat-metric-item').trigger('click')
    expect(wrapper.emitted('click')).toEqual([['OK']])
  })
})
