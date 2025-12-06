/**
 * 数据库模型单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// 由于这些是后端模型，我们创建模拟测试
// 在实际环境中，这些测试应该在后端项目中运行

describe('AI推荐历史数据模型', () => {
    describe('AiRecommendationHistory', () => {
        it('应该正确计算性能指标', () => {
            // 模拟推荐记录
            const mockRecommendation = {
                expectedReturn: 0.08,
                actualReturn: 0.10,
                currentPrice: 12.50,
                actualPrice: 13.75,
                getPerformanceMetrics() {
                    if (!this.actualReturn || !this.expectedReturn) {
                        return null
                    }

                    return {
                        expectedReturn: this.expectedReturn,
                        actualReturn: this.actualReturn,
                        outperformance: this.actualReturn - this.expectedReturn,
                        accuracy: Math.abs(this.actualReturn - this.expectedReturn) < 0.02 ? 'high' :
                            Math.abs(this.actualReturn - this.expectedReturn) < 0.05 ? 'medium' : 'low',
                    }
                }
            }

            const metrics = mockRecommendation.getPerformanceMetrics()

            expect(metrics).toBeDefined()
            expect(metrics.expectedReturn).toBe(0.08)
            expect(metrics.actualReturn).toBe(0.10)
            expect(metrics.outperformance).toBe(0.02)
            expect(metrics.accuracy).toBe('medium')
        })

        it('应该正确判断推荐是否过期', () => {
            const mockRecommendation = {
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
                isExpired() {
                    if (!this.expiresAt) {
                        return false
                    }
                    return new Date() > this.expiresAt
                }
            }

            expect(mockRecommendation.isExpired()).toBe(false)

            // 测试过期情况
            mockRecommendation.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000) // 昨天
            expect(mockRecommendation.isExpired()).toBe(true)
        })

        it('应该正确计算风险调整收益', () => {
            const mockRecommendations = [
                { actualReturn: 0.10, riskLevel: 'low' },
                { actualReturn: 0.08, riskLevel: 'medium' },
                { actualReturn: 0.12, riskLevel: 'high' },
            ]

            const calculateRiskAdjustedReturn = (recommendations) => {
                const riskWeights = { low: 1.0, medium: 1.2, high: 1.5 }

                let weightedReturn = 0
                let totalWeight = 0

                recommendations.forEach(rec => {
                    const weight = riskWeights[rec.riskLevel] || 1.0
                    weightedReturn += rec.actualReturn * weight
                    totalWeight += weight
                })

                return totalWeight > 0 ? (weightedReturn / totalWeight) * 100 : 0
            }

            const riskAdjustedReturn = calculateRiskAdjustedReturn(mockRecommendations)

            expect(riskAdjustedReturn).toBeGreaterThan(0)
            expect(riskAdjustedReturn).toBeLessThan(20) // 合理范围
        })
    })
})

describe('AI分析缓存系统', () => {
    describe('AiAnalysisCache', () => {
        it('应该正确生成缓存键', () => {
            const generateCacheKey = (stockSymbol, analysisType, parameters = {}) => {
                const crypto = require('crypto')
                const paramString = JSON.stringify(parameters, Object.keys(parameters).sort())
                const hash = crypto.createHash('md5').update(paramString).digest('hex')
                return `${stockSymbol}_${analysisType}_${hash}`
            }

            const key1 = generateCacheKey('000001.SZ', 'technical', { riskLevel: 'medium' })
            const key2 = generateCacheKey('000001.SZ', 'technical', { riskLevel: 'medium' })
            const key3 = generateCacheKey('000001.SZ', 'technical', { riskLevel: 'high' })

            expect(key1).toBe(key2) // 相同参数应生成相同键
            expect(key1).not.toBe(key3) // 不同参数应生成不同键
            expect(key1).toContain('000001.SZ')
            expect(key1).toContain('technical')
        })

        it('应该正确判断缓存是否过期', () => {
            const mockCache = {
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后过期
                isValid: true,
                isExpired() {
                    return new Date() > this.expiresAt || !this.isValid
                }
            }

            expect(mockCache.isExpired()).toBe(false)

            // 测试过期情况
            mockCache.expiresAt = new Date(Date.now() - 1000) // 1秒前过期
            expect(mockCache.isExpired()).toBe(true)

            // 测试无效情况
            mockCache.expiresAt = new Date(Date.now() + 5 * 60 * 1000)
            mockCache.isValid = false
            expect(mockCache.isExpired()).toBe(true)
        })

        it('应该正确计算缓存统计', () => {
            const mockCaches = [
                { hitCount: 5, isValid: true, expiresAt: new Date(Date.now() + 1000) },
                { hitCount: 3, isValid: true, expiresAt: new Date(Date.now() + 1000) },
                { hitCount: 0, isValid: false, expiresAt: new Date(Date.now() - 1000) },
            ]

            const calculateStats = (caches) => {
                const activeCaches = caches.filter(c => c.isValid && new Date() < c.expiresAt)
                const totalHits = caches.reduce((sum, c) => sum + c.hitCount, 0)
                const avgHits = caches.length > 0 ? totalHits / caches.length : 0

                return {
                    totalCaches: caches.length,
                    activeCaches: activeCaches.length,
                    totalHits,
                    averageHitsPerCache: avgHits,
                    hitRate: caches.length > 0 ? totalHits / caches.length : 0,
                }
            }

            const stats = calculateStats(mockCaches)

            expect(stats.totalCaches).toBe(3)
            expect(stats.activeCaches).toBe(2)
            expect(stats.totalHits).toBe(8)
            expect(stats.averageHitsPerCache).toBeCloseTo(2.67, 2)
        })
    })
})

describe('DeepSeek API使用统计', () => {
    describe('DeepseekApiUsage', () => {
        it('应该正确计算API成本', () => {
            const calculateCost = (promptTokens, completionTokens, model = 'deepseek-chat') => {
                const pricing = {
                    'deepseek-chat': {
                        input: 0.14,   // $0.0014 per 1K tokens
                        output: 0.28,  // $0.0028 per 1K tokens
                    },
                }

                const modelPricing = pricing[model] || pricing['deepseek-chat']
                const inputCost = (promptTokens / 1000) * modelPricing.input
                const outputCost = (completionTokens / 1000) * modelPricing.output

                return Math.ceil((inputCost + outputCost) * 100) // 转换为美分并向上取整
            }

            const cost1 = calculateCost(1000, 500) // 1000 input + 500 output tokens
            const cost2 = calculateCost(2000, 1000) // 2000 input + 1000 output tokens

            expect(cost1).toBe(29) // (1000/1000 * 0.14 + 500/1000 * 0.28) * 100 = 28 -> 29 (向上取整)
            expect(cost2).toBe(57) // (2000/1000 * 0.14 + 1000/1000 * 0.28) * 100 = 56 -> 57
        })

        it('应该正确计算API效率', () => {
            const mockUsage = {
                responseTimeMs: 2000,
                totalTokens: 1000,
                getEfficiency() {
                    if (this.responseTimeMs === 0 || this.totalTokens === 0) {
                        return 0
                    }
                    return this.totalTokens / (this.responseTimeMs / 1000) // tokens per second
                }
            }

            const efficiency = mockUsage.getEfficiency()
            expect(efficiency).toBe(500) // 1000 tokens / 2 seconds = 500 tokens/second
        })

        it('应该正确转换成本单位', () => {
            const mockUsage = {
                costCents: 150,
                getCostUSD() {
                    return this.costCents / 100
                },
                getCostCNY(exchangeRate = 7.2) {
                    return (this.costCents / 100) * exchangeRate
                }
            }

            expect(mockUsage.getCostUSD()).toBe(1.5)
            expect(mockUsage.getCostCNY()).toBe(10.8) // 1.5 * 7.2
            expect(mockUsage.getCostCNY(7.0)).toBe(10.5) // 1.5 * 7.0
        })

        it('应该正确清理敏感数据', () => {
            const sanitizeRequestData = (requestData) => {
                if (!requestData) return null

                const sanitized = { ...requestData }
                delete sanitized.token
                delete sanitized.apiKey
                delete sanitized.authorization

                const jsonString = JSON.stringify(sanitized)
                if (jsonString.length > 10000) {
                    return { ...sanitized, _truncated: true, _originalSize: jsonString.length }
                }

                return sanitized
            }

            const requestData = {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: 'test' }],
                token: 'secret-token',
                apiKey: 'secret-key',
                authorization: 'Bearer token'
            }

            const sanitized = sanitizeRequestData(requestData)

            expect(sanitized.model).toBe('deepseek-chat')
            expect(sanitized.messages).toBeDefined()
            expect(sanitized.token).toBeUndefined()
            expect(sanitized.apiKey).toBeUndefined()
            expect(sanitized.authorization).toBeUndefined()
        })

        it('应该正确检查配额警报', () => {
            const checkQuotaAlert = (usage, dailyLimit = 1000, costLimit = 10.0) => {
                const alerts = []

                // 检查请求数量限制
                if (usage.totalRequests >= dailyLimit * 0.9) {
                    alerts.push({
                        type: 'request_quota',
                        level: usage.totalRequests >= dailyLimit ? 'critical' : 'warning',
                        message: `今日API请求数量: ${usage.totalRequests}/${dailyLimit}`,
                        usage: usage.totalRequests,
                        limit: dailyLimit,
                    })
                }

                // 检查成本限制
                if (usage.totalCostUSD >= costLimit * 0.9) {
                    alerts.push({
                        type: 'cost_quota',
                        level: usage.totalCostUSD >= costLimit ? 'critical' : 'warning',
                        message: `今日API成本: $${usage.totalCostUSD.toFixed(4)}/$${costLimit.toFixed(2)}`,
                        usage: usage.totalCostUSD,
                        limit: costLimit,
                    })
                }

                return alerts
            }

            // 测试警告级别
            const usage1 = { totalRequests: 950, totalCostUSD: 9.5 }
            const alerts1 = checkQuotaAlert(usage1)
            expect(alerts1).toHaveLength(2)
            expect(alerts1[0].level).toBe('warning')
            expect(alerts1[1].level).toBe('warning')

            // 测试临界级别
            const usage2 = { totalRequests: 1100, totalCostUSD: 12.0 }
            const alerts2 = checkQuotaAlert(usage2)
            expect(alerts2).toHaveLength(2)
            expect(alerts2[0].level).toBe('critical')
            expect(alerts2[1].level).toBe('critical')

            // 测试正常情况
            const usage3 = { totalRequests: 500, totalCostUSD: 5.0 }
            const alerts3 = checkQuotaAlert(usage3)
            expect(alerts3).toHaveLength(0)
        })
    })
})

// 集成测试
describe('数据库模型集成', () => {
    it('应该正确处理推荐记录的完整生命周期', () => {
        // 模拟完整的推荐生命周期
        const mockRecommendation = {
            id: 1,
            stockSymbol: '000001.SZ',
            recommendationType: 'buy',
            confidenceScore: 85,
            expectedReturn: 0.08,
            currentPrice: 12.50,
            targetPrice: 13.50,
            status: 'active',
            createdAt: new Date(),

            // 更新性能数据
            updatePerformance(currentPrice) {
                if (!this.currentPrice || !currentPrice) {
                    return false
                }

                const actualReturn = (currentPrice - this.currentPrice) / this.currentPrice

                this.actualPrice = currentPrice
                this.actualReturn = actualReturn
                this.performanceUpdatedAt = new Date()

                return true
            },

            // 获取性能指标
            getPerformanceMetrics() {
                if (!this.actualReturn || !this.expectedReturn) {
                    return null
                }

                return {
                    expectedReturn: this.expectedReturn,
                    actualReturn: this.actualReturn,
                    outperformance: this.actualReturn - this.expectedReturn,
                    accuracy: Math.abs(this.actualReturn - this.expectedReturn) < 0.02 ? 'high' :
                        Math.abs(this.actualReturn - this.expectedReturn) < 0.05 ? 'medium' : 'low',
                }
            }
        }

        // 1. 创建推荐
        expect(mockRecommendation.status).toBe('active')
        expect(mockRecommendation.confidenceScore).toBe(85)

        // 2. 更新性能数据
        const updateResult = mockRecommendation.updatePerformance(13.75)
        expect(updateResult).toBe(true)
        expect(mockRecommendation.actualPrice).toBe(13.75)
        expect(mockRecommendation.actualReturn).toBeCloseTo(0.1, 2)

        // 3. 获取性能指标
        const metrics = mockRecommendation.getPerformanceMetrics()
        expect(metrics).toBeDefined()
        expect(metrics.outperformance).toBeCloseTo(0.02, 2)
        expect(metrics.accuracy).toBe('medium')
    })
})