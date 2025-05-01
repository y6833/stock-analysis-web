<template>
  <div class="membership-upgrade-prompt" v-if="show">
    <div class="upgrade-content">
      <div class="upgrade-icon">
        <el-icon><Star /></el-icon>
      </div>
      <div class="upgrade-message">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
      </div>

      <!-- 支付选项 -->
      <div v-if="showPayment" class="payment-section">
        <h4>请扫码支付</h4>
        <div class="qrcode-container">
          <img src="/src/image/sponsor/wxCode.jpg" alt="微信支付二维码" class="payment-qrcode" />
        </div>
        <div class="payment-instructions">
          <p class="payment-note">扫描上方二维码完成支付</p>
          <div class="payment-important">
            <el-alert title="重要提示" type="warning" :closable="false" show-icon>
              <p>请在支付时<strong>务必备注</strong>以下信息：</p>
              <ol>
                <li>
                  您的账号ID: <strong>{{ userId }}</strong>
                </li>
                <li>
                  您的邮箱用户名: <strong>{{ userEmail }}</strong>
                </li>
              </ol>
              <p>否则将无法识别您的支付，影响会员升级！</p>
            </el-alert>
          </div>
        </div>
      </div>

      <div class="upgrade-actions">
        <template v-if="!showPayment">
          <el-button type="primary" @click="handleShowPayment">充值逗币</el-button>
          <el-button @click="handleClose">关闭</el-button>
        </template>
        <template v-else>
          <el-button type="success" @click="handlePaymentComplete">支付完成</el-button>
          <el-button @click="handlePaymentCancel">取消支付</el-button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { Star } from '@element-plus/icons-vue'
import { MembershipLevel, MEMBERSHIP_LEVEL_NAMES } from '@/constants/membership'

const props = defineProps({
  // 是否显示
  show: {
    type: Boolean,
    default: false,
  },
  // 标题
  title: {
    type: String,
    default: '需要会员权限',
  },
  // 提示信息
  message: {
    type: String,
    default: '此功能需要会员权限才能使用，请充值逗币兑换会员',
  },
  // 所需会员等级
  requiredLevel: {
    type: String,
    default: MembershipLevel.BASIC,
  },
  // 目标路径
  targetPath: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'upgrade', 'payment-complete'])

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 状态
const showPayment = ref(false)

// 获取用户信息
const userId = computed(() => userStore.userId || '未登录')
const userEmail = computed(() => userStore.username || '未登录')

// 计算所需会员等级名称
const requiredLevelName = computed(() => {
  return MEMBERSHIP_LEVEL_NAMES[props.requiredLevel as MembershipLevel] || '高级会员'
})

// 显示支付选项
const handleShowPayment = () => {
  showPayment.value = true
  emit('upgrade')
}

// 处理支付完成
const handlePaymentComplete = () => {
  emit('payment-complete')

  // 导航到会员功能页面
  router.push({
    path: '/membership-features',
    query: {
      redirect: props.targetPath || route.fullPath,
      requiredLevel: props.requiredLevel,
      paymentStatus: 'success',
    },
  })
}

// 处理支付取消
const handlePaymentCancel = () => {
  showPayment.value = false
}

// 处理关闭
const handleClose = () => {
  emit('close')
}

// 组件挂载时检查路由参数
onMounted(() => {
  // 如果路由中有所需会员等级参数，自动显示提示
  if (route.query.requiredLevel) {
    // 这里可以添加自动显示逻辑
  }
})
</script>

<style scoped>
.membership-upgrade-prompt {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.upgrade-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 24px;
  max-width: 500px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.upgrade-icon {
  font-size: 48px;
  color: var(--el-color-warning);
  margin-bottom: 16px;
}

.upgrade-message h3 {
  font-size: 20px;
  margin-bottom: 12px;
  color: var(--el-color-primary);
}

.upgrade-message p {
  font-size: 16px;
  margin-bottom: 24px;
  color: var(--el-text-color-regular);
}

.payment-section {
  margin: 16px 0;
  padding: 16px;
  background-color: #f8f8f8;
  border-radius: 8px;
  text-align: center;
}

.payment-section h4 {
  font-size: 18px;
  margin-bottom: 16px;
  color: var(--el-color-primary);
  font-weight: bold;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.payment-qrcode {
  width: 200px;
  height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.payment-instructions {
  margin-top: 16px;
}

.payment-note {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.payment-important {
  margin-top: 16px;
  text-align: left;
}

.payment-important p {
  margin: 8px 0;
}

.payment-important ol {
  margin: 8px 0;
  padding-left: 20px;
}

.payment-important li {
  margin-bottom: 8px;
}

.payment-important strong {
  color: var(--el-color-danger);
}

.upgrade-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
