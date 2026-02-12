/**
 * 现代化 API 服务
 * 统一的 HTTP 客户端和请求管理
 */

import axios from 'axios'
import { authService } from '@/core/auth'
import { LOGIN_REDIRECT_URL } from '@/config/route-paths'

// API 配置
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/oplus-portal',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  retryAttempts: 3,
  retryDelay: 1000
}

class ApiService {
  constructor() {
    this.client = this.createAxiosInstance()
    this.setupInterceptors()
  }

  /**
   * 创建 Axios 实例
   */
  createAxiosInstance() {
    const instance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    return instance
  }

  /**
   * 设置拦截器
   */
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证头
        const authHeaders = authService.getAuthHeaders()
        config.headers = { ...config.headers, ...authHeaders }

        // 如果是 FormData 上传，移除默认的 Content-Type，让浏览器自动设置带 boundary 的 multipart/form-data
        try {
          if (config.data instanceof FormData) {
            if (config.headers && 'Content-Type' in config.headers) {
              delete config.headers['Content-Type']
            }
          }
        } catch { }

        // 添加缓存破坏参数（后端约定使用 cacheBuster）
        if (config.method === 'get' && config.cache !== false) {
          config.params = {
            ...config.params,
            cacheBuster: Date.now()
          }
        }

        // 记录请求

        return config
      },
      (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const { config, response } = error

        console.error(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
          status: response?.status,
          message: error.message
        })

        // 处理认证错误
        if (response?.status === 401) {
          await authService.logout()
          window.location.href = LOGIN_REDIRECT_URL
          return Promise.reject(new Error('Authentication expired'))
        }

        // 处理权限错误
        if (response?.status === 403) {
          return Promise.reject(new Error('Access denied'))
        }

        // 重试逻辑
        if (this.shouldRetry(error)) {
          return this.retryRequest(config)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    const { config, response } = error

    // 已经重试过的请求不再重试
    if (config.__retryCount >= API_CONFIG.retryAttempts) {
      return false
    }

    // 网络错误或服务器错误才重试
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    return !response || retryableStatuses.includes(response.status)
  }

  /**
   * 重试请求
   */
  async retryRequest(config) {
    config.__retryCount = (config.__retryCount || 0) + 1

    const delay = API_CONFIG.retryDelay * config.__retryCount

    await new Promise(resolve => setTimeout(resolve, delay))
    return this.client(config)
  }

  /**
   * GET 请求
   */
  async get(url, config = {}) {
    return this.client.get(url, config)
  }

  /**
   * POST 请求
   */
  async post(url, data = {}, config = {}) {
    return this.client.post(url, data, config)
  }

  /**
   * PUT 请求
   */
  async put(url, data = {}, config = {}) {
    return this.client.put(url, data, config)
  }

  /**
   * PATCH 请求
   */
  async patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config)
  }

  /**
   * DELETE 请求
   */
  async delete(url, config = {}) {
    return this.client.delete(url, config)
  }

  /**
   * 上传文件
   */
  async upload(url, file, onProgress = null) {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post(url, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      }
    })
  }

  /**
   * 下载文件
   */
  async download(url, filename = null) {
    const response = await this.client.get(url, {
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    return response
  }

  /**
   * 取消请求
   */
  createCancelToken() {
    return axios.CancelToken.source()
  }

  /**
   * 批量请求
   */
  async all(requests) {
    return Promise.all(requests)
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.get('/health', {
        timeout: 5000,
        cache: false
      })
      return response.status === 200
    } catch (error) {
      console.warn('Health check failed:', error)
      return false
    }
  }

  /**
   * 获取应用列表 (已废弃 - 现在使用静态配置)
   * @deprecated 使用 angular-modules.config.ts 中的静态配置
   */
  async getApplets() {
    console.warn('⚠️ getApplets() is deprecated. Use static module configuration instead.')
    throw new Error('getApplets() is deprecated. Use static module configuration from angular-modules.config.ts')
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats() {
    // 直接返回模拟数据，避免404错误
    return this.getMockStats()
  }

  /**
   * 获取首页仪表盘全量数据
   */
  async getDashboardFullData() {
    const res = await this.get('svs/api/dashboard/full-data')
    const data = res?.data || {}

    // Adapt backend payload into frontend expected shape when necessary
    // - Ensure recentJobStats has totalJobs
    // - Map linuxVulnStats -> vulnerabilityOverview if frontend field missing
    const adapted = { ...data }
    if (Array.isArray(adapted.recentJobStats)) {
      adapted.recentJobStats = adapted.recentJobStats.map((i) => ({
        ...i,
        totalJobs:
          (i?.restJobs || 0) + (i?.scriptJobs || 0) + (i?.commandJobs || 0)
      }))
    }
    if (!adapted.vulnerabilityOverview && adapted.linuxVulnStats) {
      adapted.vulnerabilityOverview = adapted.linuxVulnStats
    }

    return adapted
  }

  /**
   * 获取当前登录账户信息（使用 fullName 展示）
   */
  async getAccount() {
    const res = await this.get('/api/account', { cache: false })
    return res?.data
  }

  /**
   * 获取系统参数
   * @param {string} domain 参数域，如 'ai'
   * @param {string} name 参数名，如 'url'
   */
  async getParam(domain, name) {
    const safeDomain = encodeURIComponent(domain)
    const safeName = encodeURIComponent(name)
    const res = await this.get(`/api/params/${safeDomain}/${safeName}`, { cache: false })
    return res?.data
  }

  /**
   * 模拟统计数据
   */
  getMockStats() {
    return [
      {
        id: 'jobs',
        title: '作业总数',
        value: 156,
        icon: 'fa-tasks',
        trend: { type: 'up', value: 12, text: '较上月增长 12%' }
      },
      {
        id: 'scripts',
        title: '脚本数量',
        value: 89,
        icon: 'fa-file-code',
        trend: { type: 'up', value: 5, text: '较上月增长 5%' }
      },
      {
        id: 'assets',
        title: '资产数量',
        value: 234,
        icon: 'fa-server',
        trend: { type: 'stable', value: 0, text: '与上月持平' }
      },
      {
        id: 'alerts',
        title: '告警数量',
        value: 12,
        icon: 'fa-exclamation-triangle',
        trend: { type: 'down', value: 8, text: '较上月减少 8%' }
      }
    ]
  }

  /**
   * 仪表盘数据模拟（与后端约定结构一致）
   */
  getMockDashboardFullData() {
    // Updated mock data to match provided dashboard API payload
    const provided = {
      totalJobStats: {
        restJobs: 56,
        scriptJobs: 452,
        commandJobs: 3
      },
      recentJobStats: [
        { date: '08-27', restJobs: 0, scriptJobs: 16, commandJobs: 0 },
        { date: '08-28', restJobs: 0, scriptJobs: 4, commandJobs: 0 },
        { date: '08-29', restJobs: 0, scriptJobs: 2, commandJobs: 0 },
        { date: '08-30', restJobs: 0, scriptJobs: 2, commandJobs: 0 },
        { date: '08-31', restJobs: 0, scriptJobs: 2, commandJobs: 0 },
        { date: '09-01', restJobs: 3, scriptJobs: 10, commandJobs: 0 },
        { date: '09-02', restJobs: 0, scriptJobs: 2, commandJobs: 0 },
        { date: '09-03', restJobs: 0, scriptJobs: 4, commandJobs: 0 },
        { date: '09-04', restJobs: 0, scriptJobs: 4, commandJobs: 0 },
        { date: '09-05', restJobs: 33, scriptJobs: 44, commandJobs: 0 }
      ],
      monthlyInspectionStats: {
        monthlyInspections: 22,
        normalInspections: 22,
        abnormalInspections: 0
      },
      recentInspectionStats: [
        { date: '08-27', totalInspections: 16, normalInspections: 8, abnormalInspections: 8 },
        { date: '08-28', totalInspections: 4, normalInspections: 4, abnormalInspections: 0 },
        { date: '08-29', totalInspections: 2, normalInspections: 2, abnormalInspections: 0 },
        { date: '08-30', totalInspections: 2, normalInspections: 2, abnormalInspections: 0 },
        { date: '08-31', totalInspections: 2, normalInspections: 2, abnormalInspections: 0 },
        { date: '09-01', totalInspections: 10, normalInspections: 10, abnormalInspections: 0 },
        { date: '09-02', totalInspections: 2, normalInspections: 2, abnormalInspections: 0 },
        { date: '09-03', totalInspections: 4, normalInspections: 4, abnormalInspections: 0 },
        { date: '09-04', totalInspections: 4, normalInspections: 4, abnormalInspections: 0 },
        { date: '09-05', totalInspections: 2, normalInspections: 2, abnormalInspections: 0 }
      ],
      assetOverview: {
        linuxServers: 5,
        unixServers: 0,
        windowsServers: 0
      },
      linuxVulnStats: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      windowsVulnStats: {
        totalCritical: 0,
        totalRollups: 0,
        totalSecurity: 0
      }
    }

    // Map to frontend types: add totalJobs and map linuxVulnStats -> vulnerabilityOverview
    const recentJobStats = provided.recentJobStats.map(i => ({
      ...i,
      totalJobs: (i.restJobs || 0) + (i.scriptJobs || 0) + (i.commandJobs || 0)
    }))

    return {
      totalJobStats: provided.totalJobStats,
      recentJobStats,
      monthlyInspectionStats: provided.monthlyInspectionStats,
      recentInspectionStats: provided.recentInspectionStats,
      assetOverview: provided.assetOverview,
      vulnerabilityOverview: provided.linuxVulnStats,
      windowsVulnStats: provided.windowsVulnStats
    }
  }

  /**
   * 转换应用数据为模块格式 (已废弃)
   * @deprecated 使用 angular-modules.config.ts 中的静态配置
   */
  convertAppletsToModules(applets) {
    console.warn('⚠️ convertAppletsToModules() is deprecated. Use static module configuration instead.')
    return []
  }

  /**
   * 默认模块列表 (已废弃 - 使用静态配置)
   * @deprecated 使用 angular-modules.config.ts 中的静态配置
   */
  getDefaultModules() {
    console.warn('⚠️ getDefaultModules() is deprecated. Use getAllModuleConfigs() from angular-modules.config.ts instead.')
    // 返回空数组，强制使用静态配置
    return []
  }
}

// 创建全局实例
export const apiService = new ApiService()

// 导出便捷方法
export const { get, post, put, patch, delete: del, upload, download } = apiService

// 导出 Composition API
export const useApi = () => {
  return {
    get: apiService.get.bind(apiService),
    post: apiService.post.bind(apiService),
    put: apiService.put.bind(apiService),
    patch: apiService.patch.bind(apiService),
    delete: apiService.delete.bind(apiService),
    upload: apiService.upload.bind(apiService),
    download: apiService.download.bind(apiService),
    createCancelToken: apiService.createCancelToken.bind(apiService),
    healthCheck: apiService.healthCheck.bind(apiService)
  }
}
