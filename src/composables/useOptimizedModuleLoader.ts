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
  
  // 计算模块 URL
  const moduleUrl = computed(() => {
    return angularModuleManager.getModuleUrl(moduleCode)
  })

  // 预加载模块
  const preloadModule = async () => {
    if (!networkConfig.value.enablePreload) {
      console.log('⚠️ Preload disabled due to network conditions')
      return
    }

    try {
      console.log(`🔄 Preloading module: ${moduleCode}`)
      await IframePreloader.preload(moduleUrl.value)
      console.log(`✅ Module preloaded: ${moduleCode}`)
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
      // 尝试使用预加载的 iframe
      const preloadedIframe = IframePreloader.getPreloaded(moduleUrl.value)
      
      if (preloadedIframe) {
        console.log(`⚡ Using preloaded iframe for: ${moduleCode}`)
        
        // 将预加载的内容复制到目标 iframe
        targetIframe.src = moduleUrl.value
        
        // 模拟快速加载
        setTimeout(() => {
          loading.value = false
          ModuleLoadMonitor.endTiming(moduleCode)
          loadTime.value = ModuleLoadMonitor.getMetrics(moduleCode)?.loadTime || 0
        }, 100)
      } else {
        console.log(`🔄 Loading iframe normally for: ${moduleCode}`)
        
        // 正常加载
        targetIframe.src = moduleUrl.value
        
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
      error.value = err.message || '加载失败'
      loading.value = false
      ModuleLoadMonitor.endTiming(moduleCode)
    }
  }

  // 清理资源
  const cleanup = () => {
    IframePreloader.cleanup(moduleUrl.value)
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
    moduleUrl,
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
        const moduleUrl = angularModuleManager.getModuleUrl(moduleCode)
        await IframePreloader.preload(moduleUrl)
        this.preloadedModules.add(moduleCode)
        console.log(`✅ Preloaded module: ${moduleCode}`)
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
