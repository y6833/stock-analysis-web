<template>
  <div class="membership-view">
    <h1 class="title">会员中心</h1>

    <div v-if="isLoading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else>
      <!-- 当前会员信息 -->
      <div class="current-membership">
        <div class="membership-header">
          <h2>当前会员等级: {{ membership?.name }}</h2>
          <div class="membership-badge" :class="membershipClass">
            {{ membership?.level.toUpperCase() }}
          </div>
        </div>

        <div class="membership-details">
          <p class="membership-description">{{ membership?.description }}</p>
          
          <div v-if="membership?.level !== 'free' && membership?.expiresAt" class="expiry-info">
            <p>
              <span class="label">到期时间:</span>
              <span :class="{ 'expired': membership?.expired }">
                {{ formatExpiryDate(membership?.expiresAt) }}
                <span v-if="membership?.expired" class="expired-tag">已过期</span>
              </span>
            </p>
          </div>
          
          <div class="membership-features">
            <h3>会员权益</h3>
            <ul>
              <li v-for="(feature, index) in membership?.features" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 会员等级对比 -->
      <div class="membership-comparison">
        <h2>会员等级对比</h2>
        
        <el-table :data="membershipLevels" stripe style="width: 100%">
          <el-table-column prop="name" label="会员等级" width="150">
            <template #default="scope">
              <div class="level-name">
                <span>{{ scope.row.name }}</span>
                <div 
                  v-if="scope.row.level === membership?.level" 
                  class="current-tag"
                >当前</div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="description" label="描述" />
          
          <el-table-column label="数据刷新间隔" width="150">
            <template #default="scope">
              {{ formatRefreshInterval(scope.row.dataRefreshInterval) }}
            </template>
          </el-table-column>
          
          <el-table-column label="最大关注股票数" width="150">
            <template #default="scope">
              {{ scope.row.maxWatchlistItems === -1 ? '无限制' : scope.row.maxWatchlistItems }}
            </template>
          </el-table-column>
          
          <el-table-column label="最大提醒数" width="150">
            <template #default="scope">
              {{ scope.row.maxAlerts === -1 ? '无限制' : scope.row.maxAlerts }}
            </template>
          </el-table-column>
          
          <el-table-column label="数据源数量" width="150">
            <template #default="scope">
              {{ scope.row.dataSourceLimit === -1 ? '无限制' : scope.row.dataSourceLimit }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 升级会员 -->
      <div class="upgrade-section">
        <h2>升级会员</h2>
        <p>升级到高级会员，享受更多功能和更好的体验。</p>
        
        <div class="upgrade-options">
          <el-card 
            v-for="level in upgradeLevels" 
            :key="level.level" 
            class="upgrade-card"
            :class="{ 'current': level.level === membership?.level }"
          >
            <template #header>
              <div class="upgrade-card-header">
                <h3>{{ level.name }}</h3>
                <div class="membership-badge" :class="`membership-${level.level}`">
                  {{ level.level.toUpperCase() }}
                </div>
              </div>
            </template>
            
            <div class="upgrade-card-content">
              <p class="description">{{ level.description }}</p>
              
              <ul class="features-list">
                <li v-for="(feature, index) in level.features.slice(0, 5)" :key="index">
                  {{ feature }}
                </li>
              </ul>
              
              <div class="upgrade-actions">
                <el-button 
                  v-if="level.level !== membership?.level"
                  type="primary" 
                  @click="handleUpgrade(level.level)"
                >
                  升级到{{ level.name }}
                </el-button>
                <div v-else class="current-plan">
                  当前方案
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { membershipService, type MembershipLevel } from '@/services/membershipService'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'

const userStore = useUserStore()
const { showToast } = useToast()

// 状态
const isLoading = ref(true)
const membershipLevels = ref<MembershipLevel[]>([])

// 计算属性
const membership = computed(() => userStore.membership)

const membershipClass = computed(() => {
  return `membership-${membership.value?.level || 'free'}`
})

const upgradeLevels = computed(() => {
  return membershipLevels.value.filter(level => level.level !== 'free')
})

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
const formatRefreshInterval = (interval: number) => {
  const minutes = interval / (60 * 1000)
  
  if (minutes < 60) {
    return `${minutes} 分钟`
  } else {
    return `${minutes / 60} 小时`
  }
}

// 处理升级会员
const handleUpgrade = async (level: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要升级到${membershipService.getMembershipLevelName(level)}吗？`,
      '升级会员',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 这里应该调用支付接口，但目前只是模拟
    showToast('会员升级功能正在开发中，敬请期待', 'info')
  } catch (error) {
    // 用户取消操作
  }
}

// 获取会员等级列表
const fetchMembershipLevels = async () => {
  try {
    membershipLevels.value = await membershipService.getMembershipLevels()
  } catch (error) {
    console.error('获取会员等级列表失败:', error)
  }
}

// 初始化
onMounted(async () => {
  isLoading.value = true
  
  try {
    // 获取会员信息
    await userStore.fetchMembershipInfo()
    
    // 获取会员等级列表
    await fetchMembershipLevels()
  } catch (error) {
    console.error('初始化会员中心失败:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.membership-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.loading-container {
  padding: 20px;
}

.current-membership {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: var(--el-box-shadow-light);
}

.membership-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.membership-header h2 {
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

.membership-description {
  font-size: 16px;
  margin-bottom: 20px;
}

.expiry-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: var(--el-bg-color);
  border-radius: 4px;
}

.label {
  font-weight: bold;
  margin-right: 10px;
}

.expired {
  color: var(--el-color-danger);
}

.expired-tag {
  background-color: var(--el-color-danger);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.membership-features h3 {
  margin-bottom: 15px;
}

.membership-features ul {
  padding-left: 20px;
}

.membership-features li {
  margin-bottom: 8px;
}

.membership-comparison {
  margin-bottom: 30px;
}

.membership-comparison h2 {
  margin-bottom: 20px;
}

.level-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-tag {
  background-color: var(--el-color-success);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.upgrade-section {
  margin-bottom: 30px;
}

.upgrade-section h2 {
  margin-bottom: 10px;
}

.upgrade-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.upgrade-card {
  transition: transform 0.3s;
}

.upgrade-card:hover {
  transform: translateY(-5px);
}

.upgrade-card.current {
  border: 2px solid var(--el-color-success);
}

.upgrade-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upgrade-card-header h3 {
  margin: 0;
}

.upgrade-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.description {
  margin-bottom: 15px;
}

.features-list {
  padding-left: 20px;
  margin-bottom: 20px;
  flex-grow: 1;
}

.features-list li {
  margin-bottom: 8px;
}

.upgrade-actions {
  margin-top: auto;
  text-align: center;
}

.current-plan {
  color: var(--el-color-success);
  font-weight: bold;
}

@media (max-width: 768px) {
  .membership-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .upgrade-options {
    grid-template-columns: 1fr;
  }
}
</style>
