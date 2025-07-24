/**
 * Jest configuration for stock-analysis-web
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // File extensions for tests
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'vue'],
  
  // Transform files
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  
  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,ts,vue}',
    '!src/tests/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  coverageReporters: ['text', 'lcov', 'clover'],
  
  // Test paths
  testMatch: [
    '<rootDir>/src/tests/**/*.spec.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/__tests__/*.(js|jsx|ts|tsx)'
  ],
  
  // Setup files
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Global variables
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Verbose output
  verbose: true,
  
  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
      }
    ]
  ]
};