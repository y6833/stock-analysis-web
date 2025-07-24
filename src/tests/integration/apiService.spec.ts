/**
 * API服务集成测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { apiService } from '@/services/refactored/ApiService'
import { StorageUtils } from '@/utils'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock storage
vi.mock('@/utils', () => ({
  StorageUtils: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  }
}))

// Mock services
vi.mock('@/services/errorHandlingService', () => ({
  default: {
    handleError: vi.fn(),
    createAppError: vi.fn().mockImplementation((type, message) => ({
      type,
      message,
      timestamp: new Date()
    }))
  }
}))

vi.mock('@/services/loadingService', () => ({
  default: {
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn()
  }
}))

vi.mock('@/services/networkStatusService', () => ({
  default: {
    isOnline: vi.fn().mockReturnValue(true),
    getNetworkAwareTimeout: vi.fn().mockReturnValue(10000)
  }
}))

describe('API Service Integration Tests', () => {
  let mockAxiosInstance: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock axios instance
    mockAxiosInstance = {
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    }
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Request Methods', () => {
    it('should make GET requests correctly', async () => {
      const responseData = { success: true, data: { id: 1 } }
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData })
      
      const result = await apiService.get('/test')
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        params: undefined,
        headers: expect.any(Object)
      })
      expect(result).toEqual(responseData)
    })

    it('should make POST requests correctly', async () => {
      const requestData = { name: 'test' }
      const responseData = { success: true, data: { id: 1 } }
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData })
      
      const result = await apiService.post('/test', requestData)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data: requestData,
        headers: expect.any(Object)
      })
      expect(result).toEqual(responseData)
    })

    it('should make PUT requests correctly', async () => {
      const requestData = { id: 1, name: 'updated' }
      const responseData = { success: true, data: { id: 1 } }
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData })
      
      const result = await apiService.put('/test/1', requestData)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/test/1',
        data: requestData,
        headers: expect.any(Object)
      })
      expect(result).toEqual(responseData)
    })

    it('should make DELETE requests correctly', async () => {
      const responseData = { success: true }
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData })
      
      const result = await apiService.delete('/test/1')
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/test/1',
        headers: expect.any(Object)
      })
      expect(result).toEqual(responseData)
    })
  })

  describe('Authentication', () => {
    it('should include auth token in requests when available', async () => {
      // Mock token in storage
      vi.mocked(StorageUtils.local.get).mockReturnValueOnce('test-token')
      
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { success: true } 
      })
      
      await apiService.get('/protected')
      
      // Extract the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      // Test the interceptor with a config object
      const config = { headers: {} }
      const interceptedConfig = requestInterceptor(config)
      
      expect(interceptedConfig.headers.Authorization).toBe('Bearer test-token')
    })

    it('should handle 401 responses by clearing token', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/protected' }
      }
      
      // Extract the response error interceptor
      mockAxiosInstance.interceptors.response.use.mockImplementation((success, error) => {
        // Store the error handler for testing
        apiService._testErrorHandler = error
      })
      
      // Initialize service to set up interceptors
      await apiService.get('/test').catch(() => {})
      
      // Test the error handler
      try {
        await apiService._testErrorHandler(error)
        fail('Should have thrown an error')
      } catch (e) {
        expect(StorageUtils.local.remove).toHaveBeenCalledWith('auth_token')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error')
      mockAxiosInstance.request.mockRejectedValueOnce(networkError)
      
      await expect(apiService.get('/test')).rejects.toThrow()
    })

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      }
      mockAxiosInstance.request.mockRejectedValueOnce(serverError)
      
      await expect(apiService.get('/test')).rejects.toThrow()
    })

    it('should handle validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { 
            message: 'Validation Error',
            errors: { name: 'Name is required' }
          }
        }
      }
      mockAxiosInstance.request.mockRejectedValueOnce(validationError)
      
      await expect(apiService.get('/test')).rejects.toThrow()
    })

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      }
      mockAxiosInstance.request.mockRejectedValueOnce(timeoutError)
      
      await expect(apiService.get('/test')).rejects.toThrow()
    })
  })

  describe('Request Configuration', () => {
    it('should apply custom request config', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { success: true } 
      })
      
      const customConfig = {
        timeout: 5000,
        headers: {
          'Custom-Header': 'test'
        }
      }
      
      await apiService.get('/test', null, { config: customConfig })
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
        timeout: 5000,
        headers: expect.objectContaining({
          'Custom-Header': 'test'
        })
      }))
    })

    it('should handle request cancellation', async () => {
      const cancelToken = axios.CancelToken.source()
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { success: true } 
      })
      
      const promise = apiService.get('/test', null, { 
        config: { cancelToken: cancelToken.token } 
      })
      
      cancelToken.cancel('Request cancelled')
      
      await expect(promise).rejects.toThrow('Request cancelled')
    })
  })

  describe('Batch Operations', () => {
    it('should process batch requests', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockResolvedValueOnce({ data: { id: 2 } })
        .mockResolvedValueOnce({ data: { id: 3 } })
      
      const requests = [
        { method: 'GET', url: '/test/1' },
        { method: 'GET', url: '/test/2' },
        { method: 'GET', url: '/test/3' }
      ]
      
      const results = await apiService.batch(requests)
      
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1 })
      expect(results[1]).toEqual({ id: 2 })
      expect(results[2]).toEqual({ id: 3 })
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should handle batch request failures', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce({ data: { id: 3 } })
      
      const requests = [
        { method: 'GET', url: '/test/1' },
        { method: 'GET', url: '/test/2' },
        { method: 'GET', url: '/test/3' }
      ]
      
      await expect(apiService.batch(requests)).rejects.toThrow('Request failed')
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2) // Should stop after first failure
    })

    it('should process batch requests with continueOnError option', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce({ data: { id: 3 } })
      
      const requests = [
        { method: 'GET', url: '/test/1' },
        { method: 'GET', url: '/test/2' },
        { method: 'GET', url: '/test/3' }
      ]
      
      const results = await apiService.batch(requests, { continueOnError: true })
      
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1 })
      expect(results[1]).toBeNull() // Failed request
      expect(results[2]).toEqual({ id: 3 })
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })
  })

  describe('Caching', () => {
    it('should cache GET requests when enabled', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { success: true, data: { id: 1 } } 
      })
      
      // First request should hit the API
      await apiService.get('/test', null, { cache: { key: 'test-cache', ttl: 60 } })
      
      // Second request should use cache
      await apiService.get('/test', null, { cache: { key: 'test-cache', ttl: 60 } })
      
      // Should only make one actual API call
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1)
    })

    it('should bypass cache when forced', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { success: true, data: { id: 1 } } })
        .mockResolvedValueOnce({ data: { success: true, data: { id: 2 } } })
      
      // First request should hit the API
      await apiService.get('/test', null, { cache: { key: 'test-cache', ttl: 60 } })
      
      // Second request should bypass cache
      await apiService.get('/test', null, { 
        cache: { key: 'test-cache', ttl: 60 },
        forceRefresh: true
      })
      
      // Should make two API calls
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2)
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed requests', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: { success: true } })
      
      const result = await apiService.get('/test', null, { retryCount: 3 })
      
      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      mockAxiosInstance.request
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
      
      await expect(apiService.get('/test', null, { retryCount: 2 })).rejects.toThrow('Network Error')
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2) // Initial + 1 retry
    })

    it('should not retry 4xx errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { message: 'Validation Error' }
        }
      }
      mockAxiosInstance.request.mockRejectedValueOnce(validationError)
      
      await expect(apiService.get('/test', null, { retryCount: 3 })).rejects.toThrow()
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1) // No retries
    })
  })

  describe('Loading Indicators', () => {
    it('should show and hide loading indicators', async () => {
      const { showGlobalLoading, hideGlobalLoading } = await import('@/services/loadingService')
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { success: true } 
      })
      
      await apiService.get('/test', null, { showLoading: true })
      
      expect(showGlobalLoading).toHaveBeenCalled()
      expect(hideGlobalLoading).toHaveBeenCalled()
    })

    it('should hide loading indicator even on error', async () => {
      const { showGlobalLoading, hideGlobalLoading } = await import('@/services/loadingService')
      mockAxiosInstance.request.mockRejectedValueOnce(new Error('Test Error'))
      
      await apiService.get('/test', null, { showLoading: true }).catch(() => {})
      
      expect(showGlobalLoading).toHaveBeenCalled()
      expect(hideGlobalLoading).toHaveBeenCalled()
    })
  })

  describe('Response Transformation', () => {
    it('should transform response data when transformer provided', async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({ 
        data: { items: [1, 2, 3], total: 3 } 
      })
      
      const transformer = (data: any) => ({
        results: data.items,
        count: data.total
      })
      
      const result = await apiService.get('/test', null, { 
        transformResponse: transformer 
      })
      
      expect(result).toEqual({
        results: [1, 2, 3],
        count: 3
      })
    })
  })

  describe('Request Queuing', () => {
    it('should queue requests when enabled', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockResolvedValueOnce({ data: { id: 2 } })
      
      // Start two requests with queuing enabled
      const promise1 = apiService.get('/test/1', null, { queue: 'test-queue' })
      const promise2 = apiService.get('/test/2', null, { queue: 'test-queue' })
      
      // Both should complete
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      expect(result1).toEqual({ id: 1 })
      expect(result2).toEqual({ id: 2 })
      
      // Second request should wait for first to complete
      expect(mockAxiosInstance.request.mock.invocationCallOrder[0])
        .toBeLessThan(mockAxiosInstance.request.mock.invocationCallOrder[1])
    })
  })
})