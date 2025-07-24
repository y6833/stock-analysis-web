/**
 * 统一工具函数库
 * 整合所有分散的工具函数，提供统一的工具库
 */

// 重新导出现有的工具函数
export * from './dateUtils'
export * from './formatters'
export * from './debounce'
export * from './eventBus'
export * from './toast'
export * from './auth'
export * from './performanceMonitor'
export * from './accessibilityUtils'
export * from './responsiveUtils'
export * from './sensitiveDataUtils'

// 通用工具函数
export const CommonUtils = {
  /**
   * 生成唯一ID
   */
  generateId: (prefix: string = 'id'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * 深拷贝对象
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T
    }
    
    if (obj instanceof Array) {
      return obj.map(item => CommonUtils.deepClone(item)) as unknown as T
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = CommonUtils.deepClone(obj[key])
        }
      }
      return cloned
    }
    
    return obj
  },

  /**
   * 深度合并对象
   */
  deepMerge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target
    const source = sources.shift()

    if (CommonUtils.isObject(target) && CommonUtils.isObject(source)) {
      for (const key in source) {
        if (CommonUtils.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} })
          CommonUtils.deepMerge(target[key], source[key])
        } else {
          Object.assign(target, { [key]: source[key] })
        }
      }
    }

    return CommonUtils.deepMerge(target, ...sources)
  },

  /**
   * 判断是否为对象
   */
  isObject: (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item)
  },

  /**
   * 判断是否为空值
   */
  isEmpty: (value: any): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  },

  /**
   * 获取嵌套对象属性值
   */
  getNestedValue: (obj: any, path: string, defaultValue: any = undefined): any => {
    const keys = path.split('.')
    let result = obj

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue
      }
      result = result[key]
    }

    return result !== undefined ? result : defaultValue
  },

  /**
   * 设置嵌套对象属性值
   */
  setNestedValue: (obj: any, path: string, value: any): void => {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    let current = obj

    for (const key of keys) {
      if (!(key in current) || !CommonUtils.isObject(current[key])) {
        current[key] = {}
      }
      current = current[key]
    }

    current[lastKey] = value
  },

  /**
   * 数组去重
   */
  unique: <T>(array: T[], key?: keyof T): T[] => {
    if (!key) {
      return [...new Set(array)]
    }

    const seen = new Set()
    return array.filter(item => {
      const value = item[key]
      if (seen.has(value)) {
        return false
      }
      seen.add(value)
      return true
    })
  },

  /**
   * 数组分组
   */
  groupBy: <T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key])
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {} as Record<string, T[]>)
  },

  /**
   * 数组排序
   */
  sortBy: <T>(array: T[], key: keyof T | ((item: T) => any), order: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aValue = typeof key === 'function' ? key(a) : a[key]
      const bValue = typeof key === 'function' ? key(b) : b[key]

      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })
  }
}

// 字符串工具函数
export const StringUtils = {
  /**
   * 首字母大写
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  },

  /**
   * 驼峰命名转换
   */
  toCamelCase: (str: string): string => {
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
  },

  /**
   * 短横线命名转换
   */
  toKebabCase: (str: string): string => {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  },

  /**
   * 下划线命名转换
   */
  toSnakeCase: (str: string): string => {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  },

  /**
   * 截断字符串
   */
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (str.length <= length) return str
    return str.substring(0, length - suffix.length) + suffix
  },

  /**
   * 移除HTML标签
   */
  stripHtml: (str: string): string => {
    return str.replace(/<[^>]*>/g, '')
  },

  /**
   * 转义HTML字符
   */
  escapeHtml: (str: string): string => {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  },

  /**
   * 生成随机字符串
   */
  randomString: (length: number = 8, chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string => {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// 数字工具函数
export const NumberUtils = {
  /**
   * 格式化数字
   */
  format: (num: number, decimals: number = 2, thousandsSep: string = ','): string => {
    const parts = num.toFixed(decimals).split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep)
    return parts.join('.')
  },

  /**
   * 格式化百分比
   */
  formatPercent: (num: number, decimals: number = 2): string => {
    return `${(num * 100).toFixed(decimals)}%`
  },

  /**
   * 格式化货币
   */
  formatCurrency: (num: number, currency: string = '¥', decimals: number = 2): string => {
    return `${currency}${NumberUtils.format(num, decimals)}`
  },

  /**
   * 格式化文件大小
   */
  formatFileSize: (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
  },

  /**
   * 生成随机数
   */
  random: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  /**
   * 限制数字范围
   */
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max)
  },

  /**
   * 四舍五入到指定精度
   */
  round: (num: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals)
    return Math.round(num * factor) / factor
  }
}

// URL工具函数
export const UrlUtils = {
  /**
   * 解析URL参数
   */
  parseQuery: (url: string = window.location.href): Record<string, string> => {
    const query: Record<string, string> = {}
    const urlObj = new URL(url)
    
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value
    })
    
    return query
  },

  /**
   * 构建URL参数
   */
  buildQuery: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    
    return searchParams.toString()
  },

  /**
   * 合并URL和参数
   */
  buildUrl: (baseUrl: string, params?: Record<string, any>): string => {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl
    }
    
    const queryString = UrlUtils.buildQuery(params)
    const separator = baseUrl.includes('?') ? '&' : '?'
    
    return `${baseUrl}${separator}${queryString}`
  },

  /**
   * 验证URL格式
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// 存储工具函数
export const StorageUtils = {
  /**
   * 本地存储操作
   */
  local: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue || null
      } catch {
        return defaultValue || null
      }
    },

    set: (key: string, value: any): boolean => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },

    remove: (key: string): boolean => {
      try {
        localStorage.removeItem(key)
        return true
      } catch {
        return false
      }
    },

    clear: (): boolean => {
      try {
        localStorage.clear()
        return true
      } catch {
        return false
      }
    }
  },

  /**
   * 会话存储操作
   */
  session: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const item = sessionStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue || null
      } catch {
        return defaultValue || null
      }
    },

    set: (key: string, value: any): boolean => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },

    remove: (key: string): boolean => {
      try {
        sessionStorage.removeItem(key)
        return true
      } catch {
        return false
      }
    },

    clear: (): boolean => {
      try {
        sessionStorage.clear()
        return true
      } catch {
        return false
      }
    }
  }
}

// 验证工具函数
export const ValidationUtils = {
  /**
   * 邮箱验证
   */
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * 手机号验证
   */
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  /**
   * 身份证验证
   */
  isIdCard: (idCard: string): boolean => {
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
    return idCardRegex.test(idCard)
  },

  /**
   * URL验证
   */
  isUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  /**
   * 密码强度验证
   */
  isStrongPassword: (password: string): boolean => {
    // 至少8位，包含大小写字母、数字和特殊字符
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return strongPasswordRegex.test(password)
  },

  /**
   * 股票代码验证
   */
  isStockCode: (code: string): boolean => {
    // 支持A股、港股、美股代码格式
    const stockCodeRegex = /^([0-9]{6}\.(SH|SZ|BJ)|[A-Z]{1,5}|\d{5}\.HK)$/
    return stockCodeRegex.test(code)
  }
}

// 导出所有工具函数
export const Utils = {
  Common: CommonUtils,
  String: StringUtils,
  Number: NumberUtils,
  Url: UrlUtils,
  Storage: StorageUtils,
  Validation: ValidationUtils
}

export default Utils