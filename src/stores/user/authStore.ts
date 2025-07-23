/**
 * 认证状态管理 - 专门处理用户认证相关逻辑
 * 从原userStore中分离出认证相关功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userService } from '@/services/userService'
import { tushareService } from '@/services/tushareService'
import type { User, LoginRequest, RegisterRequest } from '@/types/user'
import { createBaseStore } from '@/stores/core/baseStore'

export const useAuthStore = defineStore('auth', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'auth',
        cache: {
            enabled: true,
            ttl: 30 * 60 * 1000, // 30分钟缓存
            key: 'auth'
        }
    })()

    // 认证状态
    const user = ref<User | null>(null)
    const isAuthenticated = ref(false)
    const token = ref<string | null>(null)
    const sessionExpiry = ref<number | null>(null)

    // 计算属性
    const userId = computed(() => user.value?.id || '')
    const username = computed(() => user.value?.username || '')
    const userEmail = computed(() => user.value?.email || '')
    const userRole = computed(() => user.value?.role || 'user')
    const userAvatar = computed(() => user.value?.avatar || '/src/assets/default-avatar.svg')

    const isSessionValid = computed(() => {
        if (!sessionExpiry.value) return false
        return Date.now() < sessionExpiry.value
    })

    const isAdmin = computed(() => userRole.value === 'admin')

    // 初始化认证状态
    async function initializeAuth() {
        return await baseStore.executeAsync(async () => {
            // 检查本地存储中的用户信息
            const storedUser = userService.getCurrentUser()
            const storedToken = localStorage.getItem('auth_token')
            const storedExpiry = localStorage.getItem('session_expiry')

            if (storedUser && storedToken && storedExpiry) {
                const expiry = parseInt(storedExpiry)

                // 检查会话是否过期
                if (Date.now() < expiry) {
                    user.value = storedUser
                    token.value = storedToken
                    sessionExpiry.value = expiry
                    isAuthenticated.value = true

                    // 验证令牌有效性
                    const isValid = await userService.validateToken()
                    if (isValid) {
                        // 允许API调用
                        tushareService.setAllowApiCall(true)
                        console.log('认证状态初始化成功，已允许API调用')
                        return true
                    } else {
                        // 令牌无效，清除认证状态
                        await logout()
                        return false
                    }
                } else {
                    // 会话过期，清除认证状态
                    await logout()
                    return false
                }
            } else {
                // 没有存储的认证信息，禁止API调用
                tushareService.setAllowApiCall(false)
                console.log('未检测到登录状态，已禁止API调用')
                return false
            }
        }, {
            cacheKey: 'auth_init',
            onError: (error) => {
                console.error('初始化认证状态失败:', error)
                tushareService.setAllowApiCall(false)
            }
        })
    }

    // 登录
    async function login(loginData: LoginRequest) {
        return await baseStore.executeAsync(async () => {
            const response = await userService.login(loginData)

            user.value = response.user
            token.value = response.token
            isAuthenticated.value = true

            // 设置会话过期时间（24小时）
            const expiry = Date.now() + (24 * 60 * 60 * 1000)
            sessionExpiry.value = expiry

            // 保存到本地存储
            localStorage.setItem('auth_token', response.token)
            localStorage.setItem('session_expiry', expiry.toString())

            // 允许API调用
            tushareService.setAllowApiCall(true)
            console.log('登录成功，已允许API调用')

            return response
        }, {
            onSuccess: () => {
                // 清除登录相关缓存，强制刷新用户数据
                baseStore.clearCache('auth_init')
            },
            onError: (error) => {
                console.error('登录失败:', error)
            }
        })
    }

    // 注册
    async function register(registerData: RegisterRequest) {
        return await baseStore.executeAsync(async () => {
            const response = await userService.register(registerData)
            return response
        }, {
            onError: (error) => {
                console.error('注册失败:', error)
            }
        })
    }

    // 登出
    async function logout() {
        try {
            // 调用服务层登出
            await userService.logout()
        } catch (error) {
            console.error('登出API调用失败:', error)
        } finally {
            // 无论API调用是否成功，都清除本地状态
            user.value = null
            token.value = null
            isAuthenticated.value = false
            sessionExpiry.value = null

            // 清除本地存储
            localStorage.removeItem('auth_token')
            localStorage.removeItem('session_expiry')

            // 清除缓存
            baseStore.clearCache()

            // 禁止API调用
            tushareService.setAllowApiCall(false)
            console.log('登出成功，已禁止API调用')
        }
    }

    // 刷新令牌
    async function refreshToken() {
        if (!token.value) return false

        return await baseStore.executeAsync(async () => {
            const response = await userService.refreshToken(token.value!)

            token.value = response.token
            const expiry = Date.now() + (24 * 60 * 60 * 1000)
            sessionExpiry.value = expiry

            // 更新本地存储
            localStorage.setItem('auth_token', response.token)
            localStorage.setItem('session_expiry', expiry.toString())

            return true
        }, {
            onError: (error) => {
                console.error('刷新令牌失败:', error)
                // 刷新失败，执行登出
                logout()
            }
        })
    }

    // 检查并刷新令牌（如果即将过期）
    async function checkAndRefreshToken() {
        if (!isAuthenticated.value || !sessionExpiry.value) return false

        // 如果令牌在30分钟内过期，尝试刷新
        const thirtyMinutes = 30 * 60 * 1000
        if (sessionExpiry.value - Date.now() < thirtyMinutes) {
            return await refreshToken()
        }

        return true
    }

    return {
        // 基础Store功能
        ...baseStore,

        // 认证状态
        user,
        isAuthenticated,
        token,
        sessionExpiry,

        // 计算属性
        userId,
        username,
        userEmail,
        userRole,
        userAvatar,
        isSessionValid,
        isAdmin,

        // 方法
        initializeAuth,
        login,
        register,
        logout,
        refreshToken,
        checkAndRefreshToken
    }
})