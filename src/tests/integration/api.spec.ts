/**
 * API 集成测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiService } from '@/services/refactored/ApiService'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock offline services
vi.mock('@/services/offlineDataService', () => ({
  saveOfflineData: vi.fn(),
  getOfflineData: vi.fn(),
  isOnline: vi.fn().mockReturnValue(true),
  savePendingWatchlistChange: vi.fn(),
  savePendingPortfolioChange: vi.fn()
}))

vi.mock('@/services/networkStatusService', () => ({
  getNetworkAwareTimeout: vi.fn().mockReturnValue(8000)
}))

vi.mock('@/services/errorHandlingService', () => ({
  default: {
    createAppError: vi.fn(),
    handleError: vi.fn()
  }
}))

vi.mock('@/services/loadingService', () => ({
  default: {
    showGlobalLoading: vi.fn(),
    hideGlobalLoading: vi.fn()
  }
}))

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup axios mock
    mockedAxios.create = vi.fn().mockReturnValue({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Stock API Integration', () => {
    it('should fetch stock list successfully', async () => {
      const mockStocks = [
        { symbol: '000001', name: '平安银行' },
        { symbol: '000002', name: '万科A' }
      ]

      const mockAxiosInstance = {
        request: vi.fn().mockResolvedValue({
          data: { success: true, data: mockStocks }
        })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const result = await apiService.get('/stocks')
      expect(result).toEqual({ success: true, data: mockStocks })
    })

    it('should handle API errors gracefully', async () => {
      const mockAxiosInstance = {
        request: vi.fn().mockRejectedValue({
          response: { status: 500 },
          message: 'Server Error'
        })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      await expect(apiService.get('/stocks')).rejects.toThrow()
    })

    it('should retry failed requests', async () => {
      const mockAxiosInstance = {
        request: vi.fn()
          .mockRejectedValueOnce(new Error('Network Error'))
          .mockRejectedValueOnce(new Error('Network Error'))
          .mockResolvedValue({ data: { success: true } })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const result = await apiService.get('/stocks', undefined, { retryCount: 3 })
      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })
  })

  describe('Authentication Integration', () => {
    it('should include auth token in requests', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('mock-token')
      }
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      })

      const mockAxiosInstance = {
        request: vi.fn().mockResolvedValue({ data: { success: true } })
      }

      const requestInterceptor = vi.fn().mockImplementation((config) => {
        expect(config.headers.Authorization).toBe('Bearer mock-token')
        return config
      })

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { 
            use: vi.fn().mockImplementation((interceptor) => {
              requestInterceptor.mockImplementation(interceptor)
            })
          },
          response: { use: vi.fn() }
        }
      })

      await apiService.get('/protected-endpoint')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('should handle 401 unauthorized responses', async () => {
      const mockAxiosInstance = {
        request: vi.fn().mockRejectedValue({
          response: { status: 401 },
          config: {}
        })
      }

      const responseInterceptor = vi.fn()

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { 
            use: vi.fn().mockImplementation((success, error) => {
              responseInterceptor.mockImplementation(error)
            })
          }
        }
      })

      await expect(apiService.get('/protected-endpoint')).rejects.toThrow()
    })
  })

  describe('Caching Integration', () => {
    it('should cache GET request responses', async () => {
      const mockData = { id: 1, name: 'test' }
      
      const mockAxiosInstance = {
        request: vi.fn().mockResolvedValue({ data: mockData })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      // Mock saveOfflineData
      const { saveOfflineData } = await import('@/services/offlineDataService')
      
      await apiService.get('/test-endpoint')
      
      expect(saveOfflineData).toHaveBeenCalled()
    })

    it('should return cached data when offline', async () => {
      const cachedData = { id: 1, name: 'cached' }
      
      // Mock offline state
      const { isOnline, getOfflineData } = await import('@/services/offlineDataService')
      vi.mocked(isOnline).mockReturnValue(false)
      vi.mocked(getOfflineData).mockResolvedValue(cachedData)

      const result = await apiService.get('/test-endpoint')
      expect(result).toEqual(cachedData)
    })
  })

  describe('Batch Operations', () => {
    it('should handle batch requests', async () => {
      const mockResponses = [
        { data: { id: 1 } },
        { data: { id: 2 } },
        { data: { id: 3 } }
      ]

      const mockAxiosInstance = {
        request: vi.fn()
          .mockResolvedValueOnce(mockResponses[0])
          .mockResolvedValueOnce(mockResponses[1])
          .mockResolvedValueOnce(mockResponses[2])
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const requests = [
        { method: 'GET', url: '/item/1' },
        { method: 'GET', url: '/item/2' },
        { method: 'GET', url: '/item/3' }
      ]

      const results = await apiService.batch(requests)
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1 })
    })

    it('should handle partial batch failures', async () => {
      const mockAxiosInstance = {
        request: vi.fn()
          .mockResolvedValueOnce({ data: { id: 1 } })
          .mockRejectedValueOnce(new Error('Request failed'))
          .mockResolvedValueOnce({ data: { id: 3 } })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const requests = [
        { method: 'GET', url: '/item/1' },
        { method: 'GET', url: '/item/2' },
        { method: 'GET', url: '/item/3' }
      ]

      await expect(apiService.batch(requests)).rejects.toThrow()
    })
  })

  describe('Preloading', () => {
    it('should preload multiple URLs', async () => {
      const mockAxiosInstance = {
        request: vi.fn().mockResolvedValue({ data: { success: true } })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const urls = ['/stocks', '/news', '/market-data']
      
      await apiService.preload(urls)
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should handle preload failures gracefully', async () => {
      const mockAxiosInstance = {
        request: vi.fn()
          .mockResolvedValueOnce({ data: { success: true } })
          .mockRejectedValueOnce(new Error('Preload failed'))
          .mockResolvedValueOnce({ data: { success: true } })
      }

      mockedAxios.create = vi.fn().mockReturnValue({
        ...mockAxiosInstance,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      })

      const urls = ['/stocks', '/news', '/market-data']
      
      // Should not throw even if some preloads fail
      await expect(apiService.preload(urls)).resolves.toBeUndefined()
    })
  })
})