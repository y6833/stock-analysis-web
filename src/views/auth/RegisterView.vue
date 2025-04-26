<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import type { RegisterRequest } from '@/types/user'

const router = useRouter()
const userStore = useUserStore()

// 表单数据
const registerForm = reactive<RegisterRequest>({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 表单验证
const formErrors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  general: ''
})

// 表单状态
const isSubmitting = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreeToTerms = ref(false)

// 验证表单
const validateForm = (): boolean => {
  let isValid = true
  
  // 重置错误
  formErrors.username = ''
  formErrors.email = ''
  formErrors.password = ''
  formErrors.confirmPassword = ''
  formErrors.general = ''
  
  // 验证用户名
  if (!registerForm.username.trim()) {
    formErrors.username = '请输入用户名'
    isValid = false
  } else if (registerForm.username.length < 3) {
    formErrors.username = '用户名长度不能少于3个字符'
    isValid = false
  }
  
  // 验证邮箱
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!registerForm.email.trim()) {
    formErrors.email = '请输入邮箱'
    isValid = false
  } else if (!emailRegex.test(registerForm.email)) {
    formErrors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  
  // 验证密码
  if (!registerForm.password) {
    formErrors.password = '请输入密码'
    isValid = false
  } else if (registerForm.password.length < 6) {
    formErrors.password = '密码长度不能少于6个字符'
    isValid = false
  }
  
  // 验证确认密码
  if (!registerForm.confirmPassword) {
    formErrors.confirmPassword = '请确认密码'
    isValid = false
  } else if (registerForm.password !== registerForm.confirmPassword) {
    formErrors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  // 验证服务条款
  if (!agreeToTerms.value) {
    formErrors.general = '请同意服务条款和隐私政策'
    isValid = false
  }
  
  return isValid
}

// 提交注册
const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const success = await userStore.register(registerForm)
    
    if (success) {
      // 注册成功，跳转到登录页面
      router.push('/login?registered=true')
    } else {
      // 注册失败，显示错误信息
      formErrors.general = userStore.error || '注册失败，请稍后再试'
    }
  } catch (error) {
    console.error('注册过程中发生错误:', error)
    formErrors.general = '注册过程中发生错误，请稍后再试'
  } finally {
    isSubmitting.value = false
  }
}

// 切换到登录页面
const goToLogin = () => {
  router.push('/login')
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 切换确认密码可见性
const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}
</script>

<template>
  <div class="register-view">
    <div class="auth-container">
      <div class="auth-header">
        <img src="@/image/logo/logo1.png" alt="Logo" class="auth-logo" />
        <h1 class="auth-title">创建账户</h1>
        <p class="auth-subtitle">注册一个新账户，开始您的股票分析之旅</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- 错误提示 -->
        <div v-if="formErrors.general" class="form-error general-error">
          {{ formErrors.general }}
        </div>
        
        <!-- 用户名 -->
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input
              id="username"
              v-model="registerForm.username"
              type="text"
              class="form-input"
              :class="{ 'has-error': formErrors.username }"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
          <div v-if="formErrors.username" class="form-error">
            {{ formErrors.username }}
          </div>
        </div>
        
        <!-- 邮箱 -->
        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input
              id="email"
              v-model="registerForm.email"
              type="email"
              class="form-input"
              :class="{ 'has-error': formErrors.email }"
              placeholder="请输入邮箱"
              autocomplete="email"
            />
          </div>
          <div v-if="formErrors.email" class="form-error">
            {{ formErrors.email }}
          </div>
        </div>
        
        <!-- 密码 -->
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="password"
              v-model="registerForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'has-error': formErrors.password }"
              placeholder="请输入密码"
              autocomplete="new-password"
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
        
        <!-- 确认密码 -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'has-error': formErrors.confirmPassword }"
              placeholder="请再次输入密码"
              autocomplete="new-password"
            />
            <button 
              type="button" 
              class="toggle-password" 
              @click="toggleConfirmPasswordVisibility"
            >
              {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="formErrors.confirmPassword" class="form-error">
            {{ formErrors.confirmPassword }}
          </div>
        </div>
        
        <!-- 服务条款 -->
        <div class="form-group terms-group">
          <div class="remember-me">
            <input
              id="terms"
              v-model="agreeToTerms"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="terms">我同意 <a href="#" class="text-link">服务条款</a> 和 <a href="#" class="text-link">隐私政策</a></label>
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <button 
          type="submit" 
          class="btn btn-primary btn-block" 
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">注册中...</span>
          <span v-else>注册</span>
        </button>
      </form>
      
      <div class="auth-footer">
        <p>已有账户? <button @click="goToLogin" class="text-link">立即登录</button></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-view {
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

.terms-group {
  margin-top: var(--spacing-md);
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
