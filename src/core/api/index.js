/**
 * 现代化 API 服务
 * 统一的 HTTP 客户端和请求管理
 */

import axios from 'axios'
import { authService } from '@/core/auth'

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

        // 添加缓存破坏参数
        if (config.method === 'get' && config.cache !== false) {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }

        // 记录请求
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`)
        
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
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`)
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
          console.log('🔒 Authentication expired, logging out')
          await authService.logout()
          window.location.href = '/login'
          return Promise.reject(new Error('Authentication expired'))
        }

        // 处理权限错误
        if (response?.status === 403) {
          console.log('🚫 Access denied')
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
    console.log(`🔄 Retrying request (${config.__retryCount}/${API_CONFIG.retryAttempts}) after ${delay}ms`)
    
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
      headers: {
        'Content-Type': 'multipart/form-data'
      },
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
