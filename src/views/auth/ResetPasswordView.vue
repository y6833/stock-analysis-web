<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '@/services/authService'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 表单数据
const resetForm = reactive({
  password: '',
  confirmPassword: ''
})

// 表单验证
const formErrors = reactive({
  password: '',
  confirmPassword: '',
  general: ''
})

// 表单状态
const isSubmitting = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const resetToken = ref('')
const isTokenValid = ref(false)
const isTokenValidating = ref(true)

// 密码强度检查
const passwordStrength = ref(0)
const passwordStrengthText = ref('')
const passwordStrengthColor = ref('')

// 检查密码强度
const checkPasswordStrength = (password: string) => {
  if (!password) {
    passwordStrength.value = 0
    passwordStrengthText.value = ''
    passwordStrengthColor.value = ''
    return
  }
  
  let strength = 0
  
  // 长度检查
  if (password.length >= 8) strength += 1
  if (password.length >= 12) strength += 1
  
  // 复杂性检查
  if (/[A-Z]/.test(password)) strength += 1
  if (/[a-z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^A-Za-z0-9]/.test(password)) strength += 1
  
  // 设置强度值和文本
  passwordStrength.value = Math.min(5, strength)
  
  switch (true) {
    case strength <= 1:
      passwordStrengthText.value = '非常弱'
      passwordStrengthColor.value = 'var(--danger-color)'
      break
    case strength <= 2:
      passwordStrengthText.value = '弱'
      passwordStrengthColor.value = 'var(--warning-color)'
      break
    case strength <= 3:
      passwordStrengthText.value = '中等'
      passwordStrengthColor.value = 'var(--warning-color)'
      break
    case strength <= 4:
      passwordStrengthText.value = '强'
      passwordStrengthColor.value = 'var(--success-color)'
      break
    default:
      passwordStrengthText.value = '非常强'
      passwordStrengthColor.value = 'var(--success-color)'
  }
}

// 监听密码变化
const handlePasswordChange = () => {
  checkPasswordStrength(resetForm.password)
}

// 验证表单
const validateForm = (): boolean => {
  let isValid = true
  
  // 重置错误
  formErrors.password = ''
  formErrors.confirmPassword = ''
  formErrors.general = ''
  
  // 验证密码
  if (!resetForm.password) {
    formErrors.password = '请输入新密码'
    isValid = false
  } else if (resetForm.password.length < 6) {
    formErrors.password = '密码长度不能少于6个字符'
    isValid = false
  } else if (passwordStrength.value < 3) {
    formErrors.password = '密码强度不足，请使用更复杂的密码'
    isValid = false
  }
  
  // 验证确认密码
  if (!resetForm.confirmPassword) {
    formErrors.confirmPassword = '请确认新密码'
    isValid = false
  } else if (resetForm.password !== resetForm.confirmPassword) {
    formErrors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  return isValid
}

// 提交重置密码
const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    await authService.resetPassword(resetToken.value, resetForm.password)
    
    ElMessage({
      message: '密码重置成功，请使用新密码登录',
      type: 'success',
      duration: 5000
    })
    
    // 跳转到登录页面
    router.push('/auth/login')
  } catch (error: any) {
    console.error('重置密码失败:', error)
    formErrors.general = error.message || '重置密码失败，请稍后再试'
  } finally {
    isSubmitting.value = false
  }
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 切换确认密码可见性
const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

// 返回登录页面
const goToLogin = () => {
  router.push('/auth/login')
}

// 初始化
onMounted(async () => {
  // 从URL获取重置令牌
  const token = route.query.token as string
  
  if (!token) {
    isTokenValid.value = false
    isTokenValidating.value = false
    formErrors.general = '无效的重置链接'
    return
  }
  
  resetToken.value = token
  
  try {
    // 验证令牌有效性
    // 这里应该有一个API来验证令牌，但我们暂时假设令牌有效
    // 实际实现中，应该调用后端API验证令牌
    // const isValid = await authService.validateResetToken(token)
    const isValid = true
    
    isTokenValid.value = isValid
    
    if (!isValid) {
      formErrors.general = '重置链接已过期或无效'
    }
  } catch (error) {
    console.error('验证重置令牌失败:', error)
    isTokenValid.value = false
    formErrors.general = '验证重置链接失败，请稍后再试'
  } finally {
    isTokenValidating.value = false
  }
})
</script>

<template>
  <div class="reset-password-view">
    <div class="auth-container">
      <div class="auth-header">
        <img src="@/image/logo/logo1.png" alt="Logo" class="auth-logo" />
        <h1 class="auth-title">重置密码</h1>
        <p class="auth-subtitle">请设置您的新密码</p>
      </div>
      
      <div v-if="isTokenValidating" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在验证重置链接...</p>
      </div>
      
      <div v-else-if="!isTokenValid" class="error-container">
        <div class="error-icon">❌</div>
        <h2>链接无效</h2>
        <p>{{ formErrors.general || '重置链接已过期或无效' }}</p>
        <p>请重新申请密码重置或联系客服获取帮助。</p>
        <button @click="goToLogin" class="btn btn-primary btn-block">返回登录</button>
      </div>
      
      <form v-else @submit.prevent="handleSubmit" class="auth-form">
        <!-- 错误提示 -->
        <div v-if="formErrors.general" class="form-error general-error">
          {{ formErrors.general }}
        </div>
        
        <!-- 新密码 -->
        <div class="form-group">
          <label for="password" class="form-label">新密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="password"
              v-model="resetForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'has-error': formErrors.password }"
              placeholder="请输入新密码"
              autocomplete="new-password"
              @input="handlePasswordChange"
            />
            <button type="button" class="toggle-password" @click="togglePasswordVisibility">
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="passwordStrength > 0" class="password-strength">
            <div class="strength-bar-container">
              <div 
                class="strength-bar" 
                :style="{ 
                  width: `${passwordStrength * 20}%`, 
                  backgroundColor: passwordStrengthColor 
                }"
              ></div>
            </div>
            <span class="strength-text" :style="{ color: passwordStrengthColor }">
              {{ passwordStrengthText }}
            </span>
          </div>
          <div v-if="formErrors.password" class="form-error">
            {{ formErrors.password }}
          </div>
          <div class="password-tips" v-if="resetForm.password">
            <p>密码建议：</p>
            <ul>
              <li>至少8个字符</li>
              <li>包含大小写字母</li>
              <li>包含数字</li>
              <li>包含特殊字符</li>
            </ul>
          </div>
        </div>
        
        <!-- 确认新密码 -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认新密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="confirmPassword"
              v-model="resetForm.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'has-error': formErrors.confirmPassword }"
              placeholder="请再次输入新密码"
              autocomplete="new-password"
            />
            <button type="button" class="toggle-password" @click="toggleConfirmPasswordVisibility">
              {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="formErrors.confirmPassword" class="form-error">
            {{ formErrors.confirmPassword }}
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <button 
          type="submit" 
          class="btn btn-primary btn-block" 
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">提交中...</span>
          <span v-else>重置密码</span>
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
.reset-password-view {
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

.btn-block {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}

.mt-3 {
  margin-top: var(--spacing-md);
}

.loading-container {
  text-align: center;
  padding: var(--spacing-xl) 0;
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--primary-rgb), 0.3);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.error-container h2 {
  color: var(--danger-color);
  margin-bottom: var(--spacing-md);
}

.error-container p {
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.password-strength {
  margin-top: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.strength-bar-container {
  flex-grow: 1;
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.password-tips {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: rgba(var(--info-rgb), 0.1);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
}

.password-tips p {
  margin-bottom: var(--spacing-xs);
}

.password-tips ul {
  padding-left: var(--spacing-md);
  margin: 0;
}

.password-tips li {
  margin-bottom: 2px;
}
</style>