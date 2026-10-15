import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { baseRoutes } from '@/core/router/routes/base'
import { getModuleNav } from '@/config/module-nav.config'
import { sscModule } from '@/modules/settings'
import { SSC_DEFAULT_ROUTE } from '@/modules/settings/navigation'

vi.mock('@/core/auth', () => ({ authService: { hasPermission: () => true } }))
vi.mock('@/layouts/MainLayout.vue', () => ({ default: { template: '<router-view />' } }))
vi.mock('@/layouts/groups/SettingsGroupLayout.vue', () => ({
  default: { template: '<router-view />' }
}))
vi.mock('@/modules/settings/views/SystemSettingsModule.vue', () => ({
  default: { template: '<router-view />' }
}))
vi.mock('@/modules/settings/views/SscParamPage.vue', () => ({
  default: { template: '<div>参数配置</div>' }
}))

describe('系统设置淘汰应用管理入口', () => {
  it('菜单保留其余设置项，默认进入参数配置，模块权限沿用原值', () => {
    expect(getModuleNav('ssc').map(item => item.path)).toEqual([
      '/ssc/param',
      '/ssc/sql-import',
      '/ssc/email',
      '/ssc/engine',
      '/ssc/scheduler'
    ])
    expect(sscModule.defaultRoute).toBe(SSC_DEFAULT_ROUTE)
    expect(sscModule.permissions).toEqual(['applet:uim'])
  })

  it.each(['applet', 'tag', 'appres'])('旧地址 /ssc/%s 和旧路由名跳到参数配置', async page => {
    const router = createRouter({ history: createMemoryHistory(), routes: baseRoutes })
    await router.push(`/ssc/${page}?from=bookmark`)
    expect(router.currentRoute.value.path).toBe('/ssc/param')
    expect(router.currentRoute.value.meta.title).toBe('参数配置')
    await router.push({ name: `ssc-${page}` })
    expect(router.currentRoute.value.path).toBe('/ssc/param')
    const retired = router.getRoutes().find(route => route.name === `ssc-${page}`)
    expect(retired.redirect).toBe(SSC_DEFAULT_ROUTE)
    expect(retired.components).toBeUndefined()
  })

  it('系统设置根路径不会再进入已淘汰页面', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: baseRoutes })
    await router.push('/ssc')
    expect(router.currentRoute.value.path).toBe('/ssc/param')
  })
})
