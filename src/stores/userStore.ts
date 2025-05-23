import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userService } from '@/services/userService'
import { tushareService } from '@/services/tushareService'
import { membershipService } from '@/services/membershipService'
import type {
  User,
  UserProfile,
  RegisterRequest,
  LoginRequest,
  ProfileUpdateRequest,
  PreferencesUpdateRequest,
  PasswordUpdateRequest,
} from '@/types/user'
import type { UserMembership } from '@/services/membershipService'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isAuthenticated = ref(false)
  const membership = ref<UserMembership | null>(null)

  // 计算属性
  const username = computed(() => user.value?.username || '')
  const userId = computed(() => user.value?.id || '')
  const userEmail = computed(() => user.value?.email || '')
  const userRole = computed(() => user.value?.role || 'user')
  const userAvatar = computed(() => user.value?.avatar || '/src/assets/default-avatar.svg')
  const userPreferences = computed(() => profile.value?.preferences || null)
  const membershipLevel = computed(() => membership.value?.effectiveLevel || 'free')
  const isPremium = computed(() =>
    ['premium', 'enterprise'].includes(membership.value?.effectiveLevel || '')
  )

  // 初始化用户状态
  async function initUserState() {
    isLoading.value = true
    error.value = null

    try {
      // 检查本地存储中的用户信息
      const storedUser = userService.getCurrentUser()

      if (storedUser) {
        user.value = storedUser

        // 验证令牌有效性
        const isValid = await userService.validateToken()

        if (isValid) {
          isAuthenticated.value = true
          // 获取用户详细资料
          await fetchUserProfile()

          // 允许API调用
          tushareService.setAllowApiCall(true)
          console.log('用户状态初始化成功，已允许API调用')
        } else {
          // 令牌无效，清除用户状态
          logout()
        }
      } else {
        // 没有存储的用户信息，禁止API调用
        tushareService.setAllowApiCall(false)
        console.log('未检测到登录状态，已禁止API调用')
      }

      // 更新当前路径
      tushareService.updateCurrentPath(window.location.pathname)
    } catch (err) {
      console.error('初始化用户状态失败:', err)
      error.value = '初始化用户状态失败'

      // 出错时禁止API调用
      tushareService.setAllowApiCall(false)
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  async function register(registerData: RegisterRequest) {
    isLoading.value = true
    error.value = null

    try {
      await userService.register(registerData)
      return true
    } catch (err: any) {
      console.error('注册失败:', err)
      error.value = err.response?.data?.message || '注册失败，请稍后再试'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登录
  async function login(loginData: LoginRequest) {
    isLoading.value = true
    error.value = null

    try {
      const response = await userService.login(loginData)
      user.value = response.user
      isAuthenticated.value = true

      // 获取用户详细资料
      await fetchUserProfile()

      // 允许API调用
      tushareService.setAllowApiCall(true)
      console.log('登录成功，已允许API调用')

      return true
    } catch (err: any) {
      console.error('登录失败:', err)
      error.value = err.response?.data?.message || '登录失败，请检查用户名和密码'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  function logout() {
    userService.logout()
    user.value = null
    profile.value = null
    membership.value = null
    isAuthenticated.value = false
    error.value = null

    // 禁止API调用
    tushareService.setAllowApiCall(false)
    console.log('登出成功，已禁止API调用')
  }

  // 获取用户详细资料
  async function fetchUserProfile() {
    if (!isAuthenticated.value) return

    isLoading.value = true
    error.value = null

    try {
      profile.value = await userService.getUserProfile()

      // 获取会员信息
      await fetchMembershipInfo()
    } catch (err) {
      console.error('获取用户资料失败:', err)
      error.value = '获取用户资料失败'
    } finally {
      isLoading.value = false
    }
  }

  // 获取会员信息
  async function fetchMembershipInfo(forceRefresh = false) {
    if (!isAuthenticated.value) {
      console.warn('获取会员信息失败: 用户未登录')
      return null
    }

    try {
      console.log(`[会员信息] 开始获取会员信息, 强制刷新: ${forceRefresh}`)

      // 获取会员信息前先输出当前状态
      console.log('[会员信息] 当前会员状态:', {
        userId: userId.value,
        username: username.value,
        currentMembership: membership.value,
        currentLevel: membership.value?.effectiveLevel || 'unknown',
      })

      // 获取会员信息
      const result = await membershipService.getUserMembership(forceRefresh)

      // 检查结果是否有效
      if (!result) {
        console.error('[会员信息] 获取会员信息失败: 返回结果为空')
        return null
      }

      // 更新会员信息
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
        console.log(`[会员信息] 用户 ${username.value} 是高级会员，应该有权限访问所有功能`)
      }

      return result
    } catch (err) {
      console.error('[会员信息] 获取会员信息失败:', err)

      // 如果已经有会员信息，保留现有信息而不是返回null
      if (membership.value) {
        console.log('[会员信息] 保留现有会员信息:', membership.value)
        return membership.value
      }

      return null
    }
  }

  // 检查功能访问权限
  async function checkFeatureAccess(
    feature: string,
    params: Record<string, any> = {}
  ): Promise<boolean> {
    if (!isAuthenticated.value) return false

    // 管理员可以访问所有功能
    if (userRole.value === 'admin') return true

    return await membershipService.checkFeatureAccess(feature, params)
  }

  // 更新用户资料
  async function updateProfile(profileData: ProfileUpdateRequest) {
    if (!isAuthenticated.value) return false

    isLoading.value = true
    error.value = null

    try {
      profile.value = await userService.updateProfile(profileData)

      // 更新基本用户信息
      if (user.value && profile.value) {
        user.value = {
          ...user.value,
          avatar: profile.value.avatar,
        }
      }

      return true
    } catch (err) {
      console.error('更新用户资料失败:', err)
      error.value = '更新用户资料失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 更新用户偏好设置
  async function updatePreferences(preferencesData: PreferencesUpdateRequest) {
    if (!isAuthenticated.value || !profile.value) return false

    isLoading.value = true
    error.value = null

    try {
      const updatedPreferences = await userService.updatePreferences(preferencesData)

      if (profile.value) {
        profile.value.preferences = updatedPreferences
      }

      return true
    } catch (err) {
      console.error('更新偏好设置失败:', err)
      error.value = '更新偏好设置失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 更新密码
  async function updatePassword(passwordData: PasswordUpdateRequest) {
    if (!isAuthenticated.value) return false

    isLoading.value = true
    error.value = null

    try {
      await userService.updatePassword(passwordData)
      return true
    } catch (err) {
      console.error('更新密码失败:', err)
      error.value = '更新密码失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 状态
    user,
    profile,
    isLoading,
    error,
    isAuthenticated,
    membership,

    // 计算属性
    username,
    userId,
    userEmail,
    userRole,
    userAvatar,
    userPreferences,
    membershipLevel,
    isPremium,

    // 动作
    initUserState,
    register,
    login,
    logout,
    fetchUserProfile,
    fetchMembershipInfo,
    checkFeatureAccess,
    updateProfile,
    updatePreferences,
    updatePassword,
  }
})
