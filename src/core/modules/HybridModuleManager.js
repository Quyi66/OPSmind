/**
 * 混合模块管理器
 * 统一管理 Vue 原生模块和 Angular iframe 模块
 */

import { ref, reactive, computed } from 'vue'
import { ANGULAR_MODULES_CONFIG } from '@/config/angular-modules.config.js'

// 模块类型
export const MODULE_TYPES = {
  VUE_NATIVE: 'vue-native',      // Vue 3 原生模块
  ANGULAR_IFRAME: 'angular-iframe', // Angular iframe 模块
  HYBRID: 'hybrid'               // 混合模块 (部分功能已迁移)
}

// 模块状态
export const MODULE_STATUS = {
  AVAILABLE: 'available',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  MIGRATING: 'migrating',       // 迁移中
  DEPRECATED: 'deprecated'       // 已弃用
}

class HybridModuleManager {
  constructor() {
    this.modules = reactive(new Map())
    this.loadingModules = ref(new Set())
    this.migrationConfig = reactive(new Map()) // 迁移配置
    this.featureFlags = reactive(new Map())    // 功能开关
    
    this.initializeModules()
  }

  /**
   * 初始化模块配置
   */
  initializeModules() {
    // 注册现有的 Angular 模块
    Object.values(ANGULAR_MODULES_CONFIG).forEach(config => {
      this.registerModule({
        ...config,
        type: MODULE_TYPES.ANGULAR_IFRAME,
        status: MODULE_STATUS.AVAILABLE,
        component: () => import('@/components/angular/modules/AngularModuleFrame.vue'),
        metadata: {
          isLegacy: true,
          migrationPriority: this.getMigrationPriority(config.code),
          estimatedMigrationEffort: this.getEstimatedEffort(config.code)
        }
      })
    })

    // 注册已迁移的 Vue 模块 (示例)
    this.registerVueModule({
      code: 'dashboard',
      name: '仪表盘',
      type: MODULE_TYPES.VUE_NATIVE,
      component: () => import('@/views/Dashboard.vue'),
      routes: ['/home', '/dashboard'],
      features: ['数据概览', '快速操作', '系统状态']
    })
  }

  /**
   * 注册模块
   */
  registerModule(moduleConfig) {
    const {
      code,
      name,
      type,
      component,
      routes = [],
      features = [],
      metadata = {},
      ...rest
    } = moduleConfig

    const module = {
      code,
      name,
      type,
      component,
      routes,
      features,
      metadata,
      status: MODULE_STATUS.AVAILABLE,
      registeredAt: new Date(),
      ...rest
    }

    this.modules.set(code, module)
    console.log(`📦 Module registered: ${code} (${type})`)
    return module
  }

  /**
   * 注册 Vue 原生模块
   */
  registerVueModule(config) {
    return this.registerModule({
      ...config,
      type: MODULE_TYPES.VUE_NATIVE,
      metadata: {
        ...config.metadata,
        isModern: true,
        framework: 'Vue 3'
      }
    })
  }

  /**
   * 标记模块为混合模式 (部分功能已迁移)
   */
  markAsHybrid(moduleCode, migratedFeatures = []) {
    const module = this.modules.get(moduleCode)
    if (module) {
      module.type = MODULE_TYPES.HYBRID
      module.metadata.migratedFeatures = migratedFeatures
      module.metadata.remainingFeatures = module.features.filter(
        f => !migratedFeatures.includes(f)
      )
      console.log(`🔄 Module marked as hybrid: ${moduleCode}`)
    }
  }

  /**
   * 设置功能开关
   */
  setFeatureFlag(moduleCode, feature, enabled) {
    const key = `${moduleCode}.${feature}`
    this.featureFlags.set(key, enabled)
    console.log(`🚩 Feature flag set: ${key} = ${enabled}`)
  }

  /**
   * 检查功能是否启用
   */
  isFeatureEnabled(moduleCode, feature) {
    const key = `${moduleCode}.${feature}`
    return this.featureFlags.get(key) ?? true // 默认启用
  }

  /**
   * 获取模块
   */
  getModule(code) {
    return this.modules.get(code)
  }

  /**
   * 获取可用模块列表
   */
  getAvailableModules() {
    return Array.from(this.modules.values()).filter(
      module => module.status !== MODULE_STATUS.DEPRECATED
    )
  }

  /**
   * 按类型获取模块
   */
  getModulesByType(type) {
    return Array.from(this.modules.values()).filter(
      module => module.type === type
    )
  }

  /**
   * 获取迁移统计
   */
  getMigrationStats() {
    const modules = Array.from(this.modules.values())
    return {
      total: modules.length,
      vue: modules.filter(m => m.type === MODULE_TYPES.VUE_NATIVE).length,
      angular: modules.filter(m => m.type === MODULE_TYPES.ANGULAR_IFRAME).length,
      hybrid: modules.filter(m => m.type === MODULE_TYPES.HYBRID).length,
      migrationProgress: this.calculateMigrationProgress()
    }
  }

  /**
   * 计算迁移进度
   */
  calculateMigrationProgress() {
    const modules = Array.from(this.modules.values())
    const totalModules = modules.length
    const migratedModules = modules.filter(
      m => m.type === MODULE_TYPES.VUE_NATIVE
    ).length
    const hybridModules = modules.filter(
      m => m.type === MODULE_TYPES.HYBRID
    ).length

    return {
      percentage: Math.round(((migratedModules + hybridModules * 0.5) / totalModules) * 100),
      completed: migratedModules,
      inProgress: hybridModules,
      remaining: totalModules - migratedModules - hybridModules
    }
  }

  /**
   * 获取迁移优先级
   */
  getMigrationPriority(moduleCode) {
    const priorities = {
      'cac': 'high',      // 配置管理 - 高频使用
      'dashboard': 'high', // 仪表盘 - 入口页面
      'jao': 'medium',    // 作业编排 - 中等复杂度
      'gfs': 'medium',    // 脚本管理 - 中等复杂度
      'dts': 'low',       // 数据传输 - 低频使用
      'udp': 'low'        // 开发平台 - 复杂度高
    }
    return priorities[moduleCode] || 'low'
  }

  /**
   * 获取预估迁移工作量
   */
  getEstimatedEffort(moduleCode) {
    const efforts = {
      'cac': '4-6周',
      'dashboard': '2-3周',
      'jao': '6-8周',
      'gfs': '3-4周',
      'dts': '5-7周',
      'udp': '8-12周'
    }
    return efforts[moduleCode] || '待评估'
  }

  /**
   * 获取推荐的迁移路径
   */
  getRecommendedMigrationPath() {
    const modules = Array.from(this.modules.values())
      .filter(m => m.type === MODULE_TYPES.ANGULAR_IFRAME)
      .map(m => ({
        code: m.code,
        name: m.name,
        priority: m.metadata.migrationPriority,
        effort: m.metadata.estimatedMigrationEffort,
        features: m.features.length
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

    return modules
  }
}

// 创建全局实例
export const hybridModuleManager = new HybridModuleManager()

// 导出 Composition API
export const useHybridModules = () => {
  return {
    modules: computed(() => hybridModuleManager.getAvailableModules()),
    vueModules: computed(() => hybridModuleManager.getModulesByType(MODULE_TYPES.VUE_NATIVE)),
    angularModules: computed(() => hybridModuleManager.getModulesByType(MODULE_TYPES.ANGULAR_IFRAME)),
    hybridModules: computed(() => hybridModuleManager.getModulesByType(MODULE_TYPES.HYBRID)),
    migrationStats: computed(() => hybridModuleManager.getMigrationStats()),
    recommendedPath: computed(() => hybridModuleManager.getRecommendedMigrationPath()),
    
    // 方法
    getModule: hybridModuleManager.getModule.bind(hybridModuleManager),
    setFeatureFlag: hybridModuleManager.setFeatureFlag.bind(hybridModuleManager),
    isFeatureEnabled: hybridModuleManager.isFeatureEnabled.bind(hybridModuleManager),
    markAsHybrid: hybridModuleManager.markAsHybrid.bind(hybridModuleManager)
  }
}
