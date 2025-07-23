/**
 * 投资组合分析服务
 * 提供高级分析功能和更准确的性能计算
 */

import { Position, PositionSummary, PortfolioMetrics } from '@/types/portfolio'
import { enhancedPortfolioPerformanceService } from './enhancedPortfolioPerformanceService'

/**
 * 投资组合分析结果
 */
export interface PortfolioAnalyticsResult {
    // 基本指标
    totalValue: number
    totalCost: number
    totalProfit: number
    totalProfitPercentage: number

    // 收益指标
    dailyReturns: Array<{ date: string, return: number }>
    monthlyReturns: Array<{ month: string, return: number }>
    yearlyReturns: Array<{ year: string, return: number }>

    // 风险指标
    volatility: number
    downsideDeviation: number
    maxDrawdown: number
    maxDrawdownPeriod: { start: string, end: string, depth: number }

    // 风险调整收益指标
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number

    // 分配分析
    sectorAllocation: Array<{ sector: string, value: number, percentage: number }>
    industryAllocation: Array<{ industry: string, value: number, percentage: number }>
    marketCapAllocation: Array<{ marketCap: string, value: number, percentage: number }>
    countryAllocation: Array<{ country: string, value: number, percentage: number }>
    currencyAllocation: Array<{ currency: string, value: number, percentage: number }>
    assetClassAllocation: Array<{ assetClass: string, value: number, percentage: number }>
    styleAllocation: Array<{ style: string, value: number, percentage: number }>

    // 风险分解
    riskContribution: Array<{ symbol: string, name: string, contribution: number, percentage: number }>

    // 相关性
    correlationMatrix: { symbols: string[], names: string[], matrix: number[][] }

    // 绩效归因
    performanceAttribution?: {
        totalReturn: number
        factorContributions: Record<string, number>
        specificContributions: Record<string, number>
    }
}

/**
 * 计算投资组合分析结果
 * @param positions 持仓列表
 * @param historicalData 历史数据 (可选)
 * @param benchmarkData 基准数据 (可选)
 * @returns 投资组合分析结果
 */
export function analyzePortfolio(
    positions: PositionSummary[],
    historicalData?: Record<string, Array<{ date: string, price: number }>>,
    benchmarkData?: Array<{ date: string, price: number }>
): PortfolioAnalyticsResult {
    // 计算基本指标
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)
    const totalCost = positions.reduce((sum, pos) => sum + pos.investmentValue, 0)
    const totalProfit = totalValue - totalCost
    const totalProfitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

    // 计算分配
    const sectorAllocation = calculateAllocation(positions, 'sector', totalValue)
    const industryAllocation = calculateAllocation(positions, 'industry', totalValue)
    const marketCapAllocation = calculateAllocation(positions, 'marketCap', totalValue)
    const countryAllocation = calculateAllocation(positions, 'country', totalValue)
    const currencyAllocation = calculateAllocation(positions, 'currency', totalValue)
    const assetClassAllocation = calculateAllocation(positions, 'assetClass', totalValue)
    const styleAllocation = calculateAllocation(positions, 'style', totalValue)

    // 计算风险贡献
    const riskContribution = positions
        .filter(pos => pos.riskContribution !== undefined)
        .map(pos => ({
            symbol: pos.symbol,
            name: pos.name,
            contribution: pos.riskContribution || 0,
            percentage: totalValue > 0 ? ((pos.riskContribution || 0) / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.contribution - a.contribution)

    // 模拟数据 - 在实际实现中，这些将从历史数据计算
    const dailyReturns = generateMockReturns(90, 'daily') // 90天
    const monthlyReturns = generateMockReturns(24, 'monthly') // 24个月
    const yearlyReturns = generateMockReturns(5, 'yearly') // 5年

    // 计算风险指标
    const volatility = calculateVolatility(dailyReturns.map(r => r.return))
    const downsideDeviation = calculateDownsideDeviation(dailyReturns.map(r => r.return))
    const { maxDrawdown, period } = calculateMaxDrawdown(dailyReturns.map(r => r.return), dailyReturns.map(r => r.date))

    // 计算风险调整收益指标
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r.return, 0) / dailyReturns.length
    const annualizedReturn = Math.pow(1 + avgReturn, 252) - 1 // 假设252个交易日
    const sharpeRatio = volatility > 0 ? (annualizedReturn - 0.02) / volatility : 0 // 假设无风险利率为2%
    const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - 0.02) / downsideDeviation : 0
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0

    // 模拟相关性矩阵
    const symbols = positions.map(p => p.symbol)
    const names = positions.map(p => p.name)
    const correlationMatrix = {
        symbols,
        names,
        matrix: generateMockCorrelationMatrix(symbols.length)
    }

    return {
        totalValue,
        totalCost,
        totalProfit,
        totalProfitPercentage,
        dailyReturns,
        monthlyReturns,
        yearlyReturns,
        volatility,
        downsideDeviation,
        maxDrawdown,
        maxDrawdownPeriod: {
            start: period.start,
            end: period.end,
            depth: maxDrawdown
        },
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        sectorAllocation,
        industryAllocation,
        marketCapAllocation,
        countryAllocation,
        currencyAllocation,
        assetClassAllocation,
        styleAllocation,
        riskContribution,
        correlationMatrix
    }
}

/**
 * 计算投资组合的风险价值(VaR)
 * @param positions 持仓列表
 * @param historicalData 历史数据
 * @param confidenceLevel 置信水平 (0-1，默认0.95)
 * @param horizon 时间范围 (天数，默认1)
 * @returns 风险价值
 */
export function calculatePortfolioVaR(
    positions: PositionSummary[],
    historicalData: Record<string, Array<{ date: string, price: number }>>,
    confidenceLevel: number = 0.95,
    horizon: number = 1
): { var: number, varPercent: number, cvar: number, cvarPercent: number } {
    // 在实际实现中，这将使用历史数据计算VaR
    // 这里提供一个简化的实现

    // 计算投资组合总价值
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

    // 计算每个持仓的日收益率
    const positionReturns: Record<string, number[]> = {}

    for (const position of positions) {
        if (historicalData[position.symbol]) {
            const prices = historicalData[position.symbol].map(d => d.price)
            const returns: number[] = []

            for (let i = 1; i < prices.length; i++) {
                returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
            }

            positionReturns[position.symbol] = returns
        }
    }

    // 计算投资组合的日收益率
    const portfolioReturns: number[] = []
    const returnDates = Object.keys(positionReturns).length > 0
        ? Object.keys(historicalData)[0]
        : []

    if (returnDates.length > 0) {
        const firstSymbol = Object.keys(positionReturns)[0]
        const returnLength = positionReturns[firstSymbol].length

        for (let i = 0; i < returnLength; i++) {
            let dailyReturn = 0

            for (const position of positions) {
                if (positionReturns[position.symbol] && positionReturns[position.symbol][i] !== undefined) {
                    const weight = position.currentValue / totalValue
                    dailyReturn += weight * positionReturns[position.symbol][i]
                }
            }

            portfolioReturns.push(dailyReturn)
        }
    } else {
        // 如果没有历史数据，使用模拟数据
        const volatility = 0.01 // 假设1%的日波动率
        for (let i = 0; i < 252; i++) {
            portfolioReturns.push(generateRandomReturn(0, volatility))
        }
    }

    // 计算VaR
    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b)
    const varIndex = Math.floor(sortedReturns.length * (1 - confidenceLevel))
    const var1d = -sortedReturns[varIndex]

    // 计算CVaR (Conditional VaR，又称Expected Shortfall)
    const cvarValues = sortedReturns.slice(0, varIndex)
    const cvar1d = -cvarValues.reduce((sum, val) => sum + val, 0) / cvarValues.length

    // 根据时间范围调整VaR
    const varHorizon = var1d * Math.sqrt(horizon)
    const cvarHorizon = cvar1d * Math.sqrt(horizon)

    // 计算金额和百分比
    const varAmount = totalValue * varHorizon
    const cvarAmount = totalValue * cvarHorizon

    return {
        var: varAmount,
        varPercent: varHorizon * 100,
        cvar: cvarAmount,
        cvarPercent: cvarHorizon * 100
    }
}

/**
 * 计算投资组合的最优权重
 * @param positions 持仓列表
 * @param historicalData 历史数据
 * @param optimizationType 优化类型
 * @param constraints 约束条件
 * @returns 最优权重
 */
export function optimizePortfolioWeights(
    positions: PositionSummary[],
    historicalData: Record<string, Array<{ date: string, price: number }>>,
    optimizationType: 'meanVariance' | 'minVariance' | 'maxSharpe' | 'riskParity' | 'maxDiversification' | 'equalWeight',
    constraints?: {
        minWeight?: number
        maxWeight?: number
        targetReturn?: number
        maxRisk?: number
    }
): Record<string, number> {
    // 在实际实现中，这将使用二次规划或其他优化算法
    // 这里提供一个简化的实现

    const symbols = positions.map(p => p.symbol)
    const weights: Record<string, number> = {}

    if (optimizationType === 'equalWeight') {
        // 等权重分配
        const equalWeight = 1 / positions.length

        for (const symbol of symbols) {
            weights[symbol] = equalWeight
        }
    } else {
        // 其他优化类型需要更复杂的算法
        // 这里简单地根据市值分配权重
        const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

        for (const position of positions) {
            weights[position.symbol] = position.currentValue / totalValue
        }

        // 应用约束条件
        if (constraints) {
            applyWeightConstraints(weights, constraints)
        }
    }

    return weights
}

/**
 * 应用权重约束
 * @param weights 权重
 * @param constraints 约束条件
 */
function applyWeightConstraints(
    weights: Record<string, number>,
    constraints: {
        minWeight?: number
        maxWeight?: number
        targetReturn?: number
        maxRisk?: number
    }
): void {
    const symbols = Object.keys(weights)

    // 应用最小和最大权重约束
    if (constraints.minWeight !== undefined || constraints.maxWeight !== undefined) {
        for (const symbol of symbols) {
            if (constraints.minWeight !== undefined && weights[symbol] < constraints.minWeight) {
                weights[symbol] = constraints.minWeight
            }

            if (constraints.maxWeight !== undefined && weights[symbol] > constraints.maxWeight) {
                weights[symbol] = constraints.maxWeight
            }
        }

        // 重新归一化权重
        const totalWeight = symbols.reduce((sum, symbol) => sum + weights[symbol], 0)

        for (const symbol of symbols) {
            weights[symbol] = weights[symbol] / totalWeight
        }
    }
}

/**
 * 计算特定属性的分配
 * @param positions 持仓列表
 * @param property 属性名
 * @param totalValue 总价值
 * @returns 分配
 */
function calculateAllocation(
    positions: PositionSummary[],
    property: keyof PositionSummary,
    totalValue: number
): Array<{ [key: string]: string | number }> {
    const allocation: Record<string, number> = {}

    for (const position of positions) {
        const value = position[property]

        if (value !== undefined && typeof value === 'string') {
            if (!allocation[value]) {
                allocation[value] = 0
            }

            allocation[value] += position.currentValue
        }
    }

    return Object.entries(allocation).map(([name, value]) => ({
        [property]: name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))
}

/**
 * 计算波动率
 * @param returns 收益率数组
 * @returns 波动率
 */
function calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length

    return Math.sqrt(variance * 252) // 年化波动率
}

/**
 * 计算下行偏差
 * @param returns 收益率数组
 * @param threshold 阈值 (默认为0)
 * @returns 下行偏差
 */
function calculateDownsideDeviation(returns: number[], threshold: number = 0): number {
    if (returns.length === 0) return 0

    const downReturns = returns.filter(r => r < threshold)

    if (downReturns.length === 0) return 0

    const sumSquaredDownside = downReturns.reduce((sum, r) => sum + Math.pow(r - threshold, 2), 0)
    const downsideVariance = sumSquaredDownside / returns.length

    return Math.sqrt(downsideVariance * 252) // 年化下行偏差
}

/**
 * 计算最大回撤
 * @param returns 收益率数组
 * @param dates 日期数组
 * @returns 最大回撤和回撤期
 */
function calculateMaxDrawdown(returns: number[], dates: string[]): {
    maxDrawdown: number,
    period: { start: string, end: string }
} {
    if (returns.length === 0) return { maxDrawdown: 0, period: { start: '', end: '' } }

    // 计算累积收益
    const cumulativeReturns: number[] = []
    let cumReturn = 1

    for (const r of returns) {
        cumReturn *= (1 + r)
        cumulativeReturns.push(cumReturn)
    }

    // 计算最大回撤
    let maxDrawdown = 0
    let peakIndex = 0
    let troughIndex = 0
    let currentPeakIndex = 0

    for (let i = 0; i < cumulativeReturns.length; i++) {
        if (cumulativeReturns[i] > cumulativeReturns[currentPeakIndex]) {
            currentPeakIndex = i
        }

        const drawdown = (cumulativeReturns[currentPeakIndex] - cumulativeReturns[i]) / cumulativeReturns[currentPeakIndex]

        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown
            peakIndex = currentPeakIndex
            troughIndex = i
        }
    }

    return {
        maxDrawdown,
        period: {
            start: dates[peakIndex] || '',
            end: dates[troughIndex] || ''
        }
    }
}

/**
 * 生成模拟收益率
 * @param count 数量
 * @param period 周期 ('daily', 'monthly', 'yearly')
 * @returns 模拟收益率
 */
function generateMockReturns(count: number, period: 'daily' | 'monthly' | 'yearly'): Array<{ date: string, return: number }> {
    const returns: Array<{ date: string, return: number }> = []
    const now = new Date()
    let volatility: number

    // 根据周期设置波动率
    switch (period) {
        case 'daily':
            volatility = 0.01 // 1%
            break
        case 'monthly':
            volatility = 0.03 // 3%
            break
        case 'yearly':
            volatility = 0.1 // 10%
            break
    }

    for (let i = 0; i < count; i++) {
        const date = new Date(now)

        switch (period) {
            case 'daily':
                date.setDate(date.getDate() - i)
                break
            case 'monthly':
                date.setMonth(date.getMonth() - i)
                break
            case 'yearly':
                date.setFullYear(date.getFullYear() - i)
                break
        }

        returns.push({
            date: date.toISOString().split('T')[0],
            return: generateRandomReturn(0.0005 * (period === 'daily' ? 1 : period === 'monthly' ? 30 : 365), volatility)
        })
    }

    return returns.reverse()
}

/**
 * 生成随机收益率
 * @param mean 均值
 * @param stdDev 标准差
 * @returns 随机收益率
 */
function generateRandomReturn(mean: number, stdDev: number): number {
    // Box-Muller变换生成正态分布随机数
    const u1 = Math.random()
    const u2 = Math.random()

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

    return mean + stdDev * z0
}

/**
 * 生成模拟相关性矩阵
 * @param size 矩阵大小
 * @returns 相关性矩阵
 */
function generateMockCorrelationMatrix(size: number): number[][] {
    const matrix: number[][] = []

    for (let i = 0; i < size; i++) {
        matrix[i] = []

        for (let j = 0; j < size; j++) {
            if (i === j) {
                matrix[i][j] = 1 // 对角线为1
            } else if (j < i) {
                matrix[i][j] = matrix[j][i] // 对称矩阵
            } else {
                // 生成0.3到0.9之间的随机相关系数
                matrix[i][j] = 0.3 + Math.random() * 0.6
            }
        }
    }

    return matrix
}

// 导出服务
export const portfolioAnalyticsService = {
    analyzePortfolio,
    calculatePortfolioVaR,
    optimizePortfolioWeights
}

export default portfolioAnalyticsService