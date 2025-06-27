<template>
  <div class="smart-recommendation-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">🤖</span>
          AI智能推荐
        </h1>
        <p class="page-description">基于技术分析、量价关系和趋势识别的智能股票推荐系统</p>
      </div>

      <!-- 配置面板 -->
      <div class="config-panel">
        <div class="config-row">
          <div class="config-item">
            <label>风险偏好</label>
            <el-select v-model="options.riskLevel" placeholder="选择风险等级">
              <el-option
                v-for="level in config.riskLevels"
                :key="level.value"
                :label="level.label"
                :value="level.value"
              >
                <span>{{ level.label }}</span>
                <span class="option-desc">{{ level.description }}</span>
              </el-option>
            </el-select>
          </div>

          <div class="config-item">
            <label>预期收益</label>
            <el-select v-model="options.expectedReturn" placeholder="选择预期收益">
              <el-option
                v-for="ret in config.expectedReturns"
                :key="ret.value"
                :label="ret.label"
                :value="ret.value"
              />
            </el-select>
          </div>

          <div class="config-item">
            <label>投资周期</label>
            <el-select v-model="options.timeHorizons" placeholder="选择投资周期">
              <el-option
                v-for="horizon in config.timeHorizons"
                :key="horizon.value"
                :label="horizon.label"
                :value="horizon.value"
              />
            </el-select>
          </div>

          <div class="config-item">
            <label>推荐数量</label>
            <el-input-number v-model="options.limit" :min="1" :max="20" :step="1" />
          </div>
        </div>

        <div class="action-buttons">
          <el-button type="primary" @click="getRecommendations" :loading="loading" icon="Search">
            获取推荐
          </el-button>
          <el-button @click="refreshRecommendations" :loading="refreshing" icon="Refresh">
            刷新数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section" v-if="stats">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalRecommendations }}</div>
          <div class="stat-label">历史推荐</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.averageReturn }}%</div>
          <div class="stat-label">平均收益</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.period }}</div>
          <div class="stat-label">统计周期</div>
        </div>
      </div>
    </div>

    <!-- 推荐结果 -->
    <div class="recommendations-section">
      <div class="section-header">
        <h2>推荐结果</h2>
        <div class="result-meta" v-if="recommendations.length > 0">
          <span>共分析 {{ meta.totalAnalyzed }} 只股票</span>
          <span>符合条件 {{ meta.qualified }} 只</span>
          <span>推荐 {{ meta.recommended }} 只</span>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
        <p class="loading-text">正在分析股票数据，请稍候...</p>
      </div>

      <!-- 推荐卡片列表 -->
      <div v-else-if="recommendations.length > 0" class="recommendations-grid">
        <RecommendationCard
          v-for="stock in recommendations"
          :key="stock.symbol"
          :stock="stock"
          @analyze="analyzeStock"
        />
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>暂无推荐结果</h3>
        <p>请调整筛选条件后重新获取推荐</p>
        <el-button type="primary" @click="getRecommendations"> 获取推荐 </el-button>
      </div>
    </div>

    <!-- 免责声明 -->
    <div class="disclaimer">
      <el-alert :title="config.disclaimer" type="warning" :closable="false" show-icon />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { smartRecommendationService } from '@/services/smartRecommendationService'
import type {
  StockRecommendation,
  RecommendationOptions,
  RecommendationConfig,
  RecommendationStats,
} from '@/services/smartRecommendationService'
import RecommendationCard from '@/components/analysis/RecommendationCard.vue'

// 响应式数据
const loading = ref(false)
const refreshing = ref(false)
const recommendations = ref<StockRecommendation[]>([])
const stats = ref<RecommendationStats | null>(null)
const meta = ref({
  totalAnalyzed: 0,
  qualified: 0,
  recommended: 0,
})

// 推荐选项
const options = reactive<RecommendationOptions>({
  riskLevel: 'medium',
  expectedReturn: 0.05,
  timeHorizon: 7,
  limit: 10,
})

// 配置信息
const config = ref<RecommendationConfig>({
  riskLevels: [],
  timeHorizons: [],
  expectedReturns: [],
  membershipLimits: {},
  disclaimer: '',
})

/**
 * 获取推荐配置
 */
const loadConfig = async () => {
  try {
    config.value = await smartRecommendationService.getRecommendationConfig()
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

/**
 * 获取推荐统计
 */
const loadStats = async () => {
  try {
    stats.value = await smartRecommendationService.getRecommendationStats(30)
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

/**
 * 获取推荐列表
 */
const getRecommendations = async () => {
  loading.value = true
  try {
    const result = await smartRecommendationService.getRecommendations(options)

    if (result.success) {
      recommendations.value = result.data
      meta.value = result.meta
      ElMessage.success(`获取到 ${result.data.length} 个推荐`)
    } else {
      ElMessage.error(result.error || '获取推荐失败')
    }
  } catch (error: any) {
    console.error('获取推荐失败:', error)
    ElMessage.error(error.response?.data?.message || '获取推荐失败')
  } finally {
    loading.value = false
  }
}

/**
 * 刷新推荐列表
 */
const refreshRecommendations = async () => {
  refreshing.value = true
  try {
    const result = await smartRecommendationService.refreshRecommendations(options)

    if (result.success) {
      recommendations.value = result.data
      meta.value = result.meta
      ElMessage.success('推荐数据已刷新')
    } else {
      ElMessage.error(result.error || '刷新失败')
    }
  } catch (error: any) {
    console.error('刷新推荐失败:', error)
    ElMessage.error(error.response?.data?.message || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

/**
 * 分析单个股票
 */
const analyzeStock = async (symbol: string) => {
  try {
    const result = await smartRecommendationService.analyzeStock(symbol)
    // 这里可以打开详细分析弹窗或跳转到股票详情页
    console.log('股票分析结果:', result)
    ElMessage.success(`${symbol} 分析完成`)
  } catch (error: any) {
    console.error(`分析股票 ${symbol} 失败:`, error)
    ElMessage.error(error.response?.data?.message || '分析失败')
  }
}

// 页面初始化
onMounted(async () => {
  await loadConfig()
  await loadStats()
  await getRecommendations()
})
</script>

<style scoped>
.smart-recommendation-view {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.page-header {
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.header-content {
  /* max-width: 1200px; */
  margin: 0 auto;
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xxl);
  font-weight: 800;
  margin: 0 0 var(--spacing-md) 0;
}

.title-icon {
  font-size: 1.2em;
}

.page-description {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.header-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 120px;
}

.stat-value {
  font-size: var(--font-size-xxl);
  font-weight: 800;
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  opacity: 0.8;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: var(--spacing-lg);
  }

  .header-stats {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .stat-card {
    min-width: 200px;
  }

  .page-content {
    padding: 0 var(--spacing-md);
  }
}

/* 智能推荐新增样式 */
.config-panel {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.config-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.option-desc {
  font-size: 12px;
  color: #a0aec0;
  margin-left: 8px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.stats-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.recommendations-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.result-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #718096;
}

.result-meta span {
  padding: 4px 8px;
  background: #edf2f7;
  border-radius: 4px;
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.loading-text {
  margin-top: 16px;
  color: #718096;
  font-size: 14px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.empty-state p {
  margin: 0 0 24px 0;
}

.disclaimer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
