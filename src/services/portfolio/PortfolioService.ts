/**
 * 投资组合服务
 */

import axios from 'axios'

export interface Portfolio {
  id: number
  name: string
  description?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Holding {
  id: number
  portfolioId: number
  stockCode: string
  stockName: string
  quantity: number
  averageCost: number
  currentPrice?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TradeRecord {
  id: number
  userId: number
  portfolioId: number
  stockCode: string
  stockName: string
  tradeType: 'buy' | 'sell'
  quantity: number
  price: number
  totalAmount: number
  tradeDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

class PortfolioService {
  private baseURL = '/api/portfolio'

  /**
   * 获取用户的投资组合列表
   */
  async getPortfolios(): Promise<{ success: boolean; data?: Portfolio[]; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}`)
      return {
        success: true,
        data: response.data.data || []
      }
    } catch (error: any) {
      console.error('获取投资组合失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取投资组合失败'
      }
    }
  }

  /**
   * 创建投资组合
   */
  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: Portfolio; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}`, portfolio)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('创建投资组合失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '创建投资组合失败'
      }
    }
  }

  /**
   * 更新投资组合
   */
  async updatePortfolio(id: number, portfolio: Partial<Portfolio>): Promise<{ success: boolean; data?: Portfolio; message?: string }> {
    try {
      const response = await axios.put(`${this.baseURL}/${id}`, portfolio)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('更新投资组合失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '更新投资组合失败'
      }
    }
  }

  /**
   * 删除投资组合
   */
  async deletePortfolio(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      await axios.delete(`${this.baseURL}/${id}`)
      return {
        success: true
      }
    } catch (error: any) {
      console.error('删除投资组合失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '删除投资组合失败'
      }
    }
  }

  /**
   * 获取投资组合详情
   */
  async getPortfolioDetail(id: number): Promise<{ success: boolean; data?: Portfolio; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/${id}`)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('获取投资组合详情失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取投资组合详情失败'
      }
    }
  }

  /**
   * 获取投资组合持仓
   */
  async getPortfolioHoldings(portfolioId: number): Promise<{ success: boolean; data?: Holding[]; message?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/${portfolioId}/holdings`)
      return {
        success: true,
        data: response.data.data || []
      }
    } catch (error: any) {
      console.error('获取投资组合持仓失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取投资组合持仓失败'
      }
    }
  }

  /**
   * 添加持仓
   */
  async addHolding(portfolioId: number, holding: Omit<Holding, 'id' | 'portfolioId' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: Holding; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/${portfolioId}/holdings`, holding)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('添加持仓失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '添加持仓失败'
      }
    }
  }

  /**
   * 更新持仓
   */
  async updateHolding(portfolioId: number, holdingId: number, holding: Partial<Holding>): Promise<{ success: boolean; data?: Holding; message?: string }> {
    try {
      const response = await axios.put(`${this.baseURL}/${portfolioId}/holdings/${holdingId}`, holding)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('更新持仓失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '更新持仓失败'
      }
    }
  }

  /**
   * 删除持仓
   */
  async deleteHolding(portfolioId: number, holdingId: number): Promise<{ success: boolean; message?: string }> {
    try {
      await axios.delete(`${this.baseURL}/${portfolioId}/holdings/${holdingId}`)
      return {
        success: true
      }
    } catch (error: any) {
      console.error('删除持仓失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '删除持仓失败'
      }
    }
  }

  /**
   * 获取交易记录
   */
  async getTradeRecords(portfolioId?: number): Promise<{ success: boolean; data?: TradeRecord[]; message?: string }> {
    try {
      const url = portfolioId ? `${this.baseURL}/${portfolioId}/trades` : `${this.baseURL}/trades`
      const response = await axios.get(url)
      return {
        success: true,
        data: response.data.data || []
      }
    } catch (error: any) {
      console.error('获取交易记录失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '获取交易记录失败'
      }
    }
  }

  /**
   * 添加交易记录
   */
  async addTradeRecord(portfolioId: number, trade: Omit<TradeRecord, 'id' | 'userId' | 'portfolioId' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: TradeRecord; message?: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/${portfolioId}/trades`, trade)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error: any) {
      console.error('添加交易记录失败:', error)
      return {
        success: false,
        message: error.response?.data?.message || '添加交易记录失败'
      }
    }
  }

  /**
   * 计算投资组合统计信息
   */
  calculatePortfolioStats(holdings: Holding[]): {
    totalValue: number
    totalCost: number
    totalPnL: number
    totalPnLPercent: number
    positionCount: number
  } {
    let totalValue = 0
    let totalCost = 0

    holdings.forEach(holding => {
      const cost = holding.quantity * holding.averageCost
      const value = holding.quantity * (holding.currentPrice || holding.averageCost)
      
      totalCost += cost
      totalValue += value
    })

    const totalPnL = totalValue - totalCost
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      positionCount: holdings.length
    }
  }

  /**
   * 格式化货币显示
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value)
  }

  /**
   * 格式化百分比显示
   */
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }
}

export const portfolioService = new PortfolioService()
export default portfolioService
