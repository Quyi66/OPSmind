import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { PATCHES_ROUTE_DEFS } from '@/modules/patches/routes'
import { patchesModule } from '@/modules/patches'

function routerForPatches() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/patches',
        children: PATCHES_ROUTE_DEFS.map(def => ({
          path: def.path,
          name: def.name,
          redirect: def.redirect,
          component: def.component ? { template: '<div />' } : undefined,
          meta: { menuCode: def.menuCode || 'patches' }
        }))
      }
    ]
  })
}

describe('Linux 安装入口归并', () => {
  it('移除重复菜单，主机概览仍为默认入口，其他安装回滚菜单保留', () => {
    const items = patchesModule.navItems.flatMap(item => [item, ...(item.children || [])])
    expect(items.some(item => item.key === 'patchInstall')).toBe(false)
    expect(items.some(item => item.key === 'machineScan')).toBe(true)
    expect(items.some(item => item.key === 'changeRollback')).toBe(true)
    expect(items.some(item => item.key === 'installTasks')).toBe(true)
    expect(patchesModule.defaultRoute).toBe('/patches/machineScan')
  })

  it('旧地址保留按补丁查询及 hash，重定向后权限码不变', async () => {
    const router = routerForPatches()
    await router.push('/patches/patchInstall?tab=patch&keyword=original#anchor')
    expect(router.currentRoute.value.name).toBe('patches-machineScan')
    expect(router.currentRoute.value.query).toEqual({ tab: 'patch', keyword: 'original' })
    expect(router.currentRoute.value.hash).toBe('#anchor')
    expect(router.currentRoute.value.meta.menuCode).toBe('patches')
  })

  it('旧路由名及无参数书签仍可打开，不保留独立安装组件', async () => {
    const router = routerForPatches()
    await router.push({ name: 'patches-patchInstall', query: { tab: 'host' } })
    expect(router.currentRoute.value.fullPath).toBe('/patches/machineScan?tab=host')
    await router.push('/patches/patchInstall')
    expect(router.currentRoute.value.fullPath).toBe('/patches/machineScan')
    expect(PATCHES_ROUTE_DEFS.find(def => def.key === 'patchInstall').component).toBeUndefined()
  })
})
