/**
 * 模块 URL 配置管理
 * 专门用于 iframe 集成的应用 URL 配置，按应用维度管理入口 URL
 * 不关心应用内部的路由结构，只配置应用的入口地址
 */

const DEFAULT_BACKEND_ROOT = (import.meta.env.VITE_BACKEND_URL || 'http://10.1.40.112:80').trim()

// 环境类型
export type Environment = 'development' | 'production' | 'test' | 'staging'

// 应用 URL 配置类型
export interface AppUrlConfig {
  entryUrl: string        // 应用入口 URL
  description?: string    // 应用描述
  enabled?: boolean      // 是否启用
  urlPrefix?: string     // URL前缀（用于iframe集成）
}

// 环境配置
export interface EnvironmentConfig {
  vue: {
    baseUrl: string
    hashMode: boolean
  }
  angularjs: {
    baseUrl: string
    hashMode: boolean
  }
  api: {
    baseUrl: string
  }
  static: {
    baseUrl: string
  }
  iframe: {
    urlPrefix: string      // iframe URL前缀
    tokenParam: string     // token参数名
  }
}

// 多环境配置
const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    vue: {
      baseUrl: 'http://localhost:3000',
      hashMode: true
    },
    angularjs: {
      // 使用同源路径，通过 Vite 代理到本地 8080，避免 X-Frame-Options SAMEORIGIN 限制
      baseUrl: '/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: DEFAULT_BACKEND_ROOT
    },
    static: {
      baseUrl: 'http://localhost:8080'
    },
    iframe: {
      urlPrefix: '/iframe',
      tokenParam: 'token'
    }
  },
  production: {
    vue: {
      baseUrl: '',
      hashMode: true
    },
    angularjs: {
      baseUrl: '/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: ''
    },
    static: {
      baseUrl: ''
    },
    iframe: {
      urlPrefix: '/iframe',
      tokenParam: 'token'
    }
  },
  test: {
    vue: {
      baseUrl: 'http://test-server:3000',
      hashMode: true
    },
    angularjs: {
      baseUrl: 'http://test-server:8080/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: 'http://test-api:80'
    },
    static: {
      baseUrl: 'http://test-server:8080'
    },
    iframe: {
      urlPrefix: '/iframe',
      tokenParam: 'token'
    }
  },
  staging: {
    vue: {
      baseUrl: 'http://staging-server:3000',
      hashMode: true
    },
    angularjs: {
      baseUrl: 'http://staging-server/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: 'http://staging-api'
    },
    static: {
      baseUrl: 'http://staging-server'
    },
    iframe: {
      urlPrefix: '/iframe',
      tokenParam: 'token'
    }
  }
}

// 应用 URL 配置 - 只配置入口 URL，不关心内部路由
const APP_URLS_CONFIG: Record<string, AppUrlConfig> = {
  gfs: {
    entryUrl: '#/gfs/scriptLibrary',
    description: '脚本',
    enabled: true
  },
  jao: {
    entryUrl: '#/jao/jobs',
    description: '作业',
    enabled: true
  },
  cmd: {
    entryUrl: '#/cmd/list',
    description: '命令',
    enabled: true
  },
  cac: {
    entryUrl: '#/cac/overview',
    description: '系统巡检',
    enabled: true
  },
  password: {
    entryUrl: '#/password/application',
    description: '密码管理',
    enabled: true
  },
  sudo: {
    entryUrl: '#/sudo/permission',
    description: 'sudo权限管理',
    enabled: true
  },
  acm: {
    entryUrl: '#/acm/overview',
    description: '资产管理',
    enabled: true
  },
  patches: {
    entryUrl: '#/patches/machineScan',
    description: '补丁管理',
    enabled: true
  },
  software: {
    entryUrl: '#/apw/spm',
    description: '软件管理',
    enabled: true
  },
  // 帮助中心
  help: {
    entryUrl: '#/help',
    description: '帮助中心',
    enabled: true
  },
  // 个人资料（打开 Angular 基座 settings 页面）
  settings: {
    entryUrl: '#/settings',
    description: '个人资料设置',
    enabled: true
  },
  // 系统设置中心（自定义 ssc 页面）
  ssc: {
    entryUrl: '#/ssc/user',
    description: '系统设置中心',
    enabled: true
  },
  // 新增流程（二级功能：#/flow）。保留 workflow 作为别名以兼容
  flow: {
    entryUrl: '#/flow/list',
    description: '流程管理',
    enabled: true
  },
  workflow: {
    entryUrl: '#/flow/list',
    description: '流程管理（别名）',
    enabled: true
  },
  users: {
    entryUrl: '#/users/overview',
    description: '用户管理',
    enabled: true
  }
}

/**
 * 应用 URL 管理器
 * 专门管理 iframe 集成应用的入口 URL
 */
export class AppUrlManager {
  private currentEnv: Environment
  private envConfig: EnvironmentConfig

  constructor(environment?: Environment) {
    this.currentEnv = environment || this.detectEnvironment()
    this.envConfig = ENVIRONMENT_CONFIGS[this.currentEnv]
  }

  /**
   * 自动检测当前环境
   */
  private detectEnvironment(): Environment {
    if (typeof window === 'undefined') return 'production'

    const hostname = window.location.hostname
    const isDev = import.meta.env.DEV

    if (isDev || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development'
    }

    if (hostname.includes('test')) {
      return 'test'
    }

    if (hostname.includes('staging')) {
      return 'staging'
    }

    return 'production'
  }

  /**
   * 获取应用的完整 URL
   */
  getAppUrl(appCode: string): string {
    const appConfig = APP_URLS_CONFIG[appCode]
    if (!appConfig || !appConfig.enabled) {
      console.warn(`App config not found or disabled for: ${appCode}`)
      return this.getAngularBaseUrl()
    }

    // 直接构建标准的Angular URL，不使用URL前缀
    // URL前缀功能暂时禁用，避免路径错误
    const fullUrl = this.buildAngularUrl(appConfig.entryUrl)

    return fullUrl
  }

  /**
   * 获取iframe配置
   */
  getIframeConfig() {
    return this.envConfig.iframe
  }

  /**
   * 获取token参数名
   */
  getTokenParam(): string {
    return this.envConfig.iframe.tokenParam
  }

  /**
   * 获取URL前缀
   */
  getUrlPrefix(): string {
    return this.envConfig.iframe.urlPrefix
  }

  /**
   * 构建 AngularJS 应用 URL
   */
  private buildAngularUrl(path: string): string {
    const { baseUrl } = this.envConfig.angularjs

    // 如果路径已经包含 #，直接拼接（注意避免双斜杠）
    if (path.startsWith('#')) {
      return `${baseUrl}${path}`
    }

    // 否则添加 # 前缀
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}/#${normalizedPath}`
  }

  /**
   * 获取 Vue 基础 URL
   */
  getVueBaseUrl(): string {
    return this.envConfig.vue.baseUrl
  }

  /**
   * 获取 AngularJS 基础 URL
   */
  getAngularBaseUrl(): string {
    return this.envConfig.angularjs.baseUrl
  }

  /**
   * 获取 API 基础 URL
   */
  getApiBaseUrl(): string {
    return this.envConfig.api.baseUrl
  }

  /**
   * 获取静态资源基础 URL
   */
  getStaticBaseUrl(): string {
    return this.envConfig.static.baseUrl
  }

  /**
   * 获取应用配置
   */
  getAppConfig(appCode: string): AppUrlConfig | null {
    return APP_URLS_CONFIG[appCode] || null
  }

  /**
   * 检查应用是否存在且启用
   */
  hasApp(appCode: string): boolean {
    const config = APP_URLS_CONFIG[appCode]
    return config ? config.enabled !== false : false
  }

  /**
   * 获取所有可用应用
   */
  getAvailableApps(): string[] {
    return Object.keys(APP_URLS_CONFIG).filter(appCode => {
      const config = APP_URLS_CONFIG[appCode]
      return config.enabled !== false
    })
  }

  /**
   * 切换环境（用于测试）
   */
  switchEnvironment(environment: Environment): void {
    this.currentEnv = environment
    this.envConfig = ENVIRONMENT_CONFIGS[environment]
  }

  /**
   * 获取当前环境信息
   */
  getCurrentEnvironment(): { env: Environment; config: EnvironmentConfig } {
    return {
      env: this.currentEnv,
      config: this.envConfig
    }
  }

  /**
   * 动态更新环境配置
   */
  updateEnvironmentConfig(updates: Partial<EnvironmentConfig>): void {
    this.envConfig = { ...this.envConfig, ...updates }
  }

  /**
   * 动态添加应用配置
   */
  addAppConfig(appCode: string, config: AppUrlConfig): void {
    APP_URLS_CONFIG[appCode] = config
  }

  /**
   * 移除应用配置
   */
  removeAppConfig(appCode: string): void {
    delete APP_URLS_CONFIG[appCode]
  }

  /**
   * 更新应用配置
   */
  updateAppConfig(appCode: string, updates: Partial<AppUrlConfig>): void {
    const existing = APP_URLS_CONFIG[appCode]
    if (existing) {
      APP_URLS_CONFIG[appCode] = { ...existing, ...updates }
    }
  }
}

// 创建全局实例
export const appUrlManager = new AppUrlManager()

// 类型已在上面定义时导出
