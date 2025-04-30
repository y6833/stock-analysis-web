<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElSelect,
  ElOption,
  ElMessage,
} from 'element-plus'
import { stockService } from '@/services/stockService'
import { dashboardService } from '@/services/dashboardService'
import type { Stock } from '@/types/stock'
import type { Watchlist } from '@/types/dashboard'

const props = defineProps<{
  visible: boolean
  activeWatchlistId: string
  watchlists: Watchlist[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added', success: boolean): void
  (e: 'update:visible', value: boolean): void
}>()

// 本地对话框可见状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

// 表单数据
const form = ref({
  stockCode: '',
  stockName: '',
  notes: '',
  watchlistId: '',
})

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<Stock[]>([])
const isSearching = ref(false)
const selectedStock = ref<Stock | null>(null)

// 表单验证规则
const rules = {
  stockCode: [{ required: true, message: '请输入或选择股票代码', trigger: 'blur' }],
  stockName: [{ required: true, message: '请输入股票名称', trigger: 'blur' }],
  watchlistId: [{ required: true, message: '请选择关注列表', trigger: 'change' }],
}

// 表单引用
const formRef = ref()

// 初始化表单
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 重置表单
      form.value = {
        stockCode: '',
        stockName: '',
        notes: '',
        watchlistId: props.activeWatchlistId,
      }
      selectedStock.value = null
      searchQuery.value = ''
      searchResults.value = []
    }
  }
)

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  try {
    // 使用股票服务搜索股票
    const results = await stockService.searchStocks(searchQuery.value.trim())
    searchResults.value = results.slice(0, 10) // 限制结果数量
  } catch (error) {
    console.error('搜索股票失败:', error)
    ElMessage.error('搜索股票失败，请稍后再试')
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 选择股票
const selectStock = (stock: Stock) => {
  selectedStock.value = stock
  form.value.stockCode = stock.symbol
  form.value.stockName = stock.name
  searchQuery.value = `${stock.name} (${stock.symbol})`
  searchResults.value = []
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        // 调用服务添加股票到关注列表
        const success = await dashboardService.addStockToWatchlist(form.value.watchlistId, {
          symbol: form.value.stockCode,
          name: form.value.stockName,
        })

        if (success) {
          ElMessage.success(`已将 ${form.value.stockName}(${form.value.stockCode}) 添加到关注列表`)
          emit('added', true)
          emit('close')
        } else {
          ElMessage.error('添加股票失败')
          emit('added', false)
        }
      } catch (error) {
        console.error('添加股票失败:', error)
        ElMessage.error(`添加股票失败: ${error instanceof Error ? error.message : String(error)}`)
        emit('added', false)
      }
    } else {
      ElMessage.warning('请完善表单信息')
      return false
    }
  })
}

// 关闭对话框
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    title="添加股票到关注列表"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px" label-position="top">
      <!-- 股票搜索 -->
      <ElFormItem label="股票搜索" prop="stockCode">
        <div class="search-container">
          <ElInput
            v-model="searchQuery"
            placeholder="输入股票代码或名称搜索"
            clearable
            @input="searchStocks"
            @clear="searchResults = []"
          >
            <template #suffix>
              <div v-if="isSearching" class="search-loading"></div>
              <i v-else class="el-icon-search"></i>
            </template>
          </ElInput>

          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="stock in searchResults"
              :key="stock.symbol"
              class="search-result-item"
              @click="selectStock(stock)"
            >
              <div class="stock-info">
                <div class="stock-name">{{ stock.name }}</div>
                <div class="stock-symbol">{{ stock.symbol }}</div>
              </div>
            </div>
          </div>
        </div>
      </ElFormItem>

      <!-- 股票代码 -->
      <ElFormItem label="股票代码" prop="stockCode">
        <ElInput v-model="form.stockCode" placeholder="请输入股票代码" />
      </ElFormItem>

      <!-- 股票名称 -->
      <ElFormItem label="股票名称" prop="stockName">
        <ElInput v-model="form.stockName" placeholder="请输入股票名称" />
      </ElFormItem>

      <!-- 备注 -->
      <ElFormItem label="备注" prop="notes">
        <ElInput v-model="form.notes" type="textarea" placeholder="可选：添加备注信息" :rows="3" />
      </ElFormItem>

      <!-- 关注列表选择 -->
      <ElFormItem label="添加到关注列表" prop="watchlistId">
        <ElSelect v-model="form.watchlistId" placeholder="请选择关注列表" style="width: 100%">
          <ElOption
            v-for="watchlist in watchlists"
            :key="watchlist.id"
            :label="watchlist.name"
            :value="watchlist.id"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleClose">取消</ElButton>
        <ElButton type="primary" @click="submitForm" :loading="isSearching">确认添加</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
}

.search-loading {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(66, 185, 131, 0.1);
  border-radius: 50%;
  border-top: 2px solid var(--accent-color);
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: var(--bg-tertiary);
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stock-name {
  font-weight: 500;
}

.stock-symbol {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>
