/**
 * 性能监控系统
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = []
    this.isEnabled = false
  }

  /**
   * 启用性能监控
   */
  enable() {
    if (this.isEnabled) return

    this.isEnabled = true
    this.setupObservers()
    this.startMetricsCollection()

    //console.log('📊 Performance monitoring enabled')
  }

  /**
   * 禁用性能监控
   */
  disable() {
    if (!this.isEnabled) return

    this.isEnabled = false
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []

    //console.log('📊 Performance monitoring disabled')
  }

  /**
   * 设置观察器
   */
  setupObservers() {
    // 性能观察器
    if ('PerformanceObserver' in window) {
      // 导航性能
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationMetrics(entry)
        }
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)

      // 资源加载性能
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceMetrics(entry)
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)

      // 长任务监控
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLongTask(entry)
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    }

    // 内存使用监控
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryUsage()
      }, 30000) // 每30秒记录一次
    }
  }

  /**
   * 记录导航性能指标
   */
  recordNavigationMetrics(entry) {
    const metrics = {
      timestamp: Date.now(),
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint()
    }

    this.metrics.set('navigation', metrics)
    //console.log('📊 Navigation metrics:', metrics)
  }

  /**
   * 记录资源加载性能
   */
  recordResourceMetrics(entry) {
    if (entry.name.includes('chunk') || entry.name.includes('.js') || entry.name.includes('.css')) {
      const metrics = {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        cached: entry.transferSize === 0
      }

      const resourceMetrics = this.metrics.get('resources') || []
      resourceMetrics.push(metrics)
      this.metrics.set('resources', resourceMetrics)
    }
  }

  /**
   * 记录长任务
   */
  recordLongTask(entry) {
    const longTasks = this.metrics.get('longTasks') || []
    longTasks.push({
      timestamp: Date.now(),
      duration: entry.duration,
      startTime: entry.startTime
    })
    this.metrics.set('longTasks', longTasks)

    console.warn('⚠️ Long task detected:', entry.duration + 'ms')
  }

  /**
   * 记录内存使用
   */
  recordMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory
      const metrics = {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }

      this.metrics.set('memory', metrics)
    }
  }

  /**
   * 获取首次绘制时间
   */
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint ? firstPaint.startTime : null
  }

  /**
   * 获取首次内容绘制时间
   */
  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime : null
  }

  /**
   * 开始收集指标
   */
  startMetricsCollection() {
    // 页面可见性变化监控
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordPageHide()
      } else {
        this.recordPageShow()
      }
    })

    // 页面卸载监控
    window.addEventListener('beforeunload', () => {
      this.recordPageUnload()
    })
  }

  /**
   * 记录页面隐藏
   */
  recordPageHide() {
    const hideTime = Date.now()
    this.metrics.set('lastHideTime', hideTime)
  }

  /**
   * 记录页面显示
   */
  recordPageShow() {
    const showTime = Date.now()
    const lastHideTime = this.metrics.get('lastHideTime')

    if (lastHideTime) {
      const hideDuration = showTime - lastHideTime
      //console.log('📊 Page was hidden for:', hideDuration + 'ms')
    }
  }

  /**
   * 记录页面卸载
   */
  recordPageUnload() {
    const unloadTime = Date.now()
    const sessionDuration = unloadTime - (this.metrics.get('sessionStart') || unloadTime)

    //console.log('📊 Session duration:', sessionDuration + 'ms')
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      navigation: this.metrics.get('navigation'),
      resources: this.metrics.get('resources') || [],
      longTasks: this.metrics.get('longTasks') || [],
      memory: this.metrics.get('memory'),
      summary: this.generateSummary()
    }

    return report
  }

  /**
   * 生成性能摘要
   */
  generateSummary() {
    const navigation = this.metrics.get('navigation')
    const resources = this.metrics.get('resources') || []
    const longTasks = this.metrics.get('longTasks') || []

    return {
      pageLoadTime: navigation?.loadComplete || 0,
      resourceCount: resources.length,
      totalResourceSize: resources.reduce((sum, r) => sum + (r.size || 0), 0),
      longTaskCount: longTasks.length,
      averageLongTaskDuration: longTasks.length > 0
        ? longTasks.reduce((sum, t) => sum + t.duration, 0) / longTasks.length
        : 0
    }
  }

  /**
   * 清除指标
   */
  clearMetrics() {
    this.metrics.clear()
    //console.log('📊 Performance metrics cleared')
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor()

/**
 * 设置性能监控
 */
export function setupPerformanceMonitor(app) {
  // 只在开发环境启用
  if (import.meta.env.DEV) {
    performanceMonitor.enable()

    // 添加全局方法
    window.__PERFORMANCE_MONITOR__ = performanceMonitor

    //console.log('📊 Performance monitor setup completed')
  }
}

// 导出 Composition API
export const usePerformanceMonitor = () => {
  return {
    enable: performanceMonitor.enable.bind(performanceMonitor),
    disable: performanceMonitor.disable.bind(performanceMonitor),
    getReport: performanceMonitor.getPerformanceReport.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor)
  }
}
