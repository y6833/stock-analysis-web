<template>
  <div class="doji-pattern-feature-tour">
    <el-dialog
      v-model="tourVisible"
      :title="currentStep.title"
      width="60%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="tour-content">
        <div class="step-image">
          <img :src="currentStep.image" :alt="currentStep.title" class="placeholder-image" />
        </div>
        <div class="step-description">
          <p>{{ currentStep.description }}</p>
        </div>
      </div>
      <template #footer>
        <div class="tour-footer">
          <div class="step-indicators">
            <div
              v-for="(_, index) in tourSteps"
              :key="index"
              class="step-indicator"
              :class="{ active: currentStepIndex === index }"
              @click="goToStep(index)"
            ></div>
          </div>
          <div class="tour-actions">
            <el-button @click="skipTour">跳过</el-button>
            <el-button v-if="currentStepIndex > 0" @click="prevStep">上一步</el-button>
            <el-button
              type="primary"
              v-if="currentStepIndex < tourSteps.length - 1"
              @click="nextStep"
            >
              下一步
            </el-button>
            <el-button type="success" v-else @click="finishTour">开始使用</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'finish'])
const router = useRouter()

// 导览步骤
const tourSteps = [
  {
    title: '欢迎使用十字星形态分析功能',
    description:
      '十字星形态分析功能可以帮助您识别股票图表中的十字星形态，并筛选出现十字星后上涨的股票，把握潜在的交易机会。',
    image: '@/image/tour/doji-welcome.png',
  },
  {
    title: '十字星筛选工具',
    description: '使用十字星筛选工具，您可以设置筛选条件，快速找到最近出现十字星形态后上涨的股票。',
    image: '@/image/tour/doji-screener.png',
  },
  {
    title: '十字星设置',
    description: '在设置页面，您可以调整十字星识别的敏感度参数，自定义不同类型十字星的识别标准。',
    image: '@/image/tour/doji-settings.png',
  },
  {
    title: '十字星提醒',
    description:
      '创建基于十字星形态的条件提醒，当您关注的股票出现指定类型的十字星形态时，系统将自动通知您。',
    image: '@/image/tour/doji-alerts.png',
  },
  {
    title: '开始使用',
    description: '现在您已经了解了十字星形态分析功能的基本使用方法，点击"开始使用"按钮开始探索吧！',
    image: '@/image/tour/doji-start.png',
  },
]

// 当前步骤索引
const currentStepIndex = ref(0)

// 导览是否可见
const tourVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  },
})

// 当前步骤
const currentStep = computed(() => tourSteps[currentStepIndex.value])

// 下一步
const nextStep = () => {
  if (currentStepIndex.value < tourSteps.length - 1) {
    currentStepIndex.value++
  }
}

// 上一步
const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

// 跳转到指定步骤
const goToStep = (index: number) => {
  currentStepIndex.value = index
}

// 跳过导览
const skipTour = () => {
  localStorage.setItem('dojiPatternTourCompleted', 'true')
  tourVisible.value = false
  emit('close')
}

// 完成导览
const finishTour = () => {
  localStorage.setItem('dojiPatternTourCompleted', 'true')
  tourVisible.value = false
  emit('finish')
  router.push('/doji-pattern/screener')
}

// 组件挂载时检查是否已完成导览
onMounted(() => {
  const tourCompleted = localStorage.getItem('dojiPatternTourCompleted')
  if (tourCompleted) {
    currentStepIndex.value = 0
  }
})
</script>

<style scoped>
.tour-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-image {
  text-align: center;
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.placeholder-image {
  max-width: 100%;
  height: 250px;
  object-fit: contain;
  opacity: 0.8;
}

.step-description {
  font-size: 16px;
  line-height: 1.6;
}

.tour-footer {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.step-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.step-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--border-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.step-indicator.active {
  background-color: var(--primary-color);
  transform: scale(1.2);
}

.tour-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (min-width: 768px) {
  .tour-content {
    flex-direction: row;
  }

  .step-image {
    flex: 1;
  }

  .step-description {
    flex: 1;
    display: flex;
    align-items: center;
  }
}
</style>
