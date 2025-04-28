// 测试设置文件
import { afterEach, beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'

// 全局测试设置
beforeEach(() => {
  // 在每个测试之前执行的操作
})

afterEach(() => {
  // 在每个测试之后执行的操作
  vi.restoreAllMocks()
})

// Vue Test Utils 全局配置
config.global.stubs = {
  // 全局存根配置
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
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})
