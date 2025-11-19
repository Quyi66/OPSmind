/**
 * 性能优化工具
 * 提供各种性能优化功能，包括预加载、预连接等
 */

const ANGULAR_ENDPOINT = (import.meta.env.VITE_ANGULAR_URL || '').trim()
const BACKEND_ENDPOINT = (import.meta.env.VITE_BACKEND_URL || '').trim()

// 预连接的域名列表
const PRECONNECT_DOMAINS = Array.from(
  new Set(
    [ANGULAR_ENDPOINT, BACKEND_ENDPOINT]
      .map(extractOrigin)
      .filter((origin): origin is string => Boolean(origin))
  )
)

/**
 * 添加 DNS 预解析和预连接
 */
export function setupPreconnections() {
  const head = document.head

  PRECONNECT_DOMAINS.forEach(domain => {
    try {
      const url = new URL(domain)

      // DNS 预解析
      const dnsLink = document.createElement('link')
      dnsLink.rel = 'dns-prefetch'
      dnsLink.href = url.origin
      head.appendChild(dnsLink)

      // 预连接
      const preconnectLink = document.createElement('link')
      preconnectLink.rel = 'preconnect'
      preconnectLink.href = url.origin
      preconnectLink.crossOrigin = 'anonymous'
      head.appendChild(preconnectLink)

      //console.log(`🔗 Added preconnect for: ${url.origin}`)
    } catch (error) {
      console.warn(`Failed to add preconnect for: ${domain}`, error)
    }
  })
}

function extractOrigin(target: string): string | null {
  if (!target) return null
  try {
    const url = new URL(target)
    return url.origin
  } catch (error) {
    return null
  }
}

/**
 * 预加载关键资源
 */
export function preloadCriticalResources() {
  const head = document.head

  // 预加载关键的 CSS 和 JS 文件
  const criticalResources = [
    // 可以添加关键的 CSS/JS 文件
  ]

  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource.href
    link.as = resource.as
    if (resource.type) link.type = resource.type
    head.appendChild(link)
  })
}

/**
 * iframe 预加载优化
 */
export class IframePreloader {
  private static cache = new Map<string, HTMLIFrameElement>()
  private static preloadQueue = new Set<string>()

  /**
   * 预加载 iframe（支持token参数）
   */
  static preload(url: string): Promise<HTMLIFrameElement> {
    return new Promise(async (resolve, reject) => {
      // 构建带token的URL
      const urlWithToken = await this.buildUrlWithToken(url)

      // 检查缓存（使用原始URL作为key）
      if (this.cache.has(url)) {
        resolve(this.cache.get(url)!)
        return
      }

      // 检查是否正在预加载
      if (this.preloadQueue.has(url)) {
        // 等待预加载完成
        const checkInterval = setInterval(() => {
          if (this.cache.has(url)) {
            clearInterval(checkInterval)
            resolve(this.cache.get(url)!)
          }
        }, 100)
        return
      }

      this.preloadQueue.add(url)

      // 创建隐藏的 iframe 进行预加载
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '-9999px'
      iframe.style.width = '1px'
      iframe.style.height = '1px'

      iframe.onload = () => {
        // //console.log(`✅ Iframe preloaded: ${urlWithToken}`)
        this.cache.set(url, iframe)
        this.preloadQueue.delete(url)
        resolve(iframe)
      }

      iframe.onerror = () => {
        console.error(`❌ Iframe preload failed: ${urlWithToken}`)
        this.preloadQueue.delete(url)
        document.body.removeChild(iframe)
        reject(new Error(`Failed to preload iframe: ${url}`))
      }

      // 使用带token的URL进行预加载
      iframe.src = urlWithToken
      document.body.appendChild(iframe)

      // 设置超时
      setTimeout(() => {
        if (this.preloadQueue.has(url)) {
          this.preloadQueue.delete(url)
          document.body.removeChild(iframe)
          reject(new Error(`Iframe preload timeout: ${url}`))
        }
      }, 10000) // 10秒超时
    })
  }

  /**
   * 构建带token的URL
   */
  private static async buildUrlWithToken(baseUrl: string): Promise<string> {
    try {
      // 动态导入authService以避免循环依赖
      const [{ authService }, { appUrlManager }] = await Promise.all([
        import('@/core/auth'),
        import('@/config/module-urls.config')
      ])

      const token = authService.getToken()

      if (token) {
        const tokenParam = appUrlManager.getTokenParam()
        const separator = baseUrl.includes('?') ? '&' : '?'
        const finalUrl = `${baseUrl}${separator}${tokenParam}=${token}&vue_auth=true&t=${Date.now()}`

        //console.log('🔗 Built preload URL with token:', {
        //   baseUrl,
        //   hasToken: !!token,
        //   tokenLength: token.length,
        //   finalUrl: finalUrl.substring(0, 100) + '...'
        // })

        return finalUrl
      }
    } catch (error) {
      console.warn('Failed to add token to preload URL:', error)
    }

    return baseUrl
  }

  /**
   * 获取预加载的 iframe
   */
  static getPreloaded(url: string): HTMLIFrameElement | null {
    return this.cache.get(url) || null
  }

  /**
   * 清理预加载缓存
   */
  static cleanup(url?: string) {
    if (url) {
      const iframe = this.cache.get(url)
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
      this.cache.delete(url)
    } else {
      // 清理所有缓存
      this.cache.forEach(iframe => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      })
      this.cache.clear()
    }
  }
}

/**
 * 模块加载性能监控
 */
export class ModuleLoadMonitor {
  private static metrics = new Map<string, any>()

  static startTiming(moduleCode: string) {
    this.metrics.set(moduleCode, {
      startTime: performance.now(),
      moduleCode
    })
  }

  static endTiming(moduleCode: string) {
    const metric = this.metrics.get(moduleCode)
    if (metric) {
      metric.endTime = performance.now()
      metric.loadTime = metric.endTime - metric.startTime

      //console.log(`📊 Module load time: ${moduleCode} - ${metric.loadTime.toFixed(2)}ms`)

      // 可以发送到分析服务
      this.reportMetrics(metric)
    }
  }

  private static reportMetrics(metric: any) {
    // 这里可以发送到性能监控服务
    if (metric.loadTime > 2000) {
      console.warn(`⚠️ Slow module load detected: ${metric.moduleCode} - ${metric.loadTime.toFixed(2)}ms`)
    }
  }

  static getMetrics(moduleCode?: string) {
    if (moduleCode) {
      return this.metrics.get(moduleCode)
    }
    return Array.from(this.metrics.values())
  }
}

/**
 * 网络状态优化
 */
export function optimizeForNetworkCondition() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection

    if (connection) {
      //console.log(`📶 Network: ${connection.effectiveType}, ${connection.downlink}Mbps`)

      // 根据网络状况调整策略
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        // 慢网络：禁用预加载，减少并发
        return {
          enablePreload: false,
          maxConcurrent: 1,
          timeout: 60000
        }
      } else if (connection.effectiveType === '3g') {
        // 中等网络：限制预加载
        return {
          enablePreload: true,
          maxConcurrent: 2,
          timeout: 30000
        }
      } else {
        // 快网络：启用所有优化
        return {
          enablePreload: true,
          maxConcurrent: 4,
          timeout: 15000
        }
      }
    }
  }

  // 默认配置
  return {
    enablePreload: true,
    maxConcurrent: 2,
    timeout: 20000
  }
}

/**
 * 初始化性能优化
 */
export function initPerformanceOptimizations() {
  // 设置预连接
  setupPreconnections()

  // 预加载关键资源
  preloadCriticalResources()

  // 获取网络状况
  const networkConfig = optimizeForNetworkCondition()

  //console.log('🚀 Performance optimizations initialized:', networkConfig)

  return networkConfig
}
