/**
 * 路由相关类型定义
 */

import type { RouteRecordRaw, Router } from 'vue-router'

export interface RouteMetaCustom {
  title?: string
  requiresAuth?: boolean
  requiresGuest?: boolean
  requiresPermission?: string
  moduleCode?: string
  moduleType?: ModuleType
  layout?: string
  icon?: string
  hidden?: boolean
  keepAlive?: boolean
}

export interface CustomRouteRecord extends Omit<RouteRecordRaw, 'meta'> {
  meta?: RouteMetaCustom
}

export enum ModuleType {
  VUE_NATIVE = 'vue-native',
  LEGACY_ANGULAR = 'legacy-angular',
  ANGULAR_IFRAME = 'angular-iframe',
  EXTERNAL_LINK = 'external-link',
  HYBRID = 'hybrid'
}

export interface ModuleRoute {
  code: string
  name: string
  path: string
  type: ModuleType
  component?: string
  url?: string
  icon?: string
  permissions?: string[]
  meta?: RouteMetaCustom
}

export interface HybridRouterConfig {
  baseRoutes: CustomRouteRecord[]
  moduleRoutes: ModuleRoute[]
  fallbackRoute?: CustomRouteRecord
}

export interface NavigationGuard {
  (to: any, from: any, next: Function): void | Promise<void>
}

export interface HybridRouter {
  router: Router

  // 路由管理
  addModuleRoute(moduleRoute: ModuleRoute): void
  removeModuleRoute(code: string): void
  updateModuleRoute(code: string, moduleRoute: Partial<ModuleRoute>): void

  // 导航方法
  navigateToModule(moduleCode: string, params?: Record<string, any>): Promise<void>
  navigateToVueRoute(name: string, params?: Record<string, any>): Promise<void>

  // 权限检查
  checkModulePermission(moduleCode: string): Promise<boolean>

  // 守卫设置
  setupGuards(): void

  // 工具方法
  isModuleRoute(path: string): boolean
  getModuleFromPath(path: string): ModuleRoute | null
}
