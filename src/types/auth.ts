/**
 * 认证相关类型定义
 */

export interface User {
  id: string
  login: string
  name: string
  email?: string
  role: string
  permissions: string[]
  tenantId: string
  avatar?: string
  lastLoginTime?: string
  createTime?: string
}

export interface LoginCredentials {
  username: string
  password: string
  tenantId?: string
  rememberMe?: boolean
  otp?: string
}

export interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    user: User
    token: string
    permissions: string[]
    expiresIn?: number
  }
  error?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
  lastActivity: number | null
}

export interface SessionConfig {
  tokenKey: string
  userKey: string
  timeout: number
  refreshThreshold: number
  encryptionKey: string
}

export interface Tenant {
  id: string
  name: string
  code: string
  status: string
  description?: string
}

export interface License {
  valid: boolean
  expiryDate?: string
  features: string[]
  message?: string
}

export interface OTPStatus {
  enabled: boolean
  required: boolean
  qrCode?: string
}

export interface AuthService {
  // 认证方法
  login(credentials: LoginCredentials): Promise<LoginResponse>
  logout(): Promise<void>
  refreshToken(): Promise<boolean>
  
  // 状态查询
  isAuthenticated(): boolean
  getCurrentUser(): User | null
  getToken(): string | null
  
  // 权限检查
  hasPermission(permission: string): boolean
  hasRole(role: string): boolean
  
  // 会话管理
  validateSession(): Promise<boolean>
  updateActivity(): void
  
  // 初始化方法
  initializeLogin(): Promise<{
    tenants: Tenant[]
    license: License
    otpEnabled: OTPStatus
  }>
  
  // 工具方法
  encrypt(text: string): string
  getTenantId(): string
}
