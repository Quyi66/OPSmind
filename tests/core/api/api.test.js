import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'

// 模拟 axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// 模拟认证服务
vi.mock('@/core/auth', () => ({
  authService: {
    getAuthHeaders: vi.fn(),
    logout: vi.fn()
  }
}))

describe('API Service', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()

    // 创建模拟的 axios 实例
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    authService.getAuthHeaders.mockReturnValue({
      Authorization: 'Bearer mock-token'
    })
  })

  describe('初始化', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: '/oplus-portal',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
    })

    it('should setup interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('HTTP 方法', () => {
    beforeEach(() => {
      // 重新创建 apiService 实例以使用模拟的 axios
      apiService.client = mockAxiosInstance
    })

    it('should make GET request', async () => {
      const mockResponse = { data: { success: true } }
      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await apiService.get('/test')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {})
      expect(result).toEqual(mockResponse)
    })

    it('should make POST request', async () => {
      const mockResponse = { data: { id: 1 } }
      const postData = { name: 'test' }
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await apiService.post('/test', postData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, {})
      expect(result).toEqual(mockResponse)
    })

    it('should make PUT request', async () => {
      const mockResponse = { data: { updated: true } }
      const putData = { name: 'updated' }
      mockAxiosInstance.put.mockResolvedValue(mockResponse)

      const result = await apiService.put('/test/1', putData)

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, {})
      expect(result).toEqual(mockResponse)
    })

    it('should make DELETE request', async () => {
      const mockResponse = { data: { deleted: true } }
      mockAxiosInstance.delete.mockResolvedValue(mockResponse)

      const result = await apiService.delete('/test/1')

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', {})
      expect(result).toEqual(mockResponse)
    })
  })

  describe('文件操作', () => {
    beforeEach(() => {
      apiService.client = mockAxiosInstance
    })

    it('should upload file', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const mockResponse = { data: { fileId: '123' } }
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const onProgress = vi.fn()
      const result = await apiService.upload('/upload', mockFile, onProgress)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should download file', async () => {
      const mockBlob = new Blob(['file content'], { type: 'text/plain' })
      const mockResponse = { data: mockBlob }
      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      // 模拟 DOM 方法
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      await apiService.download('/download/file.txt', 'test.txt')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/download/file.txt', {
        responseType: 'blob'
      })
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.download).toBe('test.txt')
      expect(mockLink.click).toHaveBeenCalled()

      // 清理
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })

  describe('错误处理', () => {
    it('should handle 401 errors', async () => {
      const error = {
        response: { status: 401 },
        config: { method: 'get', url: '/test' }
      }

      // 模拟响应拦截器的错误处理
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]

      await expect(responseInterceptor(error)).rejects.toThrow('Authentication expired')
      expect(authService.logout).toHaveBeenCalled()
    })

    it('should handle 403 errors', async () => {
      const error = {
        response: { status: 403 },
        config: { method: 'get', url: '/test' }
      }

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]

      await expect(responseInterceptor(error)).rejects.toThrow('Access denied')
    })

    it('should retry on retryable errors', async () => {
      const error = {
        response: { status: 500 },
        config: { method: 'get', url: '/test' }
      }

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]

      // 模拟重试逻辑
      apiService.shouldRetry = vi.fn().mockReturnValue(true)
      apiService.retryRequest = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await responseInterceptor(error)

      expect(apiService.retryRequest).toHaveBeenCalledWith(error.config)
      expect(result).toEqual({ data: 'success' })
    })
  })

  describe('健康检查', () => {
    beforeEach(() => {
      apiService.client = mockAxiosInstance
    })

    it('should return true for healthy service', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 })

      const result = await apiService.healthCheck()

      expect(result).toBe(true)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', {
        timeout: 5000,
        cache: false
      })
    })

    it('should return false for unhealthy service', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Service unavailable'))

      const result = await apiService.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('批量请求', () => {
    it('should handle multiple requests', async () => {
      const requests = [
        Promise.resolve({ data: 'result1' }),
        Promise.resolve({ data: 'result2' }),
        Promise.resolve({ data: 'result3' })
      ]

      const results = await apiService.all(requests)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ data: 'result1' })
      expect(results[1]).toEqual({ data: 'result2' })
      expect(results[2]).toEqual({ data: 'result3' })
    })
  })
})
