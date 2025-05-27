/**
 * VaR风险价值计算服务
 */

import axios from 'axios'

export interface RiskConfig {
  id?: number
  portfolioId?: number
  configName: string
  varConfidenceLevel: number
  varTimeHorizon: number
  varMethod: 'historical' | 'parametric' | 'monte_carlo'
  lookbackPeriod: number
  monteCarloSimulations: number
  riskLimits?: any
  isActive: boolean
}

export interface VarCalculationResult {
  id: number
  portfolioValue: number
  varAbsolute: number
  varPercentage: number
  expectedShortfall: number
  confidenceLevel: number
  timeHorizon: number
  method: string
  componentVar: Record<string, any>
  riskMetrics: Record<string, any>
  calculationDate: string
}

export interface VarHistoryItem {
  id: number
  calculationDate: string
  portfolioValue: number
  varAbsolute: number
  varPercentage: number
  expectedShortfall: number
  confidenceLevel: number
  method: string
  configName?: string
}

export interface RiskDashboardData {
  summary: {
    totalPortfolios: number
    totalPortfolioValue: number
    totalVaR: number
    avgVarPercentage: number
    lastCalculationDate?: string
  }
  portfolioVars: Array<{
    portfolioId: number
    portfolioName: string
    portfolioValue: number
    varAbsolute: number
    varPercentage: number
    expectedShortfall: number
    calculationDate: string
    method: string
  }>
}

class VarCalculationService {
  private baseURL = '/api/risk'

  /**
   * 创建风险监控配置
   */
  async createConfig(config: Omit<RiskConfig, 'id'>): Promise<{ success: boolean; data?: RiskConfig; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/config`, config)
      return response.data
    } catch (error: any) {
      console.error('创建风险配置失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '创建配置失败'
      }
    }
  }

  /**
   * 获取风险监控配置列表
   */
  async getConfigs(): Promise<{ success: boolean; data?: RiskConfig[]; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/config`)
      return response.data
    } catch (error: any) {
      console.error('获取风险配置失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取配置失败'
      }
    }
  }

  /**
   * 更新风险监控配置
   */
  async updateConfig(id: number, config: Partial<RiskConfig>): Promise<{ success: boolean; data?: RiskConfig; message?: string }> {
    try {
      const response = await axios.put(`${this.baseURL}/config/${id}`, config)
      return response.data
    } catch (error: any) {
      console.error('更新风险配置失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '更新配置失败'
      }
    }
  }

  /**
   * 删除风险监控配置
   */
  async deleteConfig(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete(`${this.baseURL}/config/${id}`)
      return response.data
    } catch (error: any) {
      console.error('删除风险配置失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '删除配置失败'
      }
    }
  }

  /**
   * 计算VaR
   */
  async calculateVaR(portfolioId: number, configId: number): Promise<{ success: boolean; data?: VarCalculationResult; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/var/calculate`, {
        portfolioId,
        configId
      })
      return response.data
    } catch (error: any) {
      console.error('VaR计算失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'VaR计算失败'
      }
    }
  }

  /**
   * 批量计算VaR
   */
  async batchCalculateVaR(portfolioIds: number[], configId: number): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/var/batch-calculate`, {
        portfolioIds,
        configId
      })
      return response.data
    } catch (error: any) {
      console.error('批量VaR计算失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '批量计算失败'
      }
    }
  }

  /**
   * 获取VaR计算历史
   */
  async getVarHistory(portfolioId?: number, limit?: number): Promise<{ success: boolean; data?: VarHistoryItem[]; message?: string }> {
    try {
      const params = new URLSearchParams()
      if (portfolioId) params.append('portfolioId', portfolioId.toString())
      if (limit) params.append('limit', limit.toString())

      const response = await axios.get(`${this.baseURL}/var/history?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error('获取VaR历史失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取历史数据失败'
      }
    }
  }

  /**
   * 获取VaR计算详情
   */
  async getVarDetail(id: number): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/var/${id}`)
      return response.data
    } catch (error: any) {
      console.error('获取VaR详情失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取详情失败'
      }
    }
  }

  /**
   * 获取风险监控仪表盘数据
   */
  async getRiskDashboard(): Promise<{ success: boolean; data?: RiskDashboardData; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/dashboard`)
      return response.data
    } catch (error: any) {
      console.error('获取风险仪表盘数据失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取仪表盘数据失败'
      }
    }
  }

  /**
   * 格式化VaR值显示
   */
  formatVarValue(value: number, type: 'absolute' | 'percentage' = 'absolute'): string {
    if (type === 'percentage') {
      return `${(value * 100).toFixed(2)}%`
    }
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value)
  }

  /**
   * 获取风险等级
   */
  getRiskLevel(varPercentage: number): { level: string; color: string; description: string } {
    if (varPercentage <= 0.01) {
      return {
        level: '低风险',
        color: '#52c41a',
        description: '投资组合风险较低，损失概率小'
      }
    } else if (varPercentage <= 0.03) {
      return {
        level: '中等风险',
        color: '#faad14',
        description: '投资组合风险适中，需要关注'
      }
    } else if (varPercentage <= 0.05) {
      return {
        level: '较高风险',
        color: '#fa8c16',
        description: '投资组合风险较高，建议调整'
      }
    } else {
      return {
        level: '高风险',
        color: '#f5222d',
        description: '投资组合风险很高，需要立即调整'
      }
    }
  }

  /**
   * 计算风险贡献度
   */
  calculateRiskContribution(componentVar: Record<string, any>): Array<{ symbol: string; contribution: number; weight: number }> {
    return Object.entries(componentVar).map(([symbol, data]) => ({
      symbol,
      contribution: data.contribution || 0,
      weight: data.weight || 0
    })).sort((a, b) => b.contribution - a.contribution)
  }
}

export const varCalculationService = new VarCalculationService()
export default varCalculationService
