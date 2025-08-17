/**
 * API 相关类型定义
 */

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// 请求配置
export interface RequestConfig {
  url: string
  method?: HttpMethod
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
  timeout?: number
  withCredentials?: boolean
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
}

// 响应数据
export interface ResponseData<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: RequestConfig
}

// API 错误
export interface ApiError {
  code: string | number
  message: string
  status?: number
  response?: ResponseData
  request?: RequestConfig
}

// 认证相关 API
export namespace AuthAPI {
  export interface LoginRequest {
    username: string
    password: string
    tenantId?: string
    rememberMe?: boolean
    otpCode?: string
  }

  export interface LoginResponse {
    success: boolean
    data?: {
      user: {
        id: string
        login: string
        name: string
        email?: string
        role: string
        permissions: string[]
        tenantId: string
      }
      token: string
      expiresIn?: number
    }
    message?: string
    error?: string
  }

  export interface RefreshTokenRequest {
    token: string
  }

  export interface RefreshTokenResponse {
    token: string
    expiresIn?: number
  }

  export interface LogoutRequest {
    token?: string
  }

  export interface UserInfoResponse {
    id: string
    login: string
    name: string
    email?: string
    role: string
    permissions: string[]
    tenantId: string
    avatar?: string
    lastLoginTime?: string
  }
}

// 模块相关 API
export namespace ModuleAPI {
  export interface ModuleListResponse {
    modules: Array<{
      code: string
      name: string
      title: string
      type: string
      version: string
      enabled: boolean
      permissions: string[]
      routes: string[]
    }>
  }

  export interface ModuleDetailResponse {
    code: string
    name: string
    title: string
    description: string
    type: string
    version: string
    enabled: boolean
    permissions: string[]
    routes: string[]
    dependencies: string[]
    config: Record<string, any>
  }

  export interface ModuleConfigRequest {
    code: string
    config: Record<string, any>
  }
}

// 系统相关 API
export namespace SystemAPI {
  export interface SystemInfoResponse {
    name: string
    version: string
    buildTime: string
    environment: string
    features: Record<string, boolean>
  }

  export interface SystemStatsResponse {
    users: {
      total: number
      online: number
      active: number
    }
    modules: {
      total: number
      enabled: number
      disabled: number
    }
    performance: {
      cpu: number
      memory: number
      disk: number
      network: number
    }
  }

  export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy' | 'degraded'
    checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warn'
      message?: string
      duration: number
    }>
    timestamp: string
  }
}

// 租户相关 API
export namespace TenantAPI {
  export interface TenantListResponse {
    tenants: Array<{
      id: string
      name: string
      code: string
      status: 'active' | 'inactive' | 'suspended'
      description?: string
      createTime: string
    }>
  }

  export interface TenantDetailResponse {
    id: string
    name: string
    code: string
    status: 'active' | 'inactive' | 'suspended'
    description?: string
    config: Record<string, any>
    createTime: string
    updateTime: string
  }
}

// 许可证相关 API
export namespace LicenseAPI {
  export interface LicenseVerifyResponse {
    valid: boolean
    expiryDate?: string
    features: string[]
    limits: Record<string, number>
    message?: string
  }

  export interface LicenseInfoResponse {
    id: string
    type: string
    holder: string
    issueDate: string
    expiryDate: string
    features: string[]
    limits: Record<string, number>
    status: 'valid' | 'expired' | 'invalid'
  }
}

// OTP 相关 API
export namespace OTPAPI {
  export interface OTPStatusResponse {
    enabled: boolean
    required: boolean
    qrCode?: string
    secret?: string
  }

  export interface OTPVerifyRequest {
    code: string
    secret?: string
  }

  export interface OTPVerifyResponse {
    valid: boolean
    message?: string
  }
}

// 文件上传相关 API
export namespace FileAPI {
  export interface UploadRequest {
    file: File
    path?: string
    overwrite?: boolean
  }

  export interface UploadResponse {
    success: boolean
    data?: {
      filename: string
      path: string
      size: number
      url: string
    }
    message?: string
  }

  export interface DownloadRequest {
    path: string
    filename?: string
  }
}

// 日志相关 API
export namespace LogAPI {
  export interface LogQueryRequest {
    level?: string
    module?: string
    startTime?: string
    endTime?: string
    keyword?: string
    page?: number
    pageSize?: number
  }

  export interface LogEntry {
    id: string
    level: string
    module: string
    message: string
    timestamp: string
    data?: any
  }

  export interface LogQueryResponse {
    logs: LogEntry[]
    total: number
    page: number
    pageSize: number
  }
}

// 类型已在上面定义时导出
