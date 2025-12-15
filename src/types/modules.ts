/**
 * 模块管理相关类型定义
 */

export enum MODULE_TYPES {
  VUE_NATIVE = 'vue-native',
  EXTERNAL_LINK = 'external-link',
  HYBRID = 'hybrid'
}

export enum MODULE_STATUS {
  AVAILABLE = 'available',
  LOADING = 'loading',
  ERROR = 'error',
  DISABLED = 'disabled'
}

export interface ModuleConfig {
  code: string
  name: string
  description?: string
  type: MODULE_TYPES
  version?: string

  // 路由配置
  path: string
  component?: any
  url?: string

  // 显示配置
  icon?: string
  category?: string
  order?: number
  hidden?: boolean

  // 权限配置
  permissions?: string[]
  roles?: string[]

  // 技术配置
  dependencies?: string[]
  assets?: {
    css?: string[]
    js?: string[]
  }

  // 元数据
  meta?: Record<string, any>
  tags?: string[]

  // 状态
  status?: MODULE_STATUS
  enabled?: boolean

  // 开发配置
  devUrl?: string
  prodUrl?: string
}

export interface ModuleInstance {
  config: ModuleConfig
  status: MODULE_STATUS
  loadTime?: number
  errorMessage?: string
  component?: any

  // 生命周期方法
  load?(): Promise<void>
  unload?(): Promise<void>
  reload?(): Promise<void>
}

export interface ModuleRegistry {
  // 模块管理
  register(config: ModuleConfig): void
  unregister(code: string): void
  update(code: string, config: Partial<ModuleConfig>): void

  // 模块查询
  get(code: string): ModuleInstance | null
  getAll(): ModuleInstance[]
  getByType(type: MODULE_TYPES): ModuleInstance[]
  getAvailable(): ModuleInstance[]

  // 模块操作
  load(code: string): Promise<void>
  unload(code: string): Promise<void>
  reload(code: string): Promise<void>

  // 状态管理
  setStatus(code: string, status: MODULE_STATUS): void
  getStatus(code: string): MODULE_STATUS

  // 统计信息
  getStats(): {
    total: number
    available: number
    loading: number
    error: number
    disabled: number
  }
}

export interface HybridModuleManager {
  registry: ModuleRegistry

  // 模块生命周期
  loadModule(code: string): Promise<ModuleInstance>
  unloadModule(code: string): Promise<void>
  reloadModule(code: string): Promise<void>

  // 批量操作
  loadAllModules(): Promise<void>
  unloadAllModules(): Promise<void>

  // 模块通信
  sendMessage(moduleCode: string, message: any): void
  broadcastMessage(message: any): void

  // 事件处理
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
  emit(event: string, data?: any): void
}

export interface ModuleLoadEvent {
  type: 'MODULE_LOAD' | 'MODULE_UNLOAD' | 'MODULE_ERROR'
  moduleCode: string
  data?: any
  error?: Error
  timestamp: number
}
