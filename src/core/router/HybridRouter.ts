/**
 * 混合路由管理器 - TypeScript版本
 * 智能分发 Vue 原生路由和 Angular iframe 路由
 */

import { createRouter, createWebHashHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { hybridModuleManager, MODULE_TYPES } from '@/core/modules/HybridModuleManager.js'
import { authService } from '@/core/auth'
import type {
  CustomRouteRecord,
  ModuleRoute,
  HybridRouter as IHybridRouter
} from '@/types/router'
import { ModuleType } from '@/types/router'
import type { ModuleConfig } from '@/types/modules'

// 基础路由配置
const baseRoutes: CustomRouteRecord[] = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - OPSmind',
      requiresGuest: true,
      layout: 'auth'
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'OPSmind 仪表盘',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE
    }
  }
]

interface ModuleRouteInfo {
  type: ModuleType
  routes: string[]
  component?: any
}

class HybridRouter implements IHybridRouter {
  public router: Router
  private moduleRoutes: Map<string, ModuleRouteInfo>

  constructor() {
    this.moduleRoutes = new Map()
    this.router = this.createRouter()
    this.init()
  }

  /**
   * 创建路由器实例
   */
  private createRouter(): Router {
    return createRouter({
      history: createWebHashHistory(import.meta.env.BASE_URL),
      routes: []
    })
  }

  /**
   * 初始化路由器
   */
  private init(): void {
    // 生成动态路由
    const dynamicRoutes = this.generateDynamicRoutes()
    const allRoutes = [...baseRoutes, ...dynamicRoutes]

    // 添加所有路由
    allRoutes.forEach(route => {
      this.router.addRoute(route as RouteRecordRaw)
    })

    this.setupGuards()
    this.setupModuleRoutes()
  }

  /**
   * 生成动态路由
   */
  private generateDynamicRoutes(): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []
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
  private createVueModuleRoutes(module: ModuleConfig): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []

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
    if (module.meta?.routes && Array.isArray(module.meta.routes)) {
      module.meta.routes.forEach((route: string) => {
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
  private createAngularModuleRoutes(module: ModuleConfig): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []

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
  private createHybridModuleRoutes(module: ModuleConfig): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []

    // 根据功能开关决定使用 Vue 还是 Angular
    const migratedFeatures = module.meta?.migratedFeatures || []

    migratedFeatures.forEach((feature: string) => {
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
      beforeEnter: (to, _from, next) => {
        // 检查是否有对应的 Vue 实现
        const feature = Array.isArray(to.params.pathMatch) ? to.params.pathMatch[0] : to.params.pathMatch
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
  setupGuards(): void {
    // 全局前置守卫
    this.router.beforeEach(async (to, _from, next) => {
      // 固定页面标题
      document.title = 'OPSmind'

      // 认证检查
      const isAuthenticated = authService.isAuthenticated()

      if (to.meta?.requiresAuth && !isAuthenticated) {
        //console.log('🔒 Redirecting to login - authentication required')
        next('/login')
        return
      }

      if (to.meta?.requiresGuest && isAuthenticated) {
        //console.log('✅ Already authenticated, redirecting to home')
        next('/home')
        return
      }

      // 模块访问权限检查
      if (to.meta?.moduleCode) {
        const hasPermission = await this.checkModulePermission(to.meta.moduleCode as string)
        if (!hasPermission) {
          //console.log(`❌ No permission for module: ${to.meta.moduleCode}`)
          next('/home')
          return
        }
      }

      // 功能开关检查
      if (to.meta?.feature && to.meta?.moduleCode) {
        const isEnabled = hybridModuleManager.isFeatureEnabled(
          to.meta.moduleCode as string,
          to.meta.feature as string
        )
        if (!isEnabled) {
          //console.log(`🚩 Feature disabled: ${to.meta.moduleCode}.${to.meta.feature}`)
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
      //console.log(`🧭 Route changed: ${from.path} → ${to.path}`)

      // 发送路由变化事件
      this.emitRouteChange(to, from)
    })
  }

  /**
   * 设置模块路由映射
   */
  private setupModuleRoutes(): void {
    const modules = hybridModuleManager.getAvailableModules()
    modules.forEach(module => {
      this.moduleRoutes.set(module.code, {
        type: module.type,
        routes: module.meta?.routes || [],
        component: module.component
      })
    })
  }

  /**
   * 检查模块访问权限
   */
  async checkModulePermission(_moduleCode: string): Promise<boolean> {
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
  private emitRouteChange(to: any, from: any): void {
    // 可以用于统计、日志记录等
    const event = new CustomEvent('route-change', {
      detail: { to, from }
    })
    window.dispatchEvent(event)
  }

  /**
   * 获取路由器实例
   */
  getRouter(): Router {
    return this.router
  }

  /**
   * 动态添加模块路由
   */
  addModuleRoute(moduleRoute: ModuleRoute): void {
    // 简化处理，直接创建路由记录
    const routes: RouteRecordRaw[] = []

    // 主路由
    routes.push({
      path: moduleRoute.path,
      name: `${moduleRoute.code}-main`,
      component: (typeof moduleRoute.component === 'string')
        ? () => import('@/views/AngularModuleView.vue')
        : moduleRoute.component || (() => import('@/views/AngularModuleView.vue')),
      meta: {
        title: moduleRoute.name,
        requiresAuth: true,
        moduleCode: moduleRoute.code,
        ...moduleRoute.meta
      }
    })

    routes.forEach(route => {
      this.router.addRoute(route)
    })

    //console.log(`🔄 Added routes for module: ${moduleRoute.code}`)
  }

  /**
   * 移除模块路由
   */
  removeModuleRoute(moduleCode: string): void {
    // Vue Router 4 不直接支持移除路由，需要重新创建路由器
    // 或者使用路由守卫来阻止访问
    //console.log(`🗑️ Module routes marked for removal: ${moduleCode}`)
  }

  /**
   * 更新模块路由
   */
  updateModuleRoute(code: string, moduleRoute: Partial<ModuleRoute>): void {
    // 先移除旧路由，再添加新路由
    this.removeModuleRoute(code)
    if (moduleRoute.code) {
      this.addModuleRoute(moduleRoute as ModuleRoute)
    }
  }

  /**
   * 导航到模块
   */
  async navigateToModule(moduleCode: string, params?: Record<string, any>): Promise<void> {
    if (params) {
      await this.router.push({ name: `${moduleCode}-main`, params })
    } else {
      await this.router.push(`/${moduleCode}`)
    }
  }

  /**
   * 导航到Vue路由
   */
  async navigateToVueRoute(name: string, params?: Record<string, any>): Promise<void> {
    if (params) {
      await this.router.push({ name, params })
    } else {
      await this.router.push({ name })
    }
  }

  /**
   * 检查是否为模块路由
   */
  isModuleRoute(path: string): boolean {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) return false

    const moduleCode = segments[0]
    return this.moduleRoutes.has(moduleCode)
  }

  /**
   * 从路径获取模块信息
   */
  getModuleFromPath(path: string): ModuleRoute | null {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) return null

    const moduleCode = segments[0]
    const moduleInfo = this.moduleRoutes.get(moduleCode)

    if (!moduleInfo) return null

    return {
      code: moduleCode,
      name: moduleCode,
      path: `/${moduleCode}`,
      type: moduleInfo.type
    }
  }
}

// 创建全局实例
export const hybridRouter = new HybridRouter()
export default hybridRouter.getRouter()
