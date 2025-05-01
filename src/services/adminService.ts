/**
 * 管理员服务
 * 处理管理员相关的API请求
 */

import axios from 'axios'
import { getAuthHeaders } from '@/utils/auth'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 用户列表查询参数接口
export interface UserListParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  role?: string
  status?: string
  membership?: string
}

// 用户列表响应接口
export interface UserListResponse {
  success: boolean
  data: any[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// 用户详情响应接口
export interface UserDetailResponse {
  success: boolean
  data: any
}

// 系统统计信息响应接口
export interface SystemStatsResponse {
  success: boolean
  data: {
    userStats: {
      total: number
      active: number
      admin: number
      premium: number
    }
    membershipStats: {
      free: number
      basic: number
      premium: number
      enterprise: number
    }
    dataStats: {
      watchlists: number
      portfolios: number
      alerts: number
    }
    recentUsers: any[]
    recentLogins: any[]
  }
}

// 管理员服务
export const adminService = {
  /**
   * 获取所有用户列表
   * @param params 查询参数
   */
  async getAllUsers(params: UserListParams = {}): Promise<UserListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'id',
        sortOrder = 'asc',
        search = '',
        role = '',
        status = '',
        membership = '',
      } = params

      // 构建查询参数
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      })

      // 添加可选参数
      if (search) queryParams.append('search', search)
      if (role) queryParams.append('role', role)
      if (status) queryParams.append('status', status)
      if (membership) queryParams.append('membership', membership)

      const response = await axios.get(
        `${API_URL}/admin/users?${queryParams.toString()}`,
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('获取用户列表失败:', error)
      throw new Error(error.response?.data?.message || '获取用户列表失败')
    }
  },

  /**
   * 获取用户详情
   * @param userId 用户ID
   */
  async getUserDetail(userId: string | number): Promise<UserDetailResponse> {
    try {
      const response = await axios.get(`${API_URL}/admin/users/${userId}`, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('获取用户详情失败:', error)
      throw new Error(error.response?.data?.message || '获取用户详情失败')
    }
  },

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param data 更新数据
   */
  async updateUser(userId: string | number, data: any): Promise<any> {
    try {
      const response = await axios.put(`${API_URL}/admin/users/${userId}`, data, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('更新用户信息失败:', error)
      throw new Error(error.response?.data?.message || '更新用户信息失败')
    }
  },

  /**
   * 更新用户状态
   * @param userId 用户ID
   * @param status 状态值
   */
  async updateUserStatus(userId: string | number, status: string): Promise<any> {
    try {
      const response = await axios.patch(
        `${API_URL}/admin/users/${userId}/status`,
        { status },
        getAuthHeaders()
      )
      return response.data
    } catch (error: any) {
      console.error('更新用户状态失败:', error)
      throw new Error(error.response?.data?.message || '更新用户状态失败')
    }
  },

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<SystemStatsResponse> {
    try {
      const response = await axios.get(`${API_URL}/admin/stats`, getAuthHeaders())
      return response.data
    } catch (error: any) {
      console.error('获取系统统计信息失败:', error)
      throw new Error(error.response?.data?.message || '获取系统统计信息失败')
    }
  },
}
