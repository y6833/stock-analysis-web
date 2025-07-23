/**
 * 用户资料状态管理 - 专门处理用户资料和偏好设置
 * 从原userStore中分离出用户资料相关功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userService } from '@/services/userService'
import type {
    UserProfile,
    ProfileUpdateRequest,
    PreferencesUpdateRequest,
    PasswordUpdateRequest
} from '@/types/user'
import { createBaseStore } from '@/stores/core/baseStore'
import { useAuthStore } from './authStore'

export const useProfileStore = defineStore('profile', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'profile',
        cache: {
            enabled: true,
            ttl: 10 * 60 * 1000, // 10分钟缓存
            key: 'profile'
        }
    })()

    // 用户资料状态
    const profile = ref<UserProfile | null>(null)
    const preferences = ref<any>(null)

    // 计算属性
    const userPreferences = computed(() => profile.value?.preferences || preferences.value)
    const hasProfile = computed(() => profile.value !== null)

    // 获取用户详细资料
    async function fetchProfile(forceRefresh = false) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const profileData = await userService.getUserProfile()
            profile.value = profileData
            preferences.value = profileData.preferences
            return profileData
        }, {
            cacheKey: 'user_profile',
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('获取用户资料失败:', error)
            }
        })
    }

    // 更新用户资料
    async function updateProfile(profileData: ProfileUpdateRequest) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            const updatedProfile = await userService.updateProfile(profileData)
            profile.value = updatedProfile

            // 更新认证Store中的用户基本信息
            if (authStore.user) {
                authStore.user.avatar = updatedProfile.avatar
            }

            return updatedProfile
        }, {
            onSuccess: () => {
                // 清除缓存，确保下次获取最新数据
                baseStore.clearCache('user_profile')
            },
            onError: (error) => {
                console.error('更新用户资料失败:', error)
            }
        })
    }

    // 更新用户偏好设置
    async function updatePreferences(preferencesData: PreferencesUpdateRequest) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated || !profile.value) {
            throw new Error('用户未登录或资料未加载')
        }

        return await baseStore.executeAsync(async () => {
            const updatedPreferences = await userService.updatePreferences(preferencesData)

            // 更新本地状态
            preferences.value = updatedPreferences
            if (profile.value) {
                profile.value.preferences = updatedPreferences
            }

            return updatedPreferences
        }, {
            onSuccess: () => {
                // 清除缓存
                baseStore.clearCache('user_profile')
            },
            onError: (error) => {
                console.error('更新偏好设置失败:', error)
            }
        })
    }

    // 更新密码
    async function updatePassword(passwordData: PasswordUpdateRequest) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            throw new Error('用户未登录')
        }

        return await baseStore.executeAsync(async () => {
            await userService.updatePassword(passwordData)
            return true
        }, {
            onError: (error) => {
                console.error('更新密码失败:', error)
            }
        })
    }

    // 获取特定偏好设置
    function getPreference(key: string, defaultValue?: any) {
        return userPreferences.value?.[key] ?? defaultValue
    }

    // 设置特定偏好设置
    async function setPreference(key: string, value: any) {
        const currentPrefs = userPreferences.value || {}
        const updatedPrefs = {
            ...currentPrefs,
            [key]: value
        }

        return await updatePreferences(updatedPrefs)
    }

    // 重置资料状态
    function resetProfile() {
        profile.value = null
        preferences.value = null
        baseStore.clearCache()
    }

    return {
        // 基础Store功能
        ...baseStore,

        // 用户资料状态
        profile,
        preferences,

        // 计算属性
        userPreferences,
        hasProfile,

        // 方法
        fetchProfile,
        updateProfile,
        updatePreferences,
        updatePassword,
        getPreference,
        setPreference,
        resetProfile
    }
})