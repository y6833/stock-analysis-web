/**
 * Utils 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  CommonUtils, 
  StringUtils, 
  NumberUtils, 
  UrlUtils, 
  StorageUtils, 
  ValidationUtils 
} from '@/utils'

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
})

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock()
})

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock()
})

describe('CommonUtils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = CommonUtils.generateId()
      const id2 = CommonUtils.generateId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^id_\d+_[a-z0-9]+$/)
    })

    it('should use custom prefix', () => {
      const id = CommonUtils.generateId('test')
      expect(id).toMatch(/^test_\d+_[a-z0-9]+$/)
    })
  })

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(CommonUtils.deepClone(42)).toBe(42)
      expect(CommonUtils.deepClone('hello')).toBe('hello')
      expect(CommonUtils.deepClone(true)).toBe(true)
      expect(CommonUtils.deepClone(null)).toBe(null)
    })

    it('should clone dates', () => {
      const date = new Date('2023-01-01')
      const cloned = CommonUtils.deepClone(date)
      
      expect(cloned).toBeInstanceOf(Date)
      expect(cloned.getTime()).toBe(date.getTime())
      expect(cloned).not.toBe(date)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }]
      const cloned = CommonUtils.deepClone(arr)
      
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[2]).not.toBe(arr[2])
    })

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } }
      const cloned = CommonUtils.deepClone(obj)
      
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.b).not.toBe(obj.b)
    })
  })

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = { a: 1, b: { c: 2 } }
      const source = { b: { d: 3 }, e: 4 }
      
      const result = CommonUtils.deepMerge(target, source)
      
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      })
    })

    it('should handle multiple sources', () => {
      const target = { a: 1 }
      const source1 = { b: 2 }
      const source2 = { c: 3 }
      
      const result = CommonUtils.deepMerge(target, source1, source2)
      
      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })
  })

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(CommonUtils.isEmpty(null)).toBe(true)
      expect(CommonUtils.isEmpty(undefined)).toBe(true)
      expect(CommonUtils.isEmpty('')).toBe(true)
      expect(CommonUtils.isEmpty('   ')).toBe(true)
      expect(CommonUtils.isEmpty([])).toBe(true)
      expect(CommonUtils.isEmpty({})).toBe(true)
    })

    it('should detect non-empty values', () => {
      expect(CommonUtils.isEmpty('hello')).toBe(false)
      expect(CommonUtils.isEmpty([1])).toBe(false)
      expect(CommonUtils.isEmpty({ a: 1 })).toBe(false)
      expect(CommonUtils.isEmpty(0)).toBe(false)
      expect(CommonUtils.isEmpty(false)).toBe(false)
    })
  })

  describe('getNestedValue', () => {
    const obj = {
      a: {
        b: {
          c: 'value'
        }
      }
    }

    it('should get nested values', () => {
      expect(CommonUtils.getNestedValue(obj, 'a.b.c')).toBe('value')
    })

    it('should return default for missing paths', () => {
      expect(CommonUtils.getNestedValue(obj, 'a.b.d', 'default')).toBe('default')
    })

    it('should handle null/undefined objects', () => {
      expect(CommonUtils.getNestedValue(null, 'a.b', 'default')).toBe('default')
    })
  })

  describe('unique', () => {
    it('should remove duplicates from primitive array', () => {
      const arr = [1, 2, 2, 3, 1]
      expect(CommonUtils.unique(arr)).toEqual([1, 2, 3])
    })

    it('should remove duplicates by key', () => {
      const arr = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' }
      ]
      
      const result = CommonUtils.unique(arr, 'id')
      expect(result).toHaveLength(2)
      expect(result.map(item => item.id)).toEqual([1, 2])
    })
  })

  describe('groupBy', () => {
    it('should group by key', () => {
      const arr = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ]
      
      const result = CommonUtils.groupBy(arr, 'category')
      
      expect(result.A).toHaveLength(2)
      expect(result.B).toHaveLength(1)
    })

    it('should group by function', () => {
      const arr = [1, 2, 3, 4, 5, 6]
      
      const result = CommonUtils.groupBy(arr, item => item % 2 === 0 ? 'even' : 'odd')
      
      expect(result.even).toEqual([2, 4, 6])
      expect(result.odd).toEqual([1, 3, 5])
    })
  })
})

describe('StringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello')
      expect(StringUtils.capitalize('HELLO')).toBe('Hello')
      expect(StringUtils.capitalize('')).toBe('')
    })
  })

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(StringUtils.toCamelCase('hello-world')).toBe('helloWorld')
      expect(StringUtils.toCamelCase('my-long-string')).toBe('myLongString')
    })
  })

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world')
      expect(StringUtils.toKebabCase('myLongString')).toBe('my-long-string')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(StringUtils.truncate('hello world', 5)).toBe('he...')
      expect(StringUtils.truncate('hello', 10)).toBe('hello')
    })

    it('should use custom suffix', () => {
      expect(StringUtils.truncate('hello world', 5, '---')).toBe('he---')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(StringUtils.stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
    })
  })

  describe('randomString', () => {
    it('should generate random string of specified length', () => {
      const str = StringUtils.randomString(10)
      expect(str).toHaveLength(10)
      expect(typeof str).toBe('string')
    })

    it('should use custom character set', () => {
      const str = StringUtils.randomString(5, '123')
      expect(str).toMatch(/^[123]+$/)
    })
  })
})

describe('NumberUtils', () => {
  describe('format', () => {
    it('should format numbers with thousands separator', () => {
      expect(NumberUtils.format(1234.56)).toBe('1,234.56')
      expect(NumberUtils.format(1234567.89, 1)).toBe('1,234,567.9')
    })
  })

  describe('formatPercent', () => {
    it('should format as percentage', () => {
      expect(NumberUtils.formatPercent(0.1234)).toBe('12.34%')
      expect(NumberUtils.formatPercent(0.1234, 1)).toBe('12.3%')
    })
  })

  describe('formatCurrency', () => {
    it('should format as currency', () => {
      expect(NumberUtils.formatCurrency(1234.56)).toBe('¥1,234.56')
      expect(NumberUtils.formatCurrency(1234.56, '$')).toBe('$1,234.56')
    })
  })

  describe('formatFileSize', () => {
    it('should format file sizes', () => {
      expect(NumberUtils.formatFileSize(0)).toBe('0 Bytes')
      expect(NumberUtils.formatFileSize(1024)).toBe('1 KB')
      expect(NumberUtils.formatFileSize(1048576)).toBe('1 MB')
    })
  })

  describe('clamp', () => {
    it('should clamp values to range', () => {
      expect(NumberUtils.clamp(5, 1, 10)).toBe(5)
      expect(NumberUtils.clamp(-5, 1, 10)).toBe(1)
      expect(NumberUtils.clamp(15, 1, 10)).toBe(10)
    })
  })

  describe('round', () => {
    it('should round to specified decimals', () => {
      expect(NumberUtils.round(1.2345, 2)).toBe(1.23)
      expect(NumberUtils.round(1.2345, 0)).toBe(1)
    })
  })
})

describe('UrlUtils', () => {
  describe('parseQuery', () => {
    it('should parse URL query parameters', () => {
      const result = UrlUtils.parseQuery('https://example.com?a=1&b=2')
      expect(result).toEqual({ a: '1', b: '2' })
    })
  })

  describe('buildQuery', () => {
    it('should build query string from object', () => {
      const params = { a: 1, b: 'hello', c: null }
      const result = UrlUtils.buildQuery(params)
      expect(result).toBe('a=1&b=hello')
    })
  })

  describe('buildUrl', () => {
    it('should build URL with query parameters', () => {
      const result = UrlUtils.buildUrl('https://example.com', { a: 1, b: 2 })
      expect(result).toBe('https://example.com?a=1&b=2')
    })

    it('should handle existing query parameters', () => {
      const result = UrlUtils.buildUrl('https://example.com?existing=1', { a: 1 })
      expect(result).toBe('https://example.com?existing=1&a=1')
    })
  })

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(UrlUtils.isValidUrl('https://example.com')).toBe(true)
      expect(UrlUtils.isValidUrl('invalid-url')).toBe(false)
    })
  })
})

describe('StorageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('local storage', () => {
    it('should get item from localStorage', () => {
      const mockData = { test: 'value' }
      window.localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(mockData))
      
      const result = StorageUtils.local.get('test-key')
      expect(result).toEqual(mockData)
      expect(window.localStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should set item to localStorage', () => {
      const data = { test: 'value' }
      window.localStorage.setItem = vi.fn()
      
      const result = StorageUtils.local.set('test-key', data)
      expect(result).toBe(true)
      expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(data))
    })

    it('should handle localStorage errors gracefully', () => {
      window.localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      const result = StorageUtils.local.get('test-key', 'default')
      expect(result).toBe('default')
    })
  })

  describe('session storage', () => {
    it('should get item from sessionStorage', () => {
      const mockData = { test: 'value' }
      window.sessionStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(mockData))
      
      const result = StorageUtils.session.get('test-key')
      expect(result).toEqual(mockData)
    })

    it('should set item to sessionStorage', () => {
      const data = { test: 'value' }
      window.sessionStorage.setItem = vi.fn()
      
      const result = StorageUtils.session.set('test-key', data)
      expect(result).toBe(true)
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(data))
    })
  })
})

describe('ValidationUtils', () => {
  describe('isEmail', () => {
    it('should validate email addresses', () => {
      expect(ValidationUtils.isEmail('test@example.com')).toBe(true)
      expect(ValidationUtils.isEmail('invalid-email')).toBe(false)
      expect(ValidationUtils.isEmail('test@')).toBe(false)
      expect(ValidationUtils.isEmail('@example.com')).toBe(false)
    })
  })

  describe('isPhone', () => {
    it('should validate Chinese phone numbers', () => {
      expect(ValidationUtils.isPhone('13812345678')).toBe(true)
      expect(ValidationUtils.isPhone('15987654321')).toBe(true)
      expect(ValidationUtils.isPhone('12345678901')).toBe(false)
      expect(ValidationUtils.isPhone('1381234567')).toBe(false)
    })
  })

  describe('isStrongPassword', () => {
    it('should validate strong passwords', () => {
      expect(ValidationUtils.isStrongPassword('Password123!')).toBe(true)
      expect(ValidationUtils.isStrongPassword('password')).toBe(false)
      expect(ValidationUtils.isStrongPassword('PASSWORD')).toBe(false)
      expect(ValidationUtils.isStrongPassword('Password')).toBe(false)
      expect(ValidationUtils.isStrongPassword('Pass123!')).toBe(false) // too short
    })
  })

  describe('isStockCode', () => {
    it('should validate stock codes', () => {
      expect(ValidationUtils.isStockCode('000001.SZ')).toBe(true)
      expect(ValidationUtils.isStockCode('600000.SH')).toBe(true)
      expect(ValidationUtils.isStockCode('AAPL')).toBe(true)
      expect(ValidationUtils.isStockCode('00700.HK')).toBe(true)
      expect(ValidationUtils.isStockCode('invalid')).toBe(false)
    })
  })

  describe('isUrl', () => {
    it('should validate URLs', () => {
      expect(ValidationUtils.isUrl('https://example.com')).toBe(true)
      expect(ValidationUtils.isUrl('http://example.com')).toBe(true)
      expect(ValidationUtils.isUrl('ftp://example.com')).toBe(true)
      expect(ValidationUtils.isUrl('invalid-url')).toBe(false)
    })
  })
})