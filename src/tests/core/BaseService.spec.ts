/**
 * BaseService 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaseService, BaseDataService } from '@/core/BaseService'
import errorHandlingService from '@/services/errorHandlingService'
import loadingService from '@/services/loadingService'

// Mock dependencies
vi.mock('@/services/errorHandlingService')
vi.mock('@/services/loadingService')
vi.mock('@/services/apiService', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn()
}))

describe('BaseService', () => {
  let service: BaseService

  beforeEach(() => {
    service = new (class TestService extends BaseService {
      constructor() {
        super('TestService')
      }
    })()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(service.getServiceName()).toBe('TestService')
      expect(service.getConfig()).toMatchObject({
        timeout: 8000,
        retryCount: 3,
        enableLoading: false,
        enableCache: true
      })
    })

    it('should merge custom config', () => {
      const customService = new (class CustomService extends BaseService {
        constructor() {
          super('CustomService', {
            timeout: 5000,
            enableLoading: true
          })
        }
      })()

      expect(customService.getConfig()).toMatchObject({
        timeout: 5000,
        retryCount: 3,
        enableLoading: true,
        enableCache: true
      })
    })
  })

  describe('validateRequired', () => {
    it('should pass validation for valid params', () => {
      const params = { name: 'test', value: 123 }
      const requiredFields = ['name', 'value']

      expect(() => {
        service['validateRequired'](params, requiredFields)
      }).not.toThrow()
    })

    it('should throw error for missing required fields', () => {
      const params = { name: 'test' }
      const requiredFields = ['name', 'value']

      expect(() => {
        service['validateRequired'](params, requiredFields)
      }).toThrow('缺少必需参数: value')
    })

    it('should throw error for empty string fields', () => {
      const params = { name: '', value: 123 }
      const requiredFields = ['name', 'value']

      expect(() => {
        service['validateRequired'](params, requiredFields)
      }).toThrow('缺少必需参数: name')
    })

    it('should throw error for null fields', () => {
      const params = { name: null, value: 123 }
      const requiredFields = ['name', 'value']

      expect(() => {
        service['validateRequired'](params, requiredFields)
      }).toThrow('缺少必需参数: name')
    })
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await service['withRetry'](operation, 3, 100)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')
      
      const result = await service['withRetry'](operation, 3, 10)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'))
      
      await expect(service['withRetry'](operation, 2, 10)).rejects.toThrow('Persistent failure')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation error')
      error.name = 'ValidationError'
      const operation = vi.fn().mockRejectedValue(error)
      
      await expect(service['withRetry'](operation, 3, 10)).rejects.toThrow('Validation error')
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('isNonRetryableError', () => {
    it('should identify non-retryable errors', () => {
      const validationError = new Error('Validation failed')
      validationError.name = 'ValidationError'
      
      const authError = new Error('Unauthorized')
      authError.name = 'UnauthorizedError'
      
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'

      expect(service['isNonRetryableError'](validationError)).toBe(true)
      expect(service['isNonRetryableError'](authError)).toBe(true)
      expect(service['isNonRetryableError'](networkError)).toBe(false)
    })
  })

  describe('formatResponse', () => {
    it('should format response with data', () => {
      const data = { id: 1, name: 'test' }
      const response = service['formatResponse'](data)

      expect(response).toEqual({
        success: true,
        data,
        message: 'Success'
      })
    })

    it('should handle response that already has success property', () => {
      const data = { success: true, data: { id: 1 }, message: 'Custom message' }
      const response = service['formatResponse'](data)

      expect(response).toEqual(data)
    })
  })

  describe('getErrorType', () => {
    it('should classify timeout errors', () => {
      const timeoutError = { code: 'ECONNABORTED' }
      expect(service['getErrorType'](timeoutError)).toBe('network')
    })

    it('should classify auth errors', () => {
      const authError = { response: { status: 401 } }
      expect(service['getErrorType'](authError)).toBe('auth')
    })

    it('should classify permission errors', () => {
      const permissionError = { response: { status: 403 } }
      expect(service['getErrorType'](permissionError)).toBe('permission')
    })

    it('should classify validation errors', () => {
      const validationError = { response: { status: 400 } }
      expect(service['getErrorType'](validationError)).toBe('validation')
    })

    it('should classify server errors', () => {
      const serverError = { response: { status: 500 } }
      expect(service['getErrorType'](serverError)).toBe('server')
    })

    it('should classify network errors', () => {
      const networkError = { message: 'Network Error' }
      expect(service['getErrorType'](networkError)).toBe('network')
    })

    it('should default to unknown for unclassified errors', () => {
      const unknownError = { message: 'Unknown error' }
      expect(service['getErrorType'](unknownError)).toBe('unknown')
    })
  })
})

describe('BaseDataService', () => {
  let dataService: BaseDataService

  beforeEach(() => {
    dataService = new (class TestDataService extends BaseDataService {
      constructor() {
        super('TestDataService')
      }
    })()
  })

  describe('constructor', () => {
    it('should initialize with data service defaults', () => {
      expect(dataService.getConfig()).toMatchObject({
        enableLoading: true,
        enableCache: true
      })
    })
  })

  describe('formatListResponse', () => {
    it('should format list response with pagination', () => {
      const items = [{ id: 1 }, { id: 2 }]
      const response = dataService['formatListResponse'](items, 10, 1, 5)

      expect(response).toEqual({
        success: true,
        data: {
          items,
          total: 10,
          page: 1,
          pageSize: 5,
          hasMore: true
        }
      })
    })

    it('should handle last page correctly', () => {
      const items = [{ id: 1 }]
      const response = dataService['formatListResponse'](items, 6, 2, 5)

      expect(response.data.hasMore).toBe(false)
    })

    it('should use defaults when parameters are not provided', () => {
      const items = [{ id: 1 }, { id: 2 }]
      const response = dataService['formatListResponse'](items)

      expect(response.data).toMatchObject({
        items,
        total: 2,
        page: 1,
        pageSize: 2,
        hasMore: false
      })
    })
  })

  describe('formatItemResponse', () => {
    it('should format single item response', () => {
      const item = { id: 1, name: 'test' }
      const response = dataService['formatItemResponse'](item)

      expect(response).toEqual({
        success: true,
        data: item
      })
    })
  })
})