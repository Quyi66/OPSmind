/**
 * 认证路由守卫 - TypeScript版本
 */

import type { Router } from 'vue-router'
import { authService } from '@/core/auth'

export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to, from, next) => {
    // 如果是从登录页面跳转到主页面，延迟一下确保认证状态已更新
    if (from.path === '/login' && to.path === '/home') {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const isAuthenticated = authService.isAuthenticated()
    const currentUser = authService.getCurrentUser()

    console.log('🛡️ Auth Guard:', {
      from: from.path,
      to: to.path,
      isAuthenticated,
      hasUser: !!currentUser,
      userLogin: currentUser?.login,
      requiresAuth: to.meta?.requiresAuth,
      requiresGuest: to.meta?.requiresGuest
    })

    // 需要认证但未登录
    if (to.meta?.requiresAuth && !isAuthenticated) {
      console.log('🔒 Redirecting to login - authentication required')
      next('/login')
      return
    }

    // 已登录用户访问登录页
    if (to.meta?.requiresGuest && isAuthenticated) {
      console.log('✅ Already authenticated, redirecting to home')
      next('/home')
      return
    }

    next()
  })
}
