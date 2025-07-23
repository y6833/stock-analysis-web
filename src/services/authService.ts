/**
 * 认证服务
 * 提供统一的认证、授权和会话管理功能
 */

import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import { tushareService } from './tushareService'
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
} from '@/types/user'

// API基础URL - 使用相对路径以利用Vite代理
const API_URL = '/api'

// 本地存储键
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'
const SESSION_EXPIRY_KEY = 'session_expiry'
const REFRESH_TOKEN_KEY = 'refresh_token'

// JWT令牌刷新阈值（30分钟）
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000

/**
 * 认证服务类
 */
class AuthService {
  /**
   * 用户注册
   * @param data 注册信息
   */
  async register(data: RegisterRequest): Promise<User> {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data)
      return response.data
    } catch (error) {
      console.error('注册失败:', error)
      throw this.handleApiError(error)
    }
  }

  /**
   * 用户登录
   * @param data 登录信息
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // 实现登录尝试限制
      const loginAttemptKey = 'login_attempts';
      const loginAttempts = parseInt(localStorage.getItem(loginAttemptKey) || '0');
      const lastAttemptTime = parseInt(localStorage.getItem('last_login_attempt') || '0');
      const now = Date.now();
      
      // 检查是否被锁定（5次失败尝试后锁定15分钟）
      if (loginAttempts >= 5) {
        const lockoutDuration = 15 * 60 * 1000; // 15分钟
        if (now - lastAttemptTime < lockoutDuration) {
          const remainingTime = Math.ceil((lockoutDuration - (now - lastAttemptTime)) / 1000 / 60);
          throw new Error(`登录尝试次数过多，请在${remainingTime}分钟后重试`);
        } else {
          // 锁定时间已过，重置计数器
          localStorage.setItem(loginAttemptKey, '0');
        }
      }
      
      // 记录本次尝试时间
      localStorage.setItem('last_login_attempt', now.toString());
      
      const response = await axios.post(`${API_URL}/auth/login`, data)
      const loginResponse = response.data as LoginResponse

      // 登录成功，重置尝试计数器
      localStorage.setItem(loginAttemptKey, '0');

      // 存储认证信息
      this.setToken(loginResponse.token)
      this.setUser(loginResponse.user)
      
      // 存储会话过期时间和刷新令牌（如果有）
      if (loginResponse.expiresAt) {
        const expiryTime = new Date(loginResponse.expiresAt).getTime()
        localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString())
      }
      
      if (loginResponse.refreshToken) {
        // 安全存储刷新令牌
        const encodedToken = btoa(loginResponse.refreshToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, encodedToken)
      }

      // 允许API调用
      tushareService.setAllowApiCall(true)

      return loginResponse
    } catch (error) {
      console.error('登录失败:', error)
      
      // 增加失败尝试计数
      const loginAttemptKey = 'login_attempts';
      const loginAttempts = parseInt(localStorage.getItem(loginAttemptKey) || '0');
      localStorage.setItem(loginAttemptKey, (loginAttempts + 1).toString());
      
      throw this.handleApiError(error)
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      // 调用登出API
      const token = this.getToken()
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: this.getAuthHeader()
        })
      }
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 无论API调用是否成功，都清除本地状态
      this.clearAuthData()
      
      // 禁止API调用
      tushareService.setAllowApiCall(false)
    }
  }

  /**
   * 刷新认证令牌
   */
  async refreshToken(): Promise<boolean> {
    try {
      const encodedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!encodedRefreshToken) return false
      
      // 解码刷新令牌
      const refreshToken = atob(encodedRefreshToken)

      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken
      })

      const { token, expiresAt } = response.data
      
      // 更新令牌和过期时间
      this.setToken(token)
      
      if (expiresAt) {
        const expiryTime = new Date(expiresAt).getTime()
        localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString())
      }

      return true
    } catch (error) {
      console.error('刷新令牌失败:', error)
      // 刷新失败，清除认证数据
      this.clearAuthData()
      return false
    }
  }

  /**
   * 验证认证令牌
   */
  async validateToken(): Promise<boolean> {
    try {
      const token = this.getToken()
      if (!token) return false

      // 检查令牌是否过期
      if (this.isTokenExpired()) {
        // 尝试刷新令牌
        return await this.refreshToken()
      }

      // 验证令牌有效性
      const response = await axios.get(`${API_URL}/auth/validate-token`, {
        headers: this.getAuthHeader()
      })
      
      return response.status === 200
    } catch (error) {
      console.error('令牌验证失败:', error)
      // 验证失败，清除认证数据
      this.clearAuthData()
      return false
    }
  }

  /**
   * 检查并在需要时刷新令牌
   */
  async checkAndRefreshToken(): Promise<boolean> {
    // 如果没有令牌或未登录，直接返回false
    if (!this.isLoggedIn()) return false

    // 检查令牌是否接近过期
    if (this.isTokenNearExpiry()) {
      return await this.refreshToken()
    }

    return true
  }

  /**
   * 请求密码重置
   * @param data 包含邮箱的请求
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    try {
      await axios.post(`${API_URL}/auth/password-reset-request`, data)
    } catch (error) {
      console.error('请求密码重置失败:', error)
      throw this.handleApiError(error)
    }
  }

  /**
   * 重置密码
   * @param token 重置令牌
   * @param newPassword 新密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      })
    } catch (error) {
      console.error('重置密码失败:', error)
      throw this.handleApiError(error)
    }
  }

  /**
   * 更新用户密码
   * @param data 密码更新信息
   */
  async updatePassword(data: PasswordUpdateRequest): Promise<void> {
    try {
      await axios.put(`${API_URL}/users/password`, data, {
        headers: this.getAuthHeader()
      })
    } catch (error) {
      console.error('更新密码失败:', error)
      throw this.handleApiError(error)
    }
  }

  /**
   * 初始化认证状态
   * 从本地存储加载认证信息并验证有效性
   */
  async initializeAuth(): Promise<boolean> {
    // 检查本地存储中的用户信息和令牌
    const storedUser = this.getUser()
    const storedToken = this.getToken()
    const storedExpiry = localStorage.getItem(SESSION_EXPIRY_KEY)

    if (storedUser && storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry)

      // 检查会话是否过期
      if (Date.now() < expiry) {
        // 验证令牌有效性
        const isValid = await this.validateToken()
        if (isValid) {
          // 允许API调用
          tushareService.setAllowApiCall(true)
          console.log('认证状态初始化成功，已允许API调用')
          return true
        } else {
          // 令牌无效，清除认证状态
          await this.logout()
          return false
        }
      } else {
        // 会话过期，清除认证状态
        await this.logout()
        return false
      }
    } else {
      // 没有存储的认证信息，禁止API调用
      tushareService.setAllowApiCall(false)
      console.log('未检测到登录状态，已禁止API调用')
      return false
    }
  }

  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser()
  }

  /**
   * 获取当前登录用户
   */
  getCurrentUser(): User | null {
    return this.getUser()
  }

  /**
   * 获取用户角色
   */
  getUserRole(): string {
    const user = this.getUser()
    return user?.role || 'guest'
  }

  /**
   * 检查用户是否为管理员
   */
  isAdmin(): boolean {
    return this.getUserRole() === 'admin'
  }

  /**
   * 获取认证令牌
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  /**
   * 设置认证令牌
   */
  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
    
    // 设置默认Authorization头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  /**
   * 获取存储的用户信息
   */
  private getUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY)
    if (userJson) {
      try {
        return JSON.parse(userJson)
      } catch (e) {
        console.error('解析存储的用户信息失败:', e)
        return null
      }
    }
    return null
  }

  /**
   * 设置用户信息
   */
  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  /**
   * 清除所有认证数据
   */
  private clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(SESSION_EXPIRY_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    
    // 清除默认Authorization头
    delete axios.defaults.headers.common['Authorization']
  }

  /**
   * 获取带认证的HTTP请求头
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * 检查令牌是否已过期
   */
  private isTokenExpired(): boolean {
    const token = this.getToken()
    if (!token) return true

    try {
      const decoded: any = jwtDecode(token)
      // JWT exp是以秒为单位的时间戳
      return decoded.exp * 1000 < Date.now()
    } catch (error) {
      console.error('解析JWT令牌失败:', error)
      return true
    }
  }

  /**
   * 检查令牌是否接近过期（30分钟内）
   */
  private isTokenNearExpiry(): boolean {
    const token = this.getToken()
    if (!token) return true

    try {
      const decoded: any = jwtDecode(token)
      // 检查是否在刷新阈值内
      return (decoded.exp * 1000) - Date.now() < TOKEN_REFRESH_THRESHOLD
    } catch (error) {
      console.error('解析JWT令牌失败:', error)
      return true
    }
  }

  /**
   * 处理API错误
   */
  private handleApiError(error: any): Error {
    if (error.response) {
      // 服务器响应了错误状态码
      const { status, data } = error.response
      
      // 处理特定状态码
      switch (status) {
        case 401:
          // 未授权，清除认证状态
          this.clearAuthData()
          return new Error(data.message || '认证失败，请重新登录')
        case 403:
          return new Error(data.message || '没有权限执行此操作')
        case 422:
          // 验证错误
          if (data.errors) {
            const errorMessages = Object.values(data.errors).join(', ')
            return new Error(errorMessages || '表单验证失败')
          }
          return new Error(data.message || '请求数据无效')
        default:
          return new Error(data.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return new Error('服务器无响应，请检查网络连接')
    } else {
      // 请求设置时出错
      return new Error(error.message || '请求错误')
    }
  }
}

// 导出认证服务实例
export const authService = new AuthService()