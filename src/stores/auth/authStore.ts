/**
 * 认证状态管理 - 使用新的认证服务
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/authService'
import { tushareService } from '@/services/tushareService'
import type { User, LoginRequest, RegisterRequest } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  // 认证状态
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const token = ref<string | null>(null)
  const sessionExpiry = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const userId = computed(() => user.value?.id || '')
  const username = computed(() => user.value?.username || '')
  const userEmail = computed(() => user.value?.email || '')
  const userRole = computed(() => user.value?.role || 'user')
  const userAvatar = computed(() => user.value?.avatar || '/src/assets/default-avatar.svg')
  const isAdmin = computed(() => userRole.value === 'admin')
  const isSessionValid = computed(() => {
    if (!sessionExpiry.value) return false
    return Date.now() < sessionExpiry.value
  })

  // 初始化认证状态
  async function initializeAuth() {
    loading.value = true
    error.value = null

    try {
      const success = await authService.initializeAuth()
      
      if (success) {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          user.value = currentUser
          isAuthenticated.value = true
          token.value = authService.getToken()
          
          // 获取会话过期时间
          const expiryStr = localStorage.getItem('session_expiry')
          sessionExpiry.value = expiryStr ? parseInt(expiryStr) : null
        }
      }
      
      return success
    } catch (err: any) {
      error.value = err.message || '初始化认证状态失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 登录
  async function login(loginData: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authService.login(loginData)
      
      user.value = response.user
      token.value = response.token
      isAuthenticated.value = true
      
      // 设置会话过期时间
      const expiry = new Date(response.expiresAt).getTime()
      sessionExpiry.value = expiry
      
      return true
    } catch (err: any) {
      error.value = err.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 注册
  async function register(registerData: RegisterRequest) {
    loading.value = true
    error.value = null

    try {
      await authService.register(registerData)
      return true
    } catch (err: any) {
      error.value = err.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 登出
  async function logout() {
    loading.value = true
    error.value = null

    try {
      await authService.logout()
      
      // 重置状态
      user.value = null
      token.value = null
      isAuthenticated.value = false
      sessionExpiry.value = null
      
      return true
    } catch (err: any) {
      error.value = err.message || '登出失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 检查并刷新令牌
  async function checkAndRefreshToken() {
    if (!isAuthenticated.value) return false

    try {
      return await authService.checkAndRefreshToken()
    } catch (err: any) {
      console.error('刷新令牌失败:', err)
      return false
    }
  }

  // 验证令牌
  async function validateToken() {
    if (!token.value) return false

    try {
      return await authService.validateToken()
    } catch (err: any) {
      console.error('验证令牌失败:', err)
      return false
    }
  }

  return {
    // 状态
    user,
    isAuthenticated,
    token,
    sessionExpiry,
    loading,
    error,

    // 计算属性
    userId,
    username,
    userEmail,
    userRole,
    userAvatar,
    isAdmin,
    isSessionValid,

    // 方法
    initializeAuth,
    login,
    register,
    logout,
    checkAndRefreshToken,
    validateToken
  }
})