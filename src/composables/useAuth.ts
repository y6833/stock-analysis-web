/**
 * 认证相关组合式函数
 * 提供认证状态和方法的便捷访问
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth/authStore'
import type { LoginRequest, RegisterRequest, PasswordResetRequest } from '@/types/user'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // 计算属性
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const user = computed(() => authStore.user)
  const userId = computed(() => authStore.userId)
  const username = computed(() => authStore.username)
  const userEmail = computed(() => authStore.userEmail)
  const userRole = computed(() => authStore.userRole)
  const userAvatar = computed(() => authStore.userAvatar)
  const isAdmin = computed(() => authStore.isAdmin)
  const isSessionValid = computed(() => authStore.isSessionValid)
  const isLoading = computed(() => authStore.loading)
  const error = computed(() => authStore.error)

  // 登录
  const login = async (loginData: LoginRequest) => {
    const success = await authStore.login(loginData)
    return success
  }

  // 注册
  const register = async (registerData: RegisterRequest) => {
    const success = await authStore.register(registerData)
    return success
  }

  // 登出
  const logout = async () => {
    const success = await authStore.logout()
    if (success) {
      router.push('/auth/login')
    }
    return success
  }

  // 请求密码重置
  const requestPasswordReset = async (data: PasswordResetRequest) => {
    // 这里我们直接调用authService
    try {
      const { authService } = await import('@/services/authService')
      await authService.requestPasswordReset(data)
      return true
    } catch (error) {
      return false
    }
  }

  // 初始化认证状态
  const initializeAuth = async () => {
    return await authStore.initializeAuth()
  }

  return {
    // 状态
    isAuthenticated,
    user,
    userId,
    username,
    userEmail,
    userRole,
    userAvatar,
    isAdmin,
    isSessionValid,
    isLoading,
    error,

    // 方法
    login,
    register,
    logout,
    requestPasswordReset,
    initializeAuth
  }
}