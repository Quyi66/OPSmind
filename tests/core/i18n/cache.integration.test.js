import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { config, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { setLocale } from '@/core/i18n'
import { getViewTitle } from '@/core/i18n/navigation'
import { useTagsViewStore } from '@/stores/tagsView'
import { getTagsViewPersistKey } from '@/utils/tagsViewStorage'
import GroupShell from '@/layouts/groups/GroupLayoutShell.vue'
import Params from '@/modules/settings/views/SscParamPage.vue'

const fixture = vi.hoisted(() => ({ user: { id: 'user-a', tenantId: 'tenant-a' }, getSysParams: vi.fn(), updateSysParam: vi.fn() }))
vi.mock('@/core/auth', () => ({ authService: { getCurrentUser: () => fixture.user } }))
vi.mock('@/modules/settings/api/params', () => ({
  getSysParams: fixture.getSysParams,
  updateSysParam: fixture.updateSysParam,
  getAppParams: vi.fn().mockResolvedValue({ data: [] }),
  createSysParam: vi.fn(), deleteSysParam: vi.fn(),
  createAppParam: vi.fn(), updateAppParam: vi.fn(), deleteAppParam: vi.fn()
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }, ElMessageBox: { confirm: vi.fn() } }))
vi.mock('@/modules/shared/components/ModuleSideMenu.vue', () => ({ default: { template: '<aside />' } }))

const meta = { title: '参数配置', titleKey: 'navigation.pages.ssc.param' }
const paramView = (title = meta.title) => ({ path: '/ssc/param', fullPath: '/ssc/param?raw=1', name: 'ssc-param', title, query: { raw: '1' }, meta })
const wrappers = []
const routerViewStub = config.global.stubs['router-view']
let pinia
beforeEach(async () => {
  // Remove the suite-wide kebab-case stub so nested outlets use the router's real component.
  delete config.global.stubs['router-view']
  vi.clearAllMocks()
  fixture.user = { id: 'user-a', tenantId: 'tenant-a' }
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  fixture.getSysParams.mockResolvedValue({ data: Array.from({ length: 25 }, (_, index) => ({ id: `param-${index}`, domain: '原始域', name: `原始参数${index}`, value: '原始值', isEncrypt: 1, view: 1 })) })
  fixture.updateSysParam.mockResolvedValue()
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  config.global.stubs['router-view'] = routerViewStub
  localStorage.clear()
  await setLocale('zh-CN', { persist: false })
})

describe('标签持久化和在用设置页面缓存的语言联合回归', () => {
  it('恢复静态标签后按当前语言展示，不改变存储标题、查询或缓存身份', async () => {
    const store = useTagsViewStore()
    store.addView(paramView())
    const key = getTagsViewPersistKey(fixture.user)
    const stored = localStorage.getItem(key)
    const restored = useTagsViewStore(createPinia())
    restored.loadPersistedViews()
    const view = restored.visitedViews[0]
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(view)).toBe('Parameters')
    expect(view.fullPath).toBe('/ssc/param?raw=1')
    expect(localStorage.getItem(key)).toBe(stored)
    expect(store.cachedViews).toEqual(['ssc-param'])
    await setLocale('zh-CN', { persist: false })
    expect(getViewTitle(view)).toBe('参数配置')
  })

  it('恢复带路由元数据的自定义标题时保留原文', async () => {
    const key = getTagsViewPersistKey(fixture.user)
    localStorage.setItem(key, JSON.stringify([paramView('后端业务标题 {raw}')]))
    const store = useTagsViewStore()
    store.loadPersistedViews()
    for (const locale of ['zh-CN', 'en-US', 'zh-CN']) {
      await setLocale(locale, { persist: false })
      expect(getViewTitle(store.visitedViews[0])).toBe('后端业务标题 {raw}')
      expect(JSON.parse(localStorage.getItem(key))[0].title).toBe('后端业务标题 {raw}')
    }
  })

  it('新加入的自定义标签、固定标签和 iframe 标题采用显式标题', async () => {
    const store = useTagsViewStore()
    store.addView(paramView('客户自定义参数标题'))
    store.addAffixView({ ...paramView('固定自定义标题'), path: '/home', meta: { ...meta, affix: true } })
    store.addIframeView(paramView('后端 iframe 标题'))
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(store.visitedViews.find(view => view.path === '/ssc/param'))).toBe('客户自定义参数标题')
    expect(getViewTitle(store.visitedViews.find(view => view.path === '/home'))).toBe('固定自定义标题')
    expect(getViewTitle(store.iframeViews[0])).toBe('后端 iframe 标题')
  })

  it('切换语言后换账号仍清除旧账号标签和页面缓存', async () => {
    const store = useTagsViewStore()
    store.loadPersistedViews()
    store.addView(paramView())
    await setLocale('en-US', { persist: false })
    fixture.user = { id: 'user-b', tenantId: 'tenant-a' }
    store.loadPersistedViews()
    expect(store.visitedViews).toEqual([])
    expect(store.cachedViews).toEqual([])
    expect(store.iframeViews).toEqual([])
    const previousKey = getTagsViewPersistKey({ id: 'user-a', tenantId: 'tenant-a' })
    expect(JSON.parse(localStorage.getItem(previousKey))).toHaveLength(1)
  })

  it('真实分组 KeepAlive 返回参数页后保留草稿、分页与同一实例，按当前语言保存原始参数', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/ssc', component: GroupShell, props: { menuGroups: [] }, children: [
        { path: 'param', name: 'ssc-param', component: Params, meta },
        { path: 'email', name: 'ssc-email', component: { template: '<div>Other active route</div>' } }
      ] }
    ] })
    const store = useTagsViewStore(pinia)
    store.addView(paramView())
    await router.push('/ssc/param?raw=1')
    const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
    const wrapper = mount({ render: () => h(RouterView) }, { global: {
      plugins: [pinia, router], components: { RouterView }, directives: { loading() {} }, stubs: {
        RouterView: false, transition: true, 'keep-alive': false,
        ...Object.fromEntries(['el-tabs', 'el-tab-pane', 'el-button', 'el-dialog', 'el-form-item', 'el-table', 'el-descriptions', 'el-descriptions-item'].map(name => [name, Slot])),
        'el-form': { ...Slot, methods: { validate: async () => true, clearValidate() {} } },
        'el-table-column': true, 'el-input': true, 'el-switch': true, 'el-pagination': true,
        'el-select': true, 'el-option': true, 'el-radio-group': true, 'el-radio': true, 'el-alert': true, 'el-icon': true
      }
    } })
    wrappers.push(wrapper)
    await flushPromises()
    const page = wrapper.findComponent(Params)
    const instanceId = page.vm.$.uid
    const vm = page.vm.$.setupState
    vm.sysSearchKeyword = '原始参数'
    vm.handleSysSearch()
    vm.sysCurrentPage = 2
    vm.handleEditSysParam(vm.paginatedSysParams[0])
    vm.sysForm.value = '未保存草稿 {raw}'
    const id = vm.sysForm.id
    await router.push('/ssc/email')
    await flushPromises()
    await setLocale('en-US', { persist: false })
    await router.push('/ssc/param?raw=1')
    await flushPromises()
    await nextTick()
    expect(wrapper.findComponent(Params).vm.$.uid).toBe(instanceId)
    expect(vm.sysCurrentPage).toBe(2)
    expect(vm.sysAppliedSearchKeyword).toBe('原始参数')
    expect(vm.sysForm.value).toBe('未保存草稿 {raw}')
    expect(vm.sysDialogVisible).toBe(true)
    expect(vm.getDialogTitle('sys')).toBe('Edit system parameter')
    expect(fixture.getSysParams).toHaveBeenCalledTimes(1)
    expect(fixture.updateSysParam).not.toHaveBeenCalled()
    await vm.handleSaveSysParam()
    expect(fixture.updateSysParam).toHaveBeenCalledTimes(1)
    expect(fixture.updateSysParam.mock.calls[0][0]).toMatchObject({ id, domain: '原始域', value: '未保存草稿 {raw}', isEncrypt: 1, view: 1 })
    expect(router.currentRoute.value.fullPath).toBe('/ssc/param?raw=1')
  })
})
