/**
 * 全局类型定义
 */





// 全局事件类型
interface CustomEventMap {
  'route-change': CustomEvent<{ to: any; from: any }>
  'showAngularModuleContainer': CustomEvent<{ moduleCode: string; title: string }>
  'hideAngularModuleContainer': CustomEvent
  'module-loaded': CustomEvent<{ moduleCode: string }>
  'module-error': CustomEvent<{ moduleCode: string; error: Error }>
}

// 扩展 Window 接口
declare global {
  interface Window {
    // AngularJS 相关
    angular?: any

    // 模块通信
    postMessage(message: any, targetOrigin: string): void

    // 自定义事件
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Window, ev: CustomEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void

    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Window, ev: CustomEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void

    dispatchEvent<K extends keyof CustomEventMap>(event: CustomEventMap[K]): boolean
  }
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string | number
}

// 分页类型
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: Pagination
}

// 通用选项类型
export interface Option<T = any> {
  label: string
  value: T
  disabled?: boolean
  children?: Option<T>[]
}

// 表格列类型
export interface TableColumn {
  key: string
  title: string
  dataIndex?: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: any, index: number) => any
}

// 表单字段类型
export interface FormField {
  name: string
  label: string
  type: 'input' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'number'
  required?: boolean
  placeholder?: string
  options?: Option[]
  rules?: any[]
  props?: Record<string, any>
}

// 菜单项类型
export interface MenuItem {
  id: string
  name: string
  title?: string
  icon?: string
  path?: string
  url?: string
  target?: '_blank' | '_self'
  children?: MenuItem[]
  meta?: Record<string, any>
  permissions?: string[]
  visible?: boolean
  disabled?: boolean
}

// 面包屑类型
export interface BreadcrumbItem {
  title: string
  path?: string
  icon?: string
}

// 通知类型
export interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  closable?: boolean
  timestamp: number
}

// 主题配置类型
export interface ThemeConfig {
  primaryColor: string
  darkMode: boolean
  compactMode: boolean
  colorWeak: boolean
  multiTab: boolean
  fixedHeader: boolean
  fixedSidebar: boolean
  autoHideHeader: boolean
  contentWidth: 'fluid' | 'fixed'
  layout: 'side' | 'top' | 'mix'
}

// 系统配置类型
export interface SystemConfig {
  title: string
  version: string
  logo: string
  favicon: string
  copyright: string
  theme: ThemeConfig
  features: Record<string, boolean>
}

// 错误类型
export interface AppError {
  code: string | number
  message: string
  details?: any
  timestamp: number
  stack?: string
}

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// 日志条目
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  module?: string
  data?: any
}

// 性能指标
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  networkRequests: number
  errors: number
}

// 类型已在上面定义时导出
