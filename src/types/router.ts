/**
 * 路由相关类型定义
 */

import type { RouteRecordRaw } from 'vue-router'

/**
 * 自定义路由元信息
 */
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

/**
 * 自定义路由记录
 */
export interface CustomRouteRecord extends Omit<RouteRecordRaw, 'meta'> {
  meta?: RouteMetaCustom
}

/**
 * 模块类型枚举
 */
export enum ModuleType {
  VUE_NATIVE = 'vue-native',
  EXTERNAL_LINK = 'external-link',
  HYBRID = 'hybrid'
}

/**
 * 模块路由配置
 */
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

/**
 * 导航守卫类型
 */
export interface NavigationGuard {
  (to: any, from: any, next: Function): void | Promise<void>
}
