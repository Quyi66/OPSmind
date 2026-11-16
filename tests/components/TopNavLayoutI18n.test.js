import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setLocale } from '@/core/i18n'
import TopNav from '@/components/layout/TopNavMenu.vue'

const api = vi.hoisted(() => ({ account: vi.fn(), resize: null, disconnect: vi.fn() }))
vi.mock('@/core/auth', () => ({ authService: { getCurrentUser: () => ({ id: 'nav-user', login: 'fixture-user' }), hasPermission: () => true } }))
vi.mock('@/core/account', () => ({ accountService: { getAccount: api.account } }))
vi.mock('@/stores/dashboard', () => ({ useDashboardStore: () => ({}) }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ isDark: ref(false), toggleDark: vi.fn() }) }))
vi.mock('@/utils/ai-ops-panel', () => ({ toggleAiOpsPanel: vi.fn(), prewarmAiOpsPanel: vi.fn(), disposeAiOpsPanel: vi.fn() }))
vi.mock('@/components/layout/NotificationPopover.vue', () => ({ default: { template: '<div />' } }))

let wrapper, router
const Slot = { template: '<div><slot /></div>' }
beforeEach(async () => {
  vi.clearAllMocks()
  api.account.mockResolvedValue(null)
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { api.resize = callback }
    observe() {}
    disconnect() { api.disconnect() }
  })
  localStorage.clear()
  await setLocale('zh-CN', { persist: false })
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/acm/overview')
  wrapper = mount(TopNav, { props: { user: { login: 'fixture-user' } }, global: {
    plugins: [createPinia(), router], stubs: {
      'el-dropdown': Slot, 'el-tooltip': Slot, 'el-icon': Slot, 'el-avatar': true,
      'el-dropdown-menu': Slot, 'el-dropdown-item': Slot, 'el-dialog': true,
      'el-table': true, 'el-table-column': true
    }
  } })
  await flushPromises()
})
afterEach(async () => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  localStorage.clear()
  await setLocale('zh-CN', { persist: false })
})

describe('顶部英文导航与语言入口', () => {
  it('语言切换始终位于工具区末端，切换不重建导航或重新读取账号', async () => {
    const instance = wrapper.vm.$.uid
    const links = () => wrapper.findAll('.nav-menu .nav-item')
    const count = links().length
    const right = wrapper.find('.nav-right').element
    expect(right.lastElementChild.classList.contains('header-language-switcher')).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(1)
    await wrapper.find('select').setValue('en-US')
    await vi.waitFor(() => expect(wrapper.classes()).toContain('is-english'))
    await flushPromises()
    expect(wrapper.classes()).toContain('is-english')
    expect(wrapper.vm.$.uid).toBe(instance)
    expect(links()).toHaveLength(count)
    expect(links().map(link => link.text())).toContain('System settings')
    expect(router.currentRoute.value.path).toBe('/acm/overview')
    expect(api.account).toHaveBeenCalledTimes(1)
    await wrapper.find('select').setValue('zh-CN')
    await vi.waitFor(() => expect(wrapper.classes()).not.toContain('is-english'))
    await flushPromises()
    expect(wrapper.classes()).not.toContain('is-english')
    expect(wrapper.find('.nav-scroll-arrow').exists()).toBe(false)
    expect(links().map(link => link.text())).toContain('系统设置')
    expect(right.lastElementChild.classList.contains('header-language-switcher')).toBe(true)
    expect(api.account).toHaveBeenCalledTimes(1)
  })

  it('英文溢出时提供前后滚动入口，末端菜单仍按原权限目标导航', async () => {
    const nav = wrapper.find('.nav-menu').element
    let left = 0
    Object.defineProperties(nav, {
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 1200 },
      scrollLeft: { configurable: true, get: () => left }
    })
    nav.scrollBy = vi.fn(({ left: delta }) => { left = Math.min(800, Math.max(0, left + delta)); nav.dispatchEvent(new Event('scroll')) })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.findAll('.nav-scroll-arrow')).toHaveLength(2)
    expect(wrapper.findAll('.nav-scroll-arrow')[0].element.disabled).toBe(true)
    await wrapper.findAll('.nav-scroll-arrow')[1].trigger('click')
    expect(nav.scrollBy).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
    expect(wrapper.findAll('.nav-scroll-arrow')[0].element.disabled).toBe(false)
    left = 800
    await wrapper.find('.nav-menu').trigger('scroll')
    expect(wrapper.findAll('.nav-scroll-arrow')[1].element.disabled).toBe(true)
    await wrapper.findAll('.nav-menu .nav-item').find(link => link.text() === 'System settings').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ssc/param')
    expect(api.account).toHaveBeenCalledTimes(1)
  })

  it('尺寸变化后取消无须显示的滚动入口，卸载释放观察器', async () => {
    const nav = wrapper.find('.nav-menu').element
    Object.defineProperties(nav, { clientWidth: { configurable: true, value: 1000 }, scrollWidth: { configurable: true, value: 900 } })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    api.resize()
    await flushPromises()
    expect(wrapper.find('.nav-scroll-arrow').exists()).toBe(false)
    wrapper.unmount()
    wrapper = undefined
    expect(api.disconnect).toHaveBeenCalledTimes(1)
  })
})
