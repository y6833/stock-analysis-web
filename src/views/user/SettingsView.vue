<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import type { PreferencesUpdateRequest, PasswordUpdateRequest } from '@/types/user'

const userStore = useUserStore()

// 偏好设置表单
const preferencesForm = reactive<PreferencesUpdateRequest>({
  theme: 'light',
  language: 'zh-CN',
  defaultDashboardLayout: '',
  emailNotifications: true,
  pushNotifications: true,
  defaultStockSymbol: '',
  defaultTimeframe: '',
  defaultChartType: '',
})

// 密码更新表单
const passwordForm = reactive<PasswordUpdateRequest>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 表单状态
const activeTab = ref('preferences') // 'preferences' | 'security' | 'notifications'
const isLoading = ref(false)
const isSavingPreferences = ref(false)
const isSavingPassword = ref(false)
const showPreferencesSuccess = ref(false)
const showPasswordSuccess = ref(false)
const preferencesError = ref('')
const passwordError = ref('')
const passwordFormErrors = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 初始化表单数据
onMounted(async () => {
  isLoading.value = true

  try {
    // 确保用户资料已加载
    if (!userStore.profile) {
      await userStore.fetchUserProfile()
    }

    // 填充偏好设置表单
    if (userStore.profile && userStore.profile.preferences) {
      const prefs = userStore.profile.preferences
      preferencesForm.theme = prefs.theme
      preferencesForm.language = prefs.language
      preferencesForm.defaultDashboardLayout = prefs.defaultDashboardLayout
      preferencesForm.emailNotifications = prefs.emailNotifications
      preferencesForm.pushNotifications = prefs.pushNotifications
      preferencesForm.defaultStockSymbol = prefs.defaultStockSymbol || ''
      preferencesForm.defaultTimeframe = prefs.defaultTimeframe || ''
      preferencesForm.defaultChartType = prefs.defaultChartType || ''
    }
  } catch (error) {
    console.error('加载用户设置失败:', error)
    preferencesError.value = '加载用户设置失败，请刷新页面重试'
  } finally {
    isLoading.value = false
  }
})

// 切换标签页
const switchTab = (tab: string) => {
  activeTab.value = tab
}

// 保存偏好设置
const savePreferences = async () => {
  isSavingPreferences.value = true
  preferencesError.value = ''
  showPreferencesSuccess.value = false

  try {
    const success = await userStore.updatePreferences(preferencesForm)

    if (success) {
      showPreferencesSuccess.value = true
      setTimeout(() => {
        showPreferencesSuccess.value = false
      }, 3000)
    } else {
      preferencesError.value = userStore.error || '保存偏好设置失败，请稍后再试'
    }
  } catch (error) {
    console.error('保存偏好设置失败:', error)
    preferencesError.value = '保存偏好设置失败，请稍后再试'
  } finally {
    isSavingPreferences.value = false
  }
}

// 验证密码表单
const validatePasswordForm = (): boolean => {
  let isValid = true

  // 重置错误
  passwordFormErrors.oldPassword = ''
  passwordFormErrors.newPassword = ''
  passwordFormErrors.confirmPassword = ''

  // 验证旧密码
  if (!passwordForm.oldPassword) {
    passwordFormErrors.oldPassword = '请输入当前密码'
    isValid = false
  }

  // 验证新密码
  if (!passwordForm.newPassword) {
    passwordFormErrors.newPassword = '请输入新密码'
    isValid = false
  } else if (passwordForm.newPassword.length < 6) {
    passwordFormErrors.newPassword = '密码长度不能少于6个字符'
    isValid = false
  }

  // 验证确认密码
  if (!passwordForm.confirmPassword) {
    passwordFormErrors.confirmPassword = '请确认新密码'
    isValid = false
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordFormErrors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }

  return isValid
}

// 更新密码
const updatePassword = async () => {
  if (!validatePasswordForm()) return

  isSavingPassword.value = true
  passwordError.value = ''
  showPasswordSuccess.value = false

  try {
    const success = await userStore.updatePassword(passwordForm)

    if (success) {
      showPasswordSuccess.value = true
      // 清空表单
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''

      setTimeout(() => {
        showPasswordSuccess.value = false
      }, 3000)
    } else {
      passwordError.value = userStore.error || '更新密码失败，请稍后再试'
    }
  } catch (error) {
    console.error('更新密码失败:', error)
    passwordError.value = '更新密码失败，请稍后再试'
  } finally {
    isSavingPassword.value = false
  }
}
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <h1>账户设置</h1>
      <p class="page-description">管理您的账户设置和偏好</p>
    </div>

    <div class="settings-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else>
        <!-- 设置标签页 -->
        <div class="settings-tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'preferences' }"
            @click="switchTab('preferences')"
          >
            偏好设置
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'security' }"
            @click="switchTab('security')"
          >
            安全设置
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'notifications' }"
            @click="switchTab('notifications')"
          >
            通知设置
          </button>
        </div>

        <!-- 偏好设置 -->
        <div v-if="activeTab === 'preferences'" class="settings-panel">
          <h2 class="panel-title">偏好设置</h2>

          <!-- 成功提示 -->
          <div v-if="showPreferencesSuccess" class="success-message">偏好设置已成功更新</div>

          <!-- 错误提示 -->
          <div v-if="preferencesError" class="error-message">
            {{ preferencesError }}
          </div>

          <form @submit.prevent="savePreferences" class="settings-form">
            <!-- 主题 -->
            <div class="form-group">
              <label for="theme" class="form-label">主题</label>
              <select id="theme" v-model="preferencesForm.theme" class="form-select">
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>

            <!-- 语言 -->
            <div class="form-group">
              <label for="language" class="form-label">语言</label>
              <select id="language" v-model="preferencesForm.language" class="form-select">
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <!-- 默认仪表盘布局 -->
            <div class="form-group">
              <label for="defaultLayout" class="form-label">默认仪表盘布局</label>
              <select
                id="defaultLayout"
                v-model="preferencesForm.defaultDashboardLayout"
                class="form-select"
              >
                <option value="default">默认布局</option>
                <option value="compact">紧凑布局</option>
                <option value="expanded">扩展布局</option>
              </select>
            </div>

            <!-- 默认股票 -->
            <div class="form-group">
              <label for="defaultStock" class="form-label">默认股票</label>
              <input
                id="defaultStock"
                v-model="preferencesForm.defaultStockSymbol"
                type="text"
                class="form-input"
                placeholder="例如: 000001.SZ"
              />
            </div>

            <!-- 默认时间周期 -->
            <div class="form-group">
              <label for="defaultTimeframe" class="form-label">默认时间周期</label>
              <select
                id="defaultTimeframe"
                v-model="preferencesForm.defaultTimeframe"
                class="form-select"
              >
                <option value="">请选择</option>
                <option value="day">日线</option>
                <option value="week">周线</option>
                <option value="month">月线</option>
                <option value="year">年线</option>
              </select>
            </div>

            <!-- 默认图表类型 -->
            <div class="form-group">
              <label for="defaultChartType" class="form-label">默认图表类型</label>
              <select
                id="defaultChartType"
                v-model="preferencesForm.defaultChartType"
                class="form-select"
              >
                <option value="">请选择</option>
                <option value="candle">K线图</option>
                <option value="line">折线图</option>
                <option value="area">面积图</option>
              </select>
            </div>

            <!-- 提交按钮 -->
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isSavingPreferences">
                <span v-if="isSavingPreferences">保存中...</span>
                <span v-else>保存设置</span>
              </button>
            </div>
          </form>
        </div>

        <!-- 安全设置 -->
        <div v-if="activeTab === 'security'" class="settings-panel">
          <h2 class="panel-title">安全设置</h2>

          <!-- 成功提示 -->
          <div v-if="showPasswordSuccess" class="success-message">密码已成功更新</div>

          <!-- 错误提示 -->
          <div v-if="passwordError" class="error-message">
            {{ passwordError }}
          </div>

          <form @submit.prevent="updatePassword" class="settings-form">
            <h3 class="section-title">更改密码</h3>

            <!-- 当前密码 -->
            <div class="form-group">
              <label for="oldPassword" class="form-label">当前密码</label>
              <input
                id="oldPassword"
                v-model="passwordForm.oldPassword"
                type="password"
                class="form-input"
                :class="{ 'has-error': passwordFormErrors.oldPassword }"
                placeholder="请输入当前密码"
              />
              <div v-if="passwordFormErrors.oldPassword" class="form-error">
                {{ passwordFormErrors.oldPassword }}
              </div>
            </div>

            <!-- 新密码 -->
            <div class="form-group">
              <label for="newPassword" class="form-label">新密码</label>
              <input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                class="form-input"
                :class="{ 'has-error': passwordFormErrors.newPassword }"
                placeholder="请输入新密码"
              />
              <div v-if="passwordFormErrors.newPassword" class="form-error">
                {{ passwordFormErrors.newPassword }}
              </div>
            </div>

            <!-- 确认新密码 -->
            <div class="form-group">
              <label for="confirmPassword" class="form-label">确认新密码</label>
              <input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                class="form-input"
                :class="{ 'has-error': passwordFormErrors.confirmPassword }"
                placeholder="请再次输入新密码"
              />
              <div v-if="passwordFormErrors.confirmPassword" class="form-error">
                {{ passwordFormErrors.confirmPassword }}
              </div>
            </div>

            <!-- 提交按钮 -->
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isSavingPassword">
                <span v-if="isSavingPassword">更新中...</span>
                <span v-else>更新密码</span>
              </button>
            </div>
          </form>

          <div class="security-section">
            <h3 class="section-title">双因素认证</h3>
            <p class="section-description">
              双因素认证为您的账户提供额外的安全保障。启用后，登录时除了密码外，还需要输入手机验证码。
            </p>
            <button class="btn btn-outline">设置双因素认证</button>
          </div>

          <div class="security-section">
            <h3 class="section-title">登录活动</h3>
            <p class="section-description">
              查看您的账户最近的登录活动，如果发现可疑活动，请立即更改密码。
            </p>
            <button class="btn btn-outline">查看登录活动</button>
          </div>

          <div class="security-section">
            <h3 class="section-title">数据源设置</h3>
            <p class="section-description">
              配置和管理股票数据源，您可以选择不同的数据提供商来获取股票数据。
            </p>
            <router-link to="/settings/data-source" class="btn btn-outline">
              管理数据源
            </router-link>
          </div>
        </div>

        <!-- 通知设置 -->
        <div v-if="activeTab === 'notifications'" class="settings-panel">
          <h2 class="panel-title">通知设置</h2>

          <!-- 成功提示 -->
          <div v-if="showPreferencesSuccess" class="success-message">通知设置已成功更新</div>

          <form @submit.prevent="savePreferences" class="settings-form">
            <h3 class="section-title">通知方式</h3>

            <!-- 邮件通知 -->
            <div class="form-group checkbox-group">
              <input
                id="emailNotifications"
                v-model="preferencesForm.emailNotifications"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="emailNotifications">
                <span class="checkbox-label">邮件通知</span>
                <span class="checkbox-description">接收重要更新和提醒的邮件</span>
              </label>
            </div>

            <!-- 推送通知 -->
            <div class="form-group checkbox-group">
              <input
                id="pushNotifications"
                v-model="preferencesForm.pushNotifications"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="pushNotifications">
                <span class="checkbox-label">推送通知</span>
                <span class="checkbox-description">接收浏览器推送通知</span>
              </label>
            </div>

            <h3 class="section-title">通知类型</h3>

            <!-- 价格提醒 -->
            <div class="form-group checkbox-group">
              <input id="priceAlerts" type="checkbox" class="form-checkbox" checked />
              <label for="priceAlerts">
                <span class="checkbox-label">价格提醒</span>
                <span class="checkbox-description">当股票价格达到您设置的条件时通知您</span>
              </label>
            </div>

            <!-- 技术指标提醒 -->
            <div class="form-group checkbox-group">
              <input id="indicatorAlerts" type="checkbox" class="form-checkbox" checked />
              <label for="indicatorAlerts">
                <span class="checkbox-label">技术指标提醒</span>
                <span class="checkbox-description">当技术指标发出信号时通知您</span>
              </label>
            </div>

            <!-- 新闻提醒 -->
            <div class="form-group checkbox-group">
              <input id="newsAlerts" type="checkbox" class="form-checkbox" checked />
              <label for="newsAlerts">
                <span class="checkbox-label">新闻提醒</span>
                <span class="checkbox-description">当您关注的股票有重要新闻时通知您</span>
              </label>
            </div>

            <!-- 提交按钮 -->
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isSavingPreferences">
                <span v-if="isSavingPreferences">保存中...</span>
                <span v-else>保存设置</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  padding: var(--spacing-lg);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
}

.page-description {
  color: var(--text-secondary);
  margin: 0;
}

.settings-container {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-xl);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) 0;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--primary-rgb), 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: var(--spacing-xl);
}

.tab-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--primary-color);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.panel-title {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-lg) 0;
}

.success-message {
  background-color: rgba(var(--success-rgb), 0.1);
  color: var(--success-color);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
}

.error-message {
  background-color: rgba(var(--danger-rgb), 0.1);
  color: var(--danger-color);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
}

.settings-form {
  max-width: 600px;
}

.section-title {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
}

.section-description {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--text-primary);
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
  outline: none;
}

.form-input.has-error {
  border-color: var(--danger-color);
}

.form-error {
  color: var(--danger-color);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.form-checkbox {
  margin-top: 4px;
}

.checkbox-label {
  display: block;
  font-weight: 500;
}

.checkbox-description {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.form-actions {
  margin-top: var(--spacing-lg);
}

.security-section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-direction: column;
    border-bottom: none;
  }

  .tab-button {
    text-align: left;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-light);
  }

  .tab-button.active {
    border-bottom-color: var(--border-light);
    color: var(--primary-color);
  }
}
</style>
