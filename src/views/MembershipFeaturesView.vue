<template>
  <PageLayout title="会员功能测试" subtitle="验证各会员等级功能访问与逗币余额">
    <div class="features-container">
      <!-- 会员信息 -->
      <div class="section">
        <h2 class="section-title">当前会员信息</h2>
        <div v-if="isLoading" class="loading">加载中...</div>
        <div v-else class="info-card">
          <div class="info-header">
            <h3>{{ membership?.name || '未知会员' }}</h3>
            <div class="membership-badge" :class="`membership-${membership?.level || 'free'}`">
              {{ membership?.level?.toUpperCase() || 'FREE' }}
            </div>
          </div>
          <div class="info-content">
            <p><strong>有效等级:</strong> {{ membership?.effectiveLevel || 'free' }}</p>
            <p><strong>是否过期:</strong> {{ membership?.expired ? '是' : '否' }}</p>
            <p v-if="membership?.expiresAt">
              <strong>过期时间:</strong> {{ formatExpiryDate(membership?.expiresAt) }}
            </p>
            <div class="coins-info">
              <p>
                <strong>逗币余额:</strong>
                <span class="coins-balance">{{ userCoins }}</span>
                <el-button
                  type="primary"
                  size="small"
                  circle
                  :loading="coinsLoading"
                  @click="fetchUserCoins(true)"
                  title="刷新逗币余额"
                >
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </p>
              <el-tooltip content="逗币是本站的积分货币，可用于兑换会员权限" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <p v-if="isAdmin" class="admin-notice">
              <el-tag type="danger">管理员身份</el-tag>
              <span>作为管理员，您拥有所有功能的访问权限，不受会员等级限制</span>
            </p>
            <div v-else-if="isPremium" class="premium-notice">
              <el-tag type="success">高级会员</el-tag>
              <span>作为高级会员，您可以访问所有功能</span>
            </div>
            <div v-if="membershipStatus.length > 0" class="membership-status-list">
              <p><strong>会员状态详情:</strong></p>
              <ul>
                <li v-for="(status, index) in membershipStatus" :key="index">
                  {{ status.name }}:
                  <span :class="status.active ? 'status-active' : 'status-inactive'">
                    {{ status.active ? '有效' : '无效' }}
                  </span>
                  <span v-if="status.expiresAt">
                    (到期时间: {{ formatExpiryDate(status.expiresAt) }})
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能测试区域 -->
      <div class="section">
        <h2 class="section-title">功能测试</h2>
        <p class="section-desc">测试不同会员等级的功能限制</p>

        <!-- 数据源测试 -->
        <div class="feature-test-card">
          <h3 class="feature-title">数据源限制</h3>
          <div class="feature-content">
            <p>
              当前会员可使用的数据源数量:
              {{ membership?.dataSourceLimit === -1 ? '无限制' : membership?.dataSourceLimit }}
            </p>

            <div class="feature-demo">
              <MembershipFeature
                feature="use_data_source"
                :params="{ dataSourceCount: 2 }"
                message="基础会员及以上可使用多个数据源"
              >
                <div class="demo-content">
                  <h4>多数据源选择</h4>
                  <div class="data-sources">
                    <div class="data-source-item">
                      <el-radio v-model="selectedDataSource" label="eastmoney">东方财富</el-radio>
                    </div>
                    <div class="data-source-item">
                      <el-radio v-model="selectedDataSource" label="sina">新浪财经</el-radio>
                    </div>
                    <div class="data-source-item">
                      <el-radio v-model="selectedDataSource" label="akshare">AKShare</el-radio>
                    </div>
                  </div>
                </div>
              </MembershipFeature>
            </div>
          </div>
        </div>

        <!-- 技术指标测试 -->
        <div class="feature-test-card">
          <h3 class="feature-title">技术指标限制</h3>
          <div class="feature-content">
            <p>
              当前会员可使用的技术指标:
              {{
                membership?.allowedIndicators?.length === 0
                  ? '全部指标'
                  : membership?.allowedIndicators?.join(', ')
              }}
            </p>

            <div class="feature-demo">
              <MembershipFeature
                feature="use_indicator"
                :params="{ indicator: 'KDJ' }"
                message="基础会员及以上可使用KDJ指标"
              >
                <div class="demo-content">
                  <h4>KDJ指标</h4>
                  <div class="indicator-preview">
                    <img src="@/assets/images/kdj-preview.svg" alt="KDJ指标预览" />
                  </div>
                </div>
              </MembershipFeature>
            </div>

            <div class="feature-demo">
              <MembershipFeature
                feature="use_indicator"
                :params="{ indicator: 'BOLL' }"
                message="基础会员及以上可使用BOLL指标"
              >
                <div class="demo-content">
                  <h4>BOLL指标</h4>
                  <div class="indicator-preview">
                    <img src="@/assets/images/boll-preview.svg" alt="BOLL指标预览" />
                  </div>
                </div>
              </MembershipFeature>
            </div>
          </div>
        </div>

        <!-- 数据导出测试 -->
        <div class="feature-test-card">
          <h3 class="feature-title">数据导出限制</h3>
          <div class="feature-content">
            <p>当前会员是否可以导出数据: {{ membership?.allowExport ? '是' : '否' }}</p>

            <div class="feature-demo">
              <MembershipFeature feature="export_data" message="高级会员及以上可导出数据">
                <div class="demo-content">
                  <h4>数据导出</h4>
                  <div class="export-options">
                    <el-button type="primary">导出CSV</el-button>
                    <el-button type="success">导出Excel</el-button>
                  </div>
                </div>
              </MembershipFeature>
            </div>
          </div>
        </div>

        <!-- 高级图表测试 -->
        <div class="feature-test-card">
          <h3 class="feature-title">高级图表限制</h3>
          <div class="feature-content">
            <p>当前会员是否可以使用高级图表: {{ membership?.allowAdvancedCharts ? '是' : '否' }}</p>

            <div class="feature-demo">
              <MembershipFeature feature="advanced_charts" message="高级会员及以上可使用高级图表">
                <div class="demo-content">
                  <h4>高级K线图表</h4>
                  <div class="chart-preview">
                    <img src="@/assets/images/advanced-chart-preview.svg" alt="高级图表预览" />
                  </div>
                </div>
              </MembershipFeature>
            </div>
          </div>
        </div>
      </div>

      <!-- 会员升级 -->
      <div class="section">
        <h2 class="section-title">会员升级</h2>
        <p class="section-desc">升级会员以解锁更多功能</p>

        <!-- 逗币兑换 -->
        <div class="exchange-section">
          <h3 class="exchange-title">
            <span>逗币兑换会员</span>
            <el-tag type="warning" effect="plain" class="exchange-tag">推荐</el-tag>
          </h3>
          <p class="exchange-desc">使用逗币兑换会员权限，更加灵活经济</p>

          <div class="exchange-options">
            <div class="exchange-card">
              <div class="exchange-header membership-basic">
                <h3>普通会员</h3>
                <div class="exchange-rate">1逗币 = 3天</div>
              </div>
              <div class="exchange-content">
                <p>
                  当前逗币余额: <strong>{{ userCoins }}</strong>
                </p>
                <p>
                  最多可兑换: <strong>{{ userCoins * 3 }}</strong> 天
                </p>

                <div class="exchange-form">
                  <div class="form-item">
                    <label>兑换天数:</label>
                    <el-input-number
                      v-model="basicDays"
                      :min="3"
                      :max="Math.max(3, userCoins * 3)"
                      :disabled="userCoins <= 0"
                      :step="3"
                      size="small"
                    />
                  </div>
                  <div class="form-item">
                    <label>需要逗币:</label>
                    <div class="coins-needed">{{ Math.ceil(basicDays / 3) }}</div>
                  </div>
                  <el-button
                    type="primary"
                    :disabled="userCoins <= 0 || basicDays <= 0"
                    @click="handleExchange('basic', basicDays, Math.ceil(basicDays / 3))"
                  >
                    立即兑换
                  </el-button>
                </div>
              </div>
            </div>

            <div class="exchange-card">
              <div class="exchange-header membership-premium">
                <h3>高级会员</h3>
                <div class="exchange-rate">1逗币 = 1天</div>
              </div>
              <div class="exchange-content">
                <p>
                  当前逗币余额: <strong>{{ userCoins }}</strong>
                </p>
                <p>
                  最多可兑换: <strong>{{ userCoins }}</strong> 天
                </p>

                <div class="exchange-form">
                  <div class="form-item">
                    <label>兑换天数:</label>
                    <el-input-number
                      v-model="premiumDays"
                      :min="1"
                      :max="Math.max(1, userCoins)"
                      :disabled="userCoins <= 0"
                      size="small"
                    />
                  </div>
                  <div class="form-item">
                    <label>需要逗币:</label>
                    <div class="coins-needed">{{ premiumDays }}</div>
                  </div>
                  <el-button
                    type="primary"
                    :disabled="userCoins <= 0 || premiumDays <= 0"
                    @click="handleExchange('premium', premiumDays, premiumDays)"
                  >
                    立即兑换
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="divider">
          <span>或者</span>
        </div>

        <!-- 充值逗币 -->
        <h3 class="payment-title">充值逗币</h3>
        <div class="upgrade-options">
          <div class="upgrade-card">
            <div class="upgrade-header membership-premium">
              <h3>逗币充值</h3>
              <div class="upgrade-badge">DOU COINS</div>
            </div>
            <div class="upgrade-content">
              <p class="upgrade-description">
                充值逗币可用于兑换会员权限，1逗币可兑换3天普通会员或1天高级会员
              </p>
              <div class="coin-packages">
                <div class="coin-package" @click="selectCoinPackage(10)">
                  <div class="coin-amount">10 <span class="coin-icon">💰</span></div>
                  <div class="coin-price">¥10</div>
                  <div class="coin-value">可兑换30天普通会员或10天高级会员</div>
                </div>
                <div class="coin-package" @click="selectCoinPackage(30)">
                  <div class="coin-amount">30 <span class="coin-icon">💰</span></div>
                  <div class="coin-price">¥28</div>
                  <div class="coin-value">可兑换90天普通会员或30天高级会员</div>
                  <div class="coin-tag">优惠</div>
                </div>
                <div class="coin-package" @click="selectCoinPackage(50)">
                  <div class="coin-amount">50 <span class="coin-icon">💰</span></div>
                  <div class="coin-price">¥45</div>
                  <div class="coin-value">可兑换150天普通会员或50天高级会员</div>
                  <div class="coin-tag">超值</div>
                </div>
                <div class="coin-package" @click="selectCoinPackage(100)">
                  <div class="coin-amount">100 <span class="coin-icon">💰</span></div>
                  <div class="coin-price">¥88</div>
                  <div class="coin-value">可兑换300天普通会员或100天高级会员</div>
                  <div class="coin-tag">最划算</div>
                </div>
                <div class="coin-package custom-package" @click="showCustomAmountDialog">
                  <div class="coin-amount">自定义 <span class="coin-icon">💰</span></div>
                  <div class="coin-price">自定义金额</div>
                  <div class="coin-value">按需充值，灵活选择</div>
                </div>
              </div>
              <div class="upgrade-action">
                <el-button type="primary" @click="handleRechargeCoins"> 立即充值 </el-button>
              </div>
            </div>
          </div>

          <!-- 企业会员特殊处理 -->
          <div class="upgrade-card enterprise-card">
            <div class="upgrade-header membership-enterprise">
              <h3>企业会员</h3>
              <div class="upgrade-badge">ENTERPRISE</div>
            </div>
            <div class="upgrade-content">
              <p class="upgrade-description">适合企业团队使用，提供最高级别的功能和支持</p>
              <ul class="upgrade-features">
                <li>无限制使用所有功能</li>
                <li>优先技术支持</li>
                <li>多用户账号管理</li>
                <li>数据导出无限制</li>
                <li>API接口访问权限</li>
              </ul>
              <div class="enterprise-price">¥50/月</div>
              <div class="upgrade-action">
                <el-button type="primary" @click="handleEnterpriseInquiry"> 邮件咨询 </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import PageLayout from '@/components/common/PageLayout.vue'
import { ref, computed, onMounted, nextTick } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { membershipService, type MembershipLevel } from '@/services/membershipService'
import { ElMessageBox, ElLoading } from 'element-plus'
import { InfoFilled, Refresh } from '@element-plus/icons-vue'
import { useToast } from '@/composables/useToast'
import { useRoute, useRouter } from 'vue-router'

const userStore = useUserStore()
const { showToast } = useToast()
const route = useRoute() // 在setup顶层调用useRoute
const router = useRouter() // 在setup顶层调用useRouter

// 状态
const isLoading = ref(true)
const coinsLoading = ref(false) // 逗币加载状态
const selectedDataSource = ref('eastmoney')
const membershipLevels = ref<MembershipLevel[]>([])
const userCoins = ref(0) // 用户逗币余额
const basicDays = ref(3) // 默认兑换3天普通会员
const premiumDays = ref(1) // 默认兑换1天高级会员
const selectedCoinAmount = ref(0) // 选择的充值逗币数量
const membershipStatus = ref<
  Array<{ name: string; level: string; active: boolean; expiresAt: string | null }>
>([])

// 计算属性
const membership = computed(() => userStore.membership)
const isAdmin = computed(() => userStore.userRole === 'admin')
const isPremium = computed(() =>
  ['premium', 'enterprise'].includes(userStore.membershipLevel || '')
)

const upgradeLevels = computed(() => {
  // 过滤出比当前等级高的会员等级
  const currentLevel = membership.value?.effectiveLevel || 'free'
  const levelOrder = { free: 0, basic: 1, premium: 2, enterprise: 3 }

  return membershipLevels.value.filter(
    (level) =>
      levelOrder[level.level as keyof typeof levelOrder] >
      levelOrder[currentLevel as keyof typeof levelOrder]
  )
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

// 处理逗币兑换会员
const handleExchange = async (level: string, days: number, coinsNeeded: number) => {
  try {
    // 检查逗币是否足够
    if (userCoins.value < coinsNeeded) {
      showToast(`逗币不足，需要${coinsNeeded}个逗币，当前余额${userCoins.value}个`, 'error')
      return
    }

    // 获取会员级别名称
    const levelName = level === 'basic' ? '普通会员' : '高级会员'

    // 显示确认对话框
    const exchangeRate = level === 'basic' ? '1逗币=3天普通会员' : '1逗币=1天高级会员'
    await ElMessageBox.confirm(
      `确定要使用 ${coinsNeeded} 个逗币兑换 ${days} 天${levelName}吗？
      <br><small style="color: #909399;">(兑换比例: ${exchangeRate})</small>`,
      '逗币兑换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true,
      }
    )

    // 显示加载状态
    const loadingInstance = ElLoading.service({
      lock: true,
      text: '正在处理兑换请求...',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    try {
      // 导入逗币服务
      const coinsService = (await import('@/services/coinsService')).default

      // 调用API兑换会员
      // 后端会根据level和days计算所需逗币，无需在前端计算
      const response = await coinsService.exchangeMembership({
        level,
        days,
      })

      console.log('会员兑换成功 - 完整响应:', response)

      // 从响应中提取数据
      // 注意：后端返回的数据结构是 { success, message, data }
      // 其中 data 才是实际的兑换结果
      const result = response.data || {}
      console.log('会员兑换成功 - 数据部分:', result)

      // 记录兑换结果
      console.log('兑换结果:', result)

      // 关闭加载状态
      loadingInstance.close()

      // 更新逗币余额（强制刷新）
      await fetchUserCoins(true)

      // 更新会员信息（只更新一次）
      await userStore.fetchMembershipInfo(true)

      // 更新会员状态详情
      await fetchMembershipStatus()

      // 显示成功消息
      // 获取会员过期时间
      let expiryDateStr = '未知'
      try {
        // 首先尝试从兑换结果中获取过期时间
        if (result.expiresAt) {
          const expiryDate = new Date(result.expiresAt)
          if (!isNaN(expiryDate.getTime())) {
            expiryDateStr = expiryDate.toLocaleDateString()
            console.log('从兑换结果中获取到过期时间:', expiryDateStr, expiryDate)
          }
        }

        // 无论如何，都从会员信息中获取最新的过期时间
        const memberInfo = userStore.membershipInfo
        console.log('最新会员信息:', memberInfo)

        // 根据兑换的会员级别获取对应的过期时间
        if (memberInfo) {
          if (level === 'premium' && memberInfo.premiumExpiresAt) {
            const expiryDate = new Date(memberInfo.premiumExpiresAt)
            if (!isNaN(expiryDate.getTime())) {
              expiryDateStr = expiryDate.toLocaleDateString()
              console.log('从会员信息中获取到高级会员过期时间:', expiryDateStr, expiryDate)
            }
          } else if (level === 'basic' && memberInfo.basicExpiresAt) {
            const expiryDate = new Date(memberInfo.basicExpiresAt)
            if (!isNaN(expiryDate.getTime())) {
              expiryDateStr = expiryDate.toLocaleDateString()
              console.log('从会员信息中获取到普通会员过期时间:', expiryDateStr, expiryDate)
            }
          }
        }
      } catch (err) {
        console.error('获取会员过期时间失败:', err)
      }

      // 当前有效会员级别
      let toastEffectiveLevel = result.effectiveLevel || level
      let toastEffectiveLevelName =
        toastEffectiveLevel === 'premium'
          ? '高级会员'
          : toastEffectiveLevel === 'basic'
          ? '普通会员'
          : toastEffectiveLevel === 'enterprise'
          ? '企业会员'
          : '免费用户'

      showToast(
        `兑换成功！您已使用 ${coinsNeeded} 个逗币兑换 ${days} 天${levelName}，当前有效会员: ${toastEffectiveLevelName}`,
        'success'
      )

      // 显示详细成功信息
      const exchangeRateText = level === 'basic' ? '1逗币=3天普通会员' : '1逗币=1天高级会员'

      // 获取最新的逗币余额
      let currentCoins: string | number = '未知'

      // 首先尝试从兑换结果中获取剩余逗币
      if (result.newCoins !== undefined) {
        currentCoins = result.newCoins
        console.log('从兑换结果中获取到剩余逗币:', currentCoins)
      } else {
        // 如果兑换结果中没有剩余逗币，则从API获取
        await fetchUserCoins()
        currentCoins = userCoins.value
        console.log('从API获取到剩余逗币:', currentCoins)
      }

      // 获取各级别会员的状态
      let membershipStatusHtml = ''
      if (result.membershipStatus) {
        console.log('会员状态:', result.membershipStatus)

        // 构建会员状态HTML
        const statusList = []

        // 高级会员
        if (result.membershipStatus.premium && result.membershipStatus.premium.active) {
          const premiumExpiry = new Date(result.membershipStatus.premium.expiresAt)
          statusList.push(`<li>高级会员: 有效期至 ${premiumExpiry.toLocaleDateString()}</li>`)
        }

        // 基础会员
        if (result.membershipStatus.basic && result.membershipStatus.basic.active) {
          const basicExpiry = new Date(result.membershipStatus.basic.expiresAt)
          statusList.push(`<li>普通会员: 有效期至 ${basicExpiry.toLocaleDateString()}</li>`)
        }

        // 企业会员
        if (result.membershipStatus.enterprise && result.membershipStatus.enterprise.active) {
          const enterpriseExpiry = new Date(result.membershipStatus.enterprise.expiresAt)
          statusList.push(`<li>企业会员: 有效期至 ${enterpriseExpiry.toLocaleDateString()}</li>`)
        }

        if (statusList.length > 0) {
          membershipStatusHtml = `
            <div class="membership-status">
              <p><strong>您的会员状态:</strong></p>
              <ul>${statusList.join('')}</ul>
            </div>
          `
        }
      }

      // 当前有效会员级别（用于详细信息）
      const detailEffectiveLevel = result.effectiveLevel || level
      const detailEffectiveLevelName =
        detailEffectiveLevel === 'premium'
          ? '高级会员'
          : detailEffectiveLevel === 'basic'
          ? '普通会员'
          : detailEffectiveLevel === 'enterprise'
          ? '企业会员'
          : '免费用户'

      ElMessageBox.alert(
        `<div style="text-align: center;">
          <i class="el-icon-success" style="font-size: 48px; color: #67C23A;"></i>
          <h3>兑换成功</h3>
          <p>您已成功兑换 ${days} 天${levelName}</p>
          <p>消费: ${coinsNeeded} 逗币</p>
          <p>剩余: ${currentCoins} 逗币</p>
          <p>当前有效会员: <strong>${detailEffectiveLevelName}</strong></p>
          ${membershipStatusHtml}
          <p style="color: #909399; font-size: 12px; margin-top: 10px;">兑换比例: ${exchangeRateText}</p>
        </div>`,
        '兑换结果',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '确定',
          center: true,
        }
      )
    } catch (apiError: any) {
      // 关闭加载状态
      loadingInstance.close()

      // 显示错误信息
      console.error('兑换会员失败:', apiError)
      showToast(`兑换会员失败: ${apiError.message || '未知错误'}`, 'error')

      // 刷新逗币余额
      await fetchUserCoins()
    }
  } catch (error) {
    // 用户取消操作
    console.log('用户取消逗币兑换操作')
  }
}

// 处理企业会员咨询
const handleEnterpriseInquiry = async () => {
  try {
    // 获取用户信息
    const userId = userStore.userId || '未登录用户'
    const userEmail = userStore.userEmail || ''
    const isAuthenticated = userStore.isAuthenticated

    // 调试输出用户信息
    console.log('企业会员咨询 - 用户信息:', {
      userId,
      userEmail,
      isAuthenticated,
      user: userStore.user,
    })

    await ElMessageBox.prompt('请留下您的联系邮箱，我们会尽快与您联系', '企业会员咨询', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      inputPattern: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
      inputErrorMessage: '请输入有效的邮箱地址',
      inputValue: userEmail,
    }).then(({ value: email }) => {
      showToast(`感谢您的咨询，我们会尽快发送企业会员详情到 ${email}`, 'success')

      console.log('企业会员咨询:', {
        userId,
        email,
        timestamp: new Date().toISOString(),
      })

      // 实际项目中应该调用API记录咨询请求
      // await membershipService.recordEnterpriseInquiry(email)
    })
  } catch (error) {
    // 用户取消操作
    console.log('用户取消企业会员咨询')
  }
}

// 选择逗币充值套餐
const selectCoinPackage = (amount: number) => {
  selectedCoinAmount.value = amount

  // 高亮选中的套餐
  const packages = document.querySelectorAll('.coin-package')
  packages.forEach((pkg) => {
    pkg.classList.remove('selected')
  })

  // 找到对应金额的套餐并添加选中样式
  const selectedPackage = Array.from(packages).find((pkg) => {
    return pkg.querySelector('.coin-amount')?.textContent?.includes(amount.toString())
  })

  if (selectedPackage) {
    selectedPackage.classList.add('selected')
  }
}

// 显示自定义充值金额对话框
const showCustomAmountDialog = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入您想充值的逗币数量（1-1000）',
      '自定义充值',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^[1-9][0-9]{0,3}$/,
        inputErrorMessage: '请输入1-1000之间的整数',
        inputValue: '20',
      }
    )

    // 转换为数字
    const amount = parseInt(value)

    // 验证金额范围
    if (amount < 1 || amount > 1000) {
      showToast('请输入1-1000之间的整数', 'warning')
      return
    }

    // 选择自定义套餐
    selectCoinPackage(amount)

    // 高亮自定义套餐选项
    const packages = document.querySelectorAll('.coin-package')
    packages.forEach((pkg) => {
      pkg.classList.remove('selected')
    })

    const customPackage = document.querySelector('.custom-package')
    if (customPackage) {
      customPackage.classList.add('selected')
    }
  } catch (error) {
    // 用户取消操作
    console.log('用户取消自定义充值')
  }
}

// 处理逗币充值
const handleRechargeCoins = async () => {
  // 如果用户没有选择充值套餐，默认选择10个逗币
  if (selectedCoinAmount.value <= 0) {
    selectCoinPackage(10)
  }

  try {
    // 显示确认对话框
    await ElMessageBox.confirm(`确定要充值 ${selectedCoinAmount.value} 个逗币吗？`, '充值逗币', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })

    // 显示支付二维码对话框
    // 获取用户信息
    const userId = userStore.userId || '未登录用户'
    const userEmail = userStore.userEmail || '未知邮箱'
    const isAuthenticated = userStore.isAuthenticated

    // 调试输出用户信息
    console.log('充值逗币 - 用户信息:', {
      userId,
      userEmail,
      isAuthenticated,
      user: userStore.user,
    })

    // 计算支付金额
    let payAmount = 0
    switch (selectedCoinAmount.value) {
      case 10:
        payAmount = 10
        break
      case 30:
        payAmount = 28
        break
      case 50:
        payAmount = 45
        break
      case 100:
        payAmount = 88
        break
      default:
        // 自定义金额，按照1元/逗币计算，超过50个逗币按0.9元/逗币计算
        if (selectedCoinAmount.value > 50) {
          payAmount = Math.round(selectedCoinAmount.value * 0.9)
        } else {
          payAmount = selectedCoinAmount.value
        }
    }

    // 使用 Element Plus 的 MessageBox 显示支付二维码
    await ElMessageBox.alert(
      `<div class="payment-dialog">
        <h3>请使用微信扫码支付</h3>
        <p>充值金额: <strong>¥${payAmount}</strong></p>
        <p>充值数量: <strong>${selectedCoinAmount.value}个逗币</strong></p>
        <div class="qrcode-container">
          <img src="/images/payment/wxCode.jpg" alt="微信支付二维码" class="payment-qrcode" style="width: 100%" />
        </div>
        <div class="payment-instructions">
          <p><strong>支付时请务必备注以下信息:</strong></p>
          <div class="user-info-box">
            <p class="payment-note">用户ID: <span class="highlight-info">${userId}</span></p>
            <p class="payment-note">邮箱: <span class="highlight-info">${userEmail}</span></p>
            <p class="payment-note">充值逗币: <span class="highlight-info">${selectedCoinAmount.value}个</span></p>
          </div>
          <p class="payment-warning">请确保备注信息准确，否则可能导致充值失败！</p>
        </div>
        <p class="payment-tip">支付完成后，请点击"我已支付"按钮提交充值申请</p>
      </div>`,
      '逗币充值支付',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我已支付',
        center: true,
        callback: async (action: string) => {
          if (action === 'confirm') {
            try {
              // 导入逗币服务
              const coinsService = (await import('@/services/coinsService')).default

              // 创建充值请求
              const result = await coinsService.createRechargeRequest({
                amount: selectedCoinAmount.value,
                paymentAmount: payAmount,
                paymentMethod: 'wechat',
                remark: `充值${selectedCoinAmount.value}个逗币，支付金额${payAmount}元`,
              })

              // 显示成功消息
              showToast('充值申请已提交，请等待管理员审核', 'success')

              // 显示充值申请详情
              ElMessageBox.alert(
                `<div class="recharge-success">
                  <h3>充值申请已提交</h3>
                  <div class="success-info">
                    <p>充值数量: <strong>${selectedCoinAmount.value}个逗币</strong></p>
                    <p>支付金额: <strong>¥${payAmount}</strong></p>
                    <p>申请状态: <strong>待审核</strong></p>
                    <p>申请时间: <strong>${new Date().toLocaleString()}</strong></p>
                    <p>用户ID: <strong>${userId}</strong></p>
                    <p>用户邮箱: <strong>${userEmail}</strong></p>
                  </div>
                  <div class="recharge-tip">
                    <p>管理员将在1-2个工作日内审核您的充值申请</p>
                    <p>审核通过后，逗币将自动添加到您的账户</p>
                    <p>您可以在"我的充值记录"中查看充值申请状态</p>
                  </div>
                </div>`,
                '充值申请已提交',
                {
                  dangerouslyUseHTMLString: true,
                  confirmButtonText: '查看充值记录',
                  center: true,
                  callback: (action) => {
                    if (action === 'confirm') {
                      // 跳转到充值记录页面
                      router.push('/recharge-records')
                    }
                  },
                }
              )
            } catch (err) {
              console.error('创建充值请求失败:', err)
            }
          }
        },
      }
    )
  } catch (error) {
    // 用户取消操作
    console.log('用户取消逗币充值操作')
  }
}

// 处理支付升级会员（保留但不再使用）
const handleUpgrade = async (level: string) => {
  try {
    // 获取会员级别信息
    const levelInfo = membershipLevels.value.find((l) => l.level === level)
    if (!levelInfo) {
      showToast('会员级别信息不存在', 'error')
      return
    }

    // 显示确认对话框
    await ElMessageBox.confirm(`确定要升级到${levelInfo.name}吗？`, '升级会员', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })

    // 显示支付二维码对话框
    // 获取用户信息
    const userId = userStore.userId || '未登录用户'
    const userEmail = userStore.userEmail || '未知邮箱'
    const isAuthenticated = userStore.isAuthenticated

    // 调试输出用户信息
    console.log('会员升级 - 用户信息:', {
      userId,
      userEmail,
      isAuthenticated,
      user: userStore.user,
    })

    // 使用 Element Plus 的 MessageBox 显示支付二维码
    await ElMessageBox.alert(
      `<div class="payment-dialog">
        <h3>请使用微信扫码支付</h3>
        <p>会员级别: <strong>${levelInfo.name}</strong></p>
        <div class="qrcode-container">
          <img src="/images/payment/wxCode.jpg" alt="微信支付二维码" class="payment-qrcode" style="width: 100%" />
        </div>
        <div class="payment-instructions">
          <p><strong>支付时请务必备注以下信息:</strong></p>
          <div class="user-info-box">
            <p class="payment-note">用户ID: <span class="highlight-info">${userId}</span></p>
            <p class="payment-note">邮箱: <span class="highlight-info">${userEmail}</span></p>
            <p class="payment-note">升级级别: <span class="highlight-info">${level}</span></p>
          </div>
          <p class="payment-warning">请确保备注信息准确，否则可能导致升级失败！</p>
        </div>
        <p class="payment-tip">支付完成后，请联系客服或等待系统自动处理（1-2个工作日）</p>
      </div>`,
      '会员升级支付',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我已支付',
        center: true,
        callback: (action) => {
          if (action === 'confirm') {
            // 用户点击"我已支付"
            showToast('感谢您的支付！系统将在1-2个工作日内处理您的会员升级请求', 'success')

            // 这里可以调用后端接口记录支付请求
            try {
              // 模拟API调用
              console.log('记录支付请求:', {
                userId,
                userEmail,
                targetLevel: level,
                timestamp: new Date().toISOString(),
              })

              // 实际项目中应该调用真实的API
              // membershipService.recordPaymentRequest(userId, level)
            } catch (err) {
              console.error('记录支付请求失败:', err)
            }
          }
        },
      }
    )
  } catch (error) {
    // 用户取消操作
    console.log('用户取消会员升级操作')
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

// 上次获取逗币余额的时间
let lastFetchCoinsTime = 0
const COINS_CACHE_DURATION = 60 * 1000 // 1分钟缓存

// 获取用户逗币余额
const fetchUserCoins = async (forceRefresh = false) => {
  // 如果不是强制刷新，且距离上次获取时间不足1分钟，则跳过
  const now = Date.now()
  if (!forceRefresh && lastFetchCoinsTime > 0 && now - lastFetchCoinsTime < COINS_CACHE_DURATION) {
    console.log('逗币余额已缓存，跳过获取')
    return
  }

  coinsLoading.value = true
  try {
    // 导入逗币服务
    const coinsService = (await import('@/services/coinsService')).default

    // 获取逗币余额
    const coins = await coinsService.getUserCoins()

    // 确保 coins 是有效的数字
    if (typeof coins === 'number' && !isNaN(coins)) {
      userCoins.value = coins
      console.log('获取到用户逗币余额:', coins)
      // 更新最后获取时间
      lastFetchCoinsTime = now
    } else {
      console.warn('获取到的逗币余额无效:', coins)
      // 保持默认值
    }
  } catch (error) {
    console.error('获取用户逗币余额失败:', error)
    // 不显示错误提示，避免影响用户体验
    // showToast('获取逗币余额失败', 'error')
  } finally {
    coinsLoading.value = false
  }
}

// 获取会员状态详情
const fetchMembershipStatus = async () => {
  try {
    // 获取会员信息
    const memberInfo = userStore.membershipInfo
    if (!memberInfo) return

    // 清空状态列表
    membershipStatus.value = []

    // 添加高级会员状态
    if (memberInfo.premiumExpiresAt) {
      membershipStatus.value.push({
        name: '高级会员',
        level: 'premium',
        active: memberInfo.effectiveLevel === 'premium',
        expiresAt: memberInfo.premiumExpiresAt,
      })
    }

    // 添加普通会员状态
    if (memberInfo.basicExpiresAt) {
      membershipStatus.value.push({
        name: '普通会员',
        level: 'basic',
        active: memberInfo.effectiveLevel === 'basic',
        expiresAt: memberInfo.basicExpiresAt,
      })
    }

    // 添加企业会员状态
    if (memberInfo.enterpriseExpiresAt) {
      membershipStatus.value.push({
        name: '企业会员',
        level: 'enterprise',
        active: memberInfo.effectiveLevel === 'enterprise',
        expiresAt: memberInfo.enterpriseExpiresAt,
      })
    }

    console.log('会员状态详情:', membershipStatus.value)
  } catch (error) {
    console.error('获取会员状态详情失败:', error)
  }
}

// 初始化
onMounted(async () => {
  isLoading.value = true

  try {
    // 获取用户信息
    const userId = userStore.userId || '未登录用户'
    const userEmail = userStore.userEmail || '未知邮箱'
    const isAuthenticated = userStore.isAuthenticated

    // 调试输出用户信息
    console.log('会员页面初始化 - 用户信息:', {
      userId,
      userEmail,
      isAuthenticated,
      user: userStore.user,
    })

    // 检查是否已经有会员信息，避免重复请求
    if (!userStore.membershipInfo || Object.keys(userStore.membershipInfo).length === 0) {
      console.log('没有会员信息，正在获取...')
      await userStore.fetchMembershipInfo()
    } else {
      console.log('已有会员信息，跳过获取')
    }

    // 获取会员状态详情
    await fetchMembershipStatus()

    // 获取会员等级列表（如果尚未加载）
    if (membershipLevels.value.length === 0) {
      await fetchMembershipLevels()
    }

    // 获取用户逗币余额（如果尚未加载）
    if (userCoins.value === 0) {
      await fetchUserCoins()
    }

    // 检查是否需要滚动到充值部分
    if (route.query.section === 'recharge') {
      // 等待DOM更新完成
      await nextTick()
      // 滚动到充值部分
      const rechargeSection = document.querySelector('.upgrade-card')
      if (rechargeSection) {
        rechargeSection.scrollIntoView({ behavior: 'smooth' })
        // 自动点击第一个充值套餐
        selectCoinPackage(10)
        // 高亮立即充值按钮
        const rechargeButton = document.querySelector('.upgrade-action .el-button')
        if (rechargeButton) {
          rechargeButton.classList.add('pulse-animation')
          setTimeout(() => {
            rechargeButton.classList.remove('pulse-animation')
          }, 3000)
        }
      }
    }
  } catch (error) {
    console.error('初始化会员功能测试页面失败:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.features-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 20px;
  color: #333;
}

.section-desc {
  color: #666;
  margin-bottom: 20px;
}

.info-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
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
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 12px;
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

.info-content p {
  margin: 8px 0;
}

.coins-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.coins-info p {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coins-balance {
  font-weight: bold;
  color: #e6a23c;
  font-size: 16px;
  margin-right: 5px;
}

.info-icon {
  color: #909399;
  cursor: help;
}

.admin-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding: 10px;
  background-color: #fef0f0;
  border-radius: 4px;
  border-left: 3px solid #f56c6c;
}

.premium-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
  border-left: 3px solid #67c23a;
}

.membership-status-list {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.membership-status-list ul {
  list-style: none;
  padding-left: 10px;
  margin: 10px 0;
}

.membership-status-list li {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-active {
  color: #67c23a;
  font-weight: bold;
}

.status-inactive {
  color: #909399;
}

.feature-test-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.feature-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  color: #333;
}

.feature-content {
  margin-bottom: 10px;
}

.feature-demo {
  margin-top: 15px;
  margin-bottom: 15px;
}

.demo-content {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  min-height: 100px;
}

.demo-content h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.data-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.data-source-item {
  padding: 10px;
  border-radius: 4px;
  background-color: #f5f7fa;
}

.indicator-preview,
.chart-preview {
  width: 100%;
  height: 200px;
  background-color: #eee;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.indicator-preview img,
.chart-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.export-options {
  display: flex;
  gap: 10px;
}

.upgrade-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.upgrade-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.upgrade-header {
  padding: 15px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upgrade-badge {
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: bold;
}

.upgrade-content {
  padding: 15px;
}

.upgrade-description {
  margin-bottom: 15px;
  color: #666;
}

.upgrade-features {
  padding-left: 20px;
  margin-bottom: 20px;
}

.upgrade-features li {
  margin-bottom: 5px;
}

.upgrade-action {
  text-align: center;
}

/* 逗币兑换相关样式 */
.exchange-section {
  margin-bottom: 30px;
}

.exchange-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.exchange-tag {
  font-size: 12px;
}

.exchange-desc {
  color: #666;
  margin-bottom: 20px;
}

.exchange-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.exchange-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.exchange-header {
  padding: 15px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exchange-rate {
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: bold;
}

.exchange-content {
  padding: 15px;
}

.exchange-form {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.coins-needed {
  font-weight: bold;
  color: #e6a23c;
  font-size: 16px;
}

.divider {
  position: relative;
  text-align: center;
  margin: 30px 0;
  height: 20px;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #dcdfe6;
  z-index: 1;
}

.divider span {
  position: relative;
  z-index: 2;
  padding: 0 20px;
  background-color: #fff;
  color: #909399;
}

.payment-title {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.enterprise-card {
  border: 2px solid #e6a23c;
}

.enterprise-price {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #e6a23c;
  margin: 15px 0;
}

/* 逗币充值套餐样式 */
.coin-packages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.coin-package {
  background-color: #f9f9f9;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.coin-package:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border-color: #e6a23c;
}

.coin-package.selected {
  border-color: #e6a23c;
  background-color: #fdf6ec;
  box-shadow: 0 5px 15px rgba(230, 162, 60, 0.2);
}

.coin-amount {
  font-size: 24px;
  font-weight: bold;
  color: #e6a23c;
  margin-bottom: 10px;
}

.coin-icon {
  font-size: 20px;
}

.coin-price {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.coin-value {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.coin-tag {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: #e6a23c;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* 充值成功提示样式 */
.recharge-success {
  padding: 15px;
  text-align: left;
}

.recharge-success h3 {
  color: #67c23a;
  margin-bottom: 15px;
  text-align: center;
}

.recharge-success p {
  margin: 8px 0;
}

.success-info {
  background-color: #f0f9eb;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #e1f3d8;
}

.success-info p {
  margin: 5px 0;
}

.success-info strong {
  color: #67c23a;
}

.recharge-tip {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 5px;
  border-left: 3px solid #409eff;
}

.recharge-tip p {
  margin: 5px 0;
  font-size: 13px;
  color: #666;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #999;
}

/* 支付对话框样式 */
.payment-dialog {
  text-align: center;
  padding: 10px;
  max-width: 100%;
  box-sizing: border-box;
}

.payment-dialog h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #409eff;
}

.qrcode-container {
  margin: 20px auto;
  width: 200px;
  height: 200px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: visible;
}

.payment-qrcode {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.payment-instructions {
  margin: 15px 0;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  text-align: left;
  word-break: break-all;
}

.payment-note {
  margin: 5px 0;
  font-weight: bold;
  color: #333;
  word-break: break-all;
}

.highlight-info {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 2px 5px;
  border-radius: 3px;
  display: inline-block;
}

.user-info-box {
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
}

.payment-warning {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 10px;
  font-weight: bold;
}

.payment-tip {
  margin-top: 15px;
  color: #e6a23c;
  font-size: 14px;
}

/* 脉冲动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
    transform: scale(1);
  }
}

.pulse-animation {
  animation: pulse 1s infinite;
}

/* 自定义充值套餐样式 */
.custom-package {
  border: 2px dashed #e6a23c;
  background-color: #fdf6ec;
}

.custom-package:hover {
  background-color: #faecd8;
}

/* 确保 Element Plus 对话框内容不会被截断 */
:deep(.el-message-box) {
  max-width: 90vw;
  width: auto !important;
  min-width: 320px;
}

:deep(.el-message-box__content) {
  max-height: 70vh;
  overflow-y: auto;
  word-break: break-word;
}
</style>
