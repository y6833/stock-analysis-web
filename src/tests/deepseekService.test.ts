/**
 * DeepSeek 服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeepSeekService } from '@/services/deepseekService'
import { promptManager } from '@/services/promptManager'
import { analysisEngine } from '@/services/analysisEngine'

// Mock DeepSeek HTTP Client
vi.mock('@/utils/deepseekHttpClient', () => ({
    deepSeekHttpClient: {
        chatCompletion: vi.fn().mockResolvedValue({
            choices: [{
                message: {
                    content: `技术分析：该股票呈现上涨趋势
基本面分析：财务状况良好
风险评估：中等风险
推荐等级：buy
目标价格：15.50
止损价格：12.00`
                }
            }],
            usage: {
                total_tokens: 150
            }
        })
    }
}))

describe('DeepSeekService', () => {
    let deepSeekService: DeepSeekService

    beforeEach(() => {
        deepSeekService = new DeepSeekService()
    })

    describe('analyzeStock', () => {
        it('应该成功分析股票', async () => {
            const request = {
                symbol: '000001.SZ',
                name: '平安银行',
                currentPrice: 12.50,
                priceData: [12.0, 12.1, 12.3, 12.5],
                volumeData: [1000000, 1100000, 1200000, 1300000],
                analysisType: 'basic' as const,
                userPreferences: {
                    riskLevel: 'medium' as const,
                    investmentHorizon: 'medium' as const
                }
            }

            const result = await deepSeekService.analyzeStock(request)

            expect(result).toBeDefined()
            expect(result.symbol).toBe('000001.SZ')
            expect(result.analysis).toBeDefined()
            expect(result.analysis.recommendation).toBeDefined()
            expect(result.metadata).toBeDefined()
            expect(result.metadata.tokensUsed).toBeGreaterThan(0)
        })

        it('应该处理分析错误', async () => {
            // Mock API 错误
            const mockError = new Error('API调用失败')
            vi.mocked(require('@/utils/deepseekHttpClient').deepSeekHttpClient.chatCompletion)
                .mockRejectedValueOnce(mockError)

            const request = {
                symbol: '000001.SZ',
                name: '平安银行',
                currentPrice: 12.50,
                analysisType: 'basic' as const
            }

            await expect(deepSeekService.analyzeStock(request)).rejects.toThrow('股票分析失败')
        })
    })

    describe('generateRecommendations', () => {
        it('应该生成股票推荐', async () => {
            const request = {
                criteria: {
                    riskLevel: 'medium' as const,
                    expectedReturn: 0.08,
                    timeHorizon: 30,
                    maxRecommendations: 5
                },
                stockPool: [
                    {
                        symbol: '000001.SZ',
                        name: '平安银行',
                        currentPrice: 12.50,
                        marketData: { pe: 6.8, pb: 0.9 }
                    },
                    {
                        symbol: '000002.SZ',
                        name: '万科A',
                        currentPrice: 18.50,
                        marketData: { pe: 8.2, pb: 1.2 }
                    }
                ]
            }

            const result = await deepSeekService.generateRecommendations(request)

            expect(result).toBeDefined()
            expect(result.recommendations).toBeDefined()
            expect(Array.isArray(result.recommendations)).toBe(true)
            expect(result.metadata).toBeDefined()
            expect(result.metadata.totalAnalyzed).toBe(2)
        })
    })

    describe('batchAnalyzeStocks', () => {
        it('应该批量分析股票', async () => {
            const stocks = [
                {
                    symbol: '000001.SZ',
                    name: '平安银行',
                    currentPrice: 12.50
                },
                {
                    symbol: '000002.SZ',
                    name: '万科A',
                    currentPrice: 18.50
                }
            ]

            const results = await deepSeekService.batchAnalyzeStocks(stocks, 'basic')

            expect(results).toBeDefined()
            expect(Array.isArray(results)).toBe(true)
            expect(results.length).toBeGreaterThan(0)
        })
    })
})

describe('PromptManager', () => {
    describe('buildAnalysisPrompt', () => {
        it('应该构建股票分析提示词', () => {
            const stockData = {
                symbol: '000001.SZ',
                name: '平安银行',
                currentPrice: 12.50,
                priceData: [12.0, 12.1, 12.3, 12.5],
                volumeData: [1000000, 1100000, 1200000, 1300000]
            }

            const prompt = promptManager.buildAnalysisPrompt(
                stockData,
                'basic',
                {
                    riskLevel: 'medium',
                    investmentHorizon: 'medium'
                }
            )

            expect(prompt).toBeDefined()
            expect(typeof prompt).toBe('string')
            expect(prompt).toContain('000001.SZ')
            expect(prompt).toContain('平安银行')
            expect(prompt).toContain('12.50')
        })

        it('应该构建推荐提示词', () => {
            const criteria = {
                riskLevel: 'medium' as const,
                expectedReturn: 0.08,
                timeHorizon: 30,
                maxRecommendations: 5
            }

            const stockPool = [
                {
                    symbol: '000001.SZ',
                    name: '平安银行',
                    currentPrice: 12.50,
                    marketData: { pe: 6.8 }
                }
            ]

            const prompt = promptManager.buildRecommendationPrompt(criteria, stockPool)

            expect(prompt).toBeDefined()
            expect(typeof prompt).toBe('string')
            expect(prompt).toContain('medium')
            expect(prompt).toContain('8.0%')
            expect(prompt).toContain('000001.SZ')
        })
    })

    describe('optimizePromptLength', () => {
        it('应该优化提示词长度', () => {
            const longPrompt = '这是一个很长的提示词'.repeat(100)
            const optimized = promptManager.optimizePromptLength(longPrompt, 100)

            expect(optimized).toBeDefined()
            expect(optimized.length).toBeLessThan(longPrompt.length)
        })
    })
})

describe('AnalysisEngine', () => {
    describe('comprehensiveAnalysis', () => {
        it('应该进行综合分析', async () => {
            const technicalData = {
                symbol: '000001.SZ',
                priceData: [12.0, 12.1, 12.3, 12.5, 12.8],
                volumeData: [1000000, 1100000, 1200000, 1300000, 1400000],
                indicators: {
                    sma: {
                        sma5: [12.1, 12.2, 12.3],
                        sma10: [12.0, 12.1, 12.2],
                        sma20: [11.9, 12.0, 12.1]
                    },
                    rsi: [45, 50, 55, 60, 65]
                }
            }

            const fundamentalData = {
                symbol: '000001.SZ',
                financialMetrics: {
                    pe: 6.8,
                    pb: 0.9,
                    roe: 12.5,
                    roa: 1.2
                },
                valuation: {
                    marketCap: 250000000000
                },
                dividends: {
                    dividendYield: 0.035
                },
                industry: {
                    sector: '金融',
                    industry: '银行',
                    industryPE: 8.0
                }
            }

            const result = await analysisEngine.comprehensiveAnalysis(
                '000001.SZ',
                technicalData,
                fundamentalData,
                undefined,
                {
                    riskLevel: 'medium',
                    investmentHorizon: 'medium'
                }
            )

            expect(result).toBeDefined()
            expect(result.symbol).toBe('000001.SZ')
            expect(result.technicalAnalysis).toBeDefined()
            expect(result.fundamentalAnalysis).toBeDefined()
            expect(result.sentimentAnalysis).toBeDefined()
            expect(result.aiAnalysis).toBeDefined()
            expect(result.riskAssessment).toBeDefined()
            expect(result.recommendation).toBeDefined()
        })
    })

    describe('performTechnicalAnalysis', () => {
        it('应该进行技术分析', async () => {
            const technicalData = {
                symbol: '000001.SZ',
                priceData: [12.0, 12.1, 12.3, 12.5, 12.8],
                volumeData: [1000000, 1100000, 1200000, 1300000, 1400000],
                indicators: {
                    rsi: [45, 50, 55, 60, 65]
                }
            }

            const result = await analysisEngine.performTechnicalAnalysis(technicalData)

            expect(result).toBeDefined()
            expect(result.trend).toBeDefined()
            expect(result.strength).toBeDefined()
            expect(result.signals).toBeDefined()
            expect(Array.isArray(result.signals)).toBe(true)
            expect(result.supportResistance).toBeDefined()
        })
    })
})

// 集成测试
describe('DeepSeek Integration', () => {
    it('应该完成完整的分析流程', async () => {
        const deepSeekService = new DeepSeekService()

        const request = {
            symbol: '000001.SZ',
            name: '平安银行',
            currentPrice: 12.50,
            priceData: [12.0, 12.1, 12.3, 12.5],
            volumeData: [1000000, 1100000, 1200000, 1300000],
            technicalIndicators: {
                rsi: [45, 50, 55, 60],
                macd: {
                    macd: [0.1, 0.2, 0.3, 0.4],
                    signal: [0.05, 0.15, 0.25, 0.35],
                    histogram: [0.05, 0.05, 0.05, 0.05]
                }
            },
            analysisType: 'detailed' as const,
            userPreferences: {
                riskLevel: 'medium' as const,
                investmentHorizon: 'medium' as const,
                focusAreas: ['技术分析', '风险控制']
            }
        }

        const result = await deepSeekService.analyzeStock(request)

        // 验证结果结构
        expect(result.symbol).toBe('000001.SZ')
        expect(result.analysis.recommendation).toMatch(/^(strong_buy|buy|hold|sell|strong_sell)$/)
        expect(result.analysis.confidenceScore).toBeGreaterThanOrEqual(30)
        expect(result.analysis.confidenceScore).toBeLessThanOrEqual(95)
        expect(result.metadata.tokensUsed).toBeGreaterThan(0)
        expect(result.metadata.processingTime).toBeGreaterThan(0)
    }, 10000) // 10秒超时
})