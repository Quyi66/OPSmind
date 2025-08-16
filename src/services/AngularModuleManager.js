/**
 * Angular 模块管理器
 * 统一管理所有Angular模块的iframe集成
 */

import {
  ANGULAR_MODULES_CONFIG,
  MODULE_CATEGORIES,
  getModuleUrl,
  getModuleConfig,
  getAllModules,
  getModulesByCategory,
  searchModules
} from '@/config/angular-modules.config.js'

export class AngularModuleManager {
  constructor() {
    this.isDev = import.meta.env.DEV
  }

  /**
   * 获取所有模块列表
   */
  getAllModules() {
    return getAllModules()
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
    return getModuleUrl(moduleCode, route, this.isDev)
  }

  /**
   * 获取模块的所有可用路由
   */
  getModuleRoutes(moduleCode) {
    const module = this.getModule(moduleCode)
    return module ? module.routes : {}
  }

  /**
   * 检查模块是否存在
   */
  hasModule(moduleCode) {
    return moduleCode in ANGULAR_MODULES_CONFIG
  }

  /**
   * 根据分类获取模块
   */
  getModulesByCategory() {
    return getModulesByCategory()
  }

  /**
   * 搜索模块
   */
  searchModules(keyword) {
    return searchModules(keyword)
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
