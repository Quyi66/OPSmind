/**
 * Angular 模块管理器
 * 统一管理所有Angular模块的iframe集成
 */

import {
  ANGULAR_MODULES_CONFIG,
  getModuleConfig,
  getAllModuleConfigs,
  getEnabledModuleConfigs,
  hasModule,
  getModuleDefaultRoute,
  getModuleRoutes,
  isModuleRoute,
  getModuleCodeByRoute,
  getModulePermissions
} from '@/config/angular-modules.config.ts'

export class AngularModuleManager {
  constructor() {
    this.isDev = import.meta.env.DEV
  }

  /**
   * 获取所有模块列表
   */
  getAllModules() {
    return getAllModuleConfigs()
  }

  /**
   * 根据代码获取模块配置
   */
  getModule(moduleCode) {
    return getModuleConfig(moduleCode)
  }

  /**
   * 获取模块的完整URL
   */
  getModuleUrl(moduleCode, route = null) {
    const module = getModuleConfig(moduleCode)
    if (!module) return null

    const baseUrl = this.isDev ? 'http://localhost:8080' : '/oplus/base'
    const targetRoute = route || module.defaultRoute
    return `${baseUrl}${targetRoute}`
  }

  /**
   * 获取模块的所有可用路由
   */
  getModuleRoutes(moduleCode) {
    return getModuleRoutes(moduleCode) || {}
  }

  /**
   * 检查模块是否存在
   */
  hasModule(moduleCode) {
    return hasModule(moduleCode)
  }

  /**
   * 根据分类获取模块
   */
  getModulesByCategory() {
    // 简化实现，返回所有启用的模块
    return { all: getEnabledModuleConfigs() }
  }

  /**
   * 搜索模块
   */
  searchModules(keyword) {
    const modules = getAllModuleConfigs()
    return modules.filter(module =>
      module.name.toLowerCase().includes(keyword.toLowerCase()) ||
      module.title.toLowerCase().includes(keyword.toLowerCase()) ||
      module.description.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  /**
   * 获取模块统计信息
   */
  getModuleStats() {
    const modules = this.getAllModules()
    const categories = this.getModulesByCategory()
    return {
      total: modules.length,
      categories: Object.keys(categories).length,
      features: modules.reduce((total, module) => total + module.features.length, 0)
    }
  }
}

// 创建单例实例
export const angularModuleManager = new AngularModuleManager()
