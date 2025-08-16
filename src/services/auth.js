import CryptoJS from 'crypto-js'

class AuthService {
  constructor() {
    // 使用相对路径，让 webpack 代理处理
    this.baseURL = ''
    this.currentUser = null
    this.token = null
    this.encryptionKey = 'Oplus@2022!!sys@'
  }

  // AES 加密方法（与后台一致）
  encrypt(word) {
    if (!word) return ''
    const key = CryptoJS.enc.Utf8.parse(this.encryptionKey)
    const iv = CryptoJS.enc.Utf8.parse(this.encryptionKey)
    return CryptoJS.AES.encrypt(word, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126
    }).toString()
  }

  // 登录
  async login(credentials) {
    try {
      console.log('🔐 Sending login request to:', `${this.baseURL}/oplus-portal/api/authenticate`)

      // 加密用户名、密码和 OTP 代码
      const encryptedData = {
        username: this.encrypt(credentials.username),
        password: this.encrypt(credentials.password),
        rememberMe: credentials.rememberMe,
        tenantId: this.getTenantId()
      }

      // 如果有 OTP 代码，也需要加密
      if (credentials.otpCode) {
        encryptedData.otpCode = this.encrypt(credentials.otpCode)
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
      this.token = data.id_token || data.access_token || data.token

      // 创建基本用户信息（后续会在 dashboard 中获取完整信息）
      this.currentUser = {
        login: credentials.username,
        username: credentials.username
        // 其他信息会在 dashboard 加载时从 /api/account 获取
      }

      // 保存到存储
      const userJson = JSON.stringify(this.currentUser)
      if (credentials.rememberMe) {
        localStorage.setItem('oplus_token', this.token)
        localStorage.setItem('oplus_user', userJson)
      } else {
        sessionStorage.setItem('oplus_token', this.token)
        sessionStorage.setItem('oplus_user', userJson)
      }

      console.log('✅ Login successful, token and user saved:', this.currentUser.login)

      // 不在登录时调用后续接口，让 dashboard 页面自己调用
      return data
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  // 登出
  async logout() {
    try {
      // 清除本地存储
      localStorage.removeItem('oplus_token')
      localStorage.removeItem('oplus_user')
      sessionStorage.removeItem('oplus_token')
      sessionStorage.removeItem('oplus_user')

      this.token = null
      this.currentUser = null

      console.log('✅ Logout successful')
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  // 检查是否已登录
  isAuthenticated() {
    if (this.token && this.currentUser && this.currentUser.login) {
      return true
    }

    // 从存储中恢复
    const token = localStorage.getItem('oplus_token') || sessionStorage.getItem('oplus_token')
    const user = localStorage.getItem('oplus_user') || sessionStorage.getItem('oplus_user')

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user)
        // 验证用户对象是否有效
        if (parsedUser && parsedUser.login) {
          this.token = token
          this.currentUser = parsedUser
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

  // 清除无效的认证信息
  clearInvalidAuth() {
    console.log('🧹 Clearing invalid authentication data')
    localStorage.removeItem('oplus_token')
    localStorage.removeItem('oplus_user')
    sessionStorage.removeItem('oplus_token')
    sessionStorage.removeItem('oplus_user')
    this.token = null
    this.currentUser = null
  }

  // 获取当前用户
  getCurrentUser() {
    if (this.currentUser && this.currentUser.login) {
      return this.currentUser
    }

    const user = localStorage.getItem('oplus_user') || sessionStorage.getItem('oplus_user')
    if (user) {
      try {
        const parsedUser = JSON.parse(user)
        if (parsedUser && parsedUser.login) {
          this.currentUser = parsedUser
          return this.currentUser
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

  // 获取认证 token
  getToken() {
    if (this.token) return this.token

    const token = localStorage.getItem('oplus_token') || sessionStorage.getItem('oplus_token')
    if (token) {
      this.token = token
      return token
    }

    return null
  }

  // 初始化登录页面（依次调用所需接口）
  async initializeLogin() {
    console.log('🔄 Initializing login page...')

    try {
      const { apiService } = await import('./api.js')

      // 1. 获取所有租户
      const tenants = await apiService.getTenants()

      // 2. 验证许可证
      const license = await apiService.verifyLicense()

      // 3. 检查 OTP 状态
      const otpEnabled = await apiService.checkOTP()

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

  // 获取租户 ID
  getTenantId() {
    // 可以从配置或 URL 参数获取
    return 'ff808081727a047f017292d0d72e0004' // 默认租户 ID
  }

  // 获取认证头
  getAuthHeaders() {
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

  // 发起认证请求
  async authenticatedRequest(url, options = {}) {
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
}

// 创建单例实例
export const authService = new AuthService()
