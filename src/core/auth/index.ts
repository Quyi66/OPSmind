/**
 * 现代化认证服务 - TypeScript版本
 * 统一管理用户认证、权限和会话
 * 基于旧版认证服务完整迁移
 */

import { reactive, computed } from 'vue'
import CryptoJS from 'crypto-js'
import type {
  User,
  LoginCredentials,
  LoginResponse,
  AuthState,
  SessionConfig,
  Tenant,
  License,
  OTPStatus,
  AuthService as IAuthService
} from '@/types/auth'

// 认证状态
const authState = reactive<AuthState>({
  user: null,
  token: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
  lastActivity: null
})

// 会话配置 - 使用旧版的存储键名保持兼容性
const SESSION_CONFIG: SessionConfig = {
  tokenKey: 'oplus_token',
  userKey: 'oplus_user',
  timeout: 30 * 60 * 1000, // 30分钟
  refreshThreshold: 5 * 60 * 1000, // 5分钟前刷新
  encryptionKey: 'Oplus@2022!!sys@' // 加密密钥
}

class AuthService implements IAuthService {
  private baseURL: string

  constructor() {
    // 使用相对路径，让 webpack 代理处理
    this.baseURL = ''
    this.initializeAuth()
    this.setupActivityMonitor()
  }

  /**
   * AES 加密方法（与后台一致）
   */
  encrypt(word: string): string {
    if (!word) return ''
    const key = CryptoJS.enc.Utf8.parse(SESSION_CONFIG.encryptionKey)
    const iv = CryptoJS.enc.Utf8.parse(SESSION_CONFIG.encryptionKey)
    return CryptoJS.AES.encrypt(word, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126
    }).toString()
  }

  /**
   * 获取租户 ID
   */
  getTenantId(): string {
    // 可以从配置或 URL 参数获取
    return 'ff808081727a047f017292d0d72e0004' // 默认租户 ID
  }

  /**
   * 初始化认证状态
   */
  private initializeAuth(): void {
    try {
      // 支持从 localStorage 和 sessionStorage 恢复
      const token = localStorage.getItem(SESSION_CONFIG.tokenKey) || sessionStorage.getItem(SESSION_CONFIG.tokenKey)
      const userInfo = localStorage.getItem(SESSION_CONFIG.userKey) || sessionStorage.getItem(SESSION_CONFIG.userKey)

      if (token && userInfo) {
        const parsedUser = JSON.parse(userInfo) as User
        // 验证用户对象是否有效
        if (parsedUser && parsedUser.login) {
          authState.token = token
          authState.user = parsedUser
          authState.isAuthenticated = true
          authState.lastActivity = Date.now()

          console.log('🔐 Auth state restored from storage:', parsedUser.login)
          this.validateSession()
        } else {
          console.warn('⚠️ Invalid user data in storage, clearing...')
          this.clearAuthState()
        }
      }
    } catch (error) {
      console.error('Failed to restore auth state:', error)
      this.clearAuthState()
    }
  }

  /**
   * 登录 - 完全基于旧版实现
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    authState.isLoading = true

    try {
      console.log('🔐 Sending login request to:', `${this.baseURL}/oplus-portal/api/authenticate`)

      // 加密用户名、密码和 OTP 代码
      const encryptedData: Record<string, any> = {
        username: this.encrypt(credentials.username),
        password: this.encrypt(credentials.password),
        rememberMe: credentials.rememberMe,
        tenantId: credentials.tenantId || this.getTenantId()
      }

      // 如果有 OTP 代码，也需要加密
      if (credentials.otp) {
        encryptedData.otpCode = this.encrypt(credentials.otp)
      }

      console.log('🔒 Encrypted login data prepared')

      const response = await fetch(`${this.baseURL}/oplus-portal/api/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(encryptedData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          code: errorData.code || 'LOGIN_FAILED',
          message: errorData.message || '登录失败'
        }
      }

      const data = await response.json()

      // 保存认证信息
      const token = data.id_token || data.access_token || data.token
      if (!token) {
        throw new Error('No token received from server')
      }
      authState.token = token
      console.log('🔐 [AuthService] Token received and set:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...'
      })

      // 创建基本用户信息（后续会在 dashboard 中获取完整信息）
      authState.user = {
        id: data.userId || credentials.username,
        login: credentials.username,
        name: credentials.username,
        role: data.role || 'user',
        permissions: data.permissions || [],
        tenantId: credentials.tenantId || this.getTenantId()
      }
      authState.isAuthenticated = true
      authState.lastActivity = Date.now()

      console.log('👤 [AuthService] User info created:', {
        id: authState.user.id,
        login: authState.user.login,
        name: authState.user.name,
        role: authState.user.role,
        tenantId: authState.user.tenantId,
        permissionsCount: authState.user.permissions?.length || 0
      })

      // 保存到存储
      const userJson = JSON.stringify(authState.user)
      if (credentials.rememberMe) {
        localStorage.setItem(SESSION_CONFIG.tokenKey, token)
        localStorage.setItem(SESSION_CONFIG.userKey, userJson)
        console.log('💾 [AuthService] Auth data saved to localStorage (remember me enabled)')
      } else {
        sessionStorage.setItem(SESSION_CONFIG.tokenKey, token)
        sessionStorage.setItem(SESSION_CONFIG.userKey, userJson)
        console.log('💾 [AuthService] Auth data saved to sessionStorage')
      }

      console.log('✅ [AuthService] Login successful, token and user saved:', authState.user.login)

      // 返回与旧版兼容的格式
      return {
        success: true,
        data: {
          user: authState.user,
          token: token,
          permissions: authState.user.permissions
        }
      }

    } catch (error) {
      console.error('❌ Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      authState.isLoading = false
    }
  }

  /**
   * 登出 - 基于旧版实现
   */
  async logout(): Promise<void> {
    try {
      // 清除本地存储
      this.clearAuthState()
      console.log('✅ Logout successful')

      // 跳转到登录页面
      if (typeof window !== 'undefined' && window.location) {
        // 使用 window.location 确保完全刷新页面状态
        window.location.href = '/ops/'
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  /**
   * 清除认证状态 - 兼容旧版存储键名
   */
  private clearAuthState(): void {
    // 清除状态
    authState.user = null
    authState.token = null
    authState.permissions = []
    authState.isAuthenticated = false
    authState.lastActivity = null

    // 清除所有可能的存储位置
    localStorage.removeItem(SESSION_CONFIG.tokenKey)
    localStorage.removeItem(SESSION_CONFIG.userKey)
    sessionStorage.removeItem(SESSION_CONFIG.tokenKey)
    sessionStorage.removeItem(SESSION_CONFIG.userKey)

    // 清除旧版可能使用的其他键名
    localStorage.removeItem('opsmind_auth_token')
    localStorage.removeItem('opsmind_user_info')
  }

  /**
   * 清除无效的认证信息
   */
  private clearInvalidAuth(): void {
    console.log('🧹 Clearing invalid authentication data')
    this.clearAuthState()
  }

  /**
   * 刷新令牌
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/oplus-portal/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify({
          token: authState.token
        })
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      const newToken = data.token || data.id_token || data.access_token

      if (newToken) {
        authState.token = newToken
        authState.lastActivity = Date.now()

        // 更新存储中的token
        const tokenKey = SESSION_CONFIG.tokenKey
        if (localStorage.getItem(tokenKey)) {
          localStorage.setItem(tokenKey, newToken)
        } else if (sessionStorage.getItem(tokenKey)) {
          sessionStorage.setItem(tokenKey, newToken)
        }

        console.log('🔄 Token refreshed')
        return true
      } else {
        throw new Error('No token in refresh response')
      }

    } catch (error) {
      console.error('Token refresh failed:', error)
      this.logout()
      return false
    }
  }

  /**
   * 验证会话
   */
  async validateSession(): Promise<boolean> {
    if (!authState.isAuthenticated) return false

    const now = Date.now()
    const timeSinceActivity = now - (authState.lastActivity || 0)

    // 会话超时
    if (timeSinceActivity > SESSION_CONFIG.timeout) {
      console.log('⏰ Session timeout')
      this.logout()
      return false
    }

    // 需要刷新令牌
    if (timeSinceActivity > SESSION_CONFIG.refreshThreshold) {
      return await this.refreshToken()
    }

    return true
  }

  /**
   * 检查权限
   */
  hasPermission(permission: string): boolean {
    if (!authState.isAuthenticated) return false
    if (!permission) return true

    return authState.permissions.includes(permission) ||
      authState.permissions.includes('admin') ||
      authState.user?.role === 'admin'
  }

  /**
   * 检查角色
   */
  hasRole(role: string): boolean {
    if (!authState.isAuthenticated) return false
    return authState.user?.role === role
  }

  /**
   * 获取认证头 - 兼容旧版格式
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
    return {
      'Content-Type': 'application/json'
    }
  }

  /**
   * 发起认证请求 - 兼容旧版实现
   */
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (response.status === 401) {
      // Token 过期，清除认证信息
      this.logout()
      throw new Error('Authentication expired')
    }

    return response
  }

  /**
   * 更新用户活动时间
   */
  updateActivity(): void {
    if (authState.isAuthenticated) {
      authState.lastActivity = Date.now()
    }
  }

  /**
   * 设置活动监控
   */
  private setupActivityMonitor(): void {
    // 监听用户活动
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

    const updateActivity = () => this.updateActivity()

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // 定期检查会话状态
    setInterval(() => {
      if (authState.isAuthenticated) {
        this.validateSession()
      }
    }, 60000) // 每分钟检查一次
  }

  /**
   * 初始化登录页面（依次调用所需接口）
   */
  async initializeLogin(): Promise<{
    tenants: Tenant[]
    license: License
    otpEnabled: OTPStatus
  }> {
    console.log('🔄 Initializing login page...')

    try {
      // 1. 获取所有租户
      const tenants = await this.getTenants()

      // 2. 验证许可证
      const license = await this.verifyLicense()

      // 3. 检查 OTP 状态
      const otpEnabled = await this.checkOTP()

      console.log('✅ Login initialization completed')

      return {
        tenants,
        license,
        otpEnabled
      }
    } catch (error) {
      console.error('❌ Login initialization failed:', error)
      throw error
    }
  }

  /**
   * 获取所有租户
   */
  async getTenants(): Promise<Tenant[]> {
    try {
      const cacheBuster = Date.now()
      const response = await fetch(
        `${this.baseURL}/oplus-portal/api/tenants/all?cacheBuster=${cacheBuster}`
      )

      if (response.ok) {
        const tenants = await response.json()
        console.log('✅ Tenants loaded:', tenants.length)
        return tenants
      }
      return []
    } catch (error) {
      console.warn('Failed to load tenants:', error)
      return []
    }
  }

  /**
   * 验证许可证
   */
  async verifyLicense(): Promise<License> {
    try {
      const response = await fetch(`${this.baseURL}/oplus-portal/api/licenses/verify`)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ License verified')
        return result
      }
      return { valid: false, features: [] }
    } catch (error) {
      console.warn('Failed to verify license:', error)
      return { valid: false, features: [] }
    }
  }

  /**
   * 检查 OTP 状态
   */
  async checkOTP(): Promise<OTPStatus> {
    try {
      const cacheBuster = Date.now()
      const response = await fetch(
        `${this.baseURL}/oplus-portal/api/authenticate/otp?cacheBuster=${cacheBuster}`
      )

      if (response.ok) {
        const result = await response.json()
        console.log('✅ OTP status checked:', result)
        return result
      }
      return { enabled: false, required: false }
    } catch (error) {
      console.warn('Failed to check OTP:', error)
      return { enabled: false, required: false }
    }
  }

  // Getter 方法 - 兼容旧版实现
  isAuthenticated(): boolean {
    if (authState.isAuthenticated && authState.token && authState.user && authState.user.login) {
      return true
    }

    // 从存储中恢复
    const token = localStorage.getItem(SESSION_CONFIG.tokenKey) || sessionStorage.getItem(SESSION_CONFIG.tokenKey)
    const user = localStorage.getItem(SESSION_CONFIG.userKey) || sessionStorage.getItem(SESSION_CONFIG.userKey)

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user) as User
        // 验证用户对象是否有效
        if (parsedUser && parsedUser.login) {
          authState.token = token
          authState.user = parsedUser
          authState.isAuthenticated = true
          authState.lastActivity = Date.now()
          console.log('✅ Authentication restored from storage:', parsedUser.login)
          return true
        } else {
          console.warn('⚠️ Invalid user data in storage, clearing...')
          this.clearInvalidAuth()
        }
      } catch (error) {
        console.error('❌ Failed to parse user data from storage:', error)
        this.clearInvalidAuth()
      }
    }

    return false
  }

  getCurrentUser(): User | null {
    if (authState.user && authState.user.login) {
      return authState.user
    }

    const user = localStorage.getItem(SESSION_CONFIG.userKey) || sessionStorage.getItem(SESSION_CONFIG.userKey)
    if (user) {
      try {
        const parsedUser = JSON.parse(user) as User
        if (parsedUser && parsedUser.login) {
          authState.user = parsedUser
          return authState.user
        } else {
          console.warn('⚠️ Invalid user data, clearing...')
          this.clearInvalidAuth()
        }
      } catch (error) {
        console.error('❌ Failed to parse user data:', error)
        this.clearInvalidAuth()
      }
    }

    return null
  }

  getToken(): string | null {
    if (authState.token) return authState.token

    const token = localStorage.getItem(SESSION_CONFIG.tokenKey) || sessionStorage.getItem(SESSION_CONFIG.tokenKey)
    if (token) {
      authState.token = token
      return token
    }

    return null
  }

  getPermissions(): string[] {
    return authState.permissions
  }

  isLoading(): boolean {
    return authState.isLoading
  }

  /**
   * 设置认证状态 - 用于第三方系统iframe集成
   * @param token JWT token
   * @param user 用户信息
   */
  setAuthState(token: string, user: User): void {
    try {
      authState.token = token
      authState.user = user
      authState.isAuthenticated = true
      authState.lastActivity = Date.now()
      authState.permissions = user.permissions || []

      // 保存到存储
      const userJson = JSON.stringify(user)
      sessionStorage.setItem(SESSION_CONFIG.tokenKey, token)
      sessionStorage.setItem(SESSION_CONFIG.userKey, userJson)

      console.log('✅ Auth state set for third-party integration:', user.login)
    } catch (error) {
      console.error('❌ Failed to set auth state:', error)
      throw error
    }
  }
}

// 创建全局实例
export const authService = new AuthService()

// 导出 Composition API
export const useAuth = () => {
  return {
    // 状态
    user: computed(() => authState.user),
    isAuthenticated: computed(() => authState.isAuthenticated),
    isLoading: computed(() => authState.isLoading),
    permissions: computed(() => authState.permissions),

    // 方法
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    refreshToken: authService.refreshToken.bind(authService)
  }
}

// 导出类型
export type { User, LoginCredentials, LoginResponse, AuthState, SessionConfig }
