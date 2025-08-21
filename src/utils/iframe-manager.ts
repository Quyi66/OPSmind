/**
 * 全页面预加载 iframe 管理器
 * 预加载所有模块页面，点击时只切换显示/隐藏
 */

import { authService } from '@/core/auth'
import { appUrlManager } from '@/config/module-urls.config'
import { getAllModuleConfigs } from '@/config/angular-modules.config'

interface IframeInstance {
  iframe: HTMLIFrameElement
  moduleCode: string
  moduleName: string
  isLoaded: boolean
  isVisible: boolean
  loadTime: number
  loadStartTime: number
  url: string
}

export class GlobalIframeManager {
  private static instance: GlobalIframeManager
  private iframes = new Map<string, IframeInstance>()
  private container: HTMLElement | null = null
  private currentModule: string | null = null
  private allModules: string[] = [] // 所有模块
  private loadedCount = 0
  private totalCount = 0

  private constructor() {
    this.initContainer()
    this.initAllModules()
    this.startGlobalPreloading()
  }

  static getInstance(): GlobalIframeManager {
    if (!this.instance) {
      this.instance = new GlobalIframeManager()
    }
    return this.instance
  }

  /**
   * 初始化隐藏容器
   */
  private initContainer() {
    this.container = document.createElement('div')
    this.container.id = 'global-iframe-container'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
    `
    document.body.appendChild(this.container)
    console.log('📦 Global iframe container created')
  }

  /**
   * 初始化所有模块列表
   */
  private initAllModules() {
    const moduleConfigs = getAllModuleConfigs()
    this.allModules = moduleConfigs.map(config => config.code)
    this.totalCount = this.allModules.length
    console.log(`📋 Found ${this.totalCount} modules to preload:`, this.allModules)
  }

  /**
   * 开始全局预加载
   */
  private async startGlobalPreloading() {
    console.log('🚀 Starting GLOBAL iframe preloading for ALL modules...')

    // 延迟 2 秒开始，确保主应用完全加载
    setTimeout(() => {
      this.preloadAllModules()
    }, 2000)
  }

  /**
   * 预加载所有模块
   */
  private async preloadAllModules(): Promise<void> {
    console.log(`🔄 Starting to preload ALL ${this.totalCount} modules...`)

    // 并发预加载所有模块，但限制并发数
    const concurrency = 3 // 同时最多加载3个
    const chunks = this.chunkArray(this.allModules, concurrency)

    for (const chunk of chunks) {
      await Promise.all(chunk.map(moduleCode => this.preloadSingleModule(moduleCode)))
      // 每批次之间稍微延迟，避免过度占用资源
      await this.delay(500)
    }

    console.log(`🎉 ALL modules preloading completed! ${this.loadedCount}/${this.totalCount} loaded`)
  }

  /**
   * 预加载单个模块
   */
  private async preloadSingleModule(moduleCode: string): Promise<void> {
    if (this.iframes.has(moduleCode)) {
      console.log(`⚡ Module ${moduleCode} already exists`)
      return
    }

    const startTime = performance.now()
    console.log(`🔄 Preloading module: ${moduleCode}`)

    try {
      const url = appUrlManager.getAppUrl(moduleCode)
      if (!url) {
        console.warn(`⚠️ No URL found for module: ${moduleCode}`)
        return
      }

      const iframe = this.createIframe(moduleCode)
      const moduleConfig = getAllModuleConfigs().find(m => m.code === moduleCode)

      // 创建实例记录
      const instance: IframeInstance = {
        iframe,
        moduleCode,
        moduleName: moduleConfig?.name || moduleCode,
        isLoaded: false,
        isVisible: false,
        loadTime: 0,
        loadStartTime: startTime,
        url
      }

      this.iframes.set(moduleCode, instance)

      // 设置加载监听
      iframe.onload = () => {
        const loadTime = performance.now() - startTime
        instance.isLoaded = true
        instance.loadTime = loadTime
        this.loadedCount++

        console.log(`✅ Module ${moduleCode} (${instance.moduleName}) loaded in ${loadTime.toFixed(2)}ms [${this.loadedCount}/${this.totalCount}]`)

        // 发送认证数据
        this.sendAuthData(iframe)

        // 触发进度事件
        this.onPreloadProgress(this.loadedCount, this.totalCount)
      }

      iframe.onerror = () => {
        console.error(`❌ Failed to load module: ${moduleCode}`)
        this.iframes.delete(moduleCode)
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }

      // 开始加载（使用带token的URL）
      this.buildUrlWithToken(url, moduleCode).then(urlWithToken => {
        iframe.src = urlWithToken
      })
      this.container?.appendChild(iframe)

    } catch (error) {
      console.error(`❌ Preload error for ${moduleCode}:`, error)
    }
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 预加载进度回调
   */
  private onPreloadProgress(loaded: number, total: number) {
    const progress = Math.round((loaded / total) * 100)
    console.log(`📊 Preload progress: ${progress}% (${loaded}/${total})`)

    // 可以触发全局事件
    window.dispatchEvent(new CustomEvent('iframe-preload-progress', {
      detail: { loaded, total, progress }
    }))

    if (loaded === total) {
      console.log('🎉 ALL modules preloaded successfully!')
      window.dispatchEvent(new CustomEvent('iframe-preload-complete', {
        detail: { totalModules: total, loadedModules: loaded }
      }))
    }
  }

  /**
   * 创建 iframe 元素
   */
  private createIframe(moduleCode: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe')
    iframe.id = `iframe-${moduleCode}`
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: none;
    `
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-downloads')
    iframe.setAttribute('allow', 'fullscreen')
    iframe.setAttribute('loading', 'eager')
    iframe.setAttribute('importance', 'high')

    return iframe
  }

  /**
   * 验证认证数据（token已通过URL传递）
   */
  private sendAuthData(iframe: HTMLIFrameElement) {
    try {
      console.log('🔗 [iframe-manager] Auth data already passed via URL to iframe:', iframe.src)

      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (!token || !user) {
        console.warn('⚠️ [iframe-manager] No auth data available:', {
          hasToken: !!token,
          hasUser: !!user,
          userLogin: user?.login
        })
        return
      }

      console.log('✅ [iframe-manager] Auth data available and passed via URL:', {
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: user?.login,
        iframeSrc: iframe.src
      })
    } catch (error) {
      console.error('❌ [iframe-manager] Failed to verify auth data:', error)
    }
  }

  /**
   * 构建带token的URL
   */
  private async buildUrlWithToken(baseUrl: string, moduleCode: string): Promise<string> {
    try {
      const token = authService.getToken()

      if (token) {
        const { appUrlManager } = await import('@/config/module-urls.config')
        const tokenParam = appUrlManager.getTokenParam()
        const separator = baseUrl.includes('?') ? '&' : '?'
        const finalUrl = `${baseUrl}${separator}${tokenParam}=${token}&vue_auth=true&module=${moduleCode}&t=${Date.now()}`

        console.log('🔗 [iframe-manager] Built URL with token for preload:', {
          moduleCode,
          baseUrl,
          hasToken: !!token,
          tokenLength: token.length,
          finalUrl: finalUrl.substring(0, 100) + '...'
        })

        return finalUrl
      }
    } catch (error) {
      console.warn('Failed to add token to iframe URL:', error)
    }

    return baseUrl
  }

  /**
   * 向所有已加载的iframe发送认证数据更新
   * 用于登录成功后通知所有模块
   */
  public broadcastAuthUpdate() {
    try {
      console.log('🚀 [iframe-manager] Starting auth update broadcast...')

      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (!token || !user) {
        console.warn('⚠️ [iframe-manager] No auth data available for broadcast:', {
          hasToken: !!token,
          hasUser: !!user,
          userLogin: user?.login
        })
        return
      }

      const serializableUser = {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions
      }

      const authData = {
        token,
        user: serializableUser,
        timestamp: Date.now()
      }

      console.log('🔐 [iframe-manager] Broadcasting auth data:', {
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: serializableUser.login,
        tenantId: serializableUser.tenantId,
        permissionsCount: serializableUser.permissions?.length || 0,
        timestamp: authData.timestamp,
        totalIframes: this.iframes.size
      })

      console.log(`🔗 [iframe-manager] Auth data already passed via URL to all iframes:`, {
        totalModules: this.iframes.size,
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: serializableUser.login,
        tenantId: serializableUser.tenantId
      })

      // 认证数据已通过URL参数传递给所有iframe，无需postMessage
      this.iframes.forEach((instance, moduleCode) => {
        console.log(`✅ [iframe-manager] Module ${moduleCode} should have auth data via URL:`, {
          isLoaded: instance.isLoaded,
          src: instance.iframe.src
        })
      })
    } catch (error) {
      console.error('❌ [iframe-manager] Failed to broadcast auth update:', error)
    }
  }

  /**
   * 显示模块（无缝切换）
   */
  async showModule(moduleCode: string, targetContainer: HTMLElement): Promise<number> {
    const startTime = performance.now()
    console.log(`⚡ Seamless switching to module: ${moduleCode}`)

    const instance = this.iframes.get(moduleCode)

    if (instance && instance.isLoaded) {
      // 使用预加载的 iframe - 无缝切换！
      console.log(`🚀 SEAMLESS switch to preloaded module: ${moduleCode}`)

      // 先准备新的 iframe
      this.prepareIframe(instance.iframe, targetContainer)

      // 等待一帧确保 DOM 更新
      await this.nextFrame()

      // 显示新的 iframe
      this.showIframe(instance.iframe)

      // 等待新 iframe 完全显示后再隐藏旧的
      await this.nextFrame()

      // 隐藏之前的模块
      this.hideCurrentModule()

      instance.isVisible = true
      this.currentModule = moduleCode

      const switchTime = performance.now() - startTime
      console.log(`✅ Module ${moduleCode} switched seamlessly in ${switchTime.toFixed(2)}ms`)
      return switchTime

    } else if (instance && !instance.isLoaded) {
      // 模块正在加载中
      console.log(`⏳ Module ${moduleCode} is still loading, waiting...`)
      return this.waitForModuleLoad(instance, targetContainer, startTime)

    } else {
      // 模块不存在，可能是配置问题
      console.error(`❌ Module ${moduleCode} not found in preload cache`)
      throw new Error(`Module ${moduleCode} not available`)
    }
  }

  /**
   * 等待模块加载完成
   */
  private async waitForModuleLoad(instance: IframeInstance, targetContainer: HTMLElement, startTime: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (instance.isLoaded) {
          clearInterval(checkInterval)

          // 移动并显示
          this.moveToContainer(instance.iframe, targetContainer)
          this.showIframe(instance.iframe)

          instance.isVisible = true
          this.currentModule = instance.moduleCode

          const totalTime = performance.now() - startTime
          console.log(`✅ Module ${instance.moduleCode} loaded and shown in ${totalTime.toFixed(2)}ms`)
          resolve(totalTime)
        }
      }, 50) // 每50ms检查一次

      // 30秒超时
      setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error(`Timeout waiting for module ${instance.moduleCode} to load`))
      }, 30000)
    })
  }

  /**
   * 准备 iframe（预先移动到容器但保持隐藏）
   */
  private prepareIframe(iframe: HTMLIFrameElement, targetContainer: HTMLElement) {
    // 移动到目标容器
    if (iframe.parentNode !== targetContainer) {
      targetContainer.appendChild(iframe)
    }

    // 设置为隐藏但准备好的状态
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      z-index: 1;
      transition: opacity 0.15s ease-in-out;
    `
  }

  /**
   * 显示 iframe（淡入效果）
   */
  private showIframe(iframe: HTMLIFrameElement) {
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      position: relative;
      top: 0;
      left: 0;
      opacity: 1;
      z-index: 2;
      transition: opacity 0.15s ease-in-out;
    `
  }

  /**
   * 等待下一帧
   */
  private nextFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve)
      })
    })
  }

  /**
   * 按需加载模块
   */
  private async loadModuleOnDemand(moduleCode: string, targetContainer: HTMLElement, startTime: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const iframe = this.createIframe(moduleCode)
      const url = appUrlManager.getAppUrl(moduleCode)

      if (!url) {
        reject(new Error(`No URL found for module: ${moduleCode}`))
        return
      }

      const instance: IframeInstance = {
        iframe,
        moduleCode,
        isLoaded: false,
        isVisible: true,
        loadTime: 0,
        lastUsed: Date.now()
      }

      iframe.onload = () => {
        const loadTime = performance.now() - startTime
        instance.isLoaded = true
        instance.loadTime = loadTime

        console.log(`✅ Module ${moduleCode} loaded on demand in ${loadTime.toFixed(2)}ms`)

        // 发送认证数据
        this.sendAuthData(iframe)

        // 显示 iframe
        iframe.style.display = 'block'
        this.currentModule = moduleCode

        resolve(loadTime)
      }

      iframe.onerror = () => {
        reject(new Error(`Failed to load module: ${moduleCode}`))
      }

      // 设置超时
      setTimeout(() => {
        if (!instance.isLoaded) {
          reject(new Error(`Load timeout for module: ${moduleCode}`))
        }
      }, 15000)

      // 添加到缓存和容器
      this.iframes.set(moduleCode, instance)
      targetContainer.appendChild(iframe)
      // 使用带token的URL进行按需加载
      this.buildUrlWithToken(url, moduleCode).then(urlWithToken => {
        iframe.src = urlWithToken
      })
    })
  }

  /**
   * 隐藏当前显示的模块（延迟隐藏，避免白屏）
   */
  private hideCurrentModule() {
    if (!this.currentModule) return

    const instance = this.iframes.get(this.currentModule)
    if (instance && instance.isVisible) {
      const oldModuleCode = this.currentModule
      console.log(`🙈 Hiding previous module: ${oldModuleCode}`)

      // 淡出效果
      this.fadeOutIframe(instance.iframe)

      // 延迟移回全局容器，确保淡出完成
      setTimeout(() => {
        if (this.container && instance.iframe.parentNode !== this.container) {
          this.container.appendChild(instance.iframe)
        }
        this.hideIframe(instance.iframe)
      }, 150) // 与 CSS transition 时间一致

      instance.isVisible = false
    }

    // 注意：这里不立即设置 currentModule = null，因为新模块已经设置了
  }

  /**
   * 淡出 iframe
   */
  private fadeOutIframe(iframe: HTMLIFrameElement) {
    iframe.style.opacity = '0'
    iframe.style.zIndex = '0'
  }

  /**
   * 隐藏 iframe（完全隐藏）
   */
  private hideIframe(iframe: HTMLIFrameElement) {
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: none;
      position: absolute;
      opacity: 0;
      z-index: -1;
    `
  }

  /**
   * 清理缓存
   */
  private cleanupCache() {
    if (this.iframes.size <= this.maxCacheSize) return

    // 按最后使用时间排序，删除最久未使用的
    const sorted = Array.from(this.iframes.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)

    const toRemove = sorted.slice(0, sorted.length - this.maxCacheSize)

    toRemove.forEach(([moduleCode, instance]) => {
      if (instance.iframe.parentNode) {
        instance.iframe.parentNode.removeChild(instance.iframe)
      }
      this.iframes.delete(moduleCode)
      console.log(`🗑️ Removed cached iframe: ${moduleCode}`)
    })
  }

  /**
   * 获取全局统计信息
   */
  getStats() {
    const stats = {
      totalModules: this.totalCount,
      loadedModules: this.loadedCount,
      loadProgress: Math.round((this.loadedCount / this.totalCount) * 100),
      currentModule: this.currentModule,
      allModules: this.allModules,
      modules: {} as Record<string, any>
    }

    this.iframes.forEach((instance, moduleCode) => {
      stats.modules[moduleCode] = {
        name: instance.moduleName,
        isLoaded: instance.isLoaded,
        isVisible: instance.isVisible,
        loadTime: instance.loadTime,
        url: instance.url,
        loadStartTime: new Date(instance.loadStartTime).toLocaleTimeString()
      }
    })

    return stats
  }

  /**
   * 获取预加载进度
   */
  getPreloadProgress() {
    return {
      loaded: this.loadedCount,
      total: this.totalCount,
      progress: Math.round((this.loadedCount / this.totalCount) * 100),
      isComplete: this.loadedCount === this.totalCount
    }
  }

  /**
   * 检查模块是否已加载
   */
  isModuleLoaded(moduleCode: string): boolean {
    const instance = this.iframes.get(moduleCode)
    return instance ? instance.isLoaded : false
  }

  /**
   * 检查模块是否正在显示
   */
  isModuleVisible(moduleCode: string): boolean {
    const instance = this.iframes.get(moduleCode)
    return instance ? instance.isVisible : false
  }

  /**
   * 获取当前显示的模块
   */
  getCurrentModule(): string | null {
    return this.currentModule
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.iframes.forEach(instance => {
      if (instance.iframe.parentNode) {
        instance.iframe.parentNode.removeChild(instance.iframe)
      }
    })
    this.iframes.clear()

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }

    this.currentModule = null
  }
}

// 导出全局单例
export const globalIframeManager = GlobalIframeManager.getInstance()

// 兼容性导出
export const iframeManager = globalIframeManager
