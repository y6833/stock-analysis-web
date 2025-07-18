<template>
  <div class="doji-alert-management">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="活跃提醒" name="active">
        <div class="tab-content">
          <div class="alerts-header">
            <h3>活跃提醒</h3>
            <div class="alerts-actions">
              <el-button type="primary" size="small" @click="handleCreateAlert">
                创建新提醒
              </el-button>
              <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadAlerts">
                刷新
              </el-button>
            </div>
          </div>

          <el-table v-loading="loading" :data="activeAlerts" style="width: 100%">
            <el-table-column label="股票" width="150">
              <template #default="{ row }">
                <div>{{ row.stockCode }}</div>
                <div class="stock-name">{{ row.stockName }}</div>
              </template>
            </el-table-column>
            <el-table-column label="形态类型" prop="patternType" width="120">
              <template #default="{ row }">
                {{ formatPatternType(row.patternType) }}
              </template>
            </el-table-column>
            <el-table-column label="提醒条件" prop="condition">
              <template #default="{ row }">
                {{ formatAlertCondition(row.condition) }}
              </template>
            </el-table-column>
            <el-table-column label="优先级" prop="priority" width="100">
              <template #default="{ row }">
                <el-tag :type="getPriorityTagType(row.priority)" size="small">
                  {{ formatPriority(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上次触发" width="180">
              <template #default="{ row }">
                {{ row.lastTriggeredAt ? formatDateTime(row.lastTriggeredAt) : '从未' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch v-model="row.isActive" @change="(val) => handleToggleStatus(row, val)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button type="text" size="small" @click="handleViewHistory(row)">
                  历史记录
                </el-button>
                <el-button type="text" size="small" @click="handleEditAlert(row)"> 编辑 </el-button>
                <el-button type="text" size="small" @click="handleDeleteAlert(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="提醒历史" name="history">
        <div class="tab-content">
          <doji-pattern-alert-history-list />
        </div>
      </el-tab-pane>

      <el-tab-pane label="统计分析" name="stats">
        <div class="tab-content">
          <div class="stats-header">
            <h3>提醒统计分析</h3>
            <div class="stats-actions">
              <el-date-picker
                v-model="statsDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                @change="loadAlertStats"
              />
              <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadAlertStats">
                刷新
              </el-button>
            </div>
          </div>

          <el-row :gutter="20" v-loading="statsLoading">
            <el-col :span="6">
              <el-card class="stats-card">
                <div class="stats-value">{{ alertStats.totalAlerts }}</div>
                <div class="stats-label">总提醒数</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stats-card">
                <div class="stats-value">{{ alertStats.activeAlerts }}</div>
                <div class="stats-label">活跃提醒</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stats-card">
                <div class="stats-value">{{ alertStats.triggeredToday }}</div>
                <div class="stats-label">今日触发</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stats-card">
                <div class="stats-value">{{ alertStats.triggeredThisWeek }}</div>
                <div class="stats-label">本周触发</div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="20" class="stats-charts">
            <el-col :span="12">
              <el-card class="chart-card">
                <div slot="header">按优先级分布</div>
                <div class="chart-container" ref="priorityChartRef"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card class="chart-card">
                <div slot="header">按形态类型分布</div>
                <div class="chart-container" ref="patternTypeChartRef"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="stock-stats-card">
            <div slot="header">
              <span>按股票分布 (前10名)</span>
            </div>
            <div class="chart-container" ref="stockChartRef"></div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 查看历史记录对话框 -->
    <el-dialog title="提醒历史记录" :visible.sync="historyDialogVisible" width="900px">
      <doji-pattern-alert-history-list
        v-if="selectedAlert"
        :alertId="selectedAlert.id"
        :showStockFilter="false"
        :title="`${selectedAlert.stockCode} ${selectedAlert.stockName} 的提醒历史`"
      />
    </el-dialog>

    <!-- 确认删除对话框 -->
    <el-dialog title="确认删除" :visible.sync="deleteDialogVisible" width="400px">
      <p>确定要删除此提醒吗？此操作不可恢复。</p>
      <div slot="footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import DojiPatternAlertHistoryList from './DojiPatternAlertHistoryList.vue'
import dojiPatternAlertService from '@/services/DojiPatternAlertService'
import dojiPatternAlertHistoryService from '@/services/DojiPatternAlertHistoryService'
import type {
  DojiPatternAlert,
  DojiAlertCondition,
  DojiAlertPriority,
} from '@/services/DojiPatternAlertService'
import type { DojiPatternType } from '@/services/alertService'
import type { DojiPatternAlertStats } from '@/types/alerts'

// 注册 ECharts 组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  PieChart,
  BarChart,
  CanvasRenderer,
])

export default defineComponent({
  name: 'DojiPatternAlertManagement',
  components: {
    DojiPatternAlertHistoryList,
  },
  setup() {
    const activeTab = ref('active')
    const loading = ref(false)
    const statsLoading = ref(false)
    const alerts = ref<DojiPatternAlert[]>([])
    const historyDialogVisible = ref(false)
    const deleteDialogVisible = ref(false)
    const selectedAlert = ref<DojiPatternAlert | null>(null)
    const alertToDelete = ref<DojiPatternAlert | null>(null)
    const statsDateRange = ref<[string, string] | null>(null)

    const priorityChartRef = ref<HTMLElement | null>(null)
    const patternTypeChartRef = ref<HTMLElement | null>(null)
    const stockChartRef = ref<HTMLElement | null>(null)

    let priorityChart: echarts.ECharts | null = null
    let patternTypeChart: echarts.ECharts | null = null
    let stockChart: echarts.ECharts | null = null

    const alertStats = reactive<DojiPatternAlertStats>({
      totalAlerts: 0,
      activeAlerts: 0,
      triggeredToday: 0,
      triggeredThisWeek: 0,
      triggeredThisMonth: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
      byPatternType: {
        standard: 0,
        gravestone: 0,
        dragonfly: 0,
        longLegged: 0,
      },
      byStock: [],
    })

    // 计算活跃提醒
    const activeAlerts = computed(() => {
      return alerts.value.filter((alert) => alert.isActive)
    })

    // 加载提醒列表
    const loadAlerts = async () => {
      loading.value = true
      try {
        alerts.value = await dojiPatternAlertService.getDojiPatternAlerts()
      } catch (error) {
        console.error('加载提醒列表失败:', error)
        ElMessage.error('加载提醒列表失败')
      } finally {
        loading.value = false
      }
    }

    // 加载提醒统计数据
    const loadAlertStats = async () => {
      statsLoading.value = true
      try {
        const params: { startDate?: string; endDate?: string } = {}

        if (statsDateRange.value) {
          params.startDate = statsDateRange.value[0]
          params.endDate = statsDateRange.value[1]
        }

        const stats = await dojiPatternAlertHistoryService.getAlertHistoryStats(params)
        Object.assign(alertStats, stats)

        nextTick(() => {
          renderCharts()
        })
      } catch (error) {
        console.error('加载提醒统计数据失败:', error)
        ElMessage.error('加载提醒统计数据失败')
      } finally {
        statsLoading.value = false
      }
    }

    // 渲染图表
    const renderCharts = () => {
      renderPriorityChart()
      renderPatternTypeChart()
      renderStockChart()
    }

    // 渲染优先级分布图表
    const renderPriorityChart = () => {
      if (!priorityChartRef.value) return

      if (!priorityChart) {
        priorityChart = echarts.init(priorityChartRef.value)
      }

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['高', '中', '低'],
        },
        series: [
          {
            name: '优先级分布',
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: [
              { value: alertStats.byPriority.high, name: '高', itemStyle: { color: '#F56C6C' } },
              { value: alertStats.byPriority.medium, name: '中', itemStyle: { color: '#E6A23C' } },
              { value: alertStats.byPriority.low, name: '低', itemStyle: { color: '#909399' } },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }

      priorityChart.setOption(option)
    }

    // 渲染形态类型分布图表
    const renderPatternTypeChart = () => {
      if (!patternTypeChartRef.value) return

      if (!patternTypeChart) {
        patternTypeChart = echarts.init(patternTypeChartRef.value)
      }

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['标准十字星', '墓碑十字星', '蜻蜓十字星', '长腿十字星'],
        },
        series: [
          {
            name: '形态类型分布',
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: [
              {
                value: alertStats.byPatternType.standard,
                name: '标准十字星',
                itemStyle: { color: '#409EFF' },
              },
              {
                value: alertStats.byPatternType.gravestone,
                name: '墓碑十字星',
                itemStyle: { color: '#F56C6C' },
              },
              {
                value: alertStats.byPatternType.dragonfly,
                name: '蜻蜓十字星',
                itemStyle: { color: '#67C23A' },
              },
              {
                value: alertStats.byPatternType.longLegged,
                name: '长腿十字星',
                itemStyle: { color: '#9B59B6' },
              },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }

      patternTypeChart.setOption(option)
    }

    // 渲染股票分布图表
    const renderStockChart = () => {
      if (!stockChartRef.value) return

      if (!stockChart) {
        stockChart = echarts.init(stockChartRef.value)
      }

      // 获取前10名股票
      const topStocks = alertStats.byStock.slice(0, 10).sort((a, b) => b.count - a.count)

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01],
        },
        yAxis: {
          type: 'category',
          data: topStocks.map((stock) => `${stock.stockCode} ${stock.stockName}`),
          axisLabel: {
            interval: 0,
            rotate: 0,
          },
        },
        series: [
          {
            name: '提醒数量',
            type: 'bar',
            data: topStocks.map((stock) => stock.count),
            itemStyle: {
              color: '#409EFF',
            },
          },
        ],
      }

      stockChart.setOption(option)
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

    // 处理切换提醒状态
    const handleToggleStatus = async (alert: DojiPatternAlert, isActive: boolean) => {
      try {
        await dojiPatternAlertService.toggleDojiPatternAlertStatus(alert.id, isActive)
        ElMessage.success(`提醒已${isActive ? '激活' : '停用'}`)
      } catch (error) {
        console.error('切换提醒状态失败:', error)
        ElMessage.error('切换提醒状态失败')
        alert.isActive = !isActive // 恢复原状态
      }
    }

    // 处理查看历史记录
    const handleViewHistory = (alert: DojiPatternAlert) => {
      selectedAlert.value = alert
      historyDialogVisible.value = true
    }

    // 处理创建提醒
    const handleCreateAlert = () => {
      // 跳转到创建提醒页面或打开创建提醒对话框
      ElMessage.info('跳转到创建提醒页面')
    }

    // 处理编辑提醒
    const handleEditAlert = (alert: DojiPatternAlert) => {
      // 跳转到编辑提醒页面或打开编辑提醒对话框
      ElMessage.info(`编辑提醒: ${alert.id}`)
    }

    // 处理删除提醒
    const handleDeleteAlert = (alert: DojiPatternAlert) => {
      alertToDelete.value = alert
      deleteDialogVisible.value = true
    }

    // 确认删除
    const confirmDelete = async () => {
      if (!alertToDelete.value) return

      try {
        await dojiPatternAlertService.deleteDojiPatternAlert(alertToDelete.value.id)
        ElMessage.success('提醒已删除')
        deleteDialogVisible.value = false
        loadAlerts()
      } catch (error) {
        console.error('删除提醒失败:', error)
        ElMessage.error('删除提醒失败')
      }
    }

    // 监听标签页变化
    const handleTabChange = (tab: string) => {
      if (tab === 'stats') {
        loadAlertStats()
      }
    }

    // 监听窗口大小变化，调整图表大小
    const handleResize = () => {
      priorityChart?.resize()
      patternTypeChart?.resize()
      stockChart?.resize()
    }

    // 组件挂载时加载数据
    onMounted(() => {
      loadAlerts()
      window.addEventListener('resize', handleResize)
    })

    // 组件卸载时移除事件监听
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      priorityChart?.dispose()
      patternTypeChart?.dispose()
      stockChart?.dispose()
    })

    return {
      activeTab,
      loading,
      statsLoading,
      alerts,
      activeAlerts,
      historyDialogVisible,
      deleteDialogVisible,
      selectedAlert,
      alertStats,
      statsDateRange,
      priorityChartRef,
      patternTypeChartRef,
      stockChartRef,
      formatDateTime,
      formatPatternType,
      formatAlertCondition,
      formatPriority,
      getPriorityTagType,
      handleToggleStatus,
      handleViewHistory,
      handleCreateAlert,
      handleEditAlert,
      handleDeleteAlert,
      confirmDelete,
      handleTabChange,
      loadAlerts,
      loadAlertStats,
    }
  },
})
</script>

<style scoped>
.doji-alert-management {
  padding: 16px;
}

.tab-content {
  padding: 16px 0;
}

.alerts-header,
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stock-name {
  font-size: 12px;
  color: #666;
}

.stats-charts {
  margin-top: 20px;
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
  padding: 16px;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.stats-label {
  margin-top: 8px;
  color: #666;
}

.chart-card,
.stock-stats-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}
</style>
