/**
 * AngularJS Bridge Stub
 * Stub implementation after removing Angular integration
 * Uses native API calls instead of Angular bridge
 */

import { authService } from '@/core/auth'

interface User {
  id: string
  login: string
  name: string
  role: string
  permissions: string[]
}

interface Menu {
  code: string
  name: string
  title: string
  icon?: string
  color?: string
  showIn?: {
    desktop?: number
    dock?: number
  }
  enabled?: boolean
}

/**
 * Stub bridge that uses native API calls
 */
class AngularJSBridgeStub {
  /**
   * Get current user info
   */
  async getUserInfo(): Promise<User | null> {
    const user = authService.getCurrentUser()
    if (user) {
      return {
        id: user.id || '',
        login: user.login || '',
        name: user.name || '',
        role: user.role || 'user',
        permissions: user.permissions || []
      }
    }
    return null
  }

  async getMenus(): Promise<Menu[]> {
    // 模块菜单现在由静态配置提供，不再需要从 API 获取
    // 返回空数组，让调用方使用静态配置或默认模块
    return []
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return authService.isAuthenticated()
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await authService.logout()
  }
}

// Create singleton instance
export const angularJSBridge = new AngularJSBridgeStub()

// Default export for compatibility
export default angularJSBridge
