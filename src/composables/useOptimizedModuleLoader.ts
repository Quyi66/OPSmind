/**
 * 优化的模块加载 Composable
 * 提供预加载、缓存、性能监控等功能
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IframePreloader, ModuleLoadMonitor, optimizeForNetworkCondition } from '@/utils/performance-optimizer'
import { angularModuleManager } from '@/services/AngularModuleManager.js'

export function useOptimizedModuleLoader(moduleCode: string) {
  const loading = ref(true)
  const error = ref('')
  const loadTime = ref(0)
  const networkConfig = ref(optimizeForNetworkCondition())

  // 计算基础模块 URL
  const baseModuleUrl = computed(() => {
    return angularModuleManager.getModuleUrl(moduleCode)
  })

  // 构建带token的模块URL
  async function buildModuleUrlWithToken(baseUrl: string): Promise<string> {
    try {
      const [{ authService }, { appUrlManager }] = await Promise.all([
        import('@/core/auth'),
        import('@/config/module-urls.config')
      ])

      const token = authService.getToken()

      if (token) {
        const tokenParam = appUrlManager.getTokenParam()
        const separator = baseUrl.includes('?') ? '&' : '?'
        return `${baseUrl}${separator}${tokenParam}=${token}&vue_auth=true&module=${moduleCode}&t=${Date.now()}`
      }
    } catch (error) {
      console.warn('Failed to add token to module URL:', error)
    }

    return baseUrl
  }

  // 预加载模块
  const preloadModule = async () => {
    if (!networkConfig.value.enablePreload) {
      console.log('⚠️ Preload disabled due to network conditions')
      return
    }

    try {
      console.log(`🔄 Preloading module: ${moduleCode}`)
      const url = baseModuleUrl.value
      if (url) {
        await IframePreloader.preload(url)
        console.log(`✅ Module preloaded: ${moduleCode}`)
      } else {
        console.warn(`⚠️ No URL found for module: ${moduleCode}`)
      }
    } catch (error) {
      console.warn(`⚠️ Preload failed for ${moduleCode}:`, error)
    }
  }

  // 快速加载模块
  const loadModule = async (targetIframe: HTMLIFrameElement) => {
    ModuleLoadMonitor.startTiming(moduleCode)
    loading.value = true
    error.value = ''

    try {
      const url = baseModuleUrl.value
      if (!url) {
        throw new Error(`No URL found for module: ${moduleCode}`)
      }

      // 构建带token的URL
      const urlWithToken = await buildModuleUrlWithToken(url)

      // 尝试使用预加载的 iframe
      const preloadedIframe = IframePreloader.getPreloaded(url)

      if (preloadedIframe) {
        console.log(`⚡ Using preloaded iframe for: ${moduleCode}`)

        // 将预加载的内容复制到目标 iframe
        targetIframe.src = urlWithToken

        // 模拟快速加载
        setTimeout(() => {
          loading.value = false
          ModuleLoadMonitor.endTiming(moduleCode)
          loadTime.value = ModuleLoadMonitor.getMetrics(moduleCode)?.loadTime || 0
        }, 100)
      } else {
        console.log(`🔄 Loading iframe normally for: ${moduleCode}`)

        // 正常加载
        targetIframe.src = urlWithToken

        // 设置超时
        const timeout = setTimeout(() => {
          if (loading.value) {
            error.value = '加载超时'
            loading.value = false
            ModuleLoadMonitor.endTiming(moduleCode)
          }
        }, networkConfig.value.timeout)

        // 监听加载完成
        const handleLoad = () => {
          clearTimeout(timeout)
          loading.value = false
          ModuleLoadMonitor.endTiming(moduleCode)
          loadTime.value = ModuleLoadMonitor.getMetrics(moduleCode)?.loadTime || 0
          targetIframe.removeEventListener('load', handleLoad)
          targetIframe.removeEventListener('error', handleError)
        }

        const handleError = () => {
          clearTimeout(timeout)
          error.value = '加载失败'
          loading.value = false
          ModuleLoadMonitor.endTiming(moduleCode)
          targetIframe.removeEventListener('load', handleLoad)
          targetIframe.removeEventListener('error', handleError)
        }

        targetIframe.addEventListener('load', handleLoad)
        targetIframe.addEventListener('error', handleError)
      }
    } catch (err) {
      error.value = (err as Error).message || '加载失败'
      loading.value = false
      ModuleLoadMonitor.endTiming(moduleCode)
    }
  }

  // 清理资源
  const cleanup = () => {
    const url = baseModuleUrl.value
    if (url) {
      IframePreloader.cleanup(url)
    }
  }

  // 获取加载统计
  const getLoadStats = () => {
    return {
      loadTime: loadTime.value,
      networkType: networkConfig.value,
      metrics: ModuleLoadMonitor.getMetrics(moduleCode)
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    loading,
    error,
    loadTime,
    moduleUrl: baseModuleUrl,
    networkConfig,
    preloadModule,
    loadModule,
    cleanup,
    getLoadStats
  }
}

/**
 * 模块预加载管理器
 */
export class ModulePreloadManager {
  private static preloadedModules = new Set<string>()
  private static preloadQueue: string[] = []
  private static isPreloading = false

  /**
   * 添加模块到预加载队列
   */
  static addToPreloadQueue(moduleCode: string) {
    if (!this.preloadedModules.has(moduleCode) && !this.preloadQueue.includes(moduleCode)) {
      this.preloadQueue.push(moduleCode)
      this.processPreloadQueue()
    }
  }

  /**
   * 处理预加载队列
   */
  private static async processPreloadQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return
    }

    this.isPreloading = true
    const networkConfig = optimizeForNetworkCondition()

    while (this.preloadQueue.length > 0 && networkConfig.enablePreload) {
      const moduleCode = this.preloadQueue.shift()!

      try {
        const baseUrl = angularModuleManager.getModuleUrl(moduleCode)
        if (baseUrl) {
          await IframePreloader.preload(baseUrl) // 传递原始URL给预加载器，它会内部添加token
          this.preloadedModules.add(moduleCode)
          console.log(`✅ Preloaded module: ${moduleCode}`)
        } else {
          console.warn(`⚠️ No URL found for module: ${moduleCode}`)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to preload module: ${moduleCode}`, error)
      }

      // 添加延迟避免过度占用资源
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    this.isPreloading = false
  }

  /**
   * 预加载常用模块
   */
  static preloadCommonModules() {
    const commonModules = ['cac', 'jao', 'sim'] // 常用模块列表
    commonModules.forEach(moduleCode => {
      this.addToPreloadQueue(moduleCode)
    })
  }

  /**
   * 清理预加载缓存
   */
  static cleanup() {
    this.preloadedModules.clear()
    this.preloadQueue.length = 0
    this.isPreloading = false
    IframePreloader.cleanup()
  }

  /**
   * 获取预加载状态
   */
  static getStatus() {
    return {
      preloadedCount: this.preloadedModules.size,
      queueLength: this.preloadQueue.length,
      isPreloading: this.isPreloading,
      preloadedModules: Array.from(this.preloadedModules)
    }
  }


}
