/**
 * 单 iframe 管理器
 * 一个 iframe 实例 + 路由切换，实现真正的秒开
 */

import { authService } from '@/core/auth'
import { appUrlManager } from '@/config/module-urls.config'

interface ModuleRoute {
  moduleCode: string
  route: string
  title: string
}

export class SingleIframeManager {
  private static instance: SingleIframeManager
  private iframe: HTMLIFrameElement | null = null
  private container: HTMLElement | null = null
  private isInitialized = false
  private isLoading = false
  private currentModule: string | null = null
  private initPromise: Promise<void> | null = null

  // 模块路由映射
  private moduleRoutes: Record<string, string> = {
    'cac': '#/cac',
    'jao': '#/jao',
    'sim': '#/sim',
    'uim': '#/uim',
    'gfs': '#/gfs',
    'dts': '#/dts',
    'udp': '#/udp',
    'dashboard': '#/dashboard'
  }

  private constructor() {
    this.initializeIframe()
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

        console.log(`🔗 Loading Angular app: ${this.iframe.src}`)

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
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-downloads')
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
   * 切换到指定模块（路由切换）
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

    // 获取模块路由
    const route = this.moduleRoutes[moduleCode]
    console.log(`🗺️ Available routes:`, this.moduleRoutes)
    console.log(`🎯 Target route for ${moduleCode}:`, route)

    if (!route) {
      throw new Error(`No route found for module: ${moduleCode}`)
    }

    try {
      // 移动 iframe 到目标容器
      this.moveToContainer(targetContainer)

      // 切换路由（真正的秒开！）
      await this.changeRoute(route)

      // 重新发送认证数据，确保模块切换后认证状态正确
      this.sendAuthData()

      this.currentModule = moduleCode

      const switchTime = performance.now() - startTime
      console.log(`✅ Module ${moduleCode} switched in ${switchTime.toFixed(2)}ms (ROUTE CHANGE)`)

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
   * 改变 Angular 路由
   */
  private async changeRoute(route: string): Promise<void> {
    if (!this.iframe?.contentWindow) {
      throw new Error('Iframe content window not available')
    }

    try {
      // 方法1: 直接改变 hash
      this.iframe.contentWindow.location.hash = route

      // 方法2: 通过 postMessage 通知 Angular 切换路由（备用）
      this.iframe.contentWindow.postMessage({
        type: 'route-change',
        route: route
      }, '*')

      console.log(`🔄 Route changed to: ${route}`)

      // 等待路由切换完成
      await this.waitForRouteChange()

    } catch (error) {
      console.error('Failed to change route:', error)
      throw error
    }
  }

  /**
   * 等待路由切换完成
   */
  private waitForRouteChange(): Promise<void> {
    return new Promise((resolve) => {
      // 减少等待时间，优化速度
      setTimeout(resolve, 100)
    })
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
   * 构建带认证参数的 URL（参照重构前的实现）
   */
  private buildAuthUrl(baseUrl: string): string {
    try {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        // 将认证信息保存到 sessionStorage（使用重构前的键名）
        const authData = {
          token,
          user,
          timestamp: Date.now()
        }

        sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
        console.log('🔗 Vue auth data saved for Angular app')

        // URL 中添加认证标识（参照重构前的实现）
        const separator = baseUrl.includes('?') ? '&' : '?'
        return `${baseUrl}${separator}vue_auth=true&t=${Date.now()}`
      }
    } catch (err) {
      console.warn('Failed to get auth info for URL:', err)
    }

    return baseUrl
  }

  /**
   * 发送认证数据到 Angular
   */
  private sendAuthData() {
    if (!this.iframe?.contentWindow) {
      console.warn('⚠️ Iframe content window not available')
      return
    }

    try {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      console.log('🔍 Auth data check:', {
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token?.length,
        userLogin: user?.login
      })

      if (!token || !user) {
        console.warn('⚠️ No auth data available - token or user missing')
        return
      }

      // 确保用户数据完全可序列化
      const serializableUser = {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: Array.isArray(user.permissions) ? [...user.permissions] : user.permissions
      }

      const authData = {
        token: String(token),
        user: serializableUser,
        timestamp: Date.now()
      }

      // 使用与重构前相同的 sessionStorage 键名
      sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
      sessionStorage.setItem('oplus_token', token)
      sessionStorage.setItem('oplus_user', JSON.stringify(serializableUser))

      console.log('🔐 Auth data saved to sessionStorage:', {
        'vue-auth-bridge': !!sessionStorage.getItem('vue-auth-bridge'),
        'oplus_token': !!sessionStorage.getItem('oplus_token'),
        'oplus_user': !!sessionStorage.getItem('oplus_user')
      })

      // 发送到 iframe - 使用 JSON 序列化确保数据可克隆
      const messageData = {
        type: 'vue-auth-data',
        authData: JSON.parse(JSON.stringify(authData)) // 深度克隆确保可序列化
      }

      this.iframe.contentWindow.postMessage(messageData, '*')

      console.log('🔐 Auth data sent to Angular iframe via postMessage')

    } catch (error) {
      console.error('Failed to send auth data:', error)
    }
  }

  /**
   * 隐藏 Angular 的工具栏和背景
   */
  private hideAngularUI() {
    if (!this.iframe?.contentWindow) return

    try {
      // 通过 postMessage 告诉 Angular 隐藏 UI 元素
      this.iframe.contentWindow.postMessage({
        type: 'hide-ui-elements',
        elements: ['toolbar', 'sidebar', 'background']
      }, '*')

      console.log('🎨 Requested Angular to hide UI elements')

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
   * 销毁管理器
   */
  destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }

    this.iframe = null
    this.container = null
    this.isInitialized = false
    this.currentModule = null
    this.initPromise = null
  }
}

// 导出单例
export const singleIframeManager = SingleIframeManager.getInstance()
