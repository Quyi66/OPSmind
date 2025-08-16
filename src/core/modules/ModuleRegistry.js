/**
 * 现代化模块注册表
 * 支持 Vue 原生模块和 Legacy Angular 模块的统一管理
 */

import { ref, reactive, computed } from 'vue'

// 模块类型枚举
export const MODULE_TYPES = {
  VUE_NATIVE: 'vue-native',     // Vue 3 原生模块
  VUE_COMPONENT: 'vue-component', // Vue 组件模块
  LEGACY_ANGULAR: 'legacy-angular', // 遗留 Angular 模块
  MICRO_FRONTEND: 'micro-frontend'  // 微前端模块
}

// 模块状态枚举
export const MODULE_STATUS = {
  AVAILABLE: 'available',       // 可用
  LOADING: 'loading',          // 加载中
  LOADED: 'loaded',            // 已加载
  ERROR: 'error',              // 错误
  DEPRECATED: 'deprecated',     // 已弃用
  MIGRATING: 'migrating'       // 迁移中
}

class ModuleRegistry {
  constructor() {
    this.modules = reactive(new Map())
    this.loadingModules = ref(new Set())
    this.errorModules = ref(new Map())
  }

  /**
   * 注册模块
   */
  register(moduleConfig) {
    const {
      code,
      name,
      type = MODULE_TYPES.VUE_NATIVE,
      version = '1.0.0',
      component = null,
      loadFunction = null,
      routes = [],
      permissions = [],
      dependencies = [],
      metadata = {}
    } = moduleConfig

    if (!code || !name) {
      throw new Error('Module code and name are required')
    }

    const module = {
      code,
      name,
      type,
      version,
      component,
      loadFunction,
      routes,
      permissions,
      dependencies,
      metadata,
      status: MODULE_STATUS.AVAILABLE,
      loadedAt: null,
      instance: null,
      ...moduleConfig
    }

    this.modules.set(code, module)
    console.log(`📦 Module registered: ${code} (${type})`)
    return module
  }

  /**
   * 获取模块
   */
  getModule(code) {
    return this.modules.get(code)
  }

  /**
   * 获取所有模块
   */
  getAllModules() {
    return Array.from(this.modules.values())
  }

  /**
   * 按类型获取模块
   */
  getModulesByType(type) {
    return this.getAllModules().filter(module => module.type === type)
  }

  /**
   * 获取可用模块
   */
  getAvailableModules() {
    return this.getAllModules().filter(module => 
      module.status === MODULE_STATUS.AVAILABLE || 
      module.status === MODULE_STATUS.LOADED
    )
  }

  /**
   * 动态加载模块
   */
  async loadModule(code) {
    const module = this.getModule(code)
    if (!module) {
      throw new Error(`Module not found: ${code}`)
    }

    if (module.status === MODULE_STATUS.LOADED) {
      return module.instance
    }

    if (this.loadingModules.value.has(code)) {
      // 等待正在加载的模块
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          const currentModule = this.getModule(code)
          if (currentModule.status === MODULE_STATUS.LOADED) {
            resolve(currentModule.instance)
          } else if (currentModule.status === MODULE_STATUS.ERROR) {
            reject(new Error(`Failed to load module: ${code}`))
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }

    this.loadingModules.value.add(code)
    module.status = MODULE_STATUS.LOADING

    try {
      let instance = null

      switch (module.type) {
        case MODULE_TYPES.VUE_NATIVE:
        case MODULE_TYPES.VUE_COMPONENT:
          instance = await this.loadVueModule(module)
          break
        case MODULE_TYPES.LEGACY_ANGULAR:
          instance = await this.loadLegacyModule(module)
          break
        case MODULE_TYPES.MICRO_FRONTEND:
          instance = await this.loadMicroFrontend(module)
          break
        default:
          throw new Error(`Unsupported module type: ${module.type}`)
      }

      module.instance = instance
      module.status = MODULE_STATUS.LOADED
      module.loadedAt = new Date()

      console.log(`✅ Module loaded: ${code}`)
      return instance

    } catch (error) {
      module.status = MODULE_STATUS.ERROR
      this.errorModules.value.set(code, error.message)
      console.error(`❌ Failed to load module ${code}:`, error)
      throw error
    } finally {
      this.loadingModules.value.delete(code)
    }
  }

  /**
   * 加载 Vue 模块
   */
  async loadVueModule(module) {
    if (module.component) {
      return module.component
    }

    if (module.loadFunction) {
      return await module.loadFunction()
    }

    throw new Error(`No component or load function provided for Vue module: ${module.code}`)
  }

  /**
   * 加载遗留 Angular 模块
   */
  async loadLegacyModule(module) {
    // 返回 iframe 容器组件
    const { default: AngularModuleFrame } = await import('@/components/modules/AngularModuleFrame.vue')
    return AngularModuleFrame
  }

  /**
   * 加载微前端模块
   */
  async loadMicroFrontend(module) {
    // 使用 Module Federation 或其他微前端技术
    if (module.remoteEntry) {
      // 动态加载远程模块
      const container = await import(module.remoteEntry)
      return container[module.exposedModule || 'default']
    }
    throw new Error(`No remote entry provided for micro frontend: ${module.code}`)
  }

  /**
   * 卸载模块
   */
  unloadModule(code) {
    const module = this.getModule(code)
    if (module) {
      module.status = MODULE_STATUS.AVAILABLE
      module.instance = null
      module.loadedAt = null
      console.log(`🗑️ Module unloaded: ${code}`)
    }
  }

  /**
   * 检查模块依赖
   */
  checkDependencies(code) {
    const module = this.getModule(code)
    if (!module || !module.dependencies.length) {
      return { satisfied: true, missing: [] }
    }

    const missing = module.dependencies.filter(dep => !this.modules.has(dep))
    return {
      satisfied: missing.length === 0,
      missing
    }
  }

  /**
   * 获取模块统计信息
   */
  getStats() {
    const modules = this.getAllModules()
    const stats = {
      total: modules.length,
      byType: {},
      byStatus: {},
      loaded: 0,
      errors: this.errorModules.value.size
    }

    modules.forEach(module => {
      stats.byType[module.type] = (stats.byType[module.type] || 0) + 1
      stats.byStatus[module.status] = (stats.byStatus[module.status] || 0) + 1
      if (module.status === MODULE_STATUS.LOADED) {
        stats.loaded++
      }
    })

    return stats
  }
}

// 创建全局实例
export const moduleRegistry = new ModuleRegistry()

// 导出计算属性
export const useModuleRegistry = () => {
  return {
    modules: computed(() => moduleRegistry.getAllModules()),
    availableModules: computed(() => moduleRegistry.getAvailableModules()),
    vueModules: computed(() => moduleRegistry.getModulesByType(MODULE_TYPES.VUE_NATIVE)),
    legacyModules: computed(() => moduleRegistry.getModulesByType(MODULE_TYPES.LEGACY_ANGULAR)),
    loadingModules: moduleRegistry.loadingModules,
    errorModules: moduleRegistry.errorModules,
    stats: computed(() => moduleRegistry.getStats())
  }
}
