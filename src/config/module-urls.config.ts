/**
 * 模块 URL 配置管理
 * 专门用于 iframe 集成的应用 URL 配置，按应用维度管理入口 URL
 * 不关心应用内部的路由结构，只配置应用的入口地址
 */

// 环境类型
export type Environment = 'development' | 'production' | 'test' | 'staging'

// 应用 URL 配置类型
export interface AppUrlConfig {
  entryUrl: string        // 应用入口 URL
  description?: string    // 应用描述
  enabled?: boolean      // 是否启用
}

// 环境配置
export interface EnvironmentConfig {
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
}

// 多环境配置
const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    angularjs: {
      baseUrl: 'http://localhost:8080/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: 'http://10.1.40.112:80'
    },
    static: {
      baseUrl: 'http://localhost:8080'
    }
  },
  production: {
    angularjs: {
      baseUrl: '/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: ''
    },
    static: {
      baseUrl: ''
    }
  },
  test: {
    angularjs: {
      baseUrl: 'http://test-server:8080/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: 'http://test-api:80'
    },
    static: {
      baseUrl: 'http://test-server:8080'
    }
  },
  staging: {
    angularjs: {
      baseUrl: 'http://staging-server/oplus/base',
      hashMode: true
    },
    api: {
      baseUrl: 'http://staging-api'
    },
    static: {
      baseUrl: 'http://staging-server'
    }
  }
}

// 应用 URL 配置 - 只配置入口 URL，不关心内部路由
const APP_URLS_CONFIG: Record<string, AppUrlConfig> = {
  cac: {
    entryUrl: '#/cac',
    description: 'CAC 配置审计与合规性检查应用',
    enabled: true
  },
  jao: {
    entryUrl: '#/jao',
    description: 'JAO 作业编排应用',
    enabled: true
  },
  sim: {
    entryUrl: '#/sim',
    description: 'SIM 系统信息管理应用',
    enabled: true
  },
  uim: {
    entryUrl: '#/uim',
    description: 'UIM 用户身份管理应用',
    enabled: true
  },
  gfs: {
    entryUrl: '#/gfs',
    description: 'GFS 脚本文件管理应用',
    enabled: true
  },
  dts: {
    entryUrl: '#/dts',
    description: 'DTS 数据传输应用',
    enabled: true
  },
  udp: {
    entryUrl: '#/udp',
    description: 'UDP 统一开发平台应用',
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

    return this.buildAngularUrl(appConfig.entryUrl)
  }

  /**
   * 构建 AngularJS 应用 URL
   */
  private buildAngularUrl(path: string): string {
    const { baseUrl, hashMode } = this.envConfig.angularjs
    const separator = hashMode ? '#' : ''

    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${baseUrl}/${separator}${normalizedPath}`
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
