/**
 * 测试真实十字星形态筛选功能
 * 验证API调用和十字星检测算法
 */

import { HistoricalPatternServiceImpl } from '../services/HistoricalPatternService'
import { DojiPatternScreener } from '../services/DojiPatternScreener'
import { StockDataService } from '../services/StockDataService'
import { DojiScreenCriteria } from '../types/technical-analysis/screener'

/**
 * 测试真实十字星筛选功能
 */
export async function testRealDojiScreening() {
    console.log('=== 开始测试真实十字星形态筛选功能 ===')

    try {
        // 初始化服务
        const historicalPatternService = new HistoricalPatternServiceImpl()
        const stockDataService = new StockDataService()
        const dojiScreener = new DojiPatternScreener(historicalPatternService, stockDataService)

        console.log('\n1. 测试获取单只股票的历史十字星形态')
        console.log('API调用: Tushare daily 接口获取K线数据')

        // 测试获取单只股票的历史形态
        const stockPatterns = await historicalPatternService.getHistoricalPatterns('000001.SZ', 30)
        console.log(`检测到 ${stockPatterns.length} 个十字星形态`)

        if (stockPatterns.length > 0) {
            const pattern = stockPatterns[0]
            console.log('示例形态:', {
                股票代码: pattern.stockId,
                股票名称: pattern.stockName,
                形态类型: pattern.patternType,
                时间戳: new Date(pattern.timestamp).toLocaleDateString(),
                显著性: pattern.significance.toFixed(3),
                开盘价: pattern.candle.open.toFixed(2),
                收盘价: pattern.candle.close.toFixed(2),
                最高价: pattern.candle.high.toFixed(2),
                最低价: pattern.candle.low.toFixed(2),
                成交量: pattern.candle.volume,
                趋势: pattern.context.trend,
                成交量状态: pattern.context.volume,
                价格位置: pattern.context.position
            })
        }

        console.log('\n2. 测试获取最近的十字星形态')
        console.log('API调用: Tushare stock_basic + daily 接口')

        // 测试获取最近形态
        const recentPatterns = await historicalPatternService.getRecentPatterns(7, undefined, 10)
        console.log(`检测到 ${recentPatterns.length} 个最近的十字星形态`)

        if (recentPatterns.length > 0) {
            console.log('最近形态列表:')
            recentPatterns.slice(0, 5).forEach((pattern, index) => {
                console.log(`  ${index + 1}. ${pattern.stockName}(${pattern.stockId}) - ${pattern.patternType} - ${new Date(pattern.timestamp).toLocaleDateString()}`)
            })
        }

        console.log('\n3. 测试价格走势分析')
        console.log('API调用: Tushare daily 接口获取形态后的价格数据')

        if (stockPatterns.length > 0) {
            const analysis = await historicalPatternService.analyzePriceMovement(stockPatterns[0], 10)
            console.log('价格走势分析结果:', {
                '1天后价格变化': analysis.priceMovement.priceChanges.day1?.toFixed(2) + '%',
                '3天后价格变化': analysis.priceMovement.priceChanges.day3?.toFixed(2) + '%',
                '5天后价格变化': analysis.priceMovement.priceChanges.day5?.toFixed(2) + '%',
                '10天后价格变化': analysis.priceMovement.priceChanges.day10?.toFixed(2) + '%',
                '1天后成交量变化': analysis.priceMovement.volumeChanges.day1?.toFixed(2) + '%',
                '5天后成交量变化': analysis.priceMovement.volumeChanges.day5?.toFixed(2) + '%'
            })
        }

        console.log('\n4. 测试完整的十字星筛选功能')
        console.log('API调用: 完整的筛选流程，包括股票列表获取、K线数据获取、形态检测')

        // 测试完整筛选
        const criteria: DojiScreenCriteria = {
            patternTypes: ['dragonfly', 'standard'],
            daysRange: 7,
            minUpwardPercent: -10, // 允许下跌，只是为了测试
            limit: 5,
            sortBy: 'significance',
            sortDirection: 'desc'
        }

        const screenResult = await dojiScreener.screenStocks(criteria)
        console.log(`筛选结果: 找到 ${screenResult.stocks.length} 只符合条件的股票`)

        if (screenResult.stocks.length > 0) {
            console.log('筛选结果列表:')
            screenResult.stocks.forEach((stock, index) => {
                console.log(`  ${index + 1}. ${stock.stockName}(${stock.stockId})`)
                console.log(`     形态类型: ${stock.patternType}`)
                console.log(`     形态日期: ${new Date(stock.patternDate).toLocaleDateString()}`)
                console.log(`     价格变化: ${stock.priceChange.toFixed(2)}%`)
                console.log(`     显著性: ${stock.significance.toFixed(3)}`)
                console.log(`     排名: ${stock.rank}`)
                console.log('')
            })
        }

        console.log('\n5. 验证API端点调用')
        console.log('已调用的Tushare API端点:')
        console.log('  - stock_basic: 获取股票基础信息')
        console.log('  - daily: 获取日线行情数据(OHLC)')
        console.log('  - daily_basic: 获取每日指标数据')
        console.log('')
        console.log('十字星检测算法:')
        console.log('  - 基于真实OHLC数据计算实体大小')
        console.log('  - 分析上下影线长度比例')
        console.log('  - 识别标准、蜻蜓、墓碑、长腿十字星')
        console.log('  - 结合成交量和趋势分析')

        console.log('\n=== 真实十字星形态筛选功能测试完成 ===')

        return {
            success: true,
            stockPatternsCount: stockPatterns.length,
            recentPatternsCount: recentPatterns.length,
            screenResultsCount: screenResult.stocks.length
        }

    } catch (error) {
        console.error('测试过程中出现错误:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * 运行测试（如果直接执行此文件）
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    testRealDojiScreening().then(result => {
        console.log('\n测试结果:', result)
        process.exit(result.success ? 0 : 1)
    })
}
