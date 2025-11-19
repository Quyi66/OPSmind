/**
 * 现代化模块注册表 - TypeScript版本
 * 支持 Vue 原生模块和 Legacy Angular 模块的统一管理
 */

import { ref, reactive, computed, type Ref } from 'vue'
import {
  MODULE_TYPES,
  MODULE_STATUS,
  type ModuleConfig,
  type ModuleInstance,
  type ModuleRegistry as IModuleRegistry
} from '@/types/modules'

interface ModuleRegistryState {
  modules: Map<string, ModuleInstance>
  loadingModules: Set<string>
  errorModules: Map<string, string>
}

class ModuleRegistry implements IModuleRegistry {
  private state: ModuleRegistryState
  public loadingModules: Ref<Set<string>>
  public errorModules: Ref<Map<string, string>>

  constructor() {
    this.state = {
      modules: reactive(new Map()),
      loadingModules: new Set(),
      errorModules: new Map()
    }
    this.loadingModules = ref(this.state.loadingModules)
    this.errorModules = ref(this.state.errorModules)
  }

  /**
   * 注册模块
   */
  register(moduleConfig: ModuleConfig): void {
    const {
      code,
      name,
      type = MODULE_TYPES.VUE_NATIVE,
      version = '1.0.0',
      component = null,
      permissions = [],
      dependencies = [],
      meta = {}
    } = moduleConfig

    if (!code || !name) {
      throw new Error('Module code and name are required')
    }

    const moduleInstance: ModuleInstance = {
      config: {
        ...moduleConfig,
        code,
        name,
        type,
        version,
        component,
        path: moduleConfig.path || `/${code}`,
        permissions,
        dependencies,
        meta,
        status: MODULE_STATUS.AVAILABLE,
        enabled: moduleConfig.enabled !== false
      },
      status: MODULE_STATUS.AVAILABLE
    }

    this.state.modules.set(code, moduleInstance)
    //console.log(`📦 Module registered: ${code} (${type})`)
  }

  /**
   * 注销模块
   */
  unregister(code: string): void {
    if (this.state.modules.has(code)) {
      this.state.modules.delete(code)
      this.state.loadingModules.delete(code)
      this.state.errorModules.delete(code)
      //console.log(`🗑️ Module unregistered: ${code}`)
    }
  }

  /**
   * 更新模块配置
   */
  update(code: string, config: Partial<ModuleConfig>): void {
    const moduleInstance = this.state.modules.get(code)
    if (moduleInstance) {
      Object.assign(moduleInstance.config, config)
      //console.log(`🔄 Module updated: ${code}`)
    }
  }

  /**
   * 获取模块
   */
  get(code: string): ModuleInstance | null {
    return this.state.modules.get(code) || null
  }

  /**
   * 获取所有模块
   */
  getAll(): ModuleInstance[] {
    return Array.from(this.state.modules.values())
  }

  /**
   * 按类型获取模块
   */
  getByType(type: MODULE_TYPES): ModuleInstance[] {
    return this.getAll().filter(module => module.config.type === type)
  }

  /**
   * 获取可用模块
   */
  getAvailable(): ModuleInstance[] {
    return this.getAll().filter(module =>
      module.config.enabled && (
        module.status === MODULE_STATUS.AVAILABLE
      )
    )
  }

  /**
   * 动态加载模块
   */
  async load(code: string): Promise<void> {
    const moduleInstance = this.get(code)
    if (!moduleInstance) {
      throw new Error(`Module not found: ${code}`)
    }

    // 简化处理，直接加载

    if (this.state.loadingModules.has(code)) {
      // 等待正在加载的模块
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          const currentModule = this.get(code)
          if (currentModule?.component) {
            resolve()
          } else if (currentModule?.status === MODULE_STATUS.ERROR) {
            reject(new Error(`Failed to load module: ${code}`))
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }

    this.state.loadingModules.add(code)
    this.setStatus(code, MODULE_STATUS.LOADING)

    try {
      const startTime = Date.now()
      let component: any = null

      switch (moduleInstance.config.type) {
        case MODULE_TYPES.VUE_NATIVE:
          component = await this.loadVueModule(moduleInstance)
          break
        case MODULE_TYPES.LEGACY_ANGULAR:
        case MODULE_TYPES.ANGULAR_IFRAME:
          component = await this.loadLegacyModule(moduleInstance)
          break
        default:
          throw new Error(`Unsupported module type: ${moduleInstance.config.type}`)
      }

      moduleInstance.component = component
      moduleInstance.loadTime = Date.now() - startTime
      moduleInstance.status = MODULE_STATUS.AVAILABLE

      //console.log(`✅ Module loaded: ${code} (${moduleInstance.loadTime}ms)`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      moduleInstance.errorMessage = errorMessage
      moduleInstance.status = MODULE_STATUS.ERROR
      this.state.errorModules.set(code, errorMessage)
      console.error(`❌ Failed to load module ${code}:`, error)
      throw error
    } finally {
      this.state.loadingModules.delete(code)
    }
  }

  /**
   * 卸载模块
   */
  async unload(code: string): Promise<void> {
    const moduleInstance = this.get(code)
    if (moduleInstance) {
      if (moduleInstance.unload) {
        await moduleInstance.unload()
      }
      delete moduleInstance.component
      delete moduleInstance.loadTime
      delete moduleInstance.errorMessage
      moduleInstance.status = MODULE_STATUS.AVAILABLE
      //console.log(`🗑️ Module unloaded: ${code}`)
    }
  }

  /**
   * 重新加载模块
   */
  async reload(code: string): Promise<void> {
    await this.unload(code)
    await this.load(code)
  }

  /**
   * 设置模块状态
   */
  setStatus(code: string, status: MODULE_STATUS): void {
    const moduleInstance = this.get(code)
    if (moduleInstance) {
      moduleInstance.status = status
      if (moduleInstance.config.status !== undefined) {
        moduleInstance.config.status = status
      }
    }
  }

  /**
   * 获取模块状态
   */
  getStatus(code: string): MODULE_STATUS {
    const moduleInstance = this.get(code)
    return moduleInstance?.status || MODULE_STATUS.ERROR
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    available: number
    loading: number
    error: number
    disabled: number
  } {
    const modules = this.getAll()
    const stats = {
      total: modules.length,
      available: 0,
      loading: 0,
      error: 0,
      disabled: 0
    }

    modules.forEach(module => {
      switch (module.status) {
        case MODULE_STATUS.AVAILABLE:
          stats.available++
          break
        case MODULE_STATUS.LOADING:
          stats.loading++
          break
        case MODULE_STATUS.ERROR:
          stats.error++
          break
        case MODULE_STATUS.DISABLED:
          stats.disabled++
          break
      }
    })

    return stats
  }

  /**
   * 加载 Vue 模块
   */
  private async loadVueModule(moduleInstance: ModuleInstance): Promise<any> {
    if (moduleInstance.config.component) {
      return moduleInstance.config.component
    }

    if (moduleInstance.load) {
      return await moduleInstance.load()
    }

    throw new Error(`No component or load function provided for Vue module: ${moduleInstance.config.code}`)
  }

  /**
   * 加载遗留 Angular 模块
   */
  private async loadLegacyModule(_moduleInstance: ModuleInstance): Promise<any> {
    // 返回 iframe 容器组件
    const { default: AngularModuleFrame } = await import('@/components/angular/modules/AngularModuleFrame.vue')
    return AngularModuleFrame
  }



  /**
   * 检查模块依赖
   */
  checkDependencies(code: string): { satisfied: boolean; missing: string[] } {
    const moduleInstance = this.get(code)
    if (!moduleInstance || !moduleInstance.config.dependencies?.length) {
      return { satisfied: true, missing: [] }
    }

    const missing = moduleInstance.config.dependencies.filter(dep => !this.state.modules.has(dep))
    return {
      satisfied: missing.length === 0,
      missing
    }
  }
}

// 创建全局实例
export const moduleRegistry = new ModuleRegistry()

// 导出计算属性
export const useModuleRegistry = () => {
  return {
    modules: computed(() => moduleRegistry.getAll()),
    availableModules: computed(() => moduleRegistry.getAvailable()),
    vueModules: computed(() => moduleRegistry.getByType(MODULE_TYPES.VUE_NATIVE)),
    legacyModules: computed(() => moduleRegistry.getByType(MODULE_TYPES.LEGACY_ANGULAR)),
    loadingModules: moduleRegistry.loadingModules,
    errorModules: moduleRegistry.errorModules,
    stats: computed(() => moduleRegistry.getStats())
  }
}

// 导出类型
export type { ModuleConfig, ModuleInstance }
