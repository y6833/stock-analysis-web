// 测试设置文件
import { afterEach, beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { webcrypto } from 'node:crypto'

// 添加 crypto polyfill
if (!global.crypto) {
  global.crypto = webcrypto as any
}

// 确保 getRandomValues 可用
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto)
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  }
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn(cb => setTimeout(cb, 1))
global.cancelIdleCallback = vi.fn(id => clearTimeout(id))

// 全局测试设置
beforeEach(() => {
  // 在每个测试之前执行的操作
})

afterEach(() => {
  // 在每个测试之后执行的操作
  vi.restoreAllMocks()
  vi.clearAllTimers()
})

// Vue Test Utils 全局配置
config.global.stubs = {
  // 全局存根配置
}

config.global.mocks = {
  $t: (key: string) => key, // Mock i18n
  $route: {
    path: '/',
    params: {},
    query: {},
    hash: '',
    fullPath: '/',
    matched: [],
    name: undefined,
    redirectedFrom: undefined
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }
}

// 模拟全局对象
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })),
  useRoute: vi.fn(() => ({
    params: {},
    query: {},
    path: '/',
    name: 'Home'
  }))
}))

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    length: 0,
    key: vi.fn()
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// 模拟 sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    length: 0,
    key: vi.fn()
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Global test utilities
global.testUtils = {
  // Helper to create mock data
  createMockStock: (overrides = {}) => ({
    symbol: '000001',
    name: '平安银行',
    price: 10.5,
    change: 0.1,
    changePercent: 0.95,
    volume: 1000000,
    ...overrides
  }),

  createMockUser: (overrides = {}) => ({
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  }),

  // Helper to wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Helper to wait for specific time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}
