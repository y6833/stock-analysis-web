<template>
  <div class="cache-prewarm-button">
    <button 
      class="prewarm-btn" 
      :class="{ 'loading': isLoading, 'disabled': isLoading }"
      :disabled="isLoading"
      @click="handlePrewarm"
      :title="buttonTitle"
    >
      <span class="btn-icon" v-if="!isLoading">🔥</span>
      <span class="btn-spinner" v-if="isLoading"></span>
      <span class="btn-text" v-if="showText">{{ buttonText }}</span>
    </button>
    
    <div v-if="showProgress && isLoading" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="progress-text">{{ progressText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { stockService } from '@/services/stockService'
import { tushareService } from '@/services/tushareService'
import { useToast } from '@/composables/useToast'

// 组件属性
const props = defineProps({
  count: {
    type: Number,
    default: 20, // 默认预热20只热门股票
  },
  showText: {
    type: Boolean,
    default: true,
  },
  showProgress: {
    type: Boolean,
    default: true,
  },
  forceApi: {
    type: Boolean,
    default: true,
  }
})

// 组件事件
const emit = defineEmits(['prewarm-start', 'prewarm-progress', 'prewarm-success', 'prewarm-error'])

// 状态变量
const { showToast } = useToast()
const isLoading = ref(false)
const progress = ref(0)
const processedCount = ref(0)
const totalCount = ref(0)

// 计算属性
const buttonText = computed(() => {
  if (isLoading.value) return '预热中...'
  return '预热缓存'
})

const buttonTitle = computed(() => {
  if (isLoading.value) return '正在预热缓存，请稍候'
  return '预先缓存热门股票数据，提高访问速度'
})

const progressText = computed(() => {
  if (!isLoading.value) return ''
  return `正在预热 ${processedCount.value}/${totalCount.value} (${progress.value}%)`
})

// 方法
const handlePrewarm = async () => {
  if (isLoading.value) return

  isLoading.value = true
  progress.value = 0
  processedCount.value = 0
  
  emit('prewarm-start')

  // 允许API调用
  if (props.forceApi) {
    tushareService.setAllowApiCall(true)
    console.log('预热缓存按钮点击，已允许API调用')
  }

  try {
    // 获取热门股票列表
    const stocks = await stockService.getStocks()
    
    if (!stocks || stocks.length === 0) {
      throw new Error('获取股票列表失败')
    }
    
    // 取前N只股票进行预热
    const stocksToPrewarm = stocks.slice(0, props.count)
    totalCount.value = stocksToPrewarm.length
    
    // 预热进度
    let successCount = 0
    let errorCount = 0
    
    // 逐个预热股票数据
    for (let i = 0; i < stocksToPrewarm.length; i++) {
      const stock = stocksToPrewarm[i]
      
      try {
        // 更新进度
        processedCount.value = i + 1
        progress.value = Math.round((processedCount.value / totalCount.value) * 100)
        
        // 发出进度事件
        emit('prewarm-progress', {
          current: processedCount.value,
          total: totalCount.value,
          progress: progress.value,
          stock
        })
        
        // 获取股票数据（强制刷新）
        await stockService.getStockData(stock.symbol, 30, true)
        
        // 预热成功
        successCount++
        
        // 添加延迟，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (stockError) {
        console.error(`预热股票 ${stock.symbol} 数据失败:`, stockError)
        errorCount++
      }
    }
    
    // 预热完成
    const message = `缓存预热完成，成功: ${successCount}，失败: ${errorCount}`
    showToast(message, errorCount > 0 ? 'warning' : 'success')
    
    emit('prewarm-success', {
      successCount,
      errorCount,
      totalCount: totalCount.value
    })
  } catch (error: any) {
    console.error('预热缓存失败:', error)
    showToast(error.message || '预热缓存失败', 'error')
    
    emit('prewarm-error', error)
  } finally {
    isLoading.value = false
    
    // 预热完成后，如果不是在API测试页面或数据源切换页面，则禁止API调用
    if (props.forceApi && 
        !window.location.pathname.includes('/tushare-test') && 
        !window.location.pathname.includes('/api-test') && 
        !window.location.pathname.includes('/data-source')) {
      tushareService.setAllowApiCall(false)
      console.log('预热缓存完成，已恢复API调用限制')
    }
  }
}

// 生命周期钩子
onMounted(() => {
  // 初始化
})
</script>

<style scoped>
.cache-prewarm-button {
  display: inline-block;
}

.prewarm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--warning-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.prewarm-btn:hover {
  background-color: var(--warning-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.prewarm-btn.loading,
.prewarm-btn.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.2em;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-container {
  margin-top: var(--spacing-sm);
  width: 100%;
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--warning-color);
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  text-align: center;
}
</style>
