<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// 返回首页
const goToHome = () => {
  router.push('/')
}

// 返回上一页
const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found-view">
    <div class="not-found-container">
      <div class="error-code">404</div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-message">抱歉，您访问的页面不存在或已被移除。</p>
      
      <div class="action-buttons">
        <button @click="goToHome" class="btn btn-primary">
          返回首页
        </button>
        <button @click="goBack" class="btn btn-outline">
          返回上一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: var(--spacing-lg);
  background-color: var(--bg-light);
}

.not-found-container {
  text-align: center;
  max-width: 600px;
  padding: var(--spacing-xl);
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
  margin-bottom: var(--spacing-md);
  opacity: 0.8;
}

.error-title {
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.error-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

@media (max-width: 480px) {
  .error-code {
    font-size: 80px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>
