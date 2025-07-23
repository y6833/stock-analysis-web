/**
 * 增强的投资组合性能服务
 * 提供更准确的性能计算和高级分析工具
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import {
    PortfolioPerformance,
    PortfolioRiskMetrics,
    PortfolioAnalysis,
    BacktestParams,
    BacktestResult
} from './portfolioPerformanceService'
import { Position, PositionSummary, PortfolioMetrics, OptimizationResult, PortfolioAllocation } from '@/types/portfolio'

// API基础URL
const API_URL = 'http://localhost:7001/api'

/**
 * 增强的投资组合性能指标
 * 扩展了基本指标，添加了更多高级指标
 */
export interface EnhancedPortfolioMetrics extends PortfolioMetrics {
    // 风险调整回报指标
    downsideDeviation: number      // 下行偏差
    ulcerIndex: number             // 溃疡指数
    painIndex: number              // 痛苦指数
    painRatio: number              // 痛苦比率

    // 回撤相关指标
    recoveryFactor: number         // 恢复因子
    drawdownPeriods: Array<{       // 回撤期
        start: string
        end: string
        depth: number
        recovery: string | null
        durationDays: number
    }>

    // 时间相关指标
    timeInMarket: number           // 市场参与时间百分比
    winRate: number                // 盈利天数比例
    bestDay: { date: string, return: number }  // 最佳单日表现
    worstDay: { date: string, return: number } // 最差单日表现

    // 风险分解
    riskDecomposition: {           // 风险分解
        systematic: number           // 系统性风险
        specific: number             // 特质性风险
        total: number                // 总风险
    }

    // 因子暴露
    factorExposure: Record<string, number>  // 因子暴露
}

/**
 * 投资组合压力测试参数
 */
export interface StressTestParams {
    portfolioId: number
    scenarios: Array<{
        name: string
        marketChange: number         // 市场变化百分比
        interestRateChange?: number  // 利率变化百分点
        volatilityChange?: number    // 波动率变化百分点
        customFactors?: Record<string, number> // 自定义因子变化
    }>
}

/**
 * 投资组合压力测试结果
 */
export interface StressTestResult {
    portfolioId: number
    currentValue: number
    scenarios: Array<{
        name: string
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
    }>
}

/**
 * 投资组合优化参数
 */
export interface PortfolioOptimizationParams {
    portfolioId: number
    optimizationType: 'meanVariance' | 'minVariance' | 'maxSharpe' | 'riskParity' | 'maxDiversification' | 'equalWeight'
    constraints?: {
        minWeight?: number           // 单个资产最小权重
        maxWeight?: number           // 单个资产最大权重
        targetReturn?: number        // 目标收益率
        maxRisk?: number             // 最大风险
        sectorConstraints?: Record<string, { min?: number, max?: number }> // 行业约束
    }
    riskAversion?: number          // 风险厌恶系数 (1-10)
    lookbackPeriod?: number        // 回溯期 (天数)
}

/**
 * 投资组合归因分析结果
 */
export interface AttributionAnalysis {
    portfolioId: number
    period: {
        start: string
        end: string
    }
    totalReturn: number
    benchmarkReturn: number
    excessReturn: number

    // 归因分解
    attribution: {
        allocation: number           // 资产配置效应
        selection: number            // 选股效应
        interaction: number          // 交互效应
        total: number                // 总超额收益
    }

    // 按行业/板块分解
    sectorAttribution: Array<{
        sector: string
        portfolioWeight: number
        benchmarkWeight: number
        portfolioReturn: number
        benchmarkReturn: number
        allocation: number
        selection: number
        interaction: number
        total: number
    }>
}

/**
 * 投资组合风险预算
 */
export interface RiskBudget {
    symbol: string
    name: string
    weight: number
    volatility: number
    contribution: number
    budget: number
    marginalContribution: number
}

/**
 * 获取增强的投资组合性能指标
 * @param portfolioId 投资组合ID
 * @param lookbackPeriod 回溯期 (天数，默认252个交易日，约一年)
 * @returns 增强的投资组合性能指标
 */
export async function getEnhancedPortfolioMetrics(
    portfolioId: number,
    lookbackPeriod: number = 252
): Promise<EnhancedPortfolioMetrics> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/enhanced-metrics?lookbackPeriod=${lookbackPeriod}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 执行投资组合压力测试
 * @param params 压力测试参数
 * @returns 压力测试结果
 */
export async function runStressTest(params: StressTestParams): Promise<StressTestResult> {
    const response = await axios.post(
        `${API_URL}/portfolios/stress-test`,
        params,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 执行投资组合优化
 * @param params 优化参数
 * @returns 优化结果
 */
export async function optimizePortfolio(params: PortfolioOptimizationParams): Promise<OptimizationResult> {
    const response = await axios.post(
        `${API_URL}/portfolios/optimize`,
        params,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合归因分析
 * @param portfolioId 投资组合ID
 * @param benchmarkId 基准指数ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 归因分析结果
 */
export async function getAttributionAnalysis(
    portfolioId: number,
    benchmarkId: string,
    startDate: string,
    endDate: string
): Promise<AttributionAnalysis> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/attribution?benchmarkId=${benchmarkId}&startDate=${startDate}&endDate=${endDate}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合风险预算
 * @param portfolioId 投资组合ID
 * @returns 风险预算
 */
export async function getRiskBudget(portfolioId: number): Promise<RiskBudget[]> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/risk-budget`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合有效前沿
 * @param portfolioId 投资组合ID
 * @param points 前沿上的点数 (默认20)
 * @returns 有效前沿点
 */
export async function getEfficientFrontier(
    portfolioId: number,
    points: number = 20
): Promise<Array<{ risk: number, return: number, weights: Record<string, number> }>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/efficient-frontier?points=${points}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合相关性热图数据
 * @param portfolioId 投资组合ID
 * @returns 相关性矩阵
 */
export async function getCorrelationMatrix(portfolioId: number): Promise<{
    symbols: string[],
    names: string[],
    matrix: number[][]
}> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/correlation-matrix`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合滚动性能指标
 * @param portfolioId 投资组合ID
 * @param metric 指标名称 ('return', 'volatility', 'sharpe', 'drawdown', 'beta', 'alpha')
 * @param window 窗口大小 (天数，默认63个交易日，约3个月)
 * @returns 滚动性能指标
 */
export async function getRollingMetrics(
    portfolioId: number,
    metric: string,
    window: number = 63
): Promise<Array<{ date: string, value: number }>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/rolling-metrics?metric=${metric}&window=${window}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的风险价值(VaR)
 * @param portfolioId 投资组合ID
 * @param confidenceLevel 置信水平 (0-1，默认0.95)
 * @param method 计算方法 ('historical', 'parametric', 'monteCarlo')
 * @param horizon 时间范围 (天数，默认1)
 * @returns 风险价值
 */
export async function calculateVaR(
    portfolioId: number,
    confidenceLevel: number = 0.95,
    method: 'historical' | 'parametric' | 'monteCarlo' = 'historical',
    horizon: number = 1
): Promise<{
    var: number,
    varPercent: number,
    cvar: number,
    cvarPercent: number
}> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/var?confidenceLevel=${confidenceLevel}&method=${method}&horizon=${horizon}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合的最优再平衡建议
 * @param portfolioId 投资组合ID
 * @param targetWeights 目标权重
 * @returns 再平衡建议
 */
export async function getRebalanceSuggestions(
    portfolioId: number,
    targetWeights: Record<string, number>
): Promise<Array<{
    symbol: string,
    name: string,
    currentShares: number,
    currentWeight: number,
    targetWeight: number,
    targetShares: number,
    shareDifference: number,
    action: 'buy' | 'sell' | 'hold'
}>> {
    const response = await axios.post(
        `${API_URL}/portfolios/${portfolioId}/rebalance-suggestions`,
        { targetWeights },
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合的历史分配
 * @param portfolioId 投资组合ID
 * @param allocationType 分配类型 ('sector', 'industry', 'marketCap', 'country', 'style')
 * @returns 历史分配
 */
export async function getHistoricalAllocation(
    portfolioId: number,
    allocationType: string = 'sector'
): Promise<Array<{
    date: string,
    allocations: Record<string, number>
}>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/historical-allocation?type=${allocationType}`,
        getAuthHeaders()
    )
    return response.data
}

// 导出服务
export const enhancedPortfolioPerformanceService = {
    getEnhancedPortfolioMetrics,
    runStressTest,
    optimizePortfolio,
    getAttributionAnalysis,
    getRiskBudget,
    getEfficientFrontier,
    getCorrelationMatrix,
    getRollingMetrics,
    calculateVaR,
    getRebalanceSuggestions,
    getHistoricalAllocation
}

export default enhancedPortfolioPerformanceService