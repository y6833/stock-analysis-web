<template>
  <div class="transactions-table">
    <div class="table-header">
      <h3 class="table-title">交易记录</h3>
      <div class="table-actions">
        <el-button size="small" @click="$emit('refresh')" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <div class="table-content">
      <div v-if="loading" class="loading-placeholder">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="!data || data.length === 0" class="empty-state">
        <el-empty description="暂无交易记录" />
      </div>

      <div v-else class="table-container">
        <el-table :data="data" style="width: 100%" v-loading="loading">
          <el-table-column prop="date" label="交易日期" width="120">
            <template #default="scope">
              {{ formatDate(scope.row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="symbol" label="代码" width="100" />
          <el-table-column prop="name" label="名称" width="150" />
          <el-table-column prop="type" label="交易类型" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'buy' ? 'success' : 'danger'" size="small">
                {{ scope.row.type === 'buy' ? '买入' : '卖出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="price" label="价格" width="100">
            <template #default="scope">
              ¥{{ scope.row.price }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="scope">
              ¥{{ formatNumber(scope.row.amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="commission" label="手续费" width="100">
            <template #default="scope">
              ¥{{ scope.row.commission }}
            </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="总金额" width="120">
            <template #default="scope">
              ¥{{ formatNumber(scope.row.totalAmount) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" @click="handleView(scope.row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Transaction {
  id: string
  date: string
  symbol: string
  name: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  commission: number
  totalAmount: number
}

interface Props {
  data?: Transaction[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  refresh: []
  view: [transaction: Transaction]
}>()

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 格式化数字
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '--'
  }

  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 查看详情
function handleView(transaction: Transaction) {
  emit('view', transaction)
}
</script>

<style scoped>
.transactions-table {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.table-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.loading-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-container {
  flex: 1;
  overflow: hidden;
}

:deep(.el-table) {
  background: transparent;
}

:deep(.el-table th) {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

:deep(.el-table td) {
  color: var(--el-text-color-primary);
}

:deep(.el-table--border) {
  border-color: var(--el-border-color-light);
}

:deep(.el-table--border th) {
  border-color: var(--el-border-color-light);
}

:deep(.el-table--border td) {
  border-color: var(--el-border-color-lighter);
}
</style>
