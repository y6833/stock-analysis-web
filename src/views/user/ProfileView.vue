<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import type { ProfileUpdateRequest } from '@/types/user'

const userStore = useUserStore()

// 表单数据
const profileForm = reactive<ProfileUpdateRequest>({
  nickname: '',
  bio: '',
  phone: '',
  location: '',
  website: '',
  avatar: ''
})

// 表单状态
const isLoading = ref(false)
const isSaving = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

// 初始化表单数据
onMounted(async () => {
  isLoading.value = true
  
  try {
    // 确保用户资料已加载
    if (!userStore.profile) {
      await userStore.fetchUserProfile()
    }
    
    // 填充表单数据
    if (userStore.profile) {
      profileForm.nickname = userStore.profile.nickname || ''
      profileForm.bio = userStore.profile.bio || ''
      profileForm.phone = userStore.profile.phone || ''
      profileForm.location = userStore.profile.location || ''
      profileForm.website = userStore.profile.website || ''
      profileForm.avatar = userStore.profile.avatar || ''
    }
  } catch (error) {
    console.error('加载用户资料失败:', error)
    errorMessage.value = '加载用户资料失败，请刷新页面重试'
  } finally {
    isLoading.value = false
  }
})

// 保存资料
const saveProfile = async () => {
  isSaving.value = true
  errorMessage.value = ''
  showSuccess.value = false
  
  try {
    const success = await userStore.updateProfile(profileForm)
    
    if (success) {
      showSuccess.value = true
      setTimeout(() => {
        showSuccess.value = false
      }, 3000)
    } else {
      errorMessage.value = userStore.error || '保存资料失败，请稍后再试'
    }
  } catch (error) {
    console.error('保存资料失败:', error)
    errorMessage.value = '保存资料失败，请稍后再试'
  } finally {
    isSaving.value = false
  }
}

// 处理头像上传
const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    
    // 在实际应用中，这里应该上传文件到服务器
    // 这里仅做演示，将文件转换为 base64 字符串
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        profileForm.avatar = e.target.result
      }
    }
    reader.readAsDataURL(file)
  }
}
</script>

<template>
  <div class="profile-view">
    <div class="page-header">
      <h1>个人资料</h1>
      <p class="page-description">管理您的个人信息和偏好设置</p>
    </div>
    
    <div class="profile-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="errorMessage" class="error-state">
        <p>{{ errorMessage }}</p>
        <button @click="userStore.fetchUserProfile" class="btn btn-primary">
          重试
        </button>
      </div>
      
      <form v-else @submit.prevent="saveProfile" class="profile-form">
        <!-- 成功提示 -->
        <div v-if="showSuccess" class="success-message">
          个人资料已成功更新
        </div>
        
        <div class="form-layout">
          <!-- 左侧 - 头像 -->
          <div class="avatar-section">
            <div class="avatar-container">
              <img 
                :src="profileForm.avatar || '/src/assets/default-avatar.png'" 
                alt="用户头像" 
                class="avatar-image"
              />
              <div class="avatar-overlay">
                <label for="avatar-upload" class="avatar-upload-label">
                  更换头像
                </label>
              </div>
            </div>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              class="avatar-upload" 
              @change="handleAvatarUpload"
            />
            <p class="avatar-hint">点击头像更换图片<br>支持 JPG, PNG 格式</p>
          </div>
          
          <!-- 右侧 - 表单字段 -->
          <div class="form-fields">
            <!-- 昵称 -->
            <div class="form-group">
              <label for="nickname" class="form-label">昵称</label>
              <input
                id="nickname"
                v-model="profileForm.nickname"
                type="text"
                class="form-input"
                placeholder="请输入您的昵称"
              />
            </div>
            
            <!-- 个人简介 -->
            <div class="form-group">
              <label for="bio" class="form-label">个人简介</label>
              <textarea
                id="bio"
                v-model="profileForm.bio"
                class="form-textarea"
                placeholder="简单介绍一下自己..."
                rows="3"
              ></textarea>
            </div>
            
            <!-- 联系信息 -->
            <div class="form-section">
              <h3 class="section-title">联系信息</h3>
              
              <!-- 手机号码 -->
              <div class="form-group">
                <label for="phone" class="form-label">手机号码</label>
                <input
                  id="phone"
                  v-model="profileForm.phone"
                  type="tel"
                  class="form-input"
                  placeholder="请输入您的手机号码"
                />
              </div>
              
              <!-- 所在地 -->
              <div class="form-group">
                <label for="location" class="form-label">所在地</label>
                <input
                  id="location"
                  v-model="profileForm.location"
                  type="text"
                  class="form-input"
                  placeholder="请输入您的所在地"
                />
              </div>
              
              <!-- 个人网站 -->
              <div class="form-group">
                <label for="website" class="form-label">个人网站</label>
                <input
                  id="website"
                  v-model="profileForm.website"
                  type="url"
                  class="form-input"
                  placeholder="请输入您的个人网站"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <div class="form-actions">
          <button 
            type="submit" 
            class="btn btn-primary" 
            :disabled="isSaving"
          >
            <span v-if="isSaving">保存中...</span>
            <span v-else>保存更改</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
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

.profile-container {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-xl);
}

.loading-state,
.error-state {
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
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--danger-color);
}

.success-message {
  background-color: rgba(var(--success-rgb), 0.1);
  color: var(--success-color);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.form-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.avatar-section {
  text-align: center;
}

.avatar-container {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 0 auto var(--spacing-md);
  border-radius: 50%;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.avatar-upload-label {
  color: white;
  cursor: pointer;
  font-weight: 500;
}

.avatar-upload {
  display: none;
}

.avatar-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-section {
  margin-top: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--border-light);
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
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
  outline: none;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

@media (max-width: 768px) {
  .form-layout {
    grid-template-columns: 1fr;
  }
  
  .avatar-section {
    margin-bottom: var(--spacing-lg);
  }
}
</style>
