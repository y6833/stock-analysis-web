<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'
import { aiService, type AIStatus } from '@/services/aiService'

const router = useRouter()
const status = ref<AIStatus | null>(null)
const loading = ref(true)

const features = [
  {
    title: 'AI 股票推荐',
    description: 'DeepSeek 深度分析 + 规则引擎融合，智能推荐优质标的',
    icon: '🤖',
    route: '/ai/recommendations',
    tag: '核心',
  },
  {
    title: 'AI 条件筛选',
    description: '用自然语言描述选股条件，AI 自动解析并筛选',
    icon: '🔍',
    route: '/ai/screening',
    tag: '新功能',
  },
  {
    title: 'AI 金股',
    description: '每日精选金股，AI 综合技术、基本面与资金面评选',
    icon: '⭐',
    route: '/ai/golden-stocks',
    tag: '热门',
  },
  {
    title: '投资偏好',
    description: '自定义风险偏好、分析深度与 AI 权重',
    icon: '⚙️',
    route: '/ai/preferences',
    tag: '设置',
  },
  {
    title: '推荐历史',
    description: '查看历史 AI 推荐记录与表现',
    icon: '📜',
    route: '/ai/history',
    tag: '记录',
  },
]

onMounted(async () => {
  try {
    status.value = await aiService.getStatus()
  } catch {
    status.value = { aiEnabled: false, provider: 'deepseek', features: {} }
  } finally {
    loading.value = false
  }
})

function navigate(route: string) {
  router.push(route)
}
</script>

<template>
  <AiPageLayout title="智能投资中心" subtitle="融合 DeepSeek 大模型与量化规则引擎，为您提供股票推荐、自然语言筛选与金股精选">
    <template #extra>
      <div class="ai-hub-extra">
        <div class="ai-hero__status" v-if="!loading">
          <span class="status-dot" :class="{ active: status?.aiEnabled }" />
          <span v-if="status?.aiEnabled">
            {{ status.profileName || status.provider }} · {{ status.model || 'AI 就绪' }}
          </span>
          <span v-else>AI 引擎未配置（使用规则引擎降级）</span>
        </div>
        <router-link to="/admin?tab=ai-providers" class="ai-admin-link">管理员：AI 配置管理 →</router-link>
      </div>
    </template>

    <section class="ai-features">
      <div
        v-for="feature in features"
        :key="feature.route"
        class="ai-card"
        @click="navigate(feature.route)"
        role="button"
        tabindex="0"
        @keydown.enter="navigate(feature.route)"
      >
        <div class="ai-card__header">
          <span class="ai-card__icon">{{ feature.icon }}</span>
          <span class="ai-card__tag">{{ feature.tag }}</span>
        </div>
        <h3 class="ai-card__title">{{ feature.title }}</h3>
        <p class="ai-card__desc">{{ feature.description }}</p>
        <span class="ai-card__cta">进入 →</span>
      </div>
    </section>
  </AiPageLayout>
</template>

<style scoped>
.ai-hub-extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md);
}

.ai-hero__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  opacity: 0.85;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning-color);
}

.status-dot.active {
  background: var(--success-light);
  box-shadow: 0 0 8px var(--success-light);
}

.ai-admin-link {
  display: inline-block;
  margin-top: var(--spacing-3);
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: underline;
}

.ai-features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-6);
}

.ai-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-6);
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.ai-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--ai-accent);
}

.ai-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.ai-card__icon {
  font-size: 2rem;
}

.ai-card__tag {
  font-size: var(--font-size-xs);
  background: var(--ai-accent-light);
  color: var(--ai-accent-dark);
  padding: 2px 10px;
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-medium);
}

.ai-card__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-2);
  color: var(--text-primary);
}

.ai-card__desc {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  margin: 0 0 var(--spacing-4);
}

.ai-card__cta {
  color: var(--ai-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

@media (max-width: 768px) {
  .ai-hero {
    padding: var(--spacing-6) var(--spacing-4);
  }

  .ai-hero__title {
    font-size: var(--font-size-2xl);
  }
}
</style>
