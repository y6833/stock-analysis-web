<template>
  <div class="membership-feature" :class="{ 'is-restricted': !hasAccess }">
    <!-- 正常内容 -->
    <div v-if="hasAccess" class="feature-content">
      <slot></slot>
    </div>

    <!-- 受限内容 -->
    <div v-else class="feature-restricted" :class="restrictionClass">
      <div v-if="mode === 'blur'" class="blurred-content">
        <slot></slot>
      </div>
      <div v-else-if="mode === 'placeholder'" class="placeholder-content">
        <slot name="placeholder">
          <div class="default-placeholder">
            <el-icon><Lock /></el-icon>
          </div>
        </slot>
      </div>

      <!-- 升级提示 -->
      <div class="upgrade-overlay" @click="handleUpgradeClick">
        <div class="upgrade-message">
          {{ message || '此功能需要会员权限' }}
        </div>
        <el-button type="primary" size="small" class="upgrade-button"> 充值逗币 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'

const props = defineProps({
  // 功能名称
  feature: {
    type: String,
    required: true,
  },
  // 附加参数
  params: {
    type: Object,
    default: () => ({}),
  },
  // 限制模式: blur(模糊显示), placeholder(占位符)
  mode: {
    type: String,
    default: 'blur',
    validator: (value: string) => ['blur', 'placeholder'].includes(value),
  },
  // 提示信息
  message: {
    type: String,
    default: '',
  },
  // 是否自动检查权限
  autoCheck: {
    type: Boolean,
    default: true,
  },
})

const userStore = useUserStore()
const router = useRouter()
const hasAccess = ref(false)

// 计算样式类
const restrictionClass = computed(() => ({
  [`mode-${props.mode}`]: true,
}))

// 检查访问权限
async function checkAccess() {
  hasAccess.value = await userStore.checkFeatureAccess(props.feature, props.params)
}

// 处理升级点击
function handleUpgradeClick() {
  ElMessageBox.confirm('充值逗币可以兑换会员权限，解锁更多功能，是否前往会员中心？', '充值逗币', {
    confirmButtonText: '前往会员中心',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => {
      router.push('/membership-features')
    })
    .catch(() => {
      // 用户取消操作
    })
}

// 监听参数变化
watch(
  () => props.params,
  () => {
    if (props.autoCheck) {
      checkAccess()
    }
  },
  { deep: true }
)

// 组件挂载时检查权限
onMounted(() => {
  if (props.autoCheck) {
    checkAccess()
  }
})

// 暴露方法
defineExpose({
  checkAccess,
})
</script>

<style scoped>
.membership-feature {
  position: relative;
  width: 100%;
  height: 100%;
}

.feature-restricted {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.blurred-content {
  filter: blur(5px);
  opacity: 0.7;
  pointer-events: none;
}

.placeholder-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 100px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.default-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 24px;
}

.upgrade-overlay {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-restricted:hover .upgrade-overlay {
  opacity: 1;
}

.upgrade-message {
  margin-bottom: 10px;
  color: #fff;
  font-weight: bold;
  text-align: center;
}

.upgrade-button {
  z-index: 10;
}
</style>
