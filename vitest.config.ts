/**
 * Vitest 配置文件
 * 配置单元测试、集成测试和性能测试
 */

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './src/tests')
    }
  },

  test: {
    // 测试环境配置
    environment: 'jsdom',
    
    // 全局设置
    globals: true,
    
    // 设置文件
    setupFiles: ['./src/tests/setup.ts'],
    
    // 包含的测试文件
    include: [
      'src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // 排除的文件
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e'
    ],
    
    // 覆盖率配置
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/tests/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**'
      ],
      // 覆盖率阈值
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // 测试超时设置
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // 并发设置
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // 监听模式配置
    watch: {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    },
    
    // 报告器配置
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/results.html'
    },
    
    // 模拟配置
    deps: {
      inline: ['element-plus']
    },
    
    // 环境变量
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:7001',
      VITE_ENABLE_MOCK: 'true'
    }
  },

  // 定义不同的测试配置
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})