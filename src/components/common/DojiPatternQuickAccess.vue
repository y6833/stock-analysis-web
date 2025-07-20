<template>
  <div class="doji-pattern-quick-access">
    <el-card class="quick-access-card">
      <template #header>
        <div class="card-header">
          <span class="header-icon">✨</span>
          <span class="header-title">十字星形态分析</span>
          <el-tag size="small" type="success">新功能</el-tag>
        </div>
      </template>

      <div class="quick-access-content">
        <div class="feature-description">
          <p>自动识别股票图表中的十字星形态，帮助您发现潜在的交易机会</p>
        </div>

        <div class="quick-actions">
          <el-button type="primary" size="small" @click="goToScreener">
            <el-icon><Search /></el-icon>
            形态筛选
          </el-button>

          <el-button type="info" size="small" @click="goToSettings">
            <el-icon><Setting /></el-icon>
            配置设置
          </el-button>

          <el-button type="success" size="small" @click="goToAlerts">
            <el-icon><Bell /></el-icon>
            创建提醒
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Setting, Bell, Search } from '@element-plus/icons-vue'

const router = useRouter()

// 导航到十字星筛选工具
const goToScreener = () => {
  router.push('/doji-pattern/screener')
}

// 导航到十字星设置页面
const goToSettings = () => {
  router.push('/doji-pattern/settings')
}

// 导航到十字星提醒页面
const goToAlerts = () => {
  router.push('/doji-pattern/alerts')
}
</script>

<style scoped>
.quick-access-card {
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.quick-access-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
}

.feature-description {
  margin-bottom: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}

.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
