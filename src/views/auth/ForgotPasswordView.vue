<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { userService } from '@/services/userService'
import type { PasswordResetRequest } from '@/types/user'

const router = useRouter()

// 表单数据
const resetForm = reactive<PasswordResetRequest>({
  email: ''
})

// 表单验证
const formErrors = reactive({
  email: '',
  general: ''
})

// 表单状态
const isSubmitting = ref(false)
const resetRequestSent = ref(false)

// 验证表单
const validateForm = (): boolean => {
  let isValid = true
  
  // 重置错误
  formErrors.email = ''
  formErrors.general = ''
  
  // 验证邮箱
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!resetForm.email.trim()) {
    formErrors.email = '请输入邮箱'
    isValid = false
  } else if (!emailRegex.test(resetForm.email)) {
    formErrors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  
  return isValid
}

// 提交重置密码请求
const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    await userService.requestPasswordReset(resetForm)
    resetRequestSent.value = true
  } catch (error: any) {
    console.error('请求密码重置失败:', error)
    formErrors.general = error.response?.data?.message || '请求密码重置失败，请稍后再试'
  } finally {
    isSubmitting.value = false
  }
}

// 返回登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="forgot-password-view">
    <div class="auth-container">
      <div class="auth-header">
        <img src="@/image/logo/logo1.png" alt="Logo" class="auth-logo" />
        <h1 class="auth-title">找回密码</h1>
        <p class="auth-subtitle">输入您的邮箱，我们将发送密码重置链接</p>
      </div>
      
      <div v-if="resetRequestSent" class="success-message">
        <div class="success-icon">✅</div>
        <h2>重置链接已发送</h2>
        <p>我们已向 {{ resetForm.email }} 发送了一封包含密码重置链接的邮件。请检查您的邮箱并按照邮件中的指示操作。</p>
        <p class="note">如果您没有收到邮件，请检查垃圾邮件文件夹，或者 <button @click="resetRequestSent = false" class="text-link">重新发送</button></p>
        <button @click="goToLogin" class="btn btn-primary btn-block">返回登录</button>
      </div>
      
      <form v-else @submit.prevent="handleSubmit" class="auth-form">
        <!-- 错误提示 -->
        <div v-if="formErrors.general" class="form-error general-error">
          {{ formErrors.general }}
        </div>
        
        <!-- 邮箱 -->
        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input
              id="email"
              v-model="resetForm.email"
              type="email"
              class="form-input"
              :class="{ 'has-error': formErrors.email }"
              placeholder="请输入您的注册邮箱"
              autocomplete="email"
            />
          </div>
          <div v-if="formErrors.email" class="form-error">
            {{ formErrors.email }}
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <button 
          type="submit" 
          class="btn btn-primary btn-block" 
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">发送中...</span>
          <span v-else>发送重置链接</span>
        </button>
        
        <button 
          type="button" 
          class="btn btn-outline btn-block mt-3" 
          @click="goToLogin"
        >
          返回登录
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.forgot-password-view {
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

.btn-block {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}

.mt-3 {
  margin-top: var(--spacing-md);
}

.success-message {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

.success-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.success-message h2 {
  color: var(--success-color);
  margin-bottom: var(--spacing-md);
}

.success-message p {
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.note {
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.text-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 500;
}
</style>
