<template>
  <div class="doji-alert-history-list">
    <div class="alert-history-header">
      <h3>{{ title || '十字星形态提醒历史' }}</h3>
      <div class="alert-history-actions">
        <el-button
          v-if="selectedHistoryIds.length > 0"
          type="primary"
          size="small"
          @click="handleBulkAcknowledge"
        >
          批量确认 ({{ selectedHistoryIds.length }})
        </el-button>
        <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadAlertHistory">
          刷新
        </el-button>
      </div>
    </div>

    <div class="alert-history-filters">
      <el-form :inline="true" size="small">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item label="股票代码" v-if="showStockFilter">
          <el-input
            v-model="filters.stockCode"
            placeholder="输入股票代码"
            clearable
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item label="形态类型">
          <el-select
            v-model="filters.patternType"
            placeholder="选择形态类型"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="标准十字星" value="standard" />
            <el-option label="墓碑十字星" value="gravestone" />
            <el-option label="蜻蜓十字星" value="dragonfly" />
            <el-option label="长腿十字星" value="longLegged" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.acknowledged"
            placeholder="选择状态"
            clearable
            @change="handleFilterChange"
          >
            <el-option label="未确认" :value="false" />
            <el-option label="已确认" :value="true" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table
      v-loading="loading"
      :data="historyList"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="触发时间" prop="triggeredAt" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.triggeredAt) }}
        </template>
      </el-table-column>
      <el-table-column label="股票" width="150" v-if="showStockColumn">
        <template #default="{ row }">
          <div>{{ row.alert?.stockCode }}</div>
          <div class="stock-name">{{ row.alert?.stockName }}</div>
        </template>
      </el-table-column>
      <el-table-column label="形态类型" prop="patternType" width="120">
        <template #default="{ row }">
          {{ formatPatternType(row.alert?.patternType) }}
        </template>
      </el-table-column>
      <el-table-column label="提醒条件" prop="condition">
        <template #default="{ row }">
          {{ formatAlertCondition(row.alert?.condition) }}
        </template>
      </el-table-column>
      <el-table-column label="优先级" prop="priority" width="100">
        <template #default="{ row }">
          <el-tag :type="getPriorityTagType(row.alert?.priority)" size="small">
            {{ formatPriority(row.alert?.priority) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.acknowledged ? 'success' : 'warning'" size="small">
            {{ row.acknowledged ? '已确认' : '未确认' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button
            v-if="!row.acknowledged"
            type="text"
            size="small"
            @click="handleAcknowledge(row)"
          >
            确认
          </el-button>
          <el-button type="text" size="small" @click="handleViewDetails(row)"> 详情 </el-button>
          <el-button type="text" size="small" @click="handleDelete(row)"> 删除 </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="alert-history-pagination">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog title="十字星形态提醒详情" :visible.sync="detailsDialogVisible" width="700px">
      <div v-if="selectedHistory">
        <div class="history-detail-header">
          <div class="stock-info">
            <h3>{{ selectedHistory.alert?.stockCode }} {{ selectedHistory.alert?.stockName }}</h3>
            <div class="pattern-info">
              <el-tag>{{ formatPatternType(selectedHistory.alert?.patternType) }}</el-tag>
              <span class="trigger-time"
                >触发时间: {{ formatDateTime(selectedHistory.triggeredAt) }}</span
              >
            </div>
          </div>
        </div>

        <el-divider />

        <div class="pattern-details">
          <h4>形态详情</h4>
          <div v-if="selectedHistory.patternDetails">
            <div class="pattern-data">
              <div class="data-item">
                <span class="label">开盘价:</span>
                <span class="value">{{ selectedHistory.patternDetails.candle?.open }}</span>
              </div>
              <div class="data-item">
                <span class="label">最高价:</span>
                <span class="value">{{ selectedHistory.patternDetails.candle?.high }}</span>
              </div>
              <div class="data-item">
                <span class="label">最低价:</span>
                <span class="value">{{ selectedHistory.patternDetails.candle?.low }}</span>
              </div>
              <div class="data-item">
                <span class="label">收盘价:</span>
                <span class="value">{{ selectedHistory.patternDetails.candle?.close }}</span>
              </div>
              <div class="data-item">
                <span class="label">成交量:</span>
                <span class="value">{{ selectedHistory.patternDetails.candle?.volume }}</span>
              </div>
              <div class="data-item">
                <span class="label">显著性:</span>
                <span class="value"
                  >{{ (selectedHistory.patternDetails.significance * 100).toFixed(2) }}%</span
                >
              </div>
            </div>

            <div class="context-info" v-if="selectedHistory.patternDetails.context">
              <h5>市场环境</h5>
              <div class="data-item">
                <span class="label">趋势:</span>
                <span class="value">{{
                  formatTrend(selectedHistory.patternDetails.context.trend)
                }}</span>
              </div>
              <div class="data-item">
                <span class="label">支撑/阻力位:</span>
                <span class="value">{{
                  selectedHistory.patternDetails.context.nearSupportResistance ? '是' : '否'
                }}</span>
              </div>
              <div class="data-item">
                <span class="label">成交量变化:</span>
                <span class="value"
                  >{{ selectedHistory.patternDetails.context.volumeChange.toFixed(2) }}%</span
                >
              </div>
            </div>
          </div>
          <div v-else>无形态详情数据</div>
        </div>

        <div class="alert-info">
          <h4>提醒信息</h4>
          <div class="data-item">
            <span class="label">提醒条件:</span>
            <span class="value">{{ formatAlertCondition(selectedHistory.alert?.condition) }}</span>
          </div>
          <div class="data-item">
            <span class="label">优先级:</span>
            <span class="value">
              <el-tag :type="getPriorityTagType(selectedHistory.alert?.priority)">
                {{ formatPriority(selectedHistory.alert?.priority) }}
              </el-tag>
            </span>
          </div>
          <div class="data-item" v-if="selectedHistory.alert?.message">
            <span class="label">消息:</span>
            <span class="value">{{ selectedHistory.alert?.message }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <el-button
            v-if="!selectedHistory.acknowledged"
            type="primary"
            @click="handleAcknowledgeInDialog"
          >
            确认此提醒
          </el-button>
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 确认删除对话框 -->
    <el-dialog title="确认删除" :visible.sync="deleteDialogVisible" width="400px">
      <p>确定要删除此提醒历史记录吗？此操作不可恢复。</p>
      <div slot="footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dojiPatternAlertHistoryService from '@/services/DojiPatternAlertHistoryService'
import type { DojiPatternAlertHistory, AlertHistoryQueryParams } from '@/types/alerts'
import type { DojiAlertCondition, DojiAlertPriority } from '@/services/DojiPatternAlertService'
import type { DojiPatternType } from '@/services/alertService'

export default defineComponent({
  name: 'DojiPatternAlertHistoryList',
  props: {
    title: {
      type: String,
      default: '',
    },
    alertId: {
      type: Number,
      default: null,
    },
    stockCode: {
      type: String,
      default: '',
    },
    showStockFilter: {
      type: Boolean,
      default: true,
    },
    showStockColumn: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const loading = ref(false)
    const historyList = ref<DojiPatternAlertHistory[]>([])
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(10)
    const selectedHistoryIds = ref<number[]>([])
    const detailsDialogVisible = ref(false)
    const deleteDialogVisible = ref(false)
    const selectedHistory = ref<DojiPatternAlertHistory | null>(null)
    const historyToDelete = ref<DojiPatternAlertHistory | null>(null)
    const dateRange = ref<[string, string] | null>(null)

    const filters = reactive<AlertHistoryQueryParams>({
      page: 1,
      pageSize: 10,
      stockCode: props.stockCode || undefined,
      patternType: undefined,
      acknowledged: undefined,
      sortBy: 'triggeredAt',
      sortDirection: 'desc',
    })

    // 加载提醒历史
    const loadAlertHistory = async () => {
      loading.value = true
      try {
        let result

        if (props.alertId) {
          // 加载特定提醒的历史
          result = await dojiPatternAlertHistoryService.getAlertHistoryByAlertId(props.alertId, {
            ...filters,
            page: currentPage.value,
            pageSize: pageSize.value,
          })
        } else if (props.stockCode) {
          // 加载特定股票的历史
          result = await dojiPatternAlertHistoryService.getAlertHistoryByStock(props.stockCode, {
            ...filters,
            page: currentPage.value,
            pageSize: pageSize.value,
          })
        } else {
          // 加载所有历史
          result = await dojiPatternAlertHistoryService.getAlertHistory({
            ...filters,
            page: currentPage.value,
            pageSize: pageSize.value,
          })
        }

        historyList.value = result.history
        total.value = result.total
      } catch (error) {
        console.error('加载提醒历史失败:', error)
        ElMessage.error('加载提醒历史失败')
      } finally {
        loading.value = false
      }
    }

    // 格式化日期时间
    const formatDateTime = (dateString?: string) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date)
    }

    // 格式化形态类型
    const formatPatternType = (type?: DojiPatternType) => {
      if (!type) return '-'
      const typeMap: Record<DojiPatternType, string> = {
        standard: '标准十字星',
        gravestone: '墓碑十字星',
        dragonfly: '蜻蜓十字星',
        longLegged: '长腿十字星',
      }
      return typeMap[type] || type
    }

    // 格式化提醒条件
    const formatAlertCondition = (condition?: DojiAlertCondition) => {
      if (!condition) return '-'
      const conditionMap: Record<DojiAlertCondition, string> = {
        pattern_appears: '形态出现',
        pattern_with_volume: '形态伴随成交量变化',
        pattern_near_support: '形态接近支撑位',
        pattern_near_resistance: '形态接近阻力位',
      }
      return conditionMap[condition] || condition
    }

    // 格式化优先级
    const formatPriority = (priority?: DojiAlertPriority) => {
      if (!priority) return '-'
      const priorityMap: Record<DojiAlertPriority, string> = {
        high: '高',
        medium: '中',
        low: '低',
      }
      return priorityMap[priority] || priority
    }

    // 获取优先级标签类型
    const getPriorityTagType = (priority?: DojiAlertPriority) => {
      if (!priority) return ''
      const typeMap: Record<DojiAlertPriority, string> = {
        high: 'danger',
        medium: 'warning',
        low: 'info',
      }
      return typeMap[priority] || ''
    }

    // 格式化趋势
    const formatTrend = (trend?: string) => {
      if (!trend) return '-'
      const trendMap: Record<string, string> = {
        uptrend: '上升趋势',
        downtrend: '下降趋势',
        sideways: '横盘整理',
      }
      return trendMap[trend] || trend
    }

    // 处理选择变化
    const handleSelectionChange = (selection: DojiPatternAlertHistory[]) => {
      selectedHistoryIds.value = selection.map((item) => item.id)
    }

    // 处理确认
    const handleAcknowledge = async (history: DojiPatternAlertHistory) => {
      try {
        await dojiPatternAlertHistoryService.acknowledgeAlertHistory(history.id)
        ElMessage.success('提醒已确认')
        loadAlertHistory()
      } catch (error) {
        console.error('确认提醒失败:', error)
        ElMessage.error('确认提醒失败')
      }
    }

    // 处理批量确认
    const handleBulkAcknowledge = async () => {
      if (selectedHistoryIds.value.length === 0) {
        ElMessage.warning('请先选择要确认的提醒')
        return
      }

      try {
        const result = await dojiPatternAlertHistoryService.bulkAcknowledgeAlertHistory(
          selectedHistoryIds.value
        )
        ElMessage.success(`已成功确认 ${result.count} 条提醒`)
        loadAlertHistory()
      } catch (error) {
        console.error('批量确认提醒失败:', error)
        ElMessage.error('批量确认提醒失败')
      }
    }

    // 处理查看详情
    const handleViewDetails = (history: DojiPatternAlertHistory) => {
      selectedHistory.value = history
      detailsDialogVisible.value = true
    }

    // 在对话框中确认提醒
    const handleAcknowledgeInDialog = async () => {
      if (!selectedHistory.value) return

      try {
        await dojiPatternAlertHistoryService.acknowledgeAlertHistory(selectedHistory.value.id)
        ElMessage.success('提醒已确认')
        selectedHistory.value.acknowledged = true
        loadAlertHistory()
      } catch (error) {
        console.error('确认提醒失败:', error)
        ElMessage.error('确认提醒失败')
      }
    }

    // 处理删除
    const handleDelete = (history: DojiPatternAlertHistory) => {
      historyToDelete.value = history
      deleteDialogVisible.value = true
    }

    // 确认删除
    const confirmDelete = async () => {
      if (!historyToDelete.value) return

      try {
        await dojiPatternAlertHistoryService.deleteAlertHistory(historyToDelete.value.id)
        ElMessage.success('提醒历史记录已删除')
        deleteDialogVisible.value = false
        loadAlertHistory()
      } catch (error) {
        console.error('删除提醒历史记录失败:', error)
        ElMessage.error('删除提醒历史记录失败')
      }
    }

    // 处理页面大小变化
    const handleSizeChange = (size: number) => {
      pageSize.value = size
      loadAlertHistory()
    }

    // 处理页码变化
    const handleCurrentChange = (page: number) => {
      currentPage.value = page
      loadAlertHistory()
    }

    // 处理筛选条件变化
    const handleFilterChange = () => {
      if (dateRange.value) {
        filters.startDate = dateRange.value[0]
        filters.endDate = dateRange.value[1]
      } else {
        filters.startDate = undefined
        filters.endDate = undefined
      }

      currentPage.value = 1
      loadAlertHistory()
    }

    // 监听 props 变化
    watch(
      () => props.stockCode,
      (newVal) => {
        if (newVal) {
          filters.stockCode = newVal
          loadAlertHistory()
        }
      }
    )

    // 组件挂载时加载数据
    onMounted(() => {
      loadAlertHistory()
    })

    return {
      loading,
      historyList,
      total,
      currentPage,
      pageSize,
      selectedHistoryIds,
      detailsDialogVisible,
      deleteDialogVisible,
      selectedHistory,
      dateRange,
      filters,
      formatDateTime,
      formatPatternType,
      formatAlertCondition,
      formatPriority,
      getPriorityTagType,
      formatTrend,
      handleSelectionChange,
      handleAcknowledge,
      handleBulkAcknowledge,
      handleViewDetails,
      handleAcknowledgeInDialog,
      handleDelete,
      confirmDelete,
      handleSizeChange,
      handleCurrentChange,
      handleFilterChange,
      loadAlertHistory,
    }
  },
})
</script>

<style scoped>
.doji-alert-history-list {
  padding: 16px;
}

.alert-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.alert-history-filters {
  margin-bottom: 16px;
}

.alert-history-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.stock-name {
  font-size: 12px;
  color: #666;
}

.history-detail-header {
  margin-bottom: 16px;
}

.stock-info h3 {
  margin: 0 0 8px 0;
}

.pattern-info {
  display: flex;
  align-items: center;
}

.trigger-time {
  margin-left: 12px;
  color: #666;
}

.pattern-details,
.alert-info {
  margin-bottom: 20px;
}

.pattern-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.data-item {
  display: flex;
  margin-bottom: 8px;
}

.label {
  font-weight: 500;
  margin-right: 8px;
  color: #666;
}

.context-info h5 {
  margin: 12px 0 8px 0;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
