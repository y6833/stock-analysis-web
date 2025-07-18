<template>
  <div class="doji-pattern-screener">
    <div class="screener-header">
      <h2>十字星形态筛选工具</h2>
      <p class="screener-description">筛选出现十字星形态后上涨的股票，帮助您发现潜在的交易机会</p>
    </div>

    <!-- 筛选条件表单 -->
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span>筛选条件</span>
          <el-button type="primary" @click="handleSearch">开始筛选</el-button>
        </div>
      </template>

      <el-form :model="filterForm" label-position="top" size="default">
        <!-- 形态类型选择器 -->
        <el-form-item label="十字星形态类型">
          <el-checkbox-group v-model="filterForm.patternTypes">
            <el-checkbox label="standard">标准十字星</el-checkbox>
            <el-checkbox label="dragonfly">蜻蜓十字星</el-checkbox>
            <el-checkbox label="gravestone">墓碑十字星</el-checkbox>
            <el-checkbox label="longLegged">长腿十字星</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 时间范围选择 -->
        <el-form-item label="查找时间范围">
          <el-input-number
            v-model="filterForm.daysRange"
            :min="1"
            :max="90"
            :step="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="input-suffix">天内</span>
        </el-form-item>

        <!-- 上涨幅度输入 -->
        <el-form-item label="最小上涨幅度">
          <el-input-number
            v-model="filterForm.minUpwardPercent"
            :min="0"
            :max="100"
            :step="0.5"
            :precision="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="input-suffix">%</span>
        </el-form-item>

        <!-- 市场环境筛选 -->
        <el-form-item label="市场环境">
          <el-select
            v-model="filterForm.marketCondition"
            placeholder="选择市场环境"
            style="width: 180px"
          >
            <el-option label="全部" value="" />
            <el-option label="牛市" value="bull" />
            <el-option label="熊市" value="bear" />
            <el-option label="震荡市" value="neutral" />
          </el-select>
        </el-form-item>

        <!-- 排序选项 -->
        <el-form-item label="排序方式">
          <el-row :gutter="10">
            <el-col :span="12">
              <el-select v-model="filterForm.sortBy" placeholder="排序字段" style="width: 100%">
                <el-option label="上涨幅度" value="priceChange" />
                <el-option label="成交量变化" value="volumeChange" />
                <el-option label="形态日期" value="patternDate" />
                <el-option label="形态显著性" value="significance" />
              </el-select>
            </el-col>
            <el-col :span="12">
              <el-select
                v-model="filterForm.sortDirection"
                placeholder="排序方向"
                style="width: 100%"
              >
                <el-option label="降序" value="desc" />
                <el-option label="升序" value="asc" />
              </el-select>
            </el-col>
          </el-row>
        </el-form-item>

        <!-- 结果数量限制 -->
        <el-form-item label="结果数量限制">
          <el-input-number
            v-model="filterForm.limit"
            :min="10"
            :max="500"
            :step="10"
            controls-position="right"
            style="width: 180px"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 筛选结果 -->
    <doji-pattern-screener-results
      :screen-result="screenResult"
      :loading="loading"
      @refresh="refreshResults"
      @view-detail="handleViewDetail"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue'
import type { DojiType } from '../../types/technical-analysis/doji'
import type { MarketCondition } from '../../types/technical-analysis/kline'
import type {
  DojiScreenCriteria,
  StockScreenResult,
  UpwardStockResult,
} from '../../types/technical-analysis/screener'
import { DojiPatternScreener } from '../../services/DojiPatternScreener'
import { HistoricalPatternServiceImpl } from '../../services/HistoricalPatternService'
import { StockDataServiceImpl } from '../../services/StockDataService'
import DojiPatternScreenerResults from './DojiPatternScreenerResults.vue'

export default defineComponent({
  name: 'DojiPatternScreenerView',
  components: {
    DojiPatternScreenerResults,
  },

  setup() {
    // 筛选器实例
    const historicalPatternService = new HistoricalPatternServiceImpl()
    const stockDataService = new StockDataServiceImpl()
    const screener = new DojiPatternScreener(historicalPatternService, stockDataService)

    // 筛选表单
    const filterForm = reactive<DojiScreenCriteria>({
      patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
      daysRange: 30,
      minUpwardPercent: 3.0,
      sortBy: 'priceChange',
      sortDirection: 'desc',
      marketCondition: undefined,
      limit: 100,
    })

    // 筛选结果
    const screenResult = ref<StockScreenResult>({
      stocks: [],
      total: 0,
      criteria: { ...filterForm },
    })

    // 加载状态
    const loading = ref(false)

    // 分页
    const currentPage = ref(1)
    const pageSize = ref(20)

    // 是否有结果
    const hasResults = computed(() => screenResult.value.stocks.length > 0)

    // 搜索处理
    const handleSearch = async () => {
      loading.value = true
      try {
        const result = await screener.screenStocks({
          ...filterForm,
        })
        screenResult.value = result
        currentPage.value = 1
      } catch (error) {
        console.error('筛选出错:', error)
      } finally {
        loading.value = false
      }
    }

    // 刷新结果
    const refreshResults = async () => {
      if (hasResults.value) {
        await handleSearch()
      }
    }

    // 导出结果
    const exportResults = () => {
      if (!hasResults.value) return

      // 创建CSV内容
      const headers = [
        '排名',
        '股票代码',
        '股票名称',
        '形态类型',
        '形态日期',
        '价格变化(%)',
        '成交量变化(%)',
        '显著性(%)',
      ]
      const rows = screenResult.value.stocks.map((stock) => [
        stock.rank,
        stock.stockId,
        stock.stockName,
        getPatternTypeName(stock.patternType),
        formatDate(stock.patternDate),
        stock.priceChange.toFixed(2),
        stock.volumeChange.toFixed(2),
        (stock.significance * 100).toFixed(0),
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `十字星筛选结果_${formatDate(Date.now())}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // 分页处理
    const handleSizeChange = (size: number) => {
      pageSize.value = size
      // 这里可以添加分页逻辑，如果需要从服务器获取分页数据
    }

    const handleCurrentChange = (page: number) => {
      currentPage.value = page
      // 这里可以添加分页逻辑，如果需要从服务器获取分页数据
    }

    // 查看股票详情
    const viewStockDetail = (stock: UpwardStockResult) => {
      // 这里可以实现跳转到股票详情页或显示详情弹窗
      console.log('查看股票详情:', stock)
    }

    // 处理详情查看事件
    const handleViewDetail = (stock: UpwardStockResult) => {
      // 可以在这里添加额外的处理逻辑，如记录查看历史、加载更多数据等
      viewStockDetail(stock)
    }

    // 格式化日期
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`
    }

    // 获取形态类型名称
    const getPatternTypeName = (type: DojiType): string => {
      const typeMap: Record<DojiType, string> = {
        standard: '标准十字星',
        dragonfly: '蜻蜓十字星',
        gravestone: '墓碑十字星',
        longLegged: '长腿十字星',
      }
      return typeMap[type] || '未知形态'
    }

    // 获取形态标签类型
    const getPatternTagType = (type: DojiType): string => {
      const typeMap: Record<DojiType, string> = {
        standard: '',
        dragonfly: 'success',
        gravestone: 'danger',
        longLegged: 'warning',
      }
      return typeMap[type] || 'info'
    }

    // 获取显著性颜色
    const getSignificanceColor = (significance: number): string => {
      if (significance >= 0.8) return '#67C23A'
      if (significance >= 0.6) return '#E6A23C'
      if (significance >= 0.4) return '#F56C6C'
      return '#909399'
    }

    return {
      filterForm,
      screenResult,
      loading,
      currentPage,
      pageSize,
      hasResults,
      handleSearch,
      refreshResults,
      exportResults,
      handleSizeChange,
      handleCurrentChange,
      viewStockDetail,
      handleViewDetail,
      formatDate,
      getPatternTypeName,
      getPatternTagType,
      getSignificanceColor,
    }
  },
})
</script>

<style scoped>
.doji-pattern-screener {
  padding: 20px;
}

.screener-header {
  margin-bottom: 20px;
}

.screener-description {
  color: #606266;
  margin-top: 8px;
}

.filter-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.input-suffix {
  margin-left: 8px;
  color: #606266;
}

.empty-result {
  padding: 40px 0;
  text-align: center;
}

.result-summary {
  margin-bottom: 15px;
  font-size: 14px;
  color: #606266;
}

.price-up {
  color: #f56c6c;
  font-weight: bold;
}

.price-down {
  color: #67c23a;
  font-weight: bold;
}

.volume-up {
  color: #f56c6c;
}

.volume-down {
  color: #67c23a;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
