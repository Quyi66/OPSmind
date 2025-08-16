/**
 * 现代化认证服务
 * 统一管理用户认证、权限和会话
 */

import { ref, reactive, computed } from 'vue'
import { apiService } from '@/core/api'

// 认证状态
const authState = reactive({
  user: null,
  token: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
  lastActivity: null
})

// 会话配置
const SESSION_CONFIG = {
  tokenKey: 'opsmind_auth_token',
  userKey: 'opsmind_user_info',
  timeout: 30 * 60 * 1000, // 30分钟
  refreshThreshold: 5 * 60 * 1000 // 5分钟前刷新
}

class AuthService {
  constructor() {
    this.initializeAuth()
    this.setupActivityMonitor()
  }

  /**
   * 初始化认证状态
   */
  initializeAuth() {
    try {
      const token = localStorage.getItem(SESSION_CONFIG.tokenKey)
      const userInfo = localStorage.getItem(SESSION_CONFIG.userKey)

      if (token && userInfo) {
        authState.token = token
        authState.user = JSON.parse(userInfo)
        authState.isAuthenticated = true
        authState.lastActivity = Date.now()

        console.log('🔐 Auth state restored from localStorage')
        this.validateSession()
      }
    } catch (error) {
      console.error('Failed to restore auth state:', error)
      this.logout()
    }
  }

  /**
   * 登录
   */
  async login(credentials) {
    authState.isLoading = true

    try {
      const response = await apiService.post('/auth/login', credentials)
      const { token, user, permissions = [] } = response.data

      // 更新认证状态
      authState.token = token
      authState.user = user
      authState.permissions = permissions
      authState.isAuthenticated = true
      authState.lastActivity = Date.now()

      // 持久化到本地存储
      localStorage.setItem(SESSION_CONFIG.tokenKey, token)
      localStorage.setItem(SESSION_CONFIG.userKey, JSON.stringify(user))

      console.log('✅ Login successful:', user.login)
      return { success: true, user }

    } catch (error) {
      console.error('❌ Login failed:', error)
      return { 
        success: false, 
        error: error.message || '登录失败' 
      }
    } finally {
      authState.isLoading = false
    }
  }

  /**
   * 登出
   */
  async logout() {
    try {
      // 调用后端登出接口
      if (authState.token) {
        await apiService.post('/auth/logout')
      }
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      // 清除本地状态
      this.clearAuthState()
      console.log('👋 Logout completed')
    }
  }

  /**
   * 清除认证状态
   */
  clearAuthState() {
    authState.user = null
    authState.token = null
    authState.permissions = []
    authState.isAuthenticated = false
    authState.lastActivity = null

    localStorage.removeItem(SESSION_CONFIG.tokenKey)
    localStorage.removeItem(SESSION_CONFIG.userKey)
  }

  /**
   * 刷新令牌
   */
  async refreshToken() {
    try {
      const response = await apiService.post('/auth/refresh', {
        token: authState.token
      })

      const { token: newToken } = response.data
      authState.token = newToken
      authState.lastActivity = Date.now()

      localStorage.setItem(SESSION_CONFIG.tokenKey, newToken)
      console.log('🔄 Token refreshed')
      return true

    } catch (error) {
      console.error('Token refresh failed:', error)
      this.logout()
      return false
    }
  }

  /**
   * 验证会话
   */
  async validateSession() {
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
  hasPermission(permission) {
    if (!authState.isAuthenticated) return false
    if (!permission) return true

    return authState.permissions.includes(permission) ||
           authState.permissions.includes('admin') ||
           authState.user?.role === 'admin'
  }

  /**
   * 检查角色
   */
  hasRole(role) {
    if (!authState.isAuthenticated) return false
    return authState.user?.role === role || authState.user?.roles?.includes(role)
  }

  /**
   * 获取认证头
   */
  getAuthHeaders() {
    if (!authState.token) return {}
    
    return {
      'Authorization': `Bearer ${authState.token}`,
      'X-User-ID': authState.user?.id,
      'X-Tenant-ID': authState.user?.tenantId
    }
  }

  /**
   * 更新用户活动时间
   */
  updateActivity() {
    if (authState.isAuthenticated) {
      authState.lastActivity = Date.now()
    }
  }

  /**
   * 设置活动监控
   */
  setupActivityMonitor() {
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

  // Getter 方法
  isAuthenticated() {
    return authState.isAuthenticated
  }

  getCurrentUser() {
    return authState.user
  }

  getToken() {
    return authState.token
  }

  getPermissions() {
    return authState.permissions
  }

  isLoading() {
    return authState.isLoading
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
