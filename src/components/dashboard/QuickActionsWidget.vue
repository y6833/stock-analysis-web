<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// 快捷操作列表
const actions = [
  {
    id: 'stock-analysis',
    name: '股票分析',
    icon: '📈',
    route: '/stock'
  },
  {
    id: 'portfolio',
    name: '仓位管理',
    icon: '💼',
    route: '/portfolio'
  },
  {
    id: 'market-heatmap',
    name: '大盘云图',
    icon: '🌎',
    route: '/market-heatmap'
  },
  {
    id: 'industry-analysis',
    name: '行业分析',
    icon: '📊',
    route: '/industry-analysis'
  },
  {
    id: 'news',
    name: '新闻资讯',
    icon: '📰',
    route: '/news'
  },
  {
    id: 'settings',
    name: '系统设置',
    icon: '⚙️',
    route: '/settings'
  }
]

// 导航到指定路由
const navigateTo = (route: string) => {
  router.push(route)
}
</script>

<template>
  <div class="quick-actions-widget">
    <div class="action-grid">
      <div 
        v-for="action in actions" 
        :key="action.id" 
        class="action-card"
        @click="navigateTo(action.route)"
      >
        <div class="action-icon">{{ action.icon }}</div>
        <div class="action-name">{{ action.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-actions-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--spacing-md);
  flex: 1;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--border-light);
  text-align: center;
  height: 100%;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background-color: var(--bg-primary);
}

.action-icon {
  font-size: 24px;
  margin-bottom: var(--spacing-sm);
}

.action-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: 500;
}
</style>
