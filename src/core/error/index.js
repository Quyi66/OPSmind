/**
 * 全局错误处理系统
 */

import { ElMessage, ElNotification } from 'element-plus'

// 错误类型
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  BUSINESS: 'business',
  SYSTEM: 'system'
}

// 错误级别
export const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
}

class ErrorHandler {
  constructor() {
    this.errorQueue = []
    this.maxQueueSize = 100
  }

  /**
   * 处理错误
   */
  handle(error, context = {}) {
    const errorInfo = this.normalizeError(error, context)

    // 记录错误
    this.logError(errorInfo)

    // 显示用户友好的错误信息
    this.showUserError(errorInfo)

    // 上报错误（如果需要）
    this.reportError(errorInfo)

    return errorInfo
  }

  /**
   * 标准化错误信息
   */
  normalizeError(error, context) {
    // 处理 null 或 undefined 的 error
    const safeError = error || {}

    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: safeError.message || (typeof error === 'string' ? error : '未知错误'),
      stack: safeError.stack,
      type: this.detectErrorType(safeError),
      level: this.detectErrorLevel(safeError),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      raw: error
    }

    return errorInfo
  }

  /**
   * 检测错误类型
   */
  detectErrorType(error) {
    const message = error?.message || ''

    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      return ERROR_TYPES.NETWORK
    }

    if (error?.status === 401 || message.includes('Authentication')) {
      return ERROR_TYPES.AUTH
    }

    if (error?.status === 403 || message.includes('Permission')) {
      return ERROR_TYPES.PERMISSION
    }

    if (error?.name === 'ValidationError') {
      return ERROR_TYPES.VALIDATION
    }

    return ERROR_TYPES.SYSTEM
  }

  /**
   * 检测错误级别
   */
  detectErrorLevel(error) {
    if (error.status >= 500) {
      return ERROR_LEVELS.CRITICAL
    }

    if (error.status >= 400) {
      return ERROR_LEVELS.ERROR
    }

    return ERROR_LEVELS.WARNING
  }

  /**
   * 记录错误
   */
  logError(errorInfo) {
    // 添加到错误队列
    this.errorQueue.unshift(errorInfo)

    // 限制队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(0, this.maxQueueSize)
    }

    // 控制台输出
    const logMethod = this.getLogMethod(errorInfo.level)
    logMethod(`❌ [${errorInfo.type.toUpperCase()}] ${errorInfo.message}`, errorInfo)
  }

  /**
   * 显示用户错误信息
   */
  showUserError(errorInfo) {
    // 抑制低级别系统类告警（如页面初次加载时的无害异常）
    if (errorInfo.type === ERROR_TYPES.SYSTEM && errorInfo.level === ERROR_LEVELS.WARNING) {
      // 仅记录，不提示用户
      return
    }

    const userMessage = this.getUserMessage(errorInfo)

    switch (errorInfo.level) {
      case ERROR_LEVELS.CRITICAL:
        ElNotification({
          title: '系统错误',
          message: userMessage,
          type: 'error',
          duration: 0 // 不自动关闭
        })
        break

      case ERROR_LEVELS.ERROR:
        ElMessage({
          message: userMessage,
          type: 'error',
          duration: 5000
        })
        break

      case ERROR_LEVELS.WARNING:
        ElMessage({
          message: userMessage,
          type: 'warning',
          duration: 3000
        })
        break

      default:
        ElMessage({
          message: userMessage,
          type: 'info',
          duration: 2000
        })
    }
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserMessage(errorInfo) {
    const messageMap = {
      [ERROR_TYPES.NETWORK]: '网络连接异常，请检查网络设置',
      [ERROR_TYPES.AUTH]: '登录已过期，请重新登录',
      [ERROR_TYPES.PERMISSION]: '您没有权限执行此操作',
      [ERROR_TYPES.VALIDATION]: '输入数据格式不正确',
      [ERROR_TYPES.BUSINESS]: '业务处理失败',
      [ERROR_TYPES.SYSTEM]: '系统异常，请稍后重试'
    }

    return messageMap[errorInfo.type] || errorInfo.message
  }

  /**
   * 上报错误
   */
  reportError(errorInfo) {
    // 只上报严重错误
    if (errorInfo.level === ERROR_LEVELS.CRITICAL) {
      // 这里可以集成错误监控服务
      //console.log('📊 Reporting critical error:', errorInfo.id)
    }
  }

  /**
   * 获取日志方法
   */
  getLogMethod(level) {
    switch (level) {
      case ERROR_LEVELS.CRITICAL:
        return console.error
      case ERROR_LEVELS.ERROR:
        return console.error
      case ERROR_LEVELS.WARNING:
        return console.warn
      default:
        return console.info
    }
  }

  /**
   * 生成错误ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取错误历史
   */
  getErrorHistory() {
    return [...this.errorQueue]
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory() {
    this.errorQueue = []
  }
}

// 创建全局实例
export const errorHandler = new ErrorHandler()

/**
 * 设置全局错误处理
 */
export function setupErrorHandler(app) {
  // Vue 错误处理
  app.config.errorHandler = (error, instance, info) => {
    errorHandler.handle(error, {
      component: instance?.$options.name || 'Unknown',
      errorInfo: info
    })
  }

  // 全局未捕获错误
  window.addEventListener('error', (event) => {
    // 忽略某些无害的错误
    const message = event.message || event.error?.message || ''

    // 过滤 ResizeObserver 循环限制错误
    if (message.includes('ResizeObserver loop')) {
      return
    }

    // 过滤没有有效信息的错误（通常是跨域脚本或浏览器扩展）
    if (!event.error && event.lineno === 0 && event.colno === 0) {
      return
    }

    errorHandler.handle(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  // Promise 未捕获错误
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason, {
      type: 'unhandledrejection'
    })
  })

  //console.log('🛡️ Global error handler setup completed')
}

// 导出 Composition API
export const useErrorHandler = () => {
  return {
    handle: errorHandler.handle.bind(errorHandler),
    getHistory: errorHandler.getErrorHistory.bind(errorHandler),
    clearHistory: errorHandler.clearErrorHistory.bind(errorHandler)
  }
}
