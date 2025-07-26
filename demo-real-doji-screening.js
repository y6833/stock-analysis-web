/**
 * 演示真实十字星形态筛选功能
 * 展示如何使用真实API数据进行十字星形态检测
 */

import { testRealDojiScreening } from './src/utils/testRealDojiScreening.js'

async function runDemo() {
    console.log('🚀 十字星形态筛选功能演示')
    console.log('='.repeat(50))
    console.log('')
    console.log('📊 功能特点:')
    console.log('✅ 使用真实Tushare API数据')
    console.log('✅ 基于OHLC数据的十字星检测算法')
    console.log('✅ 支持多种十字星类型识别')
    console.log('✅ 实时价格走势分析')
    console.log('✅ 智能筛选和排序')
    console.log('')
    console.log('🔗 API端点:')
    console.log('  • http://api.tushare.pro (stock_basic)')
    console.log('  • http://api.tushare.pro (daily)')
    console.log('  • http://api.tushare.pro (daily_basic)')
    console.log('')
    console.log('🎯 十字星类型:')
    console.log('  • standard: 标准十字星')
    console.log('  • dragonfly: 蜻蜓十字星')
    console.log('  • gravestone: 墓碑十字星')
    console.log('  • longLegged: 长腿十字星')
    console.log('')
    console.log('开始测试...')
    console.log('')

    try {
        const result = await testRealDojiScreening()

        if (result.success) {
            console.log('')
            console.log('🎉 测试成功完成!')
            console.log(`📈 检测到股票形态: ${result.stockPatternsCount} 个`)
            console.log(`📊 最近形态数量: ${result.recentPatternsCount} 个`)
            console.log(`🔍 筛选结果数量: ${result.screenResultsCount} 个`)
            console.log('')
            console.log('✨ 所有功能均使用真实API数据，无模拟数据!')
        } else {
            console.log('')
            console.log('❌ 测试失败:', result.error)
            console.log('')
            console.log('💡 可能的原因:')
            console.log('  • Tushare API token无效或过期')
            console.log('  • 网络连接问题')
            console.log('  • API调用频率限制')
            console.log('  • 股票代码格式问题')
        }
    } catch (error) {
        console.log('')
        console.log('❌ 演示过程中出现错误:', error.message)
    }

    console.log('')
    console.log('='.repeat(50))
    console.log('演示结束')
}

// 运行演示
runDemo()
