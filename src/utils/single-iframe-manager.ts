/**
 * 单 iframe 管理器
 * 一个 iframe 实例 + 路由切换，实现真正的秒开
 */

import { authService } from '@/core/auth'
import { appUrlManager } from '@/config/module-urls.config'
import {
  debounce,
  shouldReloadIframe,
  safeSetIframeSrc,
  iframeOperationQueue,
  cleanupIframeResources
} from './iframe-resource-fix'



export class SingleIframeManager {
  private static instance: SingleIframeManager
  private iframe: HTMLIFrameElement | null = null
  private container: HTMLElement | null = null
  private isInitialized = false
  private isLoading = false
  private currentModule: string | null = null
  private initPromise: Promise<void> | null = null
  private lastUrl: string | null = null

  // 模块路由映射
  private moduleRoutes: Record<string, string> = {
    'gfs': '#/gfs',           // 脚本
    'jao': '#/jao',           // 作业
    'cmd': '#/cmd',           // 命令
    'cac': '#/cac',           // 系统巡检
    'password': '#/password', // 密码管理
    'sudo': '#/sudo',         // sudo权限管理
    'acm': '#/acm',           // 资产管理
    'patches': '#/patches',   // 补丁管理
    'software': '#/software', // 软件管理
    'flow': '#/flow',         // 流程管理
    'workflow': '#/flow',     // 流程管理（别名）
    'users': '#/users',       // 用户管理
    'dashboard': '#/dashboard'
  }

  private constructor() {
    // 不再自动初始化iframe，只在需要时初始化
    // this.initializeIframe()
  }

  static getInstance(): SingleIframeManager {
    if (!this.instance) {
      this.instance = new SingleIframeManager()
    }
    return this.instance
  }

  /**
   * 初始化单一 iframe
   */
  private async initializeIframe(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('🚀 Initializing single iframe for Angular app...')

        // 创建 iframe
        this.iframe = this.createIframe()

        // 创建隐藏容器
        this.container = this.createContainer()
        this.container.appendChild(this.iframe)

        // 设置加载监听
        this.iframe.onload = () => {
          console.log('✅ Angular iframe loaded successfully')
          this.isInitialized = true
          this.isLoading = false

          // 发送认证数据
          this.sendAuthData()

          // 隐藏 Angular 的工具栏和背景
          this.hideAngularUI()

          resolve()
        }

        this.iframe.onerror = () => {
          console.error('❌ Failed to load Angular iframe')
          this.isLoading = false
          reject(new Error('Failed to load Angular iframe'))
        }

        // 开始加载 Angular 应用（默认到 dashboard）
        const baseUrl = appUrlManager.getAngularBaseUrl()
        const authUrl = this.buildAuthUrl(`${baseUrl}/#/dashboard`)
        this.iframe.src = authUrl
        this.isLoading = true

        console.log(`🔗 Loading Angular app:`)
        console.log(`   Base URL: ${baseUrl}`)
        console.log(`   Auth URL: ${authUrl}`)
        console.log(`   Final iframe src: ${this.iframe.src}`)

      } catch (error) {
        console.error('❌ Initialize iframe error:', error)
        reject(error)
      }
    })

    return this.initPromise
  }

  /**
   * 创建 iframe 元素
   */
  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe')
    iframe.id = 'angular-main-iframe'
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms')
    iframe.setAttribute('allow', 'fullscreen')
    iframe.setAttribute('loading', 'eager')
    iframe.setAttribute('importance', 'high')

    return iframe
  }

  /**
   * 创建容器
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'angular-iframe-container'
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      pointer-events: none;
    `
    document.body.appendChild(container)
    return container
  }

  /**
   * 切换到指定模块（优化版本 - 减少不必要的重新加载）
   */
  async switchToModule(moduleCode: string, targetContainer: HTMLElement): Promise<number> {
    const startTime = performance.now()
    console.log(`⚡ Switching to module: ${moduleCode}`)
    console.log(`📍 Target container:`, targetContainer)
    console.log(`🔧 Manager state:`, {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      currentModule: this.currentModule,
      hasIframe: !!this.iframe
    })



    // 确保 iframe 已初始化
    await this.ensureInitialized()

    if (!this.iframe) {
      throw new Error('Iframe not initialized')
    }

    try {
      // 使用appUrlManager获取完整的应用URL
      const fullUrl = appUrlManager.getAppUrl(moduleCode)
      if (!fullUrl) {
        throw new Error(`App URL not found for module: ${moduleCode}`)
      }

      console.log(`🔗 Module URL generation:`)
      console.log(`   Module code: ${moduleCode}`)
      console.log(`   Generated URL: ${fullUrl}`)

      // 构建带认证的URL
      const authUrl = this.buildAuthUrl(fullUrl)
      console.log(`   Auth URL: ${authUrl}`)

      // 移动 iframe 到目标容器
      this.moveToContainer(targetContainer)

      // 优化：只有URL真正改变时才重新加载
      if (shouldReloadIframe(this.lastUrl || '', authUrl)) {
        console.log(`🔄 URL changed, updating iframe src safely...`)

        // 使用队列化操作，避免并发冲突
        await iframeOperationQueue.add(async () => {
          if (this.iframe) {
            await safeSetIframeSrc(this.iframe, authUrl)
            this.lastUrl = authUrl
          }
        })

      } else {
        console.log(`⚡ Same URL, skipping reload for better performance`)
      }

      // 重新发送认证数据，确保模块切换后认证状态正确
      this.sendAuthData()

      this.currentModule = moduleCode

      const switchTime = performance.now() - startTime
      console.log(`✅ Module ${moduleCode} switched in ${switchTime.toFixed(2)}ms (OPTIMIZED)`)

      return switchTime

    } catch (error) {
      console.error(`❌ Failed to switch to module ${moduleCode}:`, error)
      throw error
    }
  }

  /**
   * 确保 iframe 已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.isLoading) {
      // 正在加载中，等待完成
      await this.initPromise
      return
    }

    // 重新初始化
    await this.initializeIframe()
  }



  /**
   * 移动 iframe 到目标容器
   */
  private moveToContainer(targetContainer: HTMLElement) {
    if (!this.iframe) {
      console.error('❌ No iframe to move')
      return
    }

    console.log(`📦 Moving iframe to container:`, {
      currentParent: this.iframe.parentNode,
      targetContainer: targetContainer,
      needsMove: this.iframe.parentNode !== targetContainer,
      targetContainerRect: targetContainer.getBoundingClientRect()
    })

    if (this.iframe.parentNode !== targetContainer) {
      targetContainer.appendChild(this.iframe)
      console.log(`✅ Iframe moved to new container`)
    } else {
      console.log(`ℹ️ Iframe already in target container`)
    }

    // 显示 iframe
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      pointer-events: auto;
      background: white;
    `

    console.log(`🎨 Iframe styles applied:`, {
      width: this.iframe.style.width,
      height: this.iframe.style.height,
      display: this.iframe.style.display,
      src: this.iframe.src,
      parentNode: this.iframe.parentNode === targetContainer ? 'correct' : 'wrong'
    })

    // 验证 iframe 是否真的可见
    const iframeRect = this.iframe.getBoundingClientRect()
    console.log(`📏 Iframe dimensions after move:`, {
      width: iframeRect.width,
      height: iframeRect.height,
      visible: iframeRect.width > 0 && iframeRect.height > 0,
      top: iframeRect.top,
      left: iframeRect.left
    })
  }

  /**
   * 构建带认证参数的 URL（支持token参数传递）
   */
  private buildAuthUrl(baseUrl: string): string {
    try {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        console.log('🔗 Building URL with token for Angular app')

        // URL 中添加认证参数，包括token（使用配置的参数名）
        const separator = baseUrl.includes('?') ? '&' : '?'
        const tokenParam = appUrlManager.getTokenParam()
        const urlPrefix = appUrlManager.getUrlPrefix()

        const params = new URLSearchParams({
          [tokenParam]: token,
          vue_auth: 'true',
          t: Date.now().toString()
        })

        // URL前缀应该只用于特殊情况，这里暂时不使用
        // 直接使用原始baseUrl，确保URL格式正确
        let finalBaseUrl = baseUrl

        const finalUrl = `${finalBaseUrl}${separator}${params.toString()}`
        console.log('🔗 Built auth URL with token and prefix:', {
          originalBaseUrl: baseUrl,
          finalBaseUrl,
          urlPrefix,
          tokenParam,
          hasToken: !!token,
          tokenLength: token.length,
          finalUrl: finalUrl.substring(0, 100) + '...' // 只显示前100个字符用于调试
        })

        return finalUrl
      }
    } catch (err) {
      console.warn('Failed to get auth info for URL:', err)
    }

    return baseUrl
  }

  /**
   * 验证认证状态（token已通过URL传递，无需postMessage）
   */
  private sendAuthData() {
    console.log(`� [SingleIframeManager] Auth data already passed via URL for module: ${this.currentModule}`)

    // 认证数据已通过URL参数传递给iframe，无需额外处理
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      console.log('✅ [SingleIframeManager] Auth data available and passed via URL:', {
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: user?.login,
        currentModule: this.currentModule
      })
    } else {
      console.warn('⚠️ [SingleIframeManager] No auth data available:', {
        hasToken: !!token,
        hasUser: !!user,
        currentModule: this.currentModule
      })
    }
  }

  /**
   * 隐藏 Angular 的工具栏和背景（通过CSS样式）
   */
  private hideAngularUI() {
    if (!this.iframe?.contentWindow) return

    try {
      // Angular应用应该通过URL参数自行处理UI隐藏
      console.log('🎨 Angular UI hiding should be handled by the Angular app based on URL parameters')

    } catch (error) {
      console.error('Failed to hide Angular UI:', error)
    }
  }

  /**
   * 获取当前模块
   */
  getCurrentModule(): string | null {
    return this.currentModule
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      currentModule: this.currentModule,
      iframeReady: !!this.iframe,
      availableRoutes: Object.keys(this.moduleRoutes)
    }
  }



  /**
   * 清理容器中的iframe
   */
  clearContainer(container: HTMLElement) {
    try {
      // 移除所有iframe子元素
      const iframes = container.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        if (iframe !== this.iframe) {
          iframe.remove()
          console.log('🗑️ Removed orphaned iframe from container')
        }
      })
    } catch (error) {
      console.error('❌ Failed to clear container:', error)
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    // 清理iframe资源
    if (this.iframe) {
      cleanupIframeResources(this.iframe)

      if (this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe)
      }
    }

    // 移除容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }

    // 重置状态
    this.iframe = null
    this.container = null
    this.isInitialized = false
    this.currentModule = null
    this.initPromise = null
    this.lastUrl = null

    console.log('🧹 SingleIframeManager destroyed')
  }
}

// 导出单例
export const singleIframeManager = SingleIframeManager.getInstance()
