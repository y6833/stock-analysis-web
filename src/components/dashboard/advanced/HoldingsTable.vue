<template>
  <div class="holdings-table">
    <div class="table-header">
      <h3 class="table-title">持仓明细</h3>
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
        <el-empty description="暂无持仓数据" />
      </div>

      <div v-else class="table-container">
        <el-table :data="data" style="width: 100%" v-loading="loading">
          <el-table-column prop="symbol" label="代码" width="100" />
          <el-table-column prop="name" label="名称" width="150" />
          <el-table-column prop="quantity" label="持仓数量" width="120" />
          <el-table-column prop="avgPrice" label="平均成本" width="120">
            <template #default="scope">
              ¥{{ scope.row.avgPrice }}
            </template>
          </el-table-column>
          <el-table-column prop="currentPrice" label="当前价格" width="120">
            <template #default="scope">
              <span :class="scope.row.currentPrice >= scope.row.avgPrice ? 'up' : 'down'">
                ¥{{ scope.row.currentPrice }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="marketValue" label="市值" width="120">
            <template #default="scope">
              ¥{{ formatNumber(scope.row.marketValue) }}
            </template>
          </el-table-column>
          <el-table-column prop="profitLoss" label="盈亏" width="120">
            <template #default="scope">
              <span :class="scope.row.profitLoss >= 0 ? 'up' : 'down'">
                {{ scope.row.profitLoss >= 0 ? '+' : '' }}¥{{ formatNumber(scope.row.profitLoss) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="profitLossPercent" label="盈亏比例" width="120">
            <template #default="scope">
              <span :class="scope.row.profitLossPercent >= 0 ? 'up' : 'down'">
                {{ scope.row.profitLossPercent >= 0 ? '+' : '' }}{{ scope.row.profitLossPercent }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" @click="handleView(scope.row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Holding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  profitLoss: number
  profitLossPercent: number
}

interface Props {
  data?: Holding[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  refresh: []
  view: [holding: Holding]
}>()

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
function handleView(holding: Holding) {
  emit('view', holding)
}
</script>

<style scoped>
.holdings-table {
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

.up {
  color: var(--el-color-success);
}

.down {
  color: var(--el-color-danger);
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
