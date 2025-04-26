/**
 * 用户服务
 * 处理用户认证、注册、资料管理等功能
 */

import axios from 'axios'
import type {
  User,
  UserProfile,
  UserPreferences,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateRequest,
  PreferencesUpdateRequest,
} from '@/types/user'

// API基础URL
const API_URL = 'http://localhost:7001/api'

// 本地存储键
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'

/**
 * 获取存储的认证令牌
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 设置认证令牌到本地存储
 */
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 清除认证令牌
 */
function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 获取存储的用户信息
 */
function getStoredUser(): User | null {
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
 * 设置用户信息到本地存储
 */
function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 清除存储的用户信息
 */
function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY)
}

/**
 * 创建带认证的HTTP请求头
 */
function authHeader() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 用户服务
export const userService = {
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
      throw error
    }
  },

  /**
   * 用户登录
   * @param data 登录信息
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, data)
      const loginResponse = response.data as LoginResponse

      // 存储认证信息
      setToken(loginResponse.token)
      setStoredUser(loginResponse.user)

      return loginResponse
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },

  /**
   * 用户登出
   */
  logout(): void {
    clearToken()
    clearStoredUser()
  },

  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    return !!getToken() && !!getStoredUser()
  },

  /**
   * 获取当前登录用户
   */
  getCurrentUser(): User | null {
    return getStoredUser()
  },

  /**
   * 获取用户详细资料
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: authHeader(),
      })
      return response.data
    } catch (error) {
      console.error('获取用户资料失败:', error)
      throw error
    }
  },

  /**
   * 更新用户资料
   * @param data 更新的资料
   */
  async updateProfile(data: ProfileUpdateRequest): Promise<UserProfile> {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, data, {
        headers: authHeader(),
      })
      return response.data
    } catch (error) {
      console.error('更新用户资料失败:', error)
      throw error
    }
  },

  /**
   * 更新用户偏好设置
   * @param data 更新的偏好设置
   */
  async updatePreferences(data: PreferencesUpdateRequest): Promise<UserPreferences> {
    try {
      const response = await axios.put(`${API_URL}/users/preferences`, data, {
        headers: authHeader(),
      })
      return response.data
    } catch (error) {
      console.error('更新偏好设置失败:', error)
      throw error
    }
  },

  /**
   * 更新用户密码
   * @param data 密码更新信息
   */
  async updatePassword(data: PasswordUpdateRequest): Promise<void> {
    try {
      await axios.put(`${API_URL}/users/password`, data, {
        headers: authHeader(),
      })
    } catch (error) {
      console.error('更新密码失败:', error)
      throw error
    }
  },

  /**
   * 请求密码重置
   * @param data 包含邮箱的请求
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    try {
      await axios.post(`${API_URL}/auth/password-reset-request`, data)
    } catch (error) {
      console.error('请求密码重置失败:', error)
      throw error
    }
  },

  /**
   * 验证认证令牌
   */
  async validateToken(): Promise<boolean> {
    try {
      const token = getToken()
      if (!token) return false

      const response = await axios.get(`${API_URL}/auth/validate-token`, {
        headers: authHeader(),
      })
      return response.status === 200
    } catch (error) {
      console.error('令牌验证失败:', error)
      // 清除无效的令牌
      clearToken()
      clearStoredUser()
      return false
    }
  },
}
