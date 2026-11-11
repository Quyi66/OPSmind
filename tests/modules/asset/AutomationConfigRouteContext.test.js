import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import Page from '@/modules/asset/views/AutomationConfigPage.vue'

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
  api.getAutomationConfigs.mockReset().mockResolvedValue({ records: [], total: 0 })
  api.getResourceTypes.mockReset().mockResolvedValue({ records: [] })
  api.get.mockReset().mockResolvedValue({ data: [] })
  api.post.mockReset()
})
afterEach(() => root?.unmount())

describe('连接凭据页只消费自身路由的IP', () => {
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
