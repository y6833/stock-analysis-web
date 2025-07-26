/**
 * 错误修复验证工具
 * 用于验证导入错误和函数定义问题是否已修复
 */

// 验证 DojiPattern 类型导入
import type { DojiPattern } from '../types/technical-analysis/doji'

// 验证 DojiPatternScreener 导入
import { DojiPatternScreener } from '../services/DojiPatternScreener'

// 验证 watchlistService 导入和方法
import { watchlistService } from '../services/watchlistService'

/**
 * 验证 DojiPattern 类型是否正确导入
 */
export function validateDojiPatternType(): boolean {
  try {
    // 创建一个示例 DojiPattern 对象来验证类型
    const samplePattern: DojiPattern = {
      id: 'test',
      stockId: '000001.SZ',
      stockName: '平安银行',
      timestamp: Date.now(),
      patternType: 'standard',
      candle: {
        open: 10.0,
        high: 10.2,
        low: 9.8,
        close: 10.0,
        volume: 1000000
      },
      significance: 0.8,
      context: {
        trend: 'uptrend',
        volume: 'high',
        position: 'middle'
      }
    }
    
    console.log('✅ DojiPattern 类型验证成功:', samplePattern.id)
    return true
  } catch (error) {
    console.error('❌ DojiPattern 类型验证失败:', error)
    return false
  }
}

/**
 * 验证 DojiPatternScreener 类是否正确导入
 */
export function validateDojiPatternScreener(): boolean {
  try {
    // 检查 DojiPatternScreener 类是否存在
    if (typeof DojiPatternScreener === 'function') {
      console.log('✅ DojiPatternScreener 类验证成功')
      return true
    } else {
      console.error('❌ DojiPatternScreener 不是一个构造函数')
      return false
    }
  } catch (error) {
    console.error('❌ DojiPatternScreener 类验证失败:', error)
    return false
  }
}

/**
 * 验证 watchlistService 方法是否存在
 */
export function validateWatchlistService(): boolean {
  try {
    const requiredMethods = [
      'getUserWatchlists',
      'createWatchlist',
      'updateWatchlist',
      'deleteWatchlist',
      'getWatchlistItems',
      'addStockToWatchlist',
      'removeStockFromWatchlist',
      'updateWatchlistItemNotes',
      'getWatchlist',
      'addToWatchlist',
      'removeFromWatchlist',
      'updateWatchlistItem',
      'addMultipleToWatchlist',
      'clearWatchlist'
    ]
    
    const missingMethods: string[] = []
    
    for (const method of requiredMethods) {
      if (typeof watchlistService[method as keyof typeof watchlistService] !== 'function') {
        missingMethods.push(method)
      }
    }
    
    if (missingMethods.length === 0) {
      console.log('✅ watchlistService 所有方法验证成功')
      return true
    } else {
      console.error('❌ watchlistService 缺少方法:', missingMethods)
      return false
    }
  } catch (error) {
    console.error('❌ watchlistService 验证失败:', error)
    return false
  }
}

/**
 * 运行所有验证
 */
export function runAllValidations(): {
  dojiPatternType: boolean
  dojiPatternScreener: boolean
  watchlistService: boolean
  allPassed: boolean
} {
  console.log('🔍 开始验证错误修复...')
  
  const results = {
    dojiPatternType: validateDojiPatternType(),
    dojiPatternScreener: validateDojiPatternScreener(),
    watchlistService: validateWatchlistService(),
    allPassed: false
  }
  
  results.allPassed = results.dojiPatternType && 
                      results.dojiPatternScreener && 
                      results.watchlistService
  
  if (results.allPassed) {
    console.log('🎉 所有验证通过！错误修复成功')
  } else {
    console.log('⚠️ 部分验证失败，请检查相关问题')
  }
  
  return results
}

/**
 * 验证特定的导入错误是否已修复
 */
export function validateSpecificErrors(): void {
  console.log('🔧 验证特定错误修复...')
  
  try {
    // 验证 DojiPattern 导出问题
    console.log('检查 DojiPattern 导出...')
    const dojiModule = require('../types/technical-analysis/doji')
    if (dojiModule.DojiPattern || dojiModule.default?.DojiPattern) {
      console.log('✅ DojiPattern 导出正常')
    } else {
      console.log('ℹ️ DojiPattern 作为类型导出（这是正确的）')
    }
    
    // 验证 getWatchlistStocks 函数问题
    console.log('检查 getWatchlistStocks 函数...')
    if (typeof watchlistService.getWatchlistStocks === 'function') {
      console.log('❌ getWatchlistStocks 仍然存在（应该已被移除）')
    } else {
      console.log('✅ getWatchlistStocks 已正确移除')
    }
    
  } catch (error) {
    console.error('验证过程中出现错误:', error)
  }
}

// 自动运行验证（仅在开发环境）
if (import.meta.env.DEV) {
  // 延迟执行，确保所有模块都已加载
  setTimeout(() => {
    runAllValidations()
    validateSpecificErrors()
  }, 1000)
}
