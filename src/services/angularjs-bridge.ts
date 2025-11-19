/**
 * AngularJS 桥接服务 - TypeScript版本
 * 用于与现有 AngularJS 应用进行数据交互
 */

interface BridgeRequest {
  resolve: (value: any) => void
  reject: (reason?: any) => void
}

interface PostMessageData {
  target?: string
  type: string
  requestId?: number
  payload?: any
  error?: string
}

interface BridgeInterface {
  getUserInfo(): Promise<any>
  getMenus(): Promise<any[]>
  getPermissions(): Promise<string[]>
  navigateTo(path: string): Promise<void>
  showMessage(message: string, type?: string): Promise<void>
  openModal(config: any): Promise<any>
  closeModal(result?: any): Promise<void>
  callService(serviceName: string, method: string, params?: any[]): Promise<any>
}

export class AngularJSBridge {
  private bridge: BridgeInterface | null = null
  private isReady: boolean = false
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initBridge()
  }

  async initBridge(): Promise<void> {
    // Vue Dashboard 作为主应用，始终使用独立模式
    //console.log('🔍 Vue Dashboard running as main application')
    //console.log('📍 Current URL:', window.location.href)

    // 临时使用简单的 mock 桥接，确保页面能正常加载
    this.bridge = this.createSimpleMockBridge()
    this.isReady = true
    //console.log('✅ Bridge initialized successfully')
  }

  // 创建 PostMessage 桥接对象（用于 iframe 通信）
  createPostMessageBridge(): BridgeInterface {
    let requestId = 0
    const pendingRequests = new Map<number, BridgeRequest>()

    // 监听来自父窗口的响应
    window.addEventListener('message', (event: MessageEvent<PostMessageData>) => {
      if (event.data.requestId && pendingRequests.has(event.data.requestId)) {
        const request = pendingRequests.get(event.data.requestId)
        if (request) {
          if (event.data.error) {
            request.reject(new Error(event.data.error))
          } else {
            request.resolve(event.data.payload)
          }
          pendingRequests.delete(event.data.requestId)
        }
      }
    })

    const sendRequest = (type: string, payload: any = null): Promise<any> => {
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
        }, 10000)
      })
    }

    return {
      getUserInfo: () => sendRequest('USER_INFO'),
      getMenus: () => sendRequest('MENUS'),
      getPermissions: () => sendRequest('PERMISSIONS'),
      navigateTo: (path: string) => sendRequest('NAVIGATE', { path }),
      showMessage: (message: string, type = 'info') => sendRequest('SHOW_MESSAGE', { message, type }),
      openModal: (config: any) => sendRequest('OPEN_MODAL', config),
      closeModal: (result?: any) => sendRequest('CLOSE_MODAL', { result }),
      callService: (serviceName: string, method: string, params: any[] = []) =>
        sendRequest('CALL_SERVICE', { serviceName, method, params })
    }
  }

  // 创建简单的 Mock 桥接对象（用于独立运行）
  createSimpleMockBridge(): BridgeInterface {
    return {
      async getUserInfo() {
        return {
          id: 'mock-user-001',
          login: 'admin',
          name: '管理员',
          email: 'admin@example.com',
          roles: ['admin'],
          permissions: ['*']
        }
      },

      async getMenus() {
        // 直接使用静态配置的模块列表
        const { getAllModuleConfigs } = await import('@/config/angular-modules.config')
        const moduleConfigs = getAllModuleConfigs()

        // 转换为菜单格式
        return moduleConfigs.map(config => ({
          code: config.code,
          name: config.name,
          title: config.title,
          icon: config.icon,
          color: config.color,
          description: config.description,
          showIn: { desktop: 1 },
          entry: {
            type: 'AngularModule',
            value: config.angularModule
          },
          features: config.features,
          permissions: config.permissions || []
        }))
      },

      async getPermissions() {
        return ['*']
      },

      async navigateTo(path: string) {
        //console.log(`🧭 Mock navigation to: ${path}`)
        // 在实际应用中，这里会触发路由跳转
      },

      async showMessage(message: string, type = 'info') {
        //console.log(`📢 Mock message (${type}): ${message}`)
        // 在实际应用中，这里会显示消息提示
      },

      async openModal(config: any) {
        //console.log('🔲 Mock modal opened:', config)
        return { confirmed: true }
      },

      async closeModal(result?: any) {
        //console.log('🔲 Mock modal closed:', result)
      },

      async callService(serviceName: string, method: string, params: any[] = []) {
        //console.log(`🔧 Mock service call: ${serviceName}.${method}`, params)
        return { success: true, data: null }
      }
    }
  }

  // 等待桥接初始化完成
  async waitForReady(): Promise<void> {
    await this.initPromise
  }

  // 检查桥接是否就绪
  isReady_(): boolean {
    return this.isReady
  }

  // 获取用户信息
  async getUserInfo(): Promise<any> {
    await this.waitForReady()
    return this.bridge?.getUserInfo()
  }

  // 获取菜单
  async getMenus(): Promise<any[]> {
    await this.waitForReady()
    return this.bridge?.getMenus() || []
  }

  // 获取权限
  async getPermissions(): Promise<string[]> {
    await this.waitForReady()
    return this.bridge?.getPermissions() || []
  }

  // 导航到指定路径
  async navigateTo(path: string): Promise<void> {
    await this.waitForReady()
    return this.bridge?.navigateTo(path)
  }

  // 显示消息
  async showMessage(message: string, type = 'info'): Promise<void> {
    await this.waitForReady()
    return this.bridge?.showMessage(message, type)
  }

  // 打开模态框
  async openModal(config: any): Promise<any> {
    await this.waitForReady()
    return this.bridge?.openModal(config)
  }

  // 关闭模态框
  async closeModal(result?: any): Promise<void> {
    await this.waitForReady()
    return this.bridge?.closeModal(result)
  }

  // 调用服务
  async callService(serviceName: string, method: string, params: any[] = []): Promise<any> {
    await this.waitForReady()
    return this.bridge?.callService(serviceName, method, params)
  }
}

// 创建全局实例
export const angularJSBridge = new AngularJSBridge()
export default angularJSBridge
