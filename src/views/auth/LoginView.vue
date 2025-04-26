<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import type { LoginRequest } from '@/types/user'

const router = useRouter()
const userStore = useUserStore()

// 表单数据
const loginForm = reactive<LoginRequest>({
  username: '',
  password: '',
  remember: false
})

// 表单验证
const formErrors = reactive({
  username: '',
  password: '',
  general: ''
})

// 表单状态
const isSubmitting = ref(false)
const showPassword = ref(false)

// 验证表单
const validateForm = (): boolean => {
  let isValid = true
  
  // 重置错误
  formErrors.username = ''
  formErrors.password = ''
  formErrors.general = ''
  
  // 验证用户名
  if (!loginForm.username.trim()) {
    formErrors.username = '请输入用户名或邮箱'
    isValid = false
  }
  
  // 验证密码
  if (!loginForm.password) {
    formErrors.password = '请输入密码'
    isValid = false
  } else if (loginForm.password.length < 6) {
    formErrors.password = '密码长度不能少于6个字符'
    isValid = false
  }
  
  return isValid
}

// 提交登录
const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const success = await userStore.login(loginForm)
    
    if (success) {
      // 登录成功，跳转到仪表盘
      router.push('/dashboard')
    } else {
      // 登录失败，显示错误信息
      formErrors.general = userStore.error || '登录失败，请检查用户名和密码'
    }
  } catch (error) {
    console.error('登录过程中发生错误:', error)
    formErrors.general = '登录过程中发生错误，请稍后再试'
  } finally {
    isSubmitting.value = false
  }
}

// 切换到注册页面
const goToRegister = () => {
  router.push('/register')
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 忘记密码
const forgotPassword = () => {
  router.push('/forgot-password')
}
</script>

<template>
  <div class="login-view">
    <div class="auth-container">
      <div class="auth-header">
        <img src="@/image/logo/logo1.png" alt="Logo" class="auth-logo" />
        <h1 class="auth-title">登录到快乐股市</h1>
        <p class="auth-subtitle">登录您的账户以访问个性化的股票分析工具</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- 错误提示 -->
        <div v-if="formErrors.general" class="form-error general-error">
          {{ formErrors.general }}
        </div>
        
        <!-- 用户名/邮箱 -->
        <div class="form-group">
          <label for="username" class="form-label">用户名或邮箱</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input
              id="username"
              v-model="loginForm.username"
              type="text"
              class="form-input"
              :class="{ 'has-error': formErrors.username }"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
            />
          </div>
          <div v-if="formErrors.username" class="form-error">
            {{ formErrors.username }}
          </div>
        </div>
        
        <!-- 密码 -->
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="password"
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'has-error': formErrors.password }"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button 
              type="button" 
              class="toggle-password" 
              @click="togglePasswordVisibility"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="formErrors.password" class="form-error">
            {{ formErrors.password }}
          </div>
        </div>
        
        <!-- 记住我 & 忘记密码 -->
        <div class="form-options">
          <div class="remember-me">
            <input
              id="remember"
              v-model="loginForm.remember"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="remember">记住我</label>
          </div>
          <button type="button" class="forgot-password" @click="forgotPassword">
            忘记密码?
          </button>
        </div>
        
        <!-- 提交按钮 -->
        <button 
          type="submit" 
          class="btn btn-primary btn-block" 
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">登录中...</span>
          <span v-else>登录</span>
        </button>
      </form>
      
      <div class="auth-footer">
        <p>还没有账户? <button @click="goToRegister" class="text-link">立即注册</button></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: var(--spacing-lg);
  background-color: var(--bg-light);
}

.auth-container {
  width: 100%;
  max-width: 480px;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xl);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.auth-logo {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-md);
}

.auth-title {
  font-size: var(--font-size-xl);
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.auth-form {
  margin-bottom: var(--spacing-lg);
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

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: var(--spacing-sm);
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
  outline: none;
}

.form-input.has-error {
  border-color: var(--danger-color);
}

.toggle-password {
  position: absolute;
  right: var(--spacing-sm);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.form-error {
  color: var(--danger-color);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.general-error {
  background-color: rgba(var(--danger-rgb), 0.1);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.remember-me {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.form-checkbox {
  width: 16px;
  height: 16px;
}

.forgot-password {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.btn-block {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}

.auth-footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.text-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 500;
}
</style>
