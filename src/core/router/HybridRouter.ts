/**
 * 混合路由管理器 - TypeScript版本
 * 智能分发 Vue 原生路由
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
  },
  // 命令模块 - 使用 pathMatch 通配符支持子路径导航
  {
    path: '/cmd/:pathMatch(.*)*',
    name: 'cmd',
    component: () => import('@/modules/automation/views/CommandCenterModule.vue'),
    meta: {
      title: '命令管理',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE,
      moduleCode: 'cmd'
    }
  },
  // 作业模块 - 使用 pathMatch 通配符支持子路径导航
  {
    path: '/jao/:pathMatch(.*)*',
    name: 'jao',
    component: () => import('@/modules/automation/views/JobOrchestrationModule.vue'),
    meta: {
      title: '作业编排',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE,
      moduleCode: 'jao'
    }
  },
  // 脚本模块 - 使用 pathMatch 通配符支持子路径导航
  {
    path: '/gfs/:pathMatch(.*)*',
    name: 'gfs',
    component: () => import('@/modules/automation/views/ScriptLibraryModule.vue'),
    meta: {
      title: '文件服务',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE,
      moduleCode: 'gfs'
    }
  },
  // 补丁模块 - 使用 pathMatch 通配符支持子路径导航
  {
    path: '/patches/:pathMatch(.*)*',
    name: 'patches',
    component: () => import('@/modules/patches/views/PatchManagementModule.vue'),
    meta: {
      title: '补丁管理',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE,
      moduleCode: 'patches'
    }
  },
  // 软件模块 - 使用 pathMatch 通配符支持子路径导航
  {
    path: '/software/:pathMatch(.*)*',
    name: 'software',
    component: () => import('@/modules/software/views/SoftwareIndex.vue'),
    meta: {
      title: '软件管理',
      requiresAuth: true,
      moduleType: ModuleType.VUE_NATIVE,
      moduleCode: 'software'
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
      routes: baseRoutes as RouteRecordRaw[]
    })
  }

  /**
   * 初始化路由器
   */
  private init(): void {
    // 生成动态路由（baseRoutes 已在 createRouter 时包含）
    const dynamicRoutes = this.generateDynamicRoutes()

    // 只添加动态生成的路由
    dynamicRoutes.forEach(route => {
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

    // cmd、jao、gfs、patches、software 模块已在 baseRoutes 中静态定义，跳过动态生成
    if (['cmd', 'jao', 'gfs', 'patches', 'software'].includes(module.code)) {
      return routes
    }

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
   * 创建混合模块路由
   */
  private createHybridModuleRoutes(module: ModuleConfig): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []

    // 根据功能开关决定使用哪个组件
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
        next('/login')
        return
      }

      if (to.meta?.requiresGuest && isAuthenticated) {
        next('/home')
        return
      }

      // 模块访问权限检查
      if (to.meta?.moduleCode) {
        const hasPermission = await this.checkModulePermission(to.meta.moduleCode as string)
        if (!hasPermission) {
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
          // 重定向到模块主页
          next(`/${to.meta.moduleCode}`)
          return
        }
      }

      next()
    })

    // 全局后置钩子
    this.router.afterEach((to, from) => {
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
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return false
    return true
  }

  /**
   * 发送路由变化事件
   */
  private emitRouteChange(to: any, from: any): void {
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
    const routes: RouteRecordRaw[] = []

    // Ensure component is always a function, not a string
    const componentLoader = typeof moduleRoute.component === 'function'
      ? moduleRoute.component
      : () => import('@/views/ModulePage.vue')

    routes.push({
      path: moduleRoute.path,
      name: `${moduleRoute.code}-main`,
      component: componentLoader,
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
  }

  /**
   * 移除模块路由
   */
  removeModuleRoute(moduleCode: string): void {
    // Vue Router 4 不直接支持移除路由
    console.log(`Module routes marked for removal: ${moduleCode}`)
  }

  /**
   * 更新模块路由
   */
  updateModuleRoute(code: string, moduleRoute: Partial<ModuleRoute>): void {
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
