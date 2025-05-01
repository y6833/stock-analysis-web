import axios from 'axios'
import { useToast } from '@/composables/useToast'
import { getAuthHeaders } from '@/utils/auth'

/**
 * 逗币服务
 */
const coinsService = {
  /**
   * 获取用户逗币余额
   * @returns 逗币余额
   */
  async getUserCoins(): Promise<number> {
    try {
      // 使用授权头工具函数

      // 发送请求时添加授权头
      const response = await axios.get('/api/coins', getAuthHeaders())
      return response.data.data.coins
    } catch (error: any) {
      console.error('获取逗币余额失败:', error)
      const { showToast } = useToast()
      showToast(`获取逗币余额失败: ${error.response?.data?.message || error.message}`, 'error')
      return 0
    }
  },

  /**
   * 获取逗币交易记录
   * @param options 查询选项
   * @returns 交易记录列表
   */
  async getTransactions(
    options: {
      page?: number
      pageSize?: number
      type?: string
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<any> {
    try {
      // 使用授权头工具函数

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.page) params.append('page', options.page.toString())
      if (options.pageSize) params.append('pageSize', options.pageSize.toString())
      if (options.type) params.append('type', options.type)
      if (options.startDate) params.append('startDate', options.startDate)
      if (options.endDate) params.append('endDate', options.endDate)

      // 发送请求时添加授权头
      const response = await axios.get(
        `/api/coins/transactions?${params.toString()}`,
        getAuthHeaders()
      )
      return response.data.data
    } catch (error: any) {
      console.error('获取逗币交易记录失败:', error)
      const { showToast } = useToast()
      showToast(`获取逗币交易记录失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 使用逗币兑换会员
   * @param data 兑换数据
   * @returns 兑换结果
   */
  async exchangeMembership(data: { level: string; days: number }): Promise<any> {
    try {
      // 使用授权头工具函数

      // 发送请求时添加授权头
      const response = await axios.post('/api/coins/exchange', data, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('兑换会员失败:', error)
      const { showToast } = useToast()
      showToast(`兑换会员失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 创建逗币充值请求
   * @param data 充值数据
   * @returns 充值请求结果
   */
  async createRechargeRequest(data: {
    amount: number
    paymentAmount: number
    paymentMethod?: string
    remark?: string
  }): Promise<any> {
    try {
      // 使用授权头工具函数

      // 发送请求时添加授权头
      const response = await axios.post('/api/coins/recharge', data, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('创建充值请求失败:', error)
      const { showToast } = useToast()
      showToast(`创建充值请求失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 获取用户充值请求列表
   * @param options 查询选项
   * @returns 充值请求列表
   */
  async getUserRechargeRequests(
    options: {
      page?: number
      pageSize?: number
      status?: string
    } = {}
  ): Promise<any> {
    try {
      // 使用授权头工具函数
      // 已经在顶部导入了 getAuthHeaders

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.page) params.append('page', options.page.toString())
      if (options.pageSize) params.append('pageSize', options.pageSize.toString())
      if (options.status) params.append('status', options.status)

      // 发送请求时添加授权头
      const response = await axios.get(`/api/coins/recharge?${params.toString()}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取充值请求列表失败:', error)
      const { showToast } = useToast()
      showToast(`获取充值请求列表失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 获取充值请求详情
   * @param requestId 请求ID
   * @returns 充值请求详情
   */
  async getRechargeRequestDetail(requestId: number): Promise<any> {
    try {
      // 使用授权头工具函数
      // 已经在顶部导入了 getAuthHeaders

      // 发送请求时添加授权头
      const response = await axios.get(`/api/coins/recharge/${requestId}`, getAuthHeaders())
      return response.data.data
    } catch (error: any) {
      console.error('获取充值请求详情失败:', error)
      const { showToast } = useToast()
      showToast(`获取充值请求详情失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 取消充值请求
   * @param requestId 请求ID
   * @returns 取消结果
   */
  async cancelRechargeRequest(requestId: number): Promise<any> {
    try {
      // 使用授权头工具函数
      // 已经在顶部导入了 getAuthHeaders

      // 发送请求时添加授权头
      const response = await axios.post(
        `/api/coins/recharge/${requestId}/cancel`,
        {},
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('取消充值请求失败:', error)
      const { showToast } = useToast()
      showToast(`取消充值请求失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 获取所有充值请求（管理员）
   * @param options 查询选项
   * @returns 充值请求列表
   */
  async getAllRechargeRequests(
    options: {
      page?: number
      pageSize?: number
      status?: string
      userId?: number
      startDate?: string
      endDate?: string
      minAmount?: number
      maxAmount?: number
      sortProp?: string
      sortOrder?: string
    } = {}
  ): Promise<any> {
    try {
      // 使用授权头工具函数
      // 已经在顶部导入了 getAuthHeaders

      // 构建查询参数
      const params = new URLSearchParams()
      if (options.page) params.append('page', options.page.toString())
      if (options.pageSize) params.append('pageSize', options.pageSize.toString())
      if (options.status) params.append('status', options.status)
      if (options.userId) params.append('userId', options.userId.toString())
      if (options.startDate) params.append('startDate', options.startDate)
      if (options.endDate) params.append('endDate', options.endDate)
      if (options.minAmount) params.append('minAmount', options.minAmount.toString())
      if (options.maxAmount) params.append('maxAmount', options.maxAmount.toString())
      if (options.sortProp) params.append('sortProp', options.sortProp)
      if (options.sortOrder) params.append('sortOrder', options.sortOrder)

      // 发送请求时添加授权头
      const response = await axios.get(
        `/api/coins/recharge/all?${params.toString()}`,
        getAuthHeaders()
      )
      return response.data.data
    } catch (error: any) {
      console.error('获取所有充值请求失败:', error)
      const { showToast } = useToast()
      showToast(`获取所有充值请求失败: ${error.response?.data?.message || error.message}`, 'error')
      throw error
    }
  },

  /**
   * 处理充值请求（管理员）
   * @param requestId 请求ID
   * @param data 处理数据
   * @returns 处理结果
   */
  async processRechargeRequest(
    requestId: number,
    data: {
      status: 'completed' | 'rejected' | 'cancelled'
      adminRemark?: string
    }
  ): Promise<any> {
    try {
      console.log('处理充值请求:', requestId, data)

      // 验证参数
      if (!requestId || isNaN(requestId)) {
        throw new Error('无效的请求ID')
      }

      if (!data.status || !['completed', 'rejected', 'cancelled'].includes(data.status)) {
        throw new Error('无效的状态值')
      }

      // 使用授权头工具函数
      // 已经在顶部导入了 getAuthHeaders
      const headers = getAuthHeaders()

      // 发送请求时添加授权头
      const response = await axios.post(`/api/coins/recharge/${requestId}/process`, data, headers)

      console.log('处理充值请求成功:', response.data)
      return response.data
    } catch (error: any) {
      console.error('处理充值请求失败:', error)

      // 记录详细错误信息
      if (error.response) {
        console.error('错误响应:', error.response.status, error.response.data)
      }

      throw error
    }
  },
}

export default coinsService
