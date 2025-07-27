<template>
  <div class="market-hotspots-table">
    <div class="table-header">
      <h3 class="table-title">市场热点</h3>
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
        <el-empty description="暂无市场热点数据" />
      </div>

      <div v-else class="table-container">
        <el-table :data="data" style="width: 100%" v-loading="loading">
          <el-table-column prop="rank" label="排名" width="80" />
          <el-table-column prop="symbol" label="代码" width="100" />
          <el-table-column prop="name" label="名称" width="150" />
          <el-table-column prop="currentPrice" label="现价" width="100">
            <template #default="scope">
              <span :class="scope.row.change >= 0 ? 'up' : 'down'">
                ¥{{ scope.row.currentPrice }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="change" label="涨跌" width="100">
            <template #default="scope">
              <span :class="scope.row.change >= 0 ? 'up' : 'down'">
                {{ scope.row.change >= 0 ? '+' : '' }}{{ scope.row.change }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="changePercent" label="涨跌幅" width="100">
            <template #default="scope">
              <span :class="scope.row.changePercent >= 0 ? 'up' : 'down'">
                {{ scope.row.changePercent >= 0 ? '+' : '' }}{{ scope.row.changePercent }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="volume" label="成交量" width="120">
            <template #default="scope">
              {{ formatVolume(scope.row.volume) }}
            </template>
          </el-table-column>
          <el-table-column prop="turnover" label="成交额" width="120">
            <template #default="scope">
              {{ formatVolume(scope.row.turnover) }}
            </template>
          </el-table-column>
          <el-table-column prop="hotspotType" label="热点类型" width="120">
            <template #default="scope">
              <el-tag :type="getHotspotTypeColor(scope.row.hotspotType)" size="small">
                {{ getHotspotTypeText(scope.row.hotspotType) }}
              </el-tag>
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
interface Hotspot {
  rank: number
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  volume: number | null | undefined
  turnover: number | null | undefined
  hotspotType: 'concept' | 'industry' | 'news' | 'technical'
}

interface Props {
  data?: Hotspot[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  refresh: []
  view: [hotspot: Hotspot]
}>()

// 格式化成交量
function formatVolume(volume: number | undefined | null): string {
  if (volume === undefined || volume === null || isNaN(volume)) {
    return '--'
  }

  if (volume >= 1000000000) {
    return (volume / 1000000000).toFixed(2) + 'B'
  } else if (volume >= 1000000) {
    return (volume / 1000000).toFixed(2) + 'M'
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(2) + 'K'
  }
  return volume.toString()
}

// 获取热点类型颜色
function getHotspotTypeColor(type: string): string {
  switch (type) {
    case 'concept':
      return 'success'
    case 'industry':
      return 'primary'
    case 'news':
      return 'warning'
    case 'technical':
      return 'info'
    default:
      return 'default'
  }
}

// 获取热点类型文本
function getHotspotTypeText(type: string): string {
  switch (type) {
    case 'concept':
      return '概念'
    case 'industry':
      return '行业'
    case 'news':
      return '新闻'
    case 'technical':
      return '技术'
    default:
      return '其他'
  }
}

// 查看详情
function handleView(hotspot: Hotspot) {
  emit('view', hotspot)
}
</script>

<style scoped>
.market-hotspots-table {
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
