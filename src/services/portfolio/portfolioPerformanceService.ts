import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'
import { usePortfolioStore } from '@/stores/portfolio/portfolioStore'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 投资组合性能数据类型
export interface PortfolioPerformance {
    id: number
    portfolioId: number
    date: string
    totalValue: number
    dailyReturn: number
    dailyReturnPercentage: number
    cumulativeReturn: number
    cumulativeReturnPercentage: number
}

// 投资组合风险指标类型
export interface PortfolioRiskMetrics {
    portfolioId: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    maxDrawdownPercentage: number
    beta: number
    alpha: number
    rSquared: number
    informationRatio: number
    treynorRatio: number
    sortinoRatio: number
    calmarRatio: number
}

// 投资组合分析结果类型
export interface PortfolioAnalysis {
    portfolioId: number
    sectorAllocation: Record<string, number>
    industryAllocation: Record<string, number>
    marketCapAllocation: Record<string, number>
    topHoldings: Array<{
        symbol: string
        name: string
        weight: number
        contribution: number
    }>
    riskContribution: Array<{
        symbol: string
        name: string
        contribution: number
    }>
    correlationMatrix: Array<Array<number>>
    correlationSymbols: Array<string>
}

// 投资组合回测参数类型
export interface BacktestParams {
    portfolioId: number
    startDate: string
    endDate: string
    initialCapital: number
    rebalanceFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none'
    includeDividends?: boolean
    includeFees?: boolean
    feePercentage?: number
}

// 投资组合回测结果类型
export interface BacktestResult {
    portfolioId: number
    startDate: string
    endDate: string
    initialCapital: number
    finalCapital: number
    totalReturn: number
    totalReturnPercentage: number
    annualizedReturn: number
    maxDrawdown: number
    maxDrawdownPercentage: number
    sharpeRatio: number
    volatility: number
    dailyReturns: Array<{
        date: string
        value: number
        return: number
        returnPercentage: number
    }>
}

/**
 * 获取投资组合性能数据
 * @param portfolioId 投资组合ID
 * @param startDate 开始日期 (可选)
 * @param endDate 结束日期 (可选)
 * @returns 投资组合性能数据
 */
export async function getPortfolioPerformance(
    portfolioId: number,
    startDate?: string,
    endDate?: string
): Promise<PortfolioPerformance[]> {
    let url = `${API_URL}/portfolios/${portfolioId}/performance`

    // 添加日期范围查询参数
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    if (params.toString()) {
        url += `?${params.toString()}`
    }

    const response = await axios.get(url, getAuthHeaders())
    return response.data
}

/**
 * 获取投资组合风险指标
 * @param portfolioId 投资组合ID
 * @param lookbackPeriod 回溯期 (天数，默认252个交易日，约一年)
 * @returns 投资组合风险指标
 */
export async function getPortfolioRiskMetrics(
    portfolioId: number,
    lookbackPeriod: number = 252
): Promise<PortfolioRiskMetrics> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/risk?lookbackPeriod=${lookbackPeriod}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合分析
 * @param portfolioId 投资组合ID
 * @returns 投资组合分析结果
 */
export async function getPortfolioAnalysis(portfolioId: number): Promise<PortfolioAnalysis> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/analysis`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 执行投资组合回测
 * @param params 回测参数
 * @returns 回测结果
 */
export async function backtestPortfolio(params: BacktestParams): Promise<BacktestResult> {
    const response = await axios.post(
        `${API_URL}/portfolios/backtest`,
        params,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的最优权重 (使用现代投资组合理论)
 * @param portfolioId 投资组合ID
 * @param targetReturn 目标收益率 (可选)
 * @param riskAversion 风险厌恶系数 (1-10，默认5)
 * @returns 最优权重
 */
export async function getOptimalWeights(
    portfolioId: number,
    targetReturn?: number,
    riskAversion: number = 5
): Promise<Record<string, number>> {
    let url = `${API_URL}/portfolios/${portfolioId}/optimize?riskAversion=${riskAversion}`

    if (targetReturn !== undefined) {
        url += `&targetReturn=${targetReturn}`
    }

    const response = await axios.get(url, getAuthHeaders())
    return response.data
}

/**
 * 计算投资组合的风险平价权重
 * @param portfolioId 投资组合ID
 * @returns 风险平价权重
 */
export async function getRiskParityWeights(portfolioId: number): Promise<Record<string, number>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/risk-parity`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的最大分散化权重
 * @param portfolioId 投资组合ID
 * @returns 最大分散化权重
 */
export async function getMaxDiversificationWeights(portfolioId: number): Promise<Record<string, number>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/max-diversification`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的最小方差权重
 * @param portfolioId 投资组合ID
 * @returns 最小方差权重
 */
export async function getMinVarianceWeights(portfolioId: number): Promise<Record<string, number>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/min-variance`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的等风险贡献权重
 * @param portfolioId 投资组合ID
 * @returns 等风险贡献权重
 */
export async function getEqualRiskContributionWeights(portfolioId: number): Promise<Record<string, number>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/equal-risk-contribution`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的最优凯利权重
 * @param portfolioId 投资组合ID
 * @param fractionOfKelly 凯利比例 (0-1，默认0.5)
 * @returns 最优凯利权重
 */
export async function getKellyWeights(
    portfolioId: number,
    fractionOfKelly: number = 0.5
): Promise<Record<string, number>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/kelly?fractionOfKelly=${fractionOfKelly}`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 获取投资组合的历史权重
 * @param portfolioId 投资组合ID
 * @returns 历史权重
 */
export async function getHistoricalWeights(portfolioId: number): Promise<Array<{
    date: string
    weights: Record<string, number>
}>> {
    const response = await axios.get(
        `${API_URL}/portfolios/${portfolioId}/historical-weights`,
        getAuthHeaders()
    )
    return response.data
}

/**
 * 计算投资组合的绩效归因
 * @param portfolioId 投资组合ID
 * @param startDate 开始日期 (可选)
 * @param endDate 结束日期 (可选)
 * @returns 绩效归因结果
 */
export async function getPerformanceAttribution(
    portfolioId: number,
    startDate?: string,
    endDate?: string
): Promise<{
    totalReturn: number
    factorContributions: Record<string, number>
    specificContributions: Record<string, number>
}> {
    let url = `${API_URL}/portfolios/${portfolioId}/attribution`

    // 添加日期范围查询参数
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    if (params.toString()) {
        url += `?${params.toString()}`
    }

    const response = await axios.get(url, getAuthHeaders())
    return response.data
}

// 导出服务
export const portfolioPerformanceService = {
    getPortfolioPerformance,
    getPortfolioRiskMetrics,
    getPortfolioAnalysis,
    backtestPortfolio,
    getOptimalWeights,
    getRiskParityWeights,
    getMaxDiversificationWeights,
    getMinVarianceWeights,
    getEqualRiskContributionWeights,
    getKellyWeights,
    getHistoricalWeights,
    getPerformanceAttribution
}