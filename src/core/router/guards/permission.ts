/**
 * 权限路由守卫 - TypeScript版本
 */

import type { Router } from 'vue-router'
import { authService } from '@/core/auth'

export function setupPermissionGuard(router: Router): void {
  router.beforeEach(async (to, _from, next) => {
    // 检查是否需要特定权限
    if (to.meta?.requiresPermission) {
      const hasPermission = authService.hasPermission(to.meta.requiresPermission as string)

      if (!hasPermission) {
        next('/error/403')
        return
      }
    }

    next()
  })
}
