/**
 * 优化的模块加载 Composable (存根版本)
 * Angular iframe 模块已移除，此文件保留接口但返回空操作
 */

import { ref, computed, onUnmounted } from 'vue'

export function useOptimizedModuleLoader(_moduleCode: string) {
  const loading = ref(false)
  const error = ref('')
  const loadTime = ref(0)
  const networkConfig = ref({ enablePreload: false, timeout: 30000 })

  // 计算基础模块 URL - 始终返回空
  const baseModuleUrl = computed(() => '')

  // 预加载模块 - 空操作
  const preloadModule = async () => {
    // Stub - no longer needed after Angular removal
  }

  // 加载模块 - 空操作
  const loadModule = async (_targetIframe: HTMLIFrameElement) => {
    // Stub - no longer needed after Angular removal
    loading.value = false
  }

  // 清理资源 - 空操作
  const cleanup = () => {
    // Stub - no longer needed after Angular removal
  }

  // 获取加载统计
  const getLoadStats = () => {
    return {
      loadTime: loadTime.value,
      networkType: networkConfig.value,
      metrics: null
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
 * 模块预加载管理器 (存根版本)
 */
export class ModulePreloadManager {
  private static preloadedModules = new Set<string>()
  private static preloadQueue: string[] = []
  private static isPreloading = false

  /**
   * 添加模块到预加载队列 - 空操作
   */
  static addToPreloadQueue(_moduleCode: string) {
    // Stub - no longer needed after Angular removal
  }

  /**
   * 预加载常用模块 - 空操作
   */
  static preloadCommonModules() {
    // Stub - no longer needed after Angular removal
  }

  /**
   * 清理预加载缓存
   */
  static cleanup() {
    this.preloadedModules.clear()
    this.preloadQueue.length = 0
    this.isPreloading = false
  }

  /**
   * 获取预加载状态
   */
  static getStatus() {
    return {
      preloadedCount: 0,
      queueLength: 0,
      isPreloading: false,
      preloadedModules: []
    }
  }
}
