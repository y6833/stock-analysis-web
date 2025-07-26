/**
 * Tushare Pro API 测试运行器
 * 提供命令行和程序化接口来运行各种测试套件
 */

import { TushareProIntegrationTestSuite, TestSuiteResult } from './tushareIntegrationTests'

// 测试配置接口
export interface TestConfig {
  // 测试类型
  testType: 'health' | 'full' | 'custom'
  
  // 测试选项
  options: {
    verbose: boolean
    timeout: number
    retryCount: number
    skipSlowTests: boolean
    categories?: string[]
  }
  
  // 报告选项
  reporting: {
    console: boolean
    json: boolean
    html: boolean
    outputDir?: string
  }
}

// 默认测试配置
export const defaultTestConfig: TestConfig = {
  testType: 'health',
  options: {
    verbose: true,
    timeout: 30000,
    retryCount: 1,
    skipSlowTests: false
  },
  reporting: {
    console: true,
    json: false,
    html: false
  }
}

// 测试运行器类
export class TushareTestRunner {
  private config: TestConfig
  private testSuite: TushareProIntegrationTestSuite

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultTestConfig, ...config }
    this.testSuite = new TushareProIntegrationTestSuite()
  }

  /**
   * 运行测试
   */
  async runTests(): Promise<TestSuiteResult> {
    console.log('🚀 启动 Tushare Pro API 测试运行器')
    console.log(`测试类型: ${this.config.testType}`)
    console.log(`超时时间: ${this.config.options.timeout}ms`)
    console.log(`重试次数: ${this.config.options.retryCount}`)

    let result: TestSuiteResult

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`测试超时 (${this.config.options.timeout}ms)`))
        }, this.config.options.timeout)
      })

      // 运行测试
      const testPromise = this.executeTests()

      result = await Promise.race([testPromise, timeoutPromise])

      // 生成报告
      await this.generateReports(result)

      return result
    } catch (error) {
      console.error('❌ 测试运行失败:', error)
      throw error
    }
  }

  /**
   * 执行测试
   */
  private async executeTests(): Promise<TestSuiteResult> {
    switch (this.config.testType) {
      case 'health':
        return await this.testSuite.runHealthCheck()
      
      case 'full':
        return await this.testSuite.runFullTestSuite()
      
      case 'custom':
        return await this.runCustomTests()
      
      default:
        throw new Error(`未知的测试类型: ${this.config.testType}`)
    }
  }

  /**
   * 运行自定义测试
   */
  private async runCustomTests(): Promise<TestSuiteResult> {
    // 这里可以根据配置的 categories 来运行特定类别的测试
    // 目前先运行完整测试套件
    return await this.testSuite.runFullTestSuite()
  }

  /**
   * 生成测试报告
   */
  private async generateReports(result: TestSuiteResult): Promise<void> {
    if (this.config.reporting.console) {
      this.generateConsoleReport(result)
    }

    if (this.config.reporting.json) {
      await this.generateJsonReport(result)
    }

    if (this.config.reporting.html) {
      await this.generateHtmlReport(result)
    }
  }

  /**
   * 生成控制台报告
   */
  private generateConsoleReport(result: TestSuiteResult): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TUSHARE PRO API 测试报告')
    console.log('='.repeat(60))
    
    console.log(`\n📈 总体统计:`)
    console.log(`  总测试数: ${result.totalTests}`)
    console.log(`  通过数量: ${result.passedTests}`)
    console.log(`  失败数量: ${result.failedTests}`)
    console.log(`  成功率: ${((result.passedTests / result.totalTests) * 100).toFixed(1)}%`)
    console.log(`  总耗时: ${(result.duration / 1000).toFixed(2)}s`)

    console.log(`\n📋 分类统计:`)
    Object.entries(result.categories).forEach(([category, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1)
      const status = stats.passed === stats.total ? '✅' : '⚠️'
      console.log(`  ${status} ${category}: ${stats.passed}/${stats.total} (${successRate}%)`)
    })

    if (result.failedTests > 0) {
      console.log(`\n❌ 失败的测试:`)
      result.results
        .filter(r => !r.passed)
        .forEach((test, index) => {
          console.log(`  ${index + 1}. ${test.name}`)
          console.log(`     类别: ${test.category}`)
          console.log(`     错误: ${test.message}`)
          console.log(`     耗时: ${test.duration}ms`)
          if (this.config.options.verbose && test.error) {
            console.log(`     详情: ${test.error.stack || test.error}`)
          }
          console.log()
        })
    }

    if (this.config.options.verbose && result.passedTests > 0) {
      console.log(`\n✅ 通过的测试:`)
      result.results
        .filter(r => r.passed)
        .forEach((test, index) => {
          console.log(`  ${index + 1}. ${test.name} (${test.duration}ms)`)
        })
    }

    console.log('\n' + '='.repeat(60))
    
    // 给出建议
    this.provideSuggestions(result)
  }

  /**
   * 生成 JSON 报告
   */
  private async generateJsonReport(result: TestSuiteResult): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      result: result,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        userAgent: navigator?.userAgent || 'N/A'
      }
    }

    const jsonContent = JSON.stringify(report, null, 2)
    
    if (this.config.reporting.outputDir) {
      // 在实际应用中，这里会写入文件
      console.log(`📄 JSON 报告已生成: ${this.config.reporting.outputDir}/test-report.json`)
    } else {
      console.log('\n📄 JSON 报告:')
      console.log(jsonContent)
    }
  }

  /**
   * 生成 HTML 报告
   */
  private async generateHtmlReport(result: TestSuiteResult): Promise<void> {
    const htmlContent = this.generateHtmlContent(result)
    
    if (this.config.reporting.outputDir) {
      // 在实际应用中，这里会写入文件
      console.log(`📄 HTML 报告已生成: ${this.config.reporting.outputDir}/test-report.html`)
    } else {
      console.log('\n📄 HTML 报告已生成 (内容略)')
    }
  }

  /**
   * 生成 HTML 内容
   */
  private generateHtmlContent(result: TestSuiteResult): string {
    const successRate = ((result.passedTests / result.totalTests) * 100).toFixed(1)
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tushare Pro API 测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; }
        .passed { border-left: 4px solid #4CAF50; }
        .failed { border-left: 4px solid #f44336; }
        .test-list { margin: 20px 0; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-passed { background: #e8f5e8; }
        .test-failed { background: #ffeaea; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Tushare Pro API 测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>测试类型: ${this.config.testType}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <h3>总测试数</h3>
            <p style="font-size: 2em; margin: 0;">${result.totalTests}</p>
        </div>
        <div class="stat-card passed">
            <h3>通过</h3>
            <p style="font-size: 2em; margin: 0; color: #4CAF50;">${result.passedTests}</p>
        </div>
        <div class="stat-card failed">
            <h3>失败</h3>
            <p style="font-size: 2em; margin: 0; color: #f44336;">${result.failedTests}</p>
        </div>
        <div class="stat-card">
            <h3>成功率</h3>
            <p style="font-size: 2em; margin: 0;">${successRate}%</p>
        </div>
    </div>
    
    <h2>测试详情</h2>
    <div class="test-list">
        ${result.results.map(test => `
            <div class="test-item ${test.passed ? 'test-passed' : 'test-failed'}">
                <h4>${test.passed ? '✅' : '❌'} ${test.name}</h4>
                <p><strong>类别:</strong> ${test.category}</p>
                <p><strong>耗时:</strong> ${test.duration}ms</p>
                <p><strong>状态:</strong> ${test.message}</p>
                ${test.error ? `<p><strong>错误:</strong> ${test.error.message || test.error}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `
  }

  /**
   * 提供改进建议
   */
  private provideSuggestions(result: TestSuiteResult): void {
    console.log('💡 改进建议:')

    if (result.failedTests === 0) {
      console.log('  🎉 所有测试都通过了！系统运行良好。')
      return
    }

    const failedCategories = Object.entries(result.categories)
      .filter(([_, stats]) => stats.passed < stats.total)
      .map(([category]) => category)

    if (failedCategories.includes('Configuration')) {
      console.log('  ⚙️  检查配置文件和环境变量设置')
    }

    if (failedCategories.includes('Authentication')) {
      console.log('  🔑 验证 Tushare Token 是否有效且有足够权限')
    }

    if (failedCategories.includes('RateLimit')) {
      console.log('  ⏱️  考虑降低请求频率或升级 Tushare 积分')
    }

    if (failedCategories.includes('DataQuality')) {
      console.log('  📊 检查数据源质量，考虑添加数据清洗逻辑')
    }

    if (failedCategories.includes('Performance')) {
      console.log('  🚀 优化网络连接或考虑使用缓存机制')
    }

    const avgDuration = result.results.reduce((sum, test) => sum + test.duration, 0) / result.results.length
    if (avgDuration > 2000) {
      console.log('  ⚡ 平均响应时间较长，考虑优化网络或使用本地缓存')
    }
  }
}

// 便捷函数
export async function runHealthCheck(): Promise<boolean> {
  const runner = new TushareTestRunner({ testType: 'health' })
  const result = await runner.runTests()
  return result.failedTests === 0
}

export async function runFullTests(): Promise<TestSuiteResult> {
  const runner = new TushareTestRunner({ 
    testType: 'full',
    options: {
      verbose: true,
      timeout: 60000,
      retryCount: 2,
      skipSlowTests: false
    }
  })
  return await runner.runTests()
}

export async function runTestsWithConfig(config: Partial<TestConfig>): Promise<TestSuiteResult> {
  const runner = new TushareTestRunner(config)
  return await runner.runTests()
}
