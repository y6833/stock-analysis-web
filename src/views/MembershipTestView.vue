<template>
  <div class="membership-test-view">
    <h1 class="title">会员系统测试</h1>

    <div class="test-container">
      <div class="test-section">
        <h2>当前会员信息</h2>
        <div v-if="isLoading" class="loading">加载中...</div>
        <div v-else class="info-card">
          <div class="info-header">
            <h3>{{ membership?.name || '未知会员' }}</h3>
            <div class="membership-badge" :class="`membership-${membership?.level || 'free'}`">
              {{ membership?.level?.toUpperCase() || 'FREE' }}
            </div>
          </div>
          <div class="info-content">
            <p><strong>描述:</strong> {{ membership?.description || '无描述' }}</p>
            <p><strong>有效等级:</strong> {{ membership?.effectiveLevel || 'free' }}</p>
            <p><strong>是否过期:</strong> {{ membership?.expired ? '是' : '否' }}</p>
            <p><strong>过期时间:</strong> {{ formatExpiryDate(membership?.expiresAt) }}</p>
            <p><strong>数据刷新间隔:</strong> {{ formatRefreshInterval(membership?.dataRefreshInterval) }}</p>
            <p><strong>最大关注股票数:</strong> {{ formatLimit(membership?.maxWatchlistItems) }}</p>
            <p><strong>最大提醒数:</strong> {{ formatLimit(membership?.maxAlerts) }}</p>
            <p><strong>数据源数量限制:</strong> {{ formatLimit(membership?.dataSourceLimit) }}</p>
          </div>
          <div class="info-footer">
            <h4>会员权益:</h4>
            <ul>
              <li v-for="(feature, index) in membership?.features" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>功能访问测试</h2>
        <div class="feature-test-container">
          <div v-for="feature in featuresToTest" :key="feature.key" class="feature-test-item">
            <div class="feature-info">
              <h3>{{ feature.name }}</h3>
              <p>{{ feature.description }}</p>
            </div>
            <div class="feature-test-result">
              <button class="test-button" @click="testFeatureAccess(feature.key)">
                测试访问权限
              </button>
              <div class="result-indicator" :class="getResultClass(feature.key)">
                {{ getResultText(feature.key) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>会员等级列表</h2>
        <div v-if="isLoadingLevels" class="loading">加载中...</div>
        <div v-else class="levels-container">
          <div 
            v-for="level in membershipLevels" 
            :key="level.level" 
            class="level-card"
            :class="{ 'current': level.level === membership?.level }"
          >
            <div class="level-header">
              <h3>{{ level.name }}</h3>
              <div class="membership-badge" :class="`membership-${level.level}`">
                {{ level.level.toUpperCase() }}
              </div>
            </div>
            <div class="level-content">
              <p>{{ level.description }}</p>
              <div class="level-details">
                <p><strong>数据刷新间隔:</strong> {{ formatRefreshInterval(level.dataRefreshInterval) }}</p>
                <p><strong>最大关注股票数:</strong> {{ formatLimit(level.maxWatchlistItems) }}</p>
                <p><strong>最大提醒数:</strong> {{ formatLimit(level.maxAlerts) }}</p>
                <p><strong>数据源数量限制:</strong> {{ formatLimit(level.dataSourceLimit) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { membershipService, type MembershipLevel, type UserMembership } from '@/services/membershipService'
import { useToast } from '@/composables/useToast'

const userStore = useUserStore()
const { showToast } = useToast()

// 状态
const isLoading = ref(true)
const isLoadingLevels = ref(true)
const membership = ref<UserMembership | null>(null)
const membershipLevels = ref<MembershipLevel[]>([])
const featureAccessResults = ref<Record<string, boolean | null>>({})

// 要测试的功能
const featuresToTest = [
  {
    key: 'data_refresh',
    name: '数据刷新',
    description: '刷新股票数据和市场信息'
  },
  {
    key: 'multiple_data_sources',
    name: '多数据源',
    description: '使用多个数据源获取股票数据'
  },
  {
    key: 'advanced_indicators',
    name: '高级指标',
    description: '使用高级技术分析指标'
  },
  {
    key: 'export_data',
    name: '导出数据',
    description: '导出股票数据和分析结果'
  },
  {
    key: 'api_access',
    name: 'API访问',
    description: '通过API访问系统数据'
  }
]

// 格式化过期时间
const formatExpiryDate = (expiresAt: string | null) => {
  if (!expiresAt) return '永久有效'
  
  const date = new Date(expiresAt)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 格式化刷新间隔
const formatRefreshInterval = (interval: number | undefined) => {
  if (!interval) return '未知'
  
  const minutes = interval / (60 * 1000)
  
  if (minutes < 60) {
    return `${minutes} 分钟`
  } else {
    return `${minutes / 60} 小时`
  }
}

// 格式化限制
const formatLimit = (limit: number | undefined) => {
  if (limit === undefined) return '未知'
  if (limit === -1) return '无限制'
  return limit.toString()
}

// 测试功能访问权限
const testFeatureAccess = async (feature: string) => {
  try {
    const hasAccess = await userStore.checkFeatureAccess(feature)
    featureAccessResults.value[feature] = hasAccess
    
    showToast(
      hasAccess 
        ? `您有权限访问 ${getFeatureName(feature)}` 
        : `您没有权限访问 ${getFeatureName(feature)}`,
      hasAccess ? 'success' : 'warning'
    )
  } catch (error) {
    console.error(`测试功能访问权限失败: ${feature}`, error)
    featureAccessResults.value[feature] = null
    showToast(`测试功能访问权限失败: ${getFeatureName(feature)}`, 'error')
  }
}

// 获取功能名称
const getFeatureName = (feature: string) => {
  const found = featuresToTest.find(f => f.key === feature)
  return found ? found.name : feature
}

// 获取测试结果样式类
const getResultClass = (feature: string) => {
  const result = featureAccessResults.value[feature]
  if (result === null) return 'result-unknown'
  return result ? 'result-allowed' : 'result-denied'
}

// 获取测试结果文本
const getResultText = (feature: string) => {
  const result = featureAccessResults.value[feature]
  if (result === undefined) return '未测试'
  if (result === null) return '测试失败'
  return result ? '允许访问' : '拒绝访问'
}

// 初始化
onMounted(async () => {
  try {
    // 获取会员信息
    isLoading.value = true
    membership.value = await userStore.fetchMembershipInfo()
  } catch (error) {
    console.error('获取会员信息失败:', error)
    showToast('获取会员信息失败', 'error')
  } finally {
    isLoading.value = false
  }
  
  try {
    // 获取会员等级列表
    isLoadingLevels.value = true
    membershipLevels.value = await membershipService.getMembershipLevels()
  } catch (error) {
    console.error('获取会员等级列表失败:', error)
    showToast('获取会员等级列表失败', 'error')
  } finally {
    isLoadingLevels.value = false
  }
})
</script>

<style scoped>
.membership-test-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.test-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.test-section {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 10px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  font-style: italic;
  color: var(--el-text-color-secondary);
}

.info-card {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-lighter);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.info-header h3 {
  margin: 0;
}

.membership-badge {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.membership-free {
  background-color: #909399;
}

.membership-basic {
  background-color: #409EFF;
}

.membership-premium {
  background-color: #67C23A;
}

.membership-enterprise {
  background-color: #E6A23C;
}

.info-content {
  margin-bottom: 20px;
}

.info-content p {
  margin: 8px 0;
}

.info-footer h4 {
  margin-top: 0;
  margin-bottom: 10px;
}

.info-footer ul {
  padding-left: 20px;
  margin: 0;
}

.info-footer li {
  margin-bottom: 5px;
}

.feature-test-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.feature-test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--el-box-shadow-lighter);
}

.feature-info {
  flex: 1;
}

.feature-info h3 {
  margin: 0 0 5px 0;
}

.feature-info p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.feature-test-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 120px;
}

.test-button {
  background-color: var(--el-color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.test-button:hover {
  background-color: var(--el-color-primary-dark-2);
}

.result-indicator {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.result-allowed {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.result-denied {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.result-unknown {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.levels-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.level-card {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--el-box-shadow-lighter);
  transition: transform 0.3s;
}

.level-card:hover {
  transform: translateY(-5px);
}

.level-card.current {
  border: 2px solid var(--el-color-success);
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.level-header h3 {
  margin: 0;
}

.level-content p {
  margin-top: 0;
  margin-bottom: 15px;
}

.level-details p {
  margin: 5px 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .feature-test-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .feature-test-result {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
