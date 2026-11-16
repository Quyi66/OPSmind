import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setLocale } from '@/core/i18n'
import { getViewTitle } from '@/core/i18n/navigation'
import { getMenuGroups } from '@/config/menu.config'
import { getGroupMenuConfig } from '@/config/module-nav.config'
import { MENU_CONFIG } from '@/config/menu.config'
import { setupPermissionGuard } from '@/core/router/guards/permission'
import { baseRoutes } from '@/core/router/routes/base'

const access = vi.hoisted(() => ({ permissions: new Set() }))
vi.mock('@/core/auth', () => ({ authService: {
  hasPermission: permission => access.permissions.has('admin') || access.permissions.has(permission)
} }))
vi.mock('@/layouts/MainLayout.vue', () => ({ default: { template: '<router-view />' } }))

// Exercise production paths, redirects, aliases and merged metadata without loading business pages.
function routeShells(records) {
  return records.map(record => ({
    ...record,
    component: { template: '<router-view />' },
    ...(record.children ? { children: routeShells(record.children) } : {})
  }))
}
const flatten = items => items.flatMap(item => [item, ...flatten(item.children || [])])
let router
beforeEach(async () => {
  access.permissions = new Set(['admin'])
  await setLocale('zh-CN', { persist: false })
  router = createRouter({ history: createMemoryHistory(), routes: routeShells(baseRoutes) })
  setupPermissionGuard(router)
})
afterEach(async () => {
  router.listening = false
  await setLocale('zh-CN', { persist: false })
})

describe('在用入口的路由、权限与语言联合回归', () => {
  it.each([
    ['/software', '/yum-repo/repos'],
    ['/software/installed', '/yum-repo/installed'],
    ['/patches/patchInstall', '/patches/machineScan'],
    ['/patches/windowsYumRepo', '/yum-repo/repos'],
    ['/ssc/tag', '/ssc/param']
  ])('旧入口 %s 重定向到 %s 后保留查询、hash 和路由身份', async (source, target) => {
    const query = { host: '原始主机', tab: 'raw-tab', values: ['0', '1'] }
    await router.push({ path: source, query, hash: '#raw-section' })
    const route = router.currentRoute.value
    expect(route.path).toBe(target)
    expect(route.query).toEqual(query)
    expect(route.hash).toBe('#raw-section')
    expect(route.meta.titleKey).toBeTruthy()
    const title = getViewTitle(route, router)
    expect(title).toMatch(/[\u4e00-\u9fff]/)
    const identity = [route.fullPath, route.name, route.meta.menuCode, route.meta.moduleCode]
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(route, router)).not.toMatch(/[\u4e00-\u9fff]|navigation\./)
    expect([router.currentRoute.value.fullPath, route.name, route.meta.menuCode, route.meta.moduleCode]).toEqual(identity)
    await setLocale('zh-CN', { persist: false })
    expect(getViewTitle(route, router)).toBe(title)
  })

  it.each([
    ['/patches/windowsUpdate', '/patches/windowsVulnerability'],
    ['/patches/windowsView', '/patches/windowsRollback']
  ])('Windows alias %s 和标准入口共享标题和权限元数据', async (alias, canonical) => {
    await router.push({ path: alias, query: { host: 'original-host' }, hash: '#details' })
    const route = router.currentRoute.value
    const expected = router.resolve(canonical)
    expect(route.path).toBe(alias)
    expect(route.name).toBe(expected.name)
    expect(route.meta).toEqual(expected.meta)
    expect(route.query.host).toBe('original-host')
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(route, router)).toBe(getViewTitle(expected, router))
    expect(route.meta.menuCode).toBe('windows-patches')
  })

  it('普通设置账号与管理员的 SQL 入口差异不随语言变化', async () => {
    access.permissions = new Set(['applet:uim'])
    for (const locale of ['zh-CN', 'en-US', 'zh-CN']) {
      await setLocale(locale, { persist: false })
      const config = getGroupMenuConfig('system-settings', MENU_CONFIG)
      expect(flatten(config).some(item => item.path === '/ssc/param')).toBe(true)
      expect(flatten(config).some(item => item.path === '/ssc/sql-import')).toBe(false)
      await router.push('/ssc/sql-import?raw=1#sql')
      expect(router.currentRoute.value.path).toBe('/home')
      await router.push('/ssc/param?raw=1#params')
      expect(router.currentRoute.value.fullPath).toBe('/ssc/param?raw=1#params')
    }
    access.permissions.add('admin')
    await setLocale('en-US', { persist: false })
    expect(flatten(getGroupMenuConfig('system-settings', MENU_CONFIG)).some(item => item.path === '/ssc/sql-import')).toBe(true)
    await router.push('/ssc/sql-import?raw=1#sql')
    expect(router.currentRoute.value.fullPath).toBe('/ssc/sql-import?raw=1#sql')
  })

  it('切换语言不扩大菜单权限，隐藏安全中心继续隐藏', async () => {
    access.permissions = new Set(['applet:acm'])
    const codes = () => getMenuGroups().flatMap(group => group.children.map(child => child.code))
    const original = codes()
    expect(original).toContain('acm')
    expect(original).not.toContain('ssc')
    await router.push('/ssc/param')
    expect(router.currentRoute.value.path).toBe('/home')
    await setLocale('en-US', { persist: false })
    expect(codes()).toEqual(original)
    expect(getMenuGroups().some(group => group.code === 'security-management')).toBe(false)
    await router.push('/ssc/param')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('跨模块仓库跳转仍校验独立仓库权限', async () => {
    access.permissions = new Set(['applet:vap'])
    await router.push('/patches/windowsYumRepo')
    expect(router.currentRoute.value.path).toBe('/home')
    await setLocale('en-US', { persist: false })
    await router.push('/software')
    expect(router.currentRoute.value.path).toBe('/home')
    access.permissions.add('applet:spm')
    await router.push('/software?raw=1#repos')
    expect(router.currentRoute.value.fullPath).toBe('/yum-repo/repos?raw=1#repos')
  })
})
