/**
 * 模块 URL 配置管理
 * 专门用于 iframe 集成的应用 URL 配置，按应用维度管理入口 URL
 * 不关心应用内部的路由结构，只配置应用的入口地址
 */

const DEFAULT_BACKEND_ROOT = (import.meta.env.VITE_BACKEND_URL || 'http://10.1.40.112:80').trim()

// 环境类型
export type Environment = 'development' | 'production' | 'test' | 'staging'

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

/**
 * 应用 URL 管理器
 * 专门管理各种环境下的基础 URL 配置
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
}

// 创建全局实例
export const appUrlManager = new AppUrlManager()

// 类型已在上面定义时导出
