/**
 * 单 iframe 管理器
 * 一个 iframe 实例 + 路由切换，实现真正的秒开
 */

import { authService } from '@/core/auth'
import { appUrlManager } from '@/config/module-urls.config'
import {
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
  private modulesRequiringFullReload = new Set<string>()
  private modulesWithHashNavigationIssues = new Set<string>(['gfs', 'cmd'])
  private parseUrl(url: string | null): URL | null {
    if (!url) {
      return null
    }

    try {
      return new URL(url, window.location.origin)
    } catch (error) {
      console.warn('⚠️ Failed to parse iframe URL:', {
        url,
        error
      })
      return null
    }
  }

  private normalizeHashFragment(fragment: string): string {
    if (!fragment) {
      return ''
    }

    const trimmed = fragment.trim()
    if (!trimmed) {
      return ''
    }

    return trimmed.startsWith('#') ? trimmed.substring(1) : trimmed
  }

  private extractHashFragment(moduleUrl: string): string {
    const hashIndex = moduleUrl.indexOf('#')
    if (hashIndex === -1) {
      return ''
    }

    const fragment = moduleUrl.substring(hashIndex + 1)
    return this.normalizeHashFragment(fragment)
  }

  private resolveBaseUrl(moduleUrl: string): URL | null {
    try {
      const [basePart] = moduleUrl.split('#')
      const normalizedBase = basePart || '/'
      const resolved = new URL(normalizedBase, window.location.origin)
      resolved.hash = ''
      resolved.search = ''
      return resolved
    } catch (error) {
      console.error('❌ Failed to resolve base URL for module:', {
        moduleUrl,
        error
      })
      return null
    }
  }

  private composeModuleEntryUrl(baseUrl: string, routeFragment: string): string {
    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const normalizedRoute = routeFragment
      ? routeFragment.startsWith('#')
        ? routeFragment
        : routeFragment.startsWith('/')
          ? `#${routeFragment}`
          : `#/${routeFragment}`
      : ''

    if (!trimmedBase) {
      return normalizedRoute || '/'
    }

    return `${trimmedBase}${normalizedRoute}`
  }

  private shouldForceReload(moduleCode: string, hashFragment: string): boolean {
    if (this.modulesWithHashNavigationIssues.has(moduleCode)) {
      return true
    }

    if (this.modulesRequiringFullReload.has(moduleCode)) {
      return true
    }

    const normalizedHash = this.normalizeHashFragment(hashFragment)
    if (!normalizedHash) {
      return false
    }

    // AngularJS 的 apw 子应用在 hash 导航下经常出现视图未刷新问题
    if (this.isApwRoute(normalizedHash)) {
      this.modulesRequiringFullReload.add(moduleCode)
      return true
    }

    const currentResolved = this.parseUrl(this.lastUrl)
    const currentHash = currentResolved?.hash
      ? this.normalizeHashFragment(currentResolved.hash)
      : ''

    // apw 与 非 apw 模块之间切换时也强制刷新，避免残留状态
    if (this.isApwRoute(currentHash) !== this.isApwRoute(normalizedHash)) {
      return true
    }

    return false
  }

  private markModuleForReload(moduleCode: string) {
    if (!this.modulesRequiringFullReload.has(moduleCode)) {
      console.warn(`⚠️ Marking module ${moduleCode} for full reload due to navigation fallback`)
      this.modulesRequiringFullReload.add(moduleCode)
    }
  }

  private isApwRoute(fragment: string): boolean {
    const normalized = this.normalizeHashFragment(fragment)
    if (!normalized) {
      return false
    }

    const withoutSlash = normalized.startsWith('/') ? normalized.slice(1) : normalized
    return withoutSlash.startsWith('apw/')
  }

  private navigateWithinIframe(moduleCode: string, hashFragment: string): void {
    if (!this.iframe?.contentWindow) {
      console.warn('⚠️ Iframe contentWindow not available for hash navigation')
      return
    }

    const normalizedHash = this.ensureHashPrefix(hashFragment)
    const iframeWindow = this.iframe.contentWindow

    const angularHandled = this.tryAngularLocationNavigation(iframeWindow, normalizedHash)
    if (angularHandled) {
      this.syncIframeHash(iframeWindow, normalizedHash)
      return
    }

    this.markModuleForReload(moduleCode)

    const alreadyMatched = iframeWindow.location.hash === normalizedHash

    console.log('🧭 Navigating within iframe via hash update:', {
      from: iframeWindow.location.hash,
      to: normalizedHash,
      alreadyMatched
    })

    if (!alreadyMatched) {
      iframeWindow.location.hash = normalizedHash
    } else {
      this.dispatchHashChange(iframeWindow)
    }
  }

  private updateLastUrlHash(hashFragment: string): void {
    if (!this.lastUrl) {
      return
    }

    const resolved = this.parseUrl(this.lastUrl)
    if (!resolved) {
      return
    }

    resolved.hash = hashFragment
      ? hashFragment.startsWith('#')
        ? hashFragment
        : `#${hashFragment}`
      : ''

    this.lastUrl = resolved.toString()
  }

  private ensureHashPrefix(fragment: string): string {
    if (!fragment) {
      return ''
    }

    if (fragment.startsWith('#')) {
      return fragment
    }

    return fragment.startsWith('/') ? `#${fragment}` : `#/${fragment}`
  }

  private parseHashForNavigation(hash: string): {
    path: string
    search: Record<string, string | string[]>
  } {
    const cleaned = hash.replace(/^#!/, '').replace(/^#/, '')
    const [rawPath, rawQuery = ''] = cleaned.split('?')
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

    const params = new URLSearchParams(rawQuery)
    const search: Record<string, string | string[]> = {}

    params.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(search, key)) {
        const current = search[key]
        if (Array.isArray(current)) {
          current.push(value)
        } else {
          search[key] = [current, value]
        }
      } else {
        search[key] = value
      }
    })

    return { path: normalizedPath, search }
  }

  private areSearchParamsEqual(
    current: Record<string, unknown>,
    target: Record<string, string | string[]>
  ): boolean {
    const normalize = (input: Record<string, unknown> | Record<string, string | string[]>) => {
      const result: Record<string, string[]> = {}

      Object.keys(input).forEach(key => {
        const value = input[key]

        if (Array.isArray(value)) {
          result[key] = [...value].map(item => String(item)).sort()
        } else if (value === undefined || value === null) {
          result[key] = []
        } else {
          result[key] = [String(value)]
        }
      })

      return result
    }

    const a = normalize(current)
    const b = normalize(target)

    const keys = new Set([...Object.keys(a), ...Object.keys(b)])

    for (const key of keys) {
      const aValues = a[key] || []
      const bValues = b[key] || []

      if (aValues.length !== bValues.length) {
        return false
      }

      for (let i = 0; i < aValues.length; i += 1) {
        if (aValues[i] !== bValues[i]) {
          return false
        }
      }
    }

    return true
  }

  private tryAngularLocationNavigation(iframeWindow: Window, targetHash: string): boolean {
    try {
      const angularGlobal = (iframeWindow as any).angular
      if (!angularGlobal?.element) {
        console.log('ℹ️ AngularJS global not ready, falling back to hash navigation')
        return false
      }

      const injector = angularGlobal.element(iframeWindow.document.body).injector?.()
      if (!injector?.get) {
        console.log('ℹ️ AngularJS injector not available yet, falling back to hash navigation')
        return false
      }

      const $location = injector.get('$location')
      const $rootScope = injector.get('$rootScope')

      if (!$location || typeof $location.path !== 'function') {
        console.log('ℹ️ AngularJS $location service missing or invalid, falling back to hash navigation')
        return false
      }

      const { path, search } = this.parseHashForNavigation(targetHash)
      const currentPath = $location.path?.()
      const currentSearch = $location.search?.() || {}

      const pathChanged = currentPath !== path
      const searchChanged = !this.areSearchParamsEqual(currentSearch, search)

      if (!pathChanged && !searchChanged) {
        console.log('ℹ️ AngularJS already on target route', {
          path,
          search
        })
        return true
      }

      console.log('🛣️ Triggering AngularJS route navigation via $location', {
        fromPath: currentPath,
        toPath: path,
        search
      })

      $location.path(path)
      $location.search(search)
      $rootScope?.$applyAsync?.()

      return true
    } catch (error) {
      console.warn('⚠️ Failed to drive AngularJS navigation directly:', error)
      return false
    }
  }

  private syncIframeHash(iframeWindow: Window, targetHash: string): void {
    if (iframeWindow.location.hash !== targetHash) {
      iframeWindow.location.hash = targetHash
    } else {
      this.dispatchHashChange(iframeWindow)
    }
  }

  private dispatchHashChange(iframeWindow: Window): void {
    try {
      const event = new HashChangeEvent('hashchange', {
        newURL: iframeWindow.location.href,
        oldURL: iframeWindow.location.href
      })
      const typedWindow = iframeWindow as Window & {
        dispatchEvent(event: Event): boolean
      }
      typedWindow.dispatchEvent(event as unknown as Event)
    } catch (error) {
      console.warn('⚠️ Failed to dispatch synthetic hashchange event:', error)
    }
  }

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
  private async initializeIframe(initialUrl?: string, initialModuleCode?: string): Promise<void> {
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

          // 隐藏 Angular 的工具栏和背景
          this.hideAngularUI()

          resolve()
        }

        this.iframe.onerror = () => {
          console.error('❌ Failed to load Angular iframe')
          this.isLoading = false
          reject(new Error('Failed to load Angular iframe'))
        }

        const baseUrl = appUrlManager.getAngularBaseUrl()
        const defaultRoute = this.moduleRoutes.dashboard || '#/dashboard'
        const fallbackEntryUrl = this.composeModuleEntryUrl(baseUrl, defaultRoute)
        const targetEntryUrl = initialUrl || fallbackEntryUrl
        const authUrl = this.buildAuthUrl(targetEntryUrl)

        // 检查 sessionStorage 中是否有 oplus-base-uaa（Angular 认证信息）
        // 如果没有，说明是首次登录，需要等待 Vue 端同步认证信息到 sessionStorage
        const hasAngularAuth = !!sessionStorage.getItem('oplus-base-uaa')
        if (!hasAngularAuth) {
          console.log('⏳ No oplus-base-uaa found, waiting 2.5s for auth sync...')
          await new Promise(resolve => setTimeout(resolve, 2500))
          console.log('✅ Auth sync delay completed, proceeding with iframe load')
        }

        this.iframe.src = authUrl.toString()
        this.lastUrl = authUrl.toString()
        this.currentModule = initialModuleCode ?? 'dashboard'
        this.isLoading = true

        const rawRoute = this.extractHashFragment(targetEntryUrl)
        const displayedRoute = rawRoute ? `#${rawRoute}` : targetEntryUrl

        console.log(`🔗 Loading Angular app:`)
        console.log(`   Base URL: ${baseUrl}`)
        console.log(`   Route: ${displayedRoute}`)
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
    // Permit sandboxed Angular modules to trigger downloads/popups when exporting data
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-scripts allow-forms allow-downloads allow-popups'
    )
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
    console.log(`🔧 Manager state:`, {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      currentModule: this.currentModule,
      hasIframe: !!this.iframe
    })

    try {
      const fullUrl = appUrlManager.getAppUrl(moduleCode)
      if (!fullUrl) {
        throw new Error(`App URL not found for module: ${moduleCode}`)
      }

      // 确保 iframe 已初始化（首个模块直接加载目标页面）
      await this.ensureInitialized(fullUrl, moduleCode)

      if (!this.iframe) {
        throw new Error('Iframe not initialized')
      }

      console.log(`🔗 Module URL generation:`)
      console.log(`   Module code: ${moduleCode}`)
      console.log(`   Generated URL: ${fullUrl}`)

      const targetBaseUrl = this.resolveBaseUrl(fullUrl)
      if (!targetBaseUrl) {
        throw new Error(`Failed to resolve base URL for module: ${moduleCode}`)
      }

      const targetHashFragment = this.extractHashFragment(fullUrl)
      const mustForceReload = this.shouldForceReload(moduleCode, targetHashFragment)
      const currentResolvedUrl = this.parseUrl(this.lastUrl)
      const currentBaseSignature = currentResolvedUrl
        ? `${currentResolvedUrl.origin}${currentResolvedUrl.pathname}`
        : null
      const targetBaseSignature = `${targetBaseUrl.origin}${targetBaseUrl.pathname}`
      const needsFullReload =
        mustForceReload || !currentResolvedUrl || currentBaseSignature !== targetBaseSignature
      const currentHashFragment = currentResolvedUrl?.hash
        ? this.normalizeHashFragment(currentResolvedUrl.hash)
        : ''
      const hashChanged = currentHashFragment !== this.normalizeHashFragment(targetHashFragment)

      console.log('🧪 Navigation decision:', {
        needsFullReload,
        mustForceReload,
        hashChanged,
        currentBaseSignature,
        targetBaseSignature,
        currentHashFragment,
        targetHashFragment: this.normalizeHashFragment(targetHashFragment)
      })

      // 移动 iframe 到目标容器
      this.moveToContainer(targetContainer)

      if (needsFullReload) {
        console.log(`🔄 Performing full iframe reload for module ${moduleCode}`)

        const authUrl = this.buildAuthUrl(fullUrl)

        this.isLoading = true

        try {
          await iframeOperationQueue.add(async () => {
            if (this.iframe) {
              await safeSetIframeSrc(this.iframe, authUrl.toString())
            }
          })

          this.lastUrl = authUrl.toString()
          this.currentModule = moduleCode
          this.sendAuthData()
        } finally {
          this.isLoading = false
        }
      } else if (hashChanged) {
        console.log(`⚡ Fast navigation within iframe for module ${moduleCode}`)
        this.navigateWithinIframe(moduleCode, targetHashFragment)
        this.updateLastUrlHash(targetHashFragment)
        this.currentModule = moduleCode
      } else {
        console.log(`ℹ️ Module ${moduleCode} already active, no navigation needed`)
        this.currentModule = moduleCode
      }

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
  private async ensureInitialized(initialUrl?: string, initialModuleCode?: string): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.isLoading) {
      // 正在加载中，等待完成
      await this.initPromise
      return
    }

    // 重新初始化
    await this.initializeIframe(initialUrl, initialModuleCode)
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
  private buildAuthUrl(baseUrl: string): URL {
    try {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        console.log('🔗 Building URL with token for Angular app')

        const resolvedUrl = new URL(baseUrl, window.location.origin)
        const tokenParam = appUrlManager.getTokenParam()

        resolvedUrl.searchParams.set(tokenParam, token)
        resolvedUrl.searchParams.set('vue_auth', 'true')
        resolvedUrl.searchParams.set('t', Date.now().toString())

        return resolvedUrl
      }
    } catch (err) {
      console.warn('Failed to get auth info for URL:', err)
    }

    return new URL(baseUrl, window.location.origin)
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

  // 移除等待逻辑，改为即刻构建URL；
  // 若当下没有token，Angular端从同源storage读取

  /**
   * 隐藏 Angular 的工具栏和背景（通过CSS样式）
   */
  private hideAngularUI() {
    if (!this.iframe?.contentWindow) return
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
