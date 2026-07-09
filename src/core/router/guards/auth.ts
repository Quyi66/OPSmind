/**
 * 认证路由守卫 - TypeScript版本
 */

import type { Router } from 'vue-router'
import { authService } from '@/core/auth'
import { LOGIN_REDIRECT_URL } from '@/config/route-paths'

export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to, from) => {
    // 如果是从登录页面跳转到主页面，延迟一下确保认证状态已更新
    if (from.path === '/login' && to.path === '/home') {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const isAuthenticated = authService.isAuthenticated()

    // 需要认证但未登录
    if (to.meta?.requiresAuth && !isAuthenticated) {
      return '/login'
    }

    // 已登录用户访问登录页
    if (to.meta?.requiresGuest && isAuthenticated) {
      return '/home'
    }
  })
}
