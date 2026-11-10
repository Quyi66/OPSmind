import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElForm, ElMessage, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/asset/views/AssetInfoPage.vue'

const api = vi.hoisted(() => ({
  getAssetTypes: vi.fn(),
  getAssetList: vi.fn(),
  getAttrValues: vi.fn(),
  getGroupList: vi.fn(),
  getTagList: vi.fn(),
  post: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({
  assetApi: api,
  dataManageApi: { getCurrentTenantId: vi.fn().mockResolvedValue('original-tenant') }
}))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('@/composables/useJobPolling', () => ({ pollJobStatus: vi.fn() }))
let root, router
const page = () => root.findComponent(Page)
const state = () => page().vm.$.setupState
const rows = [
  { id: 'original-a', HOSTNAME: 'original-host-a', IP: '192.0.2.1' },
  { id: 'original-b', HOSTNAME: 'original-host-b', IP: '192.0.2.2' }
]
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/acm/info', component: Page },
      { path: '/acm/automation', component: { template: '<div>连接凭据</div>' } },
      { path: '/acm/log', component: { template: '<div>操作日志</div>' } }
    ]
  })
  await router.push({ path: '/acm/info', query })
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, {
            default: () => h(Component, { key: route.path.replace(/\/$/, '') })
          })
      })
  })
  root = mount(Host, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot /></button>'
        },
        'el-tooltip': { template: '<span><slot /></span>' },
        'el-tag': { template: '<span><slot /></span>' },
        transition: { template: '<div><slot /></div>' },
        ...Object.fromEntries(
          [
            'ElTabs',
            'ElTabPane',
            'ElSelect',
            'ElOption',
            'ElInput',
            'ElIcon',
            'ElLink',
            'ElPagination',
            'ElAlert',
            'ElDialog',
            'ElDrawer',
            'ElDropdown',
            'ElDropdownMenu',
            'ElDropdownItem',
            'ElRadioGroup',
            'ElRadio',
            'ElSwitch',
            'ElRow',
            'ElCol',
            'ElProgress',
            'ElAvatar',
            'AssetSidebar',
            'AssetDetailDialog',
            'AssetEditDialog',
            'AssetHistoryDialog',
            'AutoEntryDialog',
            'ImportAssetDialog',
            'DeleteAssetImportDialog',
            'BatchEditDialog',
            'AddTagDialog',
            'AddGroupDialog'
          ].map(name => [name, true])
        )
      }
    }
  })
  await flushPromises()
}
async function selectFirst() {
  const table = page()
    .findAllComponents(ElTable)
    .find(item => item.props('height') === '100%')
  await table.get('tbody tr input[type="checkbox"]').setValue(true)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getAssetTypes.mockResolvedValue({ records: [{ code: 'linux', title: 'Linux' }] })
  api.getAssetList.mockResolvedValue({ records: rows, total: 2 })
  api.getAttrValues.mockResolvedValue({ records: [] })
  api.getGroupList.mockResolvedValue({ records: [] })
  api.getTagList.mockResolvedValue({ records: [] })
  vi.spyOn(ElMessage, 'info').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
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
  root?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('设备清单只消费自身路由IP', () => {
  it('缓存切到带IP的凭据/日志页面不读取设备，也不清真实勾选与原搜索页码', async () => {
    await open({ ip: '192.0.2.1' })
    await selectFirst()
    const context = state()
    context.currentPage = 3
    expect(context.selectedRows.map(row => row.id)).toEqual(['original-a'])
    const reads = api.getAssetList.mock.calls.length
    await router.push({ path: '/acm/automation', query: { ip: 'other-credential-host' } })
    await flushPromises()
    await router.push({ path: '/acm/log', query: { ip: 'other-log-host' } })
    await flushPromises()
    expect(context.searchText).toBe('192.0.2.1')
    expect(context.currentPage).toBe(3)
    expect(context.selectedRows.map(row => row.id)).toEqual(['original-a'])
    expect(api.getAssetList).toHaveBeenCalledTimes(reads)
    expect(api.post).not.toHaveBeenCalled()
  })
  it('主动带IP返回自身路由才查询，回首页并沿原规则清旧上下文选择', async () => {
    await open()
    await selectFirst()
    const context = state()
    context.currentPage = 3
    const reads = api.getAssetList.mock.calls.length
    await router.push({ path: '/acm/automation', query: { ip: '192.0.2.2' } })
    await flushPromises()
    expect(context.selectedRows).toHaveLength(1)
    await router.push({ path: '/acm/info', query: { ip: '192.0.2.2' } })
    await flushPromises()
    expect(state()).toBe(context)
    expect(context.currentPage).toBe(1)
    expect(context.searchText).toBe('192.0.2.2')
    expect(context.selectedRows).toEqual([])
    expect(api.getAssetList).toHaveBeenCalledTimes(reads + 1)
    const [params, options] = api.getAssetList.mock.lastCall
    expect(params.assetType).toBe('linux')
    expect(options.page).toBe(1)
    expect(options.filter).toContain('192.0.2.2')
  })
  it('自身IP变化和尾斜线继续查询；移除IP保持原不清空手动条件的规则', async () => {
    await open({ ip: '192.0.2.1' })
    const reads = api.getAssetList.mock.calls.length
    await router.replace({ path: '/acm/info/', query: { ip: '192.0.2.2' } })
    await flushPromises()
    expect(state().searchText).toBe('192.0.2.2')
    expect(api.getAssetList).toHaveBeenCalledTimes(reads + 1)
    await router.replace({ path: '/acm/info/', query: {} })
    await flushPromises()
    expect(state().searchText).toBe('192.0.2.2')
    expect(api.getAssetList).toHaveBeenCalledTimes(reads + 1)
  })
  it('自身无关query字段变化不重复读取或清已选，搜索表单阻止原生提交', async () => {
    await open({ ip: '192.0.2.1' })
    await selectFirst()
    const reads = api.getAssetList.mock.calls.length
    await router.replace({ path: '/acm/info', query: { ip: '192.0.2.1', display: 'same-context' } })
    await flushPromises()
    expect(api.getAssetList).toHaveBeenCalledTimes(reads)
    expect(state().selectedRows.map(row => row.id)).toEqual(['original-a'])
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
