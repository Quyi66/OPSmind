/**
 * 权限路由守卫
 */

import { authService } from '@/core/auth'

export function setupPermissionGuard(router) {
  router.beforeEach(async (to, from, next) => {
    // 检查是否需要特定权限
    if (to.meta.requiresPermission) {
      const hasPermission = authService.hasPermission(to.meta.requiresPermission)
      
      if (!hasPermission) {
        console.log(`🚫 Permission denied: ${to.meta.requiresPermission}`)
        next('/error/403')
        return
      }
    }

    next()
  })
}
