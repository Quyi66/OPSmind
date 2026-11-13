import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import Page from '@/modules/asset/views/AutomationConfigPage.vue'
import { setLocale } from '@/core/i18n'

const api = vi.hoisted(() => ({
  getAutomationConfigs: vi.fn(),
  getResourceTypes: vi.fn(),
  get: vi.fn(),
  post: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({ automationApi: api, dataManageApi: api }))
vi.mock('@/core/api', () => ({ apiService: api }))
vi.mock('@/core/auth', () => ({ authService: { getToken: vi.fn() } }))
vi.mock('@/modules/asset/components/automation/DeviceManageDialog.vue', () => ({
  default: { template: '<div />' }
}))
let root, router
const state = () => root.findComponent(Page).vm.$.setupState
async function open(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/acm/automation', component: Page },
      { path: '/acm/info', component: { template: '<div>设备清单</div>' } },
      { path: '/acm/log', component: { template: '<div>操作日志</div>' } }
    ]
  })
  await router.push({ path: '/acm/automation', query })
  await router.isReady()
  root = mount(
    defineComponent({
      setup: () => () =>
        h(RouterView, null, {
          default: ({ Component, route }) =>
            h(KeepAlive, null, {
              default: () => h(Component, { key: route.path.replace(/\/$/, '') })
            })
        })
    }),
    {
      global: {
        plugins: [router],
        stubs: {
          'router-view': false,
          ...Object.fromEntries(
            [
              'ElTabs',
              'ElTabPane',
              'ElForm',
              'ElFormItem',
              'ElButton',
              'ElIcon',
              'ElInput',
              'ElSelect',
              'ElOption',
              'ElTable',
              'ElTableColumn',
              'ElLink',
              'ElTag',
              'ElPagination',
              'ElAlert',
              'ElDialog',
              'ElDrawer',
              'ElRadioGroup',
              'ElRadio',
              'ElCheckbox',
              'ElSwitch',
              'ElRow',
              'ElCol',
              'ElTooltip'
            ].map(name => [name, true])
          )
        },
        directives: { loading() {} }
      }
    }
  )
  await flushPromises()
}
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  api.getAutomationConfigs.mockReset().mockResolvedValue({ records: [], total: 0 })
  api.getResourceTypes.mockReset().mockResolvedValue({ records: [] })
  api.get.mockReset().mockResolvedValue({ data: [] })
  api.post.mockReset()
})
afterEach(async () => {
  root?.unmount()
  await setLocale('zh-CN', { persist: false })
  vi.unstubAllGlobals()
})

describe('连接凭据页只消费自身路由的IP', () => {
  it('keeps credential drafts, pagination and request fields when switching languages', async () => {
    await open({ ip: 'original-host' })
    const vm = state()
    vm.activeTab = 'ansible'; vm.automationPage = 3; vm.ansiblePage = 2
    vm.editAutomationDialogVisible = true
    vm.automationForm = { id: 'row-id', ciId: 'raw-ci', ansibleConfigId: 'template-id', loginUser: '中文账号', loginPasswd: 'Original!123', runUser: 'sudo-user', runPasswd: 'Raw#Password', instanceGroup: '真实执行节点', aapInstanceGroup: '' }
    const form = vm.automationForm, route = router.currentRoute.value.fullPath
    await setLocale('en-US', { persist: false }); await flushPromises()
    expect(vm.automationForm).toBe(form)
    expect(vm.automationPage).toBe(3); expect(vm.ansiblePage).toBe(2)
    expect(vm.activeTab).toBe('ansible'); expect(vm.editAutomationDialogVisible).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe(route)
    expect(api.getAutomationConfigs).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
    api.post.mockResolvedValue({})
    await vm.saveAutomationConfig()
    expect(api.post.mock.calls[0][0]).toMatch(/\/jobs\/3TRE7d\/run\?cacheBuster=/)
    expect(api.post.mock.calls[0][1]).toEqual({ params: { ...form } })
  })
  it('缓存失活后不受设备清单/日志IP影响，也不切换原页签或搜索条件', async () => {
    await open({ ip: 'host-a' })
    const context = state()
    context.activeTab = 'ansible'
    await router.push({ path: '/acm/info', query: { ip: 'other-host' } })
    await flushPromises()
    await router.push({ path: '/acm/log', query: { ip: 'log-host' } })
    await flushPromises()
    expect(api.getAutomationConfigs).toHaveBeenCalledTimes(1)
    expect(context.filters.ip).toBe('host-a')
    expect(context.activeTab).toBe('ansible')
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/cmdb/api/cmdb/auto/ansible/find/all')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('返回自身路由仍按传入IP读取同一原接口，并沿原规则切设备凭据页签', async () => {
    await open()
    const context = state()
    context.activeTab = 'ansible'
    await router.push({ path: '/acm/info', query: { ip: 'same-host' } })
    await flushPromises()
    await router.push({ path: '/acm/automation', query: { ip: 'same-host' } })
    await flushPromises()
    expect(state()).toBe(context)
    expect(context.activeTab).toBe('automation')
    expect(context.filters.ip).toBe('same-host')
    expect(api.getAutomationConfigs).toHaveBeenCalledTimes(2)
    expect(api.getAutomationConfigs).toHaveBeenLastCalledWith(
      { ip: 'same-host', cit: 'sjxy_all', ansible_config_id: undefined },
      { page: 1, size: 10 }
    )
    expect(api.post).not.toHaveBeenCalled()
  })

  it('自身地址IP变化继续查询，移除IP保持原先不清空手动条件的规则', async () => {
    await open({ ip: 'host-a' })
    await router.replace({ path: '/acm/automation/', query: { ip: 'host-b' } })
    await flushPromises()
    expect(state().filters.ip).toBe('host-b')
    expect(api.getAutomationConfigs).toHaveBeenCalledTimes(2)
    await router.replace({ path: '/acm/automation/', query: {} })
    await flushPromises()
    expect(state().filters.ip).toBe('host-b')
    expect(api.getAutomationConfigs).toHaveBeenCalledTimes(2)
  })
})
