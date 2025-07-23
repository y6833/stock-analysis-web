/**
 * 投资组合风险管理服务
 * 提供高级风险分析和管理功能
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import { PositionSummary } from '@/types/portfolio'
import { portfolioAnalyticsService } from './portfolioAnalyticsService'

// API基础URL
const API_URL = 'http://localhost:7001/api'

/**
 * 风险价值(VaR)参数
 */
export interface VaRParams {
    confidenceLevel: number // 置信水平 (0-1)
    horizon: number // 时间范围 (天数)
    method: 'historical' | 'parametric' | 'monteCarlo' // 计算方法
}

/**
 * 风险价值(VaR)结果
 */
export interface VaRResult {
    var: number // 风险价值 (金额)
    varPercent: number // 风险价值百分比
    cvar: number // 条件风险价值 (金额)
    cvarPercent: number // 条件风险价值百分比
    confidenceLevel: number // 置信水平
    horizon: number // 时间范围 (天数)
    method: string // 计算方法
}

/**
 * 压力测试场景
 */
export interface StressTestScenario {
    id: string
    name: string
    description: string
    marketChange: number // 市场变化百分比
    interestRateChange?: number // 利率变化百分点
    volatilityChange?: number // 波动率变化百分点
    sectorChanges?: Record<string, number> // 行业变化百分比
    customFactors?: Record<string, number> // 自定义因子变化
}

/**
 * 压力测试结果
 */
export interface StressTestResult {
    scenarioId: string
    scenarioName: string
    currentValue: number
    newValue: number
    change: number
    changePercent: number
    positionImpacts: Array<{
        symbol: string
        name: string
        currentValue: number
        newValue: number
        change: number
        changePercent: number
    }>
}

/**
 * 风险贡献分析结果
 */
export interface RiskContributionAnalysis {
    totalRisk: number
    positions: Array<{
        symbol: string
        name: string
        weight: number
        individualRisk: number
        contribution: number
        contributionPercent: number
        marginalContribution: number
    }>
}

/**
 * 风险预算参数
 */
export interface RiskBudgetParams {
    targetRiskContributions?: Record<string, number> // 目标风险贡献百分比
    equalRiskContribution?: boolean // 是否使用等风险贡献
}

/**
 * 风险预算结果
 */
export interface RiskBudgetResult {
    weights: Record<string, number> // 优化后的权重
    riskContributions: Record<string, number> // 风险贡献
    totalRisk: number // 总风险
}

/**
 * 尾部风险指标
 */
export interface TailRiskMetrics {
    valueAtRisk: number // 风险价值 (VaR)
    conditionalVaR: number // 条件风险价值 (CVaR)
    expectedShortfall: number // 预期损失
    tailRiskIndex: number // 尾部风险指数
    tailCorrelation: number // 尾部相关性
    tailBeta: number // 尾部贝塔
    tailDependence: number // 尾部依赖性
}

/**
 * 计算投资组合的风险价值(VaR)
 * @param positions 持仓列表
 * @param params VaR参数
 * @param historicalData 历史数据 (可选)
 * @returns VaR结果
 */
export function calculateVaR(
    positions: PositionSummary[],
    params: VaRParams,
    historicalData?: Record<string, Array<{ date: string, price: number }>>
): VaRResult {
    // 在实际实现中，这将使用不同的方法计算VaR
    // 这里使用portfolioAnalyticsService中的方法
    const result = portfolioAnalyticsService.calculatePortfolioVaR(
        positions,
        historicalData || {},
        params.confidenceLevel,
        params.horizon
    )

    return {
        ...result,
        confidenceLevel: params.confidenceLevel,
        horizon: params.horizon,
        method: params.method
    }
}

/**
 * 获取预定义的压力测试场景
 * @returns 压力测试场景列表
 */
export function getPredefinedStressScenarios(): StressTestScenario[] {
    return [
        {
            id: 'market_crash',
            name: '市场崩盘',
            description: '模拟2008年金融危机类似的市场崩盘情景',
            marketChange: -0.3, // -30%
            volatilityChange: 0.2, // +20%
            sectorChanges: {
                'Financials': -0.4, // 金融股 -40%
                'Energy': -0.35, // 能源股 -35%
                'Consumer Discretionary': -0.25, // 可选消费 -25%
                'Utilities': -0.15 // 公用事业 -15%
            }
        },
        {
            id: 'recession',
            name: '经济衰退',
            description: '模拟经济衰退情景',
            marketChange: -0.2, // -20%
            interestRateChange: -0.005, // -0.5%
            sectorChanges: {
                'Consumer Discretionary': -0.25, // 可选消费 -25%
                'Industrials': -0.22, // 工业 -22%
                'Materials': -0.18, // 材料 -18%
                'Consumer Staples': -0.1 // 必需消费 -10%
            }
        },
        {
            id: 'interest_rate_hike',
            name: '利率上升',
            description: '模拟央行大幅加息情景',
            marketChange: -0.05, // -5%
            interestRateChange: 0.02, // +2%
            sectorChanges: {
                'Financials': 0.05, // 金融股 +5%
                'Real Estate': -0.15, // 房地产 -15%
                'Utilities': -0.12, // 公用事业 -12%
                'Technology': -0.08 // 科技 -8%
            }
        },
        {
            id: 'tech_bubble',
            name: '科技泡沫破裂',
            description: '模拟2000年科技泡沫破裂情景',
            marketChange: -0.15, // -15%
            sectorChanges: {
                'Technology': -0.4, // 科技股 -40%
                'Communication Services': -0.3, // 通信服务 -30%
                'Consumer Staples': 0.05, // 必需消费 +5%
                'Utilities': 0.03 // 公用事业 +3%
            }
        },
        {
            id: 'inflation',
            name: '通胀上升',
            description: '模拟通胀大幅上升情景',
            marketChange: -0.08, // -8%
            interestRateChange: 0.015, // +1.5%
            sectorChanges: {
                'Energy': 0.1, // 能源 +10%
                'Materials': 0.08, // 材料 +8%
                'Consumer Staples': -0.05, // 必需消费 -5%
                'Technology': -0.12 // 科技 -12%
            }
        },
        {
            id: 'currency_crisis',
            name: '货币危机',
            description: '模拟本币大幅贬值情景',
            marketChange: -0.12, // -12%
            sectorChanges: {
                'Exporters': 0.15, // 出口商 +15%
                'Importers': -0.2, // 进口商 -20%
                'Domestic': -0.1 // 国内企业 -10%
            },
            customFactors: {
                'foreign_revenue_exposure': 0.2, // 国外收入敞口 +20%
                'foreign_debt_exposure': -0.25 // 外币债务敞口 -25%
            }
        }
    ]
}

/**
 * 执行压力测试
 * @param positions 持仓列表
 * @param scenario 压力测试场景
 * @returns 压力测试结果
 */
export function runStressTest(
    positions: PositionSummary[],
    scenario: StressTestScenario
): StressTestResult {
    // 计算投资组合总价值
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

    // 计算每个持仓的影响
    const positionImpacts = positions.map(pos => {
        // 根据行业和特性调整影响
        let posChangePercent = scenario.marketChange

        // 应用行业特定变化
        if (scenario.sectorChanges && pos.sector && scenario.sectorChanges[pos.sector]) {
            posChangePercent = scenario.sectorChanges[pos.sector]
        }

        // 应用自定义因子变化 (在实际实现中，这将基于持仓的因子暴露)
        // 这里简化处理

        const posNewValue = pos.currentValue * (1 + posChangePercent)
        const posChange = posNewValue - pos.currentValue

        return {
            symbol: pos.symbol,
            name: pos.name,
            currentValue: pos.currentValue,
            newValue: posNewValue,
            change: posChange,
            changePercent: posChangePercent
        }
    })

    // 计算总体影响
    const newValue = positionImpacts.reduce((sum, impact) => sum + impact.newValue, 0)
    const change = newValue - totalValue
    const changePercent = totalValue > 0 ? change / totalValue : 0

    return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        currentValue: totalValue,
        newValue,
        change,
        changePercent,
        positionImpacts
    }
}

/**
 * 分析投资组合的风险贡献
 * @param positions 持仓列表
 * @param correlationMatrix 相关性矩阵 (可选)
 * @returns 风险贡献分析结果
 */
export function analyzeRiskContribution(
    positions: PositionSummary[],
    correlationMatrix?: number[][]
): RiskContributionAnalysis {
    // 在实际实现中，这将使用相关性矩阵计算风险贡献
    // 这里使用简化的方法

    // 计算投资组合总价值
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

    // 计算权重
    const weights = positions.map(pos => pos.currentValue / totalValue)

    // 计算个体风险 (波动率)
    const individualRisks = positions.map(pos => pos.volatility || 0.2) // 默认20%波动率

    // 如果没有提供相关性矩阵，假设所有资产相关性为0.5
    const corr = correlationMatrix || Array(positions.length).fill(0).map(() => Array(positions.length).fill(0.5))
    for (let i = 0; i < corr.length; i++) {
        corr[i][i] = 1 // 对角线为1
    }

    // 计算投资组合风险
    let portfolioVariance = 0
    for (let i = 0; i < positions.length; i++) {
        for (let j = 0; j < positions.length; j++) {
            portfolioVariance += weights[i] * weights[j] * individualRisks[i] * individualRisks[j] * corr[i][j]
        }
    }
    const portfolioRisk = Math.sqrt(portfolioVariance)

    // 计算风险贡献
    const contributions = positions.map((pos, i) => {
        let contribution = 0
        for (let j = 0; j < positions.length; j++) {
            contribution += weights[j] * individualRisks[i] * individualRisks[j] * corr[i][j]
        }
        contribution *= weights[i] / portfolioRisk

        return {
            symbol: pos.symbol,
            name: pos.name,
            weight: weights[i],
            individualRisk: individualRisks[i],
            contribution,
            contributionPercent: contribution / portfolioRisk,
            marginalContribution: contribution / weights[i]
        }
    })

    return {
        totalRisk: portfolioRisk,
        positions: contributions.sort((a, b) => b.contribution - a.contribution)
    }
}

/**
 * 计算风险预算优化
 * @param positions 持仓列表
 * @param params 风险预算参数
 * @param correlationMatrix 相关性矩阵 (可选)
 * @returns 风险预算结果
 */
export function calculateRiskBudget(
    positions: PositionSummary[],
    params: RiskBudgetParams,
    correlationMatrix?: number[][]
): RiskBudgetResult {
    // 在实际实现中，这将使用二次规划或其他优化算法
    // 这里提供一个简化的实现

    // 计算投资组合总价值
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)

    // 计算当前权重
    const currentWeights = positions.map(pos => pos.currentValue / totalValue)

    // 计算个体风险 (波动率)
    const individualRisks = positions.map(pos => pos.volatility || 0.2) // 默认20%波动率

    // 如果没有提供相关性矩阵，假设所有资产相关性为0.5
    const corr = correlationMatrix || Array(positions.length).fill(0).map(() => Array(positions.length).fill(0.5))
    for (let i = 0; i < corr.length; i++) {
        corr[i][i] = 1 // 对角线为1
    }

    // 计算目标风险贡献
    let targetContributions: number[]
    if (params.equalRiskContribution) {
        // 等风险贡献
        targetContributions = Array(positions.length).fill(1 / positions.length)
    } else if (params.targetRiskContributions) {
        // 使用指定的目标风险贡献
        targetContributions = positions.map(pos => params.targetRiskContributions?.[pos.symbol] || 0)
        // 归一化
        const sum = targetContributions.reduce((a, b) => a + b, 0)
        if (sum > 0) {
            targetContributions = targetContributions.map(c => c / sum)
        } else {
            targetContributions = Array(positions.length).fill(1 / positions.length)
        }
    } else {
        // 默认等风险贡献
        targetContributions = Array(positions.length).fill(1 / positions.length)
    }

    // 在实际实现中，这将使用迭代算法求解
    // 这里简化为根据个体风险的倒数分配权重
    const inverseRisks = individualRisks.map(risk => 1 / risk)
    const totalInverseRisk = inverseRisks.reduce((a, b) => a + b, 0)
    const weights = inverseRisks.map(ir => ir / totalInverseRisk)

    // 计算风险贡献
    const riskContributions: Record<string, number> = {}
    let totalRisk = 0

    for (let i = 0; i < positions.length; i++) {
        let contribution = 0
        for (let j = 0; j < positions.length; j++) {
            contribution += weights[j] * individualRisks[i] * individualRisks[j] * corr[i][j]
        }
        contribution *= weights[i]
        totalRisk += contribution
        riskContributions[positions[i].symbol] = contribution
    }

    // 转换为权重记录
    const weightRecord: Record<string, number> = {}
    positions.forEach((pos, i) => {
        weightRecord[pos.symbol] = weights[i]
    })

    return {
        weights: weightRecord,
        riskContributions,
        totalRisk: Math.sqrt(totalRisk)
    }
}

/**
 * 计算尾部风险指标
 * @param positions 持仓列表
 * @param historicalData 历史数据
 * @param benchmarkData 基准数据 (可选)
 * @returns 尾部风险指标
 */
export function calculateTailRiskMetrics(
    positions: PositionSummary[],
    historicalData: Record<string, Array<{ date: string, price: number }>>,
    benchmarkData?: Array<{ date: string, price: number }>
): TailRiskMetrics {
    // 在实际实现中，这将使用历史数据计算尾部风险指标
    // 这里提供模拟数据

    // 计算VaR (95%置信水平)
    const varResult = calculateVaR(
        positions,
        { confidenceLevel: 0.95, horizon: 1, method: 'historical' },
        historicalData
    )

    return {
        valueAtRisk: varResult.varPercent,
        conditionalVaR: varResult.cvarPercent,
        expectedShortfall: varResult.cvarPercent * 1.1, // 略高于CVaR
        tailRiskIndex: 0.18, // 模拟数据
        tailCorrelation: 0.65, // 模拟数据
        tailBeta: 1.2, // 模拟数据
        tailDependence: 0.4 // 模拟数据
    }
}

/**
 * 获取投资组合风险报告
 * @param portfolioId 投资组合ID
 * @returns 风险报告
 */
export async function getPortfolioRiskReport(portfolioId: number): Promise<{
    basicMetrics: {
        volatility: number
        beta: number
        sharpeRatio: number
        sortinoRatio: number
        maxDrawdown: number
        downsideDeviation: number
    }
    varAnalysis: VaRResult
    stressTests: StressTestResult[]
    riskContribution: RiskContributionAnalysis
    tailRiskMetrics: TailRiskMetrics
}> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/risk-report`,
        getAuthHeaders()
    )
    return response.data
}

// 导出服务
export const portfolioRiskManagementService = {
    calculateVaR,
    getPredefinedStressScenarios,
    runStressTest,
    analyzeRiskContribution,
    calculateRiskBudget,
    calculateTailRiskMetrics,
    getPortfolioRiskReport
}

export default portfolioRiskManagementService