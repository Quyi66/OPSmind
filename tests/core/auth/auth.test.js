import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { authService } from '@/core/auth'
import { apiService } from '@/core/api'

// 模拟 API 服务
vi.mock('@/core/api', () => ({
  apiService: {
    post: vi.fn()
  }
}))

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    authService.clearAuthState()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('初始化', () => {
    it('should initialize with empty state when no stored data', () => {
      expect(authService.isAuthenticated()).toBe(false)
      expect(authService.getCurrentUser()).toBeNull()
      expect(authService.getToken()).toBeNull()
    })

    it('should restore state from localStorage', () => {
      const mockUser = { id: '1', login: 'test', role: 'user' }
      const mockToken = 'mock-token'

      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'opsmind_auth_token') return mockToken
        if (key === 'opsmind_user_info') return JSON.stringify(mockUser)
        return null
      })

      authService.initializeAuth()

      expect(authService.isAuthenticated()).toBe(true)
      expect(authService.getCurrentUser()).toEqual(mockUser)
      expect(authService.getToken()).toBe(mockToken)
    })
  })

  describe('登录', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          token: 'new-token',
          user: { id: '1', login: 'test', role: 'user' },
          permissions: ['read', 'write']
        }
      }

      apiService.post.mockResolvedValue(mockResponse)

      const result = await authService.login({
        username: 'test',
        password: 'password'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockResponse.data.user)
      expect(authService.isAuthenticated()).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('opsmind_auth_token', 'new-token')
    })

    it('should handle login failure', async () => {
      const mockError = new Error('Invalid credentials')
      apiService.post.mockRejectedValue(mockError)

      const result = await authService.login({
        username: 'test',
        password: 'wrong'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('权限检查', () => {
    beforeEach(() => {
      // 设置已认证状态
      authService.authState = {
        isAuthenticated: true,
        user: { id: '1', login: 'test', role: 'user' },
        permissions: ['read', 'write'],
        token: 'mock-token'
      }
    })

    it('should check permissions correctly', () => {
      expect(authService.hasPermission('read')).toBe(true)
      expect(authService.hasPermission('delete')).toBe(false)
      expect(authService.hasPermission()).toBe(true) // no permission required
    })

    it('should grant admin all permissions', () => {
      authService.authState.user.role = 'admin'

      expect(authService.hasPermission('any-permission')).toBe(true)
    })

    it('should check roles correctly', () => {
      expect(authService.hasRole('user')).toBe(true)
      expect(authService.hasRole('admin')).toBe(false)
    })

    it('should deny permissions when not authenticated', () => {
      authService.authState.isAuthenticated = false

      expect(authService.hasPermission('read')).toBe(false)
      expect(authService.hasRole('user')).toBe(false)
    })
  })

  describe('会话管理', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should validate active session', async () => {
      authService.authState = {
        isAuthenticated: true,
        lastActivity: Date.now() - 1000, // 1 second ago
        token: 'mock-token'
      }

      const result = await authService.validateSession()
      expect(result).toBe(true)
    })

    it('should logout on session timeout', async () => {
      authService.authState = {
        isAuthenticated: true,
        lastActivity: Date.now() - 31 * 60 * 1000, // 31 minutes ago
        token: 'mock-token'
      }

      const result = await authService.validateSession()
      expect(result).toBe(false)
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should refresh token when needed', async () => {
      const mockResponse = { data: { token: 'new-token' } }
      apiService.post.mockResolvedValue(mockResponse)

      authService.authState = {
        isAuthenticated: true,
        lastActivity: Date.now() - 6 * 60 * 1000, // 6 minutes ago
        token: 'old-token'
      }

      const result = await authService.validateSession()
      expect(result).toBe(true)
      expect(authService.getToken()).toBe('new-token')
    })
  })

  describe('登出', () => {
    it('should logout and clear state', async () => {
      authService.authState = {
        isAuthenticated: true,
        user: { id: '1' },
        token: 'mock-token'
      }

      await authService.logout()

      expect(authService.isAuthenticated()).toBe(false)
      expect(authService.getCurrentUser()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('opsmind_auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('opsmind_user_info')
    })
  })
})
