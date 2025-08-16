/**
 * 路由设置入口
 * 整合混合路由管理器和传统路由
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import { hybridModuleManager } from '@/core/modules/HybridModuleManager.js'
import { authService } from '@/core/auth'
import { FeatureFlagEvaluator } from '@/config/feature-flags.config.js'

// 导入路由配置
import { baseRoutes } from './routes/base.js'
import { moduleRoutes } from './routes/modules.js'
import { testRoutes } from './routes/test.js'

// 路由守卫
import { setupAuthGuard } from './guards/auth.js'
import { setupPermissionGuard } from './guards/permission.js'
import { setupFeatureFlagGuard } from './guards/feature-flag.js'

/**
 * 设置路由器
 */
export function setupRouter() {
  // 合并所有路由
  const routes = [
    ...baseRoutes,
    ...moduleRoutes,
    ...(import.meta.env.DEV ? testRoutes : [])
  ]

  // 创建路由器
  const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      } else {
        return { top: 0 }
      }
    }
  })

  // 设置路由守卫
  setupAuthGuard(router)
  setupPermissionGuard(router)
  setupFeatureFlagGuard(router)

  // 全局前置守卫
  router.beforeEach(async (to, from, next) => {
    // 设置页面标题
    if (to.meta.title) {
      document.title = to.meta.title
    }

    // 记录路由跳转
    console.log(`🧭 Route: ${from.path} → ${to.path}`)

    next()
  })

  // 全局后置钩子
  router.afterEach((to, from) => {
    // 发送路由变化事件
    const event = new CustomEvent('route-change', {
      detail: { to, from }
    })
    window.dispatchEvent(event)
  })

  return router
}

/**
 * 动态添加模块路由
 */
export function addModuleRoute(moduleConfig) {
  const router = getCurrentRouter()
  if (!router) return

  // 根据模块类型生成路由
  const routes = generateModuleRoutes(moduleConfig)
  routes.forEach(route => {
    router.addRoute(route)
  })

  console.log(`📍 Added routes for module: ${moduleConfig.code}`)
}

/**
 * 生成模块路由
 */
function generateModuleRoutes(moduleConfig) {
  const routes = []
  const { code, name, type, component } = moduleConfig

  // 主路由
  routes.push({
    path: `/${code}`,
    name: `${code}-main`,
    component: component || (() => import('@/views/AngularModuleView.vue')),
    meta: {
      title: name,
      requiresAuth: true,
      moduleCode: code,
      moduleType: type
    }
  })

  // 子路由通配符
  routes.push({
    path: `/${code}/:pathMatch(.*)*`,
    name: `${code}-sub`,
    component: component || (() => import('@/views/AngularModuleView.vue')),
    meta: {
      title: name,
      requiresAuth: true,
      moduleCode: code,
      moduleType: type,
      isSubRoute: true
    }
  })

  return routes
}

/**
 * 获取当前路由器实例
 */
function getCurrentRouter() {
  // 这里需要从应用实例中获取路由器
  // 实际实现可能需要调整
  return window.__VUE_ROUTER__
}
