/**
 * 混合模块管理器
 * 统一管理 Vue 原生模块
 */

import { ref, reactive, computed } from 'vue'

// 模块类型
export const MODULE_TYPES = {
  VUE_NATIVE: 'vue-native',      // Vue 3 原生模块
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
    // 注册 Vue 模块
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
    }
  }

  /**
   * 设置功能开关
   */
  setFeatureFlag(moduleCode, feature, enabled) {
    const key = `${moduleCode}.${feature}`
    this.featureFlags.set(key, enabled)
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
   * 获取模块统计
   */
  getStats() {
    const modules = Array.from(this.modules.values())
    return {
      total: modules.length,
      vue: modules.filter(m => m.type === MODULE_TYPES.VUE_NATIVE).length,
      hybrid: modules.filter(m => m.type === MODULE_TYPES.HYBRID).length
    }
  }
}

// 创建全局实例
export const hybridModuleManager = new HybridModuleManager()

// 导出 Composition API
export const useHybridModules = () => {
  return {
    modules: computed(() => hybridModuleManager.getAvailableModules()),
    vueModules: computed(() => hybridModuleManager.getModulesByType(MODULE_TYPES.VUE_NATIVE)),
    hybridModules: computed(() => hybridModuleManager.getModulesByType(MODULE_TYPES.HYBRID)),
    stats: computed(() => hybridModuleManager.getStats()),

    // 方法
    getModule: hybridModuleManager.getModule.bind(hybridModuleManager),
    setFeatureFlag: hybridModuleManager.setFeatureFlag.bind(hybridModuleManager),
    isFeatureEnabled: hybridModuleManager.isFeatureEnabled.bind(hybridModuleManager),
    markAsHybrid: hybridModuleManager.markAsHybrid.bind(hybridModuleManager)
  }
}
