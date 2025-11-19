/**
 * 开发环境默认配置 - TypeScript版本
 * 用于开发和测试环境的默认值设置
 */

interface LoginDefaults {
  username: string
  password: string
  rememberMe: boolean
}

interface APIConfig {
  baseURL: string
  timeout: number
}

interface DebugConfig {
  enableConsoleLog: boolean
  enableNetworkLog: boolean
  enableAuthLog: boolean
}

interface DevDefaults {
  LOGIN: LoginDefaults
  IS_DEV: boolean
  API: APIConfig
  DEBUG: DebugConfig
}

export const DEV_DEFAULTS: DevDefaults = {
  // 默认登录凭据
  LOGIN: {
    username: 'admin',
    password: 'Oplus@2020',
    rememberMe: true
  },

  // 开发环境标识
  IS_DEV: import.meta.env.DEV,

  // API 配置
  API: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000
  },

  // 调试选项
  DEBUG: {
    enableConsoleLog: true,
    enableNetworkLog: true,
    enableAuthLog: true
  }
}

/**
 * 获取开发环境默认登录信息
 */
export function getDevLoginDefaults(): LoginDefaults {
  if (!DEV_DEFAULTS.IS_DEV) {
    return {
      username: '',
      password: '',
      rememberMe: false
    }
  }

  return DEV_DEFAULTS.LOGIN
}

/**
 * 在控制台输出开发环境信息
 */
export function logDevInfo(): void {
  if (!DEV_DEFAULTS.IS_DEV) return

  console.group('🔧 OPSmind 开发环境信息')
  //console.log('📝 默认账号:', DEV_DEFAULTS.LOGIN.username)
  //console.log('🔑 默认密码:', DEV_DEFAULTS.LOGIN.password)
  //console.log('⚡ 使用快速登录按钮可直接登录')
  //console.log('🌐 API 基础地址:', DEV_DEFAULTS.API.baseURL || '相对路径')
  console.groupEnd()
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return DEV_DEFAULTS.IS_DEV
}

// 导出类型
export type { LoginDefaults, APIConfig, DebugConfig, DevDefaults }
