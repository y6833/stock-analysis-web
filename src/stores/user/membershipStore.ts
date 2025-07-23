/**
 * 会员状态管理 - 专门处理用户会员权限相关逻辑
 * 从原userStore中分离出会员相关功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { membershipService, type UserMembership } from '@/services/membershipService'
import { createBaseStore } from '@/stores/core/baseStore'
import { useAuthStore } from './authStore'

export const useMembershipStore = defineStore('membership', () => {
    // 使用基础Store功能
    const baseStore = createBaseStore({
        name: 'membership',
        cache: {
            enabled: true,
            ttl: 5 * 60 * 1000, // 5分钟缓存
            key: 'membership'
        }
    })()

    // 会员状态
    const membership = ref<UserMembership | null>(null)
    const featureAccess = ref<Map<string, boolean>>(new Map())

    // 计算属性
    const membershipLevel = computed(() => membership.value?.effectiveLevel || 'free')
    const isPremium = computed(() =>
        ['premium', 'enterprise'].includes(membership.value?.effectiveLevel || '')
    )
    const isExpired = computed(() => membership.value?.expired || false)
    const expiresAt = computed(() => membership.value?.expiresAt)
    const membershipName = computed(() => membership.value?.name || '免费用户')

    // 获取会员信息
    async function fetchMembership(forceRefresh = false) {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
            console.warn('获取会员信息失败: 用户未登录')
            return null
        }

        return await baseStore.executeAsync(async () => {
            console.log(`[会员信息] 开始获取会员信息, 强制刷新: ${forceRefresh}`)

            const result = await membershipService.getUserMembership(forceRefresh)

            if (!result) {
                console.error('[会员信息] 获取会员信息失败: 返回结果为空')
                return null
            }

            membership.value = result

            // 输出详细的会员信息
            console.log('[会员信息] 获取到会员信息:', {
                level: result.level,
                effectiveLevel: result.effectiveLevel,
                expired: result.expired,
                expiresAt: result.expiresAt,
                name: result.name,
            })

            // 如果是高级会员，特别标记
            if (['premium', 'enterprise'].includes(result.effectiveLevel)) {
                console.log(`[会员信息] 用户 ${authStore.username} 是高级会员，应该有权限访问所有功能`)
            }

            return result
        }, {
            cacheKey: 'user_membership',
            skipCache: forceRefresh,
            onError: (error) => {
                console.error('[会员信息] 获取会员信息失败:', error)

                // 如果已经有会员信息，保留现有信息
                if (membership.value) {
                    console.log('[会员信息] 保留现有会员信息:', membership.value)
                }
            }
        })
    }

    // 检查功能访问权限
    async function checkFeatureAccess(
        feature: string,
        params: Record<string, any> = {}
    ): Promise<boolean> {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return false

        // 管理员可以访问所有功能
        if (authStore.isAdmin) return true

        // 检查缓存
        const cacheKey = `${feature}_${JSON.stringify(params)}`
        if (featureAccess.value.has(cacheKey)) {
            return featureAccess.value.get(cacheKey)!
        }

        try {
            const hasAccess = await membershipService.checkFeatureAccess(feature, params)

            // 缓存结果（5分钟）
            featureAccess.value.set(cacheKey, hasAccess)
            setTimeout(() => {
                featureAccess.value.delete(cacheKey)
            }, 5 * 60 * 1000)

            return hasAccess
        } catch (error) {
            console.error(`检查功能访问权限失败: ${feature}`, error)
            return false
        }
    }

    // 批量检查功能访问权限
    async function checkMultipleFeatureAccess(
        features: Array<{ feature: string; params?: Record<string, any> }>
    ): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {}

        await Promise.all(
            features.map(async ({ feature, params = {} }) => {
                results[feature] = await checkFeatureAccess(feature, params)
            })
        )

        return results
    }

    // 获取会员权限摘要
    function getMembershipSummary() {
        if (!membership.value) return null

        return {
            level: membershipLevel.value,
            name: membershipName.value,
            isPremium: isPremium.value,
            isExpired: isExpired.value,
            expiresAt: expiresAt.value,
            daysRemaining: expiresAt.value
                ? Math.max(0, Math.ceil((new Date(expiresAt.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null
        }
    }

    // 清除功能访问缓存
    function clearFeatureAccessCache(feature?: string) {
        if (feature) {
            // 清除特定功能的缓存
            const keysToDelete = Array.from(featureAccess.value.keys()).filter(key =>
                key.startsWith(feature)
            )
            keysToDelete.forEach(key => featureAccess.value.delete(key))
        } else {
            // 清除所有功能访问缓存
            featureAccess.value.clear()
        }
    }

    // 重置会员状态
    function resetMembership() {
        membership.value = null
        featureAccess.value.clear()
        baseStore.clearCache()
    }

    return {
        // 基础Store功能
        ...baseStore,

        // 会员状态
        membership,
        featureAccess,

        // 计算属性
        membershipLevel,
        isPremium,
        isExpired,
        expiresAt,
        membershipName,

        // 方法
        fetchMembership,
        checkFeatureAccess,
        checkMultipleFeatureAccess,
        getMembershipSummary,
        clearFeatureAccessCache,
        resetMembership
    }
})