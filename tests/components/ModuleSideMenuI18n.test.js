import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElIcon, ElMenu, ElMenuItem, ElSubMenu } from 'element-plus'
import { setLocale } from '@/core/i18n'
import { MENU_CONFIG } from '@/config/menu.config'
import { getGroupMenuConfig } from '@/config/module-nav.config'
import { useMenuStore } from '@/stores/menu'
import Menu from '@/modules/shared/components/ModuleSideMenu.vue'

vi.mock('@/core/auth', () => ({ authService: { hasPermission: () => true, getCurrentUser: () => ({ id: 'layout-user' }) } }))
let wrapper, router, store
async function open() {
  const pinia = createPinia()
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/patches/machineScan')
  store = useMenuStore(pinia)
  wrapper = mount({ setup() {
    const groups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))
    return () => h(Menu, { menuGroups: groups.value, badgeCounts: { 'patches::installManage': 3 } })
  } }, { global: { plugins: [pinia, router], components: { ElMenu, ElMenuItem, ElSubMenu, ElIcon }, stubs: { transition: true } } })
  await flushPromises()
  return wrapper.findComponent(Menu)
}
beforeEach(() => setLocale('zh-CN', { persist: false }))
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
})

describe('公共侧栏英文长标题与菜单状态', () => {
  it('当前语言切换保留真实菜单实例、展开项和选中目标，完整呈现长标题', async () => {
    const menu = await open()
    expect(menu.find('.menu-label').exists()).toBe(false)
    const elementMenu = wrapper.findComponent(ElMenu)
    const instance = elementMenu.vm.$.uid
    const active = elementMenu.props('defaultActive')
    const installation = wrapper.findAllComponents(ElSubMenu).find(item => item.props('index') === 'patches::installManage')
    await installation.find('.el-sub-menu__title').trigger('click')
    await flushPromises()
    expect(installation.classes()).toContain('is-opened')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(menu.classes()).toContain('is-english')
    expect(wrapper.findComponent(ElMenu).vm.$.uid).toBe(instance)
    expect(elementMenu.props('defaultActive')).toBe(active)
    expect(installation.classes()).toContain('is-opened')
    expect(wrapper.findAll('.menu-label').map(label => label.text())).toEqual(expect.arrayContaining(['Installation & rollback', 'Software & repositories']))
    expect(router.currentRoute.value.fullPath).toBe('/patches/machineScan')
    const target = wrapper.findAllComponents(ElMenuItem).find(item => item.props('index') === 'patches::installManage::changeRollback')
    await target.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/patches/changeRollback')
  })

  it('折叠状态跨语言保留，展开后继续显示当前语言标题', async () => {
    const menu = await open()
    await menu.find('.collapse-toggle').trigger('click')
    expect(store.sideMenuCollapsed).toBe(true)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(menu.classes()).toEqual(expect.arrayContaining(['is-english', 'is-collapsed']))
    expect(wrapper.findComponent(ElMenu).props('collapse')).toBe(true)
    await menu.find('.collapse-toggle').trigger('click')
    await flushPromises()
    expect(store.sideMenuCollapsed).toBe(false)
    expect(menu.text()).toContain('Software & repositories')
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(menu.classes()).not.toContain('is-english')
    expect(menu.find('.menu-label').exists()).toBe(false)
    expect(menu.classes()).not.toContain('is-collapsed')
    expect(menu.text()).toContain('软件与仓库')
    expect(router.currentRoute.value.path).toBe('/patches/machineScan')
  })
})
