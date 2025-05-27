import { request } from '@/utils/request'

export interface StopLossConfig {
  id?: number
  userId?: number
  portfolioId?: number
  symbol?: string
  configName: string
  stopLossType: 'fixed' | 'trailing' | 'atr' | 'volatility' | 'time'
  stopLossPercentage?: number
  trailingDistance?: number
  atrMultiplier?: number
  volatilityMultiplier?: number
  timeLimit?: number
  takeProfitType: 'fixed' | 'ladder' | 'trailing' | 'dynamic'
  takeProfitLevels?: TakeProfitLevel[]
  trailingActivation?: number
  trailingTakeProfitDistance?: number
  isStopLossEnabled: boolean
  isTakeProfitEnabled: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  portfolio?: {
    id: number
    name: string
  }
}

export interface TakeProfitLevel {
  percentage: number
  sellRatio: number
  isExecuted: boolean
}

export interface StopLossOrder {
  id?: number
  userId?: number
  portfolioId?: number
  configId?: number
  symbol: string
  stockName?: string
  orderType: 'stop_loss' | 'take_profit'
  triggerPrice: number
  quantity: number
  executionType: 'market' | 'limit'
  limitPrice?: number
  status: 'pending' | 'triggered' | 'executed' | 'cancelled' | 'expired'
  reason?: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  confidence?: number
  expectedLoss?: number
  expectedProfit?: number
  actualPrice?: number
  actualQuantity?: number
  actualLoss?: number
  actualProfit?: number
  triggerTime?: string
  executionTime?: string
  cancelTime?: string
  cancelReason?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  portfolio?: {
    id: number
    name: string
  }
  config?: {
    id: number
    configName: string
  }
}

export interface StopLossExecution {
  id?: number
  userId?: number
  orderId: number
  symbol: string
  executionType: 'stop_loss' | 'take_profit' | 'partial_take_profit'
  triggerPrice: number
  executionPrice: number
  quantity: number
  originalQuantity: number
  remainingQuantity: number
  averageCost: number
  realizedPnl: number
  realizedPnlPercentage: number
  commission: number
  slippage?: number
  executionMethod: 'manual' | 'automatic'
  isSuccessful: boolean
  errorMessage?: string
  marketConditions?: any
  performanceMetrics?: any
  executionTime: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface TriggerCheckResult {
  triggeredCount: number
  triggeredOrders: Array<{
    orderId: number
    symbol: string
    orderType: string
    triggerPrice: number
    currentPrice: number
    quantity: number
  }>
}

class StopLossManagerService {
  
  /**
   * 创建止损止盈配置
   */
  async createConfig(configData: Omit<StopLossConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return request.post('/api/stop-loss/config', configData)
  }

  /**
   * 获取止损止盈配置列表
   */
  async getConfigs(params?: {
    portfolioId?: number
    symbol?: string
    isActive?: boolean
  }) {
    return request.get('/api/stop-loss/config', { params })
  }

  /**
   * 更新止损止盈配置
   */
  async updateConfig(id: number, configData: Partial<StopLossConfig>) {
    return request.put(`/api/stop-loss/config/${id}`, configData)
  }

  /**
   * 删除止损止盈配置
   */
  async deleteConfig(id: number) {
    return request.delete(`/api/stop-loss/config/${id}`)
  }

  /**
   * 创建止损止盈订单
   */
  async createOrder(orderData: Omit<StopLossOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return request.post('/api/stop-loss/order', orderData)
  }

  /**
   * 获取止损止盈订单列表
   */
  async getOrders(params?: {
    portfolioId?: number
    symbol?: string
    status?: string
    orderType?: string
    limit?: number
  }) {
    return request.get('/api/stop-loss/order', { params })
  }

  /**
   * 取消止损止盈订单
   */
  async cancelOrder(id: number, cancelReason?: string) {
    return request.put(`/api/stop-loss/order/${id}/cancel`, { cancelReason })
  }

  /**
   * 检查并触发止损止盈订单
   */
  async checkTriggers(currentPrices: Record<string, number>): Promise<{ success: boolean; data?: TriggerCheckResult; message?: string }> {
    return request.post('/api/stop-loss/check-triggers', { currentPrices })
  }

  /**
   * 执行止损止盈订单
   */
  async executeOrder(id: number, executionData: {
    executionPrice: number
    executedQuantity: number
    originalQuantity: number
    remainingQuantity: number
    averageCost: number
    realizedPnl: number
    realizedPnlPercentage: number
    commission?: number
    slippage?: number
    executionMethod?: 'manual' | 'automatic'
    marketConditions?: any
    performanceMetrics?: any
    notes?: string
  }) {
    return request.post(`/api/stop-loss/order/${id}/execute`, executionData)
  }

  /**
   * 获取止损止盈统计信息
   */
  async getStatistics(params?: {
    portfolioId?: number
    startDate?: string
    endDate?: string
  }) {
    // 这里可以通过现有的订单数据计算统计信息
    const ordersResult = await this.getOrders(params)
    
    if (!ordersResult.success || !ordersResult.data) {
      return {
        success: false,
        message: '获取订单数据失败'
      }
    }

    const orders = ordersResult.data as StopLossOrder[]
    
    const statistics = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      triggeredOrders: orders.filter(o => o.status === 'triggered').length,
      executedOrders: orders.filter(o => o.status === 'executed').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      stopLossOrders: orders.filter(o => o.orderType === 'stop_loss').length,
      takeProfitOrders: orders.filter(o => o.orderType === 'take_profit').length,
      totalExpectedLoss: orders.reduce((sum, o) => sum + (o.expectedLoss || 0), 0),
      totalExpectedProfit: orders.reduce((sum, o) => sum + (o.expectedProfit || 0), 0),
      totalActualLoss: orders.reduce((sum, o) => sum + (o.actualLoss || 0), 0),
      totalActualProfit: orders.reduce((sum, o) => sum + (o.actualProfit || 0), 0),
      avgConfidence: orders.filter(o => o.confidence).reduce((sum, o, _, arr) => sum + (o.confidence || 0) / arr.length, 0),
      successRate: orders.filter(o => o.status === 'executed').length / Math.max(orders.filter(o => ['executed', 'cancelled'].includes(o.status)).length, 1)
    }

    return {
      success: true,
      data: statistics
    }
  }

  /**
   * 批量创建止损止盈订单
   */
  async batchCreateOrders(ordersData: Array<Omit<StopLossOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const results = []
    
    for (const orderData of ordersData) {
      try {
        const result = await this.createOrder(orderData)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          message: `创建订单失败: ${error}`,
          data: orderData
        })
      }
    }

    return {
      success: true,
      data: {
        total: ordersData.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    }
  }

  /**
   * 批量取消订单
   */
  async batchCancelOrders(orderIds: number[], cancelReason?: string) {
    const results = []
    
    for (const orderId of orderIds) {
      try {
        const result = await this.cancelOrder(orderId, cancelReason)
        results.push({ orderId, ...result })
      } catch (error) {
        results.push({
          orderId,
          success: false,
          message: `取消订单失败: ${error}`
        })
      }
    }

    return {
      success: true,
      data: {
        total: orderIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    }
  }
}

export const stopLossManagerService = new StopLossManagerService()
export default stopLossManagerService
