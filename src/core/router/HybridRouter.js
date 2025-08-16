/**
 * 混合路由管理器
 * 智能分发 Vue 原生路由和 Angular iframe 路由
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import { hybridModuleManager, MODULE_TYPES } from '@/core/modules/HybridModuleManager.js'
import { authService } from '@/core/auth'

// 基础路由配置
const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - OpsMind',
      requiresGuest: true,
      layout: 'auth'
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'OpsMind 仪表盘',
      requiresAuth: true,
      moduleType: MODULE_TYPES.VUE_NATIVE
    }
  }
]

class HybridRouter {
  constructor() {
    this.router = null
    this.moduleRoutes = new Map()
    this.routeCache = new Map()
    this.init()
  }

  /**
   * 初始化路由器
   */
  init() {
    // 生成动态路由
    const dynamicRoutes = this.generateDynamicRoutes()
    const allRoutes = [...baseRoutes, ...dynamicRoutes]

    this.router = createRouter({
      history: createWebHashHistory(import.meta.env.BASE_URL),
      routes: allRoutes
    })

    this.setupGuards()
    this.setupModuleRoutes()
  }

  /**
   * 生成动态路由
   */
  generateDynamicRoutes() {
    const routes = []
    const modules = hybridModuleManager.getAvailableModules()

    modules.forEach(module => {
      if (module.type === MODULE_TYPES.VUE_NATIVE) {
        // Vue 原生模块路由
        routes.push(...this.createVueModuleRoutes(module))
      } else if (module.type === MODULE_TYPES.ANGULAR_IFRAME) {
        // Angular iframe 模块路由
        routes.push(...this.createAngularModuleRoutes(module))
      } else if (module.type === MODULE_TYPES.HYBRID) {
        // 混合模块路由
        routes.push(...this.createHybridModuleRoutes(module))
      }
    })

    return routes
  }

  /**
   * 创建 Vue 模块路由
   */
  createVueModuleRoutes(module) {
    const routes = []

    // 主路由
    routes.push({
      path: `/${module.code}`,
      name: `${module.code}-main`,
      component: module.component,
      meta: {
        title: module.name,
        requiresAuth: true,
        moduleType: MODULE_TYPES.VUE_NATIVE,
        moduleCode: module.code
      }
    })

    // 子路由 (如果有)
    if (module.routes && module.routes.length > 0) {
      module.routes.forEach(route => {
        if (route !== `/${module.code}`) {
          routes.push({
            path: route,
            name: `${module.code}-${route.split('/').pop()}`,
            component: module.component,
            meta: {
              title: `${module.name} - ${route}`,
              requiresAuth: true,
              moduleType: MODULE_TYPES.VUE_NATIVE,
              moduleCode: module.code,
              subRoute: route
            }
          })
        }
      })
    }

    return routes
  }

  /**
   * 创建 Angular 模块路由
   */
  createAngularModuleRoutes(module) {
    const routes = []

    // 主路由
    routes.push({
      path: `/${module.code}`,
      name: `${module.code}-main`,
      component: () => import('@/views/AngularModuleView.vue'),
      meta: {
        title: module.name,
        requiresAuth: true,
        moduleType: MODULE_TYPES.ANGULAR_IFRAME,
        moduleCode: module.code
      }
    })

    // 子路由通配符
    routes.push({
      path: `/${module.code}/:pathMatch(.*)*`,
      name: `${module.code}-sub`,
      component: () => import('@/views/AngularModuleView.vue'),
      meta: {
        title: module.name,
        requiresAuth: true,
        moduleType: MODULE_TYPES.ANGULAR_IFRAME,
        moduleCode: module.code,
        isSubRoute: true
      }
    })

    return routes
  }

  /**
   * 创建混合模块路由
   */
  createHybridModuleRoutes(module) {
    const routes = []

    // 根据功能开关决定使用 Vue 还是 Angular
    const migratedFeatures = module.metadata.migratedFeatures || []

    migratedFeatures.forEach(feature => {
      const featurePath = `/${module.code}/${feature.toLowerCase()}`
      routes.push({
        path: featurePath,
        name: `${module.code}-${feature}`,
        component: module.component, // Vue 组件
        meta: {
          title: `${module.name} - ${feature}`,
          requiresAuth: true,
          moduleType: MODULE_TYPES.VUE_NATIVE,
          moduleCode: module.code,
          feature: feature
        }
      })
    })

    // 其他功能仍使用 Angular
    routes.push({
      path: `/${module.code}/:pathMatch(.*)*`,
      name: `${module.code}-legacy`,
      component: () => import('@/views/AngularModuleView.vue'),
      meta: {
        title: module.name,
        requiresAuth: true,
        moduleType: MODULE_TYPES.ANGULAR_IFRAME,
        moduleCode: module.code,
        isLegacyFallback: true
      },
      beforeEnter: (to, from, next) => {
        // 检查是否有对应的 Vue 实现
        const feature = to.params.pathMatch?.[0]
        if (feature && migratedFeatures.includes(feature)) {
          // 重定向到 Vue 实现
          next(`/${module.code}/${feature}`)
        } else {
          next()
        }
      }
    })

    return routes
  }

  /**
   * 设置路由守卫
   */
  setupGuards() {
    // 全局前置守卫
    this.router.beforeEach(async (to, from, next) => {
      // 设置页面标题
      if (to.meta.title) {
        document.title = to.meta.title
      }

      // 认证检查
      const isAuthenticated = authService.isAuthenticated()

      if (to.meta.requiresAuth && !isAuthenticated) {
        console.log('🔒 Redirecting to login - authentication required')
        next('/login')
        return
      }

      if (to.meta.requiresGuest && isAuthenticated) {
        console.log('✅ Already authenticated, redirecting to home')
        next('/home')
        return
      }

      // 模块访问权限检查
      if (to.meta.moduleCode) {
        const hasPermission = await this.checkModulePermission(to.meta.moduleCode)
        if (!hasPermission) {
          console.log(`❌ No permission for module: ${to.meta.moduleCode}`)
          next('/home')
          return
        }
      }

      // 功能开关检查
      if (to.meta.feature) {
        const isEnabled = hybridModuleManager.isFeatureEnabled(
          to.meta.moduleCode,
          to.meta.feature
        )
        if (!isEnabled) {
          console.log(`🚩 Feature disabled: ${to.meta.moduleCode}.${to.meta.feature}`)
          // 重定向到模块主页
          next(`/${to.meta.moduleCode}`)
          return
        }
      }

      next()
    })

    // 全局后置钩子
    this.router.afterEach((to, from) => {
      // 记录路由跳转
      console.log(`🧭 Route changed: ${from.path} → ${to.path}`)

      // 发送路由变化事件
      this.emitRouteChange(to, from)
    })
  }

  /**
   * 设置模块路由映射
   */
  setupModuleRoutes() {
    const modules = hybridModuleManager.getAvailableModules()
    modules.forEach(module => {
      this.moduleRoutes.set(module.code, {
        type: module.type,
        routes: module.routes || [],
        component: module.component
      })
    })
  }

  /**
   * 检查模块访问权限
   */
  async checkModulePermission(moduleCode) {
    // 这里可以实现具体的权限检查逻辑
    // 例如检查用户角色、模块权限等
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return false

    // 简单示例：所有认证用户都有访问权限
    // 实际项目中应该根据具体的权限系统实现
    return true
  }

  /**
   * 发送路由变化事件
   */
  emitRouteChange(to, from) {
    // 可以用于统计、日志记录等
    const event = new CustomEvent('route-change', {
      detail: { to, from }
    })
    window.dispatchEvent(event)
  }

  /**
   * 获取路由器实例
   */
  getRouter() {
    return this.router
  }

  /**
   * 动态添加模块路由
   */
  addModuleRoutes(module) {
    let routes = []

    switch (module.type) {
      case MODULE_TYPES.VUE_NATIVE:
        routes = this.createVueModuleRoutes(module)
        break
      case MODULE_TYPES.ANGULAR_IFRAME:
        routes = this.createAngularModuleRoutes(module)
        break
      case MODULE_TYPES.HYBRID:
        routes = this.createHybridModuleRoutes(module)
        break
    }

    routes.forEach(route => {
      this.router.addRoute(route)
    })

    console.log(`🔄 Added routes for module: ${module.code}`)
  }

  /**
   * 移除模块路由
   */
  removeModuleRoutes(moduleCode) {
    // Vue Router 4 不直接支持移除路由，需要重新创建路由器
    // 或者使用路由守卫来阻止访问
    console.log(`🗑️ Module routes marked for removal: ${moduleCode}`)
  }
}

// 创建全局实例
export const hybridRouter = new HybridRouter()
export default hybridRouter.getRouter()
