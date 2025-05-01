<template>
  <div class="membership-view">
    <h1 class="title">会员中心</h1>

    <!-- 会员升级提示 -->
    <MembershipUpgradePrompt
      v-if="showUpgradePrompt"
      :show="showUpgradePrompt"
      :title="upgradePromptTitle"
      :message="upgradePromptMessage"
      :required-level="requiredLevel"
      :target-path="redirectPath"
      @close="closeUpgradePrompt"
      @upgrade="handlePromptUpgrade"
      @payment-complete="handlePaymentComplete"
    />

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
              <span :class="{ expired: membership?.expired }">
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
                <div v-if="scope.row.level === membership?.level" class="current-tag">当前</div>
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

      <!-- 会员功能测试 -->
      <div class="features-test-section">
        <h2>会员功能测试</h2>
        <p>测试不同会员等级的功能限制，了解升级会员可以获得的更多功能。</p>

        <div class="features-test-actions">
          <el-button type="primary" @click="goToFeaturesTest"> 查看会员功能详情 </el-button>
          <el-button type="success" @click="goToRechargeCoins"> 充值逗币 </el-button>
        </div>
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
            :class="{ current: level.level === membership?.level }"
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
                <div v-else class="current-plan">当前方案</div>
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
import { useRouter, useRoute } from 'vue-router'
import MembershipUpgradePrompt from '@/components/common/MembershipUpgradePrompt.vue'
import {
  MEMBERSHIP_LEVEL_NAMES,
  MembershipLevel as MembershipLevelEnum,
} from '@/constants/membership'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const { showToast } = useToast()

// 状态
const isLoading = ref(true)
const membershipLevels = ref<MembershipLevel[]>([])

// 升级提示状态
const showUpgradePrompt = ref(false)
const upgradePromptTitle = ref('需要升级会员')
const upgradePromptMessage = ref('此功能需要升级会员才能使用')
const requiredLevel = ref(MembershipLevelEnum.BASIC)
const redirectPath = ref('')

// 计算属性
const membership = computed(() => userStore.membership)

const membershipClass = computed(() => {
  return `membership-${membership.value?.level || 'free'}`
})

const upgradeLevels = computed(() => {
  return membershipLevels.value.filter((level) => level.level !== 'free')
})

// 格式化过期时间
const formatExpiryDate = (expiresAt: string | null) => {
  if (!expiresAt) return '永久有效'

  const date = new Date(expiresAt)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
    // 设置升级提示信息
    const levelName = membershipService.getMembershipLevelName(level)
    upgradePromptTitle.value = `升级到${levelName}`
    upgradePromptMessage.value = `升级到${levelName}后，您将获得更多高级功能和特权。请扫描二维码完成支付，并务必备注您的账号ID和邮箱用户名。`
    requiredLevel.value = level as MembershipLevelEnum

    // 显示升级提示
    showUpgradePrompt.value = true

    // 记录升级操作
    console.log(`用户 ${userStore.userId} (${userStore.username}) 尝试升级到 ${levelName}`)
  } catch (error) {
    // 处理错误
    showToast('升级会员失败，请稍后再试', 'error')
  }
}

// 处理支付完成
const handlePaymentComplete = () => {
  // 关闭升级提示
  showUpgradePrompt.value = false

  // 显示支付成功提示
  ElMessageBox.alert(
    `<div class="payment-success-message">
      <p>您已完成支付！</p>
      <p>我们将在<strong>1-2个工作日内</strong>为您开通${
        MEMBERSHIP_LEVEL_NAMES[requiredLevel.value]
      }。</p>
      <p>请确保您已在支付时备注了以下信息：</p>
      <ul>
        <li>账号ID: <strong>${userStore.userId}</strong></li>
        <li>邮箱用户名: <strong>${userStore.username}</strong></li>
      </ul>
      <p>如有问题，请联系客服。</p>
    </div>`,
    '支付完成',
    {
      confirmButtonText: '确定',
      type: 'success',
      dangerouslyUseHTMLString: true,
      callback: () => {
        // 记录支付完成操作
        console.log(`用户 ${userStore.userId} (${userStore.username}) 完成了支付流程`)
      },
    }
  )
}

// 导航到会员功能测试页面
const goToFeaturesTest = () => {
  router.push('/membership-features')
}

// 导航到充值逗币页面
const goToRechargeCoins = () => {
  router.push({
    path: '/membership-features',
    query: { section: 'recharge' },
  })
}

// 获取会员等级列表
const fetchMembershipLevels = async () => {
  try {
    membershipLevels.value = await membershipService.getMembershipLevels()
  } catch (error) {
    console.error('获取会员等级列表失败:', error)
  }
}

// 关闭升级提示
const closeUpgradePrompt = () => {
  showUpgradePrompt.value = false
}

// 处理提示中的升级按钮
const handlePromptUpgrade = () => {
  // 关闭提示
  closeUpgradePrompt()

  // 这里可以添加其他逻辑，如自动滚动到升级卡片等
}

// 检查路由参数，显示升级提示
const checkRouteForUpgradePrompt = () => {
  // 检查是否有重定向参数
  if (route.query.redirect) {
    redirectPath.value = route.query.redirect as string

    // 检查是否有所需会员等级参数
    if (route.query.requiredLevel) {
      const level = route.query.requiredLevel as string
      requiredLevel.value = level as MembershipLevelEnum

      // 设置提示信息
      const levelName = MEMBERSHIP_LEVEL_NAMES[level as MembershipLevelEnum] || '高级会员'

      // 检查是否有支付状态参数
      if (route.query.paymentStatus === 'success') {
        // 支付成功，显示成功提示
        ElMessageBox.alert(
          `恭喜您已成功升级到${levelName}！现在您可以使用更多高级功能了。`,
          '升级成功',
          {
            confirmButtonText: '确定',
            type: 'success',
            callback: () => {
              // 刷新会员信息
              userStore.fetchMembershipInfo()
            },
          }
        )
      } else {
        // 普通提示
        upgradePromptTitle.value = `需要${levelName}`
        upgradePromptMessage.value = `您尝试访问的功能需要${levelName}及以上会员等级才能使用。升级会员后即可访问更多高级功能。`

        // 显示提示
        showUpgradePrompt.value = true
      }
    }
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

    // 检查路由参数，显示升级提示
    checkRouteForUpgradePrompt()
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
  background-color: #409eff;
}

.membership-premium {
  background-color: #67c23a;
}

.membership-enterprise {
  background-color: #e6a23c;
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

.features-test-section {
  margin-bottom: 30px;
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
}

.features-test-section h2 {
  margin-bottom: 10px;
}

.features-test-actions {
  margin-top: 20px;
  text-align: center;
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
