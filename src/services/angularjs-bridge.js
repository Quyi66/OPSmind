/**
 * AngularJS 桥接服务
 * 用于与现有 AngularJS 应用进行数据交互
 */
export class AngularJSBridge {
  constructor() {
    this.bridge = null
    this.isReady = false
    this.initPromise = this.initBridge()
  }

  async initBridge() {
    // Vue Dashboard 作为主应用，始终使用独立模式
    console.log('🔍 Vue Dashboard running as main application')
    console.log('📍 Current URL:', window.location.href)

    // 临时使用简单的 mock 桥接，确保页面能正常加载
    this.bridge = this.createSimpleMockBridge()
    this.isReady = true
    console.log('✅ Bridge initialized successfully')
  }

  // 创建 PostMessage 桥接对象（用于 iframe 通信）
  createPostMessageBridge() {
    let requestId = 0
    const pendingRequests = new Map()

    // 监听来自父窗口的响应
    window.addEventListener('message', event => {
      if (event.data.requestId && pendingRequests.has(event.data.requestId)) {
        const { resolve, reject } = pendingRequests.get(event.data.requestId)
        if (event.data.error) {
          reject(new Error(event.data.error))
        } else {
          resolve(event.data.payload)
        }
        pendingRequests.delete(event.data.requestId)
      }
    })

    const sendRequest = (type, payload = null) => {
      return new Promise((resolve, reject) => {
        const id = ++requestId
        pendingRequests.set(id, { resolve, reject })

        window.parent.postMessage(
          {
            target: 'opsmind-dashboard',
            type: `REQUEST_${type}`,
            requestId: id,
            payload
          },
          '*'
        )

        // 设置超时
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id)
            reject(new Error(`Request timeout: ${type}`))
          }
        }, 5000)
      })
    }

    return {
      getAvailableModules: () => {
        console.log('📦 Requesting modules from parent')
        return sendRequest('MODULES')
      },
      translate: key => {
        console.log('🌐 Requesting translation for:', key)
        return sendRequest('TRANSLATION', { key })
      },
      getCurrentUser: () => {
        console.log('👤 Requesting user info from parent')
        return sendRequest('USER_INFO')
      },
      openModule: moduleCode => {
        console.log('🚀 Opening module:', moduleCode)
        window.parent.postMessage(
          {
            target: 'opsmind-dashboard',
            type: 'OPEN_MODULE',
            payload: { moduleCode }
          },
          '*'
        )
      },
      getSystemStats: () => {
        console.log('📊 Requesting stats from parent')
        return sendRequest('STATS')
      }
    }
  }

  // 创建简单的 mock 桥接（确保快速加载）
  createSimpleMockBridge() {
    return {
      getAvailableModules: async () => {
        try {
          const { apiService } = await import('./api.js')
          const applets = await apiService.getApplets()
          return apiService.convertAppletsToModules(applets)
        } catch (error) {
          console.warn('Failed to get real modules, using defaults:', error)
          const { apiService } = await import('./api.js')
          return apiService.getDefaultModules()
        }
      },
      translate: key => Promise.resolve(key),
      getCurrentUser: async () => {
        try {
          const { authService } = await import('./auth.js')
          const user = authService.getCurrentUser()
          const isAuthenticated = authService.isAuthenticated()

          // 只返回真实的已认证用户，不返回 demo 用户
          if (isAuthenticated && user && user.login) {
            return user
          }

          return null
        } catch (error) {
          console.error('Failed to get current user:', error)
          return null
        }
      },
      openModule: async moduleData => {
        const moduleCode = typeof moduleData === 'string' ? moduleData : moduleData.code
        const moduleEntry = typeof moduleData === 'object' ? moduleData.entry?.value : null
        const moduleTitle = typeof moduleData === 'object' ? moduleData.title : moduleCode

        console.log('🚀 Opening module in popup:', moduleCode, 'entry:', moduleEntry)

        // 构建 AngularJS 模块的直接 URL，并传递认证信息
        const moduleUrl = await this.buildModuleUrlWithAuth(moduleCode, moduleEntry)

        console.log('📍 Module URL with auth:', moduleUrl)

        // 默认所有模块都在弹窗中打开
        const event = new CustomEvent('showAngularModule', {
          detail: {
            moduleCode,
            title: moduleTitle,
            url: moduleUrl
          }
        })
        window.dispatchEvent(event)
        console.log('📱 Triggered showAngularModule event for:', moduleCode)
      },
      getSystemStats: async () => {
        try {
          const { apiService } = await import('./api.js')
          return await apiService.getSystemStats()
        } catch (error) {
          console.warn('Failed to get real stats, using mock data:', error)
          const { apiService } = await import('./api.js')
          return apiService.getMockStats()
        }
      }
    }
  }

  // 创建增强的桥接对象（Vue Dashboard 主应用模式）
  createEnhancedBridge() {
    return {
      getAvailableModules: () => this.getAngularModules(),
      translate: key => Promise.resolve(key), // 简单的翻译实现
      getCurrentUser: () => this.getCurrentUserInfo(),
      openModule: async moduleCode => await this.openModule(moduleCode),
      getSystemStats: () => this.getSystemStats()
    }
  }

  // 获取 AngularJS 模块列表（从认证服务获取真实数据）
  async getAngularModules() {
    try {
      // 尝试从认证服务获取真实的应用数据
      const { authService } = await import('@/core/auth')
      const applets = await authService.getApplets()

      if (applets && applets.length > 0) {
        // 转换应用数据为模块格式
        const modules = applets.map(applet => ({
          code: applet.code || applet.id,
          title: applet.title || applet.name,
          icon: applet.icon || 'fa-cube',
          color: applet.color || '#2196F3',
          showIn: applet.showIn || { desktop: 1 },
          entry: applet.entry || { type: 'AngularState', value: `app.${applet.code}` },
          description: applet.description || applet.title
        }))

        console.log('📦 Loaded real applets as modules:', modules.length)
        return modules
      }
    } catch (error) {
      console.warn('⚠️ Failed to load real applets, using fallback modules:', error)
    }

    // 如果无法获取真实数据，使用默认模块
    const modules = [
      {
        code: '__jao',
        title: '作业编排',
        icon: 'fa-oplus-jao',
        color: '#212529',
        showIn: { desktop: 3, dock: 3 },
        entry: { type: 'AngularState', value: 'app.jao' },
        description: '自动化作业编排和调度管理'
      },
      {
        code: '__gfs',
        title: '脚本管理',
        icon: 'fa-oplus-gfs',
        color: '#607D8B',
        showIn: { desktop: 2 },
        entry: { type: 'AngularState', value: 'app.gfs' },
        description: '脚本文件管理和版本控制'
      },
      {
        code: '__cmd',
        title: '命令管理',
        icon: 'fa-oplus-cmd',
        color: '#212529',
        showIn: { desktop: 1, dock: 1 },
        entry: { type: 'AngularState', value: 'app.jao_cmd' },
        description: '系统命令管理和执行'
      },
      {
        code: '__cac',
        title: '配置管理',
        icon: 'fa-oplus-cac',
        color: '#4CAF50',
        showIn: { desktop: 4 },
        entry: { type: 'AngularState', value: 'app.cac' },
        description: '配置审计与合规性检查，支持系统巡检'
      },
      {
        code: '__dts',
        title: '数据传输',
        icon: 'fa-oplus-dts',
        color: '#FF9800',
        showIn: { desktop: 5 },
        entry: { type: 'AngularState', value: 'app.dts' },
        description: '数据传输和同步服务'
      },
      {
        code: '__udp',
        title: '统一开发平台',
        icon: 'fa-oplus-udp',
        color: '#2196F3',
        showIn: { desktop: 6 },
        entry: { type: 'AngularState', value: 'app.udp' },
        description: '统一开发和部署平台'
      }
    ]

    console.log('📦 Loaded fallback AngularJS modules:', modules.length)
    return modules
  }

  // 获取当前用户信息
  async getCurrentUserInfo() {
    try {
      // 尝试从认证服务获取真实用户信息
      const { authService } = await import('@/core/auth')
      const isAuthenticated = authService.isAuthenticated()
      const user = authService.getCurrentUser()

      if (isAuthenticated && user && user.login) {
        console.log('✅ Valid user found:', user.login)
        return {
          ...user,
          isAuthenticated: true
        }
      }

      // 如果没有有效用户，清除可能存在的无效 token
      console.warn('⚠️ No valid user found, clearing invalid tokens')
      await authService.logout()

      return null
    } catch (error) {
      console.error('❌ Failed to get user info from auth service:', error)
      // 发生错误时也清除可能的无效状态
      try {
        const { authService } = await import('@/core/auth')
        await authService.logout()
      } catch (logoutError) {
        console.error('Failed to logout on error:', logoutError)
      }
      return null
    }
  }

  // 获取系统统计信息
  async getSystemStats() {
    // 这里可以调用真实的统计 API
    return [
      {
        id: 'jobs',
        title: '作业总数',
        value: 156,
        icon: 'fa-tasks',
        trend: { type: 'up', value: 12, text: '较上月增长 12%' }
      },
      {
        id: 'scripts',
        title: '脚本数量',
        value: 89,
        icon: 'fa-file-code',
        trend: { type: 'up', value: 5, text: '较上月增长 5%' }
      },
      {
        id: 'assets',
        title: '资产数量',
        value: 234,
        icon: 'fa-server',
        trend: { type: 'stable', value: 0, text: '与上月持平' }
      },
      {
        id: 'alerts',
        title: '告警数量',
        value: 12,
        icon: 'fa-exclamation-triangle',
        trend: { type: 'down', value: 8, text: '较上月减少 8%' }
      }
    ]
  }

  // 创建模拟桥接对象（用于开发测试）
  createMockBridge() {
    return {
      getAvailableModules: () =>
        Promise.resolve([
          {
            code: '__jao',
            title: '作业编排',
            icon: 'fa-oplus-jao',
            color: '#212529',
            showIn: { desktop: 3, dock: 3 },
            entry: { type: 'InternalState', value: 'app.jao' }
          },
          {
            code: '__gfs',
            title: '脚本管理',
            icon: 'fa-oplus-gfs',
            color: '#607D8B',
            showIn: { desktop: 2 },
            entry: { type: 'InternalState', value: 'app.gfs' }
          },
          {
            code: '__cmd',
            title: '命令管理',
            icon: 'fa-oplus-cmd',
            color: '#212529',
            showIn: { desktop: 1, dock: 1 },
            entry: { type: 'InternalState', value: 'app.jao_cmd' }
          },
          {
            code: '__applets',
            title: '应用管理',
            icon: 'fa-oplus-applet',
            color: '#2196F3',
            showIn: { desktop: 100 },
            entry: { type: 'InternalState', value: 'app.applist' }
          }
        ]),

      translate: key => {
        const translations = {
          'app.nav.jao': '作业编排',
          'app.nav.gfs': '脚本管理',
          'app.nav.cmd': '命令管理',
          'app.nav.applet': '应用管理'
        }
        return translations[key] || key
      },

      getCurrentUser: () => {
        // 不返回 mock 用户，只返回真实认证用户
        return null
      },

      openModule: moduleCode => {
        console.log('Mock: Opening module', moduleCode)
      },

      getSystemStats: () =>
        Promise.resolve([
          { id: 'jobs', title: '作业总数', value: 156, icon: 'fa-tasks' },
          { id: 'scripts', title: '脚本数量', value: 89, icon: 'fa-file-code' },
          { id: 'assets', title: '资产数量', value: 234, icon: 'fa-server' },
          { id: 'alerts', title: '告警数量', value: 12, icon: 'fa-exclamation-triangle' }
        ])
    }
  }

  // 确保桥接已初始化
  async ensureReady() {
    if (!this.isReady) {
      await this.initPromise
    }
  }

  // 获取所有可用模块
  async getAvailableModules() {
    await this.ensureReady()
    return await this.bridge.getAvailableModules()
  }

  // 翻译文本
  async translate(key) {
    await this.ensureReady()
    return this.bridge.translate(key)
  }

  // 获取当前用户
  async getCurrentUser() {
    await this.ensureReady()
    return this.bridge.getCurrentUser()
  }

  // 构建模块 URL - 直接嵌入模式，不使用外部服务器
  buildModuleUrl(moduleCode, moduleEntry = null) {
    // 直接返回模块标识，用于内部嵌入
    const cleanModuleCode = moduleCode.replace(/^__/, '')
    console.log(`📍 Building embedded module identifier: ${cleanModuleCode}`)
    return `embedded://${cleanModuleCode}`
  }

  // 将 AngularJS 状态路径转换为 URL 路径
  convertAngularStateToPath(stateName) {
    // 状态到路径的映射表
    const stateToPathMap = {
      // JAO 模块
      'app.jao': '/jao',
      'app.jao.myApprove': '/jao/approve/my',
      'app.jao.jobApprove': '/jao/approve/list',
      'app.jao.job_list': '/jao/jobs/list',
      'app.jao.flow_list': '/jao/flows',
      'app.jao.runlogs': '/jao/runlogs',

      // 其他模块可以在这里添加
      'app.gfs': '/gfs',
      'app.cac': '/cac',
      'app.flow': '/flow',
      'app.udp': '/udp',
      'app.dts': '/dts',
      'app.os': '/os',
      'app.search': '/search',
      'app.ssc': '/ssc',
      'app.admin': '/admin',
      'app.dev': '/dev'
    }

    return stateToPathMap[stateName] || `/${stateName.replace(/^app\./, '').replace(/\./g, '/')}`
  }

  // 构建带认证信息的模块 URL
  async buildModuleUrlWithAuth(moduleCode, moduleEntry = null) {
    const baseUrl = this.buildModuleUrl(moduleCode, moduleEntry)

    try {
      // 获取当前的认证 token
      const { authService } = await import('./auth.js')
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        // 将认证信息保存到 sessionStorage，供 AngularJS 使用
        const authData = {
          token,
          user,
          timestamp: Date.now()
        }

        sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
        console.log('🔗 Vue auth data saved to sessionStorage for AngularJS')

        // URL 中只添加一个标识参数
        const separator = baseUrl.includes('?') ? '&' : '?'
        return `${baseUrl}${separator}vue_auth=true`
      }
    } catch (error) {
      console.warn('Failed to get auth info for module URL:', error)
    }

    return baseUrl
  }

  // 打开模块 - 在 Vue Dashboard 中嵌入 AngularJS 模块
  async openModule(moduleCode) {
    await this.ensureReady()

    console.log('🚀 Opening AngularJS module:', moduleCode)

    // Vue Dashboard 作为主应用，直接打开 AngularJS 模块
    const angularUrl = this.buildAngularModuleUrl(moduleCode)

    // 可以选择在新窗口打开或在当前页面的 iframe 中打开
    if (this.shouldOpenInNewWindow(moduleCode)) {
      window.open(angularUrl, '_blank')
    } else {
      // 在当前页面显示 iframe
      this.showModuleIframe(moduleCode, angularUrl)
    }
  }

  // 构建 AngularJS 模块的 URL
  buildAngularModuleUrl(moduleCode) {
    const baseUrl = 'http://localhost:8081'
    const moduleRoutes = {
      __jao: '/jao',
      __gfs: '/gfs',
      __cmd: '/cmd',
      __cac: '/cac',
      __dts: '/dts',
      __udp: '/udp'
    }

    const route = moduleRoutes[moduleCode] || '/home'
    return `${baseUrl}/#${route}`
  }

  // 判断是否在新窗口打开
  shouldOpenInNewWindow(moduleCode) {
    // 可以根据模块类型决定打开方式
    const newWindowModules = ['__jao', '__gfs'] // 这些模块在新窗口打开
    return newWindowModules.includes(moduleCode)
  }

  // 在当前页面显示模块 iframe
  showModuleIframe(moduleCode, url) {
    // 触发 Vue 组件显示 iframe
    const event = new CustomEvent('showAngularModule', {
      detail: { moduleCode, url }
    })
    window.dispatchEvent(event)
  }

  // 获取系统统计
  async getSystemStats() {
    await this.ensureReady()
    return await this.bridge.getSystemStats()
  }
}

// 创建单例实例
export const angularBridge = new AngularJSBridge()
