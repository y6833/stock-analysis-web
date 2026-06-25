<template>
  <AiPageLayout
    title="🤖 AI 智能推荐"
    subtitle="基于技术分析、量价关系和趋势识别的智能股票推荐系统"
  >
    <div class="config-panel glass-card">
        <!-- 第一行：基础筛选条件 -->
        <div class="config-row">
          <div class="config-item">
            <label>风险偏好</label>
            <el-select v-model="options.riskLevel" placeholder="选择风险等级">
              <el-option v-for="level in config.riskLevels" :key="level.value" :label="level.label"
                :value="level.value">
                <span>{{ level.label }}</span>
                <span class="option-desc">{{ level.description }}</span>
              </el-option>
            </el-select>
          </div>

          <div class="config-item">
            <label>预期收益</label>
            <el-select v-model="options.expectedReturn" placeholder="选择预期收益">
              <el-option v-for="ret in config.expectedReturns" :key="ret.value" :label="ret.label" :value="ret.value" />
            </el-select>
          </div>

          <div class="config-item">
            <label>投资周期</label>
            <el-select v-model="options.timeHorizon" placeholder="选择投资周期">
              <el-option v-for="horizon in config.timeHorizons" :key="horizon.value" :label="horizon.label"
                :value="horizon.value" />
            </el-select>
          </div>

          <div class="config-item">
            <label>推荐数量</label>
            <el-input-number v-model="options.limit" :min="1" :max="20" :step="1" />
          </div>
        </div>

        <!-- 第二行：新增筛选条件 -->
        <div class="config-row">
          <div class="config-item">
            <label>行业分类</label>
            <el-select v-model="options.industry" placeholder="选择行业" clearable>
              <el-option label="全部行业" value="all" />
              <el-option label="银行" value="银行" />
              <el-option label="科技" value="科技" />
              <el-option label="白酒" value="白酒" />
              <el-option label="医药" value="医药" />
              <el-option label="新能源" value="新能源" />
              <el-option label="消费" value="消费" />
              <el-option label="房地产" value="房地产" />
              <el-option label="制造业" value="制造业" />
              <el-option label="电力" value="电力" />
              <el-option label="通信" value="通信" />
            </el-select>
          </div>

          <div class="config-item">
            <label>交易板块</label>
            <el-select v-model="options.market" placeholder="选择板块" clearable>
              <el-option label="全部板块" value="all" />
              <el-option label="主板" value="main" />
              <el-option label="创业板" value="gem" />
              <el-option label="科创板" value="star" />
              <el-option label="中小板" value="sme" />
            </el-select>
          </div>

          <div class="config-item">
            <label>市值规模</label>
            <el-select v-model="options.marketCap" placeholder="选择市值" clearable>
              <el-option label="全部规模" value="all" />
              <el-option label="大盘股" value="large" />
              <el-option label="中盘股" value="medium" />
              <el-option label="小盘股" value="small" />
            </el-select>
          </div>

          <div class="config-item">
            <label>筛选说明</label>
            <div class="filter-tips">
              <el-tooltip content="选择行业可以专注于特定领域的投资机会" placement="top">
                <el-tag size="small" type="info">行业筛选</el-tag>
              </el-tooltip>
              <el-tooltip content="不同板块有不同的风险收益特征" placement="top">
                <el-tag size="small" type="warning">板块筛选</el-tag>
              </el-tooltip>
              <el-tooltip content="市值大小影响股票的流动性和波动性" placement="top">
                <el-tag size="small" type="success">市值筛选</el-tag>
              </el-tooltip>
            </div>
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

    <!-- 统计信息 -->
    <div class="stats-section" v-if="stats?.hasData">
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
          <div class="stat-value">{{ (stats as any).averageConfidence ?? stats.averageReturn }}%</div>
          <div class="stat-label">平均置信度</div>
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
        <RecommendationCard v-for="stock in recommendations" :key="stock.symbol" :stock="stock"
          @analyze="analyzeStock" />
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

    <!-- AI 深度分析弹窗 -->
    <el-dialog v-model="analyzeVisible" :title="`${analyzeSymbol} AI 深度分析`" width="640px">
      <div v-loading="analyzeLoading">
        <template v-if="analyzeResult">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="综合评分">{{ analyzeResult.totalScore }}</el-descriptions-item>
            <el-descriptions-item label="推荐">{{ analyzeResult.recommendation }}</el-descriptions-item>
            <el-descriptions-item v-if="analyzeResult.aiAnalysis?.summary" label="AI 总结">
              {{ analyzeResult.aiAnalysis.summary }}
            </el-descriptions-item>
            <el-descriptions-item v-if="analyzeResult.aiAnalysis?.technicalAnalysis" label="技术分析">
              {{ analyzeResult.aiAnalysis.technicalAnalysis }}
            </el-descriptions-item>
            <el-descriptions-item v-if="analyzeResult.aiAnalysis?.riskAssessment" label="风险评估">
              {{ analyzeResult.aiAnalysis.riskAssessment }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-dialog>
  </AiPageLayout>
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
import { aiService } from '@/services/aiService'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'

// 响应式数据
const loading = ref(false)
const refreshing = ref(false)
const analyzeVisible = ref(false)
const analyzeLoading = ref(false)
const analyzeSymbol = ref('')
const analyzeResult = ref<any>(null)
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
  industry: 'all',
  market: 'all',
  marketCap: 'all',
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
  analyzeSymbol.value = symbol
  analyzeVisible.value = true
  analyzeLoading.value = true
  analyzeResult.value = null
  try {
    const result = await aiService.analyzeStock(symbol, {
      riskLevel: options.riskLevel,
      timeHorizon: options.timeHorizon,
    })
    if (result.success) {
      analyzeResult.value = result.data
    } else {
      ElMessage.error(result.message || '分析失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '分析失败')
  } finally {
    analyzeLoading.value = false
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
.config-panel {
  padding: var(--spacing-6);
}

.config-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-5);
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.config-item label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.option-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-left: var(--spacing-2);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-3);
  justify-content: center;
  flex-wrap: wrap;
}

.stats-section {
  margin-bottom: var(--spacing-2);
}

.recommendations-section {
  margin-top: var(--spacing-2);
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

.filter-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.filter-tips .el-tag {
  cursor: help;
}

.disclaimer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
