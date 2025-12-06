/**
 * DeepSeek API 测试工具
 * 用于测试和验证DeepSeek API集成是否正常工作
 */

import { deepSeekHttpClient, DeepSeekApiError } from './deepseekHttpClient'
import { deepSeekRateLimiter } from './deepseekRateLimiter'
import {
    isDeepSeekConfigValid,
    getDeepSeekConfigErrors,
    getDeepSeekModel,
    getDeepSeekMaxTokens,
    getDeepSeekTemperature
} from '@/config/deepseekConfig'

// 测试结果接口
export interface TestResult {
    name: string
    success: boolean
    message: string
    duration?: number
    data?: any
}

/**
 * 测试配置有效性
 */
export async function testConfiguration(): Promise<TestResult> {
    const startTime = Date.now()

    try {
        const isValid = isDeepSeekConfigValid()
        const errors = getDeepSeekConfigErrors()

        if (isValid) {
            return {
                name: '配置验证',
                success: true,
                message: 'DeepSeek API 配置有效',
                duration: Date.now() - startTime
            }
        } else {
            return {
                name: '配置验证',
                success: false,
                message: `配置无效: ${errors.join(', ')}`,
                duration: Date.now() - startTime
            }
        }
    } catch (error) {
        return {
            name: '配置验证',
            success: false,
            message: `配置验证失败: ${(error as Error).message}`,
            duration: Date.now() - startTime
        }
    }
}

/**
 * 测试API连接
 */
export async function testConnection(): Promise<TestResult> {
    const startTime = Date.now()

    try {
        const result = await deepSeekHttpClient.testConnection()

        return {
            name: 'API连接测试',
            success: result.success,
            message: result.message,
            duration: Date.now() - startTime,
            data: { latency: result.latency }
        }
    } catch (error) {
        return {
            name: 'API连接测试',
            success: false,
            message: `连接测试失败: ${(error as Error).message}`,
            duration: Date.now() - startTime
        }
    }
}

/**
 * 测试简单聊天完成
 */
export async function testChatCompletion(): Promise<TestResult> {
    const startTime = Date.now()

    try {
        const response = await deepSeekHttpClient.chatCompletion({
            model: getDeepSeekModel(),
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的股票分析助手。'
                },
                {
                    role: 'user',
                    content: '请简单介绍一下技术分析中的MACD指标。'
                }
            ],
            max_tokens: 200,
            temperature: getDeepSeekTemperature()
        })

        return {
            name: '聊天完成测试',
            success: true,
            message: '聊天完成请求成功',
            duration: Date.now() - startTime,
            data: {
                response: response.choices[0]?.message?.content?.substring(0, 100) + '...',
                tokensUsed: response.usage?.total_tokens
            }
        }
    } catch (error) {
        const apiError = error as DeepSeekApiError
        return {
            name: '聊天完成测试',
            success: false,
            message: `聊天完成失败: ${apiError.message}`,
            duration: Date.now() - startTime,
            data: {
                statusCode: apiError.statusCode,
                errorCode: apiError.errorCode
            }
        }
    }
}

/**
 * 测试股票分析功能
 */
export async function testStockAnalysis(): Promise<TestResult> {
    const startTime = Date.now()

    try {
        const response = await deepSeekHttpClient.chatCompletion({
            model: getDeepSeekModel(),
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的股票分析师，请基于提供的数据进行客观分析。'
                },
                {
                    role: 'user',
                    content: `请分析以下股票数据：
股票代码：000001.SZ
股票名称：平安银行
当前价格：12.50元
涨跌幅：+2.5%
成交量：1000万股
市盈率：6.8
市净率：0.9

请给出简要的投资建议。`
                }
            ],
            max_tokens: 300,
            temperature: 0.3 // 分析时使用较低的温度以获得更稳定的结果
        })

        return {
            name: '股票分析测试',
            success: true,
            message: '股票分析请求成功',
            duration: Date.now() - startTime,
            data: {
                analysis: response.choices[0]?.message?.content?.substring(0, 150) + '...',
                tokensUsed: response.usage?.total_tokens
            }
        }
    } catch (error) {
        const apiError = error as DeepSeekApiError
        return {
            name: '股票分析测试',
            success: false,
            message: `股票分析失败: ${apiError.message}`,
            duration: Date.now() - startTime,
            data: {
                statusCode: apiError.statusCode,
                errorCode: apiError.errorCode
            }
        }
    }
}

/**
 * 测试速率限制
 */
export async function testRateLimit(): Promise<TestResult> {
    const startTime = Date.now()

    try {
        const stats = deepSeekRateLimiter.getStats()
        const canMakeRequest = deepSeekRateLimiter.canMakeRequest()

        return {
            name: '速率限制测试',
            success: true,
            message: `速率限制正常工作，当前可以发送请求: ${canMakeRequest}`,
            duration: Date.now() - startTime,
            data: {
                canMakeRequest,
                remainingDailyRequests: stats.remainingDailyRequests,
                remainingMinuteRequests: stats.remainingMinuteRequests,
                requestsToday: stats.requestsToday
            }
        }
    } catch (error) {
        return {
            name: '速率限制测试',
            success: false,
            message: `速率限制测试失败: ${(error as Error).message}`,
            duration: Date.now() - startTime
        }
    }
}

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<TestResult[]> {
    console.log('🧪 开始运行 DeepSeek API 测试套件...')

    const tests = [
        testConfiguration,
        testConnection,
        testChatCompletion,
        testStockAnalysis,
        testRateLimit
    ]

    const results: TestResult[] = []

    for (const test of tests) {
        console.log(`⏳ 运行测试: ${test.name}`)
        try {
            const result = await test()
            results.push(result)

            if (result.success) {
                console.log(`✅ ${result.name}: ${result.message}`)
            } else {
                console.log(`❌ ${result.name}: ${result.message}`)
            }
        } catch (error) {
            const failedResult: TestResult = {
                name: test.name,
                success: false,
                message: `测试执行失败: ${(error as Error).message}`
            }
            results.push(failedResult)
            console.log(`💥 ${failedResult.name}: ${failedResult.message}`)
        }

        // 在测试之间添加短暂延迟，避免触发速率限制
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 输出测试总结
    const passedTests = results.filter(r => r.success).length
    const totalTests = results.length

    console.log('\n📊 测试结果总结:')
    console.log(`通过: ${passedTests}/${totalTests}`)
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！DeepSeek API 集成正常工作。')
    } else {
        console.log('⚠️ 部分测试失败，请检查配置和网络连接。')
    }

    return results
}

/**
 * 获取API使用统计
 */
export function getUsageStats() {
    const stats = deepSeekHttpClient.getStats()
    const costStats = deepSeekHttpClient.getCostStats()

    return {
        requests: stats,
        costs: costStats
    }
}

/**
 * 重置统计数据
 */
export function resetStats() {
    deepSeekRateLimiter.reset()
    console.log('📊 DeepSeek API 统计数据已重置')
}